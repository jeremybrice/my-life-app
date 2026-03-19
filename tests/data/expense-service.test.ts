import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/data/db';
import {
  createExpense,
  getExpensesByMonth,
  getExpenseById,
  updateExpense,
  deleteExpense,
  validateExpenseInput,
} from '@/data/expense-service';

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
    expect(errors[0]!.field).toBe('vendor');
  });

  it('should return error for vendor exceeding 20 chars', () => {
    const errors = validateExpenseInput({
      vendor: 'International House of Pancakes',
      amount: 10,
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe('vendor');
    expect(errors[0]!.message).toContain('20');
  });

  it('should return error for zero amount', () => {
    const errors = validateExpenseInput({
      vendor: 'Test',
      amount: 0,
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe('amount');
  });

  it('should return error for negative amount', () => {
    const errors = validateExpenseInput({
      vendor: 'Test',
      amount: -5,
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe('amount');
  });

  it('should return error for invalid date format', () => {
    const errors = validateExpenseInput({
      vendor: 'Test',
      amount: 10,
      date: '03/17/2026',
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe('date');
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
    await createExpense({ vendor: 'B', amount: 20, date: '2026-03-17' });

    await deleteExpense(a.id!);

    const remaining = await getExpensesByMonth('2026-03');
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.vendor).toBe('B');
  });
});
