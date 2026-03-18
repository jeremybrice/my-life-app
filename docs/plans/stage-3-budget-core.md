# Stage 3: Budget Core Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the core budget module with expense CRUD, live balance display, and expense table — establishing the shared data interface that both manual forms and the AI agent will use.

**Architecture:** Data services as framework-agnostic async functions in src/data/. Budget screen reads via Dexie useLiveQuery hooks. Balance recalculates on every expense write. Expense CRUD is the contract surface for Stage 6 (AI Agent).

**Tech Stack:** React, TypeScript, Dexie.js (useLiveQuery), Vitest, React Testing Library

**Depends on:** Stage 1 (Dexie DB schema, settings service, lib utilities), Stage 2 (dashboard layout)
**Produces for later stages:** budget-service.ts, expense-service.ts (contract surface for Stage 6 AI Agent), useBudget hook, useExpenses hook

---

## Section 1: Budget Month Service + Tests

### Task 1.1 — Create budget-service.ts with types and createBudgetMonth

**File:** `src/data/budget-service.ts`

```typescript
import { db, type BudgetMonth } from './db';
import { roundCurrency } from '../lib/currency';
import { daysInMonth } from '../lib/dates';

// --- Input Types ---

export interface CreateBudgetMonthInput {
  yearMonth: string;
  monthlyAmount: number;
  carryOver?: number;
  additionalFunds?: number;
}

export interface UpdateBudgetMonthInput {
  monthlyAmount?: number;
  carryOver?: number;
  additionalFunds?: number;
}

// --- Balance Calculation ---

export interface BalanceSnapshot {
  balance: number;
  dailyAllowance: number;
  daysElapsed: number;
  carryOver: number;
  additionalFunds: number;
  totalExpenses: number;
  todaySpent: number;
}

// --- Service Functions ---

export function calculateDailyAllowance(monthlyAmount: number, yearMonth: string): number {
  const days = daysInMonth(yearMonth);
  return roundCurrency(monthlyAmount / days);
}

export async function createBudgetMonth(input: CreateBudgetMonthInput): Promise<BudgetMonth> {
  const { yearMonth, monthlyAmount, carryOver = 0, additionalFunds = 0 } = input;

  if (!yearMonth || !/^\d{4}-\d{2}$/.test(yearMonth)) {
    throw new Error('yearMonth must be in "YYYY-MM" format');
  }
  if (monthlyAmount == null || monthlyAmount <= 0) {
    throw new Error('monthlyAmount must be a positive number');
  }

  const existing = await db.budgetMonths.get(yearMonth);
  if (existing) {
    throw new Error(`Budget month "${yearMonth}" already exists`);
  }

  const dailyAllowance = calculateDailyAllowance(monthlyAmount, yearMonth);
  const now = new Date().toISOString();

  const record: BudgetMonth = {
    yearMonth,
    monthlyAmount: roundCurrency(monthlyAmount),
    dailyAllowance,
    carryOver: roundCurrency(carryOver),
    additionalFunds: roundCurrency(additionalFunds),
    createdAt: now,
    updatedAt: now,
  };

  await db.budgetMonths.add(record);
  return record;
}
```

**Commit:** `feat: add createBudgetMonth with daily allowance calculation`

---

### Task 1.2 — Add getBudgetMonth and updateBudgetMonth

**File:** `src/data/budget-service.ts` (append after createBudgetMonth)

```typescript
export async function getBudgetMonth(yearMonth: string): Promise<BudgetMonth | undefined> {
  return db.budgetMonths.get(yearMonth);
}

export async function updateBudgetMonth(
  yearMonth: string,
  input: UpdateBudgetMonthInput
): Promise<BudgetMonth> {
  const existing = await db.budgetMonths.get(yearMonth);
  if (!existing) {
    throw new Error(`Budget month "${yearMonth}" not found`);
  }

  const monthlyAmount = input.monthlyAmount ?? existing.monthlyAmount;
  const carryOver = input.carryOver ?? existing.carryOver;
  const additionalFunds = input.additionalFunds ?? existing.additionalFunds;

  if (monthlyAmount <= 0) {
    throw new Error('monthlyAmount must be a positive number');
  }

  const dailyAllowance = calculateDailyAllowance(monthlyAmount, yearMonth);
  const now = new Date().toISOString();

  const updated: BudgetMonth = {
    ...existing,
    monthlyAmount: roundCurrency(monthlyAmount),
    dailyAllowance,
    carryOver: roundCurrency(carryOver),
    additionalFunds: roundCurrency(additionalFunds),
    updatedAt: now,
  };

  await db.budgetMonths.put(updated);
  return updated;
}
```

**Commit:** `feat: add getBudgetMonth and updateBudgetMonth`

---

### Task 1.3 — Add calculateBalance function

**File:** `src/data/budget-service.ts` (append)

```typescript
import { daysElapsed as getDaysElapsed, today as getToday } from '../lib/dates';

export async function calculateBalance(yearMonth: string): Promise<BalanceSnapshot> {
  const budgetMonth = await db.budgetMonths.get(yearMonth);
  if (!budgetMonth) {
    throw new Error(`Budget month "${yearMonth}" not found`);
  }

  const expenses = await db.expenses.where('yearMonth').equals(yearMonth).toArray();
  const totalExpenses = roundCurrency(
    expenses.reduce((sum, e) => sum + e.amount, 0)
  );

  const elapsed = getDaysElapsed(yearMonth);
  const todayStr = getToday();
  const todayExpenses = expenses.filter((e) => e.date === todayStr);
  const todaySpent = roundCurrency(
    todayExpenses.reduce((sum, e) => sum + e.amount, 0)
  );

  const balance = roundCurrency(
    budgetMonth.dailyAllowance * elapsed +
      budgetMonth.carryOver +
      budgetMonth.additionalFunds -
      totalExpenses
  );

  return {
    balance,
    dailyAllowance: budgetMonth.dailyAllowance,
    daysElapsed: elapsed,
    carryOver: budgetMonth.carryOver,
    additionalFunds: budgetMonth.additionalFunds,
    totalExpenses,
    todaySpent,
  };
}
```

> **Note:** The import of `daysElapsed` and `today` should be merged with the existing import from `'../lib/dates'` at the top of the file. The final file should have a single import: `import { daysInMonth, daysElapsed, today } from '../lib/dates';`

**Commit:** `feat: add calculateBalance with full budget formula`

---

### Task 1.4 — Write budget-service tests

**File:** `tests/data/budget-service.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/data/db';
import {
  createBudgetMonth,
  getBudgetMonth,
  updateBudgetMonth,
  calculateDailyAllowance,
  calculateBalance,
} from '../../src/data/budget-service';

beforeEach(async () => {
  await db.budgetMonths.clear();
  await db.expenses.clear();
});

describe('calculateDailyAllowance', () => {
  it('should calculate daily allowance for a 31-day month', () => {
    expect(calculateDailyAllowance(3100, '2026-03')).toBe(100);
  });

  it('should calculate daily allowance for a 28-day month', () => {
    expect(calculateDailyAllowance(3100, '2026-02')).toBe(110.71);
  });

  it('should round to 2 decimal places on odd divisions', () => {
    // 1000 / 31 = 32.2580645...
    expect(calculateDailyAllowance(1000, '2026-07')).toBe(32.26);
  });
});

describe('createBudgetMonth', () => {
  it('should create a new budget month with calculated daily allowance', async () => {
    const result = await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
    });

    expect(result.yearMonth).toBe('2026-03');
    expect(result.monthlyAmount).toBe(3100);
    expect(result.dailyAllowance).toBe(100);
    expect(result.carryOver).toBe(0);
    expect(result.additionalFunds).toBe(0);
    expect(result.createdAt).toBeDefined();
    expect(result.updatedAt).toBeDefined();
  });

  it('should accept optional carry-over and additional funds', async () => {
    const result = await createBudgetMonth({
      yearMonth: '2026-04',
      monthlyAmount: 3000,
      carryOver: 150.50,
      additionalFunds: 200,
    });

    expect(result.carryOver).toBe(150.5);
    expect(result.additionalFunds).toBe(200);
  });

  it('should reject duplicate year-month', async () => {
    await createBudgetMonth({ yearMonth: '2026-03', monthlyAmount: 3100 });
    await expect(
      createBudgetMonth({ yearMonth: '2026-03', monthlyAmount: 3100 })
    ).rejects.toThrow('already exists');
  });

  it('should reject invalid yearMonth format', async () => {
    await expect(
      createBudgetMonth({ yearMonth: 'March 2026', monthlyAmount: 3100 })
    ).rejects.toThrow('YYYY-MM');
  });

  it('should reject non-positive monthlyAmount', async () => {
    await expect(
      createBudgetMonth({ yearMonth: '2026-03', monthlyAmount: 0 })
    ).rejects.toThrow('positive');
  });

  it('should reject negative monthlyAmount', async () => {
    await expect(
      createBudgetMonth({ yearMonth: '2026-03', monthlyAmount: -100 })
    ).rejects.toThrow('positive');
  });
});

describe('getBudgetMonth', () => {
  it('should return the budget month if it exists', async () => {
    await createBudgetMonth({ yearMonth: '2026-03', monthlyAmount: 3100 });
    const result = await getBudgetMonth('2026-03');
    expect(result).toBeDefined();
    expect(result!.monthlyAmount).toBe(3100);
  });

  it('should return undefined if budget month does not exist', async () => {
    const result = await getBudgetMonth('2099-01');
    expect(result).toBeUndefined();
  });
});

describe('updateBudgetMonth', () => {
  it('should update monthly amount and recalculate daily allowance', async () => {
    await createBudgetMonth({ yearMonth: '2026-04', monthlyAmount: 3000 });
    const result = await updateBudgetMonth('2026-04', { monthlyAmount: 3600 });

    expect(result.monthlyAmount).toBe(3600);
    // 3600 / 30 days in April = 120
    expect(result.dailyAllowance).toBe(120);
  });

  it('should update carry-over without affecting monthly amount', async () => {
    await createBudgetMonth({ yearMonth: '2026-03', monthlyAmount: 3100 });
    const result = await updateBudgetMonth('2026-03', { carryOver: -50.25 });

    expect(result.monthlyAmount).toBe(3100);
    expect(result.carryOver).toBe(-50.25);
  });

  it('should update additional funds', async () => {
    await createBudgetMonth({ yearMonth: '2026-03', monthlyAmount: 3100 });
    const result = await updateBudgetMonth('2026-03', { additionalFunds: 500 });
    expect(result.additionalFunds).toBe(500);
  });

  it('should throw if budget month does not exist', async () => {
    await expect(
      updateBudgetMonth('2099-01', { monthlyAmount: 1000 })
    ).rejects.toThrow('not found');
  });

  it('should reject non-positive monthly amount on update', async () => {
    await createBudgetMonth({ yearMonth: '2026-03', monthlyAmount: 3100 });
    await expect(
      updateBudgetMonth('2026-03', { monthlyAmount: 0 })
    ).rejects.toThrow('positive');
  });

  it('should update the updatedAt timestamp', async () => {
    const created = await createBudgetMonth({
      yearMonth: '2026-05',
      monthlyAmount: 2000,
    });
    // Small delay to ensure different timestamp
    await new Promise((r) => setTimeout(r, 10));
    const updated = await updateBudgetMonth('2026-05', { monthlyAmount: 2500 });
    expect(updated.updatedAt).not.toBe(created.updatedAt);
  });
});

describe('calculateBalance', () => {
  it('should throw if budget month does not exist', async () => {
    await expect(calculateBalance('2099-01')).rejects.toThrow('not found');
  });

  it('should return zero totalExpenses when no expenses exist', async () => {
    await createBudgetMonth({ yearMonth: '2026-03', monthlyAmount: 3100 });
    const snapshot = await calculateBalance('2026-03');

    expect(snapshot.totalExpenses).toBe(0);
    expect(snapshot.todaySpent).toBe(0);
    expect(snapshot.dailyAllowance).toBe(100);
    expect(snapshot.carryOver).toBe(0);
    expect(snapshot.additionalFunds).toBe(0);
  });

  it('should include carry-over and additional funds in balance', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 50,
      additionalFunds: 25,
    });
    const snapshot = await calculateBalance('2026-03');

    // balance = (100 * daysElapsed) + 50 + 25 - 0
    expect(snapshot.carryOver).toBe(50);
    expect(snapshot.additionalFunds).toBe(25);
    expect(snapshot.balance).toBe(
      snapshot.dailyAllowance * snapshot.daysElapsed + 50 + 25
    );
  });
});
```

**Test command:** `npx vitest run tests/data/budget-service.test.ts`

**Commit:** `test: add budget month service tests`

---

## Section 2: Expense Service + Tests (Contract Surface)

### Task 2.1 — Create expense-service.ts with types and validation

**File:** `src/data/expense-service.ts`

```typescript
import { db, type Expense } from './db';
import { roundCurrency } from '../lib/currency';
import { today as getToday } from '../lib/dates';
import { MAX_VENDOR_LENGTH } from '../lib/constants';

// --- Input Types ---

export interface CreateExpenseInput {
  date?: string;
  vendor: string;
  amount: number;
  category?: string;
  description?: string;
}

export interface UpdateExpenseInput {
  date?: string;
  vendor?: string;
  amount?: number;
  category?: string;
  description?: string;
}

// --- Validation ---

export interface ValidationError {
  field: string;
  message: string;
}

export function validateExpenseInput(
  input: CreateExpenseInput | UpdateExpenseInput,
  isUpdate = false
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Vendor validation
  if (!isUpdate || 'vendor' in input) {
    const vendor = (input as CreateExpenseInput).vendor;
    if (!isUpdate && (!vendor || vendor.trim() === '')) {
      errors.push({ field: 'vendor', message: 'Vendor is required' });
    } else if (vendor !== undefined && vendor.length > MAX_VENDOR_LENGTH) {
      errors.push({
        field: 'vendor',
        message: `Vendor must be ${MAX_VENDOR_LENGTH} characters or fewer`,
      });
    }
  }

  // Amount validation
  if (!isUpdate || 'amount' in input) {
    const amount = input.amount;
    if (!isUpdate && (amount == null || amount <= 0)) {
      errors.push({
        field: 'amount',
        message: 'Amount is required and must be greater than zero',
      });
    } else if (amount !== undefined && amount <= 0) {
      errors.push({
        field: 'amount',
        message: 'Amount must be greater than zero',
      });
    }
  }

  // Date validation (if provided)
  if (input.date !== undefined && input.date !== '') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
      errors.push({
        field: 'date',
        message: 'Date must be in "YYYY-MM-DD" format',
      });
    }
  }

  return errors;
}

function yearMonthFromDate(date: string): string {
  return date.substring(0, 7);
}
```

**Commit:** `feat: add expense-service types and validation`

---

### Task 2.2 — Add createExpense

**File:** `src/data/expense-service.ts` (append)

```typescript
export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  const errors = validateExpenseInput(input);
  if (errors.length > 0) {
    throw new Error(errors.map((e) => `${e.field}: ${e.message}`).join('; '));
  }

  const date = input.date || getToday();
  const yearMonth = yearMonthFromDate(date);
  const now = new Date().toISOString();

  const expense: Expense = {
    yearMonth,
    date,
    vendor: input.vendor.trim(),
    amount: roundCurrency(input.amount),
    category: input.category?.trim() || undefined,
    description: input.description?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };

  const id = await db.expenses.add(expense);
  expense.id = id as number;

  return expense;
}
```

**Commit:** `feat: add createExpense with validation and date defaulting`

---

### Task 2.3 — Add getExpensesByMonth and getExpenseById

**File:** `src/data/expense-service.ts` (append)

```typescript
export async function getExpensesByMonth(yearMonth: string): Promise<Expense[]> {
  return db.expenses.where('yearMonth').equals(yearMonth).toArray();
}

export async function getExpenseById(id: number): Promise<Expense | undefined> {
  return db.expenses.get(id);
}
```

**Commit:** `feat: add getExpensesByMonth and getExpenseById`

---

### Task 2.4 — Add updateExpense

**File:** `src/data/expense-service.ts` (append)

```typescript
export async function updateExpense(
  id: number,
  input: UpdateExpenseInput
): Promise<Expense> {
  const existing = await db.expenses.get(id);
  if (!existing) {
    throw new Error(`Expense with id ${id} not found`);
  }

  const errors = validateExpenseInput(input, true);
  if (errors.length > 0) {
    throw new Error(errors.map((e) => `${e.field}: ${e.message}`).join('; '));
  }

  const date = input.date ?? existing.date;
  const yearMonth = yearMonthFromDate(date);
  const now = new Date().toISOString();

  const updated: Expense = {
    ...existing,
    date,
    yearMonth,
    vendor: input.vendor !== undefined ? input.vendor.trim() : existing.vendor,
    amount: input.amount !== undefined ? roundCurrency(input.amount) : existing.amount,
    category: input.category !== undefined ? (input.category.trim() || undefined) : existing.category,
    description: input.description !== undefined ? (input.description.trim() || undefined) : existing.description,
    updatedAt: now,
  };

  await db.expenses.put(updated);
  return updated;
}
```

**Commit:** `feat: add updateExpense with validation and yearMonth recalculation`

---

### Task 2.5 — Add deleteExpense

**File:** `src/data/expense-service.ts` (append)

```typescript
export async function deleteExpense(id: number): Promise<void> {
  const existing = await db.expenses.get(id);
  if (!existing) {
    throw new Error(`Expense with id ${id} not found`);
  }

  await db.expenses.delete(id);
}
```

**Commit:** `feat: add deleteExpense`

---

### Task 2.6 — Write expense-service create tests

**File:** `tests/data/expense-service.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../../src/data/db';
import {
  createExpense,
  getExpensesByMonth,
  getExpenseById,
  updateExpense,
  deleteExpense,
  validateExpenseInput,
} from '../../src/data/expense-service';
import { createBudgetMonth } from '../../src/data/budget-service';

beforeEach(async () => {
  await db.expenses.clear();
  await db.budgetMonths.clear();
});

describe('validateExpenseInput', () => {
  it('should return no errors for valid input', () => {
    const errors = validateExpenseInput({
      vendor: 'Starbucks',
      amount: 5.75,
      date: '2026-03-17',
    });
    expect(errors).toHaveLength(0);
  });

  it('should return error for missing vendor', () => {
    const errors = validateExpenseInput({
      vendor: '',
      amount: 5.75,
    });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('vendor');
  });

  it('should return error for vendor exceeding 20 chars', () => {
    const errors = validateExpenseInput({
      vendor: 'International House of Pancakes',
      amount: 10,
    });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('vendor');
    expect(errors[0].message).toContain('20');
  });

  it('should return error for zero amount', () => {
    const errors = validateExpenseInput({
      vendor: 'Test',
      amount: 0,
    });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('amount');
  });

  it('should return error for negative amount', () => {
    const errors = validateExpenseInput({
      vendor: 'Test',
      amount: -5,
    });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('amount');
  });

  it('should return error for invalid date format', () => {
    const errors = validateExpenseInput({
      vendor: 'Test',
      amount: 10,
      date: '03/17/2026',
    });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('date');
  });

  it('should return multiple errors when multiple fields invalid', () => {
    const errors = validateExpenseInput({
      vendor: '',
      amount: -1,
    });
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });

  it('should allow missing fields on update (isUpdate=true)', () => {
    const errors = validateExpenseInput({ category: 'Food' }, true);
    expect(errors).toHaveLength(0);
  });
});

describe('createExpense', () => {
  it('should create a valid expense with all fields', async () => {
    const result = await createExpense({
      date: '2026-03-17',
      vendor: 'Starbucks',
      amount: 5.75,
      category: 'Coffee',
      description: 'Morning latte',
    });

    expect(result.id).toBeDefined();
    expect(result.vendor).toBe('Starbucks');
    expect(result.amount).toBe(5.75);
    expect(result.category).toBe('Coffee');
    expect(result.description).toBe('Morning latte');
    expect(result.date).toBe('2026-03-17');
    expect(result.yearMonth).toBe('2026-03');
    expect(result.createdAt).toBeDefined();
  });

  it('should default date to today when omitted', async () => {
    const result = await createExpense({
      vendor: 'Target',
      amount: 32.50,
    });

    // Date should be a valid ISO date string
    expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.yearMonth).toBe(result.date.substring(0, 7));
  });

  it('should reject missing vendor', async () => {
    await expect(
      createExpense({ vendor: '', amount: 10 })
    ).rejects.toThrow('vendor');
  });

  it('should reject vendor exceeding 20 characters', async () => {
    await expect(
      createExpense({
        vendor: 'International House of Pancakes',
        amount: 10,
      })
    ).rejects.toThrow('20');
  });

  it('should reject zero amount', async () => {
    await expect(
      createExpense({ vendor: 'Test', amount: 0 })
    ).rejects.toThrow('amount');
  });

  it('should reject negative amount', async () => {
    await expect(
      createExpense({ vendor: 'Test', amount: -5 })
    ).rejects.toThrow('amount');
  });

  it('should round amount to 2 decimal places', async () => {
    const result = await createExpense({
      vendor: 'Test',
      amount: 5.999,
      date: '2026-03-17',
    });
    expect(result.amount).toBe(6);
  });

  it('should trim vendor whitespace', async () => {
    const result = await createExpense({
      vendor: '  Chipotle  ',
      amount: 12.50,
      date: '2026-03-17',
    });
    expect(result.vendor).toBe('Chipotle');
  });

  it('should store undefined for empty optional fields', async () => {
    const result = await createExpense({
      vendor: 'Shell',
      amount: 45,
      date: '2026-03-17',
      category: '',
      description: '',
    });
    expect(result.category).toBeUndefined();
    expect(result.description).toBeUndefined();
  });
});
```

**Test command:** `npx vitest run tests/data/expense-service.test.ts`

**Commit:** `test: add expense create and validation tests`

---

### Task 2.7 — Write expense-service read/update/delete tests

**File:** `tests/data/expense-service.test.ts` (append to the same file, after the createExpense describe block)

```typescript
describe('getExpensesByMonth', () => {
  it('should return all expenses for a given month', async () => {
    await createExpense({ vendor: 'A', amount: 10, date: '2026-03-15' });
    await createExpense({ vendor: 'B', amount: 20, date: '2026-03-16' });
    await createExpense({ vendor: 'C', amount: 30, date: '2026-04-01' });

    const marchExpenses = await getExpensesByMonth('2026-03');
    expect(marchExpenses).toHaveLength(2);

    const aprilExpenses = await getExpensesByMonth('2026-04');
    expect(aprilExpenses).toHaveLength(1);
  });

  it('should return empty array if no expenses for month', async () => {
    const result = await getExpensesByMonth('2099-01');
    expect(result).toEqual([]);
  });
});

describe('getExpenseById', () => {
  it('should return the expense by id', async () => {
    const created = await createExpense({
      vendor: 'Test',
      amount: 10,
      date: '2026-03-17',
    });
    const result = await getExpenseById(created.id!);
    expect(result).toBeDefined();
    expect(result!.vendor).toBe('Test');
  });

  it('should return undefined for nonexistent id', async () => {
    const result = await getExpenseById(99999);
    expect(result).toBeUndefined();
  });
});

describe('updateExpense', () => {
  it('should update the amount', async () => {
    const created = await createExpense({
      vendor: 'Amazon',
      amount: 25,
      date: '2026-03-17',
    });

    const updated = await updateExpense(created.id!, { amount: 40 });
    expect(updated.amount).toBe(40);
    expect(updated.vendor).toBe('Amazon');
  });

  it('should update the vendor', async () => {
    const created = await createExpense({
      vendor: 'Amaz',
      amount: 25,
      date: '2026-03-17',
    });

    const updated = await updateExpense(created.id!, { vendor: 'Amazon' });
    expect(updated.vendor).toBe('Amazon');
  });

  it('should update the date and recalculate yearMonth', async () => {
    const created = await createExpense({
      vendor: 'Test',
      amount: 10,
      date: '2026-03-15',
    });

    const updated = await updateExpense(created.id!, { date: '2026-04-01' });
    expect(updated.date).toBe('2026-04-01');
    expect(updated.yearMonth).toBe('2026-04');
  });

  it('should reject vendor exceeding 20 chars on update', async () => {
    const created = await createExpense({
      vendor: 'Test',
      amount: 10,
      date: '2026-03-17',
    });

    await expect(
      updateExpense(created.id!, { vendor: 'A very long vendor name here' })
    ).rejects.toThrow('20');
  });

  it('should reject zero amount on update', async () => {
    const created = await createExpense({
      vendor: 'Test',
      amount: 10,
      date: '2026-03-17',
    });

    await expect(
      updateExpense(created.id!, { amount: 0 })
    ).rejects.toThrow('amount');
  });

  it('should throw for nonexistent expense', async () => {
    await expect(
      updateExpense(99999, { amount: 10 })
    ).rejects.toThrow('not found');
  });

  it('should update the updatedAt timestamp', async () => {
    const created = await createExpense({
      vendor: 'Test',
      amount: 10,
      date: '2026-03-17',
    });
    await new Promise((r) => setTimeout(r, 10));
    const updated = await updateExpense(created.id!, { amount: 20 });
    expect(updated.updatedAt).not.toBe(created.updatedAt);
  });
});

describe('deleteExpense', () => {
  it('should delete an existing expense', async () => {
    const created = await createExpense({
      vendor: 'Test',
      amount: 10,
      date: '2026-03-17',
    });

    await deleteExpense(created.id!);

    const result = await getExpenseById(created.id!);
    expect(result).toBeUndefined();
  });

  it('should throw for nonexistent expense', async () => {
    await expect(deleteExpense(99999)).rejects.toThrow('not found');
  });

  it('should not affect other expenses', async () => {
    const a = await createExpense({ vendor: 'A', amount: 10, date: '2026-03-17' });
    const b = await createExpense({ vendor: 'B', amount: 20, date: '2026-03-17' });

    await deleteExpense(a.id!);

    const remaining = await getExpensesByMonth('2026-03');
    expect(remaining).toHaveLength(1);
    expect(remaining[0].vendor).toBe('B');
  });
});
```

**Test command:** `npx vitest run tests/data/expense-service.test.ts`

**Commit:** `test: add expense read, update, delete tests`

---

### Task 2.8 — Write balance-with-expenses integration tests

**File:** `tests/data/balance-integration.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/data/db';
import { createBudgetMonth, calculateBalance } from '../../src/data/budget-service';
import { createExpense, updateExpense, deleteExpense } from '../../src/data/expense-service';

beforeEach(async () => {
  await db.budgetMonths.clear();
  await db.expenses.clear();
});

describe('balance recalculation on expense writes', () => {
  it('should reflect expense deduction in balance', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
    });

    await createExpense({
      vendor: 'Starbucks',
      amount: 5.75,
      date: '2026-03-17',
    });

    const snapshot = await calculateBalance('2026-03');
    expect(snapshot.totalExpenses).toBe(5.75);
    // balance = (100 * daysElapsed) + 0 + 0 - 5.75
    expect(snapshot.balance).toBe(
      snapshot.dailyAllowance * snapshot.daysElapsed - 5.75
    );
  });

  it('should reflect multiple expenses', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
    });

    await createExpense({ vendor: 'A', amount: 50, date: '2026-03-15' });
    await createExpense({ vendor: 'B', amount: 50, date: '2026-03-16' });

    const snapshot = await calculateBalance('2026-03');
    expect(snapshot.totalExpenses).toBe(100);
  });

  it('should reflect updated expense amount in balance', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
    });

    const expense = await createExpense({
      vendor: 'Amazon',
      amount: 25,
      date: '2026-03-17',
    });

    await updateExpense(expense.id!, { amount: 40 });
    const snapshot = await calculateBalance('2026-03');
    expect(snapshot.totalExpenses).toBe(40);
  });

  it('should reflect deleted expense in balance', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
    });

    const e1 = await createExpense({ vendor: 'A', amount: 50, date: '2026-03-15' });
    await createExpense({ vendor: 'B', amount: 50, date: '2026-03-16' });

    await deleteExpense(e1.id!);
    const snapshot = await calculateBalance('2026-03');
    expect(snapshot.totalExpenses).toBe(50);
  });

  it('should include carry-over and additional funds in balance', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 50,
      additionalFunds: 25,
    });

    await createExpense({ vendor: 'Test', amount: 60, date: '2026-03-01' });

    const snapshot = await calculateBalance('2026-03');
    // balance = (100 * daysElapsed) + 50 + 25 - 60
    expect(snapshot.balance).toBe(
      snapshot.dailyAllowance * snapshot.daysElapsed + 50 + 25 - 60
    );
  });
});
```

**Test command:** `npx vitest run tests/data/balance-integration.test.ts`

**Commit:** `test: add balance-with-expenses integration tests`

---

## Section 3: React Hooks (useBudget, useExpenses)

### Task 3.1 — Create useBudget hook

**File:** `src/hooks/useBudget.ts`

```typescript
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import {
  calculateBalance,
  createBudgetMonth,
  updateBudgetMonth,
  type CreateBudgetMonthInput,
  type UpdateBudgetMonthInput,
  type BalanceSnapshot,
} from '../data/budget-service';
import { currentYearMonth } from '../lib/dates';

export interface UseBudgetReturn {
  budgetMonth: ReturnType<typeof useLiveQuery<import('../data/db').BudgetMonth | undefined>>;
  balance: BalanceSnapshot | null;
  loading: boolean;
  error: Error | null;
  createMonth: (input: CreateBudgetMonthInput) => Promise<void>;
  updateMonth: (input: UpdateBudgetMonthInput) => Promise<void>;
}

export function useBudget(yearMonth?: string) {
  const activeMonth = yearMonth ?? currentYearMonth();

  const budgetMonth = useLiveQuery(
    () => db.budgetMonths.get(activeMonth),
    [activeMonth]
  );

  // Re-query balance whenever expenses or budgetMonths change
  const balance = useLiveQuery(
    async () => {
      const bm = await db.budgetMonths.get(activeMonth);
      if (!bm) return null;
      return calculateBalance(activeMonth);
    },
    [activeMonth]
  );

  const loading = budgetMonth === undefined && balance === undefined;

  const createMonth = async (input: CreateBudgetMonthInput) => {
    await createBudgetMonth(input);
  };

  const updateMonth = async (input: UpdateBudgetMonthInput) => {
    await updateBudgetMonth(activeMonth, input);
  };

  return {
    budgetMonth: budgetMonth ?? null,
    balance: balance ?? null,
    loading,
    createMonth,
    updateMonth,
  };
}
```

**Commit:** `feat: add useBudget hook with live query balance`

---

### Task 3.2 — Create useExpenses hook

**File:** `src/hooks/useExpenses.ts`

```typescript
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Expense } from '../data/db';
import {
  createExpense,
  updateExpense,
  deleteExpense,
  type CreateExpenseInput,
  type UpdateExpenseInput,
} from '../data/expense-service';
import { currentYearMonth } from '../lib/dates';

export function useExpenses(yearMonth?: string) {
  const activeMonth = yearMonth ?? currentYearMonth();

  const expenses = useLiveQuery(
    () => db.expenses.where('yearMonth').equals(activeMonth).toArray(),
    [activeMonth]
  );

  const loading = expenses === undefined;

  const addExpense = async (input: CreateExpenseInput): Promise<Expense> => {
    return createExpense(input);
  };

  const editExpense = async (
    id: number,
    input: UpdateExpenseInput
  ): Promise<Expense> => {
    return updateExpense(id, input);
  };

  const removeExpense = async (id: number): Promise<void> => {
    return deleteExpense(id);
  };

  return {
    expenses: expenses ?? [],
    loading,
    addExpense,
    editExpense,
    removeExpense,
  };
}
```

**Commit:** `feat: add useExpenses hook with live query`

---

### Task 3.3 — Write hook tests

**File:** `tests/hooks/useBudget.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { db } from '../../src/data/db';
import { useBudget } from '../../src/hooks/useBudget';

beforeEach(async () => {
  await db.budgetMonths.clear();
  await db.expenses.clear();
});

describe('useBudget', () => {
  it('should return null budgetMonth when none exists', async () => {
    const { result } = renderHook(() => useBudget('2099-01'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.budgetMonth).toBeNull();
    expect(result.current.balance).toBeNull();
  });

  it('should create a budget month and return it', async () => {
    const { result } = renderHook(() => useBudget('2026-03'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.createMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
    });

    await waitFor(() => {
      expect(result.current.budgetMonth).not.toBeNull();
    });

    expect(result.current.budgetMonth!.monthlyAmount).toBe(3100);
    expect(result.current.balance).not.toBeNull();
  });
});
```

**File:** `tests/hooks/useExpenses.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { db } from '../../src/data/db';
import { useExpenses } from '../../src/hooks/useExpenses';

beforeEach(async () => {
  await db.budgetMonths.clear();
  await db.expenses.clear();
});

describe('useExpenses', () => {
  it('should return empty array when no expenses exist', async () => {
    const { result } = renderHook(() => useExpenses('2026-03'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.expenses).toEqual([]);
  });

  it('should add an expense and reflect it in the list', async () => {
    const { result } = renderHook(() => useExpenses('2026-03'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.addExpense({
        vendor: 'Test',
        amount: 10,
        date: '2026-03-17',
      });
    });

    await waitFor(() => {
      expect(result.current.expenses).toHaveLength(1);
    });

    expect(result.current.expenses[0].vendor).toBe('Test');
  });

  it('should delete an expense and reflect it in the list', async () => {
    const { result } = renderHook(() => useExpenses('2026-03'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let expense: Awaited<ReturnType<typeof result.current.addExpense>>;
    await act(async () => {
      expense = await result.current.addExpense({
        vendor: 'ToDelete',
        amount: 10,
        date: '2026-03-17',
      });
    });

    await waitFor(() => {
      expect(result.current.expenses).toHaveLength(1);
    });

    await act(async () => {
      await result.current.removeExpense(expense.id!);
    });

    await waitFor(() => {
      expect(result.current.expenses).toHaveLength(0);
    });
  });
});
```

**Test command:** `npx vitest run tests/hooks/`

**Commit:** `test: add useBudget and useExpenses hook tests`

---

## Section 4: Budget Screen Layout + Balance Display

### Task 4.1 — Create BalanceHeader component

**File:** `src/screens/budget/BalanceHeader.tsx`

```tsx
import { formatCurrency } from '../../lib/currency';
import type { BalanceSnapshot } from '../../data/budget-service';

interface BalanceHeaderProps {
  balance: BalanceSnapshot;
  today: string;
}

export function BalanceHeader({ balance, today }: BalanceHeaderProps) {
  const isPositive = balance.balance >= 0;

  return (
    <div className="px-4 py-6 text-center" data-testid="balance-header">
      {/* Current Balance */}
      <p className="text-sm text-gray-500 uppercase tracking-wide">
        Current Balance
      </p>
      <p
        className={`text-5xl font-bold mt-1 ${
          isPositive ? 'text-green-600' : 'text-red-600'
        }`}
        data-testid="balance-amount"
      >
        {isPositive ? '' : '-'}${formatCurrency(Math.abs(balance.balance))}
      </p>

      {/* Today's info row */}
      <div className="mt-4 flex justify-center gap-6 text-sm text-gray-600">
        <div>
          <p className="font-medium">{today}</p>
          <p className="text-xs text-gray-400">Today</p>
        </div>
        <div>
          <p className="font-medium">${formatCurrency(balance.dailyAllowance)}</p>
          <p className="text-xs text-gray-400">Daily Budget</p>
        </div>
        <div>
          <p className="font-medium">${formatCurrency(balance.todaySpent)}</p>
          <p className="text-xs text-gray-400">Spent Today</p>
        </div>
      </div>
    </div>
  );
}
```

**Commit:** `feat: add BalanceHeader with green/red color coding`

---

### Task 4.2 — Create BudgetSetupPrompt component

**File:** `src/screens/budget/BudgetSetupPrompt.tsx`

```tsx
import { useState } from 'react';
import type { CreateBudgetMonthInput } from '../../data/budget-service';

interface BudgetSetupPromptProps {
  yearMonth: string;
  onSetup: (input: CreateBudgetMonthInput) => Promise<void>;
}

export function BudgetSetupPrompt({ yearMonth, onSetup }: BudgetSetupPromptProps) {
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amount = parseFloat(monthlyAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid monthly budget amount greater than zero.');
      return;
    }

    setSubmitting(true);
    try {
      await onSetup({ yearMonth, monthlyAmount: amount });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create budget month');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center px-4 py-12"
      data-testid="budget-setup-prompt"
    >
      <h2 className="text-xl font-semibold text-gray-700 mb-2">
        No Budget Configured
      </h2>
      <p className="text-gray-500 mb-6 text-center max-w-sm">
        Set your monthly budget to start tracking expenses for{' '}
        <span className="font-medium">{yearMonth}</span>.
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <div>
          <label
            htmlFor="monthly-amount"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Monthly Budget Amount
          </label>
          <input
            id="monthly-amount"
            type="number"
            step="0.01"
            min="0.01"
            value={monthlyAmount}
            onChange={(e) => setMonthlyAmount(e.target.value)}
            placeholder="e.g. 3100.00"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {error && (
          <p className="text-sm text-red-600" data-testid="setup-error">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Setting up...' : 'Set Budget'}
        </button>
      </form>
    </div>
  );
}
```

**Commit:** `feat: add BudgetSetupPrompt component`

---

### Task 4.3 — Create BudgetScreen component

**File:** `src/screens/budget/BudgetScreen.tsx`

```tsx
import { useBudget } from '../../hooks/useBudget';
import { useExpenses } from '../../hooks/useExpenses';
import { today as getToday, currentYearMonth } from '../../lib/dates';
import { BalanceHeader } from './BalanceHeader';
import { BudgetSetupPrompt } from './BudgetSetupPrompt';
import { ExpenseForm } from './ExpenseForm';
import { ExpenseTable } from './ExpenseTable';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export function BudgetScreen() {
  const yearMonth = currentYearMonth();
  const { budgetMonth, balance, loading: budgetLoading, createMonth } = useBudget(yearMonth);
  const { expenses, loading: expensesLoading, addExpense, editExpense, removeExpense } =
    useExpenses(yearMonth);

  const loading = budgetLoading || expensesLoading;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (!budgetMonth) {
    return <BudgetSetupPrompt yearMonth={yearMonth} onSetup={createMonth} />;
  }

  return (
    <div className="pb-20" data-testid="budget-screen">
      {/* Balance Header */}
      {balance && <BalanceHeader balance={balance} today={getToday()} />}

      {/* Expense Entry Form */}
      <ExpenseForm onSubmit={addExpense} />

      {/* Expense Table with Daily Grouping */}
      <ExpenseTable
        expenses={expenses}
        dailyAllowance={budgetMonth.dailyAllowance}
        carryOver={budgetMonth.carryOver}
        additionalFunds={budgetMonth.additionalFunds}
        onEdit={editExpense}
        onDelete={removeExpense}
      />
    </div>
  );
}
```

**Commit:** `feat: add BudgetScreen with balance display and setup prompt`

---

### Task 4.4 — Write BudgetScreen tests

**File:** `tests/screens/budget/BudgetScreen.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '../../../src/data/db';
import { BudgetScreen } from '../../../src/screens/budget/BudgetScreen';

beforeEach(async () => {
  await db.budgetMonths.clear();
  await db.expenses.clear();
});

describe('BudgetScreen', () => {
  it('should show setup prompt when no budget month exists', async () => {
    render(<BudgetScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('budget-setup-prompt')).toBeInTheDocument();
    });
  });

  it('should show balance header after budget is created', async () => {
    const user = userEvent.setup();
    render(<BudgetScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('budget-setup-prompt')).toBeInTheDocument();
    });

    // Fill in the monthly amount and submit
    const input = screen.getByLabelText(/monthly budget amount/i);
    await user.type(input, '3100');
    await user.click(screen.getByRole('button', { name: /set budget/i }));

    await waitFor(() => {
      expect(screen.getByTestId('balance-header')).toBeInTheDocument();
    });
  });
});
```

**Test command:** `npx vitest run tests/screens/budget/BudgetScreen.test.tsx`

**Commit:** `test: add BudgetScreen component tests`

---

### Task 4.5 — Write BalanceHeader tests

**File:** `tests/screens/budget/BalanceHeader.test.tsx`

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BalanceHeader } from '../../../src/screens/budget/BalanceHeader';
import type { BalanceSnapshot } from '../../../src/data/budget-service';

function makeSnapshot(overrides: Partial<BalanceSnapshot> = {}): BalanceSnapshot {
  return {
    balance: 200,
    dailyAllowance: 100,
    daysElapsed: 17,
    carryOver: 0,
    additionalFunds: 0,
    totalExpenses: 1500,
    todaySpent: 45,
    ...overrides,
  };
}

describe('BalanceHeader', () => {
  it('should display positive balance in green', () => {
    render(<BalanceHeader balance={makeSnapshot({ balance: 200 })} today="2026-03-17" />);

    const balanceEl = screen.getByTestId('balance-amount');
    expect(balanceEl.textContent).toContain('200.00');
    expect(balanceEl.className).toContain('text-green-600');
  });

  it('should display negative balance in red', () => {
    render(<BalanceHeader balance={makeSnapshot({ balance: -300 })} today="2026-03-17" />);

    const balanceEl = screen.getByTestId('balance-amount');
    expect(balanceEl.textContent).toContain('300.00');
    expect(balanceEl.className).toContain('text-red-600');
  });

  it('should display zero balance in green', () => {
    render(<BalanceHeader balance={makeSnapshot({ balance: 0 })} today="2026-03-17" />);

    const balanceEl = screen.getByTestId('balance-amount');
    expect(balanceEl.textContent).toContain('0.00');
    expect(balanceEl.className).toContain('text-green-600');
  });

  it('should display daily budget amount', () => {
    render(<BalanceHeader balance={makeSnapshot({ dailyAllowance: 100 })} today="2026-03-17" />);

    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('Daily Budget')).toBeInTheDocument();
  });

  it('should display today spent amount', () => {
    render(<BalanceHeader balance={makeSnapshot({ todaySpent: 45 })} today="2026-03-17" />);

    expect(screen.getByText('$45.00')).toBeInTheDocument();
    expect(screen.getByText('Spent Today')).toBeInTheDocument();
  });

  it('should display today date', () => {
    render(<BalanceHeader balance={makeSnapshot()} today="2026-03-17" />);

    expect(screen.getByText('2026-03-17')).toBeInTheDocument();
  });
});
```

**Test command:** `npx vitest run tests/screens/budget/BalanceHeader.test.tsx`

**Commit:** `test: add BalanceHeader component tests`

---

## Section 5: Expense Entry Form

### Task 5.1 — Create ExpenseForm component

**File:** `src/screens/budget/ExpenseForm.tsx`

```tsx
import { useState } from 'react';
import { today as getToday } from '../../lib/dates';
import { MAX_VENDOR_LENGTH } from '../../lib/constants';
import type { CreateExpenseInput } from '../../data/expense-service';
import type { Expense } from '../../data/db';

interface ExpenseFormProps {
  onSubmit: (input: CreateExpenseInput) => Promise<Expense>;
}

export function ExpenseForm({ onSubmit }: ExpenseFormProps) {
  const [date, setDate] = useState(getToday());
  const [category, setCategory] = useState('');
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    if (!vendor.trim()) {
      newErrors.vendor = 'Vendor is required';
    } else if (vendor.trim().length > MAX_VENDOR_LENGTH) {
      newErrors.vendor = `Vendor must be ${MAX_VENDOR_LENGTH} characters or fewer`;
    }

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      newErrors.amount = 'Amount must be greater than zero';
    }

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      await onSubmit({
        date,
        category: category.trim() || undefined,
        vendor: vendor.trim(),
        amount: parseFloat(amount),
        description: description.trim() || undefined,
      });

      // Clear form on success
      setDate(getToday());
      setCategory('');
      setVendor('');
      setAmount('');
      setDescription('');
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : 'Failed to save expense',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="px-4 py-4 border-b border-gray-200"
      data-testid="expense-form"
    >
      <h3 className="text-lg font-semibold text-gray-700 mb-3">Add Expense</h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Date */}
        <div>
          <label htmlFor="expense-date" className="block text-xs font-medium text-gray-600 mb-1">
            Date
          </label>
          <input
            id="expense-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Category */}
        <div>
          <label htmlFor="expense-category" className="block text-xs font-medium text-gray-600 mb-1">
            Category
          </label>
          <input
            id="expense-category"
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Food"
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Vendor */}
        <div>
          <label htmlFor="expense-vendor" className="block text-xs font-medium text-gray-600 mb-1">
            Vendor *
          </label>
          <div className="relative">
            <input
              id="expense-vendor"
              type="text"
              value={vendor}
              onChange={(e) => {
                if (e.target.value.length <= MAX_VENDOR_LENGTH) {
                  setVendor(e.target.value);
                }
              }}
              maxLength={MAX_VENDOR_LENGTH}
              placeholder="e.g. Starbucks"
              className={`w-full px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.vendor ? 'border-red-500' : 'border-gray-300'
              }`}
              aria-describedby="vendor-counter"
            />
            <span
              id="vendor-counter"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400"
            >
              {vendor.length}/{MAX_VENDOR_LENGTH}
            </span>
          </div>
          {errors.vendor && (
            <p className="text-xs text-red-600 mt-0.5" data-testid="vendor-error">
              {errors.vendor}
            </p>
          )}
        </div>

        {/* Amount */}
        <div>
          <label htmlFor="expense-amount" className="block text-xs font-medium text-gray-600 mb-1">
            Amount *
          </label>
          <input
            id="expense-amount"
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className={`w-full px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.amount ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.amount && (
            <p className="text-xs text-red-600 mt-0.5" data-testid="amount-error">
              {errors.amount}
            </p>
          )}
        </div>
      </div>

      {/* Description (full width) */}
      <div className="mt-3">
        <label htmlFor="expense-description" className="block text-xs font-medium text-gray-600 mb-1">
          Description
        </label>
        <input
          id="expense-description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional notes"
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Form-level error */}
      {errors.form && (
        <p className="text-sm text-red-600 mt-2" data-testid="form-error">
          {errors.form}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="mt-3 w-full py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Adding...' : 'Add Expense'}
      </button>
    </form>
  );
}
```

**Commit:** `feat: add ExpenseForm with validation and character counter`

---

### Task 5.2 — Write ExpenseForm tests

**File:** `tests/screens/budget/ExpenseForm.test.tsx`

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpenseForm } from '../../../src/screens/budget/ExpenseForm';
import type { Expense } from '../../../src/data/db';

const mockSubmit = vi.fn();

beforeEach(() => {
  mockSubmit.mockReset();
  mockSubmit.mockResolvedValue({
    id: 1,
    vendor: 'Test',
    amount: 10,
    date: '2026-03-17',
    yearMonth: '2026-03',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Expense);
});

describe('ExpenseForm', () => {
  it('should render all form fields', () => {
    render(<ExpenseForm onSubmit={mockSubmit} />);

    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/vendor/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add expense/i })).toBeInTheDocument();
  });

  it('should submit with valid required fields only', async () => {
    const user = userEvent.setup();
    render(<ExpenseForm onSubmit={mockSubmit} />);

    await user.type(screen.getByLabelText(/vendor/i), 'Shell');
    await user.type(screen.getByLabelText(/amount/i), '45');
    await user.click(screen.getByRole('button', { name: /add expense/i }));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });

    const call = mockSubmit.mock.calls[0][0];
    expect(call.vendor).toBe('Shell');
    expect(call.amount).toBe(45);
  });

  it('should submit with all fields filled', async () => {
    const user = userEvent.setup();
    render(<ExpenseForm onSubmit={mockSubmit} />);

    await user.type(screen.getByLabelText(/vendor/i), 'Chipotle');
    await user.type(screen.getByLabelText(/amount/i), '12.50');
    await user.type(screen.getByLabelText(/category/i), 'Dining');
    await user.type(screen.getByLabelText(/description/i), 'Lunch burrito');
    await user.click(screen.getByRole('button', { name: /add expense/i }));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });

    const call = mockSubmit.mock.calls[0][0];
    expect(call.vendor).toBe('Chipotle');
    expect(call.amount).toBe(12.5);
    expect(call.category).toBe('Dining');
    expect(call.description).toBe('Lunch burrito');
  });

  it('should show error when vendor is empty', async () => {
    const user = userEvent.setup();
    render(<ExpenseForm onSubmit={mockSubmit} />);

    await user.type(screen.getByLabelText(/amount/i), '20');
    await user.click(screen.getByRole('button', { name: /add expense/i }));

    await waitFor(() => {
      expect(screen.getByTestId('vendor-error')).toBeInTheDocument();
    });

    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('should show error when amount is zero', async () => {
    const user = userEvent.setup();
    render(<ExpenseForm onSubmit={mockSubmit} />);

    await user.type(screen.getByLabelText(/vendor/i), 'Test');
    await user.type(screen.getByLabelText(/amount/i), '0');
    await user.click(screen.getByRole('button', { name: /add expense/i }));

    await waitFor(() => {
      expect(screen.getByTestId('amount-error')).toBeInTheDocument();
    });

    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('should enforce vendor character limit', async () => {
    const user = userEvent.setup();
    render(<ExpenseForm onSubmit={mockSubmit} />);

    const vendorInput = screen.getByLabelText(/vendor/i);
    await user.type(vendorInput, 'A'.repeat(25));

    // Input should be capped at 20 chars
    expect((vendorInput as HTMLInputElement).value.length).toBeLessThanOrEqual(20);
  });

  it('should display character counter for vendor', () => {
    render(<ExpenseForm onSubmit={mockSubmit} />);
    expect(screen.getByText('0/20')).toBeInTheDocument();
  });

  it('should clear form after successful submit', async () => {
    const user = userEvent.setup();
    render(<ExpenseForm onSubmit={mockSubmit} />);

    const vendorInput = screen.getByLabelText(/vendor/i) as HTMLInputElement;
    const amountInput = screen.getByLabelText(/amount/i) as HTMLInputElement;

    await user.type(vendorInput, 'Test');
    await user.type(amountInput, '10');
    await user.click(screen.getByRole('button', { name: /add expense/i }));

    await waitFor(() => {
      expect(vendorInput.value).toBe('');
    });
    expect(amountInput.value).toBe('');
  });
});
```

**Test command:** `npx vitest run tests/screens/budget/ExpenseForm.test.tsx`

**Commit:** `test: add ExpenseForm component tests`

---

## Section 6: Expense Table with Daily Grouping

### Task 6.1 — Create daily grouping utility

**File:** `src/screens/budget/expense-grouping.ts`

```typescript
import type { Expense } from '../../data/db';
import { roundCurrency } from '../../lib/currency';

export interface DailyGroup {
  date: string;
  expenses: Expense[];
  dailyTotal: number;
  runningBalance: number;
}

/**
 * Groups expenses by date and calculates running balances.
 *
 * Running balance for a given date =
 *   (dailyAllowance x dayNumber) + carryOver + additionalFunds - cumulativeExpenses
 *
 * dayNumber is derived from the date (e.g., "2026-03-17" -> day 17).
 *
 * Returns groups sorted by date descending (most recent first).
 */
export function groupExpensesByDay(
  expenses: Expense[],
  dailyAllowance: number,
  carryOver: number,
  additionalFunds: number
): DailyGroup[] {
  // Group by date
  const groupMap = new Map<string, Expense[]>();
  for (const expense of expenses) {
    const existing = groupMap.get(expense.date);
    if (existing) {
      existing.push(expense);
    } else {
      groupMap.set(expense.date, [expense]);
    }
  }

  // Sort dates ascending for running balance calculation
  const sortedDates = Array.from(groupMap.keys()).sort();

  // Calculate cumulative expenses for running balance
  let cumulativeExpenses = 0;
  const groups: DailyGroup[] = [];

  for (const date of sortedDates) {
    const dayExpenses = groupMap.get(date)!;
    const dailyTotal = roundCurrency(
      dayExpenses.reduce((sum, e) => sum + e.amount, 0)
    );
    cumulativeExpenses = roundCurrency(cumulativeExpenses + dailyTotal);

    // dayNumber from the date string (e.g., "2026-03-17" -> 17)
    const dayNumber = parseInt(date.split('-')[2], 10);

    const runningBalance = roundCurrency(
      dailyAllowance * dayNumber + carryOver + additionalFunds - cumulativeExpenses
    );

    groups.push({
      date,
      expenses: dayExpenses,
      dailyTotal,
      runningBalance,
    });
  }

  // Reverse to show most recent first
  return groups.reverse();
}
```

**Commit:** `feat: add expense daily grouping utility with running balance`

---

### Task 6.2 — Write grouping utility tests

**File:** `tests/screens/budget/expense-grouping.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { groupExpensesByDay } from '../../../src/screens/budget/expense-grouping';
import type { Expense } from '../../../src/data/db';

function makeExpense(overrides: Partial<Expense>): Expense {
  return {
    id: Math.floor(Math.random() * 10000),
    yearMonth: '2026-03',
    date: '2026-03-17',
    vendor: 'Test',
    amount: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('groupExpensesByDay', () => {
  it('should group expenses by date', () => {
    const expenses = [
      makeExpense({ date: '2026-03-15', vendor: 'A', amount: 10 }),
      makeExpense({ date: '2026-03-16', vendor: 'B', amount: 20 }),
      makeExpense({ date: '2026-03-15', vendor: 'C', amount: 30 }),
    ];

    const groups = groupExpensesByDay(expenses, 100, 0, 0);
    expect(groups).toHaveLength(2);
  });

  it('should order groups most recent first', () => {
    const expenses = [
      makeExpense({ date: '2026-03-15', amount: 10 }),
      makeExpense({ date: '2026-03-17', amount: 20 }),
      makeExpense({ date: '2026-03-16', amount: 30 }),
    ];

    const groups = groupExpensesByDay(expenses, 100, 0, 0);
    expect(groups[0].date).toBe('2026-03-17');
    expect(groups[1].date).toBe('2026-03-16');
    expect(groups[2].date).toBe('2026-03-15');
  });

  it('should calculate daily totals', () => {
    const expenses = [
      makeExpense({ date: '2026-03-15', amount: 10 }),
      makeExpense({ date: '2026-03-15', amount: 20 }),
      makeExpense({ date: '2026-03-15', amount: 30 }),
    ];

    const groups = groupExpensesByDay(expenses, 100, 0, 0);
    expect(groups[0].dailyTotal).toBe(60);
  });

  it('should calculate running balance across days', () => {
    // daily allowance = 100, no carry-over, no additional funds
    // Day 1: budget 100 - spent 80 = 20
    // Day 2: budget 200 - spent (80+120) = 0
    // Day 3: budget 300 - spent (80+120+50) = 50
    const expenses = [
      makeExpense({ date: '2026-03-01', amount: 80 }),
      makeExpense({ date: '2026-03-02', amount: 120 }),
      makeExpense({ date: '2026-03-03', amount: 50 }),
    ];

    const groups = groupExpensesByDay(expenses, 100, 0, 0);

    // Groups are reversed (most recent first)
    expect(groups[2].date).toBe('2026-03-01');
    expect(groups[2].runningBalance).toBe(20);

    expect(groups[1].date).toBe('2026-03-02');
    expect(groups[1].runningBalance).toBe(0);

    expect(groups[0].date).toBe('2026-03-03');
    expect(groups[0].runningBalance).toBe(50);
  });

  it('should include carry-over and additional funds in running balance', () => {
    // daily allowance = 100, carry-over = 50, additional = 25
    // Day 1: 100 + 50 + 25 - 60 = 115
    const expenses = [makeExpense({ date: '2026-03-01', amount: 60 })];

    const groups = groupExpensesByDay(expenses, 100, 50, 25);
    expect(groups[0].runningBalance).toBe(115);
  });

  it('should return empty array for no expenses', () => {
    const groups = groupExpensesByDay([], 100, 0, 0);
    expect(groups).toEqual([]);
  });

  it('should round all monetary values to 2 decimal places', () => {
    const expenses = [
      makeExpense({ date: '2026-03-01', amount: 33.33 }),
      makeExpense({ date: '2026-03-01', amount: 33.33 }),
      makeExpense({ date: '2026-03-01', amount: 33.34 }),
    ];

    const groups = groupExpensesByDay(expenses, 100, 0, 0);
    expect(groups[0].dailyTotal).toBe(100);
    expect(groups[0].runningBalance).toBe(0);
  });
});
```

**Test command:** `npx vitest run tests/screens/budget/expense-grouping.test.ts`

**Commit:** `test: add expense daily grouping utility tests`

---

### Task 6.3 — Create ExpenseTable component

**File:** `src/screens/budget/ExpenseTable.tsx`

```tsx
import { useState } from 'react';
import type { Expense } from '../../data/db';
import type { UpdateExpenseInput } from '../../data/expense-service';
import { formatCurrency } from '../../lib/currency';
import { groupExpensesByDay, type DailyGroup } from './expense-grouping';
import { ExpenseEditModal } from './ExpenseEditModal';
import { EmptyState } from '../../components/EmptyState';

interface ExpenseTableProps {
  expenses: Expense[];
  dailyAllowance: number;
  carryOver: number;
  additionalFunds: number;
  onEdit: (id: number, input: UpdateExpenseInput) => Promise<Expense>;
  onDelete: (id: number) => Promise<void>;
}

export function ExpenseTable({
  expenses,
  dailyAllowance,
  carryOver,
  additionalFunds,
  onEdit,
  onDelete,
}: ExpenseTableProps) {
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const groups = groupExpensesByDay(expenses, dailyAllowance, carryOver, additionalFunds);

  if (groups.length === 0) {
    return (
      <div className="px-4 py-8">
        <EmptyState message="No expenses recorded yet. Add your first expense above." />
      </div>
    );
  }

  const toggleDate = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  return (
    <div className="px-4 py-4" data-testid="expense-table">
      {groups.map((group) => (
        <DailyGroupRow
          key={group.date}
          group={group}
          dailyAllowance={dailyAllowance}
          expanded={expandedDates.has(group.date)}
          onToggle={() => toggleDate(group.date)}
          onExpenseClick={(expense) => setEditingExpense(expense)}
        />
      ))}

      {editingExpense && (
        <ExpenseEditModal
          expense={editingExpense}
          onSave={async (input) => {
            await onEdit(editingExpense.id!, input);
            setEditingExpense(null);
          }}
          onDelete={async () => {
            await onDelete(editingExpense.id!);
            setEditingExpense(null);
          }}
          onClose={() => setEditingExpense(null)}
        />
      )}
    </div>
  );
}

// --- DailyGroupRow ---

interface DailyGroupRowProps {
  group: DailyGroup;
  dailyAllowance: number;
  expanded: boolean;
  onToggle: () => void;
  onExpenseClick: (expense: Expense) => void;
}

function DailyGroupRow({
  group,
  dailyAllowance,
  expanded,
  onToggle,
  onExpenseClick,
}: DailyGroupRowProps) {
  const isOverspent = group.runningBalance < 0;

  return (
    <div className="mb-2" data-testid={`day-group-${group.date}`}>
      {/* Date Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        aria-expanded={expanded}
        aria-label={`${group.date}: spent ${formatCurrency(group.dailyTotal)} of ${formatCurrency(dailyAllowance)}`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`text-xs transition-transform ${expanded ? 'rotate-90' : ''}`}
          >
            &#9654;
          </span>
          <span className="font-medium text-sm text-gray-800">{group.date}</span>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>Budget: ${formatCurrency(dailyAllowance)}</span>
          <span>Spent: ${formatCurrency(group.dailyTotal)}</span>
          <span
            className={`font-semibold ${isOverspent ? 'text-red-600' : 'text-green-600'}`}
          >
            Bal: {isOverspent ? '-' : ''}${formatCurrency(Math.abs(group.runningBalance))}
          </span>
        </div>
      </button>

      {/* Expense Rows */}
      {expanded && (
        <div className="mt-1 ml-5 space-y-1">
          {group.expenses.map((expense) => (
            <button
              key={expense.id}
              onClick={() => onExpenseClick(expense)}
              className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-100 rounded hover:bg-gray-50 transition-colors text-left"
              data-testid={`expense-row-${expense.id}`}
            >
              <div>
                <span className="text-sm font-medium text-gray-700">
                  {expense.vendor}
                </span>
                {expense.category && (
                  <span className="ml-2 text-xs text-gray-400">{expense.category}</span>
                )}
                {expense.description && (
                  <p className="text-xs text-gray-400 mt-0.5">{expense.description}</p>
                )}
              </div>
              <span className="text-sm font-semibold text-gray-800">
                ${formatCurrency(expense.amount)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Commit:** `feat: add ExpenseTable with daily grouping and expand/collapse`

---

### Task 6.4 — Write ExpenseTable tests

**File:** `tests/screens/budget/ExpenseTable.test.tsx`

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpenseTable } from '../../../src/screens/budget/ExpenseTable';
import type { Expense } from '../../../src/data/db';

function makeExpense(overrides: Partial<Expense>): Expense {
  return {
    id: Math.floor(Math.random() * 10000),
    yearMonth: '2026-03',
    date: '2026-03-17',
    vendor: 'Test',
    amount: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const mockEdit = vi.fn().mockResolvedValue({});
const mockDelete = vi.fn().mockResolvedValue(undefined);

describe('ExpenseTable', () => {
  it('should show empty state when no expenses', () => {
    render(
      <ExpenseTable
        expenses={[]}
        dailyAllowance={100}
        carryOver={0}
        additionalFunds={0}
        onEdit={mockEdit}
        onDelete={mockDelete}
      />
    );

    expect(screen.getByText(/no expenses recorded/i)).toBeInTheDocument();
  });

  it('should render date group headers', () => {
    const expenses = [
      makeExpense({ id: 1, date: '2026-03-15', vendor: 'A', amount: 10 }),
      makeExpense({ id: 2, date: '2026-03-16', vendor: 'B', amount: 20 }),
    ];

    render(
      <ExpenseTable
        expenses={expenses}
        dailyAllowance={100}
        carryOver={0}
        additionalFunds={0}
        onEdit={mockEdit}
        onDelete={mockDelete}
      />
    );

    expect(screen.getByTestId('day-group-2026-03-15')).toBeInTheDocument();
    expect(screen.getByTestId('day-group-2026-03-16')).toBeInTheDocument();
  });

  it('should expand a date group on click to show expense rows', async () => {
    const user = userEvent.setup();
    const expenses = [
      makeExpense({ id: 1, date: '2026-03-15', vendor: 'Starbucks', amount: 5.75 }),
      makeExpense({ id: 2, date: '2026-03-15', vendor: 'Chipotle', amount: 12.50 }),
    ];

    render(
      <ExpenseTable
        expenses={expenses}
        dailyAllowance={100}
        carryOver={0}
        additionalFunds={0}
        onEdit={mockEdit}
        onDelete={mockDelete}
      />
    );

    // Initially, individual expense rows should not be visible
    expect(screen.queryByText('Starbucks')).not.toBeInTheDocument();

    // Click the date header to expand
    const header = screen.getByRole('button', { name: /2026-03-15/i });
    await user.click(header);

    // Now individual rows should appear
    expect(screen.getByText('Starbucks')).toBeInTheDocument();
    expect(screen.getByText('Chipotle')).toBeInTheDocument();
  });

  it('should collapse an expanded date group on second click', async () => {
    const user = userEvent.setup();
    const expenses = [
      makeExpense({ id: 1, date: '2026-03-15', vendor: 'Starbucks', amount: 5 }),
    ];

    render(
      <ExpenseTable
        expenses={expenses}
        dailyAllowance={100}
        carryOver={0}
        additionalFunds={0}
        onEdit={mockEdit}
        onDelete={mockDelete}
      />
    );

    const header = screen.getByRole('button', { name: /2026-03-15/i });

    // Expand
    await user.click(header);
    expect(screen.getByText('Starbucks')).toBeInTheDocument();

    // Collapse
    await user.click(header);
    expect(screen.queryByText('Starbucks')).not.toBeInTheDocument();
  });

  it('should display most recent date first', () => {
    const expenses = [
      makeExpense({ id: 1, date: '2026-03-14', vendor: 'A', amount: 10 }),
      makeExpense({ id: 2, date: '2026-03-16', vendor: 'B', amount: 20 }),
      makeExpense({ id: 3, date: '2026-03-15', vendor: 'C', amount: 30 }),
    ];

    render(
      <ExpenseTable
        expenses={expenses}
        dailyAllowance={100}
        carryOver={0}
        additionalFunds={0}
        onEdit={mockEdit}
        onDelete={mockDelete}
      />
    );

    const groups = screen.getAllByTestId(/^day-group-/);
    expect(groups[0].getAttribute('data-testid')).toBe('day-group-2026-03-16');
    expect(groups[1].getAttribute('data-testid')).toBe('day-group-2026-03-15');
    expect(groups[2].getAttribute('data-testid')).toBe('day-group-2026-03-14');
  });
});
```

**Test command:** `npx vitest run tests/screens/budget/ExpenseTable.test.tsx`

**Commit:** `test: add ExpenseTable component tests`

---

## Section 7: Expense Edit and Delete

### Task 7.1 — Create ExpenseEditModal component

**File:** `src/screens/budget/ExpenseEditModal.tsx`

```tsx
import { useState } from 'react';
import type { Expense } from '../../data/db';
import type { UpdateExpenseInput } from '../../data/expense-service';
import { MAX_VENDOR_LENGTH } from '../../lib/constants';
import { ConfirmDialog } from '../../components/ConfirmDialog';

interface ExpenseEditModalProps {
  expense: Expense;
  onSave: (input: UpdateExpenseInput) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}

export function ExpenseEditModal({
  expense,
  onSave,
  onDelete,
  onClose,
}: ExpenseEditModalProps) {
  const [date, setDate] = useState(expense.date);
  const [category, setCategory] = useState(expense.category ?? '');
  const [vendor, setVendor] = useState(expense.vendor);
  const [amount, setAmount] = useState(expense.amount.toString());
  const [description, setDescription] = useState(expense.description ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const validate = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    if (!vendor.trim()) {
      newErrors.vendor = 'Vendor is required';
    } else if (vendor.trim().length > MAX_VENDOR_LENGTH) {
      newErrors.vendor = `Vendor must be ${MAX_VENDOR_LENGTH} characters or fewer`;
    }

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      newErrors.amount = 'Amount must be greater than zero';
    }

    return newErrors;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      await onSave({
        date,
        category: category.trim() || undefined,
        vendor: vendor.trim(),
        amount: parseFloat(amount),
        description: description.trim() || undefined,
      });
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : 'Failed to save expense',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await onDelete();
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : 'Failed to delete expense',
      });
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        data-testid="edit-modal-backdrop"
      />

      {/* Modal */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl p-4 max-h-[90vh] overflow-y-auto"
        data-testid="expense-edit-modal"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-700">Edit Expense</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          {/* Date */}
          <div>
            <label htmlFor="edit-date" className="block text-xs font-medium text-gray-600 mb-1">
              Date
            </label>
            <input
              id="edit-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="edit-category" className="block text-xs font-medium text-gray-600 mb-1">
              Category
            </label>
            <input
              id="edit-category"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Food"
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Vendor */}
          <div>
            <label htmlFor="edit-vendor" className="block text-xs font-medium text-gray-600 mb-1">
              Vendor *
            </label>
            <div className="relative">
              <input
                id="edit-vendor"
                type="text"
                value={vendor}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_VENDOR_LENGTH) {
                    setVendor(e.target.value);
                  }
                }}
                maxLength={MAX_VENDOR_LENGTH}
                className={`w-full px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.vendor ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                {vendor.length}/{MAX_VENDOR_LENGTH}
              </span>
            </div>
            {errors.vendor && (
              <p className="text-xs text-red-600 mt-0.5" data-testid="edit-vendor-error">
                {errors.vendor}
              </p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="edit-amount" className="block text-xs font-medium text-gray-600 mb-1">
              Amount *
            </label>
            <input
              id="edit-amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`w-full px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.amount ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.amount && (
              <p className="text-xs text-red-600 mt-0.5" data-testid="edit-amount-error">
                {errors.amount}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="edit-description" className="block text-xs font-medium text-gray-600 mb-1">
              Description
            </label>
            <input
              id="edit-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes"
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Form-level error */}
          {errors.form && (
            <p className="text-sm text-red-600" data-testid="edit-form-error">
              {errors.form}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={submitting}
              className="py-2 px-4 bg-red-50 text-red-600 rounded-lg font-medium text-sm hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete
            </button>
          </div>
        </form>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Expense"
          message={`Delete "${expense.vendor}" for $${expense.amount.toFixed(2)}? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
}
```

**Commit:** `feat: add ExpenseEditModal with edit and delete confirmation`

---

### Task 7.2 — Write ExpenseEditModal tests

**File:** `tests/screens/budget/ExpenseEditModal.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpenseEditModal } from '../../../src/screens/budget/ExpenseEditModal';
import type { Expense } from '../../../src/data/db';

const baseExpense: Expense = {
  id: 1,
  yearMonth: '2026-03',
  date: '2026-03-17',
  vendor: 'Amazon',
  amount: 25,
  category: 'Shopping',
  description: 'Test purchase',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockSave = vi.fn();
const mockDelete = vi.fn();
const mockClose = vi.fn();

beforeEach(() => {
  mockSave.mockReset().mockResolvedValue(undefined);
  mockDelete.mockReset().mockResolvedValue(undefined);
  mockClose.mockReset();
});

describe('ExpenseEditModal', () => {
  it('should pre-populate fields with expense data', () => {
    render(
      <ExpenseEditModal
        expense={baseExpense}
        onSave={mockSave}
        onDelete={mockDelete}
        onClose={mockClose}
      />
    );

    expect((screen.getByLabelText(/vendor/i) as HTMLInputElement).value).toBe('Amazon');
    expect((screen.getByLabelText(/amount/i) as HTMLInputElement).value).toBe('25');
    expect((screen.getByLabelText(/category/i) as HTMLInputElement).value).toBe('Shopping');
    expect((screen.getByLabelText(/description/i) as HTMLInputElement).value).toBe('Test purchase');
  });

  it('should call onSave with updated values', async () => {
    const user = userEvent.setup();
    render(
      <ExpenseEditModal
        expense={baseExpense}
        onSave={mockSave}
        onDelete={mockDelete}
        onClose={mockClose}
      />
    );

    const amountInput = screen.getByLabelText(/amount/i);
    await user.clear(amountInput);
    await user.type(amountInput, '30');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    expect(mockSave.mock.calls[0][0].amount).toBe(30);
  });

  it('should show validation error when vendor is cleared', async () => {
    const user = userEvent.setup();
    render(
      <ExpenseEditModal
        expense={baseExpense}
        onSave={mockSave}
        onDelete={mockDelete}
        onClose={mockClose}
      />
    );

    const vendorInput = screen.getByLabelText(/vendor/i);
    await user.clear(vendorInput);
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByTestId('edit-vendor-error')).toBeInTheDocument();
    });

    expect(mockSave).not.toHaveBeenCalled();
  });

  it('should show delete confirmation dialog', async () => {
    const user = userEvent.setup();
    render(
      <ExpenseEditModal
        expense={baseExpense}
        onSave={mockSave}
        onDelete={mockDelete}
        onClose={mockClose}
      />
    );

    await user.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    });
  });

  it('should call onDelete when delete is confirmed', async () => {
    const user = userEvent.setup();
    render(
      <ExpenseEditModal
        expense={baseExpense}
        onSave={mockSave}
        onDelete={mockDelete}
        onClose={mockClose}
      />
    );

    // Click delete button
    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    // Confirm in dialog
    await waitFor(() => {
      expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole('button', { name: /^delete$/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledTimes(1);
    });
  });

  it('should not call onDelete when delete is cancelled', async () => {
    const user = userEvent.setup();
    render(
      <ExpenseEditModal
        expense={baseExpense}
        onSave={mockSave}
        onDelete={mockDelete}
        onClose={mockClose}
      />
    );

    // Click delete button
    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    // Cancel in dialog
    await waitFor(() => {
      expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    });

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelBtn);

    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('should call onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ExpenseEditModal
        expense={baseExpense}
        onSave={mockSave}
        onDelete={mockDelete}
        onClose={mockClose}
      />
    );

    await user.click(screen.getByTestId('edit-modal-backdrop'));
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ExpenseEditModal
        expense={baseExpense}
        onSave={mockSave}
        onDelete={mockDelete}
        onClose={mockClose}
      />
    );

    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});
```

**Test command:** `npx vitest run tests/screens/budget/ExpenseEditModal.test.tsx`

**Commit:** `test: add ExpenseEditModal component tests`

---

### Task 7.3 — Wire BudgetScreen route (update App.tsx)

**File:** `src/App.tsx` — update the budget route import:

Replace the placeholder budget screen import:

```typescript
// Replace this line:
import { BudgetScreen } from './screens/budget/BudgetPlaceholder';
// With:
import { BudgetScreen } from './screens/budget/BudgetScreen';
```

> If the placeholder uses a different export name or pattern, match it. The key change is pointing the `/budget` route to the new `BudgetScreen` component from `./screens/budget/BudgetScreen`.

**Commit:** `feat: wire BudgetScreen to /budget route`

---

## Section 8: Final Integration Verification

### Task 8.1 — Run all tests

```bash
npx vitest run
```

All tests from these files should pass:

- `tests/data/budget-service.test.ts`
- `tests/data/expense-service.test.ts`
- `tests/data/balance-integration.test.ts`
- `tests/hooks/useBudget.test.tsx`
- `tests/hooks/useExpenses.test.tsx`
- `tests/screens/budget/BalanceHeader.test.tsx`
- `tests/screens/budget/ExpenseForm.test.tsx`
- `tests/screens/budget/ExpenseTable.test.tsx`
- `tests/screens/budget/ExpenseEditModal.test.tsx`
- `tests/screens/budget/BudgetScreen.test.tsx`

**Commit:** `test: verify all Stage 3 tests pass`

---

### Task 8.2 — TypeScript strict check

```bash
npx tsc --noEmit
```

Ensure zero type errors across all new files.

**Commit (if fixes needed):** `fix: resolve TypeScript strict mode errors`

---

### Task 8.3 — Lint check

```bash
npx eslint src/data/budget-service.ts src/data/expense-service.ts src/hooks/useBudget.ts src/hooks/useExpenses.ts src/screens/budget/
```

Fix any lint issues.

**Commit (if fixes needed):** `fix: resolve lint issues in Stage 3 files`

---

## File Summary

### New Files Created

| File | Purpose |
|------|---------|
| `src/data/budget-service.ts` | Budget month CRUD + daily allowance + balance calculation |
| `src/data/expense-service.ts` | Expense CRUD + validation (contract surface for Stage 6) |
| `src/hooks/useBudget.ts` | React hook wrapping budget-service with live query |
| `src/hooks/useExpenses.ts` | React hook wrapping expense-service with live query |
| `src/screens/budget/BalanceHeader.tsx` | Balance display with green/red color coding |
| `src/screens/budget/BudgetSetupPrompt.tsx` | Setup prompt when no budget month exists |
| `src/screens/budget/BudgetScreen.tsx` | Main budget screen composition |
| `src/screens/budget/ExpenseForm.tsx` | Expense entry form with validation + char counter |
| `src/screens/budget/ExpenseTable.tsx` | Expense table with daily grouping + expand/collapse |
| `src/screens/budget/ExpenseEditModal.tsx` | Edit/delete modal with confirmation |
| `src/screens/budget/expense-grouping.ts` | Daily grouping + running balance utility |
| `tests/data/budget-service.test.ts` | Budget service unit tests |
| `tests/data/expense-service.test.ts` | Expense service unit tests (validation, CRUD) |
| `tests/data/balance-integration.test.ts` | Balance recalculation integration tests |
| `tests/hooks/useBudget.test.tsx` | useBudget hook tests |
| `tests/hooks/useExpenses.test.tsx` | useExpenses hook tests |
| `tests/screens/budget/BalanceHeader.test.tsx` | BalanceHeader component tests |
| `tests/screens/budget/ExpenseForm.test.tsx` | ExpenseForm component tests |
| `tests/screens/budget/ExpenseTable.test.tsx` | ExpenseTable component tests |
| `tests/screens/budget/ExpenseEditModal.test.tsx` | ExpenseEditModal component tests |
| `tests/screens/budget/BudgetScreen.test.tsx` | BudgetScreen integration tests |

### Modified Files

| File | Change |
|------|--------|
| `src/App.tsx` | Update budget route to use new BudgetScreen |

### Contract Surface for Stage 6 (AI Agent)

The AI agent will import and call these functions directly:

```typescript
import { createExpense, updateExpense, deleteExpense } from './data/expense-service';
import type { CreateExpenseInput, UpdateExpenseInput } from './data/expense-service';
```

These functions are framework-agnostic, validate all inputs identically regardless of caller, and trigger balance recalculation through the shared `calculateBalance()` function.

---

## Commit Sequence

1. `feat: add createBudgetMonth with daily allowance calculation`
2. `feat: add getBudgetMonth and updateBudgetMonth`
3. `feat: add calculateBalance with full budget formula`
4. `test: add budget month service tests`
5. `feat: add expense-service types and validation`
6. `feat: add createExpense with validation and date defaulting`
7. `feat: add getExpensesByMonth and getExpenseById`
8. `feat: add updateExpense with validation and yearMonth recalculation`
9. `feat: add deleteExpense`
10. `test: add expense create and validation tests`
11. `test: add expense read, update, delete tests`
12. `test: add balance-with-expenses integration tests`
13. `feat: add useBudget hook with live query balance`
14. `feat: add useExpenses hook with live query`
15. `test: add useBudget and useExpenses hook tests`
16. `feat: add BalanceHeader with green/red color coding`
17. `feat: add BudgetSetupPrompt component`
18. `feat: add BudgetScreen with balance display and setup prompt`
19. `test: add BudgetScreen component tests`
20. `test: add BalanceHeader component tests`
21. `feat: add ExpenseForm with validation and character counter`
22. `test: add ExpenseForm component tests`
23. `feat: add expense daily grouping utility with running balance`
24. `test: add expense daily grouping utility tests`
25. `feat: add ExpenseTable with daily grouping and expand/collapse`
26. `test: add ExpenseTable component tests`
27. `feat: add ExpenseEditModal with edit and delete confirmation`
28. `test: add ExpenseEditModal component tests`
29. `feat: wire BudgetScreen to /budget route`
30. `test: verify all Stage 3 tests pass`
