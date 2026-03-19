import { db } from '@/data/db';
import { SETTINGS_ID } from '@/lib/constants';
import type { Settings } from '@/lib/types';
import { roundCurrency } from '@/lib/currency';
import { currentYearMonth, daysInMonth } from '@/lib/dates';

/**
 * Settings data service.
 * Framework-agnostic async functions for settings CRUD.
 * Settings is a singleton record (id=1).
 */

/** Get the current settings. Returns undefined if no settings saved yet. */
export async function getSettings(): Promise<Settings | undefined> {
  return db.settings.get(SETTINGS_ID);
}

/** Input type for saving settings. All fields optional for partial saves. */
export interface SaveSettingsInput {
  apiKey?: string;
  birthDate?: string;
  targetDate?: string;
  targetDateLabel?: string;
  monthlyBudget?: number;
  notificationPreferences?: import('@/lib/types').NotificationPreferences;
  notificationPromptDeferred?: number;
  notificationPromptDeferredAtSession?: number;
  notificationPromptLastShown?: string;
  hasQualifyingAction?: boolean;
  sessionCount?: number;
}

/**
 * Save settings. Merges with existing settings (partial update).
 * Creates the singleton record if it doesn't exist.
 * Returns the full saved Settings object.
 */
export async function saveSettings(input: SaveSettingsInput): Promise<Settings> {
  // Validate birth date is not in the future
  if (input.birthDate) {
    const birth = new Date(input.birthDate + 'T00:00:00');
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (birth > now) {
      throw new Error('Birth date cannot be in the future');
    }
  }

  // Validate budget amounts are valid numbers and non-negative if provided
  if (input.monthlyBudget !== undefined) {
    if (isNaN(input.monthlyBudget)) {
      throw new Error('Monthly budget must be a valid number');
    }
    if (input.monthlyBudget < 0) {
      throw new Error('Monthly budget must be non-negative');
    }
  }
  const existing = await db.settings.get(SETTINGS_ID);

  const settings: Settings = {
    ...(existing ?? { id: SETTINGS_ID }),
    ...input,
    id: SETTINGS_ID, // Always enforce singleton ID
  };

  await db.settings.put(settings);

  // Sync monthly budget to the current month's budget record if it exists
  if (input.monthlyBudget !== undefined && input.monthlyBudget > 0) {
    const yearMonth = currentYearMonth();
    const budgetMonth = await db.budgetMonths.get(yearMonth);
    if (budgetMonth) {
      const days = daysInMonth(yearMonth);
      const dailyAllowance = roundCurrency(input.monthlyBudget / days);
      await db.budgetMonths.update(yearMonth, {
        monthlyAmount: roundCurrency(input.monthlyBudget),
        dailyAllowance,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return settings;
}

/** Clear all settings (reset to empty). */
export async function clearSettings(): Promise<void> {
  await db.settings.delete(SETTINGS_ID);
}

/** Alias for saveSettings — used by later stages (e.g., Stage 7). */
export const updateSettings = saveSettings;
