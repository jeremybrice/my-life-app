import { describe, it, expect, beforeEach } from 'vitest';
import { MyLifeAppDB } from '@/data/db';

describe('MyLifeAppDB', () => {
  let db: MyLifeAppDB;

  beforeEach(async () => {
    db = new MyLifeAppDB();
    // Ensure clean state
    await db.delete();
    db = new MyLifeAppDB();
    await db.open();
  });

  it('should create the database at version 3', () => {
    expect(db.verno).toBe(3);
  });

  it('should have a settings table', async () => {
    const count = await db.settings.count();
    expect(count).toBe(0);
  });

  it('should have a budgetMonths table', async () => {
    const count = await db.budgetMonths.count();
    expect(count).toBe(0);
  });

  it('should have an expenses table', async () => {
    const count = await db.expenses.count();
    expect(count).toBe(0);
  });

  it('should have a goals table', async () => {
    const count = await db.goals.count();
    expect(count).toBe(0);
  });

  it('should have a healthRoutines table', async () => {
    const count = await db.healthRoutines.count();
    expect(count).toBe(0);
  });

  it('should have a healthLogEntries table', async () => {
    const count = await db.healthLogEntries.count();
    expect(count).toBe(0);
  });

  it('should persist data across re-open', async () => {
    await db.settings.put({ id: 1, apiKey: 'test-key' } as any);
    db.close();

    const db2 = new MyLifeAppDB();
    await db2.open();
    const settings = await db2.settings.get(1);
    expect(settings?.apiKey).toBe('test-key');
    db2.close();
  });

  it('should support expenses indexed by yearMonth', async () => {
    await db.expenses.add({
      yearMonth: '2026-03',
      date: '2026-03-18',
      vendor: 'Coffee',
      amount: 4.50,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await db.expenses.add({
      yearMonth: '2026-02',
      date: '2026-02-15',
      vendor: 'Lunch',
      amount: 12.00,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const marchExpenses = await db.expenses
      .where('yearMonth')
      .equals('2026-03')
      .toArray();
    expect(marchExpenses).toHaveLength(1);
    expect(marchExpenses[0]!.vendor).toBe('Coffee');
  });

  it('should support goals indexed by status', async () => {
    await db.goals.add({
      title: 'Save $1000',
      type: 'financial',
      progressModel: 'numeric',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await db.goals.add({
      title: 'Read 12 books',
      type: 'personal',
      progressModel: 'numeric',
      status: 'completed',
      completedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const activeGoals = await db.goals
      .where('status')
      .equals('active')
      .toArray();
    expect(activeGoals).toHaveLength(1);
    expect(activeGoals[0]!.title).toBe('Save $1000');
  });
});
