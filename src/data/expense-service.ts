import { db } from '@/data/db';
import type { Expense } from '@/lib/types';
import { roundCurrency } from '@/lib/currency';
import { today as getToday, currentYearMonth } from '@/lib/dates';
import { MAX_VENDOR_LENGTH } from '@/lib/constants';
import { propagateCarryOver } from '@/data/budget-service';

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

// --- Service Functions ---

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

  // Propagate carry-over if this is a past month
  if (yearMonth !== currentYearMonth()) {
    await propagateCarryOver(yearMonth);
  }

  return expense;
}

export async function getExpensesByMonth(yearMonth: string): Promise<Expense[]> {
  return db.expenses.where('yearMonth').equals(yearMonth).toArray();
}

export async function getExpenseById(id: number): Promise<Expense | undefined> {
  return db.expenses.get(id);
}

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

  // Propagate carry-over if this is a past month
  if (updated.yearMonth !== currentYearMonth()) {
    await propagateCarryOver(updated.yearMonth);
  }

  return updated;
}

export async function deleteExpense(id: number): Promise<void> {
  const existing = await db.expenses.get(id);
  if (!existing) {
    throw new Error(`Expense with id ${id} not found`);
  }

  const { yearMonth } = existing;
  await db.expenses.delete(id);

  // Propagate carry-over if this was a past month
  if (yearMonth !== currentYearMonth()) {
    await propagateCarryOver(yearMonth);
  }
}
