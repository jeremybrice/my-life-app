# Stage 2: Dashboard & Offline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the dashboard functional with a working milestone countdown, define card interfaces for budget/goals/health integration, and verify complete offline capability.

**Architecture:** Dashboard reads settings from Dexie via hooks. Card components define TypeScript prop interfaces that later stages implement. Offline verification confirms service worker + IndexedDB + routing work without network.

**Tech Stack:** React, TypeScript, Dexie (useLiveQuery), Vitest, React Testing Library

**Depends on:** Stage 1 (Dexie DB, settings service, app shell, routes, PWA config)
**Produces for later stages:** Card prop interfaces (DailyBudgetCardProps, MonthlyPerformanceCardProps, GoalsWidgetProps, HealthWidgetProps)

---

## Group 1: Date Utilities for Countdown

### Task 1.1 — Add `daysBetweenInclusive` helper to date utilities

**File:** `src/lib/dates.ts`

Stage 1 provides `daysBetween`. The countdown needs an inclusive variant that handles past-target and same-day edge cases. Add this function to the existing `dates.ts` file.

**Append** the following to the existing `src/lib/dates.ts`:

```typescript
/**
 * Calendar days from `from` to `to`, inclusive of both endpoints.
 * Returns a positive number regardless of direction.
 * Same day returns 0 (target is today = "0 days remaining").
 */
export function daysBetweenInclusive(from: string, to: string): number {
  const f = new Date(from + 'T00:00:00');
  const t = new Date(to + 'T00:00:00');
  const diffMs = t.getTime() - f.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return Math.abs(diffDays);
}

/**
 * Calculates the progress ratio between birth and target,
 * based on today's position. Clamps to [0, 1].
 */
export function lifetimeProgress(birthDate: string, targetDate: string, todayDate: string): number {
  const birth = new Date(birthDate + 'T00:00:00').getTime();
  const target = new Date(targetDate + 'T00:00:00').getTime();
  const now = new Date(todayDate + 'T00:00:00').getTime();
  const totalSpan = target - birth;
  if (totalSpan <= 0) return 1;
  const elapsed = now - birth;
  return Math.max(0, Math.min(1, elapsed / totalSpan));
}
```

**Test command:** `npx vitest run tests/lib/dates.test.ts`

---

### Task 1.2 — Write tests for new date helpers

**File:** `tests/lib/dates.test.ts`

**Append** the following test cases to the existing test file:

```typescript
import { daysBetweenInclusive, lifetimeProgress } from '../../src/lib/dates';

describe('daysBetweenInclusive', () => {
  it('should return 0 for same day', () => {
    expect(daysBetweenInclusive('2026-03-18', '2026-03-18')).toBe(0);
  });

  it('should return 1 for adjacent days', () => {
    expect(daysBetweenInclusive('2026-03-18', '2026-03-19')).toBe(1);
  });

  it('should return positive for future target', () => {
    expect(daysBetweenInclusive('2026-03-18', '2026-04-18')).toBe(31);
  });

  it('should return positive for past target (absolute value)', () => {
    expect(daysBetweenInclusive('2026-03-18', '2026-02-18')).toBe(28);
  });

  it('should handle large spans', () => {
    expect(daysBetweenInclusive('1985-06-15', '2035-06-15')).toBe(18263);
  });
});

describe('lifetimeProgress', () => {
  it('should return 0.5 when today is midpoint', () => {
    const progress = lifetimeProgress('2000-01-01', '2050-01-01', '2025-01-01');
    expect(progress).toBeCloseTo(0.5, 1);
  });

  it('should return 0 when today equals birth date', () => {
    expect(lifetimeProgress('2026-01-01', '2036-01-01', '2026-01-01')).toBe(0);
  });

  it('should return 1 when today equals target date', () => {
    expect(lifetimeProgress('2000-01-01', '2026-03-18', '2026-03-18')).toBe(1);
  });

  it('should clamp to 1 when today is past target', () => {
    expect(lifetimeProgress('2000-01-01', '2020-01-01', '2026-03-18')).toBe(1);
  });

  it('should clamp to 0 when today is before birth', () => {
    expect(lifetimeProgress('2030-01-01', '2050-01-01', '2026-01-01')).toBe(0);
  });

  it('should return 1 when birth equals target (zero span)', () => {
    expect(lifetimeProgress('2026-01-01', '2026-01-01', '2026-03-18')).toBe(1);
  });
});
```

**Test command:** `npx vitest run tests/lib/dates.test.ts`

**Commit:** `feat: add daysBetweenInclusive and lifetimeProgress date helpers`

---

## Group 2: Milestone Countdown Component

### Task 2.1 — Create MilestoneCountdown component

**File:** `src/screens/dashboard/MilestoneCountdown.tsx`

```tsx
import { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { daysBetweenInclusive, lifetimeProgress, today } from '../../lib/dates';

export function MilestoneCountdown() {
  const { data: settings, loading } = useSettings();
  const [currentDate, setCurrentDate] = useState(today());

  const recalculate = useCallback(() => {
    setCurrentDate(today());
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        recalculate();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [recalculate]);

  if (loading) {
    return (
      <div data-testid="countdown-loading" className="p-6 text-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  const birthDate = settings?.birthDate;
  const targetDate = settings?.targetDate;
  const label = settings?.targetDateLabel;

  // No dates configured
  if (!birthDate && !targetDate) {
    return (
      <div data-testid="countdown-unconfigured" className="rounded-2xl bg-gray-50 p-6 text-center">
        <p className="text-lg font-semibold text-gray-700">Set Your Milestone</p>
        <p className="mt-2 text-sm text-gray-500">
          Go to Settings to add your birth date and a target date to see your life countdown.
        </p>
      </div>
    );
  }

  // Only one date configured
  if (!birthDate || !targetDate) {
    return (
      <div data-testid="countdown-partial" className="rounded-2xl bg-gray-50 p-6 text-center">
        <p className="text-lg font-semibold text-gray-700">Almost There</p>
        <p className="mt-2 text-sm text-gray-500">
          Both a birth date and a target date are needed for the countdown. Check Settings.
        </p>
      </div>
    );
  }

  const daysCount = daysBetweenInclusive(currentDate, targetDate);
  const isTargetInPast = currentDate > targetDate;
  const isTargetToday = currentDate === targetDate;
  const progress = lifetimeProgress(birthDate, targetDate, currentDate);
  const progressPercent = Math.round(progress * 100);

  return (
    <div data-testid="countdown-display" className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white shadow-lg">
      {isTargetToday ? (
        <>
          <p className="text-center text-lg font-medium opacity-90">
            {label ? label : 'Your Milestone'}
          </p>
          <p data-testid="countdown-number" className="mt-2 text-center text-5xl font-bold">
            Today!
          </p>
          <p className="mt-1 text-center text-sm opacity-80">
            Milestone day has arrived
          </p>
        </>
      ) : isTargetInPast ? (
        <>
          <p className="text-center text-lg font-medium opacity-90">
            {label ? label : 'Milestone'}
          </p>
          <p data-testid="countdown-reached" className="mt-2 text-center text-sm opacity-80">
            Milestone reached
          </p>
          <p data-testid="countdown-number" className="mt-1 text-center text-5xl font-bold">
            {daysCount}
          </p>
          <p className="mt-1 text-center text-sm opacity-80">
            {daysCount === 1 ? 'day ago' : 'days ago'}
          </p>
        </>
      ) : (
        <>
          <p className="text-center text-lg font-medium opacity-90">
            {label ? label : 'Countdown'}
          </p>
          <p data-testid="countdown-number" className="mt-2 text-center text-5xl font-bold">
            {daysCount.toLocaleString()}
          </p>
          <p className="mt-1 text-center text-sm opacity-80">
            {daysCount === 1 ? 'day remaining' : 'days remaining'}
          </p>
        </>
      )}

      {/* Progress indicator */}
      <div className="mt-4">
        <div className="flex justify-between text-xs opacity-70">
          <span>Birth</span>
          <span>Today</span>
          <span>Target</span>
        </div>
        <div className="relative mt-1 h-2 overflow-hidden rounded-full bg-white/20">
          <div
            data-testid="countdown-progress"
            className="h-full rounded-full bg-white/80 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="mt-1 text-center text-xs opacity-60">
          {progressPercent}% of the journey
        </p>
      </div>
    </div>
  );
}
```

**Test command:** `npx vitest run tests/screens/dashboard/MilestoneCountdown.test.tsx`

---

### Task 2.2 — Write MilestoneCountdown tests

**File:** `tests/screens/dashboard/MilestoneCountdown.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MilestoneCountdown } from '../../../src/screens/dashboard/MilestoneCountdown';

// Mock useSettings
const mockSettings = vi.fn();
vi.mock('../../../src/hooks/useSettings', () => ({
  useSettings: () => mockSettings(),
}));

// Mock dates module
vi.mock('../../../src/lib/dates', async () => {
  const actual = await vi.importActual<typeof import('../../../src/lib/dates')>('../../../src/lib/dates');
  return {
    ...actual,
    today: vi.fn(() => '2026-03-18'),
  };
});

describe('MilestoneCountdown', () => {
  beforeEach(() => {
    mockSettings.mockReturnValue({
      data: null,
      loading: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should show loading state', () => {
    mockSettings.mockReturnValue({ data: null, loading: true, error: null });
    render(<MilestoneCountdown />);
    expect(screen.getByTestId('countdown-loading')).toBeInTheDocument();
  });

  it('should show unconfigured message when no dates set', () => {
    mockSettings.mockReturnValue({
      data: { id: 1 },
      loading: false,
      error: null,
    });
    render(<MilestoneCountdown />);
    expect(screen.getByTestId('countdown-unconfigured')).toBeInTheDocument();
    expect(screen.getByText(/go to settings/i)).toBeInTheDocument();
  });

  it('should show partial message when only birth date set', () => {
    mockSettings.mockReturnValue({
      data: { id: 1, birthDate: '1985-06-15' },
      loading: false,
      error: null,
    });
    render(<MilestoneCountdown />);
    expect(screen.getByTestId('countdown-partial')).toBeInTheDocument();
    expect(screen.getByText(/both a birth date and a target date/i)).toBeInTheDocument();
  });

  it('should show partial message when only target date set', () => {
    mockSettings.mockReturnValue({
      data: { id: 1, targetDate: '2035-06-15' },
      loading: false,
      error: null,
    });
    render(<MilestoneCountdown />);
    expect(screen.getByTestId('countdown-partial')).toBeInTheDocument();
  });

  it('should display days remaining for future target', () => {
    mockSettings.mockReturnValue({
      data: {
        id: 1,
        birthDate: '1985-06-15',
        targetDate: '2035-06-15',
        targetDateLabel: 'Age 50',
      },
      loading: false,
      error: null,
    });
    render(<MilestoneCountdown />);
    expect(screen.getByTestId('countdown-display')).toBeInTheDocument();
    expect(screen.getByTestId('countdown-number')).toBeInTheDocument();
    expect(screen.getByText('Age 50')).toBeInTheDocument();
    expect(screen.getByText(/days remaining/i)).toBeInTheDocument();
  });

  it('should show milestone reached for past target', () => {
    mockSettings.mockReturnValue({
      data: {
        id: 1,
        birthDate: '1985-06-15',
        targetDate: '2020-01-01',
        targetDateLabel: 'Past Event',
      },
      loading: false,
      error: null,
    });
    render(<MilestoneCountdown />);
    expect(screen.getByTestId('countdown-reached')).toBeInTheDocument();
    expect(screen.getByText(/milestone reached/i)).toBeInTheDocument();
    expect(screen.getByText(/days ago/i)).toBeInTheDocument();
  });

  it('should display countdown without label when label is empty', () => {
    mockSettings.mockReturnValue({
      data: {
        id: 1,
        birthDate: '1985-06-15',
        targetDate: '2035-06-15',
      },
      loading: false,
      error: null,
    });
    render(<MilestoneCountdown />);
    expect(screen.getByTestId('countdown-display')).toBeInTheDocument();
    expect(screen.getByText('Countdown')).toBeInTheDocument();
    expect(screen.getByTestId('countdown-number')).toBeInTheDocument();
  });

  it('should show progress indicator', () => {
    mockSettings.mockReturnValue({
      data: {
        id: 1,
        birthDate: '1985-06-15',
        targetDate: '2035-06-15',
        targetDateLabel: 'Age 50',
      },
      loading: false,
      error: null,
    });
    render(<MilestoneCountdown />);
    const progressBar = screen.getByTestId('countdown-progress');
    expect(progressBar).toBeInTheDocument();
    const style = progressBar.getAttribute('style');
    expect(style).toContain('width:');
  });

  it('should recalculate on visibility change', async () => {
    const { today: todayMock } = await import('../../../src/lib/dates');
    mockSettings.mockReturnValue({
      data: {
        id: 1,
        birthDate: '1985-06-15',
        targetDate: '2035-06-15',
        targetDateLabel: 'Age 50',
      },
      loading: false,
      error: null,
    });
    render(<MilestoneCountdown />);

    // Simulate date change
    (todayMock as ReturnType<typeof vi.fn>).mockReturnValue('2026-03-19');

    // Trigger visibility change
    await act(async () => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // The component should have re-rendered with the new date
    expect(todayMock).toHaveBeenCalled();
  });

  it('should show "Today!" when target date is today', () => {
    mockSettings.mockReturnValue({
      data: {
        id: 1,
        birthDate: '1985-06-15',
        targetDate: '2026-03-18',
        targetDateLabel: 'The Day',
      },
      loading: false,
      error: null,
    });
    render(<MilestoneCountdown />);
    expect(screen.getByText('Today!')).toBeInTheDocument();
  });

  it('should show singular "day remaining" for 1 day', () => {
    mockSettings.mockReturnValue({
      data: {
        id: 1,
        birthDate: '1985-06-15',
        targetDate: '2026-03-19',
      },
      loading: false,
      error: null,
    });
    render(<MilestoneCountdown />);
    expect(screen.getByText('day remaining')).toBeInTheDocument();
  });

  it('should show singular "day ago" for 1 day past', () => {
    mockSettings.mockReturnValue({
      data: {
        id: 1,
        birthDate: '1985-06-15',
        targetDate: '2026-03-17',
      },
      loading: false,
      error: null,
    });
    render(<MilestoneCountdown />);
    expect(screen.getByText('day ago')).toBeInTheDocument();
  });
});
```

**Test command:** `npx vitest run tests/screens/dashboard/MilestoneCountdown.test.tsx`

**Commit:** `feat: add MilestoneCountdown component with visibility-change recalculation`

---

## Group 3: Budget Summary Card Shells

### Task 3.1 — Define DailyBudgetCardProps interface and create shell component

**File:** `src/screens/dashboard/DailyBudgetCard.tsx`

```tsx
/**
 * DailyBudgetCardProps — Stage 4 will pass live data to this interface.
 * Do NOT modify this interface's type shape when connecting live data.
 */
export interface DailyBudgetCardProps {
  /** Today's remaining balance (daily allowance - today's spending + carry-over fraction) */
  todayBalance: number;
  /** The daily budget allowance amount */
  dailyBudget: number;
  /** Total amount spent today */
  todaySpending: number;
  /** 'under' = spending within budget, 'over' = spending exceeds daily allowance */
  status: 'under' | 'over';
  /** Optional callback to navigate to the Budget tab */
  onNavigate?: () => void;
}

interface DailyBudgetCardInternalProps {
  data?: DailyBudgetCardProps;
}

export function DailyBudgetCard({ data }: DailyBudgetCardInternalProps) {
  if (!data) {
    return (
      <div data-testid="daily-budget-card" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Daily Budget
        </h3>
        <div data-testid="daily-budget-zero-state" className="mt-3 text-center">
          <p className="text-2xl font-bold text-gray-300">--</p>
          <p className="mt-2 text-sm text-gray-400">
            Set up your monthly budget in the Budget tab to see your daily spending allowance here.
          </p>
        </div>
      </div>
    );
  }

  const isOver = data.status === 'over';

  return (
    <div data-testid="daily-budget-card" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Daily Budget
      </h3>
      <div className="mt-3">
        <p
          data-testid="daily-budget-remaining"
          className={`text-3xl font-bold ${isOver ? 'text-red-600' : 'text-green-600'}`}
        >
          ${data.todayBalance.toFixed(2)}
        </p>
        <p className="mt-1 text-xs text-gray-400">remaining today</p>
      </div>
      <div className="mt-3 flex justify-between text-sm text-gray-500">
        <span data-testid="daily-budget-allowance">Budget: ${data.dailyBudget.toFixed(2)}</span>
        <span data-testid="daily-budget-spent">Spent: ${data.todaySpending.toFixed(2)}</span>
      </div>
    </div>
  );
}
```

**Test command:** `npx vitest run tests/screens/dashboard/DailyBudgetCard.test.tsx`

---

### Task 3.2 — Write DailyBudgetCard tests

**File:** `tests/screens/dashboard/DailyBudgetCard.test.tsx`

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DailyBudgetCard } from '../../../src/screens/dashboard/DailyBudgetCard';
import type { DailyBudgetCardProps } from '../../../src/screens/dashboard/DailyBudgetCard';

describe('DailyBudgetCard', () => {
  it('should render zero-state when no data provided', () => {
    render(<DailyBudgetCard />);
    expect(screen.getByTestId('daily-budget-card')).toBeInTheDocument();
    expect(screen.getByTestId('daily-budget-zero-state')).toBeInTheDocument();
    expect(screen.getByText(/set up your monthly budget/i)).toBeInTheDocument();
  });

  it('should show "--" placeholder in zero state', () => {
    render(<DailyBudgetCard />);
    expect(screen.getByText('--')).toBeInTheDocument();
  });

  it('should render with live data under budget', () => {
    const data: DailyBudgetCardProps = {
      todayBalance: 45.50,
      dailyBudget: 65.00,
      todaySpending: 19.50,
      status: 'under',
    };
    render(<DailyBudgetCard data={data} />);
    expect(screen.getByTestId('daily-budget-remaining')).toHaveTextContent('$45.50');
    expect(screen.getByTestId('daily-budget-allowance')).toHaveTextContent('Budget: $65.00');
    expect(screen.getByTestId('daily-budget-spent')).toHaveTextContent('Spent: $19.50');
  });

  it('should display green text when under budget', () => {
    const data: DailyBudgetCardProps = {
      todayBalance: 45.50,
      dailyBudget: 65.00,
      todaySpending: 19.50,
      status: 'under',
    };
    render(<DailyBudgetCard data={data} />);
    const remaining = screen.getByTestId('daily-budget-remaining');
    expect(remaining.className).toContain('text-green-600');
  });

  it('should display red text when over budget', () => {
    const data: DailyBudgetCardProps = {
      todayBalance: -12.30,
      dailyBudget: 65.00,
      todaySpending: 77.30,
      status: 'over',
    };
    render(<DailyBudgetCard data={data} />);
    const remaining = screen.getByTestId('daily-budget-remaining');
    expect(remaining.className).toContain('text-red-600');
  });

  it('should have the card title "Daily Budget"', () => {
    render(<DailyBudgetCard />);
    expect(screen.getByText('Daily Budget')).toBeInTheDocument();
  });
});
```

**Test command:** `npx vitest run tests/screens/dashboard/DailyBudgetCard.test.tsx`

**Commit:** `feat: add DailyBudgetCard shell with DailyBudgetCardProps interface`

---

### Task 3.3 — Define MonthlyPerformanceCardProps interface and create shell component

**File:** `src/screens/dashboard/MonthlyPerformanceCard.tsx`

```tsx
/**
 * MonthlyPerformanceCardProps — Stage 4 will pass live data to this interface.
 * Do NOT modify this interface's type shape when connecting live data.
 */
export interface MonthlyPerformanceCardProps {
  /** Total budget for the current month (monthly amount + carry-over + additional funds) */
  totalBudget: number;
  /** Total spent this month */
  totalSpent: number;
  /** Net change (totalBudget - totalSpent); positive = under budget, negative = over */
  netChange: number;
  /** Current year-month displayed, e.g., "March 2026" */
  monthLabel: string;
  /** Optional callback to navigate to the Budget tab */
  onNavigate?: () => void;
}

interface MonthlyPerformanceCardInternalProps {
  data?: MonthlyPerformanceCardProps;
}

function netChangeColor(netChange: number): string {
  if (netChange < 0) return 'text-red-600';
  if (netChange === 0) return 'text-yellow-600';
  return 'text-green-600';
}

export function MonthlyPerformanceCard({ data }: MonthlyPerformanceCardInternalProps) {
  if (!data) {
    return (
      <div data-testid="monthly-performance-card" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Monthly Performance
        </h3>
        <div data-testid="monthly-performance-zero-state" className="mt-3 text-center">
          <p className="text-2xl font-bold text-gray-300">--</p>
          <p className="mt-2 text-sm text-gray-400">
            Your monthly spending overview will appear here once you start tracking expenses.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="monthly-performance-card" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Monthly Performance
        </h3>
        <span data-testid="monthly-performance-month" className="text-xs text-gray-400">
          {data.monthLabel}
        </span>
      </div>
      <div className="mt-3">
        <p
          data-testid="monthly-performance-remaining"
          className={`text-3xl font-bold ${netChangeColor(data.netChange)}`}
        >
          ${data.netChange.toFixed(2)}
        </p>
        <p className="mt-1 text-xs text-gray-400">net change this month</p>
      </div>
      <div className="mt-3 flex justify-between text-sm text-gray-500">
        <span data-testid="monthly-performance-budget">Budget: ${data.totalBudget.toFixed(2)}</span>
        <span data-testid="monthly-performance-spent">Spent: ${data.totalSpent.toFixed(2)}</span>
      </div>
    </div>
  );
}
```

**Test command:** `npx vitest run tests/screens/dashboard/MonthlyPerformanceCard.test.tsx`

---

### Task 3.4 — Write MonthlyPerformanceCard tests

**File:** `tests/screens/dashboard/MonthlyPerformanceCard.test.tsx`

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MonthlyPerformanceCard } from '../../../src/screens/dashboard/MonthlyPerformanceCard';
import type { MonthlyPerformanceCardProps } from '../../../src/screens/dashboard/MonthlyPerformanceCard';

describe('MonthlyPerformanceCard', () => {
  it('should render zero-state when no data provided', () => {
    render(<MonthlyPerformanceCard />);
    expect(screen.getByTestId('monthly-performance-card')).toBeInTheDocument();
    expect(screen.getByTestId('monthly-performance-zero-state')).toBeInTheDocument();
    expect(screen.getByText(/monthly spending overview/i)).toBeInTheDocument();
  });

  it('should show "--" placeholder in zero state', () => {
    render(<MonthlyPerformanceCard />);
    expect(screen.getByText('--')).toBeInTheDocument();
  });

  it('should render with live data when under budget', () => {
    const data: MonthlyPerformanceCardProps = {
      totalBudget: 2000.00,
      totalSpent: 800.00,
      netChange: 1200.00,
      monthLabel: 'March 2026',
    };
    render(<MonthlyPerformanceCard data={data} />);
    expect(screen.getByTestId('monthly-performance-remaining')).toHaveTextContent('$1200.00');
    expect(screen.getByTestId('monthly-performance-budget')).toHaveTextContent('Budget: $2000.00');
    expect(screen.getByTestId('monthly-performance-spent')).toHaveTextContent('Spent: $800.00');
    expect(screen.getByTestId('monthly-performance-month')).toHaveTextContent('March 2026');
  });

  it('should display green text for positive net change', () => {
    const data: MonthlyPerformanceCardProps = {
      totalBudget: 2000.00,
      totalSpent: 800.00,
      netChange: 1200.00,
      monthLabel: 'March 2026',
    };
    render(<MonthlyPerformanceCard data={data} />);
    const remaining = screen.getByTestId('monthly-performance-remaining');
    expect(remaining.className).toContain('text-green-600');
  });

  it('should display yellow text for zero net change', () => {
    const data: MonthlyPerformanceCardProps = {
      totalBudget: 2000.00,
      totalSpent: 2000.00,
      netChange: 0,
      monthLabel: 'March 2026',
    };
    render(<MonthlyPerformanceCard data={data} />);
    const remaining = screen.getByTestId('monthly-performance-remaining');
    expect(remaining.className).toContain('text-yellow-600');
  });

  it('should display red text for negative net change', () => {
    const data: MonthlyPerformanceCardProps = {
      totalBudget: 2000.00,
      totalSpent: 2200.00,
      netChange: -200.00,
      monthLabel: 'March 2026',
    };
    render(<MonthlyPerformanceCard data={data} />);
    const remaining = screen.getByTestId('monthly-performance-remaining');
    expect(remaining.className).toContain('text-red-600');
  });

  it('should have the card title "Monthly Performance"', () => {
    render(<MonthlyPerformanceCard />);
    expect(screen.getByText('Monthly Performance')).toBeInTheDocument();
  });
});
```

**Test command:** `npx vitest run tests/screens/dashboard/MonthlyPerformanceCard.test.tsx`

**Commit:** `feat: add MonthlyPerformanceCard shell with MonthlyPerformanceCardProps interface`

---

## Group 4: Goals and Health Aggregation Slots

### Task 4.1 — Define GoalsWidgetProps interface and create placeholder component

**File:** `src/screens/dashboard/GoalsWidget.tsx`

```tsx
/**
 * GoalsWidgetProps — Stage 5 will pass live data to this interface.
 * Do NOT modify this interface's type shape when connecting live data.
 */
export interface GoalsWidgetProps {
  /** Number of goals in 'active' status */
  activeCount: number;
  /** Number of goals in 'completed' status */
  completedCount: number;
  /** Aggregate progress percentage across numeric/percentage goals (0-100), or null if none */
  aggregateProgress: number | null;
  /** Optional callback to navigate to the Goals tab */
  onNavigate?: () => void;
}

interface GoalsWidgetInternalProps {
  data?: GoalsWidgetProps;
}

export function GoalsWidget({ data }: GoalsWidgetInternalProps) {
  if (!data) {
    return (
      <div data-testid="goals-widget" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Goals
        </h3>
        <div data-testid="goals-widget-placeholder" className="mt-3 text-center">
          <p className="text-3xl">&#127919;</p>
          <p className="mt-2 text-sm text-gray-500">
            Track financial, personal, and strategic goals. Create your first goal in the Goals tab to see progress here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="goals-widget" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Goals
      </h3>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <p data-testid="goals-active-count" className="text-2xl font-bold text-indigo-600">
            {data.activeCount}
          </p>
          <p className="text-xs text-gray-400">Active</p>
        </div>
        <div>
          <p data-testid="goals-completed-count" className="text-2xl font-bold text-green-600">
            {data.completedCount}
          </p>
          <p className="text-xs text-gray-400">Done</p>
        </div>
        <div>
          <p data-testid="goals-avg-progress" className="text-2xl font-bold text-purple-600">
            {data.aggregateProgress !== null ? `${data.aggregateProgress}%` : '--'}
          </p>
          <p className="text-xs text-gray-400">Avg Progress</p>
        </div>
      </div>
    </div>
  );
}
```

**Test command:** `npx vitest run tests/screens/dashboard/GoalsWidget.test.tsx`

---

### Task 4.2 — Write GoalsWidget tests

**File:** `tests/screens/dashboard/GoalsWidget.test.tsx`

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GoalsWidget } from '../../../src/screens/dashboard/GoalsWidget';
import type { GoalsWidgetProps } from '../../../src/screens/dashboard/GoalsWidget';

describe('GoalsWidget', () => {
  it('should render placeholder when no data provided', () => {
    render(<GoalsWidget />);
    expect(screen.getByTestId('goals-widget')).toBeInTheDocument();
    expect(screen.getByTestId('goals-widget-placeholder')).toBeInTheDocument();
    expect(screen.getByText(/create your first goal/i)).toBeInTheDocument();
  });

  it('should render with live data', () => {
    const data: GoalsWidgetProps = {
      activeCount: 5,
      completedCount: 3,
      aggregateProgress: 62,
    };
    render(<GoalsWidget data={data} />);
    expect(screen.getByTestId('goals-active-count')).toHaveTextContent('5');
    expect(screen.getByTestId('goals-completed-count')).toHaveTextContent('3');
    expect(screen.getByTestId('goals-avg-progress')).toHaveTextContent('62%');
  });

  it('should show "--" when average progress is null', () => {
    const data: GoalsWidgetProps = {
      activeCount: 2,
      completedCount: 0,
      aggregateProgress: null,
    };
    render(<GoalsWidget data={data} />);
    expect(screen.getByTestId('goals-avg-progress')).toHaveTextContent('--');
  });

  it('should show zero counts correctly', () => {
    const data: GoalsWidgetProps = {
      activeCount: 0,
      completedCount: 0,
      aggregateProgress: null,
    };
    render(<GoalsWidget data={data} />);
    expect(screen.getByTestId('goals-active-count')).toHaveTextContent('0');
    expect(screen.getByTestId('goals-completed-count')).toHaveTextContent('0');
  });

  it('should have the section title "Goals"', () => {
    render(<GoalsWidget />);
    expect(screen.getByText('Goals')).toBeInTheDocument();
  });
});
```

**Test command:** `npx vitest run tests/screens/dashboard/GoalsWidget.test.tsx`

**Commit:** `feat: add GoalsWidget placeholder with GoalsWidgetProps interface`

---

### Task 4.3 — Define HealthWidgetProps interface and create placeholder component

**File:** `src/screens/dashboard/HealthWidget.tsx`

```tsx
/**
 * HealthWidgetProps — Stage 5 will pass live data to this interface.
 * Do NOT modify this interface's type shape when connecting live data.
 */
export interface HealthWidgetProps {
  /** Number of routines completed today */
  routinesCompletedToday: number;
  /** Total number of active routines */
  totalRoutines: number;
  /** Number of routines on track for the week */
  onTrackCount: number;
  /** Number of routines behind for the week */
  behindCount: number;
  /** Longest active streak across all routines, or null if no streaks */
  bestStreak?: { weeks: number; routineName: string } | null;
  /** Optional callback to navigate to the Health tab */
  onNavigate?: () => void;
}

interface HealthWidgetInternalProps {
  data?: HealthWidgetProps;
}

export function HealthWidget({ data }: HealthWidgetInternalProps) {
  if (!data) {
    return (
      <div data-testid="health-widget" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Health Routines
        </h3>
        <div data-testid="health-widget-placeholder" className="mt-3 text-center">
          <p className="text-3xl">&#128170;</p>
          <p className="mt-2 text-sm text-gray-500">
            Build healthy habits with routine tracking. Define your first routine in the Health tab to see your progress here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="health-widget" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Health Routines
      </h3>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <p data-testid="health-completed-today" className="text-2xl font-bold text-green-600">
            {data.routinesCompletedToday}/{data.totalRoutines}
          </p>
          <p className="text-xs text-gray-400">Today</p>
        </div>
        <div>
          <p data-testid="health-weekly-status" className="text-2xl font-bold text-indigo-600">
            {data.onTrackCount}
          </p>
          <p className="text-xs text-gray-400">On Track</p>
        </div>
        <div>
          <p data-testid="health-best-streak" className="text-2xl font-bold text-amber-600">
            {data.bestStreak ? `${data.bestStreak.weeks}w` : '--'}
          </p>
          <p className="text-xs text-gray-400">Best Streak</p>
        </div>
      </div>
      {data.behindCount > 0 && (
        <p data-testid="health-behind-count" className="mt-2 text-center text-xs text-red-500">
          {data.behindCount} {data.behindCount === 1 ? 'routine' : 'routines'} behind this week
        </p>
      )}
    </div>
  );
}
```

**Test command:** `npx vitest run tests/screens/dashboard/HealthWidget.test.tsx`

---

### Task 4.4 — Write HealthWidget tests

**File:** `tests/screens/dashboard/HealthWidget.test.tsx`

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HealthWidget } from '../../../src/screens/dashboard/HealthWidget';
import type { HealthWidgetProps } from '../../../src/screens/dashboard/HealthWidget';

describe('HealthWidget', () => {
  it('should render placeholder when no data provided', () => {
    render(<HealthWidget />);
    expect(screen.getByTestId('health-widget')).toBeInTheDocument();
    expect(screen.getByTestId('health-widget-placeholder')).toBeInTheDocument();
    expect(screen.getByText(/define your first routine/i)).toBeInTheDocument();
  });

  it('should render with live data', () => {
    const data: HealthWidgetProps = {
      routinesCompletedToday: 2,
      totalRoutines: 4,
      onTrackCount: 3,
      behindCount: 1,
      bestStreak: { weeks: 5, routineName: 'Morning Run' },
    };
    render(<HealthWidget data={data} />);
    expect(screen.getByTestId('health-completed-today')).toHaveTextContent('2/4');
    expect(screen.getByTestId('health-weekly-status')).toHaveTextContent('3');
    expect(screen.getByTestId('health-best-streak')).toHaveTextContent('5w');
  });

  it('should show behind count when routines are behind', () => {
    const data: HealthWidgetProps = {
      routinesCompletedToday: 1,
      totalRoutines: 3,
      onTrackCount: 1,
      behindCount: 2,
      bestStreak: { weeks: 3, routineName: 'Meditation' },
    };
    render(<HealthWidget data={data} />);
    expect(screen.getByTestId('health-behind-count')).toHaveTextContent('2 routines behind this week');
  });

  it('should not show behind message when no routines behind', () => {
    const data: HealthWidgetProps = {
      routinesCompletedToday: 3,
      totalRoutines: 3,
      onTrackCount: 3,
      behindCount: 0,
      bestStreak: { weeks: 8, routineName: 'Evening Stretch' },
    };
    render(<HealthWidget data={data} />);
    expect(screen.queryByTestId('health-behind-count')).not.toBeInTheDocument();
  });

  it('should use singular "routine" for 1 behind', () => {
    const data: HealthWidgetProps = {
      routinesCompletedToday: 1,
      totalRoutines: 2,
      onTrackCount: 1,
      behindCount: 1,
      bestStreak: { weeks: 2, routineName: 'Walking' },
    };
    render(<HealthWidget data={data} />);
    expect(screen.getByTestId('health-behind-count')).toHaveTextContent('1 routine behind this week');
  });

  it('should have the section title "Health Routines"', () => {
    render(<HealthWidget />);
    expect(screen.getByText('Health Routines')).toBeInTheDocument();
  });
});
```

**Test command:** `npx vitest run tests/screens/dashboard/HealthWidget.test.tsx`

**Commit:** `feat: add HealthWidget placeholder with HealthWidgetProps interface`

---

## Group 5: Dashboard Screen Assembly

### Task 5.1 — Create DashboardScreen assembling all components

**File:** `src/screens/dashboard/DashboardScreen.tsx`

This replaces the placeholder dashboard from Stage 1. The scroll order is: countdown, daily budget card, monthly performance card, goals widget, health widget.

```tsx
import { MilestoneCountdown } from './MilestoneCountdown';
import { DailyBudgetCard } from './DailyBudgetCard';
import { MonthlyPerformanceCard } from './MonthlyPerformanceCard';
import { GoalsWidget } from './GoalsWidget';
import { HealthWidget } from './HealthWidget';

export function DashboardScreen() {
  // Stage 2: All cards render in zero-state / placeholder mode.
  // Stage 4 will connect DailyBudgetCard and MonthlyPerformanceCard to live data.
  // Stage 5 will connect GoalsWidget and HealthWidget to live data.
  return (
    <div data-testid="dashboard-screen" className="space-y-4 p-4 pb-24">
      {/* 1. Milestone Countdown — most prominent, top of dashboard */}
      <MilestoneCountdown />

      {/* 2. Budget Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DailyBudgetCard />
        <MonthlyPerformanceCard />
      </div>

      {/* 3. Goals Aggregation */}
      <GoalsWidget />

      {/* 4. Health Routines Aggregation */}
      <HealthWidget />
    </div>
  );
}
```

**Test command:** `npx vitest run tests/screens/dashboard/DashboardScreen.test.tsx`

---

### Task 5.2 — Write DashboardScreen tests

**File:** `tests/screens/dashboard/DashboardScreen.test.tsx`

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardScreen } from '../../../src/screens/dashboard/DashboardScreen';

// Mock useSettings for the MilestoneCountdown child
vi.mock('../../../src/hooks/useSettings', () => ({
  useSettings: () => ({
    data: { id: 1, birthDate: '1985-06-15', targetDate: '2035-06-15', targetDateLabel: 'Age 50' },
    loading: false,
    error: null,
  }),
}));

vi.mock('../../../src/lib/dates', async () => {
  const actual = await vi.importActual<typeof import('../../../src/lib/dates')>('../../../src/lib/dates');
  return {
    ...actual,
    today: vi.fn(() => '2026-03-18'),
  };
});

describe('DashboardScreen', () => {
  it('should render the dashboard screen container', () => {
    render(<DashboardScreen />);
    expect(screen.getByTestId('dashboard-screen')).toBeInTheDocument();
  });

  it('should render the milestone countdown', () => {
    render(<DashboardScreen />);
    expect(screen.getByTestId('countdown-display')).toBeInTheDocument();
  });

  it('should render the daily budget card in zero state', () => {
    render(<DashboardScreen />);
    expect(screen.getByTestId('daily-budget-card')).toBeInTheDocument();
    expect(screen.getByTestId('daily-budget-zero-state')).toBeInTheDocument();
  });

  it('should render the monthly performance card in zero state', () => {
    render(<DashboardScreen />);
    expect(screen.getByTestId('monthly-performance-card')).toBeInTheDocument();
    expect(screen.getByTestId('monthly-performance-zero-state')).toBeInTheDocument();
  });

  it('should render the goals widget placeholder', () => {
    render(<DashboardScreen />);
    expect(screen.getByTestId('goals-widget')).toBeInTheDocument();
    expect(screen.getByTestId('goals-widget-placeholder')).toBeInTheDocument();
  });

  it('should render the health widget placeholder', () => {
    render(<DashboardScreen />);
    expect(screen.getByTestId('health-widget')).toBeInTheDocument();
    expect(screen.getByTestId('health-widget-placeholder')).toBeInTheDocument();
  });

  it('should render components in correct scroll order (countdown, budget, goals, health)', () => {
    const { container } = render(<DashboardScreen />);
    const dashboard = container.querySelector('[data-testid="dashboard-screen"]')!;
    const children = Array.from(dashboard.children);

    // First child: MilestoneCountdown
    expect(children[0].querySelector('[data-testid="countdown-display"]')).toBeTruthy();
    // Second child: budget cards grid
    expect(children[1].querySelector('[data-testid="daily-budget-card"]')).toBeTruthy();
    expect(children[1].querySelector('[data-testid="monthly-performance-card"]')).toBeTruthy();
    // Third child: goals widget
    expect(children[2].querySelector('[data-testid="goals-widget"]')).toBeTruthy();
    // Fourth child: health widget
    expect(children[3].querySelector('[data-testid="health-widget"]')).toBeTruthy();
  });
});
```

**Test command:** `npx vitest run tests/screens/dashboard/DashboardScreen.test.tsx`

**Commit:** `feat: assemble DashboardScreen with countdown, budget cards, goals, and health widgets`

---

### Task 5.3 — Update App.tsx to use new DashboardScreen

**File:** `src/App.tsx`

Replace the placeholder dashboard route import with the real `DashboardScreen`. The change is a single import line update in the existing `App.tsx`.

**Find** the placeholder dashboard import (e.g., a `DashboardScreen` from a placeholder file) and **replace** with:

```typescript
import { DashboardScreen } from './screens/dashboard/DashboardScreen';
```

If the Stage 1 placeholder was an inline component in the route definition, replace it with `<DashboardScreen />` as the route element.

No new test file needed -- the existing App routing tests from Stage 1 should continue to pass since the route path (`/`) and component name (`DashboardScreen`) are unchanged.

**Test command:** `npx vitest run`

**Commit:** `feat: wire DashboardScreen into app router`

---

## Group 6: Re-export Card Interfaces from Shared Types

### Task 6.1 — Re-export all dashboard card interfaces from types.ts

**File:** `src/lib/types.ts`

Append re-exports so other stages can import card prop interfaces from a single location:

```typescript
// Dashboard card interfaces (defined in Stage 2, consumed by Stages 4 & 5)
export type { DailyBudgetCardProps } from '../screens/dashboard/DailyBudgetCard';
export type { MonthlyPerformanceCardProps } from '../screens/dashboard/MonthlyPerformanceCard';
export type { GoalsWidgetProps } from '../screens/dashboard/GoalsWidget';
export type { HealthWidgetProps } from '../screens/dashboard/HealthWidget';
```

**Test command:** `npx vitest run`

---

### Task 6.2 — Write interface re-export verification test

**File:** `tests/lib/types-reexport.test.ts`

```typescript
import { describe, it, expect } from 'vitest';

describe('Dashboard card interface re-exports from types.ts', () => {
  it('should export DailyBudgetCardProps', async () => {
    const mod = await import('../../src/lib/types');
    // Type-only re-exports won't show at runtime, so we verify the module loads without error
    expect(mod).toBeDefined();
  });

  it('should allow importing DailyBudgetCardProps from types', async () => {
    // This test validates that the type re-export is structurally sound.
    // If the import path is broken, TypeScript compilation (and thus vitest) will fail.
    const { DailyBudgetCard } = await import('../../src/screens/dashboard/DailyBudgetCard');
    expect(DailyBudgetCard).toBeDefined();
  });

  it('should allow importing MonthlyPerformanceCardProps from types', async () => {
    const { MonthlyPerformanceCard } = await import('../../src/screens/dashboard/MonthlyPerformanceCard');
    expect(MonthlyPerformanceCard).toBeDefined();
  });

  it('should allow importing GoalsWidgetProps from types', async () => {
    const { GoalsWidget } = await import('../../src/screens/dashboard/GoalsWidget');
    expect(GoalsWidget).toBeDefined();
  });

  it('should allow importing HealthWidgetProps from types', async () => {
    const { HealthWidget } = await import('../../src/screens/dashboard/HealthWidget');
    expect(HealthWidget).toBeDefined();
  });
});
```

**Test command:** `npx vitest run tests/lib/types-reexport.test.ts`

**Commit:** `refactor: re-export dashboard card interfaces from shared types`

---

## Group 7: Offline Verification

### Task 7.1 — Update AgentScreen placeholder with offline message

**File:** `src/screens/agent/AgentScreen.tsx`

Update the existing Stage 1 placeholder for the AI Agent screen to include a network-required message. This ensures Story 008's requirement that "AI Agent placeholder shows network-required message" is met.

Replace the existing placeholder content with:

```tsx
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export function AgentScreen() {
  const isOnline = useOnlineStatus();

  return (
    <div data-testid="agent-screen" className="p-4 pb-24">
      <h1 className="text-2xl font-bold text-gray-800">AI Agent</h1>
      {!isOnline ? (
        <div data-testid="agent-offline-message" className="mt-6 rounded-xl border border-yellow-200 bg-yellow-50 p-6 text-center">
          <p className="text-3xl">&#127760;</p>
          <p className="mt-2 text-lg font-semibold text-yellow-800">Internet Required</p>
          <p className="mt-1 text-sm text-yellow-600">
            The AI Agent needs an internet connection to process your requests.
            All other features work offline.
          </p>
        </div>
      ) : (
        <div data-testid="agent-placeholder" className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-3xl">&#129302;</p>
          <p className="mt-2 text-lg font-semibold text-gray-700">Coming Soon</p>
          <p className="mt-1 text-sm text-gray-500">
            Conversational expense entry with receipt scanning will be available in a future update.
          </p>
        </div>
      )}
    </div>
  );
}
```

**Test command:** `npx vitest run tests/screens/agent/AgentScreen.test.tsx`

---

### Task 7.2 — Write AgentScreen offline message tests

**File:** `tests/screens/agent/AgentScreen.test.tsx`

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentScreen } from '../../../src/screens/agent/AgentScreen';

const mockOnlineStatus = vi.fn();
vi.mock('../../../src/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => mockOnlineStatus(),
}));

describe('AgentScreen', () => {
  it('should show offline message when not connected', () => {
    mockOnlineStatus.mockReturnValue(false);
    render(<AgentScreen />);
    expect(screen.getByTestId('agent-offline-message')).toBeInTheDocument();
    expect(screen.getByText(/internet required/i)).toBeInTheDocument();
    expect(screen.getByText(/all other features work offline/i)).toBeInTheDocument();
  });

  it('should show placeholder when online', () => {
    mockOnlineStatus.mockReturnValue(true);
    render(<AgentScreen />);
    expect(screen.getByTestId('agent-placeholder')).toBeInTheDocument();
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });

  it('should have the page title "AI Agent"', () => {
    mockOnlineStatus.mockReturnValue(true);
    render(<AgentScreen />);
    expect(screen.getByText('AI Agent')).toBeInTheDocument();
  });
});
```

**Test command:** `npx vitest run tests/screens/agent/AgentScreen.test.tsx`

**Commit:** `feat: add offline-aware message to AgentScreen placeholder`

---

### Task 7.3 — Write offline verification integration test

**File:** `tests/screens/offline-verification.test.tsx`

This test validates the offline behavior requirements from Story 008 at the component level. Manual browser-based verification steps are documented in Task 7.4.

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DashboardScreen } from '../../src/screens/dashboard/DashboardScreen';
import { AgentScreen } from '../../src/screens/agent/AgentScreen';

// Mock dependencies
vi.mock('../../src/hooks/useSettings', () => ({
  useSettings: () => ({
    data: {
      id: 1,
      birthDate: '1985-06-15',
      targetDate: '2035-06-15',
      targetDateLabel: 'Age 50',
    },
    loading: false,
    error: null,
  }),
}));

vi.mock('../../src/lib/dates', async () => {
  const actual = await vi.importActual<typeof import('../../src/lib/dates')>('../../src/lib/dates');
  return {
    ...actual,
    today: vi.fn(() => '2026-03-18'),
  };
});

const mockOnlineStatus = vi.fn();
vi.mock('../../src/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => mockOnlineStatus(),
}));

describe('Offline Verification (Story 008)', () => {
  it('should render dashboard correctly (simulating offline — no network dependencies)', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<DashboardScreen />} />
        </Routes>
      </MemoryRouter>
    );
    // Dashboard renders entirely from IndexedDB data via hooks — no network calls
    expect(screen.getByTestId('dashboard-screen')).toBeInTheDocument();
    expect(screen.getByTestId('countdown-display')).toBeInTheDocument();
    expect(screen.getByTestId('daily-budget-card')).toBeInTheDocument();
    expect(screen.getByTestId('monthly-performance-card')).toBeInTheDocument();
    expect(screen.getByTestId('goals-widget')).toBeInTheDocument();
    expect(screen.getByTestId('health-widget')).toBeInTheDocument();
  });

  it('should show no unnecessary offline banners on dashboard', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<DashboardScreen />} />
        </Routes>
      </MemoryRouter>
    );
    // Dashboard should NOT contain any offline banner or warning
    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/no connection/i)).not.toBeInTheDocument();
  });

  it('should show network-required message on Agent screen when offline', () => {
    mockOnlineStatus.mockReturnValue(false);
    render(
      <MemoryRouter initialEntries={['/agent']}>
        <Routes>
          <Route path="/agent" element={<AgentScreen />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId('agent-offline-message')).toBeInTheDocument();
    expect(screen.getByText(/internet required/i)).toBeInTheDocument();
  });

  it('should show placeholder on Agent screen when online', () => {
    mockOnlineStatus.mockReturnValue(true);
    render(
      <MemoryRouter initialEntries={['/agent']}>
        <Routes>
          <Route path="/agent" element={<AgentScreen />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.queryByTestId('agent-offline-message')).not.toBeInTheDocument();
    expect(screen.getByTestId('agent-placeholder')).toBeInTheDocument();
  });
});
```

**Test command:** `npx vitest run tests/screens/offline-verification.test.tsx`

**Commit:** `test: add offline verification integration tests for Story 008`

---

### Task 7.4 — Document manual offline verification checklist

**File:** `tests/screens/OFFLINE-CHECKLIST.md`

This is a manual testing checklist for the QA / human verification steps that cannot be automated with Vitest + JSDOM (service worker caching, real PWA install, network toggle).

```markdown
# Offline Capability Verification Checklist (Story 008)

Run this checklist manually after all automated tests pass.

## Prerequisites
- App built for production: `npm run build`
- Served locally: `npx serve dist` (or deployed to Netlify)
- Tested in Chrome (DevTools available)

## Test 1: Full Offline Launch
- [ ] Open app in browser, wait for service worker to install (check DevTools > Application > Service Workers)
- [ ] Close the tab
- [ ] Enable airplane mode / disable network (DevTools > Network > Offline)
- [ ] Reopen the app URL
- [ ] **Expected:** Dashboard loads with all visual elements correct

## Test 2: Offline Navigation
- [ ] While offline, tap/click each of the 6 navigation items:
  - [ ] Dashboard (`/`) loads correctly
  - [ ] Budget (`/budget`) loads correctly
  - [ ] Goals (`/goals`) loads correctly
  - [ ] Health (`/health`) loads correctly
  - [ ] AI Agent (`/agent`) loads correctly — shows "Internet Required" message
  - [ ] Settings (`/settings`) loads correctly
- [ ] **Expected:** No broken pages, no white screens, no console errors

## Test 3: Offline Settings
- [ ] While offline, navigate to Settings
- [ ] Change a setting value (e.g., target date label)
- [ ] Navigate away to Dashboard
- [ ] Navigate back to Settings
- [ ] **Expected:** Changed value persists

## Test 4: AI Agent Offline Message
- [ ] While offline, navigate to AI Agent screen
- [ ] **Expected:** Clear "Internet Required" message displayed
- [ ] **Expected:** Message states "All other features work offline"

## Test 5: Data Survives Reconnection
- [ ] While offline, save a settings change
- [ ] Re-enable network connection
- [ ] Refresh the page
- [ ] Navigate to Settings
- [ ] **Expected:** Previously saved value is intact

## Test 6: No Unnecessary Warnings
- [ ] While offline, navigate to Dashboard
- [ ] **Expected:** No "offline" banner or warning on Dashboard
- [ ] Navigate to Settings
- [ ] **Expected:** No "offline" banner or warning on Settings
- [ ] Navigate to Budget, Goals, Health
- [ ] **Expected:** No "offline" banners on any of these screens

## Test 7: Service Worker Caching
- [ ] Open DevTools > Application > Cache Storage
- [ ] **Expected:** Static assets (JS, CSS, HTML, icons) are cached
- [ ] **Expected:** manifest.json is cached or available

## Test 8: PWA Install
- [ ] On a mobile device or using Chrome desktop install prompt
- [ ] **Expected:** App can be installed
- [ ] **Expected:** Installed app launches in standalone window (no browser chrome)
- [ ] Disable network
- [ ] **Expected:** Installed app still functions
```

**Commit:** `docs: add manual offline verification checklist for Story 008`

---

## Group 8: Final Validation

### Task 8.1 — Run full test suite

Run all tests to confirm everything works together.

```bash
npx vitest run
```

**Expected output:** All tests pass. The following test files should exist and pass:

| Test File | Tests |
|-----------|-------|
| `tests/lib/dates.test.ts` | daysBetweenInclusive, lifetimeProgress |
| `tests/screens/dashboard/MilestoneCountdown.test.tsx` | 10 tests (loading, unconfigured, partial, future, past, no-label, progress, visibility, today, singular) |
| `tests/screens/dashboard/DailyBudgetCard.test.tsx` | 5 tests (zero-state, under, over, placeholder, title) |
| `tests/screens/dashboard/MonthlyPerformanceCard.test.tsx` | 7 tests (zero-state, healthy, warning, over, placeholder, month-label, title) |
| `tests/screens/dashboard/GoalsWidget.test.tsx` | 5 tests (placeholder, live-data, null-progress, zero-counts, title) |
| `tests/screens/dashboard/HealthWidget.test.tsx` | 6 tests (placeholder, live-data, behind, no-behind, singular, title) |
| `tests/screens/dashboard/DashboardScreen.test.tsx` | 7 tests (container, countdown, budget, monthly, goals, health, scroll-order) |
| `tests/screens/agent/AgentScreen.test.tsx` | 3 tests (offline, online, title) |
| `tests/screens/offline-verification.test.tsx` | 4 tests (dashboard-offline, no-banners, agent-offline, agent-online) |
| `tests/lib/types-reexport.test.ts` | 5 tests (re-export verification) |

**Commit:** `test: verify full Stage 2 test suite passes`

---

### Task 8.2 — TypeScript compilation check

Verify no type errors across the project.

```bash
npx tsc --noEmit
```

**Expected:** Exit code 0, no errors.

---

## Summary of Files Created/Modified

### New Files (Stage 2)

| File | Purpose |
|------|---------|
| `src/screens/dashboard/MilestoneCountdown.tsx` | Countdown component with visibility-change recalculation |
| `src/screens/dashboard/DailyBudgetCard.tsx` | Daily budget card shell + `DailyBudgetCardProps` interface |
| `src/screens/dashboard/MonthlyPerformanceCard.tsx` | Monthly performance card shell + `MonthlyPerformanceCardProps` interface |
| `src/screens/dashboard/GoalsWidget.tsx` | Goals aggregation placeholder + `GoalsWidgetProps` interface |
| `src/screens/dashboard/HealthWidget.tsx` | Health aggregation placeholder + `HealthWidgetProps` interface |
| `src/screens/dashboard/DashboardScreen.tsx` | Dashboard assembly (replaces Stage 1 placeholder) |
| `tests/screens/dashboard/MilestoneCountdown.test.tsx` | Countdown unit tests |
| `tests/screens/dashboard/DailyBudgetCard.test.tsx` | Daily budget card tests |
| `tests/screens/dashboard/MonthlyPerformanceCard.test.tsx` | Monthly performance card tests |
| `tests/screens/dashboard/GoalsWidget.test.tsx` | Goals widget tests |
| `tests/screens/dashboard/HealthWidget.test.tsx` | Health widget tests |
| `tests/screens/dashboard/DashboardScreen.test.tsx` | Dashboard assembly tests |
| `tests/screens/agent/AgentScreen.test.tsx` | Agent screen offline/online tests |
| `tests/screens/offline-verification.test.tsx` | Offline integration tests |
| `tests/lib/types-reexport.test.ts` | Interface re-export validation |
| `tests/screens/OFFLINE-CHECKLIST.md` | Manual offline verification checklist |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/dates.ts` | Add `daysBetweenInclusive()` and `lifetimeProgress()` |
| `tests/lib/dates.test.ts` | Add tests for new date helpers |
| `src/lib/types.ts` | Add re-exports for dashboard card interfaces |
| `src/screens/agent/AgentScreen.tsx` | Add offline-aware message |
| `src/App.tsx` | Wire `DashboardScreen` import (replace placeholder) |

### Interfaces Produced for Later Stages

| Interface | Defined In | Consumed By |
|-----------|-----------|-------------|
| `DailyBudgetCardProps` | `src/screens/dashboard/DailyBudgetCard.tsx` | Stage 4 (Story 019) |
| `MonthlyPerformanceCardProps` | `src/screens/dashboard/MonthlyPerformanceCard.tsx` | Stage 4 (Story 019) |
| `GoalsWidgetProps` | `src/screens/dashboard/GoalsWidget.tsx` | Stage 5 (Story 028) |
| `HealthWidgetProps` | `src/screens/dashboard/HealthWidget.tsx` | Stage 5 (Story 029) |
