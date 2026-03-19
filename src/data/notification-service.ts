import type {
  NotificationCapabilities,
  NotificationAlert,
  AppNotificationPermission,
  NotificationPreferences,
} from '@/lib/types';
import { db } from '@/data/db';
import { getSettings, updateSettings } from '@/data/settings-service';
import { getExpensesByMonth } from '@/data/expense-service';
import { getBudgetMonth } from '@/data/budget-service';
import { currentYearMonth, today, daysBetween } from '@/lib/dates';
import { roundCurrency } from '@/lib/currency';

// --- Capability Detection ---

let cachedCapabilities: NotificationCapabilities | null = null;

export function detectCapabilities(): NotificationCapabilities {
  const pushSupported =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator;

  const badgeSupported =
    typeof navigator !== 'undefined' &&
    'setAppBadge' in navigator;

  const persistentSupported =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    typeof Notification !== 'undefined';

  let permissionState: NotificationCapabilities['permissionState'] = 'unsupported';
  if (typeof window !== 'undefined' && 'Notification' in window) {
    permissionState = Notification.permission as NotificationCapabilities['permissionState'];
  }

  cachedCapabilities = {
    pushSupported,
    badgeSupported,
    persistentSupported,
    permissionState,
  };

  return cachedCapabilities;
}

export function getCapabilities(): NotificationCapabilities {
  if (!cachedCapabilities) {
    return detectCapabilities();
  }
  return cachedCapabilities;
}

export function refreshCapabilities(): NotificationCapabilities {
  return detectCapabilities();
}

export function isPushAvailable(): boolean {
  const caps = getCapabilities();
  return caps.pushSupported && caps.permissionState === 'granted';
}

// --- Permission Flow ---

const SESSIONS_BEFORE_RE_PROMPT = 3;

export async function shouldShowPermissionPrompt(): Promise<boolean> {
  const caps = getCapabilities();

  if (caps.permissionState === 'granted' || caps.permissionState === 'denied') {
    return false;
  }

  if (caps.permissionState === 'unsupported') {
    return false;
  }

  const settings = await getSettings();
  if (!settings) return false;

  if (!settings.hasQualifyingAction) {
    return false;
  }

  if ((settings.sessionCount ?? 0) < 2) {
    return false;
  }

  const deferred = settings.notificationPromptDeferred ?? 0;
  if (deferred > 0) {
    const sessionsSinceStart = settings.sessionCount ?? 0;
    const lastShownSession = deferred * SESSIONS_BEFORE_RE_PROMPT + 1;
    if (sessionsSinceStart < lastShownSession + SESSIONS_BEFORE_RE_PROMPT) {
      return false;
    }
  }

  return true;
}

export async function requestNotificationPermission(): Promise<AppNotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  const result = await Notification.requestPermission();
  refreshCapabilities();
  return result as AppNotificationPermission;
}

export async function deferPermissionPrompt(): Promise<void> {
  const settings = await getSettings();
  if (!settings) return;

  await updateSettings({
    notificationPromptDeferred: (settings.notificationPromptDeferred ?? 0) + 1,
    notificationPromptLastShown: new Date().toISOString(),
  });
}

export async function recordQualifyingAction(): Promise<void> {
  const settings = await getSettings();
  if (!settings) return;
  if (settings.hasQualifyingAction) return;

  await updateSettings({
    hasQualifyingAction: true,
  });
}

export async function incrementSessionCount(): Promise<void> {
  const settings = await getSettings();
  if (!settings) return;

  await updateSettings({
    sessionCount: (settings.sessionCount ?? 0) + 1,
  });
}

// --- Alert Stores ---

async function hasAlreadyFired(alertId: string): Promise<boolean> {
  const record = await db.notificationFiredRecords.get(alertId);
  return !!record;
}

async function markAsFired(alertId: string): Promise<void> {
  await db.notificationFiredRecords.put({
    id: alertId,
    firedAt: new Date().toISOString(),
  });
}

async function createAlert(alert: NotificationAlert): Promise<void> {
  await db.notificationAlerts.put(alert);
}

export async function getActiveAlerts(): Promise<NotificationAlert[]> {
  const alerts = await db.notificationAlerts.toArray();
  return alerts.filter(a => !a.dismissed);
}

export async function dismissAlert(alertId: string): Promise<void> {
  await db.notificationAlerts.update(alertId, { dismissed: true });
}

export async function dismissAlertsByScreen(screen: 'budget' | 'dashboard'): Promise<void> {
  const alerts = await db.notificationAlerts
    .where('screen')
    .equals(screen)
    .toArray();

  await Promise.all(
    alerts.filter(a => !a.dismissed).map(a =>
      db.notificationAlerts.update(a.id, { dismissed: true })
    )
  );
}

export async function getActiveAlertCount(): Promise<number> {
  const alerts = await db.notificationAlerts.toArray();
  return alerts.filter(a => !a.dismissed).length;
}

// --- Budget Threshold Checks ---

export async function checkBudgetThresholds(): Promise<void> {
  const settings = await getSettings();
  if (!settings) return;

  const prefs: NotificationPreferences | undefined = settings.notificationPreferences;
  if (!prefs || !prefs.masterEnabled) return;

  const yearMonth = currentYearMonth();
  const todayStr = today();

  const budgetMonth = await getBudgetMonth(yearMonth);
  if (!budgetMonth) return;

  const expenses = await getExpensesByMonth(yearMonth);
  const totalSpent = roundCurrency(
    expenses.reduce((sum, e) => sum + e.amount, 0)
  );

  // Daily overspend check
  if (prefs.dailyOverspend) {
    const dailyAlertId = `budget-daily-${todayStr}`;
    if (!(await hasAlreadyFired(dailyAlertId))) {
      const todayExpenses = expenses.filter(e => e.date === todayStr);
      const todayTotal = roundCurrency(
        todayExpenses.reduce((sum, e) => sum + e.amount, 0)
      );

      if (todayTotal > budgetMonth.dailyAllowance) {
        const overBy = roundCurrency(todayTotal - budgetMonth.dailyAllowance);
        await dispatchNotification({
          id: dailyAlertId,
          type: 'budget-daily',
          title: 'Daily Budget Exceeded',
          body: `You've spent $${overBy.toFixed(2)} over today's budget of $${budgetMonth.dailyAllowance.toFixed(2)}.`,
          timestamp: new Date().toISOString(),
          dismissed: false,
          screen: 'budget',
        });
      }
    }
  }

  // Monthly threshold checks
  for (const threshold of prefs.monthlyThresholds) {
    if (!threshold.enabled) continue;

    const monthlyAlertId = `budget-monthly-${threshold.percentage}-${yearMonth}`;
    if (await hasAlreadyFired(monthlyAlertId)) continue;

    const thresholdAmount = roundCurrency(
      budgetMonth.monthlyAmount * (threshold.percentage / 100)
    );

    if (totalSpent >= thresholdAmount) {
      await dispatchNotification({
        id: monthlyAlertId,
        type: 'budget-monthly',
        title: `${threshold.percentage}% of Monthly Budget Used`,
        body: `You've spent $${totalSpent.toFixed(2)} of your $${budgetMonth.monthlyAmount.toFixed(2)} monthly budget (${threshold.percentage}%).`,
        timestamp: new Date().toISOString(),
        dismissed: false,
        screen: 'budget',
      });
    }
  }
}

// --- Milestone Countdown Checks ---

export async function checkMilestoneCountdown(): Promise<void> {
  const settings = await getSettings();
  if (!settings) return;

  const prefs = settings.notificationPreferences;
  if (!prefs || !prefs.masterEnabled) return;

  const targetDate = settings.targetDate;
  const targetLabel = settings.targetDateLabel || 'Your Milestone';

  if (!targetDate) return;

  const todayStr = today();

  // Compute signed days remaining (positive = future, negative = past)
  const todayMs = new Date(todayStr + 'T00:00:00').getTime();
  const targetMs = new Date(targetDate + 'T00:00:00').getTime();
  const daysRemaining = Math.round((targetMs - todayMs) / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 0) return;

  for (const interval of prefs.milestoneIntervals) {
    if (!interval.enabled) continue;

    if (daysRemaining === interval.days) {
      const alertId = `milestone-${interval.days}-${targetDate}`;
      if (await hasAlreadyFired(alertId)) continue;

      const motivationalBody = getMilestoneMessage(interval.days, targetLabel);

      await dispatchNotification({
        id: alertId,
        type: 'milestone',
        title: `${targetLabel} Countdown`,
        body: motivationalBody,
        timestamp: new Date().toISOString(),
        dismissed: false,
        screen: 'dashboard',
      });
    }
  }
}

function getMilestoneMessage(daysRemaining: number, label: string): string {
  if (daysRemaining === 1) {
    return `Tomorrow is the day! ${label} is just 1 day away. You've got this!`;
  }
  if (daysRemaining <= 7) {
    return `Only ${daysRemaining} days until ${label}! The finish line is in sight.`;
  }
  return `${daysRemaining} days until ${label}! Stay focused and keep pushing forward.`;
}

// --- App Launch Check ---

export async function runAppLaunchChecks(): Promise<void> {
  await checkMilestoneCountdown();
  await checkBudgetThresholds();
}

// --- Badge Management ---

export async function updateBadgeCount(): Promise<void> {
  const caps = getCapabilities();
  if (!caps.badgeSupported) return;

  const count = await getActiveAlertCount();
  try {
    if (count > 0) {
      await (navigator as Navigator & { setAppBadge: (count: number) => Promise<void> }).setAppBadge(count);
    } else {
      await (navigator as Navigator & { clearAppBadge: () => Promise<void> }).clearAppBadge();
    }
  } catch {
    // Badge API not available or failed silently
  }
}

export async function clearBadgeForScreen(screen: 'budget' | 'dashboard'): Promise<void> {
  await dismissAlertsByScreen(screen);
  await updateBadgeCount();
}

// --- Notification Dispatch ---

async function dispatchNotification(alert: NotificationAlert): Promise<void> {
  await markAsFired(alert.id);
  await createAlert(alert);

  if (isPushAvailable()) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(alert.title, {
        body: alert.body,
        icon: '/icons/icon-192x192.png',
        tag: alert.id,
        data: { screen: alert.screen },
      });
    } catch {
      // Push failed silently -- in-app alert is already created
    }
  }

  await updateBadgeCount();
}
