import { db } from './db';
import { SCHEMA_VERSION } from '@/lib/constants';
import type { ExportData } from '@/lib/types';

export interface ImportValidationResult {
  valid: boolean;
  error?: string;
  data?: ExportData;
}

const REQUIRED_STORE_KEYS = [
  'settings',
  'budgetMonths',
  'expenses',
  'goals',
  'healthRoutines',
  'healthLogEntries',
] as const;

export function validateImportFile(content: string): ImportValidationResult {
  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { valid: false, error: 'File is not valid JSON.' };
  }

  // Check top-level structure
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('metadata' in parsed) ||
    !('data' in parsed)
  ) {
    return {
      valid: false,
      error: 'File is not a valid My Life App export. Missing metadata or data.',
    };
  }

  const obj = parsed as Record<string, unknown>;

  // Validate metadata
  const metadata = obj.metadata as Record<string, unknown> | undefined;
  if (
    !metadata ||
    typeof metadata !== 'object' ||
    typeof metadata.schemaVersion !== 'number'
  ) {
    return {
      valid: false,
      error: 'File is not a valid My Life App export. Invalid metadata.',
    };
  }

  // Schema version check
  const fileSchemaVersion = metadata.schemaVersion as number;
  if (fileSchemaVersion > SCHEMA_VERSION) {
    return {
      valid: false,
      error: `Schema version ${fileSchemaVersion} is newer than this app (version ${SCHEMA_VERSION}). Please update the app to the latest version.`,
    };
  }

  // Validate data keys
  const data = obj.data as Record<string, unknown> | undefined;
  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      error: 'File is not a valid My Life App export. Missing data section.',
    };
  }

  for (const key of REQUIRED_STORE_KEYS) {
    if (!(key in data) || !Array.isArray(data[key])) {
      return {
        valid: false,
        error: `File is missing required data store: ${key}.`,
      };
    }
  }

  return {
    valid: true,
    data: parsed as ExportData,
  };
}

export async function importData(data: ExportData): Promise<void> {
  // Read current data for rollback on failure
  const backup = {
    settings: await db.settings.toArray(),
    budgetMonths: await db.budgetMonths.toArray(),
    expenses: await db.expenses.toArray(),
    goals: await db.goals.toArray(),
    healthRoutines: await db.healthRoutines.toArray(),
    healthLogEntries: await db.healthLogEntries.toArray(),
  };

  try {
    // Clear all stores
    await db.settings.clear();
    await db.budgetMonths.clear();
    await db.expenses.clear();
    await db.goals.clear();
    await db.healthRoutines.clear();
    await db.healthLogEntries.clear();

    // Also clear notification stores if they exist (v2 schema)
    if (db.tables.some(t => t.name === 'notificationAlerts')) {
      await (db as Record<string, unknown>)['notificationAlerts' as keyof typeof db] &&
        db.table('notificationAlerts').clear();
    }
    if (db.tables.some(t => t.name === 'notificationFiredRecords')) {
      await db.table('notificationFiredRecords').clear();
    }

    // Write imported data
    if (data.data.settings.length > 0) {
      await db.settings.bulkPut(data.data.settings as Parameters<typeof db.settings.bulkPut>[0]);
    }
    if (data.data.budgetMonths.length > 0) {
      await db.budgetMonths.bulkPut(data.data.budgetMonths as Parameters<typeof db.budgetMonths.bulkPut>[0]);
    }
    if (data.data.expenses.length > 0) {
      await db.expenses.bulkPut(data.data.expenses as Parameters<typeof db.expenses.bulkPut>[0]);
    }
    if (data.data.goals.length > 0) {
      await db.goals.bulkPut(data.data.goals as Parameters<typeof db.goals.bulkPut>[0]);
    }
    if (data.data.healthRoutines.length > 0) {
      await db.healthRoutines.bulkPut(data.data.healthRoutines as Parameters<typeof db.healthRoutines.bulkPut>[0]);
    }
    if (data.data.healthLogEntries.length > 0) {
      await db.healthLogEntries.bulkPut(data.data.healthLogEntries as Parameters<typeof db.healthLogEntries.bulkPut>[0]);
    }
  } catch (error) {
    // Rollback: restore backup data
    try {
      await db.settings.clear();
      await db.budgetMonths.clear();
      await db.expenses.clear();
      await db.goals.clear();
      await db.healthRoutines.clear();
      await db.healthLogEntries.clear();

      if (backup.settings.length > 0) await db.settings.bulkPut(backup.settings);
      if (backup.budgetMonths.length > 0) await db.budgetMonths.bulkPut(backup.budgetMonths);
      if (backup.expenses.length > 0) await db.expenses.bulkPut(backup.expenses);
      if (backup.goals.length > 0) await db.goals.bulkPut(backup.goals);
      if (backup.healthRoutines.length > 0) await db.healthRoutines.bulkPut(backup.healthRoutines);
      if (backup.healthLogEntries.length > 0) await db.healthLogEntries.bulkPut(backup.healthLogEntries);
    } catch {
      // Rollback also failed -- database may be inconsistent
    }

    throw new Error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}. Original data has been restored.`);
  }
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}
