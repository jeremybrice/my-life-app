# Stage 4: Budget Advanced Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the budget module with full Daily Budget Tracker parity -- month navigation, carry-over chaining, additional funds, summary reports, and live dashboard integration.

**Architecture:** Extends budget-service.ts and expense-service.ts with chaining and reporting logic. Month selector is transient UI state (not persisted). Carry-over propagation runs synchronously on past-month expense changes. Dashboard cards consume the prop interfaces defined in Stage 2.

**Tech Stack:** React, TypeScript, Dexie.js (useLiveQuery), Vitest, React Testing Library

**Depends on:** Stage 2 (dashboard card interfaces), Stage 3 (budget-service, expense-service, budget screen, expense table)
**Produces for later stages:** Complete budget data model (Stage 6 AI Agent writes through expense-service), dashboard budget cards live (Stage 7 notifications read budget data)

---

## Section 1: Month Selector Component + Integration

### Task 1.1 -- Add `previousYearMonth` / `nextYearMonth` to dates utility tests

**File:** `tests/lib/dates.test.ts`

Verify the date helpers that Stage 3 implemented. If these tests do not already exist, add them now. The month selector depends on these functions.

```typescript
// Append to existing tests/lib/dates.test.ts

import { previousYearMonth, nextYearMonth } from '../../src/lib/dates';

describe('previousYearMonth', () => {
  it('should return previous month in same year', () => {
    expect(previousYearMonth('2026-03')).toBe('2026-02');
  });

  it('should wrap to December of previous year', () => {
    expect(previousYearMonth('2026-01')).toBe('2025-12');
  });
});

describe('nextYearMonth', () => {
  it('should return next month in same year', () => {
    expect(nextYearMonth('2026-03')).toBe('2026-04');
  });

  it('should wrap to January of next year', () => {
    expect(nextYearMonth('2026-12')).toBe('2027-01');
  });
});
```

**Test command:** `npx vitest run tests/lib/dates.test.ts`

**Commit:** `test: verify previousYearMonth and nextYearMonth helpers`

---

### Task 1.2 -- Create MonthSelector component

**File:** `src/screens/budget/MonthSelector.tsx`

A simple prev/next arrow selector displaying the formatted month and year. Accepts `selectedMonth` (string "YYYY-MM") and `onMonthChange` callback. No data fetching -- pure presentation.

```tsx
import { previousYearMonth, nextYearMonth } from '../../lib/dates';

export interface MonthSelectorProps {
  selectedMonth: string; // "YYYY-MM"
  onMonthChange: (yearMonth: string) => void;
}

function formatMonthLabel(yearMonth: string): string {
  const [yearStr, monthStr] = yearMonth.split('-');
  const date = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function MonthSelector({ selectedMonth, onMonthChange }: MonthSelectorProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2">
      <button
        type="button"
        aria-label="Previous month"
        onClick={() => onMonthChange(previousYearMonth(selectedMonth))}
        className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </button>
      <span className="text-lg font-semibold" data-testid="month-label">
        {formatMonthLabel(selectedMonth)}
      </span>
      <button
        type="button"
        aria-label="Next month"
        onClick={() => onMonthChange(nextYearMonth(selectedMonth))}
        className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
}
```

**Test command:** `npx vitest run tests/screens/budget/MonthSelector.test.tsx`
(test file created in next task)

**Commit:** `feat: add MonthSelector component for budget month navigation`

---

### Task 1.3 -- Test MonthSelector component

**File:** `tests/screens/budget/MonthSelector.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import MonthSelector from '../../../src/screens/budget/MonthSelector';

describe('MonthSelector', () => {
  it('should display the formatted month and year', () => {
    render(<MonthSelector selectedMonth="2026-03" onMonthChange={() => {}} />);
    expect(screen.getByTestId('month-label')).toHaveTextContent('March 2026');
  });

  it('should call onMonthChange with previous month when left arrow clicked', async () => {
    const user = userEvent.setup();
    const onMonthChange = vi.fn();
    render(<MonthSelector selectedMonth="2026-03" onMonthChange={onMonthChange} />);

    await user.click(screen.getByLabelText('Previous month'));
    expect(onMonthChange).toHaveBeenCalledWith('2026-02');
  });

  it('should call onMonthChange with next month when right arrow clicked', async () => {
    const user = userEvent.setup();
    const onMonthChange = vi.fn();
    render(<MonthSelector selectedMonth="2026-03" onMonthChange={onMonthChange} />);

    await user.click(screen.getByLabelText('Next month'));
    expect(onMonthChange).toHaveBeenCalledWith('2026-04');
  });

  it('should handle year boundary correctly (January to December)', () => {
    render(<MonthSelector selectedMonth="2026-01" onMonthChange={() => {}} />);
    expect(screen.getByTestId('month-label')).toHaveTextContent('January 2026');
  });

  it('should handle December display', () => {
    render(<MonthSelector selectedMonth="2025-12" onMonthChange={() => {}} />);
    expect(screen.getByTestId('month-label')).toHaveTextContent('December 2025');
  });
});
```

**Test command:** `npx vitest run tests/screens/budget/MonthSelector.test.tsx`

**Commit:** `test: add MonthSelector component tests`

---

### Task 1.4 -- Integrate MonthSelector into BudgetScreen with transient state

**File:** `src/screens/budget/BudgetScreen.tsx`

Update the existing BudgetScreen to hold `selectedMonth` state that defaults to `currentYearMonth()` and resets on mount. Wire the MonthSelector into the screen header, and pass `selectedMonth` to all child components (balance display, expense table, entry form).

The key change: `selectedMonth` is a `useState` that initializes to `currentYearMonth()`. An `useEffect` with empty deps resets it on mount (handles screen re-entry). All existing child components that previously used `currentYearMonth()` directly now receive `selectedMonth` as a prop.

```tsx
// At the top of BudgetScreen.tsx, add/modify:
import { useState, useEffect } from 'react';
import { currentYearMonth } from '../../lib/dates';
import MonthSelector from './MonthSelector';

// Inside the component body:
export default function BudgetScreen() {
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth());

  // Reset to current month on screen re-entry (component mount)
  useEffect(() => {
    setSelectedMonth(currentYearMonth());
  }, []);

  // Replace all occurrences of currentYearMonth() with selectedMonth
  // in useBudget() and useExpenses() hook calls:
  const { budgetMonth, loading: budgetLoading } = useBudget(selectedMonth);
  const { expenses, loading: expensesLoading, addExpense, updateExpense, deleteExpense } = useExpenses(selectedMonth);

  return (
    <div className="flex flex-col h-full">
      <MonthSelector
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
      />
      {/* ... rest of existing layout, passing selectedMonth where needed ... */}
      {/* BalanceHeader now uses selectedMonth */}
      {/* ExpenseTable now uses selectedMonth */}
      {/* ExpenseForm now uses selectedMonth */}
    </div>
  );
}
```

> **Note to implementor:** The exact integration depends on the Stage 3 BudgetScreen structure. The key changes are:
> 1. Add `selectedMonth` state initialized to `currentYearMonth()`
> 2. Add `useEffect(() => setSelectedMonth(currentYearMonth()), [])` for reset on re-entry
> 3. Add `<MonthSelector>` at the top of the screen layout
> 4. Replace all hardcoded `currentYearMonth()` calls in hooks with `selectedMonth`
> 5. Pass `selectedMonth` to any child components that need month context

**Test command:** `npx vitest run tests/screens/budget/BudgetScreen.test.tsx`

**Commit:** `feat: integrate MonthSelector into BudgetScreen with transient state`

---

### Task 1.5 -- Test BudgetScreen month selector integration

**File:** `tests/screens/budget/BudgetScreen.test.tsx`

Add tests to the existing BudgetScreen test file for the month selector integration.

```tsx
// Append to existing tests/screens/budget/BudgetScreen.test.tsx

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import BudgetScreen from '../../../src/screens/budget/BudgetScreen';
import { createBudgetMonth } from '../../../src/data/budget-service';
import { createExpense } from '../../../src/data/expense-service';
import { db } from '../../../src/data/db';
import { currentYearMonth, previousYearMonth } from '../../../src/lib/dates';

// Helper to render with router
function renderBudgetScreen() {
  return render(
    <MemoryRouter>
      <BudgetScreen />
    </MemoryRouter>
  );
}

describe('BudgetScreen - Month Selector Integration', () => {
  beforeEach(async () => {
    await db.budgetMonths.clear();
    await db.expenses.clear();
  });

  it('should default to current month on initial render', async () => {
    await createBudgetMonth({
      yearMonth: currentYearMonth(),
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });

    renderBudgetScreen();

    await waitFor(() => {
      const label = screen.getByTestId('month-label');
      const now = new Date();
      const expectedLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      expect(label).toHaveTextContent(expectedLabel);
    });
  });

  it('should navigate to previous month and show that month data', async () => {
    const user = userEvent.setup();
    const current = currentYearMonth();
    const prev = previousYearMonth(current);

    await createBudgetMonth({
      yearMonth: current,
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createBudgetMonth({
      yearMonth: prev,
      monthlyAmount: 2800,
      carryOver: 0,
      additionalFunds: 0,
    });

    renderBudgetScreen();

    await user.click(screen.getByLabelText('Previous month'));

    await waitFor(() => {
      const [yearStr, monthStr] = prev.split('-');
      const date = new Date(Number(yearStr), Number(monthStr) - 1, 1);
      const expectedLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      expect(screen.getByTestId('month-label')).toHaveTextContent(expectedLabel);
    });
  });

  it('should show setup prompt for month with no budget record', async () => {
    renderBudgetScreen();

    await waitFor(() => {
      // The exact text depends on Stage 3 implementation, but should indicate no budget configured
      expect(screen.getByText(/set up|configure|no budget/i)).toBeInTheDocument();
    });
  });
});
```

**Test command:** `npx vitest run tests/screens/budget/BudgetScreen.test.tsx`

**Commit:** `test: add BudgetScreen month selector integration tests`

---

## Section 2: Monthly Chaining / Carry-Over Logic

### Task 2.1 -- Add `getEndingBalance` to budget-service

**File:** `src/data/budget-service.ts`

Add a function that calculates the ending balance for a completed month. This is the foundation for carry-over calculations. The ending balance is: monthlyAmount + carryOver + additionalFunds - totalExpenses.

```typescript
import { db, type BudgetMonth } from './db';
import { roundCurrency } from '../lib/currency';

/**
 * Calculate the ending balance for a given month.
 * Ending balance = monthlyAmount + carryOver + additionalFunds - totalExpenses
 * Used for carry-over calculation to the next month.
 */
export async function getEndingBalance(yearMonth: string): Promise<number> {
  const budgetMonth = await db.budgetMonths.get(yearMonth);
  if (!budgetMonth) {
    throw new Error(`No budget month found for ${yearMonth}`);
  }

  const expenses = await db.expenses.where('yearMonth').equals(yearMonth).toArray();
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return roundCurrency(
    budgetMonth.monthlyAmount + budgetMonth.carryOver + budgetMonth.additionalFunds - totalExpenses
  );
}
```

**Test command:** `npx vitest run tests/data/budget-service.test.ts`
(test in next task)

**Commit:** `feat: add getEndingBalance to budget-service`

---

### Task 2.2 -- Test `getEndingBalance`

**File:** `tests/data/budget-service.test.ts`

Append to existing tests.

```typescript
import { getEndingBalance, createBudgetMonth } from '../../src/data/budget-service';
import { createExpense } from '../../src/data/expense-service';
import { db } from '../../src/data/db';

describe('getEndingBalance', () => {
  beforeEach(async () => {
    await db.budgetMonths.clear();
    await db.expenses.clear();
  });

  it('should return monthlyAmount when no expenses exist', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });

    const balance = await getEndingBalance('2026-03');
    expect(balance).toBe(3100);
  });

  it('should subtract total expenses from budget', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ yearMonth: '2026-03', date: '2026-03-01', vendor: 'Store', amount: 500 });
    await createExpense({ yearMonth: '2026-03', date: '2026-03-02', vendor: 'Cafe', amount: 200 });

    const balance = await getEndingBalance('2026-03');
    expect(balance).toBe(2400);
  });

  it('should include carryOver in ending balance', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 100,
      additionalFunds: 0,
    });
    await createExpense({ yearMonth: '2026-03', date: '2026-03-01', vendor: 'Store', amount: 2900 });

    const balance = await getEndingBalance('2026-03');
    expect(balance).toBe(300);
  });

  it('should include additionalFunds in ending balance', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 200,
    });
    await createExpense({ yearMonth: '2026-03', date: '2026-03-01', vendor: 'Store', amount: 3000 });

    const balance = await getEndingBalance('2026-03');
    expect(balance).toBe(300);
  });

  it('should return negative ending balance when overspent', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ yearMonth: '2026-03', date: '2026-03-01', vendor: 'Store', amount: 3500 });

    const balance = await getEndingBalance('2026-03');
    expect(balance).toBe(-400);
  });

  it('should throw for nonexistent month', async () => {
    await expect(getEndingBalance('2099-01')).rejects.toThrow('No budget month found for 2099-01');
  });
});
```

**Test command:** `npx vitest run tests/data/budget-service.test.ts`

**Commit:** `test: add getEndingBalance tests`

---

### Task 2.3 -- Add `initializeMonth` to budget-service

**File:** `src/data/budget-service.ts`

Add the monthly chaining initialization function. When a new month is accessed, this function:
1. Checks if the month already exists (returns it if so)
2. Looks up the previous month
3. If previous month exists: copies monthlyAmount, calculates carryOver from ending balance, sets additionalFunds to 0
4. If no previous month: uses monthlyBudget from settings, carryOver = 0, additionalFunds = 0

```typescript
import { db, type BudgetMonth, type Settings } from './db';
import { roundCurrency } from '../lib/currency';
import { previousYearMonth, daysInMonth } from '../lib/dates';
import { SETTINGS_ID } from '../lib/constants';

/**
 * Initialize a budget month if it does not already exist.
 * Copies monthlyAmount from previous month (or settings if first month).
 * Calculates carryOver from previous month's ending balance.
 * additionalFunds always starts at 0 (not copied).
 * Returns the existing or newly created BudgetMonth.
 */
export async function initializeMonth(yearMonth: string): Promise<BudgetMonth> {
  // If month already exists, return it
  const existing = await db.budgetMonths.get(yearMonth);
  if (existing) {
    return existing;
  }

  const prevMonth = previousYearMonth(yearMonth);
  const prevBudget = await db.budgetMonths.get(prevMonth);

  let monthlyAmount: number;
  let carryOver: number;

  if (prevBudget) {
    // Copy monthly amount from previous month
    monthlyAmount = prevBudget.monthlyAmount;
    // Calculate carry-over from previous month's ending balance
    carryOver = await getEndingBalance(prevMonth);
  } else {
    // First month in chain -- use settings or default
    const settings = await db.settings.get(SETTINGS_ID);
    monthlyAmount = settings?.monthlyBudget ?? 0;
    carryOver = 0;
  }

  const days = daysInMonth(yearMonth);
  const dailyAllowance = roundCurrency(monthlyAmount / days);
  const now = new Date().toISOString();

  const newMonth: BudgetMonth = {
    yearMonth,
    monthlyAmount,
    dailyAllowance,
    carryOver: roundCurrency(carryOver),
    additionalFunds: 0,
    createdAt: now,
    updatedAt: now,
  };

  await db.budgetMonths.put(newMonth);
  return newMonth;
}
```

**Test command:** `npx vitest run tests/data/budget-service.test.ts`

**Commit:** `feat: add initializeMonth with carry-over chaining`

---

### Task 2.4 -- Test `initializeMonth`

**File:** `tests/data/budget-service.test.ts`

```typescript
import { initializeMonth, createBudgetMonth, getEndingBalance } from '../../src/data/budget-service';
import { createExpense } from '../../src/data/expense-service';
import { db } from '../../src/data/db';
import { SETTINGS_ID } from '../../src/lib/constants';

describe('initializeMonth', () => {
  beforeEach(async () => {
    await db.budgetMonths.clear();
    await db.expenses.clear();
    await db.settings.clear();
  });

  it('should return existing month without modification', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 50,
      additionalFunds: 100,
    });

    const result = await initializeMonth('2026-03');
    expect(result.monthlyAmount).toBe(3100);
    expect(result.carryOver).toBe(50);
    expect(result.additionalFunds).toBe(100);
  });

  it('should create new month with carry-over from previous month ending balance', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ yearMonth: '2026-03', date: '2026-03-15', vendor: 'Store', amount: 2900 });

    const result = await initializeMonth('2026-04');
    expect(result.yearMonth).toBe('2026-04');
    expect(result.monthlyAmount).toBe(3100); // copied from March
    expect(result.carryOver).toBe(200); // 3100 - 2900
    expect(result.additionalFunds).toBe(0); // always 0 for new months
  });

  it('should handle negative carry-over when previous month overspent', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ yearMonth: '2026-03', date: '2026-03-15', vendor: 'Store', amount: 3500 });

    const result = await initializeMonth('2026-04');
    expect(result.carryOver).toBe(-400); // 3100 - 3500
  });

  it('should create first month with zero carry-over using settings budget', async () => {
    await db.settings.put({ id: SETTINGS_ID, monthlyBudget: 3100 });

    const result = await initializeMonth('2026-03');
    expect(result.yearMonth).toBe('2026-03');
    expect(result.monthlyAmount).toBe(3100);
    expect(result.carryOver).toBe(0);
    expect(result.additionalFunds).toBe(0);
  });

  it('should create first month with zero budget when no settings exist', async () => {
    const result = await initializeMonth('2026-03');
    expect(result.monthlyAmount).toBe(0);
    expect(result.carryOver).toBe(0);
  });

  it('should include previous months additionalFunds in carry-over calculation', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 200,
    });
    await createExpense({ yearMonth: '2026-03', date: '2026-03-15', vendor: 'Store', amount: 3000 });

    const result = await initializeMonth('2026-04');
    // carryOver = 3100 + 0 + 200 - 3000 = 300
    expect(result.carryOver).toBe(300);
  });

  it('should not copy additionalFunds from previous month', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 500,
    });

    const result = await initializeMonth('2026-04');
    expect(result.additionalFunds).toBe(0);
  });

  it('should calculate correct daily allowance for the new month', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });

    const result = await initializeMonth('2026-04');
    // April has 30 days, 3100 / 30 = 103.33
    expect(result.dailyAllowance).toBe(103.33);
  });
});
```

**Test command:** `npx vitest run tests/data/budget-service.test.ts`

**Commit:** `test: add initializeMonth chaining tests`

---

### Task 2.5 -- Add `propagateCarryOver` to budget-service

**File:** `src/data/budget-service.ts`

When an expense in a past month changes, this function recalculates carry-over for ALL subsequent months. It walks forward from the modified month, recalculating each month's carryOver from the previous month's ending balance.

```typescript
import { nextYearMonth, daysInMonth } from '../lib/dates';

/**
 * Propagate carry-over changes forward starting from the month AFTER startYearMonth.
 * Recalculates carryOver for each subsequent month that exists in the database.
 * Stops when it reaches a month that does not exist.
 * Called after any expense change in a past month.
 */
export async function propagateCarryOver(startYearMonth: string): Promise<void> {
  let currentMonth = startYearMonth;

  while (true) {
    const next = nextYearMonth(currentMonth);
    const nextBudget = await db.budgetMonths.get(next);

    // Stop if next month does not exist -- no further chain to update
    if (!nextBudget) {
      break;
    }

    // Recalculate carry-over from the current month's ending balance
    const newCarryOver = await getEndingBalance(currentMonth);

    await db.budgetMonths.update(next, {
      carryOver: roundCurrency(newCarryOver),
      updatedAt: new Date().toISOString(),
    });

    currentMonth = next;
  }
}
```

**Test command:** `npx vitest run tests/data/budget-service.test.ts`

**Commit:** `feat: add propagateCarryOver for forward chain recalculation`

---

### Task 2.6 -- Test `propagateCarryOver`

**File:** `tests/data/budget-service.test.ts`

```typescript
import { propagateCarryOver, createBudgetMonth } from '../../src/data/budget-service';
import { createExpense, updateExpense, deleteExpense } from '../../src/data/expense-service';
import { db } from '../../src/data/db';

describe('propagateCarryOver', () => {
  beforeEach(async () => {
    await db.budgetMonths.clear();
    await db.expenses.clear();
  });

  it('should update next months carry-over after expense change in past month', async () => {
    // Setup: March budget, April initialized from March
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ yearMonth: '2026-03', date: '2026-03-15', vendor: 'Store', amount: 2900 });

    await createBudgetMonth({
      yearMonth: '2026-04',
      monthlyAmount: 3100,
      carryOver: 200, // 3100 - 2900
      additionalFunds: 0,
    });

    // Change: add more expense to March
    await createExpense({ yearMonth: '2026-03', date: '2026-03-20', vendor: 'Shop', amount: 300 });

    // Propagate from March forward
    await propagateCarryOver('2026-03');

    const april = await db.budgetMonths.get('2026-04');
    // New carry-over: 3100 - (2900 + 300) = -100
    expect(april!.carryOver).toBe(-100);
  });

  it('should cascade through multiple months', async () => {
    await createBudgetMonth({
      yearMonth: '2026-01',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ yearMonth: '2026-01', date: '2026-01-15', vendor: 'Store', amount: 3000 });

    await createBudgetMonth({
      yearMonth: '2026-02',
      monthlyAmount: 3100,
      carryOver: 100, // 3100 - 3000
      additionalFunds: 0,
    });
    await createExpense({ yearMonth: '2026-02', date: '2026-02-15', vendor: 'Cafe', amount: 3000 });

    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 200, // 3100 + 100 - 3000
      additionalFunds: 0,
    });

    // Change January: increase expense by 200
    await createExpense({ yearMonth: '2026-01', date: '2026-01-20', vendor: 'Extra', amount: 200 });

    await propagateCarryOver('2026-01');

    const feb = await db.budgetMonths.get('2026-02');
    // Feb carry-over: 3100 - (3000 + 200) = -100
    expect(feb!.carryOver).toBe(-100);

    const march = await db.budgetMonths.get('2026-03');
    // March carry-over: 3100 + (-100) - 3000 = 0
    expect(march!.carryOver).toBe(0);
  });

  it('should stop at month that does not exist', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });

    // No April exists -- propagation should not throw
    await expect(propagateCarryOver('2026-03')).resolves.not.toThrow();
  });

  it('should handle negative carry-over propagation', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ yearMonth: '2026-03', date: '2026-03-15', vendor: 'Store', amount: 4000 });

    await createBudgetMonth({
      yearMonth: '2026-04',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });

    await propagateCarryOver('2026-03');

    const april = await db.budgetMonths.get('2026-04');
    expect(april!.carryOver).toBe(-900); // 3100 - 4000
  });
});
```

**Test command:** `npx vitest run tests/data/budget-service.test.ts`

**Commit:** `test: add propagateCarryOver chain tests`

---

### Task 2.7 -- Wire propagateCarryOver into expense-service write operations

**File:** `src/data/expense-service.ts`

Modify `createExpense`, `updateExpense`, and `deleteExpense` to call `propagateCarryOver` when the affected expense belongs to a month that is NOT the current month (i.e., a past month edit). This ensures carry-over chain integrity is maintained immediately.

```typescript
import { propagateCarryOver } from './budget-service';
import { currentYearMonth } from '../lib/dates';

// In createExpense, after the expense is persisted:
export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  // ... existing validation and persistence logic ...

  // After successful write, propagate if this is a past month
  if (input.yearMonth !== currentYearMonth()) {
    await propagateCarryOver(input.yearMonth);
  }

  return expense;
}

// In updateExpense, after the expense is updated:
export async function updateExpense(id: number, input: UpdateExpenseInput): Promise<Expense> {
  // ... existing validation and persistence logic ...

  const expense = await db.expenses.get(id);
  // After successful write, propagate if this is a past month
  if (expense && expense.yearMonth !== currentYearMonth()) {
    await propagateCarryOver(expense.yearMonth);
  }

  return updatedExpense;
}

// In deleteExpense, after the expense is deleted:
export async function deleteExpense(id: number): Promise<void> {
  const expense = await db.expenses.get(id);
  // ... existing deletion logic ...

  // After successful delete, propagate if this was a past month
  if (expense && expense.yearMonth !== currentYearMonth()) {
    await propagateCarryOver(expense.yearMonth);
  }
}
```

> **Note to implementor:** The changes above show the propagation calls to ADD to the existing functions. Do NOT replace the existing validation/persistence logic. Add the propagation call after the successful write/delete operation. Read the existing expense-service.ts first to understand the current structure, then add the propagation calls at the appropriate points.

**Test command:** `npx vitest run tests/data/expense-service.test.ts`

**Commit:** `feat: wire propagateCarryOver into expense write operations`

---

### Task 2.8 -- Test expense write propagation triggers

**File:** `tests/data/expense-service.test.ts`

Append to the existing expense-service tests.

```typescript
import { createExpense, updateExpense, deleteExpense } from '../../src/data/expense-service';
import { createBudgetMonth } from '../../src/data/budget-service';
import { db } from '../../src/data/db';

describe('expense write carry-over propagation', () => {
  beforeEach(async () => {
    await db.budgetMonths.clear();
    await db.expenses.clear();
  });

  it('should propagate carry-over when creating expense in past month', async () => {
    await createBudgetMonth({
      yearMonth: '2025-12',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createBudgetMonth({
      yearMonth: '2026-01',
      monthlyAmount: 3100,
      carryOver: 3100, // initially full carry-over from Dec
      additionalFunds: 0,
    });

    // Add expense to past month (Dec 2025)
    await createExpense({ yearMonth: '2025-12', date: '2025-12-15', vendor: 'Store', amount: 500 });

    const jan = await db.budgetMonths.get('2026-01');
    // Dec ending balance: 3100 - 500 = 2600
    expect(jan!.carryOver).toBe(2600);
  });

  it('should propagate carry-over when updating expense in past month', async () => {
    await createBudgetMonth({
      yearMonth: '2025-12',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    const expense = await createExpense({ yearMonth: '2025-12', date: '2025-12-15', vendor: 'Store', amount: 500 });

    await createBudgetMonth({
      yearMonth: '2026-01',
      monthlyAmount: 3100,
      carryOver: 2600, // 3100 - 500
      additionalFunds: 0,
    });

    // Update expense amount in Dec
    await updateExpense(expense.id!, { amount: 800 });

    const jan = await db.budgetMonths.get('2026-01');
    // Dec ending balance: 3100 - 800 = 2300
    expect(jan!.carryOver).toBe(2300);
  });

  it('should propagate carry-over when deleting expense in past month', async () => {
    await createBudgetMonth({
      yearMonth: '2025-12',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    const expense = await createExpense({ yearMonth: '2025-12', date: '2025-12-15', vendor: 'Store', amount: 500 });

    await createBudgetMonth({
      yearMonth: '2026-01',
      monthlyAmount: 3100,
      carryOver: 2600, // 3100 - 500
      additionalFunds: 0,
    });

    await deleteExpense(expense.id!);

    const jan = await db.budgetMonths.get('2026-01');
    // Dec ending balance: 3100 - 0 = 3100
    expect(jan!.carryOver).toBe(3100);
  });
});
```

**Test command:** `npx vitest run tests/data/expense-service.test.ts`

**Commit:** `test: verify expense write propagation triggers carry-over updates`

---

### Task 2.9 -- Wire `initializeMonth` into MonthSelector navigation

**File:** `src/screens/budget/BudgetScreen.tsx`

When the user navigates to a new month via the MonthSelector, call `initializeMonth` to auto-create the budget month if it does not exist. This handles the "new month auto-initializes" requirement.

```tsx
import { initializeMonth } from '../../data/budget-service';

// In BudgetScreen, update the month change handler:
const handleMonthChange = async (yearMonth: string) => {
  setSelectedMonth(yearMonth);
  // Auto-initialize the month if it doesn't exist
  await initializeMonth(yearMonth);
};

// Use handleMonthChange instead of setSelectedMonth directly:
<MonthSelector
  selectedMonth={selectedMonth}
  onMonthChange={handleMonthChange}
/>
```

> **Note to implementor:** The `initializeMonth` call is safe to call on existing months (it returns the existing record). It only creates when the month does not exist. This enables the user to navigate to a future month and have it auto-initialize with carry-over from the most recent completed month.

**Test command:** `npx vitest run tests/screens/budget/BudgetScreen.test.tsx`

**Commit:** `feat: auto-initialize months on navigation via MonthSelector`

---

## Section 3: Additional Funds Management

### Task 3.1 -- Add `updateAdditionalFunds` to budget-service

**File:** `src/data/budget-service.ts`

```typescript
/**
 * Update the additional funds for a given budget month.
 * Validates that the value is >= 0.
 * After updating, propagates carry-over forward if this is a past month.
 */
export async function updateAdditionalFunds(
  yearMonth: string,
  additionalFunds: number
): Promise<BudgetMonth> {
  if (additionalFunds < 0) {
    throw new Error('Additional funds must be zero or positive');
  }

  const budgetMonth = await db.budgetMonths.get(yearMonth);
  if (!budgetMonth) {
    throw new Error(`No budget month found for ${yearMonth}`);
  }

  const rounded = roundCurrency(additionalFunds);
  const now = new Date().toISOString();

  await db.budgetMonths.update(yearMonth, {
    additionalFunds: rounded,
    updatedAt: now,
  });

  // Propagate carry-over if this is a past month
  if (yearMonth !== currentYearMonth()) {
    await propagateCarryOver(yearMonth);
  }

  const updated = await db.budgetMonths.get(yearMonth);
  return updated!;
}
```

**Test command:** `npx vitest run tests/data/budget-service.test.ts`

**Commit:** `feat: add updateAdditionalFunds to budget-service`

---

### Task 3.2 -- Test `updateAdditionalFunds`

**File:** `tests/data/budget-service.test.ts`

```typescript
import { updateAdditionalFunds, createBudgetMonth } from '../../src/data/budget-service';
import { db } from '../../src/data/db';

describe('updateAdditionalFunds', () => {
  beforeEach(async () => {
    await db.budgetMonths.clear();
    await db.expenses.clear();
  });

  it('should update additional funds to a positive value', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });

    const result = await updateAdditionalFunds('2026-03', 200);
    expect(result.additionalFunds).toBe(200);
  });

  it('should accept zero additional funds', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 150,
    });

    const result = await updateAdditionalFunds('2026-03', 0);
    expect(result.additionalFunds).toBe(0);
  });

  it('should reject negative additional funds', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });

    await expect(updateAdditionalFunds('2026-03', -50)).rejects.toThrow(
      'Additional funds must be zero or positive'
    );
  });

  it('should round to 2 decimal places', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });

    const result = await updateAdditionalFunds('2026-03', 123.456);
    expect(result.additionalFunds).toBe(123.46);
  });

  it('should throw for nonexistent month', async () => {
    await expect(updateAdditionalFunds('2099-01', 100)).rejects.toThrow(
      'No budget month found for 2099-01'
    );
  });

  it('should propagate carry-over when updating past month', async () => {
    await createBudgetMonth({
      yearMonth: '2025-12',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createBudgetMonth({
      yearMonth: '2026-01',
      monthlyAmount: 3100,
      carryOver: 3100, // Dec ending balance with no expenses
      additionalFunds: 0,
    });

    await updateAdditionalFunds('2025-12', 200);

    const jan = await db.budgetMonths.get('2026-01');
    // Dec ending balance: 3100 + 0 + 200 - 0 = 3300
    expect(jan!.carryOver).toBe(3300);
  });
});
```

**Test command:** `npx vitest run tests/data/budget-service.test.ts`

**Commit:** `test: add updateAdditionalFunds tests`

---

### Task 3.3 -- Add `updateAdditionalFunds` to useBudget hook

**File:** `src/hooks/useBudget.ts`

Expose `updateAdditionalFunds` through the existing useBudget hook so the UI can call it.

```typescript
import { updateAdditionalFunds as updateAdditionalFundsService } from '../data/budget-service';

// Inside useBudget hook, add to the returned object:
export function useBudget(yearMonth: string) {
  // ... existing useLiveQuery for budgetMonth ...

  const setAdditionalFunds = async (amount: number) => {
    return updateAdditionalFundsService(yearMonth, amount);
  };

  return {
    // ... existing properties ...
    budgetMonth,
    loading,
    error,
    setAdditionalFunds,
  };
}
```

> **Note to implementor:** Read the existing useBudget.ts to understand its current structure. Add `setAdditionalFunds` to the returned object alongside existing mutation functions.

**Test command:** `npx vitest run tests/hooks/useBudget.test.ts`

**Commit:** `feat: expose updateAdditionalFunds in useBudget hook`

---

### Task 3.4 -- Create AdditionalFundsInput component

**File:** `src/screens/budget/AdditionalFundsInput.tsx`

An inline editable field for additional funds. Shows the current value, allows editing, validates >= 0, and calls the update function on change.

```tsx
import { useState, useEffect } from 'react';
import { formatCurrency } from '../../lib/currency';

export interface AdditionalFundsInputProps {
  currentAmount: number;
  onUpdate: (amount: number) => Promise<void>;
}

export default function AdditionalFundsInput({ currentAmount, onUpdate }: AdditionalFundsInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(currentAmount));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInputValue(String(currentAmount));
  }, [currentAmount]);

  const handleSave = async () => {
    const parsed = parseFloat(inputValue);
    if (isNaN(parsed)) {
      setError('Please enter a valid number');
      return;
    }
    if (parsed < 0) {
      setError('Additional funds must be zero or positive');
      return;
    }

    try {
      await onUpdate(parsed);
      setError(null);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const handleCancel = () => {
    setInputValue(String(currentAmount));
    setError(null);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Additional Funds:</span>
        <span className="text-sm font-medium" data-testid="additional-funds-display">
          ${formatCurrency(currentAmount)}
        </span>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
          aria-label="Edit additional funds"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">Additional Funds: $</span>
      <input
        type="number"
        min="0"
        step="0.01"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') handleCancel();
        }}
        className="w-24 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        data-testid="additional-funds-input"
        autoFocus
      />
      <button
        type="button"
        onClick={handleSave}
        className="text-sm text-green-600 hover:text-green-800 font-medium"
      >
        Save
      </button>
      <button
        type="button"
        onClick={handleCancel}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        Cancel
      </button>
      {error && <span className="text-sm text-red-600" role="alert">{error}</span>}
    </div>
  );
}
```

**Test command:** `npx vitest run tests/screens/budget/AdditionalFundsInput.test.tsx`

**Commit:** `feat: add AdditionalFundsInput component`

---

### Task 3.5 -- Test AdditionalFundsInput component

**File:** `tests/screens/budget/AdditionalFundsInput.test.tsx`

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import AdditionalFundsInput from '../../../src/screens/budget/AdditionalFundsInput';

describe('AdditionalFundsInput', () => {
  it('should display the current additional funds amount', () => {
    render(<AdditionalFundsInput currentAmount={200} onUpdate={vi.fn()} />);
    expect(screen.getByTestId('additional-funds-display')).toHaveTextContent('$200.00');
  });

  it('should display zero when no additional funds', () => {
    render(<AdditionalFundsInput currentAmount={0} onUpdate={vi.fn()} />);
    expect(screen.getByTestId('additional-funds-display')).toHaveTextContent('$0.00');
  });

  it('should enter edit mode when Edit button clicked', async () => {
    const user = userEvent.setup();
    render(<AdditionalFundsInput currentAmount={0} onUpdate={vi.fn()} />);

    await user.click(screen.getByLabelText('Edit additional funds'));
    expect(screen.getByTestId('additional-funds-input')).toBeInTheDocument();
  });

  it('should call onUpdate with parsed value on save', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(<AdditionalFundsInput currentAmount={0} onUpdate={onUpdate} />);

    await user.click(screen.getByLabelText('Edit additional funds'));
    const input = screen.getByTestId('additional-funds-input');
    await user.clear(input);
    await user.type(input, '150.50');
    await user.click(screen.getByText('Save'));

    expect(onUpdate).toHaveBeenCalledWith(150.50);
  });

  it('should show error for negative value', async () => {
    const user = userEvent.setup();
    render(<AdditionalFundsInput currentAmount={0} onUpdate={vi.fn()} />);

    await user.click(screen.getByLabelText('Edit additional funds'));
    const input = screen.getByTestId('additional-funds-input');
    await user.clear(input);
    await user.type(input, '-50');
    await user.click(screen.getByText('Save'));

    expect(screen.getByRole('alert')).toHaveTextContent('Additional funds must be zero or positive');
  });

  it('should cancel editing and revert value', async () => {
    const user = userEvent.setup();
    render(<AdditionalFundsInput currentAmount={100} onUpdate={vi.fn()} />);

    await user.click(screen.getByLabelText('Edit additional funds'));
    const input = screen.getByTestId('additional-funds-input');
    await user.clear(input);
    await user.type(input, '999');
    await user.click(screen.getByText('Cancel'));

    // Should return to display mode with original value
    expect(screen.getByTestId('additional-funds-display')).toHaveTextContent('$100.00');
  });

  it('should save on Enter key', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(<AdditionalFundsInput currentAmount={0} onUpdate={onUpdate} />);

    await user.click(screen.getByLabelText('Edit additional funds'));
    const input = screen.getByTestId('additional-funds-input');
    await user.clear(input);
    await user.type(input, '75');
    await user.keyboard('{Enter}');

    expect(onUpdate).toHaveBeenCalledWith(75);
  });
});
```

**Test command:** `npx vitest run tests/screens/budget/AdditionalFundsInput.test.tsx`

**Commit:** `test: add AdditionalFundsInput component tests`

---

### Task 3.6 -- Integrate AdditionalFundsInput into BudgetScreen

**File:** `src/screens/budget/BudgetScreen.tsx`

Add the AdditionalFundsInput component to the budget screen header area, below the balance display and above the expense table. Wire it to the `setAdditionalFunds` function from `useBudget`.

```tsx
import AdditionalFundsInput from './AdditionalFundsInput';

// Inside BudgetScreen, in the header area (after balance display, before expense table):
{budgetMonth && (
  <AdditionalFundsInput
    currentAmount={budgetMonth.additionalFunds}
    onUpdate={async (amount) => {
      await setAdditionalFunds(amount);
    }}
  />
)}
```

> **Note to implementor:** Read the existing BudgetScreen.tsx to find the appropriate location. Place AdditionalFundsInput in the header/configuration area near where the monthly amount and carry-over are displayed. The `setAdditionalFunds` comes from the `useBudget(selectedMonth)` hook destructuring.

**Test command:** `npx vitest run tests/screens/budget/BudgetScreen.test.tsx`

**Commit:** `feat: integrate AdditionalFundsInput into BudgetScreen`

---

## Section 4: Summary Reports

### Task 4.1 -- Add report calculation functions to budget-service

**File:** `src/data/budget-service.ts`

Add pure calculation functions for category breakdown, vendor breakdown, and monthly stats. These are service-layer functions, not React components.

```typescript
import { db, type BudgetMonth, type Expense } from './db';
import { roundCurrency } from '../lib/currency';
import { daysElapsed, daysInMonth, currentYearMonth } from '../lib/dates';

export interface BreakdownEntry {
  label: string;
  total: number;
}

export interface MonthlyStats {
  totalBudget: number;   // monthlyAmount + carryOver + additionalFunds
  totalSpent: number;    // sum of all expenses
  netChange: number;     // totalBudget - totalSpent
  avgDailySpending: number; // totalSpent / days with data
}

/**
 * Category breakdown for a given month.
 * Groups expenses by category (case-sensitive).
 * Expenses with no/empty category grouped as "Uncategorized".
 * Sorted by total descending.
 */
export async function getCategoryBreakdown(yearMonth: string): Promise<BreakdownEntry[]> {
  const expenses = await db.expenses.where('yearMonth').equals(yearMonth).toArray();

  const map = new Map<string, number>();
  for (const expense of expenses) {
    const category = expense.category?.trim() || 'Uncategorized';
    const current = map.get(category) ?? 0;
    map.set(category, roundCurrency(current + expense.amount));
  }

  const entries: BreakdownEntry[] = [];
  for (const [label, total] of map.entries()) {
    entries.push({ label, total });
  }

  entries.sort((a, b) => b.total - a.total);
  return entries;
}

/**
 * Vendor breakdown for a given month.
 * Groups expenses by vendor (case-sensitive).
 * Sorted by total descending.
 */
export async function getVendorBreakdown(yearMonth: string): Promise<BreakdownEntry[]> {
  const expenses = await db.expenses.where('yearMonth').equals(yearMonth).toArray();

  const map = new Map<string, number>();
  for (const expense of expenses) {
    const current = map.get(expense.vendor) ?? 0;
    map.set(expense.vendor, roundCurrency(current + expense.amount));
  }

  const entries: BreakdownEntry[] = [];
  for (const [label, total] of map.entries()) {
    entries.push({ label, total });
  }

  entries.sort((a, b) => b.total - a.total);
  return entries;
}

/**
 * Monthly statistics for a given month.
 * totalBudget = monthlyAmount + carryOver + additionalFunds
 * totalSpent = sum of expenses
 * netChange = totalBudget - totalSpent
 * avgDailySpending = totalSpent / daysElapsed
 *   - For current month: days elapsed through today
 *   - For past months: total days in the month
 */
export async function getMonthlyStats(yearMonth: string): Promise<MonthlyStats> {
  const budgetMonth = await db.budgetMonths.get(yearMonth);
  if (!budgetMonth) {
    throw new Error(`No budget month found for ${yearMonth}`);
  }

  const expenses = await db.expenses.where('yearMonth').equals(yearMonth).toArray();
  const totalSpent = roundCurrency(expenses.reduce((sum, e) => sum + e.amount, 0));

  const totalBudget = roundCurrency(
    budgetMonth.monthlyAmount + budgetMonth.carryOver + budgetMonth.additionalFunds
  );
  const netChange = roundCurrency(totalBudget - totalSpent);

  // For current month, use days elapsed; for past months, use total days in month
  const isCurrentMonth = yearMonth === currentYearMonth();
  const days = isCurrentMonth ? daysElapsed(yearMonth) : daysInMonth(yearMonth);
  const avgDailySpending = days > 0 ? roundCurrency(totalSpent / days) : 0;

  return { totalBudget, totalSpent, netChange, avgDailySpending };
}
```

**Test command:** `npx vitest run tests/data/budget-service.test.ts`

**Commit:** `feat: add category/vendor breakdown and monthly stats to budget-service`

---

### Task 4.2 -- Test `getCategoryBreakdown`

**File:** `tests/data/budget-service.test.ts`

```typescript
import { getCategoryBreakdown, createBudgetMonth } from '../../src/data/budget-service';
import { createExpense } from '../../src/data/expense-service';
import { db } from '../../src/data/db';

describe('getCategoryBreakdown', () => {
  beforeEach(async () => {
    await db.budgetMonths.clear();
    await db.expenses.clear();
  });

  it('should group expenses by category sorted by total descending', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ yearMonth: '2026-03', date: '2026-03-01', vendor: 'Starbucks', amount: 5.00, category: 'Coffee' });
    await createExpense({ yearMonth: '2026-03', date: '2026-03-01', vendor: 'Peets', amount: 4.50, category: 'Coffee' });
    await createExpense({ yearMonth: '2026-03', date: '2026-03-02', vendor: 'Chipotle', amount: 12.00, category: 'Dining' });
    await createExpense({ yearMonth: '2026-03', date: '2026-03-02', vendor: 'Subway', amount: 8.00, category: 'Dining' });

    const result = await getCategoryBreakdown('2026-03');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ label: 'Dining', total: 20.00 });
    expect(result[1]).toEqual({ label: 'Coffee', total: 9.50 });
  });

  it('should group expenses with no category as Uncategorized', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ yearMonth: '2026-03', date: '2026-03-01', vendor: 'Shell', amount: 40.00 });
    await createExpense({ yearMonth: '2026-03', date: '2026-03-02', vendor: 'Costco', amount: 85.00 });

    const result = await getCategoryBreakdown('2026-03');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ label: 'Uncategorized', total: 125.00 });
  });

  it('should treat different cases as separate categories', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ yearMonth: '2026-03', date: '2026-03-01', vendor: 'A', amount: 10, category: 'Dining' });
    await createExpense({ yearMonth: '2026-03', date: '2026-03-02', vendor: 'B', amount: 20, category: 'dining' });

    const result = await getCategoryBreakdown('2026-03');

    expect(result).toHaveLength(2);
    expect(result.find(e => e.label === 'Dining')!.total).toBe(10);
    expect(result.find(e => e.label === 'dining')!.total).toBe(20);
  });

  it('should return empty array when no expenses', async () => {
    const result = await getCategoryBreakdown('2026-03');
    expect(result).toEqual([]);
  });

  it('should handle single expense per category', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ yearMonth: '2026-03', date: '2026-03-01', vendor: 'Store', amount: 25.00, category: 'Groceries' });

    const result = await getCategoryBreakdown('2026-03');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ label: 'Groceries', total: 25.00 });
  });
});
```

**Test command:** `npx vitest run tests/data/budget-service.test.ts`

**Commit:** `test: add getCategoryBreakdown tests`

---

### Task 4.3 -- Test `getVendorBreakdown`

**File:** `tests/data/budget-service.test.ts`

```typescript
import { getVendorBreakdown, createBudgetMonth } from '../../src/data/budget-service';
import { createExpense } from '../../src/data/expense-service';
import { db } from '../../src/data/db';

describe('getVendorBreakdown', () => {
  beforeEach(async () => {
    await db.budgetMonths.clear();
    await db.expenses.clear();
  });

  it('should group expenses by vendor sorted by total descending', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ yearMonth: '2026-03', date: '2026-03-01', vendor: 'Starbucks', amount: 5.00, category: 'Coffee' });
    await createExpense({ yearMonth: '2026-03', date: '2026-03-01', vendor: 'Starbucks', amount: 4.50, category: 'Coffee' });
    await createExpense({ yearMonth: '2026-03', date: '2026-03-02', vendor: 'Chipotle', amount: 12.00, category: 'Dining' });
    await createExpense({ yearMonth: '2026-03', date: '2026-03-02', vendor: 'Subway', amount: 8.00, category: 'Dining' });

    const result = await getVendorBreakdown('2026-03');

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ label: 'Chipotle', total: 12.00 });
    expect(result[1]).toEqual({ label: 'Starbucks', total: 9.50 });
    expect(result[2]).toEqual({ label: 'Subway', total: 8.00 });
  });

  it('should return empty array when no expenses', async () => {
    const result = await getVendorBreakdown('2026-03');
    expect(result).toEqual([]);
  });

  it('should handle single vendor', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ yearMonth: '2026-03', date: '2026-03-01', vendor: 'Target', amount: 50 });
    await createExpense({ yearMonth: '2026-03', date: '2026-03-02', vendor: 'Target', amount: 30 });

    const result = await getVendorBreakdown('2026-03');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ label: 'Target', total: 80 });
  });
});
```

**Test command:** `npx vitest run tests/data/budget-service.test.ts`

**Commit:** `test: add getVendorBreakdown tests`

---

### Task 4.4 -- Test `getMonthlyStats`

**File:** `tests/data/budget-service.test.ts`

```typescript
import { getMonthlyStats, createBudgetMonth } from '../../src/data/budget-service';
import { createExpense } from '../../src/data/expense-service';
import { db } from '../../src/data/db';

describe('getMonthlyStats', () => {
  beforeEach(async () => {
    await db.budgetMonths.clear();
    await db.expenses.clear();
  });

  it('should calculate total budget as monthlyAmount + carryOver + additionalFunds', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 100,
      additionalFunds: 50,
    });

    const stats = await getMonthlyStats('2026-03');
    expect(stats.totalBudget).toBe(3250);
  });

  it('should calculate total spent as sum of expenses', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ yearMonth: '2026-03', date: '2026-03-01', vendor: 'A', amount: 500 });
    await createExpense({ yearMonth: '2026-03', date: '2026-03-02', vendor: 'B', amount: 700 });

    const stats = await getMonthlyStats('2026-03');
    expect(stats.totalSpent).toBe(1200);
  });

  it('should calculate net change as totalBudget minus totalSpent', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 100,
      additionalFunds: 50,
    });
    await createExpense({ yearMonth: '2026-03', date: '2026-03-01', vendor: 'Store', amount: 1200 });

    const stats = await getMonthlyStats('2026-03');
    expect(stats.netChange).toBe(2050); // 3250 - 1200
  });

  it('should handle negative net change when overspent', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ yearMonth: '2026-03', date: '2026-03-01', vendor: 'Store', amount: 4000 });

    const stats = await getMonthlyStats('2026-03');
    expect(stats.netChange).toBe(-900);
  });

  it('should return zero stats when no expenses', async () => {
    await createBudgetMonth({
      yearMonth: '2026-03',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });

    const stats = await getMonthlyStats('2026-03');
    expect(stats.totalSpent).toBe(0);
    expect(stats.netChange).toBe(3100);
    expect(stats.avgDailySpending).toBe(0);
  });

  it('should throw for nonexistent month', async () => {
    await expect(getMonthlyStats('2099-01')).rejects.toThrow('No budget month found for 2099-01');
  });

  it('should use full days in month for past month avg daily spending', async () => {
    // February 2026 has 28 days -- definitely a past month
    await createBudgetMonth({
      yearMonth: '2025-02',
      monthlyAmount: 2800,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ yearMonth: '2025-02', date: '2025-02-01', vendor: 'Store', amount: 1400 });

    const stats = await getMonthlyStats('2025-02');
    // 1400 / 28 = 50
    expect(stats.avgDailySpending).toBe(50);
  });
});
```

**Test command:** `npx vitest run tests/data/budget-service.test.ts`

**Commit:** `test: add getMonthlyStats tests`

---

### Task 4.5 -- Create BudgetSummary component

**File:** `src/screens/budget/BudgetSummary.tsx`

A component that displays category breakdown, vendor breakdown, and monthly statistics for the selected month. Uses the report functions from budget-service.

```tsx
import { useState, useEffect } from 'react';
import {
  getCategoryBreakdown,
  getVendorBreakdown,
  getMonthlyStats,
  type BreakdownEntry,
  type MonthlyStats,
} from '../../data/budget-service';
import { formatCurrency } from '../../lib/currency';

export interface BudgetSummaryProps {
  yearMonth: string;
}

export default function BudgetSummary({ yearMonth }: BudgetSummaryProps) {
  const [categoryBreakdown, setCategoryBreakdown] = useState<BreakdownEntry[]>([]);
  const [vendorBreakdown, setVendorBreakdown] = useState<BreakdownEntry[]>([]);
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [categories, vendors, monthlyStats] = await Promise.all([
          getCategoryBreakdown(yearMonth),
          getVendorBreakdown(yearMonth),
          getMonthlyStats(yearMonth),
        ]);
        if (!cancelled) {
          setCategoryBreakdown(categories);
          setVendorBreakdown(vendors);
          setStats(monthlyStats);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load summary');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [yearMonth]);

  if (loading) {
    return <div data-testid="summary-loading" className="p-4 text-center text-gray-500">Loading summary...</div>;
  }

  if (error) {
    return <div data-testid="summary-error" className="p-4 text-center text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6 p-4" data-testid="budget-summary">
      {/* Monthly Statistics */}
      {stats && (
        <section>
          <h3 className="text-lg font-semibold mb-3">Monthly Statistics</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-600">Total Budget</div>
              <div className="text-lg font-bold" data-testid="stats-total-budget">
                ${formatCurrency(stats.totalBudget)}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-600">Total Spent</div>
              <div className="text-lg font-bold" data-testid="stats-total-spent">
                ${formatCurrency(stats.totalSpent)}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-600">Net Change</div>
              <div
                className={`text-lg font-bold ${stats.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}
                data-testid="stats-net-change"
              >
                ${formatCurrency(stats.netChange)}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-600">Avg Daily Spending</div>
              <div className="text-lg font-bold" data-testid="stats-avg-daily">
                ${formatCurrency(stats.avgDailySpending)}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Category Breakdown */}
      <section>
        <h3 className="text-lg font-semibold mb-3">Spending by Category</h3>
        {categoryBreakdown.length === 0 ? (
          <p className="text-gray-500 text-sm">No expenses recorded this month.</p>
        ) : (
          <ul className="space-y-2" data-testid="category-breakdown">
            {categoryBreakdown.map((entry) => (
              <li key={entry.label} className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm font-medium">{entry.label}</span>
                <span className="text-sm font-semibold">${formatCurrency(entry.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Vendor Breakdown */}
      <section>
        <h3 className="text-lg font-semibold mb-3">Spending by Vendor</h3>
        {vendorBreakdown.length === 0 ? (
          <p className="text-gray-500 text-sm">No expenses recorded this month.</p>
        ) : (
          <ul className="space-y-2" data-testid="vendor-breakdown">
            {vendorBreakdown.map((entry) => (
              <li key={entry.label} className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm font-medium">{entry.label}</span>
                <span className="text-sm font-semibold">${formatCurrency(entry.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
```

**Test command:** `npx vitest run tests/screens/budget/BudgetSummary.test.tsx`

**Commit:** `feat: add BudgetSummary component with category/vendor breakdown and stats`

---

### Task 4.6 -- Test BudgetSummary component

**File:** `tests/screens/budget/BudgetSummary.test.tsx`

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import BudgetSummary from '../../../src/screens/budget/BudgetSummary';
import { createBudgetMonth } from '../../../src/data/budget-service';
import { createExpense } from '../../../src/data/expense-service';
import { db } from '../../../src/data/db';

describe('BudgetSummary', () => {
  beforeEach(async () => {
    await db.budgetMonths.clear();
    await db.expenses.clear();
  });

  it('should display monthly statistics', async () => {
    await createBudgetMonth({
      yearMonth: '2025-02',
      monthlyAmount: 3100,
      carryOver: 100,
      additionalFunds: 50,
    });
    await createExpense({ yearMonth: '2025-02', date: '2025-02-01', vendor: 'Store', amount: 1200 });

    render(<BudgetSummary yearMonth="2025-02" />);

    await waitFor(() => {
      expect(screen.getByTestId('stats-total-budget')).toHaveTextContent('$3,250.00');
      expect(screen.getByTestId('stats-total-spent')).toHaveTextContent('$1,200.00');
      expect(screen.getByTestId('stats-net-change')).toHaveTextContent('$2,050.00');
    });
  });

  it('should display category breakdown sorted by total descending', async () => {
    await createBudgetMonth({
      yearMonth: '2025-02',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ yearMonth: '2025-02', date: '2025-02-01', vendor: 'Starbucks', amount: 5, category: 'Coffee' });
    await createExpense({ yearMonth: '2025-02', date: '2025-02-01', vendor: 'Peets', amount: 4.50, category: 'Coffee' });
    await createExpense({ yearMonth: '2025-02', date: '2025-02-02', vendor: 'Chipotle', amount: 12, category: 'Dining' });
    await createExpense({ yearMonth: '2025-02', date: '2025-02-02', vendor: 'Subway', amount: 8, category: 'Dining' });

    render(<BudgetSummary yearMonth="2025-02" />);

    await waitFor(() => {
      const list = screen.getByTestId('category-breakdown');
      const items = list.querySelectorAll('li');
      expect(items).toHaveLength(2);
      expect(items[0]).toHaveTextContent('Dining');
      expect(items[0]).toHaveTextContent('$20.00');
      expect(items[1]).toHaveTextContent('Coffee');
      expect(items[1]).toHaveTextContent('$9.50');
    });
  });

  it('should display vendor breakdown sorted by total descending', async () => {
    await createBudgetMonth({
      yearMonth: '2025-02',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ yearMonth: '2025-02', date: '2025-02-01', vendor: 'Starbucks', amount: 5, category: 'Coffee' });
    await createExpense({ yearMonth: '2025-02', date: '2025-02-01', vendor: 'Starbucks', amount: 4.50, category: 'Coffee' });
    await createExpense({ yearMonth: '2025-02', date: '2025-02-02', vendor: 'Chipotle', amount: 12, category: 'Dining' });
    await createExpense({ yearMonth: '2025-02', date: '2025-02-02', vendor: 'Subway', amount: 8, category: 'Dining' });

    render(<BudgetSummary yearMonth="2025-02" />);

    await waitFor(() => {
      const list = screen.getByTestId('vendor-breakdown');
      const items = list.querySelectorAll('li');
      expect(items).toHaveLength(3);
      expect(items[0]).toHaveTextContent('Chipotle');
      expect(items[0]).toHaveTextContent('$12.00');
      expect(items[1]).toHaveTextContent('Starbucks');
      expect(items[1]).toHaveTextContent('$9.50');
      expect(items[2]).toHaveTextContent('Subway');
      expect(items[2]).toHaveTextContent('$8.00');
    });
  });

  it('should show Uncategorized for expenses without category', async () => {
    await createBudgetMonth({
      yearMonth: '2025-02',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ yearMonth: '2025-02', date: '2025-02-01', vendor: 'Shell', amount: 40 });
    await createExpense({ yearMonth: '2025-02', date: '2025-02-02', vendor: 'Costco', amount: 85 });

    render(<BudgetSummary yearMonth="2025-02" />);

    await waitFor(() => {
      const list = screen.getByTestId('category-breakdown');
      expect(list).toHaveTextContent('Uncategorized');
      expect(list).toHaveTextContent('$125.00');
    });
  });

  it('should show empty state when no expenses', async () => {
    await createBudgetMonth({
      yearMonth: '2025-02',
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });

    render(<BudgetSummary yearMonth="2025-02" />);

    await waitFor(() => {
      expect(screen.getAllByText('No expenses recorded this month.')).toHaveLength(2);
    });
  });

  it('should show error when budget month does not exist', async () => {
    render(<BudgetSummary yearMonth="2099-01" />);

    await waitFor(() => {
      expect(screen.getByTestId('summary-error')).toBeInTheDocument();
    });
  });
});
```

**Test command:** `npx vitest run tests/screens/budget/BudgetSummary.test.tsx`

**Commit:** `test: add BudgetSummary component tests`

---

### Task 4.7 -- Add Summary tab toggle to BudgetScreen

**File:** `src/screens/budget/BudgetScreen.tsx`

Add a tab toggle (Expenses / Summary) to the BudgetScreen. When "Summary" is selected, show the BudgetSummary component instead of the expense table and entry form.

```tsx
import { useState } from 'react';
import BudgetSummary from './BudgetSummary';

// Inside BudgetScreen, add a tab state:
type BudgetTab = 'expenses' | 'summary';
const [activeTab, setActiveTab] = useState<BudgetTab>('expenses');

// Tab toggle UI (place between header area and content area):
<div className="flex border-b border-gray-200">
  <button
    type="button"
    onClick={() => setActiveTab('expenses')}
    className={`flex-1 py-2 text-sm font-medium text-center border-b-2 transition-colors ${
      activeTab === 'expenses'
        ? 'border-blue-600 text-blue-600'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`}
    data-testid="tab-expenses"
  >
    Expenses
  </button>
  <button
    type="button"
    onClick={() => setActiveTab('summary')}
    className={`flex-1 py-2 text-sm font-medium text-center border-b-2 transition-colors ${
      activeTab === 'summary'
        ? 'border-blue-600 text-blue-600'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`}
    data-testid="tab-summary"
  >
    Summary
  </button>
</div>

// Conditional content rendering:
{activeTab === 'expenses' ? (
  <>
    {/* Existing expense entry form and expense table */}
  </>
) : (
  <BudgetSummary yearMonth={selectedMonth} />
)}
```

> **Note to implementor:** Read the existing BudgetScreen layout and wrap the existing expense table and entry form in the `activeTab === 'expenses'` conditional. The summary tab is the alternate view showing BudgetSummary.

**Test command:** `npx vitest run tests/screens/budget/BudgetScreen.test.tsx`

**Commit:** `feat: add Expenses/Summary tab toggle to BudgetScreen`

---

### Task 4.8 -- Test BudgetScreen summary tab integration

**File:** `tests/screens/budget/BudgetScreen.test.tsx`

Append to existing tests.

```tsx
describe('BudgetScreen - Summary Tab', () => {
  beforeEach(async () => {
    await db.budgetMonths.clear();
    await db.expenses.clear();
  });

  it('should default to Expenses tab', async () => {
    await createBudgetMonth({
      yearMonth: currentYearMonth(),
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });

    renderBudgetScreen();

    await waitFor(() => {
      expect(screen.getByTestId('tab-expenses')).toHaveClass('border-blue-600');
    });
  });

  it('should switch to Summary tab and show summary content', async () => {
    const user = userEvent.setup();
    await createBudgetMonth({
      yearMonth: currentYearMonth(),
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });

    renderBudgetScreen();

    await waitFor(() => {
      expect(screen.getByTestId('tab-summary')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('tab-summary'));

    await waitFor(() => {
      expect(screen.getByTestId('budget-summary')).toBeInTheDocument();
    });
  });

  it('should scope summary to selected month', async () => {
    const user = userEvent.setup();
    const current = currentYearMonth();
    const prev = previousYearMonth(current);

    await createBudgetMonth({
      yearMonth: current,
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createBudgetMonth({
      yearMonth: prev,
      monthlyAmount: 2800,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ yearMonth: current, date: `${current}-01`, vendor: 'Store', amount: 2000 });
    await createExpense({ yearMonth: prev, date: `${prev}-01`, vendor: 'Shop', amount: 1500 });

    renderBudgetScreen();

    // Switch to summary tab
    await waitFor(() => {
      expect(screen.getByTestId('tab-summary')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('tab-summary'));

    // Verify current month stats
    await waitFor(() => {
      expect(screen.getByTestId('stats-total-spent')).toHaveTextContent('$2,000.00');
    });

    // Navigate to previous month
    await user.click(screen.getByLabelText('Previous month'));

    // Verify previous month stats
    await waitFor(() => {
      expect(screen.getByTestId('stats-total-spent')).toHaveTextContent('$1,500.00');
    });
  });
});
```

**Test command:** `npx vitest run tests/screens/budget/BudgetScreen.test.tsx`

**Commit:** `test: add BudgetScreen summary tab integration tests`

---

## Section 5: Dashboard Budget Cards Integration

### Task 5.1 -- Add dashboard data functions to budget-service

**File:** `src/data/budget-service.ts`

Add functions that produce the exact data shapes needed by the dashboard cards. These functions match the `DailyBudgetCardProps` and `MonthlyPerformanceCardProps` interfaces defined in Stage 2.

```typescript
import { currentYearMonth, today, daysElapsed } from '../lib/dates';

/**
 * Data for the DailyBudgetCard on the dashboard.
 * Matches DailyBudgetCardProps from Stage 2.
 */
export interface DailyBudgetCardData {
  todayBalance: number;     // (dailyAllowance * daysElapsed) + carryOver + additionalFunds - totalMonthExpenses
  dailyBudget: number;      // dailyAllowance for current month
  todaySpending: number;    // sum of expenses with today's date
  isPositive: boolean;      // todayBalance >= 0
}

/**
 * Data for the MonthlyPerformanceCard on the dashboard.
 * Matches MonthlyPerformanceCardProps from Stage 2.
 */
export interface MonthlyPerformanceCardData {
  totalBudget: number;      // monthlyAmount + carryOver + additionalFunds
  totalSpent: number;       // sum of all expenses this month
  netChange: number;        // totalBudget - totalSpent
}

/**
 * Get data for the daily budget dashboard card.
 * Returns null if no budget month exists for the current month.
 */
export async function getDailyBudgetCardData(): Promise<DailyBudgetCardData | null> {
  const yearMonth = currentYearMonth();
  const budgetMonth = await db.budgetMonths.get(yearMonth);
  if (!budgetMonth) {
    return null;
  }

  const expenses = await db.expenses.where('yearMonth').equals(yearMonth).toArray();
  const totalMonthExpenses = roundCurrency(expenses.reduce((sum, e) => sum + e.amount, 0));

  const todayStr = today();
  const todayExpenses = expenses.filter((e) => e.date === todayStr);
  const todaySpending = roundCurrency(todayExpenses.reduce((sum, e) => sum + e.amount, 0));

  const elapsed = daysElapsed(yearMonth);
  const cumulativeBudget = roundCurrency(budgetMonth.dailyAllowance * elapsed);
  const todayBalance = roundCurrency(
    cumulativeBudget + budgetMonth.carryOver + budgetMonth.additionalFunds - totalMonthExpenses
  );

  return {
    todayBalance,
    dailyBudget: budgetMonth.dailyAllowance,
    todaySpending,
    isPositive: todayBalance >= 0,
  };
}

/**
 * Get data for the monthly performance dashboard card.
 * Returns null if no budget month exists for the current month.
 */
export async function getMonthlyPerformanceCardData(): Promise<MonthlyPerformanceCardData | null> {
  const yearMonth = currentYearMonth();
  const budgetMonth = await db.budgetMonths.get(yearMonth);
  if (!budgetMonth) {
    return null;
  }

  const expenses = await db.expenses.where('yearMonth').equals(yearMonth).toArray();
  const totalSpent = roundCurrency(expenses.reduce((sum, e) => sum + e.amount, 0));

  const totalBudget = roundCurrency(
    budgetMonth.monthlyAmount + budgetMonth.carryOver + budgetMonth.additionalFunds
  );
  const netChange = roundCurrency(totalBudget - totalSpent);

  return { totalBudget, totalSpent, netChange };
}
```

**Test command:** `npx vitest run tests/data/budget-service.test.ts`

**Commit:** `feat: add getDailyBudgetCardData and getMonthlyPerformanceCardData`

---

### Task 5.2 -- Test `getDailyBudgetCardData`

**File:** `tests/data/budget-service.test.ts`

```typescript
import { getDailyBudgetCardData, createBudgetMonth } from '../../src/data/budget-service';
import { createExpense } from '../../src/data/expense-service';
import { db } from '../../src/data/db';
import { currentYearMonth, today, daysElapsed } from '../../src/lib/dates';
import { roundCurrency } from '../../src/lib/currency';

describe('getDailyBudgetCardData', () => {
  beforeEach(async () => {
    await db.budgetMonths.clear();
    await db.expenses.clear();
  });

  it('should return null when no budget month exists', async () => {
    const result = await getDailyBudgetCardData();
    expect(result).toBeNull();
  });

  it('should return correct balance with no expenses', async () => {
    const ym = currentYearMonth();
    await createBudgetMonth({
      yearMonth: ym,
      monthlyAmount: 3100,
      carryOver: 50,
      additionalFunds: 0,
    });

    const result = await getDailyBudgetCardData();
    expect(result).not.toBeNull();

    const budgetMonth = await db.budgetMonths.get(ym);
    const elapsed = daysElapsed(ym);
    const expectedBalance = roundCurrency(budgetMonth!.dailyAllowance * elapsed + 50);

    expect(result!.todayBalance).toBe(expectedBalance);
    expect(result!.dailyBudget).toBe(budgetMonth!.dailyAllowance);
    expect(result!.todaySpending).toBe(0);
    expect(result!.isPositive).toBe(true);
  });

  it('should calculate today spending from todays expenses only', async () => {
    const ym = currentYearMonth();
    const todayStr = today();
    await createBudgetMonth({
      yearMonth: ym,
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ yearMonth: ym, date: todayStr, vendor: 'Coffee', amount: 5 });
    await createExpense({ yearMonth: ym, date: todayStr, vendor: 'Lunch', amount: 12 });
    await createExpense({ yearMonth: ym, date: `${ym}-01`, vendor: 'Old', amount: 100 });

    const result = await getDailyBudgetCardData();
    expect(result!.todaySpending).toBe(17);
  });

  it('should return isPositive false for negative balance', async () => {
    const ym = currentYearMonth();
    await createBudgetMonth({
      yearMonth: ym,
      monthlyAmount: 100, // very small budget
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ yearMonth: ym, date: today(), vendor: 'Big', amount: 9999 });

    const result = await getDailyBudgetCardData();
    expect(result!.isPositive).toBe(false);
  });

  it('should include carry-over and additional funds in balance', async () => {
    const ym = currentYearMonth();
    await createBudgetMonth({
      yearMonth: ym,
      monthlyAmount: 3100,
      carryOver: 50,
      additionalFunds: 100,
    });

    const result = await getDailyBudgetCardData();
    expect(result).not.toBeNull();

    const budgetMonth = await db.budgetMonths.get(ym);
    const elapsed = daysElapsed(ym);
    const expectedBalance = roundCurrency(budgetMonth!.dailyAllowance * elapsed + 50 + 100);
    expect(result!.todayBalance).toBe(expectedBalance);
  });
});
```

**Test command:** `npx vitest run tests/data/budget-service.test.ts`

**Commit:** `test: add getDailyBudgetCardData tests`

---

### Task 5.3 -- Test `getMonthlyPerformanceCardData`

**File:** `tests/data/budget-service.test.ts`

```typescript
import { getMonthlyPerformanceCardData, createBudgetMonth } from '../../src/data/budget-service';
import { createExpense } from '../../src/data/expense-service';
import { db } from '../../src/data/db';
import { currentYearMonth } from '../../src/lib/dates';

describe('getMonthlyPerformanceCardData', () => {
  beforeEach(async () => {
    await db.budgetMonths.clear();
    await db.expenses.clear();
  });

  it('should return null when no budget month exists', async () => {
    const result = await getMonthlyPerformanceCardData();
    expect(result).toBeNull();
  });

  it('should calculate total budget as monthlyAmount + carryOver + additionalFunds', async () => {
    const ym = currentYearMonth();
    await createBudgetMonth({
      yearMonth: ym,
      monthlyAmount: 3100,
      carryOver: 100,
      additionalFunds: 50,
    });

    const result = await getMonthlyPerformanceCardData();
    expect(result!.totalBudget).toBe(3250);
  });

  it('should calculate total spent as sum of all month expenses', async () => {
    const ym = currentYearMonth();
    await createBudgetMonth({
      yearMonth: ym,
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ yearMonth: ym, date: `${ym}-01`, vendor: 'A', amount: 500 });
    await createExpense({ yearMonth: ym, date: `${ym}-02`, vendor: 'B', amount: 700 });

    const result = await getMonthlyPerformanceCardData();
    expect(result!.totalSpent).toBe(1200);
  });

  it('should calculate net change as totalBudget minus totalSpent', async () => {
    const ym = currentYearMonth();
    await createBudgetMonth({
      yearMonth: ym,
      monthlyAmount: 3100,
      carryOver: 100,
      additionalFunds: 50,
    });
    await createExpense({ yearMonth: ym, date: `${ym}-01`, vendor: 'Store', amount: 1500 });

    const result = await getMonthlyPerformanceCardData();
    expect(result!.totalBudget).toBe(3250);
    expect(result!.totalSpent).toBe(1500);
    expect(result!.netChange).toBe(1750);
  });

  it('should handle negative net change', async () => {
    const ym = currentYearMonth();
    await createBudgetMonth({
      yearMonth: ym,
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ yearMonth: ym, date: `${ym}-01`, vendor: 'Store', amount: 4000 });

    const result = await getMonthlyPerformanceCardData();
    expect(result!.netChange).toBe(-900);
  });
});
```

**Test command:** `npx vitest run tests/data/budget-service.test.ts`

**Commit:** `test: add getMonthlyPerformanceCardData tests`

---

### Task 5.4 -- Wire DailyBudgetCard to live data

**File:** `src/screens/dashboard/DailyBudgetCard.tsx`

Update the existing DailyBudgetCard shell (from Stage 2) to consume live data via `getDailyBudgetCardData`. Add navigation to /budget on tap.

```tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDailyBudgetCardData, type DailyBudgetCardData } from '../../data/budget-service';
import { formatCurrency } from '../../lib/currency';

export default function DailyBudgetCard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DailyBudgetCardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        const cardData = await getDailyBudgetCardData();
        if (!cancelled) {
          setData(cardData);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, []);

  const handleClick = () => {
    navigate('/budget');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4 animate-pulse" data-testid="daily-budget-card">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className="bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        data-testid="daily-budget-card"
      >
        <h3 className="text-sm font-medium text-gray-500 mb-1">Daily Budget</h3>
        <p className="text-gray-400 text-sm" data-testid="daily-budget-zero-state">
          Set up your monthly budget to see daily tracking.
        </p>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      data-testid="daily-budget-card"
    >
      <h3 className="text-sm font-medium text-gray-500 mb-1">Daily Budget</h3>
      <div
        className={`text-2xl font-bold ${data.isPositive ? 'text-green-600' : 'text-red-600'}`}
        data-testid="daily-budget-balance"
      >
        ${formatCurrency(data.todayBalance)}
      </div>
      <div className="flex justify-between mt-2 text-sm text-gray-500">
        <span data-testid="daily-budget-allowance">Daily: ${formatCurrency(data.dailyBudget)}</span>
        <span data-testid="daily-budget-today-spent">Today: ${formatCurrency(data.todaySpending)}</span>
      </div>
    </div>
  );
}
```

> **Note to implementor:** Read the existing DailyBudgetCard.tsx from Stage 2 first. Replace its placeholder/zero-state content with the live data implementation above, preserving any existing prop interface types that other components may reference. The component no longer needs external props since it fetches its own data.

**Test command:** `npx vitest run tests/screens/dashboard/DailyBudgetCard.test.tsx`

**Commit:** `feat: wire DailyBudgetCard to live budget data`

---

### Task 5.5 -- Test DailyBudgetCard with live data

**File:** `tests/screens/dashboard/DailyBudgetCard.test.tsx`

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import DailyBudgetCard from '../../../src/screens/dashboard/DailyBudgetCard';
import { createBudgetMonth } from '../../../src/data/budget-service';
import { createExpense } from '../../../src/data/expense-service';
import { db } from '../../../src/data/db';
import { currentYearMonth, today, daysElapsed } from '../../../src/lib/dates';
import { roundCurrency } from '../../../src/lib/currency';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderCard() {
  return render(
    <MemoryRouter>
      <DailyBudgetCard />
    </MemoryRouter>
  );
}

describe('DailyBudgetCard', () => {
  beforeEach(async () => {
    await db.budgetMonths.clear();
    await db.expenses.clear();
    mockNavigate.mockClear();
  });

  it('should show zero state when no budget month exists', async () => {
    renderCard();

    await waitFor(() => {
      expect(screen.getByTestId('daily-budget-zero-state')).toBeInTheDocument();
    });
  });

  it('should show balance in green when positive', async () => {
    const ym = currentYearMonth();
    await createBudgetMonth({
      yearMonth: ym,
      monthlyAmount: 3100,
      carryOver: 50,
      additionalFunds: 0,
    });

    renderCard();

    await waitFor(() => {
      const balance = screen.getByTestId('daily-budget-balance');
      expect(balance).toBeInTheDocument();
      expect(balance.className).toContain('text-green-600');
    });
  });

  it('should show balance in red when negative', async () => {
    const ym = currentYearMonth();
    await createBudgetMonth({
      yearMonth: ym,
      monthlyAmount: 100, // very small
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ yearMonth: ym, date: today(), vendor: 'Big', amount: 9999 });

    renderCard();

    await waitFor(() => {
      const balance = screen.getByTestId('daily-budget-balance');
      expect(balance.className).toContain('text-red-600');
    });
  });

  it('should display today spending', async () => {
    const ym = currentYearMonth();
    const todayStr = today();
    await createBudgetMonth({
      yearMonth: ym,
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ yearMonth: ym, date: todayStr, vendor: 'Coffee', amount: 5.50 });

    renderCard();

    await waitFor(() => {
      expect(screen.getByTestId('daily-budget-today-spent')).toHaveTextContent('$5.50');
    });
  });

  it('should navigate to /budget when clicked', async () => {
    const user = userEvent.setup();
    const ym = currentYearMonth();
    await createBudgetMonth({
      yearMonth: ym,
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });

    renderCard();

    await waitFor(() => {
      expect(screen.getByTestId('daily-budget-card')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('daily-budget-card'));
    expect(mockNavigate).toHaveBeenCalledWith('/budget');
  });

  it('should navigate to /budget when clicked in zero state', async () => {
    const user = userEvent.setup();
    renderCard();

    await waitFor(() => {
      expect(screen.getByTestId('daily-budget-card')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('daily-budget-card'));
    expect(mockNavigate).toHaveBeenCalledWith('/budget');
  });
});
```

**Test command:** `npx vitest run tests/screens/dashboard/DailyBudgetCard.test.tsx`

**Commit:** `test: add DailyBudgetCard live data tests`

---

### Task 5.6 -- Wire MonthlyPerformanceCard to live data

**File:** `src/screens/dashboard/MonthlyPerformanceCard.tsx`

Update the existing MonthlyPerformanceCard shell (from Stage 2) to consume live data via `getMonthlyPerformanceCardData`. Add navigation to /budget on tap.

```tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMonthlyPerformanceCardData, type MonthlyPerformanceCardData } from '../../data/budget-service';
import { formatCurrency } from '../../lib/currency';

export default function MonthlyPerformanceCard() {
  const navigate = useNavigate();
  const [data, setData] = useState<MonthlyPerformanceCardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        const cardData = await getMonthlyPerformanceCardData();
        if (!cancelled) {
          setData(cardData);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, []);

  const handleClick = () => {
    navigate('/budget');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4 animate-pulse" data-testid="monthly-performance-card">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-6 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className="bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        data-testid="monthly-performance-card"
      >
        <h3 className="text-sm font-medium text-gray-500 mb-1">Monthly Performance</h3>
        <p className="text-gray-400 text-sm" data-testid="monthly-performance-zero-state">
          Set up your monthly budget to see performance tracking.
        </p>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      data-testid="monthly-performance-card"
    >
      <h3 className="text-sm font-medium text-gray-500 mb-1">Monthly Performance</h3>
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total Budget</span>
          <span className="font-medium" data-testid="monthly-total-budget">
            ${formatCurrency(data.totalBudget)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total Spent</span>
          <span className="font-medium" data-testid="monthly-total-spent">
            ${formatCurrency(data.totalSpent)}
          </span>
        </div>
        <div className="flex justify-between text-sm font-semibold pt-1 border-t border-gray-100">
          <span className="text-gray-700">Net Change</span>
          <span
            className={data.netChange >= 0 ? 'text-green-600' : 'text-red-600'}
            data-testid="monthly-net-change"
          >
            ${formatCurrency(data.netChange)}
          </span>
        </div>
      </div>
    </div>
  );
}
```

> **Note to implementor:** Read the existing MonthlyPerformanceCard.tsx from Stage 2 first. Replace its placeholder/zero-state content with the live data implementation above, preserving any existing prop interface types that other components may reference.

**Test command:** `npx vitest run tests/screens/dashboard/MonthlyPerformanceCard.test.tsx`

**Commit:** `feat: wire MonthlyPerformanceCard to live budget data`

---

### Task 5.7 -- Test MonthlyPerformanceCard with live data

**File:** `tests/screens/dashboard/MonthlyPerformanceCard.test.tsx`

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import MonthlyPerformanceCard from '../../../src/screens/dashboard/MonthlyPerformanceCard';
import { createBudgetMonth } from '../../../src/data/budget-service';
import { createExpense } from '../../../src/data/expense-service';
import { db } from '../../../src/data/db';
import { currentYearMonth } from '../../../src/lib/dates';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderCard() {
  return render(
    <MemoryRouter>
      <MonthlyPerformanceCard />
    </MemoryRouter>
  );
}

describe('MonthlyPerformanceCard', () => {
  beforeEach(async () => {
    await db.budgetMonths.clear();
    await db.expenses.clear();
    mockNavigate.mockClear();
  });

  it('should show zero state when no budget month exists', async () => {
    renderCard();

    await waitFor(() => {
      expect(screen.getByTestId('monthly-performance-zero-state')).toBeInTheDocument();
    });
  });

  it('should display total budget, total spent, and net change', async () => {
    const ym = currentYearMonth();
    await createBudgetMonth({
      yearMonth: ym,
      monthlyAmount: 3100,
      carryOver: 100,
      additionalFunds: 50,
    });
    await createExpense({ yearMonth: ym, date: `${ym}-01`, vendor: 'Store', amount: 1500 });

    renderCard();

    await waitFor(() => {
      expect(screen.getByTestId('monthly-total-budget')).toHaveTextContent('$3,250.00');
      expect(screen.getByTestId('monthly-total-spent')).toHaveTextContent('$1,500.00');
      expect(screen.getByTestId('monthly-net-change')).toHaveTextContent('$1,750.00');
    });
  });

  it('should show net change in green when positive', async () => {
    const ym = currentYearMonth();
    await createBudgetMonth({
      yearMonth: ym,
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });

    renderCard();

    await waitFor(() => {
      const netChange = screen.getByTestId('monthly-net-change');
      expect(netChange.className).toContain('text-green-600');
    });
  });

  it('should show net change in red when negative', async () => {
    const ym = currentYearMonth();
    await createBudgetMonth({
      yearMonth: ym,
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ yearMonth: ym, date: `${ym}-01`, vendor: 'Store', amount: 4000 });

    renderCard();

    await waitFor(() => {
      const netChange = screen.getByTestId('monthly-net-change');
      expect(netChange.className).toContain('text-red-600');
    });
  });

  it('should navigate to /budget when clicked', async () => {
    const user = userEvent.setup();
    renderCard();

    await waitFor(() => {
      expect(screen.getByTestId('monthly-performance-card')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('monthly-performance-card'));
    expect(mockNavigate).toHaveBeenCalledWith('/budget');
  });
});
```

**Test command:** `npx vitest run tests/screens/dashboard/MonthlyPerformanceCard.test.tsx`

**Commit:** `test: add MonthlyPerformanceCard live data tests`

---

### Task 5.8 -- Verify dashboard integration end-to-end

**File:** `tests/screens/dashboard/DashboardScreen.test.tsx`

Add integration test to the existing DashboardScreen test file to verify both budget cards render correctly within the full dashboard context.

```tsx
// Append to existing tests/screens/dashboard/DashboardScreen.test.tsx

import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import DashboardScreen from '../../../src/screens/dashboard/DashboardScreen';
import { createBudgetMonth } from '../../../src/data/budget-service';
import { createExpense } from '../../../src/data/expense-service';
import { db } from '../../../src/data/db';
import { currentYearMonth, today } from '../../../src/lib/dates';

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardScreen />
    </MemoryRouter>
  );
}

describe('DashboardScreen - Budget Cards Integration', () => {
  beforeEach(async () => {
    await db.budgetMonths.clear();
    await db.expenses.clear();
  });

  it('should display both budget cards with live data', async () => {
    const ym = currentYearMonth();
    await createBudgetMonth({
      yearMonth: ym,
      monthlyAmount: 3100,
      carryOver: 0,
      additionalFunds: 0,
    });
    await createExpense({ yearMonth: ym, date: today(), vendor: 'Coffee', amount: 5.50 });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId('daily-budget-card')).toBeInTheDocument();
      expect(screen.getByTestId('monthly-performance-card')).toBeInTheDocument();
      expect(screen.getByTestId('daily-budget-balance')).toBeInTheDocument();
      expect(screen.getByTestId('monthly-total-spent')).toHaveTextContent('$5.50');
    });
  });

  it('should show zero state for both cards when no budget configured', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId('daily-budget-zero-state')).toBeInTheDocument();
      expect(screen.getByTestId('monthly-performance-zero-state')).toBeInTheDocument();
    });
  });
});
```

**Test command:** `npx vitest run tests/screens/dashboard/DashboardScreen.test.tsx`

**Commit:** `test: verify dashboard budget cards integration end-to-end`

---

## Final Verification

### Task FINAL -- Run full test suite

Run the complete test suite to verify all Stage 4 changes work together without regressions.

**Test command:** `npx vitest run`

Expected: All tests pass. No regressions in Stage 1-3 tests.

**Commit:** No commit needed -- this is verification only.

---

## Summary of Files Changed/Created

### New Files Created
| File | Purpose |
|------|---------|
| `src/screens/budget/MonthSelector.tsx` | Month navigation component |
| `src/screens/budget/AdditionalFundsInput.tsx` | Editable additional funds field |
| `src/screens/budget/BudgetSummary.tsx` | Category/vendor breakdown + monthly stats |
| `tests/screens/budget/MonthSelector.test.tsx` | MonthSelector tests |
| `tests/screens/budget/AdditionalFundsInput.test.tsx` | AdditionalFundsInput tests |
| `tests/screens/budget/BudgetSummary.test.tsx` | BudgetSummary tests |

### Existing Files Modified
| File | Changes |
|------|---------|
| `src/data/budget-service.ts` | Added: `getEndingBalance`, `initializeMonth`, `propagateCarryOver`, `updateAdditionalFunds`, `getCategoryBreakdown`, `getVendorBreakdown`, `getMonthlyStats`, `getDailyBudgetCardData`, `getMonthlyPerformanceCardData` |
| `src/data/expense-service.ts` | Added: propagateCarryOver calls in `createExpense`, `updateExpense`, `deleteExpense` |
| `src/hooks/useBudget.ts` | Added: `setAdditionalFunds` to returned object |
| `src/screens/budget/BudgetScreen.tsx` | Added: MonthSelector integration, selectedMonth state, AdditionalFundsInput, Expenses/Summary tabs |
| `src/screens/dashboard/DailyBudgetCard.tsx` | Replaced shell with live data from `getDailyBudgetCardData` |
| `src/screens/dashboard/MonthlyPerformanceCard.tsx` | Replaced shell with live data from `getMonthlyPerformanceCardData` |
| `tests/lib/dates.test.ts` | Added: previousYearMonth/nextYearMonth tests |
| `tests/data/budget-service.test.ts` | Added: tests for all new budget-service functions |
| `tests/data/expense-service.test.ts` | Added: carry-over propagation trigger tests |
| `tests/screens/budget/BudgetScreen.test.tsx` | Added: month selector and summary tab integration tests |
| `tests/screens/dashboard/DailyBudgetCard.test.tsx` | Added: live data and navigation tests |
| `tests/screens/dashboard/MonthlyPerformanceCard.test.tsx` | Added: live data and navigation tests |
| `tests/screens/dashboard/DashboardScreen.test.tsx` | Added: budget cards integration tests |

### Exported Interfaces (New Public API)
| Interface | File | Consumer |
|-----------|------|----------|
| `BreakdownEntry` | `budget-service.ts` | BudgetSummary component |
| `MonthlyStats` | `budget-service.ts` | BudgetSummary component |
| `DailyBudgetCardData` | `budget-service.ts` | DailyBudgetCard component |
| `MonthlyPerformanceCardData` | `budget-service.ts` | MonthlyPerformanceCard component |
| `MonthSelectorProps` | `MonthSelector.tsx` | BudgetScreen |
| `AdditionalFundsInputProps` | `AdditionalFundsInput.tsx` | BudgetScreen |
| `BudgetSummaryProps` | `BudgetSummary.tsx` | BudgetScreen |
