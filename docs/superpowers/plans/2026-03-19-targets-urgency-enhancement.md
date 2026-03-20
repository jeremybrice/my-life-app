# Targets Rename + Urgency-Sorted Cards + Risk Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename "Goals" to "Targets" across the entire app, add urgency-based sorting with colored heat indicators to target cards, and upgrade the dashboard widget from passive counters to a risk-scored summary (red/yellow/green).

**Architecture:** Three layers of change: (1) a pure utility module for urgency calculation that all consumers share, (2) UI updates to GoalCard, GoalsScreen, and GoalsWidget to use urgency colors and sorting, (3) string/label renames from "Goals" to "Targets" across nav, headings, agent pipeline, and prompts. Data model and service layer remain unchanged — "goal" stays as the internal domain term in code, only user-facing strings change.

**Tech Stack:** React, TypeScript, Tailwind CSS (with existing design tokens: `danger-*`, `warning-*`, `success-*`), Dexie (IndexedDB), Vitest

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/lib/urgency.ts` | Pure urgency calculation: score, color tier, sort comparator |
| Create | `tests/lib/urgency.test.ts` | Unit tests for urgency logic |
| Modify | `src/screens/goals/GoalCard.tsx` | Add urgency color strip + colored countdown chip |
| Modify | `tests/screens/goals/GoalsScreen.test.tsx` | Update test assertions for "Targets" heading |
| Modify | `src/screens/goals/GoalsScreen.tsx` | Rename heading, button text; sort by urgency |
| Modify | `src/hooks/useGoals.ts` | Add urgency-based sort option |
| Modify | `src/data/goal-service.ts` | Add risk aggregation to `GoalAggregation` |
| Modify | `tests/data/goal-service.test.ts` | Test new risk aggregation fields |
| Modify | `src/hooks/useGoals.ts` | Expose risk aggregation from updated service |
| Modify | `src/screens/dashboard/GoalsWidget.tsx` | Risk-scored display (red/yellow/green counts) |
| Modify | `src/screens/dashboard/GoalsWidgetContainer.tsx` | Pass risk data |
| Modify | `tests/screens/dashboard/GoalsWidget.test.tsx` | Test new risk display |
| Modify | `src/lib/constants.ts` | Rename nav label "Goals" → "Targets" |
| Modify | `src/screens/agent/pipelines.ts` | Rename pipeline strings |
| Modify | `src/services/agent-prompts.ts` | Update GOALS_SYSTEM_PROMPT wording |
| Modify | `src/services/goals-parser.ts` | Update context strings ("No goals defined" → "No targets defined") |
| Modify | `src/screens/goals/GoalForm.tsx` | Rename heading strings |
| Modify | `src/screens/goals/GoalDetail.tsx` | Rename heading strings |
| Modify | `src/screens/goals/GoalsScreenContainer.tsx` | No structural changes (labels are in children) |

---

## Task 1: Urgency Calculation Utility

**Files:**
- Create: `src/lib/urgency.ts`
- Create: `tests/lib/urgency.test.ts`

This is the foundation — a pure function module with zero dependencies that every other task builds on.

**Urgency rules:**
- **Date-based targets:** `daysRemaining` drives everything. ≤ 0 days (today or overdue) = `critical` (red), 1–7 days = `warning` (yellow/orange), > 7 days = `normal` (green).
- **Numeric targets:** Always `normal` (no time-based urgency without a date).
- **Percentage targets:** Always `normal` (same reasoning).
- **Freeform targets:** Always `normal` (no calculable urgency).
- **Completed/archived targets:** Always `none` (no urgency strip shown).

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/lib/urgency.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getUrgencyTier, getUrgencySortScore, sortByUrgency } from '@/lib/urgency';
import type { Goal } from '@/lib/types';

function makeGoal(overrides: Partial<Goal>): Goal {
  return {
    id: 1,
    title: 'Test',
    type: 'strategic',
    progressModel: 'date-based',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('getUrgencyTier', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns critical for date-based target due today', () => {
    const goal = makeGoal({ targetDate: '2026-03-19' });
    expect(getUrgencyTier(goal)).toBe('critical');
  });

  it('returns critical for overdue date-based target', () => {
    const goal = makeGoal({ targetDate: '2026-03-17' });
    expect(getUrgencyTier(goal)).toBe('critical');
  });

  it('returns warning for target due tomorrow', () => {
    const goal = makeGoal({ targetDate: '2026-03-20' });
    expect(getUrgencyTier(goal)).toBe('warning');
  });

  it('returns warning for target due in 5 days', () => {
    const goal = makeGoal({ targetDate: '2026-03-24' });
    expect(getUrgencyTier(goal)).toBe('warning');
  });

  it('returns warning for target due in 7 days', () => {
    const goal = makeGoal({ targetDate: '2026-03-26' });
    expect(getUrgencyTier(goal)).toBe('warning');
  });

  it('returns normal for target due in 8 days', () => {
    const goal = makeGoal({ targetDate: '2026-03-27' });
    expect(getUrgencyTier(goal)).toBe('normal');
  });

  it('returns normal for target due in 20 days', () => {
    const goal = makeGoal({ targetDate: '2026-04-08' });
    expect(getUrgencyTier(goal)).toBe('normal');
  });

  it('returns none for completed target', () => {
    const goal = makeGoal({ status: 'completed', targetDate: '2026-03-19' });
    expect(getUrgencyTier(goal)).toBe('none');
  });

  it('returns none for archived target', () => {
    const goal = makeGoal({ status: 'archived', targetDate: '2026-03-19' });
    expect(getUrgencyTier(goal)).toBe('none');
  });

  it('returns normal for freeform target', () => {
    const goal = makeGoal({ progressModel: 'freeform', statusLabel: 'In progress' });
    expect(getUrgencyTier(goal)).toBe('normal');
  });

  it('returns normal for numeric target with high progress', () => {
    const goal = makeGoal({ progressModel: 'numeric', targetValue: 100, currentValue: 95 });
    expect(getUrgencyTier(goal)).toBe('normal');
  });

  it('returns normal for percentage target at 80%', () => {
    const goal = makeGoal({ progressModel: 'percentage', percentage: 80 });
    expect(getUrgencyTier(goal)).toBe('normal');
  });
});

describe('sortByUrgency', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sorts critical before warning before normal', () => {
    const critical = makeGoal({ id: 1, title: 'A', targetDate: '2026-03-19' });
    const warning = makeGoal({ id: 2, title: 'B', targetDate: '2026-03-24' });
    const normal = makeGoal({ id: 3, title: 'C', targetDate: '2026-04-20' });
    const sorted = sortByUrgency([normal, critical, warning]);
    expect(sorted.map((g) => g.id)).toEqual([1, 2, 3]);
  });

  it('sorts overdue before due-today', () => {
    const overdue = makeGoal({ id: 1, targetDate: '2026-03-15' });
    const today = makeGoal({ id: 2, targetDate: '2026-03-19' });
    const sorted = sortByUrgency([today, overdue]);
    expect(sorted.map((g) => g.id)).toEqual([1, 2]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/lib/urgency.test.ts`
Expected: FAIL — module `@/lib/urgency` does not exist

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/urgency.ts
import type { Goal } from '@/lib/types';

export type UrgencyTier = 'critical' | 'warning' | 'normal' | 'none';

/**
 * Returns the urgency tier for a target based on its progress model and status.
 */
export function getUrgencyTier(goal: Goal): UrgencyTier {
  if (goal.status === 'completed' || goal.status === 'archived') {
    return 'none';
  }

  switch (goal.progressModel) {
    case 'date-based': {
      if (!goal.targetDate) return 'normal';
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      // Parse as local time to avoid UTC timezone offset issues
      const target = new Date(goal.targetDate + 'T00:00:00');
      const diffMs = target.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) return 'critical';  // today or overdue
      if (diffDays <= 7) return 'warning';   // 1-7 days out
      return 'normal';
    }
    case 'numeric':
    case 'percentage':
    case 'freeform':
    default:
      return 'normal';
  }
}

/**
 * Returns a numeric sort score (lower = more urgent).
 * Used for sorting targets by urgency within the list.
 */
export function getUrgencySortScore(goal: Goal): number {
  if (goal.status === 'completed' || goal.status === 'archived') {
    return 9999;
  }

  if (goal.progressModel === 'date-based' && goal.targetDate) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    // Parse as local time to avoid UTC timezone offset issues
    const target = new Date(goal.targetDate + 'T00:00:00');
    const diffMs = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    // Overdue sorts first (negative days become very low scores)
    return diffDays;
  }

  // Non-date targets sort after date-based ones
  return 5000;
}

/**
 * Sorts targets by urgency (most urgent first).
 * Returns a new array — does not mutate input.
 */
export function sortByUrgency(goals: Goal[]): Goal[] {
  return [...goals].sort((a, b) => getUrgencySortScore(a) - getUrgencySortScore(b));
}

/** Tailwind classes for the left border urgency strip on cards. */
export const URGENCY_STRIP_CLASSES: Record<UrgencyTier, string> = {
  critical: 'border-l-danger-500',
  warning: 'border-l-warning-500',
  normal: 'border-l-success-500',
  none: 'border-l-transparent',
};

/** Tailwind classes for the countdown text color. */
export const URGENCY_TEXT_CLASSES: Record<UrgencyTier, string> = {
  critical: 'text-danger-600',
  warning: 'text-warning-600',
  normal: 'text-fg-secondary',
  none: 'text-fg-secondary',
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/lib/urgency.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/urgency.ts tests/lib/urgency.test.ts
git commit -m "feat: add urgency calculation utility for targets"
```

---

## Task 2: Add Urgency Color Strip + Colored Countdown to GoalCard

**Files:**
- Modify: `src/screens/goals/GoalCard.tsx`

The card gets a thin 3px colored bar on the left edge (using `border-l-[3px]`) and the countdown text gets color-coded to match urgency.

- [ ] **Step 1: Update GoalCard with urgency indicators**

In `src/screens/goals/GoalCard.tsx`:

1. Import urgency utils:
```typescript
import { getUrgencyTier, URGENCY_STRIP_CLASSES, URGENCY_TEXT_CLASSES } from '@/lib/urgency';
```

2. In the `GoalProgressIndicator` component, update the `date-based` case to use urgency colors. Replace the existing `case 'date-based'` block (lines 34–49) with:

```typescript
    case 'date-based': {
      if (!goal.targetDate) return null;
      // Parse as local time to avoid UTC timezone offset issues
      const target = new Date(goal.targetDate + 'T00:00:00');
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const diffMs = target.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const tier = getUrgencyTier(goal);
      const textClass = URGENCY_TEXT_CLASSES[tier];
      return (
        <div className={`text-sm font-medium ${textClass}`}>
          {diffDays > 0
            ? `${diffDays} day${diffDays !== 1 ? 's' : ''} remaining`
            : diffDays === 0
              ? 'Due today'
              : `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} overdue`}
        </div>
      );
    }
```

3. In the main `GoalCard` component, compute the urgency tier and add the left border strip. Replace the `<button>` element's className (line 99) to include the urgency strip:

```typescript
export default function GoalCard({ goal, onSelect }: GoalCardProps) {
  const isCompleted = goal.status === 'completed';
  const isArchived = goal.status === 'archived';
  const tier = getUrgencyTier(goal);
  const stripClass = URGENCY_STRIP_CLASSES[tier];

  return (
    <button
      type="button"
      onClick={() => onSelect(goal)}
      className={`w-full rounded-lg border p-4 text-left transition-colors hover:bg-surface-hover border-l-[3px] ${
        isCompleted
          ? 'border-green-200 bg-green-50 opacity-75 border-l-green-400'
          : isArchived
            ? 'border-edge bg-surface-secondary opacity-60 border-l-transparent'
            : `border-edge bg-surface-card ${stripClass}`
      }`}
      data-testid={`goal-card-${goal.id}`}
    >
```

Note: `URGENCY_STRIP_CLASSES` now directly contains `border-l-*` classes (e.g., `border-l-danger-500`), ensuring Tailwind's static scanner detects them. The design tokens define `danger-500`, `warning-500`, `success-500` in `@theme` which makes these classes available.

- [ ] **Step 2: Verify visually and run existing tests**

Run: `npx vitest run tests/screens/goals/`
Expected: Existing GoalCard-related tests still pass. (No dedicated GoalCard test file exists, but GoalsScreen tests render cards.)

- [ ] **Step 3: Commit**

```bash
git add src/screens/goals/GoalCard.tsx
git commit -m "feat: add urgency color strip and colored countdown to target cards"
```

---

## Task 3: Urgency-Based Sort in GoalsScreen

**Files:**
- Modify: `src/screens/goals/GoalsScreen.tsx`
- Modify: `src/hooks/useGoals.ts`

Active targets should sort by urgency (most urgent first) by default instead of `updatedAt` descending.

- [ ] **Step 1: Update useGoals hook to sort by urgency**

In `src/hooks/useGoals.ts`, add urgency sort for active goals. Import `sortByUrgency` and apply it when status is `'active'` or undefined:

```typescript
import { sortByUrgency } from '@/lib/urgency';
```

Replace the sort logic inside `useLiveQuery` (line 50):

```typescript
      // Sort active goals by urgency; others by updatedAt descending
      if (!status || status === 'active') {
        result = sortByUrgency(result);
      } else {
        result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      }
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run tests/hooks/useGoals.test.ts`
Expected: PASS (if existing tests don't assert specific sort order of active goals, they should still pass; if they do, update expected order)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useGoals.ts
git commit -m "feat: sort active targets by urgency (most urgent first)"
```

---

## Task 4: Risk-Scored Dashboard Widget

**Files:**
- Modify: `src/data/goal-service.ts` — add risk counts to `GoalAggregation`
- Modify: `tests/data/goal-service.test.ts` — test risk counts
- Modify: `src/hooks/useGoals.ts` — expose new fields
- Modify: `src/screens/dashboard/GoalsWidget.tsx` — new risk display
- Modify: `src/screens/dashboard/GoalsWidgetContainer.tsx` — pass new fields
- Modify: `tests/screens/dashboard/GoalsWidget.test.tsx` — test new display

### Step 1: Extend GoalAggregation with risk counts

- [ ] **Step 1a: Write failing test for risk aggregation**

Add to `tests/data/goal-service.test.ts`:

```typescript
import { getUrgencyTier } from '@/lib/urgency';

// In the describe('getGoalAggregation') block, add:
it('returns risk counts for active goals', async () => {
  // Create goals with different urgency levels
  await createGoal({
    title: 'Due tomorrow',
    type: 'strategic',
    progressModel: 'date-based',
    targetDate: /* tomorrow's date ISO string */,
  });
  await createGoal({
    title: 'Due in 5 days',
    type: 'strategic',
    progressModel: 'date-based',
    targetDate: /* 5 days from now ISO string */,
  });
  await createGoal({
    title: 'Due in 30 days',
    type: 'strategic',
    progressModel: 'date-based',
    targetDate: /* 30 days from now ISO string */,
  });

  const agg = await getGoalAggregation();
  expect(agg.criticalCount).toBe(1);
  expect(agg.warningCount).toBe(1);
  expect(agg.normalCount).toBe(1);
});
```

- [ ] **Step 1b: Run test to verify it fails**

Run: `npx vitest run tests/data/goal-service.test.ts -t "risk counts"`
Expected: FAIL — `criticalCount` property does not exist

- [ ] **Step 1c: Update GoalAggregation interface and implementation**

In `src/data/goal-service.ts`:

1. Import urgency:
```typescript
import { getUrgencyTier } from '@/lib/urgency';
```

2. Update the interface (around line 342):
```typescript
export interface GoalAggregation {
  activeCount: number;
  completedCount: number;
  aggregateProgress: number | null;
  criticalCount: number;
  warningCount: number;
  normalCount: number;
}
```

3. Update `getGoalAggregation()` to compute risk counts (after line 351):
```typescript
  // Count by urgency tier
  let criticalCount = 0;
  let warningCount = 0;
  let normalCount = 0;

  for (const goal of activeGoals) {
    const tier = getUrgencyTier(goal);
    if (tier === 'critical') criticalCount++;
    else if (tier === 'warning') warningCount++;
    else normalCount++;
  }
```

4. Add to return value:
```typescript
  return {
    activeCount: activeGoals.length,
    completedCount: completedGoals.length,
    aggregateProgress,
    criticalCount,
    warningCount,
    normalCount,
  };
```

- [ ] **Step 1d: Run test to verify it passes**

Run: `npx vitest run tests/data/goal-service.test.ts`
Expected: PASS

- [ ] **Step 1e: Commit**

```bash
git add src/data/goal-service.ts tests/data/goal-service.test.ts
git commit -m "feat: add risk counts (critical/warning/normal) to goal aggregation"
```

### Step 2: Update useGoals hook defaults

- [ ] **Step 2a: Update useGoalAggregation default**

In `src/hooks/useGoals.ts`, update the `defaultAgg` (around line 79):

```typescript
  const defaultAgg: GoalAggregation = {
    activeCount: 0,
    completedCount: 0,
    aggregateProgress: null,
    criticalCount: 0,
    warningCount: 0,
    normalCount: 0,
  };
```

- [ ] **Step 2b: Run hook tests**

Run: `npx vitest run tests/hooks/useGoals.test.ts`
Expected: PASS

- [ ] **Step 2c: Commit**

```bash
git add src/hooks/useGoals.ts
git commit -m "feat: expose risk counts in useGoalAggregation hook"
```

### Step 3: Update GoalsWidget UI

- [ ] **Step 3a: Rewrite GoalsWidget tests for new risk display**

Replace the entire contents of `tests/screens/dashboard/GoalsWidget.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GoalsWidget } from '../../../src/screens/dashboard/GoalsWidget';
import type { GoalsWidgetProps } from '../../../src/screens/dashboard/GoalsWidget';

describe('GoalsWidget', () => {
  it('should render placeholder when no data provided', () => {
    render(<GoalsWidget />);
    expect(screen.getByTestId('goals-widget')).toBeInTheDocument();
    expect(screen.getByTestId('goals-widget-placeholder')).toBeInTheDocument();
    expect(screen.getByText(/create your first target/i)).toBeInTheDocument();
  });

  it('should render risk counts with live data', () => {
    const data: GoalsWidgetProps = {
      activeCount: 5,
      completedCount: 3,
      aggregateProgress: 62,
      criticalCount: 1,
      warningCount: 2,
      normalCount: 2,
    };
    render(<GoalsWidget data={data} />);
    expect(screen.getByTestId('targets-critical-count')).toHaveTextContent('1');
    expect(screen.getByTestId('targets-warning-count')).toHaveTextContent('2');
    expect(screen.getByTestId('targets-normal-count')).toHaveTextContent('2');
  });

  it('should show completed count when completedCount > 0', () => {
    const data: GoalsWidgetProps = {
      activeCount: 2,
      completedCount: 3,
      aggregateProgress: null,
      criticalCount: 0,
      warningCount: 1,
      normalCount: 1,
    };
    render(<GoalsWidget data={data} />);
    expect(screen.getByText('3 completed')).toBeInTheDocument();
  });

  it('should show zero counts correctly', () => {
    const data: GoalsWidgetProps = {
      activeCount: 0,
      completedCount: 0,
      aggregateProgress: null,
      criticalCount: 0,
      warningCount: 0,
      normalCount: 0,
    };
    render(<GoalsWidget data={data} />);
    expect(screen.getByTestId('targets-critical-count')).toHaveTextContent('0');
    expect(screen.getByTestId('targets-warning-count')).toHaveTextContent('0');
    expect(screen.getByTestId('targets-normal-count')).toHaveTextContent('0');
  });

  it('should have the section title "Targets"', () => {
    render(<GoalsWidget />);
    expect(screen.getByText('Targets')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3b: Run tests to verify they fail (widget not yet updated)**

Run: `npx vitest run tests/screens/dashboard/GoalsWidget.test.tsx`
Expected: FAIL — new test IDs and prop fields don't exist yet

- [ ] **Step 3c: Update GoalsWidgetProps and component**

In `src/screens/dashboard/GoalsWidget.tsx`:

1. Update the props interface:
```typescript
export interface GoalsWidgetProps {
  activeCount: number;
  completedCount: number;
  aggregateProgress: number | null;
  criticalCount: number;
  warningCount: number;
  normalCount: number;
  onNavigate?: () => void;
}
```

2. Replace the 3-column grid display (lines 42–61) with risk-scored columns:

```typescript
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <p data-testid="targets-critical-count" className="text-2xl font-bold text-danger-600">
            {data.criticalCount}
          </p>
          <p className="text-xs text-fg-muted">Urgent</p>
        </div>
        <div>
          <p data-testid="targets-warning-count" className="text-2xl font-bold text-warning-600">
            {data.warningCount}
          </p>
          <p className="text-xs text-fg-muted">Soon</p>
        </div>
        <div>
          <p data-testid="targets-normal-count" className="text-2xl font-bold text-success-600">
            {data.normalCount}
          </p>
          <p className="text-xs text-fg-muted">On Track</p>
        </div>
      </div>
      {data.completedCount > 0 && (
        <p className="mt-2 text-center text-xs text-fg-muted">
          {data.completedCount} completed
        </p>
      )}
```

3. Update the widget heading from "Goals" to "Targets":
```typescript
        <h3 className="text-sm font-semibold uppercase tracking-wide text-fg-muted">
          Targets
        </h3>
```

4. Update placeholder text to:
```typescript
        <p className="mt-2 text-sm text-fg-muted">
          Track financial, personal, and strategic targets. Create your first target in the Targets tab to see progress here.
        </p>
```

- [ ] **Step 3d: Update GoalsWidgetContainer to pass new fields**

In `src/screens/dashboard/GoalsWidgetContainer.tsx`:

```typescript
      <GoalsWidget
        data={{
          activeCount: aggregation.activeCount,
          completedCount: aggregation.completedCount,
          aggregateProgress: aggregation.aggregateProgress,
          criticalCount: aggregation.criticalCount,
          warningCount: aggregation.warningCount,
          normalCount: aggregation.normalCount,
          onNavigate: () => navigate('/goals'),
        }}
      />
```

- [ ] **Step 3e: Run tests**

Run: `npx vitest run tests/screens/dashboard/GoalsWidget.test.tsx`
Expected: All 5 tests PASS

- [ ] **Step 3f: Commit**

```bash
git add src/screens/dashboard/GoalsWidget.tsx src/screens/dashboard/GoalsWidgetContainer.tsx tests/screens/dashboard/GoalsWidget.test.tsx
git commit -m "feat: update dashboard widget with risk-scored target counts"
```

---

## Task 5: Rename "Goals" → "Targets" Across the App

**Files:**
- Modify: `src/lib/constants.ts` — nav label
- Modify: `src/screens/goals/GoalsScreen.tsx` — heading + button text + loading/error strings
- Modify: `src/screens/goals/GoalForm.tsx` — heading + button + error strings
- Modify: `src/screens/goals/GoalDetail.tsx` — back link, dialogs, error messages
- Modify: `src/screens/agent/pipelines.ts` — pipeline title, description, messages
- Modify: `src/services/agent-prompts.ts` — system prompt wording
- Modify: `src/services/goals-parser.ts` — context builder strings
- Modify: `tests/screens/goals/GoalsScreen.test.tsx` — update assertions

This task is purely string replacements — no logic changes.

- [ ] **Step 1: Update nav label**

In `src/lib/constants.ts` line 27, change:
```typescript
  { path: ROUTES.GOALS, label: 'Targets', icon: 'target' },
```

- [ ] **Step 2: Update GoalsScreen heading, button, and status strings**

In `src/screens/goals/GoalsScreen.tsx`:
- Line 42: `"Loading goals..."` → `"Loading targets..."`
- Line 48: `"Could not load your goals."` → `"Could not load your targets."`
- Line 57: `"Goals"` → `"Targets"`
- Line 64: `"+ New Goal"` → `"+ New Target"`
- Line 105: `"No goals yet"` → `"No targets yet"`
- Line 106: `"Create your first goal to get started!"` → `"Create your first target to get started!"`
- Line 107: `'Create Goal'` → `'Create Target'`
- Line 110: `"No goals match"` → `"No targets match"`
- Line 111: `"No goals match the selected filters."` → `"No targets match the selected filters."`

- [ ] **Step 3: Update GoalForm heading and strings**

In `src/screens/goals/GoalForm.tsx`:
- Line 124: `'Failed to create goal'` → `'Failed to create target'`
- Line 254: `"Create Goal"` → `"Create Target"` (heading)
- Line 364: `'Create Goal'` → `'Create Target'` (submit button)

- [ ] **Step 4: Update GoalDetail strings**

In `src/screens/goals/GoalDetail.tsx`:
- Line 128: `'Could not complete goal'` → `'Could not complete target'`
- Line 137: `'Could not archive goal'` → `'Could not archive target'`
- Line 144: `'Could not reactivate goal'` → `'Could not reactivate target'`
- Line 153: `'Could not delete goal'` → `'Could not delete target'`
- Line 312: `"Back to Goals"` → `"Back to Targets"`
- Line 386: `"mark this goal as complete"` → `"mark this target as complete"`
- Line 494: `"Delete Goal"` → `"Delete Target"` (dialog title)
- Line 505: `"Goal Target Reached!"` → `"Target Reached!"` (dialog title)
- Line 506: `"reached the target for"` — keep as-is (the word "target" here refers to the value target, not the renamed concept)

- [ ] **Step 5: Update goals-parser context strings**

In `src/services/goals-parser.ts`:
- Line 152: `'No goals defined yet.'` → `'No targets defined yet.'`
- Line 155: `'Active and recent goals:'` → `'Active and recent targets:'`

- [ ] **Step 6: Update agent pipeline strings**

In `src/screens/agent/pipelines.ts` (lines 56–67):
```typescript
  {
    id: 'goals',
    title: 'Targets',
    description: 'Create targets, log progress, and check your status',
    icon: 'target',
    welcomeMessage:
      "I can help you create targets, log progress, or check how you're doing. Try \"how close am I to my savings target?\" or \"add $200 to my savings target.\"",
    categoryLabel: 'Targets',
    categoryDescription:
      'Create targets, update progress, or check your status.',
    supportsImageUpload: false,
    inputPlaceholder: 'Ask about targets or log progress...',
  },
```

- [ ] **Step 7: Update agent system prompt**

In `src/services/agent-prompts.ts`, update `GOALS_SYSTEM_PROMPT`:
- Replace user-facing mentions of "goal" with "target" in the prompt text (e.g., "create a goal" → "create a target", "goal-tracking assistant" → "target-tracking assistant")
- Keep the JSON field names (`goal-create`, `goalId`, `goalTitle`, etc.) unchanged — these are internal API contracts

- [ ] **Step 8: Update test assertions**

In `tests/screens/goals/GoalsScreen.test.tsx`, update any assertions that check for "Goals" heading text to check for "Targets" instead.

- [ ] **Step 9: Run all goal-related tests**

Run: `npx vitest run tests/screens/goals/ tests/screens/dashboard/GoalsWidget.test.tsx tests/data/goal-service.test.ts tests/hooks/useGoals.test.ts tests/lib/urgency.test.ts`
Expected: All PASS

- [ ] **Step 10: Commit**

```bash
git add src/lib/constants.ts src/screens/goals/GoalsScreen.tsx src/screens/goals/GoalForm.tsx src/screens/goals/GoalDetail.tsx src/screens/agent/pipelines.ts src/services/agent-prompts.ts src/services/goals-parser.ts tests/screens/goals/GoalsScreen.test.tsx
git commit -m "feat: rename Goals to Targets across UI, nav, and agent pipeline"
```

---

## Task 6: Final Integration Test

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: All tests pass. If any tests reference "Goals" in assertions or snapshots, update them.

- [ ] **Step 2: Fix any broken tests**

Address any remaining test failures from the rename or structural changes.

- [ ] **Step 3: Final commit if needed**

```bash
git add -A
git commit -m "fix: update remaining test assertions for targets rename"
```

- [ ] **Step 4: Push to feature branch**

```bash
git push -u origin claude/goals-feature-brainstorm-xvTtd
```
