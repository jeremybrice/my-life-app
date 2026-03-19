import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/data/db';
import { SETTINGS_ID, SCHEMA_VERSION } from '@/lib/constants';
import { validateImportFile, importData } from '@/data/import-service';
import type { ExportData } from '@/lib/types';

function makeValidExport(overrides?: Partial<ExportData>): ExportData {
  return {
    metadata: {
      exportDate: '2026-03-18T00:00:00.000Z',
      appVersion: '1.0.0',
      schemaVersion: SCHEMA_VERSION,
    },
    data: {
      settings: [{ id: SETTINGS_ID, monthlyBudget: 500 }],
      budgetMonths: [],
      expenses: [
        {
          id: 1, yearMonth: '2026-03', date: '2026-03-18',
          vendor: 'Imported', amount: 25,
          createdAt: '2026-03-18T00:00:00Z', updatedAt: '2026-03-18T00:00:00Z',
        },
      ],
      goals: [],
      healthRoutines: [],
      healthLogEntries: [],
    },
    ...overrides,
  };
}

describe('import validation', () => {
  it('should accept valid export file', () => {
    const content = JSON.stringify(makeValidExport());
    const result = validateImportFile(content);
    expect(result.valid).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should reject non-JSON content', () => {
    const result = validateImportFile('not json at all');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not valid JSON');
  });

  it('should reject JSON without metadata', () => {
    const result = validateImportFile(JSON.stringify({ data: {} }));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Missing metadata');
  });

  it('should reject JSON without data', () => {
    const result = validateImportFile(JSON.stringify({ metadata: {} }));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Missing metadata or data');
  });

  it('should reject newer schema version', () => {
    const data = makeValidExport();
    data.metadata.schemaVersion = SCHEMA_VERSION + 1;
    const result = validateImportFile(JSON.stringify(data));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('newer than this app');
  });

  it('should reject file missing required store keys', () => {
    const data = makeValidExport();
    delete (data.data as Record<string, unknown>).expenses;
    const result = validateImportFile(JSON.stringify(data));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('expenses');
  });

  it('should accept same schema version', () => {
    const data = makeValidExport();
    data.metadata.schemaVersion = SCHEMA_VERSION;
    const result = validateImportFile(JSON.stringify(data));
    expect(result.valid).toBe(true);
  });

  it('should accept older schema version', () => {
    const data = makeValidExport();
    data.metadata.schemaVersion = 1;
    const result = validateImportFile(JSON.stringify(data));
    expect(result.valid).toBe(true);
  });
});

describe('data import', () => {
  beforeEach(async () => {
    await db.settings.clear();
    await db.budgetMonths.clear();
    await db.expenses.clear();
    await db.goals.clear();
    await db.healthRoutines.clear();
    await db.healthLogEntries.clear();

    // Pre-populate with existing data that should be replaced
    await db.settings.put({ id: SETTINGS_ID, monthlyBudget: 1000 });
    await db.expenses.put({
      id: 99, yearMonth: '2026-02', date: '2026-02-15',
      vendor: 'Old', amount: 50,
      createdAt: '2026-02-15T00:00:00Z', updatedAt: '2026-02-15T00:00:00Z',
    });
  });

  it('should replace all data with imported data', async () => {
    const exportData = makeValidExport();
    await importData(exportData);

    const settings = await db.settings.get(SETTINGS_ID);
    expect(settings?.monthlyBudget).toBe(500);

    const expenses = await db.expenses.toArray();
    expect(expenses).toHaveLength(1);
    expect(expenses[0].vendor).toBe('Imported');
  });

  it('should clear old data completely', async () => {
    const exportData = makeValidExport();
    exportData.data.expenses = [];
    await importData(exportData);

    const expenses = await db.expenses.toArray();
    expect(expenses).toHaveLength(0);
  });

  it('should import into empty database', async () => {
    await db.settings.clear();
    await db.expenses.clear();

    const exportData = makeValidExport();
    await importData(exportData);

    const settings = await db.settings.get(SETTINGS_ID);
    expect(settings?.monthlyBudget).toBe(500);
  });
});
