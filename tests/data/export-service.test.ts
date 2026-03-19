import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/data/db';
import { SETTINGS_ID } from '@/lib/constants';
import { exportAllData } from '@/data/export-service';

describe('data export service', () => {
  beforeEach(async () => {
    await db.settings.clear();
    await db.budgetMonths.clear();
    await db.expenses.clear();
    await db.goals.clear();
    await db.healthRoutines.clear();
    await db.healthLogEntries.clear();
  });

  it('should export all stores with metadata', async () => {
    await db.settings.put({
      id: SETTINGS_ID,
      monthlyBudget: 1000,
    });
    await db.expenses.put({
      id: 1,
      yearMonth: '2026-03',
      date: '2026-03-18',
      vendor: 'Test',
      amount: 10,
      createdAt: '2026-03-18T00:00:00Z',
      updatedAt: '2026-03-18T00:00:00Z',
    });

    const result = await exportAllData();

    expect(result.metadata).toBeDefined();
    expect(result.metadata.appVersion).toBe('1.0.0');
    expect(result.metadata.schemaVersion).toBe(2);
    expect(result.metadata.exportDate).toBeTruthy();

    expect(result.data.settings).toHaveLength(1);
    expect(result.data.expenses).toHaveLength(1);
    expect(result.data.budgetMonths).toHaveLength(0);
    expect(result.data.goals).toHaveLength(0);
    expect(result.data.healthRoutines).toHaveLength(0);
    expect(result.data.healthLogEntries).toHaveLength(0);
  });

  it('should export empty stores as empty arrays', async () => {
    const result = await exportAllData();

    expect(result.data.settings).toHaveLength(0);
    expect(result.data.budgetMonths).toHaveLength(0);
    expect(result.data.expenses).toHaveLength(0);
    expect(result.data.goals).toHaveLength(0);
    expect(result.data.healthRoutines).toHaveLength(0);
    expect(result.data.healthLogEntries).toHaveLength(0);
  });

  it('should include all expense records', async () => {
    await db.expenses.bulkPut([
      {
        id: 1, yearMonth: '2026-03', date: '2026-03-17',
        vendor: 'A', amount: 10,
        createdAt: '2026-03-17T00:00:00Z', updatedAt: '2026-03-17T00:00:00Z',
      },
      {
        id: 2, yearMonth: '2026-03', date: '2026-03-18',
        vendor: 'B', amount: 20,
        createdAt: '2026-03-18T00:00:00Z', updatedAt: '2026-03-18T00:00:00Z',
      },
    ]);

    const result = await exportAllData();
    expect(result.data.expenses).toHaveLength(2);
  });

  it('should produce valid JSON when stringified', async () => {
    await db.settings.put({ id: SETTINGS_ID, monthlyBudget: 500 });

    const result = await exportAllData();
    const json = JSON.stringify(result, null, 2);
    const parsed = JSON.parse(json);

    expect(parsed.metadata).toBeDefined();
    expect(parsed.data).toBeDefined();
  });
});
