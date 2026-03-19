import { db } from './db';
import { APP_VERSION, SCHEMA_VERSION } from '@/lib/constants';
import { today } from '@/lib/dates';
import type { ExportData } from '@/lib/types';

export async function exportAllData(): Promise<ExportData> {
  const [
    settings,
    budgetMonths,
    expenses,
    goals,
    healthRoutines,
    healthLogEntries,
  ] = await Promise.all([
    db.settings.toArray(),
    db.budgetMonths.toArray(),
    db.expenses.toArray(),
    db.goals.toArray(),
    db.healthRoutines.toArray(),
    db.healthLogEntries.toArray(),
  ]);

  return {
    metadata: {
      exportDate: new Date().toISOString(),
      appVersion: APP_VERSION,
      schemaVersion: SCHEMA_VERSION,
    },
    data: {
      settings,
      budgetMonths,
      expenses,
      goals,
      healthRoutines,
      healthLogEntries,
    },
  };
}

export function downloadExportFile(data: ExportData): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const dateStr = today();
  const filename = `my-life-app-backup-${dateStr}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Revoke object URL after a brief delay to ensure download starts
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
