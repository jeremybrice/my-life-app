# Stage 7: Notifications, Import/Export & Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the app release-ready with proactive notifications, data backup/restore, cross-browser compatibility, and UX polish.

**Architecture:** Notification service in src/data/notification-service.ts dispatches to push or in-app fallback based on capability flags. Export/import reads/writes all IndexedDB stores. Polish pass establishes design tokens and ensures state coverage across all screens.

**Tech Stack:** React, TypeScript, Dexie.js, Notification API, Badge API, Vitest, React Testing Library

**Depends on:** All prior stages (reads budget data for alerts, settings for thresholds, all stores for export/import)
**Produces:** Release-ready application deployed to Netlify

---

## Section 1: Notification Capability Detection Service (Story 040)

### Task 1.1: Create notification capabilities type definitions

**File:** `src/lib/types.ts`
**Why:** Define capability flags and alert types used across the notification system.
**Append** the following interfaces to the existing types file:

```typescript
// --- Notification system types ---

export interface NotificationCapabilities {
  pushSupported: boolean;
  badgeSupported: boolean;
  persistentSupported: boolean;
  permissionState: AppNotificationPermission | 'unsupported'; // 'granted' | 'denied' | 'default' | 'unsupported'
}

export type AppNotificationPermission = 'granted' | 'denied' | 'default';

export interface NotificationAlert {
  id: string;           // unique key e.g. "budget-daily-2026-03-18" or "milestone-30-2026"
  type: 'budget-daily' | 'budget-monthly' | 'milestone';
  title: string;
  body: string;
  timestamp: string;    // ISO datetime
  dismissed: boolean;
  screen: 'budget' | 'dashboard'; // which screen clears this alert
}

export interface NotificationFiredRecord {
  id: string;           // same key format as NotificationAlert.id
  firedAt: string;      // ISO datetime
}

export interface ExportData {
  metadata: ExportMetadata;
  data: ExportStores;
}

export interface ExportMetadata {
  exportDate: string;   // ISO datetime
  appVersion: string;
  schemaVersion: number;
}

export interface ExportStores {
  settings: unknown[];
  budgetMonths: unknown[];
  expenses: unknown[];
  goals: unknown[];
  healthRoutines: unknown[];
  healthLogEntries: unknown[];
}
```

**Test:** `npx vitest run tests/data/notification-service.test.ts` (will create in next task)
**Commit:** `feat: add notification system type definitions`

---

### Task 1.2: Create notification capability detection service

**File:** `src/data/notification-service.ts`
**Why:** Runtime feature detection for push, badge, and persistent notification APIs. In-memory cache refreshed on init and settings access.

```typescript
import type { NotificationCapabilities, NotificationAlert, NotificationFiredRecord } from '../lib/types';
import { db } from './db';

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
```

**Test:** `npx vitest run tests/data/notification-service.test.ts`
**Commit:** `feat: add notification capability detection service`

---

### Task 1.3: Write capability detection tests

**File:** `tests/data/notification-service.test.ts`
**Why:** Verify feature detection handles all browser environments correctly.

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { detectCapabilities, getCapabilities, refreshCapabilities, isPushAvailable } from '../../src/data/notification-service';

describe('notification capability detection', () => {
  beforeEach(() => {
    // Reset cached capabilities by calling detect fresh
    vi.restoreAllMocks();
  });

  it('should detect push support when Notification and serviceWorker exist', () => {
    // fake-indexeddb test environment has window but not Notification
    // We mock the globals
    vi.stubGlobal('Notification', { permission: 'default' });
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {},
      configurable: true,
    });

    const caps = detectCapabilities();
    expect(caps.pushSupported).toBe(true);
    expect(caps.permissionState).toBe('default');
  });

  it('should detect badge support when navigator.setAppBadge exists', () => {
    Object.defineProperty(navigator, 'setAppBadge', {
      value: vi.fn(),
      configurable: true,
    });

    const caps = detectCapabilities();
    expect(caps.badgeSupported).toBe(true);
  });

  it('should report unsupported when Notification API is missing', () => {
    vi.stubGlobal('Notification', undefined);
    // Remove Notification from window check
    const originalNotification = (window as Record<string, unknown>).Notification;
    delete (window as Record<string, unknown>).Notification;

    const caps = detectCapabilities();
    expect(caps.pushSupported).toBe(false);
    expect(caps.permissionState).toBe('unsupported');

    // Restore
    if (originalNotification) {
      (window as Record<string, unknown>).Notification = originalNotification;
    }
  });

  it('should cache capabilities and return cached on subsequent calls', () => {
    vi.stubGlobal('Notification', { permission: 'granted' });
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {},
      configurable: true,
    });

    detectCapabilities();
    const cached = getCapabilities();
    expect(cached.permissionState).toBe('granted');
  });

  it('should refresh capabilities when refreshCapabilities is called', () => {
    vi.stubGlobal('Notification', { permission: 'default' });
    detectCapabilities();
    expect(getCapabilities().permissionState).toBe('default');

    vi.stubGlobal('Notification', { permission: 'granted' });
    refreshCapabilities();
    expect(getCapabilities().permissionState).toBe('granted');
  });

  it('should report isPushAvailable correctly', () => {
    vi.stubGlobal('Notification', { permission: 'granted' });
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {},
      configurable: true,
    });
    detectCapabilities();
    expect(isPushAvailable()).toBe(true);
  });

  it('should report isPushAvailable false when permission denied', () => {
    vi.stubGlobal('Notification', { permission: 'denied' });
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {},
      configurable: true,
    });
    detectCapabilities();
    expect(isPushAvailable()).toBe(false);
  });
});
```

**Run:** `npx vitest run tests/data/notification-service.test.ts`
**Commit:** `test: add notification capability detection tests`

---

## Section 2: Notification Permission Request Flow (Story 039)

### Task 2.1: Add permission tracking fields to Settings

**File:** `src/data/db.ts`
**Why:** Track deferral count, qualifying action flag, and permission prompt history in the existing settings store. No schema version change needed -- these are optional fields on the Settings interface.

Append to the `Settings` interface:

```typescript
  notificationPromptDeferred?: number;   // count of "Not Now" taps
  notificationPromptLastShown?: string;  // ISO datetime of last prompt
  hasQualifyingAction?: boolean;         // true after first budget/expense/goal action
  sessionCount?: number;                 // incremented on each app launch
```

**Test:** `npx vitest run tests/data/notification-service.test.ts`
**Commit:** `feat: add notification permission tracking fields to Settings`

---

### Task 2.2: Create permission request service functions

**File:** `src/data/notification-service.ts`
**Why:** Logic to determine when to show permission prompt, request permission, and record deferral.

Append to the existing notification-service.ts:

```typescript
import { getSettings, updateSettings } from './settings-service';

const SESSIONS_BEFORE_RE_PROMPT = 3; // re-show after 3 sessions post-deferral

// --- Permission Flow ---

export async function shouldShowPermissionPrompt(): Promise<boolean> {
  const caps = getCapabilities();

  // Already granted or denied at browser level -- never show
  if (caps.permissionState === 'granted' || caps.permissionState === 'denied') {
    return false;
  }

  // No Notification API -- never show
  if (caps.permissionState === 'unsupported') {
    return false;
  }

  const settings = await getSettings();
  if (!settings) return false;

  // Must have completed a qualifying action
  if (!settings.hasQualifyingAction) {
    return false;
  }

  // Must not be first session
  if ((settings.sessionCount ?? 0) < 2) {
    return false;
  }

  // If previously deferred, wait SESSIONS_BEFORE_RE_PROMPT sessions
  const deferred = settings.notificationPromptDeferred ?? 0;
  if (deferred > 0) {
    const sessionsSinceStart = settings.sessionCount ?? 0;
    // Show again every SESSIONS_BEFORE_RE_PROMPT sessions after last deferral
    // Simple approach: show if sessionCount % SESSIONS_BEFORE_RE_PROMPT === 0
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
  // Refresh capabilities after permission change
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
  if (settings.hasQualifyingAction) return; // already recorded

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
```

**Test:** `npx vitest run tests/data/notification-service.test.ts`
**Commit:** `feat: add notification permission request flow logic`

---

### Task 2.3: Create NotificationPrompt component

**File:** `src/components/NotificationPrompt.tsx`
**Why:** Pre-permission in-app prompt that explains value before firing the browser dialog.

```tsx
import { useState } from 'react';
import {
  requestNotificationPermission,
  deferPermissionPrompt,
} from '../data/notification-service';

interface NotificationPromptProps {
  onClose: () => void;
}

export function NotificationPrompt({ onClose }: NotificationPromptProps) {
  const [permissionResult, setPermissionResult] = useState<string | null>(null);

  async function handleEnable() {
    const result = await requestNotificationPermission();
    if (result === 'granted') {
      setPermissionResult('granted');
      setTimeout(onClose, 2000);
    } else if (result === 'denied') {
      setPermissionResult('denied');
    } else {
      setPermissionResult('unsupported');
    }
  }

  async function handleNotNow() {
    await deferPermissionPrompt();
    onClose();
  }

  if (permissionResult === 'granted') {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
        <div className="mx-4 mb-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:mb-0">
          <div className="text-center">
            <p className="text-lg font-semibold text-green-700">
              Notifications enabled!
            </p>
            <p className="mt-1 text-sm text-gray-600">
              You will receive budget alerts and milestone reminders.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (permissionResult === 'denied') {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
        <div className="mx-4 mb-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:mb-0">
          <div className="text-center">
            <p className="text-lg font-semibold text-amber-700">
              Notifications blocked
            </p>
            <p className="mt-2 text-sm text-gray-600">
              To enable notifications later, go to your browser settings and
              allow notifications for this site.
            </p>
            <button
              onClick={onClose}
              className="mt-4 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="mx-4 mb-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:mb-0">
        <h2 className="text-lg font-semibold text-gray-900">
          Stay on top of your goals
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Get notified when your spending crosses budget thresholds and when
          important milestones are approaching. You can customize which alerts
          you receive in Settings.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            onClick={handleNotNow}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Not Now
          </button>
          <button
            onClick={handleEnable}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Enable Notifications
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Test:** `npx vitest run tests/screens/notification-prompt.test.tsx`
**Commit:** `feat: add NotificationPrompt pre-permission component`

---

### Task 2.4: Write permission request flow tests

**File:** `tests/data/notification-permission.test.ts`
**Why:** Verify prompt-gating logic: first session blocked, qualifying action required, deferral respects cooldown.

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../../src/data/db';
import { SETTINGS_ID } from '../../src/lib/constants';
import {
  shouldShowPermissionPrompt,
  deferPermissionPrompt,
  recordQualifyingAction,
  incrementSessionCount,
  detectCapabilities,
} from '../../src/data/notification-service';

describe('notification permission flow', () => {
  beforeEach(async () => {
    await db.settings.clear();
    await db.settings.put({
      id: SETTINGS_ID,
      sessionCount: 0,
      hasQualifyingAction: false,
    });
    // Mock Notification API as available with default permission
    vi.stubGlobal('Notification', { permission: 'default', requestPermission: vi.fn() });
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {},
      configurable: true,
    });
    detectCapabilities();
  });

  it('should not show prompt on first session', async () => {
    await db.settings.update(SETTINGS_ID, {
      sessionCount: 1,
      hasQualifyingAction: true,
    });
    expect(await shouldShowPermissionPrompt()).toBe(false);
  });

  it('should not show prompt without qualifying action', async () => {
    await db.settings.update(SETTINGS_ID, {
      sessionCount: 5,
      hasQualifyingAction: false,
    });
    expect(await shouldShowPermissionPrompt()).toBe(false);
  });

  it('should show prompt after qualifying action and multiple sessions', async () => {
    await db.settings.update(SETTINGS_ID, {
      sessionCount: 3,
      hasQualifyingAction: true,
    });
    expect(await shouldShowPermissionPrompt()).toBe(true);
  });

  it('should not show prompt when permission already granted', async () => {
    vi.stubGlobal('Notification', { permission: 'granted' });
    detectCapabilities();
    await db.settings.update(SETTINGS_ID, {
      sessionCount: 5,
      hasQualifyingAction: true,
    });
    expect(await shouldShowPermissionPrompt()).toBe(false);
  });

  it('should not show prompt when permission denied', async () => {
    vi.stubGlobal('Notification', { permission: 'denied' });
    detectCapabilities();
    await db.settings.update(SETTINGS_ID, {
      sessionCount: 5,
      hasQualifyingAction: true,
    });
    expect(await shouldShowPermissionPrompt()).toBe(false);
  });

  it('should defer and respect cooldown period', async () => {
    await db.settings.update(SETTINGS_ID, {
      sessionCount: 3,
      hasQualifyingAction: true,
    });
    expect(await shouldShowPermissionPrompt()).toBe(true);

    await deferPermissionPrompt();
    // Should not show immediately after deferral
    expect(await shouldShowPermissionPrompt()).toBe(false);
  });

  it('should record qualifying action only once', async () => {
    await recordQualifyingAction();
    const settings1 = await db.settings.get(SETTINGS_ID);
    expect(settings1?.hasQualifyingAction).toBe(true);

    // Calling again should not error
    await recordQualifyingAction();
  });

  it('should increment session count', async () => {
    await incrementSessionCount();
    const settings = await db.settings.get(SETTINGS_ID);
    expect(settings?.sessionCount).toBe(1);

    await incrementSessionCount();
    const settings2 = await db.settings.get(SETTINGS_ID);
    expect(settings2?.sessionCount).toBe(2);
  });
});
```

**Run:** `npx vitest run tests/data/notification-permission.test.ts`
**Commit:** `test: add notification permission flow tests`

---

### Task 2.5: Write NotificationPrompt component tests

**File:** `tests/screens/notification-prompt.test.tsx`
**Why:** Verify UI renders correct states and calls service functions.

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationPrompt } from '../../src/components/NotificationPrompt';

// Mock the notification service
vi.mock('../../src/data/notification-service', () => ({
  requestNotificationPermission: vi.fn(),
  deferPermissionPrompt: vi.fn(),
}));

import {
  requestNotificationPermission,
  deferPermissionPrompt,
} from '../../src/data/notification-service';

describe('NotificationPrompt', () => {
  it('should render the pre-permission prompt with explanation', () => {
    render(<NotificationPrompt onClose={vi.fn()} />);
    expect(screen.getByText('Stay on top of your goals')).toBeInTheDocument();
    expect(screen.getByText('Enable Notifications')).toBeInTheDocument();
    expect(screen.getByText('Not Now')).toBeInTheDocument();
  });

  it('should call deferPermissionPrompt and close on Not Now', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    (deferPermissionPrompt as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    render(<NotificationPrompt onClose={onClose} />);
    await user.click(screen.getByText('Not Now'));

    expect(deferPermissionPrompt).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('should show granted confirmation when permission is granted', async () => {
    const user = userEvent.setup();
    (requestNotificationPermission as ReturnType<typeof vi.fn>).mockResolvedValue('granted');

    render(<NotificationPrompt onClose={vi.fn()} />);
    await user.click(screen.getByText('Enable Notifications'));

    expect(await screen.findByText('Notifications enabled!')).toBeInTheDocument();
  });

  it('should show denied message when permission is denied', async () => {
    const user = userEvent.setup();
    (requestNotificationPermission as ReturnType<typeof vi.fn>).mockResolvedValue('denied');

    render(<NotificationPrompt onClose={vi.fn()} />);
    await user.click(screen.getByText('Enable Notifications'));

    expect(await screen.findByText('Notifications blocked')).toBeInTheDocument();
    expect(screen.getByText('Got it')).toBeInTheDocument();
  });
});
```

**Run:** `npx vitest run tests/screens/notification-prompt.test.tsx`
**Commit:** `test: add NotificationPrompt component tests`

---

## Section 3: Budget Threshold Alert Logic (Story 041)

### Task 3.1: Add notification alert and fired-record stores to Dexie

**File:** `src/data/db.ts`
**Why:** Persist active alerts (for in-app fallback display and badge count) and fired-record flags (prevent duplicates). Bump schema version.

Add to the class and version call:

```typescript
// Add to the MyLifeAppDB class body:
  notificationAlerts!: Table<NotificationAlert>;
  notificationFiredRecords!: Table<NotificationFiredRecord>;

// Update the constructor version chain (bump to version 2):
  this.version(2).stores({
    settings: 'id',
    budgetMonths: 'yearMonth',
    expenses: '++id, yearMonth, date',
    goals: '++id, status, type',
    healthRoutines: '++id',
    healthLogEntries: '++id, routineId, date',
    notificationAlerts: 'id, type, screen, dismissed',
    notificationFiredRecords: 'id',
  });
```

Import the types:

```typescript
import type { NotificationAlert, NotificationFiredRecord } from '../lib/types';
```

**Test:** `npx vitest run tests/data/notification-service.test.ts`
**Commit:** `feat: add notification alert and fired-record stores to Dexie schema`

---

### Task 3.2: Create budget threshold alert checking logic

**File:** `src/data/notification-service.ts`
**Why:** After each expense write, evaluate daily overspend and monthly thresholds against settings. Fire once per day/month per threshold.

Append to notification-service.ts:

```typescript
import { getExpensesByMonth } from './expense-service';
import { getBudgetMonth } from './budget-service';
import { currentYearMonth, today } from '../lib/dates';
import { roundCurrency } from '../lib/currency';
import type { NotificationPreferences } from '../lib/types';

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
  return db.notificationAlerts
    .where('dismissed')
    .equals(0) // Dexie stores booleans; use filter
    .toArray()
    .then(alerts => alerts.filter(a => !a.dismissed));
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

  const prefs = settings.notificationPreferences;
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

// --- Notification Dispatch ---

async function dispatchNotification(alert: NotificationAlert): Promise<void> {
  // Mark as fired to prevent duplicates
  await markAsFired(alert.id);

  // Always create in-app alert record
  await createAlert(alert);

  // Attempt push notification if available
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

  // Update badge count
  await updateBadgeCount();
}
```

**Test:** `npx vitest run tests/data/budget-threshold-alerts.test.ts`
**Commit:** `feat: add budget threshold alert checking logic`

---

### Task 3.3: Write budget threshold alert tests

**File:** `tests/data/budget-threshold-alerts.test.ts`
**Why:** Verify daily overspend fires once/day, monthly thresholds fire once each, disabled thresholds skip, past months skip.

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../../src/data/db';
import { SETTINGS_ID } from '../../src/lib/constants';
import { checkBudgetThresholds, detectCapabilities } from '../../src/data/notification-service';
import * as dates from '../../src/lib/dates';

describe('budget threshold alerts', () => {
  beforeEach(async () => {
    // Clear all stores
    await db.settings.clear();
    await db.budgetMonths.clear();
    await db.expenses.clear();
    await db.notificationAlerts.clear();
    await db.notificationFiredRecords.clear();

    // Mock dates
    vi.spyOn(dates, 'currentYearMonth').mockReturnValue('2026-03');
    vi.spyOn(dates, 'today').mockReturnValue('2026-03-18');

    // No push support in test env
    detectCapabilities();

    // Default settings with notifications enabled
    await db.settings.put({
      id: SETTINGS_ID,
      monthlyBudget: 1000,
      dailyBudget: 50,
      notificationPreferences: {
        masterEnabled: true,
        dailyOverspend: true,
        monthlyThresholds: [
          { percentage: 80, enabled: true },
          { percentage: 90, enabled: true },
          { percentage: 100, enabled: true },
        ],
        milestoneIntervals: [
          { days: 30, enabled: true },
          { days: 7, enabled: true },
          { days: 1, enabled: true },
        ],
      },
    });

    // Budget month
    await db.budgetMonths.put({
      yearMonth: '2026-03',
      monthlyAmount: 1000,
      dailyAllowance: 50,
      carryOver: 0,
      additionalFunds: 0,
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    });
  });

  it('should fire daily overspend when today total exceeds daily allowance', async () => {
    await db.expenses.bulkPut([
      {
        id: 1,
        yearMonth: '2026-03',
        date: '2026-03-18',
        vendor: 'Coffee Shop',
        amount: 30,
        createdAt: '2026-03-18T08:00:00Z',
        updatedAt: '2026-03-18T08:00:00Z',
      },
      {
        id: 2,
        yearMonth: '2026-03',
        date: '2026-03-18',
        vendor: 'Lunch',
        amount: 25,
        createdAt: '2026-03-18T12:00:00Z',
        updatedAt: '2026-03-18T12:00:00Z',
      },
    ]);

    await checkBudgetThresholds();
    const alerts = await db.notificationAlerts.toArray();
    const dailyAlert = alerts.find(a => a.type === 'budget-daily');
    expect(dailyAlert).toBeDefined();
    expect(dailyAlert!.title).toBe('Daily Budget Exceeded');
  });

  it('should not fire daily overspend when under budget', async () => {
    await db.expenses.put({
      id: 1,
      yearMonth: '2026-03',
      date: '2026-03-18',
      vendor: 'Coffee',
      amount: 5,
      createdAt: '2026-03-18T08:00:00Z',
      updatedAt: '2026-03-18T08:00:00Z',
    });

    await checkBudgetThresholds();
    const alerts = await db.notificationAlerts.toArray();
    expect(alerts.filter(a => a.type === 'budget-daily')).toHaveLength(0);
  });

  it('should fire daily overspend only once per day', async () => {
    await db.expenses.put({
      id: 1,
      yearMonth: '2026-03',
      date: '2026-03-18',
      vendor: 'Expensive',
      amount: 60,
      createdAt: '2026-03-18T08:00:00Z',
      updatedAt: '2026-03-18T08:00:00Z',
    });

    await checkBudgetThresholds();
    await checkBudgetThresholds(); // second call

    const alerts = await db.notificationAlerts.toArray();
    expect(alerts.filter(a => a.type === 'budget-daily')).toHaveLength(1);
  });

  it('should fire monthly 80% threshold when crossed', async () => {
    await db.expenses.put({
      id: 1,
      yearMonth: '2026-03',
      date: '2026-03-18',
      vendor: 'Big Purchase',
      amount: 810,
      createdAt: '2026-03-18T08:00:00Z',
      updatedAt: '2026-03-18T08:00:00Z',
    });

    await checkBudgetThresholds();
    const alerts = await db.notificationAlerts.toArray();
    const monthlyAlert = alerts.find(a => a.id === 'budget-monthly-80-2026-03');
    expect(monthlyAlert).toBeDefined();
    expect(monthlyAlert!.title).toContain('80%');
  });

  it('should fire multiple monthly thresholds when all crossed at once', async () => {
    await db.expenses.put({
      id: 1,
      yearMonth: '2026-03',
      date: '2026-03-18',
      vendor: 'Huge Purchase',
      amount: 1050,
      createdAt: '2026-03-18T08:00:00Z',
      updatedAt: '2026-03-18T08:00:00Z',
    });

    await checkBudgetThresholds();
    const alerts = await db.notificationAlerts.toArray();
    const monthlyAlerts = alerts.filter(a => a.type === 'budget-monthly');
    expect(monthlyAlerts).toHaveLength(3); // 80%, 90%, 100%
  });

  it('should not fire disabled thresholds', async () => {
    await db.settings.update(SETTINGS_ID, {
      notificationPreferences: {
        masterEnabled: true,
        dailyOverspend: true,
        monthlyThresholds: [
          { percentage: 80, enabled: false },
          { percentage: 90, enabled: true },
          { percentage: 100, enabled: true },
        ],
        milestoneIntervals: [],
      },
    });

    await db.expenses.put({
      id: 1,
      yearMonth: '2026-03',
      date: '2026-03-18',
      vendor: 'Purchase',
      amount: 850,
      createdAt: '2026-03-18T08:00:00Z',
      updatedAt: '2026-03-18T08:00:00Z',
    });

    await checkBudgetThresholds();
    const alerts = await db.notificationAlerts.toArray();
    expect(alerts.find(a => a.id === 'budget-monthly-80-2026-03')).toBeUndefined();
    expect(alerts.find(a => a.id === 'budget-monthly-90-2026-03')).toBeUndefined(); // 850 < 900
  });

  it('should not fire when master toggle is off', async () => {
    await db.settings.update(SETTINGS_ID, {
      notificationPreferences: {
        masterEnabled: false,
        dailyOverspend: true,
        monthlyThresholds: [
          { percentage: 80, enabled: true },
        ],
        milestoneIntervals: [],
      },
    });

    await db.expenses.put({
      id: 1,
      yearMonth: '2026-03',
      date: '2026-03-18',
      vendor: 'Purchase',
      amount: 900,
      createdAt: '2026-03-18T08:00:00Z',
      updatedAt: '2026-03-18T08:00:00Z',
    });

    await checkBudgetThresholds();
    const alerts = await db.notificationAlerts.toArray();
    expect(alerts).toHaveLength(0);
  });
});
```

**Run:** `npx vitest run tests/data/budget-threshold-alerts.test.ts`
**Commit:** `test: add budget threshold alert tests`

---

### Task 3.4: Hook budget threshold checks into expense writes

**File:** `src/data/expense-service.ts`
**Why:** Automatically check thresholds after every createExpense, updateExpense, and deleteExpense call.

Add at the end of each write function (`createExpense`, `updateExpense`, `deleteExpense`):

```typescript
import { checkBudgetThresholds } from './notification-service';

// Inside createExpense, after the successful write:
  // Fire-and-forget threshold check (do not block the write)
  checkBudgetThresholds().catch(() => {});
  return expense;

// Inside updateExpense, after the successful write:
  checkBudgetThresholds().catch(() => {});
  return updated;

// Inside deleteExpense, after the successful delete:
  checkBudgetThresholds().catch(() => {});
```

**Test:** `npx vitest run tests/data/expense-service.test.ts`
**Commit:** `feat: hook budget threshold checks into expense writes`

---

## Section 4: Milestone Countdown Alert Logic (Story 042)

### Task 4.1: Create milestone countdown alert checking logic

**File:** `src/data/notification-service.ts`
**Why:** Daily check comparing today to target date. Fires at configured intervals (30/7/1 days), each exactly once.

Append to notification-service.ts:

```typescript
import { daysBetween } from '../lib/dates';

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
  const daysRemaining = daysBetween(todayStr, targetDate);

  // No notifications if milestone has passed
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
  // Budget checks are triggered by expense writes, but also run on launch
  // in case the day changed and the user hasn't added expenses yet
  await checkBudgetThresholds();
}
```

**Test:** `npx vitest run tests/data/milestone-alerts.test.ts`
**Commit:** `feat: add milestone countdown alert checking logic`

---

### Task 4.2: Write milestone countdown alert tests

**File:** `tests/data/milestone-alerts.test.ts`
**Why:** Verify milestone alerts fire at exact intervals, only once, skip past dates, respect disabled intervals.

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../../src/data/db';
import { SETTINGS_ID } from '../../src/lib/constants';
import { checkMilestoneCountdown, detectCapabilities } from '../../src/data/notification-service';
import * as dates from '../../src/lib/dates';

describe('milestone countdown alerts', () => {
  beforeEach(async () => {
    await db.settings.clear();
    await db.notificationAlerts.clear();
    await db.notificationFiredRecords.clear();

    detectCapabilities();
  });

  it('should fire 30-day countdown notification', async () => {
    vi.spyOn(dates, 'today').mockReturnValue('2026-03-18');
    vi.spyOn(dates, 'daysBetween').mockReturnValue(30);

    await db.settings.put({
      id: SETTINGS_ID,
      targetDate: '2026-04-17',
      targetDateLabel: 'Retirement',
      notificationPreferences: {
        masterEnabled: true,
        dailyOverspend: false,
        monthlyThresholds: [],
        milestoneIntervals: [
          { days: 30, enabled: true },
          { days: 7, enabled: true },
          { days: 1, enabled: true },
        ],
      },
    });

    await checkMilestoneCountdown();
    const alerts = await db.notificationAlerts.toArray();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].title).toBe('Retirement Countdown');
    expect(alerts[0].body).toContain('30 days');
  });

  it('should fire 1-day countdown with motivational message', async () => {
    vi.spyOn(dates, 'today').mockReturnValue('2026-04-16');
    vi.spyOn(dates, 'daysBetween').mockReturnValue(1);

    await db.settings.put({
      id: SETTINGS_ID,
      targetDate: '2026-04-17',
      targetDateLabel: 'Launch Day',
      notificationPreferences: {
        masterEnabled: true,
        dailyOverspend: false,
        monthlyThresholds: [],
        milestoneIntervals: [
          { days: 1, enabled: true },
        ],
      },
    });

    await checkMilestoneCountdown();
    const alerts = await db.notificationAlerts.toArray();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].body).toContain('Tomorrow is the day');
  });

  it('should fire each interval only once', async () => {
    vi.spyOn(dates, 'today').mockReturnValue('2026-03-18');
    vi.spyOn(dates, 'daysBetween').mockReturnValue(30);

    await db.settings.put({
      id: SETTINGS_ID,
      targetDate: '2026-04-17',
      targetDateLabel: 'Goal',
      notificationPreferences: {
        masterEnabled: true,
        dailyOverspend: false,
        monthlyThresholds: [],
        milestoneIntervals: [{ days: 30, enabled: true }],
      },
    });

    await checkMilestoneCountdown();
    await checkMilestoneCountdown(); // second call

    const alerts = await db.notificationAlerts.toArray();
    expect(alerts).toHaveLength(1);
  });

  it('should not fire for past target date', async () => {
    vi.spyOn(dates, 'today').mockReturnValue('2026-03-18');
    vi.spyOn(dates, 'daysBetween').mockReturnValue(-5);

    await db.settings.put({
      id: SETTINGS_ID,
      targetDate: '2026-03-13',
      targetDateLabel: 'Past Event',
      notificationPreferences: {
        masterEnabled: true,
        dailyOverspend: false,
        monthlyThresholds: [],
        milestoneIntervals: [{ days: 30, enabled: true }],
      },
    });

    await checkMilestoneCountdown();
    const alerts = await db.notificationAlerts.toArray();
    expect(alerts).toHaveLength(0);
  });

  it('should not fire for disabled intervals', async () => {
    vi.spyOn(dates, 'today').mockReturnValue('2026-03-18');
    vi.spyOn(dates, 'daysBetween').mockReturnValue(7);

    await db.settings.put({
      id: SETTINGS_ID,
      targetDate: '2026-03-25',
      targetDateLabel: 'Deadline',
      notificationPreferences: {
        masterEnabled: true,
        dailyOverspend: false,
        monthlyThresholds: [],
        milestoneIntervals: [{ days: 7, enabled: false }],
      },
    });

    await checkMilestoneCountdown();
    const alerts = await db.notificationAlerts.toArray();
    expect(alerts).toHaveLength(0);
  });

  it('should not fire when no target date configured', async () => {
    vi.spyOn(dates, 'today').mockReturnValue('2026-03-18');

    await db.settings.put({
      id: SETTINGS_ID,
      notificationPreferences: {
        masterEnabled: true,
        dailyOverspend: false,
        monthlyThresholds: [],
        milestoneIntervals: [{ days: 30, enabled: true }],
      },
    });

    await checkMilestoneCountdown();
    const alerts = await db.notificationAlerts.toArray();
    expect(alerts).toHaveLength(0);
  });

  it('should use default label when targetDateLabel is empty', async () => {
    vi.spyOn(dates, 'today').mockReturnValue('2026-03-18');
    vi.spyOn(dates, 'daysBetween').mockReturnValue(30);

    await db.settings.put({
      id: SETTINGS_ID,
      targetDate: '2026-04-17',
      notificationPreferences: {
        masterEnabled: true,
        dailyOverspend: false,
        monthlyThresholds: [],
        milestoneIntervals: [{ days: 30, enabled: true }],
      },
    });

    await checkMilestoneCountdown();
    const alerts = await db.notificationAlerts.toArray();
    expect(alerts[0].title).toBe('Your Milestone Countdown');
  });
});
```

**Run:** `npx vitest run tests/data/milestone-alerts.test.ts`
**Commit:** `test: add milestone countdown alert tests`

---

### Task 4.3: Wire milestone checks into app initialization

**File:** `src/App.tsx`
**Why:** Run milestone countdown and budget checks on app launch. Also increment session count.

Add a `useEffect` at the top level of the App component:

```tsx
import { useEffect } from 'react';
import { runAppLaunchChecks, incrementSessionCount, detectCapabilities } from './data/notification-service';

// Inside App component:
useEffect(() => {
  detectCapabilities();
  incrementSessionCount().catch(() => {});
  runAppLaunchChecks().catch(() => {});
}, []);

// Also re-run milestone check on visibility change (returning from background):
useEffect(() => {
  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      runAppLaunchChecks().catch(() => {});
    }
  }
  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, []);
```

**Test:** `npx vitest run tests/screens/app.test.tsx`
**Commit:** `feat: wire milestone and budget checks into app launch`

---

## Section 5: Badge Notification Management (Story 043)

### Task 5.1: Create badge management functions

**File:** `src/data/notification-service.ts`
**Why:** Manage app icon badge count based on active unacknowledged alerts.

Append to notification-service.ts:

```typescript
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
```

**Test:** `npx vitest run tests/data/badge-management.test.ts`
**Commit:** `feat: add badge notification management`

---

### Task 5.2: Write badge management tests

**File:** `tests/data/badge-management.test.ts`
**Why:** Verify badge increments on new alerts, clears on screen view, skips on unsupported.

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../../src/data/db';
import {
  updateBadgeCount,
  clearBadgeForScreen,
  getActiveAlertCount,
  detectCapabilities,
} from '../../src/data/notification-service';

describe('badge management', () => {
  let mockSetAppBadge: ReturnType<typeof vi.fn>;
  let mockClearAppBadge: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    await db.notificationAlerts.clear();
    await db.notificationFiredRecords.clear();

    mockSetAppBadge = vi.fn().mockResolvedValue(undefined);
    mockClearAppBadge = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(navigator, 'setAppBadge', {
      value: mockSetAppBadge,
      configurable: true,
    });
    Object.defineProperty(navigator, 'clearAppBadge', {
      value: mockClearAppBadge,
      configurable: true,
    });

    detectCapabilities();
  });

  it('should set badge count to number of active alerts', async () => {
    await db.notificationAlerts.bulkPut([
      {
        id: 'alert-1',
        type: 'budget-daily',
        title: 'Test 1',
        body: 'Test body',
        timestamp: '2026-03-18T00:00:00Z',
        dismissed: false,
        screen: 'budget',
      },
      {
        id: 'alert-2',
        type: 'milestone',
        title: 'Test 2',
        body: 'Test body',
        timestamp: '2026-03-18T00:00:00Z',
        dismissed: false,
        screen: 'dashboard',
      },
    ]);

    await updateBadgeCount();
    expect(mockSetAppBadge).toHaveBeenCalledWith(2);
  });

  it('should clear badge when no active alerts', async () => {
    await updateBadgeCount();
    expect(mockClearAppBadge).toHaveBeenCalled();
  });

  it('should dismiss alerts for budget screen and update badge', async () => {
    await db.notificationAlerts.bulkPut([
      {
        id: 'budget-alert',
        type: 'budget-daily',
        title: 'Budget',
        body: 'Over budget',
        timestamp: '2026-03-18T00:00:00Z',
        dismissed: false,
        screen: 'budget',
      },
      {
        id: 'milestone-alert',
        type: 'milestone',
        title: 'Milestone',
        body: '30 days',
        timestamp: '2026-03-18T00:00:00Z',
        dismissed: false,
        screen: 'dashboard',
      },
    ]);

    await clearBadgeForScreen('budget');

    const budgetAlert = await db.notificationAlerts.get('budget-alert');
    expect(budgetAlert?.dismissed).toBe(true);

    const milestoneAlert = await db.notificationAlerts.get('milestone-alert');
    expect(milestoneAlert?.dismissed).toBe(false);

    expect(mockSetAppBadge).toHaveBeenCalledWith(1);
  });

  it('should get accurate active alert count', async () => {
    await db.notificationAlerts.bulkPut([
      {
        id: 'active',
        type: 'budget-daily',
        title: 'Active',
        body: 'Active',
        timestamp: '2026-03-18T00:00:00Z',
        dismissed: false,
        screen: 'budget',
      },
      {
        id: 'dismissed',
        type: 'budget-monthly',
        title: 'Dismissed',
        body: 'Dismissed',
        timestamp: '2026-03-18T00:00:00Z',
        dismissed: true,
        screen: 'budget',
      },
    ]);

    const count = await getActiveAlertCount();
    expect(count).toBe(1);
  });

  it('should silently skip when badge API is not supported', async () => {
    // Remove badge API
    const desc = Object.getOwnPropertyDescriptor(navigator, 'setAppBadge');
    Object.defineProperty(navigator, 'setAppBadge', {
      value: undefined,
      configurable: true,
    });
    detectCapabilities();

    // Should not throw
    await expect(updateBadgeCount()).resolves.not.toThrow();

    // Restore
    if (desc) {
      Object.defineProperty(navigator, 'setAppBadge', desc);
    }
  });
});
```

**Run:** `npx vitest run tests/data/badge-management.test.ts`
**Commit:** `test: add badge management tests`

---

### Task 5.3: Wire badge clearing into screen navigation

**File:** `src/screens/budget/BudgetScreen.tsx`
**Why:** Clear budget-related badge count when user views budget screen.

Add to the BudgetScreen component:

```tsx
import { useEffect } from 'react';
import { clearBadgeForScreen } from '../../data/notification-service';

// Inside BudgetScreen component:
useEffect(() => {
  clearBadgeForScreen('budget').catch(() => {});
}, []);
```

**File:** `src/screens/dashboard/DashboardScreen.tsx`
**Why:** Clear milestone-related badge count when user views dashboard.

Add to the DashboardScreen component:

```tsx
import { useEffect } from 'react';
import { clearBadgeForScreen } from '../../data/notification-service';

// Inside DashboardScreen component:
useEffect(() => {
  clearBadgeForScreen('dashboard').catch(() => {});
}, []);
```

**Test:** `npx vitest run tests/screens/budget-screen.test.tsx tests/screens/dashboard-screen.test.tsx`
**Commit:** `feat: wire badge clearing into budget and dashboard screen navigation`

---

## Section 6: In-App Notification Fallback (Story 044)

### Task 6.1: Create useNotificationAlerts hook

**File:** `src/hooks/useNotificationAlerts.ts`
**Why:** Reactive hook for consuming active alerts in dashboard banners and navigation indicators.

```typescript
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import { dismissAlert } from '../data/notification-service';
import type { NotificationAlert } from '../lib/types';

export function useNotificationAlerts() {
  const alerts = useLiveQuery(
    () => db.notificationAlerts.toArray().then(
      all => all.filter(a => !a.dismissed)
    ),
    [],
    [] as NotificationAlert[]
  );

  const budgetAlertCount = alerts.filter(a => a.screen === 'budget').length;
  const dashboardAlertCount = alerts.filter(a => a.screen === 'dashboard').length;

  return {
    alerts,
    budgetAlertCount,
    dashboardAlertCount,
    totalCount: alerts.length,
    dismiss: async (alertId: string) => {
      await dismissAlert(alertId);
    },
  };
}
```

**Test:** `npx vitest run tests/hooks/useNotificationAlerts.test.ts`
**Commit:** `feat: add useNotificationAlerts hook`

---

### Task 6.2: Create NotificationBanner component

**File:** `src/components/NotificationBanner.tsx`
**Why:** Dismissible banner displayed at top of dashboard when there are active alerts.

```tsx
import type { NotificationAlert } from '../lib/types';

interface NotificationBannerProps {
  alerts: NotificationAlert[];
  onDismiss: (alertId: string) => void;
}

export function NotificationBanner({ alerts, onDismiss }: NotificationBannerProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {alerts.map(alert => (
        <div
          key={alert.id}
          className={`flex items-start justify-between rounded-lg border p-3 ${
            alert.type === 'milestone'
              ? 'border-blue-200 bg-blue-50'
              : 'border-amber-200 bg-amber-50'
          }`}
          role="alert"
        >
          <div className="min-w-0 flex-1">
            <p
              className={`text-sm font-semibold ${
                alert.type === 'milestone'
                  ? 'text-blue-800'
                  : 'text-amber-800'
              }`}
            >
              {alert.title}
            </p>
            <p
              className={`mt-0.5 text-sm ${
                alert.type === 'milestone'
                  ? 'text-blue-700'
                  : 'text-amber-700'
              }`}
            >
              {alert.body}
            </p>
          </div>
          <button
            onClick={() => onDismiss(alert.id)}
            className={`ml-2 flex-shrink-0 rounded p-1 ${
              alert.type === 'milestone'
                ? 'text-blue-400 hover:bg-blue-100 hover:text-blue-600'
                : 'text-amber-400 hover:bg-amber-100 hover:text-amber-600'
            }`}
            aria-label={`Dismiss ${alert.title}`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
```

**Test:** `npx vitest run tests/screens/notification-banner.test.tsx`
**Commit:** `feat: add NotificationBanner component`

---

### Task 6.3: Write NotificationBanner component tests

**File:** `tests/screens/notification-banner.test.tsx`
**Why:** Verify banners render for each alert type, dismiss works, and empty state hides banner.

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationBanner } from '../../src/components/NotificationBanner';
import type { NotificationAlert } from '../../src/lib/types';

const budgetAlert: NotificationAlert = {
  id: 'budget-daily-2026-03-18',
  type: 'budget-daily',
  title: 'Daily Budget Exceeded',
  body: "You've spent $5.00 over today's budget.",
  timestamp: '2026-03-18T12:00:00Z',
  dismissed: false,
  screen: 'budget',
};

const milestoneAlert: NotificationAlert = {
  id: 'milestone-30-2026-04-17',
  type: 'milestone',
  title: 'Retirement Countdown',
  body: '30 days until Retirement! Stay focused.',
  timestamp: '2026-03-18T08:00:00Z',
  dismissed: false,
  screen: 'dashboard',
};

describe('NotificationBanner', () => {
  it('should render nothing when there are no alerts', () => {
    const { container } = render(
      <NotificationBanner alerts={[]} onDismiss={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render budget alert with amber styling', () => {
    render(
      <NotificationBanner alerts={[budgetAlert]} onDismiss={vi.fn()} />
    );
    expect(screen.getByText('Daily Budget Exceeded')).toBeInTheDocument();
    expect(screen.getByText("You've spent $5.00 over today's budget.")).toBeInTheDocument();
  });

  it('should render milestone alert with blue styling', () => {
    render(
      <NotificationBanner alerts={[milestoneAlert]} onDismiss={vi.fn()} />
    );
    expect(screen.getByText('Retirement Countdown')).toBeInTheDocument();
  });

  it('should render multiple banners simultaneously', () => {
    render(
      <NotificationBanner
        alerts={[budgetAlert, milestoneAlert]}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getAllByRole('alert')).toHaveLength(2);
  });

  it('should call onDismiss with alert id when dismiss button clicked', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();

    render(
      <NotificationBanner alerts={[budgetAlert]} onDismiss={onDismiss} />
    );

    await user.click(
      screen.getByLabelText('Dismiss Daily Budget Exceeded')
    );
    expect(onDismiss).toHaveBeenCalledWith('budget-daily-2026-03-18');
  });
});
```

**Run:** `npx vitest run tests/screens/notification-banner.test.tsx`
**Commit:** `test: add NotificationBanner component tests`

---

### Task 6.4: Integrate NotificationBanner into DashboardScreen

**File:** `src/screens/dashboard/DashboardScreen.tsx`
**Why:** Show in-app fallback banners at top of dashboard when push is unavailable.

Add inside the DashboardScreen component, before the countdown widget:

```tsx
import { useNotificationAlerts } from '../../hooks/useNotificationAlerts';
import { NotificationBanner } from '../../components/NotificationBanner';
import { isPushAvailable } from '../../data/notification-service';

// Inside component:
const { alerts, dismiss } = useNotificationAlerts();

// In JSX, at the top of the dashboard content:
{!isPushAvailable() && (
  <NotificationBanner alerts={alerts} onDismiss={dismiss} />
)}
```

**Test:** `npx vitest run tests/screens/dashboard-screen.test.tsx`
**Commit:** `feat: integrate notification banners into dashboard`

---

### Task 6.5: Add navigation alert indicators to BottomNav

**File:** `src/components/BottomNav.tsx`
**Why:** Show colored dot indicators on Budget and Dashboard nav items when there are active alerts.

Add the alert counts to the BottomNav:

```tsx
import { useNotificationAlerts } from '../hooks/useNotificationAlerts';

// Inside BottomNav component:
const { budgetAlertCount, dashboardAlertCount } = useNotificationAlerts();

// For each nav item, add a badge indicator conditionally:
// Dashboard nav item:
{dashboardAlertCount > 0 && (
  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-blue-500" />
)}

// Budget nav item:
{budgetAlertCount > 0 && (
  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-500" />
)}
```

Ensure nav item containers have `className="relative"` for the absolute positioning to work.

**Test:** `npx vitest run tests/screens/bottom-nav.test.tsx`
**Commit:** `feat: add alert indicators to navigation items`

---

### Task 6.6: Write useNotificationAlerts hook tests

**File:** `tests/hooks/useNotificationAlerts.test.ts`
**Why:** Verify hook returns correct active alerts and counts.

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { db } from '../../src/data/db';
import { useNotificationAlerts } from '../../src/hooks/useNotificationAlerts';

describe('useNotificationAlerts', () => {
  beforeEach(async () => {
    await db.notificationAlerts.clear();
  });

  it('should return empty alerts when no alerts exist', async () => {
    const { result } = renderHook(() => useNotificationAlerts());

    await waitFor(() => {
      expect(result.current.totalCount).toBe(0);
    });
    expect(result.current.alerts).toHaveLength(0);
    expect(result.current.budgetAlertCount).toBe(0);
    expect(result.current.dashboardAlertCount).toBe(0);
  });

  it('should return only non-dismissed alerts', async () => {
    await db.notificationAlerts.bulkPut([
      {
        id: 'active-1',
        type: 'budget-daily',
        title: 'Active',
        body: 'Active alert',
        timestamp: '2026-03-18T00:00:00Z',
        dismissed: false,
        screen: 'budget',
      },
      {
        id: 'dismissed-1',
        type: 'budget-monthly',
        title: 'Dismissed',
        body: 'Dismissed alert',
        timestamp: '2026-03-18T00:00:00Z',
        dismissed: true,
        screen: 'budget',
      },
    ]);

    const { result } = renderHook(() => useNotificationAlerts());

    await waitFor(() => {
      expect(result.current.totalCount).toBe(1);
    });
  });

  it('should separate budget and dashboard alert counts', async () => {
    await db.notificationAlerts.bulkPut([
      {
        id: 'budget-1',
        type: 'budget-daily',
        title: 'Budget',
        body: 'Budget alert',
        timestamp: '2026-03-18T00:00:00Z',
        dismissed: false,
        screen: 'budget',
      },
      {
        id: 'milestone-1',
        type: 'milestone',
        title: 'Milestone',
        body: 'Milestone alert',
        timestamp: '2026-03-18T00:00:00Z',
        dismissed: false,
        screen: 'dashboard',
      },
    ]);

    const { result } = renderHook(() => useNotificationAlerts());

    await waitFor(() => {
      expect(result.current.budgetAlertCount).toBe(1);
      expect(result.current.dashboardAlertCount).toBe(1);
      expect(result.current.totalCount).toBe(2);
    });
  });
});
```

**Run:** `npx vitest run tests/hooks/useNotificationAlerts.test.ts`
**Commit:** `test: add useNotificationAlerts hook tests`

---

## Section 7: Notification Threshold Settings UI (Story 049)

### Task 7.1: Create NotificationSettings component

**File:** `src/screens/settings/NotificationSettings.tsx`
**Why:** Master toggle, budget alert config, milestone alert config with auto-save. Renders permission state.

```tsx
import { useState, useCallback } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { getCapabilities, shouldShowPermissionPrompt } from '../../data/notification-service';
import type { NotificationPreferences, ThresholdConfig, IntervalConfig } from '../../data/db';

const DEFAULT_PREFS: NotificationPreferences = {
  masterEnabled: true,
  dailyOverspend: true,
  monthlyThresholds: [
    { percentage: 80, enabled: true },
    { percentage: 90, enabled: true },
    { percentage: 100, enabled: true },
  ],
  milestoneIntervals: [
    { days: 30, enabled: true },
    { days: 7, enabled: true },
    { days: 1, enabled: true },
  ],
};

export function NotificationSettings() {
  const { settings, updateSettings } = useSettings();
  const capabilities = getCapabilities();
  const prefs = settings?.notificationPreferences ?? DEFAULT_PREFS;

  const [newThreshold, setNewThreshold] = useState('');
  const [newInterval, setNewInterval] = useState('');
  const [thresholdError, setThresholdError] = useState('');
  const [intervalError, setIntervalError] = useState('');

  const savePrefs = useCallback(
    async (updated: NotificationPreferences) => {
      await updateSettings({ notificationPreferences: updated });
    },
    [updateSettings]
  );

  function handleMasterToggle() {
    savePrefs({ ...prefs, masterEnabled: !prefs.masterEnabled });
  }

  function handleDailyOverspendToggle() {
    savePrefs({ ...prefs, dailyOverspend: !prefs.dailyOverspend });
  }

  function handleThresholdToggle(index: number) {
    const updated = [...prefs.monthlyThresholds];
    updated[index] = { ...updated[index], enabled: !updated[index].enabled };
    savePrefs({ ...prefs, monthlyThresholds: updated });
  }

  function handleRemoveThreshold(index: number) {
    const updated = prefs.monthlyThresholds.filter((_, i) => i !== index);
    savePrefs({ ...prefs, monthlyThresholds: updated });
  }

  function handleAddThreshold() {
    setThresholdError('');
    const value = parseInt(newThreshold, 10);
    if (isNaN(value) || value < 1 || value > 200) {
      setThresholdError('Percentage must be between 1 and 200.');
      return;
    }
    if (prefs.monthlyThresholds.some(t => t.percentage === value)) {
      setThresholdError('This threshold already exists.');
      return;
    }
    const updated = [...prefs.monthlyThresholds, { percentage: value, enabled: true }];
    updated.sort((a, b) => a.percentage - b.percentage);
    savePrefs({ ...prefs, monthlyThresholds: updated });
    setNewThreshold('');
  }

  function handleIntervalToggle(index: number) {
    const updated = [...prefs.milestoneIntervals];
    updated[index] = { ...updated[index], enabled: !updated[index].enabled };
    savePrefs({ ...prefs, milestoneIntervals: updated });
  }

  function handleRemoveInterval(index: number) {
    const updated = prefs.milestoneIntervals.filter((_, i) => i !== index);
    savePrefs({ ...prefs, milestoneIntervals: updated });
  }

  function handleAddInterval() {
    setIntervalError('');
    const value = parseInt(newInterval, 10);
    if (isNaN(value) || value < 1) {
      setIntervalError('Interval must be a positive whole number.');
      return;
    }
    if (prefs.milestoneIntervals.some(i => i.days === value)) {
      setIntervalError('This interval already exists.');
      return;
    }
    const updated = [...prefs.milestoneIntervals, { days: value, enabled: true }];
    updated.sort((a, b) => b.days - a.days);
    savePrefs({ ...prefs, milestoneIntervals: updated });
    setNewInterval('');
  }

  const isDisabled = !prefs.masterEnabled;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={prefs.masterEnabled}
            onChange={handleMasterToggle}
            className="peer sr-only"
            aria-label="Enable all notifications"
          />
          <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white" />
        </label>
      </div>

      {/* Permission state info */}
      {capabilities.permissionState === 'denied' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-800">
            Notification permission has been denied. To receive push
            notifications, enable them in your browser settings for this site.
            In-app alerts will still appear on the dashboard.
          </p>
        </div>
      )}
      {capabilities.permissionState === 'default' && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-sm text-blue-800">
            Notification permission has not been requested yet. You will be
            prompted to enable notifications after using the app.
          </p>
        </div>
      )}
      {capabilities.permissionState === 'unsupported' && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-sm text-gray-600">
            Push notifications are not supported in this browser. Alerts will
            appear as banners on the dashboard instead.
          </p>
        </div>
      )}

      {/* Budget Alerts */}
      <div className={isDisabled ? 'opacity-50 pointer-events-none' : ''}>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Budget Alerts
        </h3>

        {/* Daily Overspend */}
        <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
          <div>
            <p className="text-sm font-medium text-gray-900">
              Daily Overspend
            </p>
            <p className="text-xs text-gray-500">
              Alert when daily spending exceeds allowance
            </p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={prefs.dailyOverspend}
              onChange={handleDailyOverspendToggle}
              className="peer sr-only"
              aria-label="Enable daily overspend alerts"
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white" />
          </label>
        </div>

        {/* Monthly Thresholds */}
        <div className="mt-3 space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Monthly Thresholds
          </p>
          {prefs.monthlyThresholds.map((threshold, index) => (
            <div
              key={threshold.percentage}
              className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
            >
              <span className="text-sm text-gray-900">
                {threshold.percentage}% of monthly budget
              </span>
              <div className="flex items-center gap-2">
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={threshold.enabled}
                    onChange={() => handleThresholdToggle(index)}
                    className="peer sr-only"
                    aria-label={`Enable ${threshold.percentage}% threshold`}
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white" />
                </label>
                <button
                  onClick={() => handleRemoveThreshold(index)}
                  className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                  aria-label={`Remove ${threshold.percentage}% threshold`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          {/* Add threshold */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="200"
              value={newThreshold}
              onChange={e => setNewThreshold(e.target.value)}
              placeholder="Add %"
              className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="New threshold percentage"
            />
            <button
              onClick={handleAddThreshold}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add
            </button>
          </div>
          {thresholdError && (
            <p className="text-xs text-red-600" role="alert">{thresholdError}</p>
          )}
        </div>
      </div>

      {/* Milestone Alerts */}
      <div className={isDisabled ? 'opacity-50 pointer-events-none' : ''}>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Milestone Alerts
        </h3>

        <div className="space-y-2">
          {prefs.milestoneIntervals.map((interval, index) => (
            <div
              key={interval.days}
              className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
            >
              <span className="text-sm text-gray-900">
                {interval.days} {interval.days === 1 ? 'day' : 'days'} before
              </span>
              <div className="flex items-center gap-2">
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={interval.enabled}
                    onChange={() => handleIntervalToggle(index)}
                    className="peer sr-only"
                    aria-label={`Enable ${interval.days}-day interval`}
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white" />
                </label>
                <button
                  onClick={() => handleRemoveInterval(index)}
                  className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                  aria-label={`Remove ${interval.days}-day interval`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          {/* Add interval */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              value={newInterval}
              onChange={e => setNewInterval(e.target.value)}
              placeholder="Days"
              className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="New milestone interval in days"
            />
            <button
              onClick={handleAddInterval}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add
            </button>
          </div>
          {intervalError && (
            <p className="text-xs text-red-600" role="alert">{intervalError}</p>
          )}
        </div>
      </div>
    </section>
  );
}
```

**Test:** `npx vitest run tests/screens/notification-settings.test.tsx`
**Commit:** `feat: add NotificationSettings component`

---

### Task 7.2: Write NotificationSettings component tests

**File:** `tests/screens/notification-settings.test.tsx`
**Why:** Verify default state, toggle behavior, add/remove thresholds, validation, permission state display.

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationSettings } from '../../src/screens/settings/NotificationSettings';
import { db } from '../../src/data/db';
import { SETTINGS_ID } from '../../src/lib/constants';
import { detectCapabilities } from '../../src/data/notification-service';

// Mock useSettings hook
vi.mock('../../src/hooks/useSettings', () => ({
  useSettings: () => {
    const [settings, setSettings] = useState(null);
    useEffect(() => {
      db.settings.get(SETTINGS_ID).then(setSettings);
    }, []);
    return {
      settings,
      updateSettings: async (updates: Record<string, unknown>) => {
        await db.settings.update(SETTINGS_ID, updates);
        const updated = await db.settings.get(SETTINGS_ID);
        setSettings(updated ?? null);
      },
    };
  },
}));

import { useState, useEffect } from 'react';

describe('NotificationSettings', () => {
  beforeEach(async () => {
    await db.settings.clear();
    await db.settings.put({
      id: SETTINGS_ID,
      notificationPreferences: {
        masterEnabled: true,
        dailyOverspend: true,
        monthlyThresholds: [
          { percentage: 80, enabled: true },
          { percentage: 90, enabled: true },
          { percentage: 100, enabled: true },
        ],
        milestoneIntervals: [
          { days: 30, enabled: true },
          { days: 7, enabled: true },
          { days: 1, enabled: true },
        ],
      },
    });

    vi.stubGlobal('Notification', { permission: 'default' });
    detectCapabilities();
  });

  it('should render the notification settings section', async () => {
    render(<NotificationSettings />);
    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });
    expect(screen.getByText('Budget Alerts')).toBeInTheDocument();
    expect(screen.getByText('Milestone Alerts')).toBeInTheDocument();
  });

  it('should display default thresholds', async () => {
    render(<NotificationSettings />);
    await waitFor(() => {
      expect(screen.getByText('80% of monthly budget')).toBeInTheDocument();
    });
    expect(screen.getByText('90% of monthly budget')).toBeInTheDocument();
    expect(screen.getByText('100% of monthly budget')).toBeInTheDocument();
  });

  it('should display default milestone intervals', async () => {
    render(<NotificationSettings />);
    await waitFor(() => {
      expect(screen.getByText('30 days before')).toBeInTheDocument();
    });
    expect(screen.getByText('7 days before')).toBeInTheDocument();
    expect(screen.getByText('1 day before')).toBeInTheDocument();
  });

  it('should reject invalid threshold percentage', async () => {
    const user = userEvent.setup();
    render(<NotificationSettings />);

    await waitFor(() => {
      expect(screen.getByLabelText('New threshold percentage')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('New threshold percentage'), '250');
    await user.click(screen.getAllByText('Add')[0]);

    expect(screen.getByText('Percentage must be between 1 and 200.')).toBeInTheDocument();
  });

  it('should reject duplicate threshold', async () => {
    const user = userEvent.setup();
    render(<NotificationSettings />);

    await waitFor(() => {
      expect(screen.getByLabelText('New threshold percentage')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('New threshold percentage'), '80');
    await user.click(screen.getAllByText('Add')[0]);

    expect(screen.getByText('This threshold already exists.')).toBeInTheDocument();
  });

  it('should show denied permission message', async () => {
    vi.stubGlobal('Notification', { permission: 'denied' });
    detectCapabilities();

    render(<NotificationSettings />);
    await waitFor(() => {
      expect(
        screen.getByText(/Notification permission has been denied/)
      ).toBeInTheDocument();
    });
  });
});
```

**Run:** `npx vitest run tests/screens/notification-settings.test.tsx`
**Commit:** `test: add NotificationSettings component tests`

---

### Task 7.3: Integrate NotificationSettings into SettingsScreen

**File:** `src/screens/settings/SettingsScreen.tsx`
**Why:** Add the notification settings section to the existing settings screen.

Add the import and render the component below existing settings sections:

```tsx
import { NotificationSettings } from './NotificationSettings';

// In the SettingsScreen JSX, after existing sections:
<div className="mt-8 border-t border-gray-200 pt-8">
  <NotificationSettings />
</div>
```

**Test:** `npx vitest run tests/screens/settings-screen.test.tsx`
**Commit:** `feat: integrate NotificationSettings into settings screen`

---

## Section 8: Data Export Service + UI (Story 045)

### Task 8.1: Create app version constant

**File:** `src/lib/constants.ts`
**Why:** Build-time constant for export metadata.

Append to constants.ts:

```typescript
export const APP_VERSION = '1.0.0';
export const SCHEMA_VERSION = 2; // matches Dexie schema version
```

**Commit:** `feat: add app version and schema version constants`

---

### Task 8.2: Create data export service

**File:** `src/data/export-service.ts`
**Why:** Read all IndexedDB stores, package with metadata, trigger file download.

```typescript
import { db } from './db';
import { APP_VERSION, SCHEMA_VERSION } from '../lib/constants';
import { today } from '../lib/dates';
import type { ExportData } from '../lib/types';

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
```

**Test:** `npx vitest run tests/data/export-service.test.ts`
**Commit:** `feat: add data export service`

---

### Task 8.3: Write data export service tests

**File:** `tests/data/export-service.test.ts`
**Why:** Verify all stores included, metadata correct, empty stores produce empty arrays.

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../../src/data/db';
import { SETTINGS_ID } from '../../src/lib/constants';
import { exportAllData } from '../../src/data/export-service';

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
```

**Run:** `npx vitest run tests/data/export-service.test.ts`
**Commit:** `test: add data export service tests`

---

### Task 8.4: Create ExportButton component

**File:** `src/screens/settings/ExportButton.tsx`
**Why:** Settings screen button that triggers export with loading/success/error states.

```tsx
import { useState } from 'react';
import { exportAllData, downloadExportFile } from '../../data/export-service';

export function ExportButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function handleExport() {
    setStatus('loading');
    try {
      const data = await exportAllData();
      downloadExportFile(data);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }

  return (
    <div>
      <button
        onClick={handleExport}
        disabled={status === 'loading'}
        className="w-full rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        {status === 'loading' ? 'Exporting...' : 'Export Data'}
      </button>
      {status === 'success' && (
        <p className="mt-2 text-sm text-green-600">
          Data exported successfully.
        </p>
      )}
      {status === 'error' && (
        <p className="mt-2 text-sm text-red-600">
          Export failed. Please try again.
        </p>
      )}
    </div>
  );
}
```

**Test:** `npx vitest run tests/screens/export-button.test.tsx`
**Commit:** `feat: add ExportButton component`

---

### Task 8.5: Write ExportButton component tests

**File:** `tests/screens/export-button.test.tsx`
**Why:** Verify button states and user feedback.

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportButton } from '../../src/screens/settings/ExportButton';

vi.mock('../../src/data/export-service', () => ({
  exportAllData: vi.fn(),
  downloadExportFile: vi.fn(),
}));

import { exportAllData, downloadExportFile } from '../../src/data/export-service';

describe('ExportButton', () => {
  it('should render export button', () => {
    render(<ExportButton />);
    expect(screen.getByText('Export Data')).toBeInTheDocument();
  });

  it('should show loading state during export', async () => {
    const user = userEvent.setup();
    (exportAllData as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ metadata: {}, data: {} }), 100))
    );
    (downloadExportFile as ReturnType<typeof vi.fn>).mockImplementation(() => {});

    render(<ExportButton />);
    await user.click(screen.getByText('Export Data'));

    expect(screen.getByText('Exporting...')).toBeInTheDocument();
  });

  it('should show success message after export', async () => {
    const user = userEvent.setup();
    (exportAllData as ReturnType<typeof vi.fn>).mockResolvedValue({ metadata: {}, data: {} });
    (downloadExportFile as ReturnType<typeof vi.fn>).mockImplementation(() => {});

    render(<ExportButton />);
    await user.click(screen.getByText('Export Data'));

    await waitFor(() => {
      expect(screen.getByText('Data exported successfully.')).toBeInTheDocument();
    });
  });

  it('should show error message on export failure', async () => {
    const user = userEvent.setup();
    (exportAllData as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB read failed'));

    render(<ExportButton />);
    await user.click(screen.getByText('Export Data'));

    await waitFor(() => {
      expect(screen.getByText('Export failed. Please try again.')).toBeInTheDocument();
    });
  });
});
```

**Run:** `npx vitest run tests/screens/export-button.test.tsx`
**Commit:** `test: add ExportButton component tests`

---

## Section 9: Data Import Service + UI (Story 046)

### Task 9.1: Create data import validation service

**File:** `src/data/import-service.ts`
**Why:** Validate import file structure, schema version compatibility, and data integrity before writing.

```typescript
import { db } from './db';
import { SCHEMA_VERSION } from '../lib/constants';
import type { ExportData } from '../lib/types';

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

    // Also clear notification stores
    await db.notificationAlerts.clear();
    await db.notificationFiredRecords.clear();

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
```

**Test:** `npx vitest run tests/data/import-service.test.ts`
**Commit:** `feat: add data import validation and write service`

---

### Task 9.2: Write data import service tests

**File:** `tests/data/import-service.test.ts`
**Why:** Verify validation rejects invalid files, accepts valid exports, import replaces data, rollback on failure.

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/data/db';
import { SETTINGS_ID, SCHEMA_VERSION } from '../../src/lib/constants';
import { validateImportFile, importData } from '../../src/data/import-service';
import type { ExportData } from '../../src/lib/types';

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
    await db.notificationAlerts.clear();
    await db.notificationFiredRecords.clear();

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

  it('should clear notification stores on import', async () => {
    await db.notificationAlerts.put({
      id: 'old-alert',
      type: 'budget-daily',
      title: 'Old',
      body: 'Old alert',
      timestamp: '2026-03-18T00:00:00Z',
      dismissed: false,
      screen: 'budget',
    });

    const exportData = makeValidExport();
    await importData(exportData);

    const alerts = await db.notificationAlerts.toArray();
    expect(alerts).toHaveLength(0);
  });
});
```

**Run:** `npx vitest run tests/data/import-service.test.ts`
**Commit:** `test: add data import service tests`

---

### Task 9.3: Create ImportButton component

**File:** `src/screens/settings/ImportButton.tsx`
**Why:** File picker with validation, confirmation dialog, and import execution.

```tsx
import { useState, useRef } from 'react';
import {
  validateImportFile,
  importData,
  readFileAsText,
} from '../../data/import-service';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import type { ExportData } from '../../lib/types';

export function ImportButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'validating' | 'confirming' | 'importing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [validatedData, setValidatedData] = useState<ExportData | null>(null);

  function handleButtonClick() {
    fileInputRef.current?.click();
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus('validating');
    setErrorMessage('');

    try {
      const content = await readFileAsText(file);
      const result = validateImportFile(content);

      if (!result.valid || !result.data) {
        setStatus('error');
        setErrorMessage(result.error || 'Invalid file.');
        return;
      }

      setValidatedData(result.data);
      setStatus('confirming');
    } catch {
      setStatus('error');
      setErrorMessage('Failed to read the selected file.');
    }

    // Reset file input so the same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleConfirmImport() {
    if (!validatedData) return;

    setStatus('importing');
    try {
      await importData(validatedData);
      setStatus('success');
      // Reload the app to reflect imported data
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      setStatus('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'Import failed.'
      );
    }
  }

  function handleCancelImport() {
    setValidatedData(null);
    setStatus('idle');
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
        aria-label="Select import file"
      />

      <button
        onClick={handleButtonClick}
        disabled={status === 'validating' || status === 'importing'}
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {status === 'validating'
          ? 'Validating...'
          : status === 'importing'
            ? 'Importing...'
            : 'Import Data'}
      </button>

      {status === 'success' && (
        <p className="mt-2 text-sm text-green-600">
          Data imported successfully. Reloading...
        </p>
      )}

      {status === 'error' && (
        <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
      )}

      {status === 'confirming' && validatedData && (
        <ConfirmDialog
          title="Replace All Data?"
          message={`This will replace ALL current data in the app with data from the backup exported on ${new Date(validatedData.metadata.exportDate).toLocaleDateString()}. This action cannot be undone. Schema version: ${validatedData.metadata.schemaVersion}.`}
          confirmLabel="Import and Replace"
          cancelLabel="Cancel"
          onConfirm={handleConfirmImport}
          onCancel={handleCancelImport}
          variant="danger"
        />
      )}
    </div>
  );
}
```

**Test:** `npx vitest run tests/screens/import-button.test.tsx`
**Commit:** `feat: add ImportButton component`

---

### Task 9.4: Write ImportButton component tests

**File:** `tests/screens/import-button.test.tsx`
**Why:** Verify file selection triggers validation, confirmation shows, cancel preserves data.

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportButton } from '../../src/screens/settings/ImportButton';

vi.mock('../../src/data/import-service', () => ({
  validateImportFile: vi.fn(),
  importData: vi.fn(),
  readFileAsText: vi.fn(),
}));

vi.mock('../../src/components/ConfirmDialog', () => ({
  ConfirmDialog: ({
    title,
    onConfirm,
    onCancel,
  }: {
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant: string;
  }) => (
    <div data-testid="confirm-dialog">
      <p>{title}</p>
      <button onClick={onConfirm}>Import and Replace</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

import {
  validateImportFile,
  importData,
  readFileAsText,
} from '../../src/data/import-service';

describe('ImportButton', () => {
  it('should render import button', () => {
    render(<ImportButton />);
    expect(screen.getByText('Import Data')).toBeInTheDocument();
  });

  it('should show error for invalid file', async () => {
    const user = userEvent.setup();
    (readFileAsText as ReturnType<typeof vi.fn>).mockResolvedValue('{}');
    (validateImportFile as ReturnType<typeof vi.fn>).mockReturnValue({
      valid: false,
      error: 'File is not a valid My Life App export.',
    });

    render(<ImportButton />);

    const file = new File(['{}'], 'bad.json', { type: 'application/json' });
    const input = screen.getByLabelText('Select import file');
    await user.upload(input, file);

    await waitFor(() => {
      expect(
        screen.getByText('File is not a valid My Life App export.')
      ).toBeInTheDocument();
    });
  });

  it('should show confirmation dialog for valid file', async () => {
    const user = userEvent.setup();
    const validData = {
      metadata: { exportDate: '2026-03-18T00:00:00Z', appVersion: '1.0.0', schemaVersion: 2 },
      data: { settings: [], budgetMonths: [], expenses: [], goals: [], healthRoutines: [], healthLogEntries: [] },
    };
    (readFileAsText as ReturnType<typeof vi.fn>).mockResolvedValue(
      JSON.stringify(validData)
    );
    (validateImportFile as ReturnType<typeof vi.fn>).mockReturnValue({
      valid: true,
      data: validData,
    });

    render(<ImportButton />);

    const file = new File([JSON.stringify(validData)], 'backup.json', {
      type: 'application/json',
    });
    const input = screen.getByLabelText('Select import file');
    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    });
  });

  it('should cancel import and return to idle', async () => {
    const user = userEvent.setup();
    const validData = {
      metadata: { exportDate: '2026-03-18T00:00:00Z', appVersion: '1.0.0', schemaVersion: 2 },
      data: { settings: [], budgetMonths: [], expenses: [], goals: [], healthRoutines: [], healthLogEntries: [] },
    };
    (readFileAsText as ReturnType<typeof vi.fn>).mockResolvedValue(
      JSON.stringify(validData)
    );
    (validateImportFile as ReturnType<typeof vi.fn>).mockReturnValue({
      valid: true,
      data: validData,
    });

    render(<ImportButton />);

    const file = new File([JSON.stringify(validData)], 'backup.json', {
      type: 'application/json',
    });
    const input = screen.getByLabelText('Select import file');
    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Cancel'));

    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
    expect(importData).not.toHaveBeenCalled();
  });
});
```

**Run:** `npx vitest run tests/screens/import-button.test.tsx`
**Commit:** `test: add ImportButton component tests`

---

### Task 9.5: Integrate Export and Import buttons into SettingsScreen

**File:** `src/screens/settings/SettingsScreen.tsx`
**Why:** Add data management section to settings.

Add below the notification settings section:

```tsx
import { ExportButton } from './ExportButton';
import { ImportButton } from './ImportButton';

// In SettingsScreen JSX:
<div className="mt-8 border-t border-gray-200 pt-8">
  <h2 className="mb-4 text-lg font-semibold text-gray-900">Data Management</h2>
  <div className="space-y-3">
    <ExportButton />
    <ImportButton />
  </div>
</div>
```

**Test:** `npx vitest run tests/screens/settings-screen.test.tsx`
**Commit:** `feat: integrate export and import buttons into settings screen`

---

## Section 10: Design Tokens + Shared Component Polish (Story 048)

### Task 10.1: Establish design tokens in Tailwind config

**File:** `tailwind.config.ts`
**Why:** Single source of truth for spacing, colors, and typography. Ensures consistency enforced by config rather than manual checks.

Update the existing tailwind.config.ts to include custom design tokens:

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // App-specific semantic colors
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
      },
      spacing: {
        // App-specific spacing tokens
        'card': '1rem',         // 16px - internal card padding
        'card-gap': '0.75rem',  // 12px - gap between cards
        'section': '1.5rem',    // 24px - gap between sections
        'screen-x': '1rem',     // 16px - horizontal screen padding
        'screen-y': '1.5rem',   // 24px - vertical screen padding
      },
      fontSize: {
        // App typography scale
        'heading-1': ['1.5rem', { lineHeight: '2rem', fontWeight: '700' }],
        'heading-2': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],
        'heading-3': ['1rem', { lineHeight: '1.5rem', fontWeight: '600' }],
        'body': ['0.875rem', { lineHeight: '1.25rem' }],
        'caption': ['0.75rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        'card': '0.75rem',      // 12px - card corner radius
        'button': '0.5rem',     // 8px - button corner radius
        'input': '0.5rem',      // 8px - input corner radius
      },
      transitionDuration: {
        'fast': '150ms',
        'normal': '200ms',
        'slow': '300ms',
      },
    },
  },
  plugins: [],
};

export default config;
```

**Commit:** `feat: establish design tokens in Tailwind config`

---

### Task 10.2: Add motion-safe utility and CSS custom properties

**File:** `src/index.css`
**Why:** Global styles for reduced-motion and CSS custom properties that complement Tailwind tokens.

Add to the global CSS file (append, do not replace existing Tailwind directives):

```css
/* --- Motion preferences --- */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* --- Shared animation classes --- */
@media (prefers-reduced-motion: no-preference) {
  .animate-fade-in {
    animation: fadeIn 200ms ease-out;
  }

  .animate-slide-up {
    animation: slideUp 200ms ease-out;
  }

  .animate-slide-down {
    animation: slideDown 200ms ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}
```

**Commit:** `feat: add motion-safe animation utilities and reduced-motion support`

---

### Task 10.3: Enhance EmptyState shared component

**File:** `src/components/EmptyState.tsx`
**Why:** Standardize empty state display with icon, message, and call-to-action across all screens.

```tsx
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
      {icon && (
        <div className="mb-4 text-gray-300">
          {icon}
        </div>
      )}
      <h3 className="text-heading-3 text-gray-900">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-body text-gray-500">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 rounded-button bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors duration-fast"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
```

**Test:** `npx vitest run tests/components/empty-state.test.tsx`
**Commit:** `feat: enhance EmptyState component with design tokens`

---

### Task 10.4: Enhance LoadingSpinner shared component

**File:** `src/components/LoadingSpinner.tsx`
**Why:** Standardize loading indicator with consistent sizing and delay to prevent flash.

```tsx
import { useState, useEffect } from 'react';

interface LoadingSpinnerProps {
  /** Delay in ms before showing the spinner (prevents flash for fast loads) */
  delay?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Optional label for accessibility */
  label?: string;
}

const SIZE_CLASSES = {
  sm: 'h-5 w-5',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export function LoadingSpinner({
  delay = 100,
  size = 'md',
  label = 'Loading...',
}: LoadingSpinnerProps) {
  const [visible, setVisible] = useState(delay === 0);

  useEffect(() => {
    if (delay === 0) return;
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!visible) return null;

  return (
    <div className="flex items-center justify-center py-12" role="status" aria-label={label}>
      <svg
        className={`${SIZE_CLASSES[size]} animate-spin text-primary-600`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
}
```

**Test:** `npx vitest run tests/components/loading-spinner.test.tsx`
**Commit:** `feat: enhance LoadingSpinner with delay and size variants`

---

### Task 10.5: Enhance ErrorState shared component

**File:** `src/components/ErrorState.tsx`
**Why:** Standardize error display with user-friendly message and retry action.

```tsx
interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
      <div className="mb-4 rounded-full bg-danger-100 p-3">
        <svg
          className="h-8 w-8 text-danger-600"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>
      <h3 className="text-heading-3 text-gray-900">{title}</h3>
      <p className="mt-2 max-w-sm text-body text-gray-500">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-button bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors duration-fast"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
```

**Test:** `npx vitest run tests/components/error-state.test.tsx`
**Commit:** `feat: enhance ErrorState component with design tokens`

---

### Task 10.6: Write shared component tests

**File:** `tests/components/empty-state.test.tsx`

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from '../../src/components/EmptyState';

describe('EmptyState', () => {
  it('should render title', () => {
    render(<EmptyState title="No expenses yet" />);
    expect(screen.getByText('No expenses yet')).toBeInTheDocument();
  });

  it('should render description when provided', () => {
    render(
      <EmptyState title="Empty" description="Add your first expense." />
    );
    expect(screen.getByText('Add your first expense.')).toBeInTheDocument();
  });

  it('should render action button and handle click', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <EmptyState
        title="Empty"
        action={{ label: 'Add Expense', onClick }}
      />
    );

    await user.click(screen.getByText('Add Expense'));
    expect(onClick).toHaveBeenCalled();
  });

  it('should render without action button when not provided', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
```

**File:** `tests/components/loading-spinner.test.tsx`

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('should render with accessible label', async () => {
    render(<LoadingSpinner delay={0} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should accept custom label', () => {
    render(<LoadingSpinner delay={0} label="Saving..." />);
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('should delay rendering by default', async () => {
    vi.useFakeTimers();
    render(<LoadingSpinner />);

    // Not visible initially
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    // Visible after delay
    vi.advanceTimersByTime(150);
    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    vi.useRealTimers();
  });
});
```

**File:** `tests/components/error-state.test.tsx`

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorState } from '../../src/components/ErrorState';

describe('ErrorState', () => {
  it('should render default title and message', () => {
    render(<ErrorState message="Could not load data." />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Could not load data.')).toBeInTheDocument();
  });

  it('should render custom title', () => {
    render(<ErrorState title="Connection Lost" message="Check your internet." />);
    expect(screen.getByText('Connection Lost')).toBeInTheDocument();
  });

  it('should render retry button and handle click', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(<ErrorState message="Error" onRetry={onRetry} />);
    await user.click(screen.getByText('Try Again'));

    expect(onRetry).toHaveBeenCalled();
  });

  it('should not render retry button when onRetry not provided', () => {
    render(<ErrorState message="Error" />);
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
  });
});
```

**Run:** `npx vitest run tests/components/`
**Commit:** `test: add shared component tests for EmptyState, LoadingSpinner, ErrorState`

---

## Section 11: Empty/Loading/Error State Audit Across All Screens

### Task 11.1: Audit and update DashboardScreen states

**File:** `src/screens/dashboard/DashboardScreen.tsx`
**Why:** Ensure loading, empty, and error states are handled for all dashboard data (countdown, budget cards, goal/health widgets).

Update the DashboardScreen to use shared components:

```tsx
import { EmptyState } from '../../components/EmptyState';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorState } from '../../components/ErrorState';

// In the component:
// Loading state
if (loading) {
  return <LoadingSpinner label="Loading dashboard..." />;
}

// Error state
if (error) {
  return (
    <ErrorState
      message="Could not load dashboard data. Please try again."
      onRetry={() => window.location.reload()}
    />
  );
}

// Empty countdown state (no target date):
{!settings?.targetDate && (
  <EmptyState
    title="Set your milestone"
    description="Add a target date in Settings to see your countdown."
    action={{ label: 'Go to Settings', onClick: () => navigate('/settings') }}
  />
)}

// Empty budget card state (no budget configured):
{!budgetMonth && (
  <EmptyState
    title="No budget set"
    description="Set up your monthly budget to track spending."
    action={{ label: 'Set Up Budget', onClick: () => navigate('/budget') }}
  />
)}
```

**Test:** `npx vitest run tests/screens/dashboard-screen.test.tsx`
**Commit:** `feat: add loading/empty/error states to DashboardScreen`

---

### Task 11.2: Audit and update BudgetScreen states

**File:** `src/screens/budget/BudgetScreen.tsx`
**Why:** Loading, empty (no budget month), and error states for budget data.

```tsx
import { EmptyState } from '../../components/EmptyState';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorState } from '../../components/ErrorState';

// Loading:
if (loading) {
  return <LoadingSpinner label="Loading budget..." />;
}

// Error:
if (error) {
  return (
    <ErrorState
      message="Could not load budget data."
      onRetry={refetch}
    />
  );
}

// Empty (no budget month):
{!budgetMonth && (
  <EmptyState
    title="No budget for this month"
    description="Set up your monthly budget to start tracking expenses."
    action={{ label: 'Set Up Budget', onClick: handleSetupBudget }}
  />
)}

// Empty expenses:
{expenses.length === 0 && budgetMonth && (
  <EmptyState
    title="No expenses yet"
    description="Add your first expense to start tracking your budget."
    action={{ label: 'Add Expense', onClick: handleAddExpense }}
  />
)}
```

**Test:** `npx vitest run tests/screens/budget-screen.test.tsx`
**Commit:** `feat: add loading/empty/error states to BudgetScreen`

---

### Task 11.3: Audit and update GoalsScreen states

**File:** `src/screens/goals/GoalsScreen.tsx`
**Why:** Loading, empty (no goals), and error states.

```tsx
import { EmptyState } from '../../components/EmptyState';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorState } from '../../components/ErrorState';

// Loading:
if (loading) {
  return <LoadingSpinner label="Loading goals..." />;
}

// Error:
if (error) {
  return (
    <ErrorState
      message="Could not load your goals."
      onRetry={refetch}
    />
  );
}

// Empty:
{goals.length === 0 && (
  <EmptyState
    title="No goals yet"
    description="Create your first goal to track what matters to you."
    action={{ label: 'Create Goal', onClick: handleCreateGoal }}
  />
)}
```

**Test:** `npx vitest run tests/screens/goals-screen.test.tsx`
**Commit:** `feat: add loading/empty/error states to GoalsScreen`

---

### Task 11.4: Audit and update HealthScreen states

**File:** `src/screens/health/HealthScreen.tsx`
**Why:** Loading, empty (no routines), and error states.

```tsx
import { EmptyState } from '../../components/EmptyState';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorState } from '../../components/ErrorState';

// Loading:
if (loading) {
  return <LoadingSpinner label="Loading health routines..." />;
}

// Error:
if (error) {
  return (
    <ErrorState
      message="Could not load health routines."
      onRetry={refetch}
    />
  );
}

// Empty:
{routines.length === 0 && (
  <EmptyState
    title="No routines yet"
    description="Create a health routine to start tracking your habits."
    action={{ label: 'Add Routine', onClick: handleAddRoutine }}
  />
)}
```

**Test:** `npx vitest run tests/screens/health-screen.test.tsx`
**Commit:** `feat: add loading/empty/error states to HealthScreen`

---

### Task 11.5: Audit and update AgentScreen states

**File:** `src/screens/agent/AgentScreen.tsx`
**Why:** Loading, offline, and API key missing states.

```tsx
import { ErrorState } from '../../components/ErrorState';

// Already has offline handling from Stage 6, ensure error state is consistent:
// Missing API key:
{!hasApiKey && (
  <EmptyState
    title="API key required"
    description="Add your Claude API key in Settings to use the AI agent."
    action={{ label: 'Go to Settings', onClick: () => navigate('/settings') }}
  />
)}
```

**Test:** `npx vitest run tests/screens/agent-screen.test.tsx`
**Commit:** `feat: add consistent empty/error states to AgentScreen`

---

### Task 11.6: Audit and update SettingsScreen states

**File:** `src/screens/settings/SettingsScreen.tsx`
**Why:** Loading and error states for settings data.

```tsx
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorState } from '../../components/ErrorState';

// Loading:
if (loading) {
  return <LoadingSpinner label="Loading settings..." />;
}

// Error:
if (error) {
  return (
    <ErrorState
      message="Could not load settings."
      onRetry={refetch}
    />
  );
}
```

**Test:** `npx vitest run tests/screens/settings-screen.test.tsx`
**Commit:** `feat: add loading/error states to SettingsScreen`

---

### Task 11.7: Apply consistent spacing and typography across screens

**Why:** Replace ad-hoc spacing values with design token classes. Ensure headings, body text, and labels use consistent sizes.

For each screen file, update Tailwind classes to use design tokens:

```
Replace pattern:
  "p-4"          → "p-card"
  "gap-3"        → "gap-card-gap"
  "px-4"         → "px-screen-x"
  "py-6"         → "py-screen-y"
  "mb-6"         → "mb-section"
  "rounded-xl"   → "rounded-card"
  "rounded-lg"   → "rounded-button" (for buttons/inputs)
  "text-xl font-bold"    → "text-heading-1" (screen titles)
  "text-lg font-semibold" → "text-heading-2" (section heads)
  "text-base font-semibold" → "text-heading-3" (card titles)
  "text-sm"      → "text-body" (where it's body text)
  "text-xs"      → "text-caption" (labels, timestamps)
```

Apply systematically to:
- `src/screens/dashboard/DashboardScreen.tsx`
- `src/screens/budget/BudgetScreen.tsx`
- `src/screens/goals/GoalsScreen.tsx`
- `src/screens/health/HealthScreen.tsx`
- `src/screens/agent/AgentScreen.tsx`
- `src/screens/settings/SettingsScreen.tsx`
- `src/components/AppShell.tsx`
- `src/components/BottomNav.tsx`

**Test:** `npx vitest run`
**Commit:** `refactor: apply design token classes across all screens for consistency`

---

### Task 11.8: Add transition animations to key interactions

**Why:** Subtle animations for screen entry, card expand/collapse, and list item changes. Under 300ms. Respects prefers-reduced-motion.

Add the `animate-fade-in` class to screen wrapper divs:

```tsx
// Each screen's root container:
<div className="animate-fade-in px-screen-x py-screen-y">
```

Add `animate-slide-up` to modal/dialog entries:

```tsx
// ConfirmDialog inner content:
<div className="animate-slide-up ...">
```

Add transition classes to interactive elements:

```tsx
// Buttons:
className="... transition-colors duration-fast"

// Expandable sections:
className="... transition-all duration-normal"
```

**Test:** Visual verification + `npx vitest run` (ensure no regressions)
**Commit:** `feat: add subtle transition animations with reduced-motion support`

---

## Section 12: Cross-Browser Testing Checklist (Story 047)

### Task 12.1: Create cross-browser testing checklist

**File:** `docs/cross-browser-checklist.md`
**Why:** Systematic checklist for 8 browser/platform combinations. To be completed manually during testing.

```markdown
# Cross-Browser Testing Checklist

## Target Browsers
- Chrome Desktop
- Chrome Mobile (Android)
- Safari Desktop (macOS)
- Safari Mobile (iOS)
- Firefox Desktop
- Firefox Mobile (Android)
- Edge Desktop
- Edge Mobile

## Test Matrix

### Per Browser — General
- [ ] App loads without console errors
- [ ] All 6 screens navigate correctly
- [ ] Bottom navigation renders and functions
- [ ] Forms accept input and submit correctly

### Per Browser — Dashboard
- [ ] Milestone countdown displays and updates
- [ ] Budget summary cards render with correct values
- [ ] Goals and health widgets display correctly
- [ ] Notification banners appear/dismiss (when push unavailable)

### Per Browser — Budget
- [ ] Expense entry form works (all fields)
- [ ] Expense table renders with date grouping
- [ ] Balance calculation is correct
- [ ] Month selector navigates between months
- [ ] Edit and delete expense functions

### Per Browser — Goals
- [ ] Goal creation form (all 4 progress models)
- [ ] Goal list with filtering
- [ ] Progress updates work
- [ ] Status transitions (active/completed/archived)

### Per Browser — Health
- [ ] Routine creation with metrics
- [ ] Quick-log functionality
- [ ] Streak display
- [ ] Weekly adherence indicator

### Per Browser — AI Agent
- [ ] Chat interface renders
- [ ] Text input sends messages (requires API key + network)
- [ ] Image upload functions
- [ ] Offline message displays when offline

### Per Browser — Settings
- [ ] All settings save and persist
- [ ] API key masking
- [ ] Notification settings toggles
- [ ] Export/Import buttons function
- [ ] File download (export) works
- [ ] File upload (import) works

### Per Browser — PWA
- [ ] Install prompt appears (where supported)
- [ ] Installed app launches in standalone mode
- [ ] App works offline after install
- [ ] Service worker caches assets

### Per Browser — Notifications
- [ ] Permission prompt appears (where Notification API supported)
- [ ] Push notifications fire (where supported)
- [ ] Badge updates (where Badge API supported)
- [ ] In-app fallback appears when push unavailable

## Known Platform Limitations

| Platform | Limitation | Handling |
|----------|-----------|----------|
| iOS Safari | Limited push notification support | In-app fallback banners |
| iOS Safari | No Badge API | Silently skipped |
| Firefox Mobile | No PWA install | App works as regular web app |
| Older browsers | No Notification API | In-app fallback only |

## Issues Found

| # | Browser | Issue | Severity | Fix |
|---|---------|-------|----------|-----|
| 1 | | | | |
```

**Commit:** `docs: add cross-browser testing checklist`

---

### Task 12.2: Add Safari-specific CSS fixes

**File:** `src/index.css`
**Why:** Address known Safari rendering quirks preemptively.

Append to index.css:

```css
/* --- Safari-specific fixes --- */

/* Fix Safari flex gap issue in older versions */
@supports not (gap: 1rem) {
  .flex > * + * {
    margin-left: 0.75rem;
  }
}

/* Fix Safari 100vh issue on iOS (address bar) */
body {
  min-height: 100vh;
  min-height: -webkit-fill-available;
}

html {
  height: -webkit-fill-available;
}

/* Prevent iOS tap highlight */
* {
  -webkit-tap-highlight-color: transparent;
}

/* Fix Safari input zoom on focus (prevent auto-zoom for inputs < 16px) */
@media screen and (max-width: 768px) {
  input[type='text'],
  input[type='number'],
  input[type='email'],
  input[type='password'],
  input[type='date'],
  select,
  textarea {
    font-size: 16px;
  }
}
```

**Commit:** `fix: add Safari-specific CSS fixes for iOS viewport and input zoom`

---

### Task 12.3: Add IndexedDB error boundary for cross-browser safety

**File:** `src/components/DatabaseErrorBoundary.tsx`
**Why:** Catch IndexedDB failures across browsers and show user-friendly error instead of blank screen.

```tsx
import { Component, type ReactNode, type ErrorInfo } from 'react';
import { ErrorState } from './ErrorState';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class DatabaseErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Database error boundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const isDbError =
        this.state.error?.message?.includes('IndexedDB') ||
        this.state.error?.message?.includes('Dexie') ||
        this.state.error?.name === 'DatabaseClosedError';

      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <ErrorState
            title={isDbError ? 'Database Error' : 'Something went wrong'}
            message={
              isDbError
                ? 'There was a problem accessing your data. Try reloading the app. If the problem persists, your browser may have restricted storage access.'
                : 'An unexpected error occurred. Please try reloading the app.'
            }
            onRetry={this.handleRetry}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
```

**File:** `src/App.tsx`
**Why:** Wrap the app in the error boundary.

```tsx
import { DatabaseErrorBoundary } from './components/DatabaseErrorBoundary';

// Wrap the router/app shell:
export function App() {
  return (
    <DatabaseErrorBoundary>
      {/* existing Router/AppShell content */}
    </DatabaseErrorBoundary>
  );
}
```

**Test:** `npx vitest run tests/components/database-error-boundary.test.tsx`
**Commit:** `feat: add DatabaseErrorBoundary for cross-browser IndexedDB safety`

---

### Task 12.4: Write DatabaseErrorBoundary tests

**File:** `tests/components/database-error-boundary.test.tsx`
**Why:** Verify error boundary catches errors and shows user-friendly message.

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DatabaseErrorBoundary } from '../../src/components/DatabaseErrorBoundary';

function ThrowingComponent({ error }: { error: Error }) {
  throw error;
}

describe('DatabaseErrorBoundary', () => {
  // Suppress React error boundary console output during tests
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it('should render children when no error', () => {
    render(
      <DatabaseErrorBoundary>
        <p>App content</p>
      </DatabaseErrorBoundary>
    );
    expect(screen.getByText('App content')).toBeInTheDocument();
  });

  it('should show database error message for IndexedDB errors', () => {
    const error = new Error('IndexedDB connection failed');

    render(
      <DatabaseErrorBoundary>
        <ThrowingComponent error={error} />
      </DatabaseErrorBoundary>
    );

    expect(screen.getByText('Database Error')).toBeInTheDocument();
    expect(
      screen.getByText(/problem accessing your data/)
    ).toBeInTheDocument();
  });

  it('should show generic error message for other errors', () => {
    const error = new Error('Some other error');

    render(
      <DatabaseErrorBoundary>
        <ThrowingComponent error={error} />
      </DatabaseErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});
```

**Run:** `npx vitest run tests/components/database-error-boundary.test.tsx`
**Commit:** `test: add DatabaseErrorBoundary tests`

---

## Section 13: Final Netlify Deployment Configuration

### Task 13.1: Verify and finalize netlify.toml

**File:** `netlify.toml`
**Why:** Ensure SPA redirect, caching headers, and security headers are in place for production.

```toml
[build]
  command = "npm run build"
  publish = "dist"

# SPA fallback — all routes serve index.html
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Cache static assets aggressively (hashed filenames from Vite)
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

# Cache icons
[[headers]]
  for = "/icons/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

# Service worker must not be cached
[[headers]]
  for = "/sw.js"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"

# Workbox service worker files
[[headers]]
  for = "/workbox-*.js"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"

# manifest.json
[[headers]]
  for = "/manifest.json"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"
    Content-Type = "application/manifest+json"

# Security headers
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
```

**Commit:** `feat: finalize netlify.toml with caching and security headers`

---

### Task 13.2: Add build verification script

**File:** `package.json`
**Why:** Add a pre-deploy check script that runs type checking, linting, tests, and build.

Add to the `scripts` section of package.json:

```json
{
  "scripts": {
    "predeploy": "npm run typecheck && npm run lint && npm run test:run && npm run build",
    "typecheck": "tsc --noEmit",
    "test:run": "vitest run",
    "lint": "eslint src/ --ext .ts,.tsx",
    "build": "vite build",
    "dev": "vite",
    "preview": "vite preview"
  }
}
```

**Test:** `npm run predeploy`
**Commit:** `feat: add predeploy verification script`

---

### Task 13.3: Final integration test run

**Why:** Run the complete test suite to verify all Stage 7 additions pass alongside prior stages.

```bash
npx vitest run
```

Expected output: all tests pass.

If any tests fail, diagnose and fix before proceeding. Each fix gets its own commit:

```
fix: [description of what was fixed]
```

**Commit:** `test: verify full test suite passes after Stage 7`

---

## Summary of All Files Created or Modified

### New Files
| File | Purpose |
|------|---------|
| `src/data/notification-service.ts` | Capability detection, permission flow, budget/milestone alerts, badge management, dispatch |
| `src/data/export-service.ts` | Export all IndexedDB stores to JSON |
| `src/data/import-service.ts` | Validate and import JSON backup, with rollback |
| `src/components/NotificationPrompt.tsx` | Pre-permission in-app dialog |
| `src/components/NotificationBanner.tsx` | In-app alert banners for dashboard |
| `src/components/DatabaseErrorBoundary.tsx` | Error boundary for IndexedDB failures |
| `src/screens/settings/NotificationSettings.tsx` | Notification threshold configuration UI |
| `src/screens/settings/ExportButton.tsx` | Export trigger with loading/success/error states |
| `src/screens/settings/ImportButton.tsx` | Import with file picker, validation, confirmation |
| `src/hooks/useNotificationAlerts.ts` | Reactive hook for active alerts |
| `docs/cross-browser-checklist.md` | Manual testing checklist for 8 browser combos |
| `tests/data/notification-service.test.ts` | Capability detection tests |
| `tests/data/notification-permission.test.ts` | Permission flow tests |
| `tests/data/budget-threshold-alerts.test.ts` | Budget alert tests |
| `tests/data/milestone-alerts.test.ts` | Milestone countdown tests |
| `tests/data/badge-management.test.ts` | Badge management tests |
| `tests/data/export-service.test.ts` | Export service tests |
| `tests/data/import-service.test.ts` | Import service tests |
| `tests/screens/notification-prompt.test.tsx` | NotificationPrompt component tests |
| `tests/screens/notification-banner.test.tsx` | NotificationBanner component tests |
| `tests/screens/notification-settings.test.tsx` | NotificationSettings component tests |
| `tests/screens/export-button.test.tsx` | ExportButton component tests |
| `tests/screens/import-button.test.tsx` | ImportButton component tests |
| `tests/hooks/useNotificationAlerts.test.ts` | Alert hook tests |
| `tests/components/empty-state.test.tsx` | EmptyState component tests |
| `tests/components/loading-spinner.test.tsx` | LoadingSpinner component tests |
| `tests/components/error-state.test.tsx` | ErrorState component tests |
| `tests/components/database-error-boundary.test.tsx` | Error boundary tests |

### Modified Files
| File | Change |
|------|--------|
| `src/lib/types.ts` | Add notification system type definitions |
| `src/lib/constants.ts` | Add APP_VERSION and SCHEMA_VERSION |
| `src/data/db.ts` | Add notificationAlerts and notificationFiredRecords stores, bump schema version, add Settings fields |
| `src/data/expense-service.ts` | Hook threshold checks into expense writes |
| `src/App.tsx` | Add launch checks, session counter, visibility listener, error boundary |
| `src/screens/dashboard/DashboardScreen.tsx` | Add notification banners, badge clearing, loading/empty/error states |
| `src/screens/budget/BudgetScreen.tsx` | Add badge clearing, loading/empty/error states |
| `src/screens/goals/GoalsScreen.tsx` | Add loading/empty/error states |
| `src/screens/health/HealthScreen.tsx` | Add loading/empty/error states |
| `src/screens/agent/AgentScreen.tsx` | Add consistent empty/error states |
| `src/screens/settings/SettingsScreen.tsx` | Add NotificationSettings, ExportButton, ImportButton, loading/error states |
| `src/components/BottomNav.tsx` | Add alert indicator dots |
| `src/components/EmptyState.tsx` | Enhance with icon, description, action, design tokens |
| `src/components/LoadingSpinner.tsx` | Enhance with delay, size variants, design tokens |
| `src/components/ErrorState.tsx` | Enhance with design tokens, retry action |
| `src/index.css` | Add animations, reduced-motion support, Safari fixes |
| `tailwind.config.ts` | Add design tokens (colors, spacing, typography, border-radius) |
| `netlify.toml` | Add caching and security headers |
| `package.json` | Add predeploy, typecheck, test:run scripts |
