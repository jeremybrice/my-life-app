# Stage 5: Goals & Health Routines Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build goals management with flexible progress models and health routine tracking with streak calculation, both integrating to the dashboard.

**Architecture:** Two independent module tracks (Goals and Health) following the same service -> hook -> screen pattern as Budget. Services are framework-agnostic. Dashboard widgets consume prop interfaces defined in Stage 2.

**Tech Stack:** React, TypeScript, Dexie.js (useLiveQuery), Vitest, React Testing Library

**Depends on:** Stage 1 (Dexie DB, lib utilities), Stage 2 (dashboard widget interfaces)
**Produces for later stages:** goal-service.ts, health-service.ts (Stage 7 export/import includes this data)

---

## Pre-flight Check

Before starting any task, verify these files exist from earlier stages:

- `src/data/db.ts` -- Dexie DB with `goals`, `healthRoutines`, `healthLogEntries` tables
- `src/lib/types.ts` -- shared TypeScript interfaces (Goal, HealthRoutine, HealthLogEntry, TrackedMetric)
- `src/lib/dates.ts` -- date helpers including `today()`, `weekStart()`, `daysBetween()`
- `src/components/EmptyState.tsx` -- reusable empty state component
- `src/components/ConfirmDialog.tsx` -- reusable confirmation modal
- `src/components/LoadingSpinner.tsx` -- reusable loading indicator
- `tests/setup.ts` -- test setup with `fake-indexeddb/auto`

The dashboard from Stage 2 should already render placeholder widgets for Goals and Health with these prop interfaces:

```typescript
// Already defined in Stage 2 dashboard components
interface GoalsWidgetProps {
  activeCount: number;
  completedCount: number;
  aggregateProgress: number | null; // null when no calculable goals
  onNavigate: () => void;
}

interface HealthWidgetProps {
  routinesCompletedToday: number;
  totalRoutines: number;
  onTrackCount: number;
  behindCount: number;
  bestStreak: { weeks: number; routineName: string } | null;
  onNavigate: () => void;
}
```

---

# Track A: Goals (Stories 020-023, 028)

---

## Task A1: Goal service -- input types and validation helpers

**File:** `src/data/goal-service.ts`
**Test file:** `tests/data/goal-service.test.ts`
**Time:** 5 min

Write the input types and internal validation, then the first test file skeleton.

### A1.1 Create the goal service file with types and validation

**File:** `src/data/goal-service.ts`

```typescript
import { db } from './db';
import type { Goal } from './db';

// --- Input types ---

export interface CreateGoalInput {
  title: string;
  type: Goal['type'];
  progressModel: Goal['progressModel'];
  targetValue?: number;
  currentValue?: number;
  targetDate?: string;
  percentage?: number;
  statusLabel?: string;
  description?: string;
}

export interface UpdateGoalInput {
  title?: string;
  type?: Goal['type'];
  description?: string;
  targetValue?: number;
  currentValue?: number;
  targetDate?: string;
  percentage?: number;
  statusLabel?: string;
}

// --- Constants ---

const VALID_TYPES: Goal['type'][] = ['financial', 'personal', 'strategic', 'custom'];
const VALID_PROGRESS_MODELS: Goal['progressModel'][] = ['numeric', 'date-based', 'percentage', 'freeform'];
const VALID_STATUSES: Goal['status'][] = ['active', 'completed', 'archived'];

// --- Validation helpers ---

function validateTitle(title: unknown): asserts title is string {
  if (typeof title !== 'string' || title.trim().length === 0) {
    throw new Error('Goal title is required and must not be blank');
  }
}

function validateType(type: unknown): asserts type is Goal['type'] {
  if (!VALID_TYPES.includes(type as Goal['type'])) {
    throw new Error(`Goal type must be one of: ${VALID_TYPES.join(', ')}`);
  }
}

function validateProgressModel(model: unknown): asserts model is Goal['progressModel'] {
  if (!VALID_PROGRESS_MODELS.includes(model as Goal['progressModel'])) {
    throw new Error(`Progress model must be one of: ${VALID_PROGRESS_MODELS.join(', ')}`);
  }
}

function validateNumericFields(input: CreateGoalInput | UpdateGoalInput, isCreate: boolean): void {
  if ('targetValue' in input && input.targetValue !== undefined) {
    if (typeof input.targetValue !== 'number' || input.targetValue <= 0) {
      throw new Error('Target value must be a positive number');
    }
  } else if (isCreate) {
    throw new Error('Numeric goals require a target value');
  }

  if ('currentValue' in input && input.currentValue !== undefined) {
    if (typeof input.currentValue !== 'number' || input.currentValue < 0) {
      throw new Error('Current value must be zero or a positive number');
    }
  }
}

function validatePercentage(value: number | undefined): void {
  if (value !== undefined) {
    if (typeof value !== 'number' || value < 0 || value > 100) {
      throw new Error('Percentage must be between 0 and 100');
    }
  }
}

function validateDateBased(targetDate: string | undefined, isCreate: boolean): void {
  if (targetDate !== undefined) {
    const target = new Date(targetDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (isNaN(target.getTime())) {
      throw new Error('Target date must be a valid date');
    }
    if (isCreate && target < now) {
      throw new Error('Target date must be today or a future date');
    }
  } else if (isCreate) {
    throw new Error('Date-based goals require a target date');
  }
}

function validateFreeform(statusLabel: string | undefined, isCreate: boolean): void {
  if (statusLabel !== undefined) {
    if (typeof statusLabel !== 'string' || statusLabel.trim().length === 0) {
      throw new Error('Status label must not be blank');
    }
  } else if (isCreate) {
    throw new Error('Freeform goals require an initial status label');
  }
}

function validateCreateInput(input: CreateGoalInput): void {
  validateTitle(input.title);
  validateType(input.type);
  validateProgressModel(input.progressModel);

  switch (input.progressModel) {
    case 'numeric':
      validateNumericFields(input, true);
      break;
    case 'date-based':
      validateDateBased(input.targetDate, true);
      break;
    case 'percentage':
      validatePercentage(input.percentage);
      break;
    case 'freeform':
      validateFreeform(input.statusLabel, true);
      break;
  }
}
```

### A1.2 Create the test file skeleton

**File:** `tests/data/goal-service.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/data/db';

beforeEach(async () => {
  await db.goals.clear();
});

describe('goal-service validation', () => {
  it('placeholder - validation tests come in task A2', () => {
    expect(true).toBe(true);
  });
});
```

**Test command:**
```bash
npx vitest run tests/data/goal-service.test.ts
```

**Commit:** `feat: add goal service input types and validation helpers`

---

## Task A2: Goal service -- CRUD operations

**File:** `src/data/goal-service.ts`
**Time:** 5 min

Append the CRUD functions to `goal-service.ts`.

### A2.1 Add CRUD functions

Append to `src/data/goal-service.ts`:

```typescript
// --- CRUD operations ---

export async function createGoal(input: CreateGoalInput): Promise<Goal> {
  validateCreateInput(input);

  const now = new Date().toISOString();
  const goal: Omit<Goal, 'id'> = {
    title: input.title.trim(),
    type: input.type,
    progressModel: input.progressModel,
    status: 'active',
    description: input.description?.trim(),
    createdAt: now,
    updatedAt: now,
  };

  // Set progress-model-specific fields
  switch (input.progressModel) {
    case 'numeric':
      goal.targetValue = input.targetValue;
      goal.currentValue = input.currentValue ?? 0;
      break;
    case 'date-based':
      goal.targetDate = input.targetDate;
      break;
    case 'percentage':
      goal.percentage = input.percentage ?? 0;
      break;
    case 'freeform':
      goal.statusLabel = input.statusLabel!.trim();
      break;
  }

  const id = await db.goals.add(goal as Goal);
  return { ...goal, id } as Goal;
}

export async function getGoal(id: number): Promise<Goal | undefined> {
  return db.goals.get(id);
}

export async function getAllGoals(): Promise<Goal[]> {
  return db.goals.toArray();
}

export async function getGoalsByStatus(status: Goal['status']): Promise<Goal[]> {
  return db.goals.where('status').equals(status).toArray();
}

export async function getGoalsByType(type: Goal['type']): Promise<Goal[]> {
  return db.goals.where('type').equals(type).toArray();
}

export async function getGoalsFiltered(filters: {
  status?: Goal['status'];
  type?: Goal['type'];
}): Promise<Goal[]> {
  let goals: Goal[];

  if (filters.status) {
    goals = await db.goals.where('status').equals(filters.status).toArray();
  } else {
    goals = await db.goals.toArray();
  }

  if (filters.type) {
    goals = goals.filter((g) => g.type === filters.type);
  }

  // Sort by updatedAt descending
  goals.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return goals;
}

export async function updateGoal(id: number, input: UpdateGoalInput): Promise<Goal> {
  const existing = await db.goals.get(id);
  if (!existing) {
    throw new Error(`Goal with id ${id} not found`);
  }

  // Validate fields that are being updated
  if (input.title !== undefined) {
    validateTitle(input.title);
  }
  if (input.type !== undefined) {
    validateType(input.type);
  }

  // Validate progress-model-specific fields
  switch (existing.progressModel) {
    case 'numeric':
      if (input.currentValue !== undefined) {
        if (typeof input.currentValue !== 'number' || input.currentValue < 0) {
          throw new Error('Current value must be zero or a positive number');
        }
      }
      if (input.targetValue !== undefined) {
        if (typeof input.targetValue !== 'number' || input.targetValue <= 0) {
          throw new Error('Target value must be a positive number');
        }
      }
      break;
    case 'percentage':
      if (input.percentage !== undefined) {
        validatePercentage(input.percentage);
      }
      break;
    case 'date-based':
      if (input.targetDate !== undefined) {
        validateDateBased(input.targetDate, false);
      }
      break;
    case 'freeform':
      if (input.statusLabel !== undefined) {
        validateFreeform(input.statusLabel, false);
      }
      break;
  }

  const updates: Partial<Goal> = {
    ...input,
    updatedAt: new Date().toISOString(),
  };

  if (input.title !== undefined) {
    updates.title = input.title.trim();
  }
  if (input.statusLabel !== undefined) {
    updates.statusLabel = input.statusLabel.trim();
  }

  await db.goals.update(id, updates);
  const updated = await db.goals.get(id);
  return updated!;
}

export async function deleteGoal(id: number): Promise<void> {
  const existing = await db.goals.get(id);
  if (!existing) {
    throw new Error(`Goal with id ${id} not found`);
  }
  await db.goals.delete(id);
}
```

**Test command:**
```bash
npx vitest run tests/data/goal-service.test.ts
```

**Commit:** `feat: add goal service CRUD operations`

---

## Task A3: Goal service -- status transitions

**File:** `src/data/goal-service.ts`
**Time:** 3 min

Append status transition functions.

### A3.1 Add status transition functions

Append to `src/data/goal-service.ts`:

```typescript
// --- Status transitions ---

const VALID_TRANSITIONS: Record<Goal['status'], Goal['status'][]> = {
  active: ['completed', 'archived'],
  completed: ['archived', 'active'],
  archived: ['active'],
};

export async function completeGoal(id: number): Promise<Goal> {
  const goal = await db.goals.get(id);
  if (!goal) {
    throw new Error(`Goal with id ${id} not found`);
  }
  if (!VALID_TRANSITIONS[goal.status].includes('completed')) {
    throw new Error(`Cannot transition from ${goal.status} to completed`);
  }

  const now = new Date().toISOString();
  await db.goals.update(id, {
    status: 'completed',
    completedAt: now,
    updatedAt: now,
  });
  return (await db.goals.get(id))!;
}

export async function archiveGoal(id: number): Promise<Goal> {
  const goal = await db.goals.get(id);
  if (!goal) {
    throw new Error(`Goal with id ${id} not found`);
  }
  if (!VALID_TRANSITIONS[goal.status].includes('archived')) {
    throw new Error(`Cannot transition from ${goal.status} to archived`);
  }

  await db.goals.update(id, {
    status: 'archived',
    updatedAt: new Date().toISOString(),
  });
  return (await db.goals.get(id))!;
}

export async function reactivateGoal(id: number): Promise<Goal> {
  const goal = await db.goals.get(id);
  if (!goal) {
    throw new Error(`Goal with id ${id} not found`);
  }
  if (!VALID_TRANSITIONS[goal.status].includes('active')) {
    throw new Error(`Cannot transition from ${goal.status} to active`);
  }

  await db.goals.update(id, {
    status: 'active',
    completedAt: undefined,
    updatedAt: new Date().toISOString(),
  });
  return (await db.goals.get(id))!;
}
```

**Test command:**
```bash
npx vitest run tests/data/goal-service.test.ts
```

**Commit:** `feat: add goal status transition functions`

---

## Task A4: Goal service -- aggregation helpers for dashboard

**File:** `src/data/goal-service.ts`
**Time:** 3 min

Append aggregation functions consumed by the dashboard widget.

### A4.1 Add aggregation functions

Append to `src/data/goal-service.ts`:

```typescript
// --- Aggregation helpers (for dashboard widget) ---

export interface GoalAggregation {
  activeCount: number;
  completedCount: number;
  aggregateProgress: number | null;
}

export async function getGoalAggregation(): Promise<GoalAggregation> {
  const allGoals = await db.goals.toArray();

  const activeGoals = allGoals.filter((g) => g.status === 'active');
  const completedGoals = allGoals.filter((g) => g.status === 'completed');

  // Calculate aggregate progress from active numeric and percentage goals
  const calculableGoals = activeGoals.filter(
    (g) => g.progressModel === 'numeric' || g.progressModel === 'percentage'
  );

  let aggregateProgress: number | null = null;

  if (calculableGoals.length > 0) {
    const totalProgress = calculableGoals.reduce((sum, goal) => {
      if (goal.progressModel === 'numeric' && goal.targetValue && goal.targetValue > 0) {
        return sum + ((goal.currentValue ?? 0) / goal.targetValue) * 100;
      }
      if (goal.progressModel === 'percentage') {
        return sum + (goal.percentage ?? 0);
      }
      return sum;
    }, 0);
    aggregateProgress = Math.round(totalProgress / calculableGoals.length);
  }

  return {
    activeCount: activeGoals.length,
    completedCount: completedGoals.length,
    aggregateProgress,
  };
}
```

**Test command:**
```bash
npx vitest run tests/data/goal-service.test.ts
```

**Commit:** `feat: add goal aggregation helpers for dashboard widget`

---

## Task A5: Goal service tests -- full coverage

**File:** `tests/data/goal-service.test.ts`
**Time:** 5 min

Replace the skeleton test file with complete tests.

### A5.1 Write complete goal service tests

**File:** `tests/data/goal-service.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/data/db';
import {
  createGoal,
  getGoal,
  getAllGoals,
  getGoalsByStatus,
  getGoalsFiltered,
  updateGoal,
  deleteGoal,
  completeGoal,
  archiveGoal,
  reactivateGoal,
  getGoalAggregation,
} from '../../src/data/goal-service';
import type { CreateGoalInput } from '../../src/data/goal-service';

beforeEach(async () => {
  await db.goals.clear();
});

// --- Factory helpers ---

function numericGoalInput(overrides?: Partial<CreateGoalInput>): CreateGoalInput {
  return {
    title: 'Save $5,000',
    type: 'financial',
    progressModel: 'numeric',
    targetValue: 5000,
    currentValue: 0,
    ...overrides,
  };
}

function dateGoalInput(overrides?: Partial<CreateGoalInput>): CreateGoalInput {
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);
  return {
    title: 'Complete marathon',
    type: 'personal',
    progressModel: 'date-based',
    targetDate: futureDate.toISOString().split('T')[0],
    ...overrides,
  };
}

function percentageGoalInput(overrides?: Partial<CreateGoalInput>): CreateGoalInput {
  return {
    title: 'Read 10 books',
    type: 'personal',
    progressModel: 'percentage',
    percentage: 0,
    ...overrides,
  };
}

function freeformGoalInput(overrides?: Partial<CreateGoalInput>): CreateGoalInput {
  return {
    title: 'Learn Spanish',
    type: 'personal',
    progressModel: 'freeform',
    statusLabel: 'Not Started',
    ...overrides,
  };
}

// --- Create tests ---

describe('createGoal', () => {
  it('should create a numeric target goal with defaults', async () => {
    const goal = await createGoal(numericGoalInput());
    expect(goal.id).toBeDefined();
    expect(goal.title).toBe('Save $5,000');
    expect(goal.type).toBe('financial');
    expect(goal.progressModel).toBe('numeric');
    expect(goal.status).toBe('active');
    expect(goal.targetValue).toBe(5000);
    expect(goal.currentValue).toBe(0);
    expect(goal.createdAt).toBeDefined();
    expect(goal.updatedAt).toBeDefined();
  });

  it('should create a date-based goal', async () => {
    const goal = await createGoal(dateGoalInput());
    expect(goal.progressModel).toBe('date-based');
    expect(goal.targetDate).toBeDefined();
  });

  it('should create a percentage goal with default 0', async () => {
    const goal = await createGoal(percentageGoalInput());
    expect(goal.progressModel).toBe('percentage');
    expect(goal.percentage).toBe(0);
  });

  it('should create a freeform status goal', async () => {
    const goal = await createGoal(freeformGoalInput());
    expect(goal.progressModel).toBe('freeform');
    expect(goal.statusLabel).toBe('Not Started');
  });

  it('should reject goal with empty title', async () => {
    await expect(createGoal(numericGoalInput({ title: '' }))).rejects.toThrow(
      'Goal title is required and must not be blank'
    );
  });

  it('should reject goal with whitespace-only title', async () => {
    await expect(createGoal(numericGoalInput({ title: '   ' }))).rejects.toThrow(
      'Goal title is required and must not be blank'
    );
  });

  it('should reject goal with invalid type', async () => {
    await expect(
      createGoal(numericGoalInput({ type: 'invalid' as Goal['type'] }))
    ).rejects.toThrow('Goal type must be one of');
  });

  it('should reject goal with invalid progress model', async () => {
    await expect(
      createGoal(numericGoalInput({ progressModel: 'invalid' as Goal['progressModel'] }))
    ).rejects.toThrow('Progress model must be one of');
  });

  it('should reject numeric goal without target value', async () => {
    await expect(
      createGoal({ title: 'Test', type: 'financial', progressModel: 'numeric' })
    ).rejects.toThrow('Numeric goals require a target value');
  });

  it('should reject numeric goal with non-positive target value', async () => {
    await expect(
      createGoal(numericGoalInput({ targetValue: 0 }))
    ).rejects.toThrow('Target value must be a positive number');
  });

  it('should reject numeric goal with negative target value', async () => {
    await expect(
      createGoal(numericGoalInput({ targetValue: -100 }))
    ).rejects.toThrow('Target value must be a positive number');
  });

  it('should reject date-based goal with past date', async () => {
    await expect(
      createGoal(dateGoalInput({ targetDate: '2020-01-01' }))
    ).rejects.toThrow('Target date must be today or a future date');
  });

  it('should reject date-based goal without target date', async () => {
    await expect(
      createGoal({
        title: 'Test',
        type: 'personal',
        progressModel: 'date-based',
      })
    ).rejects.toThrow('Date-based goals require a target date');
  });

  it('should reject percentage goal with value over 100', async () => {
    await expect(
      createGoal(percentageGoalInput({ percentage: 105 }))
    ).rejects.toThrow('Percentage must be between 0 and 100');
  });

  it('should reject freeform goal without status label', async () => {
    await expect(
      createGoal({
        title: 'Test',
        type: 'personal',
        progressModel: 'freeform',
      })
    ).rejects.toThrow('Freeform goals require an initial status label');
  });

  it('should reject freeform goal with blank status label', async () => {
    await expect(
      createGoal(freeformGoalInput({ statusLabel: '   ' }))
    ).rejects.toThrow('Status label must not be blank');
  });

  it('should trim title and store it', async () => {
    const goal = await createGoal(numericGoalInput({ title: '  Save Money  ' }));
    expect(goal.title).toBe('Save Money');
  });

  it('should store optional description', async () => {
    const goal = await createGoal(numericGoalInput({ description: 'Emergency fund' }));
    expect(goal.description).toBe('Emergency fund');
  });
});

// --- Read tests ---

describe('getGoal', () => {
  it('should return a goal by id', async () => {
    const created = await createGoal(numericGoalInput());
    const found = await getGoal(created.id!);
    expect(found).toBeDefined();
    expect(found!.title).toBe('Save $5,000');
  });

  it('should return undefined for non-existent id', async () => {
    const found = await getGoal(99999);
    expect(found).toBeUndefined();
  });
});

describe('getAllGoals', () => {
  it('should return all goals', async () => {
    await createGoal(numericGoalInput());
    await createGoal(freeformGoalInput());
    const goals = await getAllGoals();
    expect(goals).toHaveLength(2);
  });
});

describe('getGoalsByStatus', () => {
  it('should filter goals by status', async () => {
    await createGoal(numericGoalInput({ title: 'Goal 1' }));
    const g2 = await createGoal(numericGoalInput({ title: 'Goal 2' }));
    await completeGoal(g2.id!);

    const active = await getGoalsByStatus('active');
    expect(active).toHaveLength(1);
    expect(active[0].title).toBe('Goal 1');

    const completed = await getGoalsByStatus('completed');
    expect(completed).toHaveLength(1);
    expect(completed[0].title).toBe('Goal 2');
  });
});

describe('getGoalsFiltered', () => {
  it('should filter by type', async () => {
    await createGoal(numericGoalInput({ type: 'financial' }));
    await createGoal(freeformGoalInput({ type: 'personal' }));
    await createGoal(numericGoalInput({ title: 'Strategic goal', type: 'strategic', targetValue: 100 }));

    const financial = await getGoalsFiltered({ type: 'financial' });
    expect(financial).toHaveLength(1);
  });

  it('should filter by status and type combined', async () => {
    const g1 = await createGoal(numericGoalInput({ type: 'financial' }));
    await createGoal(numericGoalInput({ title: 'Other financial', type: 'financial', targetValue: 200 }));
    await completeGoal(g1.id!);

    const result = await getGoalsFiltered({ status: 'completed', type: 'financial' });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Save $5,000');
  });

  it('should sort by updatedAt descending', async () => {
    await createGoal(numericGoalInput({ title: 'First' }));
    await createGoal(numericGoalInput({ title: 'Second', targetValue: 200 }));
    const goals = await getGoalsFiltered({});
    expect(goals[0].title).toBe('Second');
  });
});

// --- Update tests ---

describe('updateGoal', () => {
  it('should update current value of numeric goal', async () => {
    const goal = await createGoal(numericGoalInput());
    const updated = await updateGoal(goal.id!, { currentValue: 2500 });
    expect(updated.currentValue).toBe(2500);
    expect(updated.updatedAt > goal.updatedAt).toBe(true);
  });

  it('should update percentage of percentage goal', async () => {
    const goal = await createGoal(percentageGoalInput());
    const updated = await updateGoal(goal.id!, { percentage: 50 });
    expect(updated.percentage).toBe(50);
  });

  it('should update status label of freeform goal', async () => {
    const goal = await createGoal(freeformGoalInput());
    const updated = await updateGoal(goal.id!, { statusLabel: 'In Progress' });
    expect(updated.statusLabel).toBe('In Progress');
  });

  it('should reject update with negative current value', async () => {
    const goal = await createGoal(numericGoalInput());
    await expect(updateGoal(goal.id!, { currentValue: -10 })).rejects.toThrow(
      'Current value must be zero or a positive number'
    );
  });

  it('should reject update with percentage over 100', async () => {
    const goal = await createGoal(percentageGoalInput());
    await expect(updateGoal(goal.id!, { percentage: 105 })).rejects.toThrow(
      'Percentage must be between 0 and 100'
    );
  });

  it('should reject update for non-existent goal', async () => {
    await expect(updateGoal(99999, { title: 'Nope' })).rejects.toThrow('not found');
  });

  it('should reject blank title update', async () => {
    const goal = await createGoal(numericGoalInput());
    await expect(updateGoal(goal.id!, { title: '' })).rejects.toThrow(
      'Goal title is required and must not be blank'
    );
  });
});

// --- Delete tests ---

describe('deleteGoal', () => {
  it('should delete a goal by id', async () => {
    const goal = await createGoal(numericGoalInput());
    await deleteGoal(goal.id!);
    const found = await getGoal(goal.id!);
    expect(found).toBeUndefined();
  });

  it('should reject deleting a non-existent goal', async () => {
    await expect(deleteGoal(99999)).rejects.toThrow('not found');
  });
});

// --- Status transition tests ---

describe('status transitions', () => {
  it('should complete an active goal', async () => {
    const goal = await createGoal(numericGoalInput());
    const completed = await completeGoal(goal.id!);
    expect(completed.status).toBe('completed');
    expect(completed.completedAt).toBeDefined();
  });

  it('should archive an active goal', async () => {
    const goal = await createGoal(numericGoalInput());
    const archived = await archiveGoal(goal.id!);
    expect(archived.status).toBe('archived');
  });

  it('should archive a completed goal', async () => {
    const goal = await createGoal(numericGoalInput());
    await completeGoal(goal.id!);
    const archived = await archiveGoal(goal.id!);
    expect(archived.status).toBe('archived');
  });

  it('should reactivate a completed goal', async () => {
    const goal = await createGoal(numericGoalInput());
    await completeGoal(goal.id!);
    const reactivated = await reactivateGoal(goal.id!);
    expect(reactivated.status).toBe('active');
    expect(reactivated.completedAt).toBeUndefined();
  });

  it('should reactivate an archived goal', async () => {
    const goal = await createGoal(numericGoalInput());
    await archiveGoal(goal.id!);
    const reactivated = await reactivateGoal(goal.id!);
    expect(reactivated.status).toBe('active');
  });

  it('should reject completing a non-active goal (archived)', async () => {
    const goal = await createGoal(numericGoalInput());
    await archiveGoal(goal.id!);
    await expect(completeGoal(goal.id!)).rejects.toThrow('Cannot transition from archived to completed');
  });

  it('should reject transition on non-existent goal', async () => {
    await expect(completeGoal(99999)).rejects.toThrow('not found');
  });
});

// --- Aggregation tests ---

describe('getGoalAggregation', () => {
  it('should return zero counts when no goals exist', async () => {
    const agg = await getGoalAggregation();
    expect(agg.activeCount).toBe(0);
    expect(agg.completedCount).toBe(0);
    expect(agg.aggregateProgress).toBeNull();
  });

  it('should count active and completed goals', async () => {
    await createGoal(numericGoalInput({ title: 'G1' }));
    await createGoal(numericGoalInput({ title: 'G2', targetValue: 200 }));
    const g3 = await createGoal(numericGoalInput({ title: 'G3', targetValue: 300 }));
    await completeGoal(g3.id!);

    const agg = await getGoalAggregation();
    expect(agg.activeCount).toBe(2);
    expect(agg.completedCount).toBe(1);
  });

  it('should exclude archived goals from all counts', async () => {
    const g1 = await createGoal(numericGoalInput({ title: 'G1' }));
    await createGoal(numericGoalInput({ title: 'G2', targetValue: 200 }));
    await archiveGoal(g1.id!);

    const agg = await getGoalAggregation();
    expect(agg.activeCount).toBe(1);
    expect(agg.completedCount).toBe(0);
  });

  it('should calculate aggregate progress from numeric and percentage goals', async () => {
    // Goal A: 50/100 = 50%
    const gA = await createGoal(numericGoalInput({ title: 'A', targetValue: 100 }));
    await updateGoal(gA.id!, { currentValue: 50 });

    // Goal B: 50% percentage
    const gB = await createGoal(percentageGoalInput({ title: 'B' }));
    await updateGoal(gB.id!, { percentage: 50 });

    const agg = await getGoalAggregation();
    expect(agg.aggregateProgress).toBe(50);
  });

  it('should return null aggregate when only freeform/date-based goals exist', async () => {
    await createGoal(freeformGoalInput());
    await createGoal(dateGoalInput());

    const agg = await getGoalAggregation();
    expect(agg.activeCount).toBe(2);
    expect(agg.aggregateProgress).toBeNull();
  });
});
```

**Test command:**
```bash
npx vitest run tests/data/goal-service.test.ts
```

**Commit:** `test: add comprehensive goal service tests`

---

## Task A6: useGoals hook

**File:** `src/hooks/useGoals.ts`
**Test file:** `tests/hooks/useGoals.test.ts`
**Time:** 5 min

### A6.1 Create the useGoals hook

**File:** `src/hooks/useGoals.ts`

```typescript
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import type { Goal } from '../data/db';
import {
  createGoal,
  updateGoal,
  deleteGoal,
  completeGoal,
  archiveGoal,
  reactivateGoal,
  getGoalAggregation,
} from '../data/goal-service';
import type { CreateGoalInput, UpdateGoalInput, GoalAggregation } from '../data/goal-service';

export interface UseGoalsOptions {
  status?: Goal['status'];
  type?: Goal['type'];
}

export interface UseGoalsReturn {
  goals: Goal[];
  loading: boolean;
  addGoal: (input: CreateGoalInput) => Promise<Goal>;
  editGoal: (id: number, input: UpdateGoalInput) => Promise<Goal>;
  removeGoal: (id: number) => Promise<void>;
  markComplete: (id: number) => Promise<Goal>;
  markArchived: (id: number) => Promise<Goal>;
  markActive: (id: number) => Promise<Goal>;
}

export function useGoals(options: UseGoalsOptions = {}): UseGoalsReturn {
  const { status, type } = options;

  const goals = useLiveQuery(
    async () => {
      let result: Goal[];

      if (status) {
        result = await db.goals.where('status').equals(status).toArray();
      } else {
        result = await db.goals.toArray();
      }

      if (type) {
        result = result.filter((g) => g.type === type);
      }

      // Sort by updatedAt descending
      result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

      return result;
    },
    [status, type],
    [] as Goal[]
  );

  const loading = goals === undefined;

  return {
    goals: goals ?? [],
    loading,
    addGoal: createGoal,
    editGoal: updateGoal,
    removeGoal: deleteGoal,
    markComplete: completeGoal,
    markArchived: archiveGoal,
    markActive: reactivateGoal,
  };
}

export interface UseGoalAggregationReturn {
  aggregation: GoalAggregation;
  loading: boolean;
}

export function useGoalAggregation(): UseGoalAggregationReturn {
  const defaultAgg: GoalAggregation = {
    activeCount: 0,
    completedCount: 0,
    aggregateProgress: null,
  };

  const aggregation = useLiveQuery(
    () => getGoalAggregation(),
    [],
    defaultAgg
  );

  return {
    aggregation: aggregation ?? defaultAgg,
    loading: aggregation === undefined,
  };
}
```

### A6.2 Create the useGoals hook test

**File:** `tests/hooks/useGoals.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { db } from '../../src/data/db';
import { useGoals, useGoalAggregation } from '../../src/hooks/useGoals';

beforeEach(async () => {
  await db.goals.clear();
});

describe('useGoals', () => {
  it('should return empty array when no goals exist', async () => {
    const { result } = renderHook(() => useGoals());
    await waitFor(() => {
      expect(result.current.goals).toEqual([]);
    });
  });

  it('should add a goal and reflect it in the list', async () => {
    const { result } = renderHook(() => useGoals());

    await act(async () => {
      await result.current.addGoal({
        title: 'Test Goal',
        type: 'personal',
        progressModel: 'freeform',
        statusLabel: 'Starting',
      });
    });

    await waitFor(() => {
      expect(result.current.goals).toHaveLength(1);
      expect(result.current.goals[0].title).toBe('Test Goal');
    });
  });

  it('should filter by status', async () => {
    const { result: allResult } = renderHook(() => useGoals());

    await act(async () => {
      const g = await allResult.current.addGoal({
        title: 'Goal A',
        type: 'financial',
        progressModel: 'numeric',
        targetValue: 100,
      });
      await allResult.current.addGoal({
        title: 'Goal B',
        type: 'personal',
        progressModel: 'freeform',
        statusLabel: 'Todo',
      });
      await allResult.current.markComplete(g.id!);
    });

    const { result: activeResult } = renderHook(() => useGoals({ status: 'active' }));

    await waitFor(() => {
      expect(activeResult.current.goals).toHaveLength(1);
      expect(activeResult.current.goals[0].title).toBe('Goal B');
    });
  });

  it('should delete a goal', async () => {
    const { result } = renderHook(() => useGoals());

    let goalId: number;
    await act(async () => {
      const g = await result.current.addGoal({
        title: 'Delete Me',
        type: 'custom',
        progressModel: 'freeform',
        statusLabel: 'N/A',
      });
      goalId = g.id!;
    });

    await act(async () => {
      await result.current.removeGoal(goalId);
    });

    await waitFor(() => {
      expect(result.current.goals).toHaveLength(0);
    });
  });
});

describe('useGoalAggregation', () => {
  it('should return zero counts initially', async () => {
    const { result } = renderHook(() => useGoalAggregation());
    await waitFor(() => {
      expect(result.current.aggregation.activeCount).toBe(0);
      expect(result.current.aggregation.completedCount).toBe(0);
      expect(result.current.aggregation.aggregateProgress).toBeNull();
    });
  });
});
```

**Test command:**
```bash
npx vitest run tests/hooks/useGoals.test.ts
```

**Commit:** `feat: add useGoals and useGoalAggregation hooks`

---

## Task A7: Goals screen layout -- GoalsScreen + GoalCard

**File:** `src/screens/goals/GoalsScreen.tsx`
**File:** `src/screens/goals/GoalCard.tsx`
**Test file:** `tests/screens/goals/GoalsScreen.test.tsx`
**Time:** 5 min

### A7.1 Create the GoalCard component

**File:** `src/screens/goals/GoalCard.tsx`

```typescript
import React from 'react';
import type { Goal } from '../../data/db';

interface GoalCardProps {
  goal: Goal;
  onSelect: (goal: Goal) => void;
}

function GoalProgressIndicator({ goal }: { goal: Goal }) {
  switch (goal.progressModel) {
    case 'numeric': {
      const current = goal.currentValue ?? 0;
      const target = goal.targetValue ?? 1;
      const pct = Math.min(100, Math.round((current / target) * 100));
      return (
        <div>
          <div className="text-sm text-gray-600">
            {current.toLocaleString()} / {target.toLocaleString()}
          </div>
          <div className="mt-1 h-2 w-full rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-blue-500"
              style={{ width: `${pct}%` }}
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${pct}% complete`}
            />
          </div>
        </div>
      );
    }

    case 'date-based': {
      if (!goal.targetDate) return null;
      const target = new Date(goal.targetDate);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const diffMs = target.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return (
        <div className="text-sm text-gray-600">
          {diffDays > 0
            ? `${diffDays} day${diffDays !== 1 ? 's' : ''} remaining`
            : diffDays === 0
              ? 'Due today'
              : `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} overdue`}
        </div>
      );
    }

    case 'percentage': {
      const pct = goal.percentage ?? 0;
      return (
        <div>
          <div className="text-sm text-gray-600">{pct}%</div>
          <div className="mt-1 h-2 w-full rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-green-500"
              style={{ width: `${pct}%` }}
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${pct}% complete`}
            />
          </div>
        </div>
      );
    }

    case 'freeform':
      return (
        <div className="text-sm text-gray-600">
          {goal.statusLabel ?? 'No status'}
        </div>
      );

    default:
      return null;
  }
}

const TYPE_LABELS: Record<Goal['type'], string> = {
  financial: 'Financial',
  personal: 'Personal',
  strategic: 'Strategic',
  custom: 'Custom',
};

export default function GoalCard({ goal, onSelect }: GoalCardProps) {
  const isCompleted = goal.status === 'completed';
  const isArchived = goal.status === 'archived';

  return (
    <button
      type="button"
      onClick={() => onSelect(goal)}
      className={`w-full rounded-lg border p-4 text-left transition-colors hover:bg-gray-50 ${
        isCompleted
          ? 'border-green-200 bg-green-50 opacity-75'
          : isArchived
            ? 'border-gray-200 bg-gray-50 opacity-60'
            : 'border-gray-200 bg-white'
      }`}
      data-testid={`goal-card-${goal.id}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3
            className={`font-medium ${
              isCompleted ? 'text-green-800 line-through' : 'text-gray-900'
            }`}
          >
            {goal.title}
          </h3>
          <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {TYPE_LABELS[goal.type]}
          </span>
        </div>
        {isCompleted && (
          <span className="text-green-600" aria-label="Completed">
            &#10003;
          </span>
        )}
      </div>
      <div className="mt-3">
        <GoalProgressIndicator goal={goal} />
      </div>
    </button>
  );
}
```

### A7.2 Create the GoalsScreen component

**File:** `src/screens/goals/GoalsScreen.tsx`

```typescript
import React, { useState } from 'react';
import { useGoals } from '../../hooks/useGoals';
import type { Goal } from '../../data/db';
import GoalCard from './GoalCard';
import EmptyState from '../../components/EmptyState';
import LoadingSpinner from '../../components/LoadingSpinner';

type TypeFilter = Goal['type'] | 'all';
type StatusFilter = Goal['status'] | 'all';

interface GoalsScreenProps {
  onCreateGoal: () => void;
  onSelectGoal: (goal: Goal) => void;
}

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'financial', label: 'Financial' },
  { value: 'personal', label: 'Personal' },
  { value: 'strategic', label: 'Strategic' },
  { value: 'custom', label: 'Custom' },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

export default function GoalsScreen({ onCreateGoal, onSelectGoal }: GoalsScreenProps) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');

  const { goals, loading } = useGoals({
    status: statusFilter === 'all' ? undefined : statusFilter,
    type: typeFilter === 'all' ? undefined : typeFilter,
  });

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Goals</h1>
        <button
          type="button"
          onClick={onCreateGoal}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          data-testid="create-goal-button"
        >
          + New Goal
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          aria-label="Filter by type"
          data-testid="type-filter"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          aria-label="Filter by status"
          data-testid="status-filter"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Goals list */}
      {goals.length === 0 ? (
        <EmptyState
          message={
            statusFilter === 'active' && typeFilter === 'all'
              ? 'No goals yet. Create your first goal to get started!'
              : 'No goals match the selected filters.'
          }
          actionLabel={
            statusFilter === 'active' && typeFilter === 'all'
              ? 'Create Goal'
              : undefined
          }
          onAction={
            statusFilter === 'active' && typeFilter === 'all'
              ? onCreateGoal
              : undefined
          }
        />
      ) : (
        <div className="space-y-3" data-testid="goals-list">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onSelect={onSelectGoal} />
          ))}
        </div>
      )}
    </div>
  );
}
```

### A7.3 Create GoalsScreen test

**File:** `tests/screens/goals/GoalsScreen.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '../../../src/data/db';
import { createGoal } from '../../../src/data/goal-service';
import GoalsScreen from '../../../src/screens/goals/GoalsScreen';

beforeEach(async () => {
  await db.goals.clear();
});

describe('GoalsScreen', () => {
  const defaultProps = {
    onCreateGoal: vi.fn(),
    onSelectGoal: vi.fn(),
  };

  it('should show empty state when no goals exist', async () => {
    render(<GoalsScreen {...defaultProps} />);
    await waitFor(() => {
      expect(
        screen.getByText(/no goals yet/i)
      ).toBeInTheDocument();
    });
  });

  it('should show create goal button', async () => {
    render(<GoalsScreen {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByTestId('create-goal-button')).toBeInTheDocument();
    });
  });

  it('should call onCreateGoal when create button is clicked', async () => {
    render(<GoalsScreen {...defaultProps} />);
    const user = userEvent.setup();
    await waitFor(() => {
      expect(screen.getByTestId('create-goal-button')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('create-goal-button'));
    expect(defaultProps.onCreateGoal).toHaveBeenCalled();
  });

  it('should display goals with different progress models', async () => {
    await createGoal({
      title: 'Save Money',
      type: 'financial',
      progressModel: 'numeric',
      targetValue: 1000,
      currentValue: 500,
    });
    await createGoal({
      title: 'Learn Piano',
      type: 'personal',
      progressModel: 'freeform',
      statusLabel: 'Practicing',
    });

    render(<GoalsScreen {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Save Money')).toBeInTheDocument();
      expect(screen.getByText('Learn Piano')).toBeInTheDocument();
      expect(screen.getByText(/500/)).toBeInTheDocument();
      expect(screen.getByText(/1,000/)).toBeInTheDocument();
      expect(screen.getByText('Practicing')).toBeInTheDocument();
    });
  });

  it('should filter by type', async () => {
    await createGoal({
      title: 'Financial Goal',
      type: 'financial',
      progressModel: 'numeric',
      targetValue: 100,
    });
    await createGoal({
      title: 'Personal Goal',
      type: 'personal',
      progressModel: 'freeform',
      statusLabel: 'Started',
    });

    render(<GoalsScreen {...defaultProps} />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Financial Goal')).toBeInTheDocument();
      expect(screen.getByText('Personal Goal')).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByTestId('type-filter'), 'financial');

    await waitFor(() => {
      expect(screen.getByText('Financial Goal')).toBeInTheDocument();
      expect(screen.queryByText('Personal Goal')).not.toBeInTheDocument();
    });
  });

  it('should default to showing only active goals', async () => {
    const g = await createGoal({
      title: 'Active Goal',
      type: 'personal',
      progressModel: 'freeform',
      statusLabel: 'Todo',
    });
    const g2 = await createGoal({
      title: 'Completed Goal',
      type: 'personal',
      progressModel: 'freeform',
      statusLabel: 'Done',
    });

    // Complete one via direct DB update (service tested separately)
    const { completeGoal } = await import('../../../src/data/goal-service');
    await completeGoal(g2.id!);

    render(<GoalsScreen {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Active Goal')).toBeInTheDocument();
      expect(screen.queryByText('Completed Goal')).not.toBeInTheDocument();
    });
  });

  it('should call onSelectGoal when a goal card is clicked', async () => {
    const goal = await createGoal({
      title: 'Click Me',
      type: 'custom',
      progressModel: 'freeform',
      statusLabel: 'Ready',
    });

    render(<GoalsScreen {...defaultProps} />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Click Me')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId(`goal-card-${goal.id}`));
    expect(defaultProps.onSelectGoal).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Click Me' })
    );
  });
});
```

**Test command:**
```bash
npx vitest run tests/screens/goals/GoalsScreen.test.tsx
```

**Commit:** `feat: add GoalsScreen layout with filtering and GoalCard component`

---

## Task A8: Goal creation form

**File:** `src/screens/goals/GoalForm.tsx`
**Test file:** `tests/screens/goals/GoalForm.test.tsx`
**Time:** 5 min

### A8.1 Create the GoalForm component

**File:** `src/screens/goals/GoalForm.tsx`

```typescript
import React, { useState } from 'react';
import type { Goal } from '../../data/db';
import type { CreateGoalInput } from '../../data/goal-service';

interface GoalFormProps {
  onSubmit: (input: CreateGoalInput) => Promise<void>;
  onCancel: () => void;
}

const TYPE_OPTIONS: { value: Goal['type']; label: string }[] = [
  { value: 'financial', label: 'Financial' },
  { value: 'personal', label: 'Personal' },
  { value: 'strategic', label: 'Strategic' },
  { value: 'custom', label: 'Custom' },
];

const PROGRESS_MODEL_OPTIONS: { value: Goal['progressModel']; label: string }[] = [
  { value: 'numeric', label: 'Numeric Target' },
  { value: 'date-based', label: 'Date-Based' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'freeform', label: 'Freeform Status' },
];

export default function GoalForm({ onSubmit, onCancel }: GoalFormProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<Goal['type'] | ''>('');
  const [progressModel, setProgressModel] = useState<Goal['progressModel'] | ''>('');
  const [targetValue, setTargetValue] = useState('');
  const [currentValue, setCurrentValue] = useState('0');
  const [targetDate, setTargetDate] = useState('');
  const [percentage, setPercentage] = useState('0');
  const [statusLabel, setStatusLabel] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};

    if (!title.trim()) {
      errs.title = 'Title is required';
    }
    if (!type) {
      errs.type = 'Type is required';
    }
    if (!progressModel) {
      errs.progressModel = 'Progress model is required';
    }

    if (progressModel === 'numeric') {
      const tv = parseFloat(targetValue);
      if (!targetValue || isNaN(tv) || tv <= 0) {
        errs.targetValue = 'Target value must be a positive number';
      }
      const cv = parseFloat(currentValue);
      if (currentValue && (isNaN(cv) || cv < 0)) {
        errs.currentValue = 'Starting value must be zero or positive';
      }
    }

    if (progressModel === 'date-based') {
      if (!targetDate) {
        errs.targetDate = 'Target date is required';
      } else {
        const target = new Date(targetDate);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        if (target < now) {
          errs.targetDate = 'Target date must be today or in the future';
        }
      }
    }

    if (progressModel === 'percentage') {
      const pct = parseFloat(percentage);
      if (percentage && (isNaN(pct) || pct < 0 || pct > 100)) {
        errs.percentage = 'Percentage must be between 0 and 100';
      }
    }

    if (progressModel === 'freeform') {
      if (!statusLabel.trim()) {
        errs.statusLabel = 'Initial status label is required';
      }
    }

    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);

    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      const input: CreateGoalInput = {
        title: title.trim(),
        type: type as Goal['type'],
        progressModel: progressModel as Goal['progressModel'],
        description: description.trim() || undefined,
      };

      switch (progressModel) {
        case 'numeric':
          input.targetValue = parseFloat(targetValue);
          input.currentValue = parseFloat(currentValue) || 0;
          break;
        case 'date-based':
          input.targetDate = targetDate;
          break;
        case 'percentage':
          input.percentage = parseFloat(percentage) || 0;
          break;
        case 'freeform':
          input.statusLabel = statusLabel.trim();
          break;
      }

      await onSubmit(input);
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Failed to create goal' });
    } finally {
      setSubmitting(false);
    }
  }

  function renderProgressModelFields() {
    switch (progressModel) {
      case 'numeric':
        return (
          <>
            <div>
              <label htmlFor="targetValue" className="block text-sm font-medium text-gray-700">
                Target Value *
              </label>
              <input
                id="targetValue"
                type="number"
                min="1"
                step="any"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                data-testid="target-value-input"
              />
              {errors.targetValue && (
                <p className="mt-1 text-sm text-red-600" data-testid="error-targetValue">
                  {errors.targetValue}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="currentValue" className="block text-sm font-medium text-gray-700">
                Starting Value
              </label>
              <input
                id="currentValue"
                type="number"
                min="0"
                step="any"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                data-testid="current-value-input"
              />
              {errors.currentValue && (
                <p className="mt-1 text-sm text-red-600" data-testid="error-currentValue">
                  {errors.currentValue}
                </p>
              )}
            </div>
          </>
        );

      case 'date-based':
        return (
          <div>
            <label htmlFor="targetDate" className="block text-sm font-medium text-gray-700">
              Target Date *
            </label>
            <input
              id="targetDate"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
              data-testid="target-date-input"
            />
            {errors.targetDate && (
              <p className="mt-1 text-sm text-red-600" data-testid="error-targetDate">
                {errors.targetDate}
              </p>
            )}
          </div>
        );

      case 'percentage':
        return (
          <div>
            <label htmlFor="percentage" className="block text-sm font-medium text-gray-700">
              Starting Percentage
            </label>
            <input
              id="percentage"
              type="number"
              min="0"
              max="100"
              value={percentage}
              onChange={(e) => setPercentage(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
              data-testid="percentage-input"
            />
            {errors.percentage && (
              <p className="mt-1 text-sm text-red-600" data-testid="error-percentage">
                {errors.percentage}
              </p>
            )}
          </div>
        );

      case 'freeform':
        return (
          <div>
            <label htmlFor="statusLabel" className="block text-sm font-medium text-gray-700">
              Initial Status Label *
            </label>
            <input
              id="statusLabel"
              type="text"
              value={statusLabel}
              onChange={(e) => setStatusLabel(e.target.value)}
              placeholder='e.g., "Not Started", "Planning"'
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
              data-testid="status-label-input"
            />
            {errors.statusLabel && (
              <p className="mt-1 text-sm text-red-600" data-testid="error-statusLabel">
                {errors.statusLabel}
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="mx-auto max-w-lg p-4">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Create Goal</h1>

      <form onSubmit={handleSubmit} className="space-y-4" data-testid="goal-form">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Title *
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What do you want to achieve?"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
            data-testid="title-input"
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600" data-testid="error-title">
              {errors.title}
            </p>
          )}
        </div>

        {/* Type */}
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700">
            Type *
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as Goal['type'])}
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
            data-testid="type-select"
          >
            <option value="">Select type...</option>
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errors.type && (
            <p className="mt-1 text-sm text-red-600" data-testid="error-type">
              {errors.type}
            </p>
          )}
        </div>

        {/* Progress Model */}
        <div>
          <label htmlFor="progressModel" className="block text-sm font-medium text-gray-700">
            Progress Model *
          </label>
          <select
            id="progressModel"
            value={progressModel}
            onChange={(e) => setProgressModel(e.target.value as Goal['progressModel'])}
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
            data-testid="progress-model-select"
          >
            <option value="">Select progress model...</option>
            {PROGRESS_MODEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errors.progressModel && (
            <p className="mt-1 text-sm text-red-600" data-testid="error-progressModel">
              {errors.progressModel}
            </p>
          )}
        </div>

        {/* Dynamic fields per progress model */}
        {progressModel && renderProgressModelFields()}

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description (optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Any additional context or notes..."
            rows={3}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
            data-testid="description-input"
          />
        </div>

        {/* Form-level error */}
        {errors.form && (
          <p className="text-sm text-red-600" data-testid="error-form">
            {errors.form}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            data-testid="submit-button"
          >
            {submitting ? 'Creating...' : 'Create Goal'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            data-testid="cancel-button"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
```

### A8.2 Create the GoalForm test

**File:** `tests/screens/goals/GoalForm.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GoalForm from '../../../src/screens/goals/GoalForm';

describe('GoalForm', () => {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    onSubmit.mockResolvedValue(undefined);
  });

  it('should render the form with required fields', () => {
    render(<GoalForm onSubmit={onSubmit} onCancel={onCancel} />);
    expect(screen.getByTestId('title-input')).toBeInTheDocument();
    expect(screen.getByTestId('type-select')).toBeInTheDocument();
    expect(screen.getByTestId('progress-model-select')).toBeInTheDocument();
  });

  it('should show validation errors when submitting empty form', async () => {
    render(<GoalForm onSubmit={onSubmit} onCancel={onCancel} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('error-title')).toBeInTheDocument();
      expect(screen.getByTestId('error-type')).toBeInTheDocument();
      expect(screen.getByTestId('error-progressModel')).toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should show numeric fields when numeric model is selected', async () => {
    render(<GoalForm onSubmit={onSubmit} onCancel={onCancel} />);
    const user = userEvent.setup();

    await user.selectOptions(screen.getByTestId('progress-model-select'), 'numeric');

    expect(screen.getByTestId('target-value-input')).toBeInTheDocument();
    expect(screen.getByTestId('current-value-input')).toBeInTheDocument();
  });

  it('should show date field when date-based model is selected', async () => {
    render(<GoalForm onSubmit={onSubmit} onCancel={onCancel} />);
    const user = userEvent.setup();

    await user.selectOptions(screen.getByTestId('progress-model-select'), 'date-based');

    expect(screen.getByTestId('target-date-input')).toBeInTheDocument();
  });

  it('should show status label field when freeform model is selected', async () => {
    render(<GoalForm onSubmit={onSubmit} onCancel={onCancel} />);
    const user = userEvent.setup();

    await user.selectOptions(screen.getByTestId('progress-model-select'), 'freeform');

    expect(screen.getByTestId('status-label-input')).toBeInTheDocument();
  });

  it('should switch dynamic fields when model changes', async () => {
    render(<GoalForm onSubmit={onSubmit} onCancel={onCancel} />);
    const user = userEvent.setup();

    await user.selectOptions(screen.getByTestId('progress-model-select'), 'numeric');
    expect(screen.getByTestId('target-value-input')).toBeInTheDocument();

    await user.selectOptions(screen.getByTestId('progress-model-select'), 'freeform');
    expect(screen.queryByTestId('target-value-input')).not.toBeInTheDocument();
    expect(screen.getByTestId('status-label-input')).toBeInTheDocument();
  });

  it('should submit a valid numeric goal', async () => {
    render(<GoalForm onSubmit={onSubmit} onCancel={onCancel} />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId('title-input'), 'Save $10,000');
    await user.selectOptions(screen.getByTestId('type-select'), 'financial');
    await user.selectOptions(screen.getByTestId('progress-model-select'), 'numeric');
    await user.clear(screen.getByTestId('target-value-input'));
    await user.type(screen.getByTestId('target-value-input'), '10000');
    await user.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Save $10,000',
          type: 'financial',
          progressModel: 'numeric',
          targetValue: 10000,
          currentValue: 0,
        })
      );
    });
  });

  it('should submit a valid freeform goal', async () => {
    render(<GoalForm onSubmit={onSubmit} onCancel={onCancel} />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId('title-input'), 'Write a novel');
    await user.selectOptions(screen.getByTestId('type-select'), 'personal');
    await user.selectOptions(screen.getByTestId('progress-model-select'), 'freeform');
    await user.type(screen.getByTestId('status-label-input'), 'Brainstorming');
    await user.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Write a novel',
          type: 'personal',
          progressModel: 'freeform',
          statusLabel: 'Brainstorming',
        })
      );
    });
  });

  it('should call onCancel when cancel button is clicked', async () => {
    render(<GoalForm onSubmit={onSubmit} onCancel={onCancel} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId('cancel-button'));
    expect(onCancel).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should validate numeric target value is positive', async () => {
    render(<GoalForm onSubmit={onSubmit} onCancel={onCancel} />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId('title-input'), 'Test');
    await user.selectOptions(screen.getByTestId('type-select'), 'financial');
    await user.selectOptions(screen.getByTestId('progress-model-select'), 'numeric');
    await user.clear(screen.getByTestId('target-value-input'));
    // Leave target value empty
    await user.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('error-targetValue')).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should validate freeform status label is required', async () => {
    render(<GoalForm onSubmit={onSubmit} onCancel={onCancel} />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId('title-input'), 'Test');
    await user.selectOptions(screen.getByTestId('type-select'), 'personal');
    await user.selectOptions(screen.getByTestId('progress-model-select'), 'freeform');
    // Leave status label empty
    await user.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('error-statusLabel')).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
```

**Test command:**
```bash
npx vitest run tests/screens/goals/GoalForm.test.tsx
```

**Commit:** `feat: add goal creation form with dynamic fields per progress model`

---

## Task A9: Goal detail / progress update / status transitions

**File:** `src/screens/goals/GoalDetail.tsx`
**Test file:** `tests/screens/goals/GoalDetail.test.tsx`
**Time:** 5 min

### A9.1 Create the GoalDetail component

**File:** `src/screens/goals/GoalDetail.tsx`

```typescript
import React, { useState } from 'react';
import type { Goal } from '../../data/db';
import type { UpdateGoalInput } from '../../data/goal-service';
import ConfirmDialog from '../../components/ConfirmDialog';

interface GoalDetailProps {
  goal: Goal;
  onUpdate: (id: number, input: UpdateGoalInput) => Promise<Goal>;
  onComplete: (id: number) => Promise<Goal>;
  onArchive: (id: number) => Promise<Goal>;
  onReactivate: (id: number) => Promise<Goal>;
  onDelete: (id: number) => Promise<void>;
  onBack: () => void;
}

export default function GoalDetail({
  goal,
  onUpdate,
  onComplete,
  onArchive,
  onReactivate,
  onDelete,
  onBack,
}: GoalDetailProps) {
  const [editingProgress, setEditingProgress] = useState(false);
  const [numericValue, setNumericValue] = useState(String(goal.currentValue ?? 0));
  const [incrementValue, setIncrementValue] = useState('');
  const [percentValue, setPercentValue] = useState(String(goal.percentage ?? 0));
  const [freeformLabel, setFreeformLabel] = useState(goal.statusLabel ?? '');
  const [targetDateValue, setTargetDateValue] = useState(goal.targetDate ?? '');
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false);

  const isAtTarget =
    (goal.progressModel === 'numeric' &&
      goal.targetValue !== undefined &&
      (goal.currentValue ?? 0) >= goal.targetValue) ||
    (goal.progressModel === 'percentage' && (goal.percentage ?? 0) >= 100);

  async function handleUpdateNumeric(mode: 'absolute' | 'increment') {
    setError('');
    try {
      let newValue: number;
      if (mode === 'absolute') {
        newValue = parseFloat(numericValue);
      } else {
        const inc = parseFloat(incrementValue);
        if (isNaN(inc)) {
          setError('Increment must be a number');
          return;
        }
        newValue = (goal.currentValue ?? 0) + inc;
      }

      if (isNaN(newValue) || newValue < 0) {
        setError('Value must be zero or positive');
        return;
      }

      const updated = await onUpdate(goal.id!, { currentValue: newValue });
      setNumericValue(String(updated.currentValue ?? 0));
      setIncrementValue('');
      setEditingProgress(false);

      // Check if target is reached
      if (
        goal.targetValue !== undefined &&
        newValue >= goal.targetValue &&
        goal.status === 'active'
      ) {
        setShowCompletionPrompt(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  }

  async function handleUpdatePercentage() {
    setError('');
    try {
      const pct = parseFloat(percentValue);
      if (isNaN(pct) || pct < 0 || pct > 100) {
        setError('Percentage must be between 0 and 100');
        return;
      }
      await onUpdate(goal.id!, { percentage: pct });
      setEditingProgress(false);

      if (pct >= 100 && goal.status === 'active') {
        setShowCompletionPrompt(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  }

  async function handleUpdateFreeform() {
    setError('');
    try {
      if (!freeformLabel.trim()) {
        setError('Status label must not be blank');
        return;
      }
      await onUpdate(goal.id!, { statusLabel: freeformLabel.trim() });
      setEditingProgress(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  }

  async function handleUpdateTargetDate() {
    setError('');
    try {
      await onUpdate(goal.id!, { targetDate: targetDateValue });
      setEditingProgress(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  }

  async function handleComplete() {
    try {
      await onComplete(goal.id!);
      setShowCompletionPrompt(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete goal');
    }
  }

  async function handleArchive() {
    try {
      await onArchive(goal.id!);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not archive goal');
    }
  }

  async function handleReactivate() {
    try {
      await onReactivate(goal.id!);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reactivate goal');
    }
  }

  async function handleDelete() {
    try {
      await onDelete(goal.id!);
      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete goal');
    }
  }

  function renderProgressEditor() {
    if (!editingProgress) return null;

    switch (goal.progressModel) {
      case 'numeric':
        return (
          <div className="mt-3 space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <div>
              <label htmlFor="absoluteValue" className="block text-sm font-medium text-gray-700">
                Set absolute value
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  id="absoluteValue"
                  type="number"
                  min="0"
                  step="any"
                  value={numericValue}
                  onChange={(e) => setNumericValue(e.target.value)}
                  className="block w-full rounded border border-gray-300 px-3 py-1"
                  data-testid="absolute-value-input"
                />
                <button
                  type="button"
                  onClick={() => handleUpdateNumeric('absolute')}
                  className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                  data-testid="set-value-button"
                >
                  Set
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="incrementValue" className="block text-sm font-medium text-gray-700">
                Increment by
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  id="incrementValue"
                  type="number"
                  step="any"
                  value={incrementValue}
                  onChange={(e) => setIncrementValue(e.target.value)}
                  className="block w-full rounded border border-gray-300 px-3 py-1"
                  data-testid="increment-value-input"
                />
                <button
                  type="button"
                  onClick={() => handleUpdateNumeric('increment')}
                  className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                  data-testid="increment-button"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        );

      case 'percentage':
        return (
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <label htmlFor="percentageEdit" className="block text-sm font-medium text-gray-700">
              Update percentage
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="percentageEdit"
                type="number"
                min="0"
                max="100"
                value={percentValue}
                onChange={(e) => setPercentValue(e.target.value)}
                className="block w-full rounded border border-gray-300 px-3 py-1"
                data-testid="percentage-edit-input"
              />
              <button
                type="button"
                onClick={handleUpdatePercentage}
                className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                data-testid="update-percentage-button"
              >
                Update
              </button>
            </div>
          </div>
        );

      case 'freeform':
        return (
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <label htmlFor="freeformEdit" className="block text-sm font-medium text-gray-700">
              Update status label
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="freeformEdit"
                type="text"
                value={freeformLabel}
                onChange={(e) => setFreeformLabel(e.target.value)}
                className="block w-full rounded border border-gray-300 px-3 py-1"
                data-testid="freeform-edit-input"
              />
              <button
                type="button"
                onClick={handleUpdateFreeform}
                className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                data-testid="update-freeform-button"
              >
                Update
              </button>
            </div>
          </div>
        );

      case 'date-based':
        return (
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <label htmlFor="targetDateEdit" className="block text-sm font-medium text-gray-700">
              Update target date
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="targetDateEdit"
                type="date"
                value={targetDateValue}
                onChange={(e) => setTargetDateValue(e.target.value)}
                className="block w-full rounded border border-gray-300 px-3 py-1"
                data-testid="target-date-edit-input"
              />
              <button
                type="button"
                onClick={handleUpdateTargetDate}
                className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                data-testid="update-date-button"
              >
                Update
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="mx-auto max-w-lg p-4">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm text-blue-600 hover:underline"
        data-testid="back-button"
      >
        &larr; Back to Goals
      </button>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-gray-900">{goal.title}</h1>

        <div className="mt-2 flex gap-2">
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {goal.type}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              goal.status === 'active'
                ? 'bg-blue-100 text-blue-700'
                : goal.status === 'completed'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
            }`}
            data-testid="goal-status"
          >
            {goal.status}
          </span>
        </div>

        {goal.description && (
          <p className="mt-3 text-sm text-gray-600">{goal.description}</p>
        )}

        {/* Progress display */}
        <div className="mt-4" data-testid="progress-section">
          {goal.progressModel === 'numeric' && (
            <div>
              <div className="text-lg font-medium">
                {(goal.currentValue ?? 0).toLocaleString()} / {(goal.targetValue ?? 0).toLocaleString()}
              </div>
              <div className="mt-1 h-3 w-full rounded-full bg-gray-200">
                <div
                  className="h-3 rounded-full bg-blue-500"
                  style={{
                    width: `${Math.min(100, Math.round(((goal.currentValue ?? 0) / (goal.targetValue ?? 1)) * 100))}%`,
                  }}
                />
              </div>
            </div>
          )}
          {goal.progressModel === 'percentage' && (
            <div>
              <div className="text-lg font-medium">{goal.percentage ?? 0}%</div>
              <div className="mt-1 h-3 w-full rounded-full bg-gray-200">
                <div
                  className="h-3 rounded-full bg-green-500"
                  style={{ width: `${goal.percentage ?? 0}%` }}
                />
              </div>
            </div>
          )}
          {goal.progressModel === 'freeform' && (
            <div className="text-lg font-medium">
              Status: {goal.statusLabel ?? 'No status'}
            </div>
          )}
          {goal.progressModel === 'date-based' && goal.targetDate && (
            <div className="text-lg font-medium">
              Target: {new Date(goal.targetDate).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* At-target notification */}
        {isAtTarget && goal.status === 'active' && (
          <div
            className="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800"
            data-testid="target-reached-prompt"
          >
            You have reached your target! Would you like to mark this goal as complete?
            <button
              type="button"
              onClick={handleComplete}
              className="ml-2 font-medium text-yellow-900 underline"
              data-testid="prompt-complete-button"
            >
              Mark Complete
            </button>
          </div>
        )}

        {/* Update progress button */}
        {goal.status === 'active' && (
          <button
            type="button"
            onClick={() => setEditingProgress(!editingProgress)}
            className="mt-4 rounded-lg border border-blue-300 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
            data-testid="update-progress-button"
          >
            {editingProgress ? 'Cancel Edit' : 'Update Progress'}
          </button>
        )}

        {renderProgressEditor()}

        {/* Error */}
        {error && (
          <p className="mt-3 text-sm text-red-600" data-testid="detail-error">
            {error}
          </p>
        )}

        {/* Status transition buttons */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-gray-200 pt-4">
          {goal.status === 'active' && (
            <>
              <button
                type="button"
                onClick={handleComplete}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                data-testid="complete-button"
              >
                Mark Complete
              </button>
              <button
                type="button"
                onClick={handleArchive}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                data-testid="archive-button"
              >
                Archive
              </button>
            </>
          )}
          {goal.status === 'completed' && (
            <>
              <button
                type="button"
                onClick={handleReactivate}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                data-testid="reactivate-button"
              >
                Reactivate
              </button>
              <button
                type="button"
                onClick={handleArchive}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                data-testid="archive-button"
              >
                Archive
              </button>
            </>
          )}
          {goal.status === 'archived' && (
            <button
              type="button"
              onClick={handleReactivate}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              data-testid="reactivate-button"
            >
              Reactivate
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            data-testid="delete-button"
          >
            Delete
          </button>
        </div>

        {/* Timestamps */}
        <div className="mt-4 text-xs text-gray-400">
          Created: {new Date(goal.createdAt).toLocaleDateString()}
          {goal.completedAt && (
            <> | Completed: {new Date(goal.completedAt).toLocaleDateString()}</>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Goal"
          message={`Are you sure you want to permanently delete "${goal.title}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {/* Completion prompt dialog */}
      {showCompletionPrompt && (
        <ConfirmDialog
          title="Goal Target Reached!"
          message={`You have reached the target for "${goal.title}". Would you like to mark it as complete?`}
          confirmLabel="Mark Complete"
          onConfirm={handleComplete}
          onCancel={() => setShowCompletionPrompt(false)}
        />
      )}
    </div>
  );
}
```

### A9.2 Create GoalDetail test

**File:** `tests/screens/goals/GoalDetail.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GoalDetail from '../../../src/screens/goals/GoalDetail';
import type { Goal } from '../../../src/data/db';

function makeGoal(overrides?: Partial<Goal>): Goal {
  return {
    id: 1,
    title: 'Test Goal',
    type: 'financial',
    progressModel: 'numeric',
    status: 'active',
    targetValue: 1000,
    currentValue: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('GoalDetail', () => {
  const defaultProps = {
    onUpdate: vi.fn().mockResolvedValue(makeGoal({ currentValue: 500 })),
    onComplete: vi.fn().mockResolvedValue(makeGoal({ status: 'completed' })),
    onArchive: vi.fn().mockResolvedValue(makeGoal({ status: 'archived' })),
    onReactivate: vi.fn().mockResolvedValue(makeGoal({ status: 'active' })),
    onDelete: vi.fn().mockResolvedValue(undefined),
    onBack: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display goal title and status', () => {
    render(<GoalDetail goal={makeGoal()} {...defaultProps} />);
    expect(screen.getByText('Test Goal')).toBeInTheDocument();
    expect(screen.getByTestId('goal-status')).toHaveTextContent('active');
  });

  it('should display numeric progress', () => {
    render(<GoalDetail goal={makeGoal({ currentValue: 500, targetValue: 1000 })} {...defaultProps} />);
    expect(screen.getByText(/500/)).toBeInTheDocument();
    expect(screen.getByText(/1,000/)).toBeInTheDocument();
  });

  it('should display freeform status label', () => {
    render(
      <GoalDetail
        goal={makeGoal({ progressModel: 'freeform', statusLabel: 'In Progress' })}
        {...defaultProps}
      />
    );
    expect(screen.getByText(/In Progress/)).toBeInTheDocument();
  });

  it('should show update progress editor when button clicked', async () => {
    render(<GoalDetail goal={makeGoal()} {...defaultProps} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId('update-progress-button'));
    expect(screen.getByTestId('absolute-value-input')).toBeInTheDocument();
    expect(screen.getByTestId('increment-value-input')).toBeInTheDocument();
  });

  it('should update numeric value via absolute set', async () => {
    render(<GoalDetail goal={makeGoal()} {...defaultProps} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId('update-progress-button'));
    await user.clear(screen.getByTestId('absolute-value-input'));
    await user.type(screen.getByTestId('absolute-value-input'), '500');
    await user.click(screen.getByTestId('set-value-button'));

    expect(defaultProps.onUpdate).toHaveBeenCalledWith(1, { currentValue: 500 });
  });

  it('should update numeric value via increment', async () => {
    render(<GoalDetail goal={makeGoal({ currentValue: 200 })} {...defaultProps} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId('update-progress-button'));
    await user.type(screen.getByTestId('increment-value-input'), '100');
    await user.click(screen.getByTestId('increment-button'));

    expect(defaultProps.onUpdate).toHaveBeenCalledWith(1, { currentValue: 300 });
  });

  it('should show Mark Complete button for active goals', () => {
    render(<GoalDetail goal={makeGoal()} {...defaultProps} />);
    expect(screen.getByTestId('complete-button')).toBeInTheDocument();
  });

  it('should show Reactivate button for completed goals', () => {
    render(<GoalDetail goal={makeGoal({ status: 'completed' })} {...defaultProps} />);
    expect(screen.getByTestId('reactivate-button')).toBeInTheDocument();
  });

  it('should show Reactivate button for archived goals', () => {
    render(<GoalDetail goal={makeGoal({ status: 'archived' })} {...defaultProps} />);
    expect(screen.getByTestId('reactivate-button')).toBeInTheDocument();
  });

  it('should not show complete button for archived goals', () => {
    render(<GoalDetail goal={makeGoal({ status: 'archived' })} {...defaultProps} />);
    expect(screen.queryByTestId('complete-button')).not.toBeInTheDocument();
  });

  it('should call onComplete when Mark Complete is clicked', async () => {
    render(<GoalDetail goal={makeGoal()} {...defaultProps} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId('complete-button'));
    expect(defaultProps.onComplete).toHaveBeenCalledWith(1);
  });

  it('should call onArchive when Archive is clicked', async () => {
    render(<GoalDetail goal={makeGoal()} {...defaultProps} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId('archive-button'));
    expect(defaultProps.onArchive).toHaveBeenCalledWith(1);
  });

  it('should call onReactivate when Reactivate is clicked', async () => {
    render(<GoalDetail goal={makeGoal({ status: 'completed' })} {...defaultProps} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId('reactivate-button'));
    expect(defaultProps.onReactivate).toHaveBeenCalledWith(1);
  });

  it('should show target reached prompt when numeric goal reaches target', () => {
    render(
      <GoalDetail
        goal={makeGoal({ currentValue: 1000, targetValue: 1000 })}
        {...defaultProps}
      />
    );
    expect(screen.getByTestId('target-reached-prompt')).toBeInTheDocument();
  });

  it('should show target reached prompt when percentage goal reaches 100', () => {
    render(
      <GoalDetail
        goal={makeGoal({ progressModel: 'percentage', percentage: 100 })}
        {...defaultProps}
      />
    );
    expect(screen.getByTestId('target-reached-prompt')).toBeInTheDocument();
  });

  it('should not show target reached prompt for completed goals', () => {
    render(
      <GoalDetail
        goal={makeGoal({ currentValue: 1000, targetValue: 1000, status: 'completed' })}
        {...defaultProps}
      />
    );
    expect(screen.queryByTestId('target-reached-prompt')).not.toBeInTheDocument();
  });

  it('should call onBack when back button is clicked', async () => {
    render(<GoalDetail goal={makeGoal()} {...defaultProps} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId('back-button'));
    expect(defaultProps.onBack).toHaveBeenCalled();
  });
});
```

**Test command:**
```bash
npx vitest run tests/screens/goals/GoalDetail.test.tsx
```

**Commit:** `feat: add GoalDetail with progress updates and status transitions`

---

## Task A10: Goals screen orchestrator (routing between list/form/detail)

**File:** `src/screens/goals/GoalsScreenContainer.tsx`
**Time:** 3 min

### A10.1 Create the orchestrator component

**File:** `src/screens/goals/GoalsScreenContainer.tsx`

```typescript
import React, { useState } from 'react';
import type { Goal } from '../../data/db';
import { useGoals } from '../../hooks/useGoals';
import GoalsScreen from './GoalsScreen';
import GoalForm from './GoalForm';
import GoalDetail from './GoalDetail';
import type { CreateGoalInput } from '../../data/goal-service';

type GoalsView = 'list' | 'create' | 'detail';

export default function GoalsScreenContainer() {
  const [view, setView] = useState<GoalsView>('list');
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const { addGoal, editGoal, removeGoal, markComplete, markArchived, markActive } =
    useGoals();

  function handleSelectGoal(goal: Goal) {
    setSelectedGoal(goal);
    setView('detail');
  }

  async function handleCreateGoal(input: CreateGoalInput) {
    await addGoal(input);
    setView('list');
  }

  function handleBackToList() {
    setSelectedGoal(null);
    setView('list');
  }

  switch (view) {
    case 'create':
      return (
        <GoalForm
          onSubmit={handleCreateGoal}
          onCancel={handleBackToList}
        />
      );

    case 'detail':
      if (!selectedGoal) {
        setView('list');
        return null;
      }
      return (
        <GoalDetail
          goal={selectedGoal}
          onUpdate={async (id, input) => {
            const updated = await editGoal(id, input);
            setSelectedGoal(updated);
            return updated;
          }}
          onComplete={async (id) => {
            const updated = await markComplete(id);
            setSelectedGoal(updated);
            return updated;
          }}
          onArchive={async (id) => {
            const updated = await markArchived(id);
            setSelectedGoal(updated);
            return updated;
          }}
          onReactivate={async (id) => {
            const updated = await markActive(id);
            setSelectedGoal(updated);
            return updated;
          }}
          onDelete={removeGoal}
          onBack={handleBackToList}
        />
      );

    case 'list':
    default:
      return (
        <GoalsScreen
          onCreateGoal={() => setView('create')}
          onSelectGoal={handleSelectGoal}
        />
      );
  }
}
```

This component replaces the goals placeholder in the router. Update `src/App.tsx` to use it:

In `src/App.tsx`, replace the goals route placeholder:

```typescript
// Replace:
//   <Route path="/goals" element={<GoalsPlaceholder />} />
// With:
import GoalsScreenContainer from './screens/goals/GoalsScreenContainer';
//   <Route path="/goals" element={<GoalsScreenContainer />} />
```

**Commit:** `feat: add GoalsScreenContainer orchestrator and wire route`

---

## Task A11: Dashboard goals aggregation widget

**File:** `src/screens/dashboard/GoalsWidget.tsx`
**Test file:** `tests/screens/dashboard/GoalsWidget.test.tsx`
**Time:** 5 min

### A11.1 Create the GoalsWidget component

**File:** `src/screens/dashboard/GoalsWidget.tsx`

```typescript
import React from 'react';

export interface GoalsWidgetProps {
  activeCount: number;
  completedCount: number;
  aggregateProgress: number | null;
  onNavigate: () => void;
}

export default function GoalsWidget({
  activeCount,
  completedCount,
  aggregateProgress,
  onNavigate,
}: GoalsWidgetProps) {
  const hasGoals = activeCount > 0 || completedCount > 0;

  return (
    <button
      type="button"
      onClick={onNavigate}
      className="w-full rounded-lg border border-gray-200 bg-white p-4 text-left transition-colors hover:bg-gray-50"
      data-testid="goals-widget"
    >
      <h2 className="mb-2 text-lg font-semibold text-gray-900">Goals</h2>

      {!hasGoals ? (
        <div data-testid="goals-zero-state">
          <p className="text-sm text-gray-500">
            No goals yet. Tap here to create your first goal and start tracking your progress.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Active</span>
            <span className="font-medium text-blue-700" data-testid="active-count">
              {activeCount}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Completed</span>
            <span className="font-medium text-green-700" data-testid="completed-count">
              {completedCount}
            </span>
          </div>

          {aggregateProgress !== null && (
            <div className="mt-2" data-testid="aggregate-progress">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Overall Progress</span>
                <span className="font-medium text-gray-900">{aggregateProgress}%</span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-blue-500"
                  style={{ width: `${Math.min(100, aggregateProgress)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </button>
  );
}
```

### A11.2 Create the GoalsWidget live-data wrapper

**File:** `src/screens/dashboard/GoalsWidgetContainer.tsx`

```typescript
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoalAggregation } from '../../hooks/useGoals';
import GoalsWidget from './GoalsWidget';

export default function GoalsWidgetContainer() {
  const navigate = useNavigate();
  const { aggregation } = useGoalAggregation();

  return (
    <GoalsWidget
      activeCount={aggregation.activeCount}
      completedCount={aggregation.completedCount}
      aggregateProgress={aggregation.aggregateProgress}
      onNavigate={() => navigate('/goals')}
    />
  );
}
```

### A11.3 Create GoalsWidget test

**File:** `tests/screens/dashboard/GoalsWidget.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GoalsWidget from '../../../src/screens/dashboard/GoalsWidget';

describe('GoalsWidget', () => {
  const onNavigate = vi.fn();

  it('should show zero state when no goals exist', () => {
    render(
      <GoalsWidget
        activeCount={0}
        completedCount={0}
        aggregateProgress={null}
        onNavigate={onNavigate}
      />
    );
    expect(screen.getByTestId('goals-zero-state')).toBeInTheDocument();
    expect(screen.getByText(/no goals yet/i)).toBeInTheDocument();
  });

  it('should show active and completed counts', () => {
    render(
      <GoalsWidget
        activeCount={3}
        completedCount={2}
        aggregateProgress={null}
        onNavigate={onNavigate}
      />
    );
    expect(screen.getByTestId('active-count')).toHaveTextContent('3');
    expect(screen.getByTestId('completed-count')).toHaveTextContent('2');
  });

  it('should show aggregate progress when available', () => {
    render(
      <GoalsWidget
        activeCount={2}
        completedCount={1}
        aggregateProgress={50}
        onNavigate={onNavigate}
      />
    );
    expect(screen.getByTestId('aggregate-progress')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('should not show aggregate progress when null', () => {
    render(
      <GoalsWidget
        activeCount={2}
        completedCount={0}
        aggregateProgress={null}
        onNavigate={onNavigate}
      />
    );
    expect(screen.queryByTestId('aggregate-progress')).not.toBeInTheDocument();
  });

  it('should call onNavigate when clicked', async () => {
    render(
      <GoalsWidget
        activeCount={1}
        completedCount={0}
        aggregateProgress={null}
        onNavigate={onNavigate}
      />
    );
    const user = userEvent.setup();
    await user.click(screen.getByTestId('goals-widget'));
    expect(onNavigate).toHaveBeenCalled();
  });
});
```

**Test command:**
```bash
npx vitest run tests/screens/dashboard/GoalsWidget.test.tsx
```

**Commit:** `feat: add dashboard goals aggregation widget with live data`

---

# Track B: Health Routines (Stories 024-027, 029)

---

## Task B1: Health service -- input types and validation

**File:** `src/data/health-service.ts`
**Test file:** `tests/data/health-service.test.ts`
**Time:** 5 min

### B1.1 Create the health service file

**File:** `src/data/health-service.ts`

```typescript
import { db } from './db';
import type { HealthRoutine, HealthLogEntry, TrackedMetric } from './db';
import { today as getToday } from '../lib/dates';

// --- Input types ---

export interface CreateRoutineInput {
  name: string;
  targetFrequency: number;
  trackedMetrics?: TrackedMetric[];
}

export interface UpdateRoutineInput {
  name?: string;
  targetFrequency?: number;
  trackedMetrics?: TrackedMetric[];
}

export interface CreateLogEntryInput {
  routineId: number;
  date?: string; // defaults to today
  metrics?: Record<string, number>;
}

// --- Constants ---

const VALID_METRIC_TYPES: TrackedMetric['type'][] = ['duration', 'distance', 'reps', 'weight'];

// --- Validation helpers ---

function validateRoutineName(name: unknown): asserts name is string {
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new Error('Routine name is required and must not be blank');
  }
}

function validateTargetFrequency(frequency: unknown): asserts frequency is number {
  if (
    typeof frequency !== 'number' ||
    !Number.isInteger(frequency) ||
    frequency <= 0
  ) {
    throw new Error('Target frequency must be a positive integer');
  }
}

function validateTrackedMetrics(metrics: TrackedMetric[] | undefined): void {
  if (!metrics || metrics.length === 0) return;

  for (const metric of metrics) {
    if (!VALID_METRIC_TYPES.includes(metric.type)) {
      throw new Error(
        `Metric type must be one of: ${VALID_METRIC_TYPES.join(', ')}`
      );
    }
  }
}

function validateLogDate(date: string): void {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    throw new Error('Log date must be a valid date');
  }

  const todayStr = getToday();
  if (date > todayStr) {
    throw new Error('Log date cannot be in the future');
  }
}

function validateMetricValues(metrics: Record<string, number> | undefined): void {
  if (!metrics) return;

  for (const [key, value] of Object.entries(metrics)) {
    if (typeof value !== 'number' || value < 0) {
      throw new Error(`Metric value for "${key}" must be a non-negative number`);
    }
  }
}
```

### B1.2 Create test skeleton

**File:** `tests/data/health-service.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/data/db';

beforeEach(async () => {
  await db.healthRoutines.clear();
  await db.healthLogEntries.clear();
});

describe('health-service validation', () => {
  it('placeholder - tests come in task B3', () => {
    expect(true).toBe(true);
  });
});
```

**Test command:**
```bash
npx vitest run tests/data/health-service.test.ts
```

**Commit:** `feat: add health service input types and validation helpers`

---

## Task B2: Health service -- CRUD operations

**File:** `src/data/health-service.ts`
**Time:** 5 min

Append CRUD functions.

### B2.1 Add routine CRUD

Append to `src/data/health-service.ts`:

```typescript
// --- Routine CRUD ---

export async function createRoutine(input: CreateRoutineInput): Promise<HealthRoutine> {
  validateRoutineName(input.name);
  validateTargetFrequency(input.targetFrequency);
  validateTrackedMetrics(input.trackedMetrics);

  const now = new Date().toISOString();
  const routine: Omit<HealthRoutine, 'id'> = {
    name: input.name.trim(),
    targetFrequency: input.targetFrequency,
    trackedMetrics: input.trackedMetrics ?? [],
    createdAt: now,
    updatedAt: now,
  };

  const id = await db.healthRoutines.add(routine as HealthRoutine);
  return { ...routine, id } as HealthRoutine;
}

export async function getRoutine(id: number): Promise<HealthRoutine | undefined> {
  return db.healthRoutines.get(id);
}

export async function getAllRoutines(): Promise<HealthRoutine[]> {
  const routines = await db.healthRoutines.toArray();
  return routines.sort((a, b) => a.name.localeCompare(b.name));
}

export async function updateRoutine(
  id: number,
  input: UpdateRoutineInput
): Promise<HealthRoutine> {
  const existing = await db.healthRoutines.get(id);
  if (!existing) {
    throw new Error(`Routine with id ${id} not found`);
  }

  if (input.name !== undefined) {
    validateRoutineName(input.name);
  }
  if (input.targetFrequency !== undefined) {
    validateTargetFrequency(input.targetFrequency);
  }
  if (input.trackedMetrics !== undefined) {
    validateTrackedMetrics(input.trackedMetrics);
  }

  const updates: Partial<HealthRoutine> = {
    ...input,
    updatedAt: new Date().toISOString(),
  };

  if (input.name !== undefined) {
    updates.name = input.name.trim();
  }

  await db.healthRoutines.update(id, updates);
  return (await db.healthRoutines.get(id))!;
}

export async function deleteRoutine(id: number): Promise<void> {
  const existing = await db.healthRoutines.get(id);
  if (!existing) {
    throw new Error(`Routine with id ${id} not found`);
  }

  // Cascade delete: remove all log entries for this routine
  await db.healthLogEntries.where('routineId').equals(id).delete();
  await db.healthRoutines.delete(id);
}
```

### B2.2 Add log entry CRUD

Append to `src/data/health-service.ts`:

```typescript
// --- Log Entry CRUD ---

export async function createLogEntry(input: CreateLogEntryInput): Promise<HealthLogEntry> {
  const routine = await db.healthRoutines.get(input.routineId);
  if (!routine) {
    throw new Error(`Routine with id ${input.routineId} not found`);
  }

  const date = input.date ?? getToday();
  validateLogDate(date);
  validateMetricValues(input.metrics);

  const entry: Omit<HealthLogEntry, 'id'> = {
    routineId: input.routineId,
    date,
    metrics: input.metrics,
    createdAt: new Date().toISOString(),
  };

  const id = await db.healthLogEntries.add(entry as HealthLogEntry);
  return { ...entry, id } as HealthLogEntry;
}

export async function getLogEntry(id: number): Promise<HealthLogEntry | undefined> {
  return db.healthLogEntries.get(id);
}

export async function getLogEntriesByRoutine(routineId: number): Promise<HealthLogEntry[]> {
  return db.healthLogEntries.where('routineId').equals(routineId).toArray();
}

export async function getLogEntriesByDate(date: string): Promise<HealthLogEntry[]> {
  return db.healthLogEntries.where('date').equals(date).toArray();
}

export async function getLogEntriesByRoutineAndDateRange(
  routineId: number,
  startDate: string,
  endDate: string
): Promise<HealthLogEntry[]> {
  const entries = await db.healthLogEntries
    .where('routineId')
    .equals(routineId)
    .toArray();
  return entries.filter((e) => e.date >= startDate && e.date <= endDate);
}

export async function deleteLogEntry(id: number): Promise<void> {
  const existing = await db.healthLogEntries.get(id);
  if (!existing) {
    throw new Error(`Log entry with id ${id} not found`);
  }
  await db.healthLogEntries.delete(id);
}
```

**Test command:**
```bash
npx vitest run tests/data/health-service.test.ts
```

**Commit:** `feat: add health service routine and log entry CRUD operations`

---

## Task B3: Health service -- streak calculation

**File:** `src/data/health-service.ts`
**Time:** 5 min

Append streak calculation logic.

### B3.1 Add streak and adherence functions

Append to `src/data/health-service.ts`:

```typescript
// --- Week helpers ---

/**
 * Get the Monday (start) of the ISO week containing the given date.
 * Returns YYYY-MM-DD string.
 */
function getWeekMonday(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDay();
  // day: 0=Sun,1=Mon,...,6=Sat -> offset to Monday
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

/**
 * Get the Sunday (end) of the ISO week containing the given date.
 */
function getWeekSunday(mondayStr: string): string {
  const monday = new Date(mondayStr + 'T00:00:00');
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday.toISOString().split('T')[0];
}

/**
 * Get the Monday of the previous week.
 */
function getPreviousWeekMonday(mondayStr: string): string {
  const monday = new Date(mondayStr + 'T00:00:00');
  const prev = new Date(monday);
  prev.setDate(monday.getDate() - 7);
  return prev.toISOString().split('T')[0];
}

// --- Streak calculation ---

/**
 * Calculate the streak (consecutive completed weeks) for a routine.
 *
 * Rules:
 * - A streak counts consecutive weeks (Mon-Sun) where log count >= targetFrequency.
 * - Current week counts only if target is already met.
 * - If the most recently completed week did not meet target, streak is 0.
 * - Calculated on demand from log data.
 */
export async function calculateStreak(routineId: number): Promise<number> {
  const routine = await db.healthRoutines.get(routineId);
  if (!routine) return 0;

  const allEntries = await db.healthLogEntries
    .where('routineId')
    .equals(routineId)
    .toArray();

  if (allEntries.length === 0) return 0;

  const todayStr = getToday();
  const currentWeekMonday = getWeekMonday(todayStr);

  // Group entries by week (keyed by Monday date)
  const entriesByWeek = new Map<string, number>();
  for (const entry of allEntries) {
    const weekMon = getWeekMonday(entry.date);
    entriesByWeek.set(weekMon, (entriesByWeek.get(weekMon) ?? 0) + 1);
  }

  let streak = 0;
  let weekMonday = currentWeekMonday;

  // Check current week first
  const currentWeekCount = entriesByWeek.get(weekMonday) ?? 0;
  if (currentWeekCount >= routine.targetFrequency) {
    streak = 1;
    weekMonday = getPreviousWeekMonday(weekMonday);
  } else {
    // Current week not met; start checking from previous completed week
    weekMonday = getPreviousWeekMonday(weekMonday);
  }

  // Walk backward through previous weeks
  while (true) {
    const count = entriesByWeek.get(weekMonday) ?? 0;
    if (count >= routine.targetFrequency) {
      streak++;
      weekMonday = getPreviousWeekMonday(weekMonday);
    } else {
      break;
    }
  }

  return streak;
}

// --- Weekly adherence ---

/**
 * Get the number of log entries for a routine in the current week (Mon-Sun).
 */
export async function getWeeklyCount(routineId: number): Promise<number> {
  const todayStr = getToday();
  const mondayStr = getWeekMonday(todayStr);
  const sundayStr = getWeekSunday(mondayStr);

  const entries = await getLogEntriesByRoutineAndDateRange(
    routineId,
    mondayStr,
    sundayStr
  );
  return entries.length;
}

/**
 * Get the number of distinct routines completed today.
 */
export async function getRoutinesCompletedToday(): Promise<number> {
  const todayStr = getToday();
  const entries = await db.healthLogEntries.where('date').equals(todayStr).toArray();
  const uniqueRoutineIds = new Set(entries.map((e) => e.routineId));
  return uniqueRoutineIds.size;
}

/**
 * Determine if a routine is "on track" for the current week.
 *
 * A routine is on track if:
 * - It has already met its weekly target, OR
 * - The remaining entries needed can still be achieved in the remaining days
 *   (i.e., remainingNeeded <= remainingDays)
 */
export async function isRoutineOnTrack(routineId: number): Promise<boolean> {
  const routine = await db.healthRoutines.get(routineId);
  if (!routine) return false;

  const weeklyCount = await getWeeklyCount(routineId);

  if (weeklyCount >= routine.targetFrequency) return true;

  const todayStr = getToday();
  const todayDate = new Date(todayStr + 'T00:00:00');
  const mondayStr = getWeekMonday(todayStr);
  const sundayStr = getWeekSunday(mondayStr);
  const sundayDate = new Date(sundayStr + 'T00:00:00');

  const remainingDays = Math.ceil(
    (sundayDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1; // include today

  const remainingNeeded = routine.targetFrequency - weeklyCount;

  return remainingNeeded <= remainingDays;
}
```

**Test command:**
```bash
npx vitest run tests/data/health-service.test.ts
```

**Commit:** `feat: add streak calculation and weekly adherence logic`

---

## Task B4: Health service -- dashboard aggregation

**File:** `src/data/health-service.ts`
**Time:** 3 min

Append aggregation function for the dashboard health widget.

### B4.1 Add health aggregation function

Append to `src/data/health-service.ts`:

```typescript
// --- Dashboard aggregation ---

export interface HealthAggregation {
  routinesCompletedToday: number;
  totalRoutines: number;
  onTrackCount: number;
  behindCount: number;
  bestStreak: { weeks: number; routineName: string } | null;
}

export async function getHealthAggregation(): Promise<HealthAggregation> {
  const routines = await getAllRoutines();

  if (routines.length === 0) {
    return {
      routinesCompletedToday: 0,
      totalRoutines: 0,
      onTrackCount: 0,
      behindCount: 0,
      bestStreak: null,
    };
  }

  const routinesCompletedToday = await getRoutinesCompletedToday();

  let onTrackCount = 0;
  let behindCount = 0;
  let bestStreak: { weeks: number; routineName: string } | null = null;

  for (const routine of routines) {
    const onTrack = await isRoutineOnTrack(routine.id!);
    if (onTrack) {
      onTrackCount++;
    } else {
      behindCount++;
    }

    const streak = await calculateStreak(routine.id!);
    if (bestStreak === null || streak > bestStreak.weeks) {
      bestStreak = { weeks: streak, routineName: routine.name };
    }
  }

  // If all streaks are 0, don't highlight any
  if (bestStreak && bestStreak.weeks === 0) {
    bestStreak = null;
  }

  return {
    routinesCompletedToday,
    totalRoutines: routines.length,
    onTrackCount,
    behindCount,
    bestStreak,
  };
}
```

**Test command:**
```bash
npx vitest run tests/data/health-service.test.ts
```

**Commit:** `feat: add health dashboard aggregation function`

---

## Task B5: Health service tests -- full coverage

**File:** `tests/data/health-service.test.ts`
**Time:** 5 min

Replace skeleton with full tests.

### B5.1 Write complete health service tests

**File:** `tests/data/health-service.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { db } from '../../src/data/db';
import {
  createRoutine,
  getRoutine,
  getAllRoutines,
  updateRoutine,
  deleteRoutine,
  createLogEntry,
  getLogEntry,
  getLogEntriesByRoutine,
  getLogEntriesByDate,
  getLogEntriesByRoutineAndDateRange,
  deleteLogEntry,
  calculateStreak,
  getWeeklyCount,
  getRoutinesCompletedToday,
  isRoutineOnTrack,
  getHealthAggregation,
} from '../../src/data/health-service';
import * as dates from '../../src/lib/dates';

beforeEach(async () => {
  await db.healthRoutines.clear();
  await db.healthLogEntries.clear();
});

// --- Helper to mock today() ---
function mockToday(dateStr: string) {
  vi.spyOn(dates, 'today').mockReturnValue(dateStr);
}

afterEach(() => {
  vi.restoreAllMocks();
});

// --- Routine CRUD tests ---

describe('createRoutine', () => {
  it('should create a routine with frequency and metrics', async () => {
    const routine = await createRoutine({
      name: 'Morning Run',
      targetFrequency: 3,
      trackedMetrics: [
        { type: 'duration', unit: 'minutes' },
        { type: 'distance', unit: 'km' },
      ],
    });

    expect(routine.id).toBeDefined();
    expect(routine.name).toBe('Morning Run');
    expect(routine.targetFrequency).toBe(3);
    expect(routine.trackedMetrics).toHaveLength(2);
    expect(routine.createdAt).toBeDefined();
  });

  it('should create a routine with no tracked metrics', async () => {
    const routine = await createRoutine({
      name: 'Meditation',
      targetFrequency: 7,
    });

    expect(routine.trackedMetrics).toEqual([]);
  });

  it('should reject routine with empty name', async () => {
    await expect(
      createRoutine({ name: '', targetFrequency: 3 })
    ).rejects.toThrow('Routine name is required');
  });

  it('should reject routine with non-positive frequency', async () => {
    await expect(
      createRoutine({ name: 'Test', targetFrequency: 0 })
    ).rejects.toThrow('Target frequency must be a positive integer');
  });

  it('should reject routine with non-integer frequency', async () => {
    await expect(
      createRoutine({ name: 'Test', targetFrequency: 2.5 })
    ).rejects.toThrow('Target frequency must be a positive integer');
  });

  it('should trim routine name', async () => {
    const routine = await createRoutine({
      name: '  Running  ',
      targetFrequency: 3,
    });
    expect(routine.name).toBe('Running');
  });
});

describe('getAllRoutines', () => {
  it('should return routines sorted alphabetically', async () => {
    await createRoutine({ name: 'Yoga', targetFrequency: 5 });
    await createRoutine({ name: 'Abs', targetFrequency: 3 });
    await createRoutine({ name: 'Meditation', targetFrequency: 7 });

    const routines = await getAllRoutines();
    expect(routines.map((r) => r.name)).toEqual(['Abs', 'Meditation', 'Yoga']);
  });
});

describe('updateRoutine', () => {
  it('should update routine name', async () => {
    const routine = await createRoutine({ name: 'Run', targetFrequency: 3 });
    const updated = await updateRoutine(routine.id!, { name: 'Morning Run' });
    expect(updated.name).toBe('Morning Run');
  });

  it('should reject update for non-existent routine', async () => {
    await expect(updateRoutine(99999, { name: 'Nope' })).rejects.toThrow('not found');
  });
});

describe('deleteRoutine', () => {
  it('should delete routine and cascade log entries', async () => {
    const routine = await createRoutine({ name: 'Run', targetFrequency: 3 });
    mockToday('2026-03-18');
    await createLogEntry({ routineId: routine.id!, date: '2026-03-16' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-17' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-18' });

    await deleteRoutine(routine.id!);

    const found = await getRoutine(routine.id!);
    expect(found).toBeUndefined();

    const entries = await getLogEntriesByRoutine(routine.id!);
    expect(entries).toHaveLength(0);
  });

  it('should reject deleting non-existent routine', async () => {
    await expect(deleteRoutine(99999)).rejects.toThrow('not found');
  });
});

// --- Log Entry CRUD tests ---

describe('createLogEntry', () => {
  it('should create a log entry with metrics', async () => {
    mockToday('2026-03-18');
    const routine = await createRoutine({
      name: 'Run',
      targetFrequency: 3,
      trackedMetrics: [{ type: 'duration', unit: 'minutes' }],
    });

    const entry = await createLogEntry({
      routineId: routine.id!,
      date: '2026-03-18',
      metrics: { duration: 30 },
    });

    expect(entry.id).toBeDefined();
    expect(entry.routineId).toBe(routine.id);
    expect(entry.date).toBe('2026-03-18');
    expect(entry.metrics?.duration).toBe(30);
  });

  it('should create a log entry without metrics', async () => {
    mockToday('2026-03-18');
    const routine = await createRoutine({ name: 'Meditation', targetFrequency: 7 });
    const entry = await createLogEntry({
      routineId: routine.id!,
      date: '2026-03-18',
    });

    expect(entry.metrics).toBeUndefined();
  });

  it('should default date to today', async () => {
    mockToday('2026-03-18');
    const routine = await createRoutine({ name: 'Test', targetFrequency: 1 });
    const entry = await createLogEntry({ routineId: routine.id! });
    expect(entry.date).toBe('2026-03-18');
  });

  it('should allow back-dated entries', async () => {
    mockToday('2026-03-18');
    const routine = await createRoutine({ name: 'Test', targetFrequency: 1 });
    const entry = await createLogEntry({
      routineId: routine.id!,
      date: '2026-03-15',
    });
    expect(entry.date).toBe('2026-03-15');
  });

  it('should reject future dates', async () => {
    mockToday('2026-03-18');
    const routine = await createRoutine({ name: 'Test', targetFrequency: 1 });
    await expect(
      createLogEntry({ routineId: routine.id!, date: '2026-03-19' })
    ).rejects.toThrow('Log date cannot be in the future');
  });

  it('should reject non-existent routine', async () => {
    await expect(
      createLogEntry({ routineId: 99999, date: '2026-03-18' })
    ).rejects.toThrow('not found');
  });

  it('should reject negative metric values', async () => {
    mockToday('2026-03-18');
    const routine = await createRoutine({ name: 'Test', targetFrequency: 1 });
    await expect(
      createLogEntry({
        routineId: routine.id!,
        date: '2026-03-18',
        metrics: { duration: -5 },
      })
    ).rejects.toThrow('non-negative');
  });

  it('should allow multiple entries same routine same day', async () => {
    mockToday('2026-03-18');
    const routine = await createRoutine({ name: 'Test', targetFrequency: 1 });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-18' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-18' });

    const entries = await getLogEntriesByRoutine(routine.id!);
    expect(entries).toHaveLength(2);
  });
});

describe('getLogEntriesByRoutineAndDateRange', () => {
  it('should return entries within date range', async () => {
    mockToday('2026-03-18');
    const routine = await createRoutine({ name: 'Test', targetFrequency: 1 });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-10' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-15' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-18' });

    const entries = await getLogEntriesByRoutineAndDateRange(
      routine.id!,
      '2026-03-14',
      '2026-03-16'
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].date).toBe('2026-03-15');
  });
});

// --- Streak calculation tests ---

describe('calculateStreak', () => {
  it('should return 0 for new routine with no entries', async () => {
    const routine = await createRoutine({ name: 'Test', targetFrequency: 3 });
    const streak = await calculateStreak(routine.id!);
    expect(streak).toBe(0);
  });

  it('should calculate multi-week streak', async () => {
    // Week starts Monday. Let's say today is Wednesday 2026-03-18.
    // Week of 3/16 (Mon) - current week
    // Week of 3/9 (Mon) - previous week
    // Week of 3/2 (Mon) - two weeks ago
    mockToday('2026-03-18');

    const routine = await createRoutine({ name: 'Run', targetFrequency: 3 });

    // Week of 3/2 (3 entries)
    await createLogEntry({ routineId: routine.id!, date: '2026-03-02' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-04' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-06' });

    // Week of 3/9 (3 entries)
    await createLogEntry({ routineId: routine.id!, date: '2026-03-09' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-11' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-13' });

    // Week of 3/16 (3 entries - current week, target met)
    await createLogEntry({ routineId: routine.id!, date: '2026-03-16' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-17' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-18' });

    const streak = await calculateStreak(routine.id!);
    expect(streak).toBe(3);
  });

  it('should reset streak on missed week', async () => {
    mockToday('2026-03-18');

    const routine = await createRoutine({ name: 'Run', targetFrequency: 3 });

    // Week of 3/2 (3 entries - met)
    await createLogEntry({ routineId: routine.id!, date: '2026-03-02' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-04' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-06' });

    // Week of 3/9 (1 entry - NOT met, breaks streak)
    await createLogEntry({ routineId: routine.id!, date: '2026-03-09' });

    // Week of 3/16 (3 entries - met)
    await createLogEntry({ routineId: routine.id!, date: '2026-03-16' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-17' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-18' });

    const streak = await calculateStreak(routine.id!);
    expect(streak).toBe(1); // Only current week
  });

  it('should not count current week if target not met', async () => {
    mockToday('2026-03-18');

    const routine = await createRoutine({ name: 'Run', targetFrequency: 3 });

    // Week of 3/9 (3 entries - met)
    await createLogEntry({ routineId: routine.id!, date: '2026-03-09' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-11' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-13' });

    // Week of 3/16 (1 entry - not met yet)
    await createLogEntry({ routineId: routine.id!, date: '2026-03-16' });

    const streak = await calculateStreak(routine.id!);
    expect(streak).toBe(1); // Only previous week
  });

  it('should count current week if target already met', async () => {
    mockToday('2026-03-18');

    const routine = await createRoutine({ name: 'Run', targetFrequency: 3 });

    // Week of 3/9 (3 entries - met)
    await createLogEntry({ routineId: routine.id!, date: '2026-03-09' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-11' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-13' });

    // Week of 3/16 (3 entries - met)
    await createLogEntry({ routineId: routine.id!, date: '2026-03-16' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-17' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-18' });

    const streak = await calculateStreak(routine.id!);
    expect(streak).toBe(2);
  });

  it('should recalculate on back-dated entry filling a missed week', async () => {
    mockToday('2026-03-18');

    const routine = await createRoutine({ name: 'Run', targetFrequency: 2 });

    // Week of 3/2 (2 entries - met)
    await createLogEntry({ routineId: routine.id!, date: '2026-03-02' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-04' });

    // Week of 3/9 (1 entry - not met)
    await createLogEntry({ routineId: routine.id!, date: '2026-03-09' });

    // Week of 3/16 (2 entries - met)
    await createLogEntry({ routineId: routine.id!, date: '2026-03-16' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-18' });

    let streak = await calculateStreak(routine.id!);
    expect(streak).toBe(1); // Only current week, week 3/9 broke it

    // Back-date an entry to fill week 3/9
    await createLogEntry({ routineId: routine.id!, date: '2026-03-11' });

    streak = await calculateStreak(routine.id!);
    expect(streak).toBe(3); // All three weeks now consecutive
  });
});

// --- Adherence tests ---

describe('getWeeklyCount', () => {
  it('should count entries for current week', async () => {
    mockToday('2026-03-18'); // Wednesday
    const routine = await createRoutine({ name: 'Test', targetFrequency: 3 });

    // Current week (Mon 3/16 - Sun 3/22)
    await createLogEntry({ routineId: routine.id!, date: '2026-03-16' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-18' });

    // Previous week
    await createLogEntry({ routineId: routine.id!, date: '2026-03-13' });

    const count = await getWeeklyCount(routine.id!);
    expect(count).toBe(2);
  });
});

describe('getRoutinesCompletedToday', () => {
  it('should count distinct routines with entries today', async () => {
    mockToday('2026-03-18');
    const r1 = await createRoutine({ name: 'Run', targetFrequency: 3 });
    const r2 = await createRoutine({ name: 'Yoga', targetFrequency: 5 });
    await createRoutine({ name: 'Swim', targetFrequency: 2 }); // no entry today

    await createLogEntry({ routineId: r1.id!, date: '2026-03-18' });
    await createLogEntry({ routineId: r1.id!, date: '2026-03-18' }); // same routine twice
    await createLogEntry({ routineId: r2.id!, date: '2026-03-18' });

    const count = await getRoutinesCompletedToday();
    expect(count).toBe(2); // r1 and r2, even though r1 logged twice
  });
});

describe('isRoutineOnTrack', () => {
  it('should return true when target already met', async () => {
    mockToday('2026-03-18'); // Wednesday
    const routine = await createRoutine({ name: 'Test', targetFrequency: 2 });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-16' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-17' });

    const onTrack = await isRoutineOnTrack(routine.id!);
    expect(onTrack).toBe(true);
  });

  it('should return true when remaining is achievable', async () => {
    mockToday('2026-03-16'); // Monday, 7 days remaining in week
    const routine = await createRoutine({ name: 'Test', targetFrequency: 3 });
    // 0 entries but 7 days left -> 3 needed in 7 days = on track

    const onTrack = await isRoutineOnTrack(routine.id!);
    expect(onTrack).toBe(true);
  });

  it('should return false when behind pace', async () => {
    mockToday('2026-03-22'); // Sunday, last day of week
    const routine = await createRoutine({ name: 'Test', targetFrequency: 5 });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-16' });
    // 1 entry, 4 more needed, but only 1 day left -> behind

    const onTrack = await isRoutineOnTrack(routine.id!);
    expect(onTrack).toBe(false);
  });
});

// --- Dashboard aggregation tests ---

describe('getHealthAggregation', () => {
  it('should return zero state when no routines exist', async () => {
    const agg = await getHealthAggregation();
    expect(agg.totalRoutines).toBe(0);
    expect(agg.routinesCompletedToday).toBe(0);
    expect(agg.onTrackCount).toBe(0);
    expect(agg.behindCount).toBe(0);
    expect(agg.bestStreak).toBeNull();
  });

  it('should aggregate data across routines', async () => {
    mockToday('2026-03-18');

    const r1 = await createRoutine({ name: 'Run', targetFrequency: 3 });
    const r2 = await createRoutine({ name: 'Yoga', targetFrequency: 5 });

    // Log r1 today (completed today)
    await createLogEntry({ routineId: r1.id!, date: '2026-03-18' });

    // r1 has 1 of 3 this week, need 2 more in remaining 4 days = on track
    // r2 has 0 of 5 this week, need 5 in remaining 5 days (Wed-Sun) = on track

    const agg = await getHealthAggregation();
    expect(agg.totalRoutines).toBe(2);
    expect(agg.routinesCompletedToday).toBe(1);
    expect(agg.bestStreak).toBeNull(); // no complete weeks yet
  });

  it('should return null bestStreak when all streaks are zero', async () => {
    mockToday('2026-03-18');
    await createRoutine({ name: 'Run', targetFrequency: 3 });

    const agg = await getHealthAggregation();
    expect(agg.bestStreak).toBeNull();
  });
});
```

**Test command:**
```bash
npx vitest run tests/data/health-service.test.ts
```

**Commit:** `test: add comprehensive health service tests including streaks`

---

## Task B6: useHealth hook

**File:** `src/hooks/useHealth.ts`
**Test file:** `tests/hooks/useHealth.test.ts`
**Time:** 5 min

### B6.1 Create the useHealth hook

**File:** `src/hooks/useHealth.ts`

```typescript
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import type { HealthRoutine, HealthLogEntry } from '../data/db';
import {
  createRoutine,
  updateRoutine,
  deleteRoutine,
  createLogEntry,
  deleteLogEntry,
  getWeeklyCount,
  calculateStreak,
  getHealthAggregation,
} from '../data/health-service';
import type {
  CreateRoutineInput,
  UpdateRoutineInput,
  CreateLogEntryInput,
  HealthAggregation,
} from '../data/health-service';

// --- Routine adherence info ---

export interface RoutineWithAdherence extends HealthRoutine {
  weeklyCount: number;
  streak: number;
}

export interface UseHealthReturn {
  routines: RoutineWithAdherence[];
  loading: boolean;
  addRoutine: (input: CreateRoutineInput) => Promise<HealthRoutine>;
  editRoutine: (id: number, input: UpdateRoutineInput) => Promise<HealthRoutine>;
  removeRoutine: (id: number) => Promise<void>;
  logEntry: (input: CreateLogEntryInput) => Promise<HealthLogEntry>;
  removeLogEntry: (id: number) => Promise<void>;
}

export function useHealth(): UseHealthReturn {
  const routines = useLiveQuery(
    async () => {
      const allRoutines = await db.healthRoutines.toArray();
      allRoutines.sort((a, b) => a.name.localeCompare(b.name));

      const enriched: RoutineWithAdherence[] = await Promise.all(
        allRoutines.map(async (routine) => {
          const weeklyCount = await getWeeklyCount(routine.id!);
          const streak = await calculateStreak(routine.id!);
          return { ...routine, weeklyCount, streak };
        })
      );

      return enriched;
    },
    [],
    [] as RoutineWithAdherence[]
  );

  const loading = routines === undefined;

  return {
    routines: routines ?? [],
    loading,
    addRoutine: createRoutine,
    editRoutine: updateRoutine,
    removeRoutine: deleteRoutine,
    logEntry: createLogEntry,
    removeLogEntry: deleteLogEntry,
  };
}

export interface UseHealthAggregationReturn {
  aggregation: HealthAggregation;
  loading: boolean;
}

export function useHealthAggregation(): UseHealthAggregationReturn {
  const defaultAgg: HealthAggregation = {
    routinesCompletedToday: 0,
    totalRoutines: 0,
    onTrackCount: 0,
    behindCount: 0,
    bestStreak: null,
  };

  const aggregation = useLiveQuery(
    () => getHealthAggregation(),
    [],
    defaultAgg
  );

  return {
    aggregation: aggregation ?? defaultAgg,
    loading: aggregation === undefined,
  };
}
```

### B6.2 Create the useHealth hook test

**File:** `tests/hooks/useHealth.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { db } from '../../src/data/db';
import { useHealth, useHealthAggregation } from '../../src/hooks/useHealth';
import * as dates from '../../src/lib/dates';

beforeEach(async () => {
  await db.healthRoutines.clear();
  await db.healthLogEntries.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useHealth', () => {
  it('should return empty array when no routines exist', async () => {
    const { result } = renderHook(() => useHealth());
    await waitFor(() => {
      expect(result.current.routines).toEqual([]);
    });
  });

  it('should add a routine and reflect it in the list', async () => {
    vi.spyOn(dates, 'today').mockReturnValue('2026-03-18');
    const { result } = renderHook(() => useHealth());

    await act(async () => {
      await result.current.addRoutine({
        name: 'Morning Run',
        targetFrequency: 3,
      });
    });

    await waitFor(() => {
      expect(result.current.routines).toHaveLength(1);
      expect(result.current.routines[0].name).toBe('Morning Run');
      expect(result.current.routines[0].weeklyCount).toBe(0);
      expect(result.current.routines[0].streak).toBe(0);
    });
  });

  it('should delete a routine', async () => {
    vi.spyOn(dates, 'today').mockReturnValue('2026-03-18');
    const { result } = renderHook(() => useHealth());

    let routineId: number;
    await act(async () => {
      const r = await result.current.addRoutine({
        name: 'Delete Me',
        targetFrequency: 1,
      });
      routineId = r.id!;
    });

    await act(async () => {
      await result.current.removeRoutine(routineId);
    });

    await waitFor(() => {
      expect(result.current.routines).toHaveLength(0);
    });
  });
});

describe('useHealthAggregation', () => {
  it('should return zero state initially', async () => {
    const { result } = renderHook(() => useHealthAggregation());
    await waitFor(() => {
      expect(result.current.aggregation.totalRoutines).toBe(0);
      expect(result.current.aggregation.bestStreak).toBeNull();
    });
  });
});
```

**Test command:**
```bash
npx vitest run tests/hooks/useHealth.test.ts
```

**Commit:** `feat: add useHealth and useHealthAggregation hooks`

---

## Task B7: Health routines screen layout

**File:** `src/screens/health/HealthScreen.tsx`
**File:** `src/screens/health/RoutineCard.tsx`
**Test file:** `tests/screens/health/HealthScreen.test.tsx`
**Time:** 5 min

### B7.1 Create the RoutineCard component

**File:** `src/screens/health/RoutineCard.tsx`

```typescript
import React from 'react';
import type { RoutineWithAdherence } from '../../hooks/useHealth';

interface RoutineCardProps {
  routine: RoutineWithAdherence;
  onQuickLog: (routineId: number) => void;
  onEdit: (routine: RoutineWithAdherence) => void;
  onDelete: (routineId: number) => void;
}

export default function RoutineCard({
  routine,
  onQuickLog,
  onEdit,
  onDelete,
}: RoutineCardProps) {
  const isOnTarget = routine.weeklyCount >= routine.targetFrequency;

  return (
    <div
      className="rounded-lg border border-gray-200 bg-white p-4"
      data-testid={`routine-card-${routine.id}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{routine.name}</h3>
          <div className="mt-1 text-sm text-gray-500">
            {routine.targetFrequency}x / week
          </div>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onEdit(routine)}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label={`Edit ${routine.name}`}
            data-testid={`edit-routine-${routine.id}`}
          >
            &#9998;
          </button>
          <button
            type="button"
            onClick={() => onDelete(routine.id!)}
            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
            aria-label={`Delete ${routine.name}`}
            data-testid={`delete-routine-${routine.id}`}
          >
            &#10005;
          </button>
        </div>
      </div>

      {/* Adherence indicator */}
      <div className="mt-3 flex items-center justify-between">
        <div
          className={`text-sm font-medium ${
            isOnTarget ? 'text-green-600' : 'text-gray-600'
          }`}
          data-testid={`adherence-${routine.id}`}
        >
          {routine.weeklyCount} of {routine.targetFrequency} this week
          {isOnTarget && ' \u2713'}
        </div>

        {routine.streak > 0 && (
          <div
            className="text-sm font-medium text-orange-600"
            data-testid={`streak-${routine.id}`}
          >
            {routine.streak} week{routine.streak !== 1 ? 's' : ''} streak
          </div>
        )}
      </div>

      {/* Quick log button */}
      <button
        type="button"
        onClick={() => onQuickLog(routine.id!)}
        className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        data-testid={`quick-log-${routine.id}`}
      >
        Log Today
      </button>
    </div>
  );
}
```

### B7.2 Create the HealthScreen component

**File:** `src/screens/health/HealthScreen.tsx`

```typescript
import React, { useState } from 'react';
import { useHealth } from '../../hooks/useHealth';
import type { RoutineWithAdherence } from '../../hooks/useHealth';
import RoutineCard from './RoutineCard';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import LoadingSpinner from '../../components/LoadingSpinner';

interface HealthScreenProps {
  onCreateRoutine: () => void;
  onEditRoutine: (routine: RoutineWithAdherence) => void;
  onQuickLog: (routineId: number) => void;
}

export default function HealthScreen({
  onCreateRoutine,
  onEditRoutine,
  onQuickLog,
}: HealthScreenProps) {
  const { routines, loading, removeRoutine } = useHealth();
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);

  async function handleConfirmDelete() {
    if (deleteTarget) {
      await removeRoutine(deleteTarget.id);
      setDeleteTarget(null);
    }
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Health Routines</h1>
        <button
          type="button"
          onClick={onCreateRoutine}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          data-testid="create-routine-button"
        >
          + New Routine
        </button>
      </div>

      {routines.length === 0 ? (
        <EmptyState
          message="No health routines yet. Define your first routine to start tracking your habits!"
          actionLabel="Create Routine"
          onAction={onCreateRoutine}
        />
      ) : (
        <div className="space-y-3" data-testid="routines-list">
          {routines.map((routine) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              onQuickLog={onQuickLog}
              onEdit={onEditRoutine}
              onDelete={(id) => {
                const r = routines.find((r) => r.id === id);
                setDeleteTarget({ id, name: r?.name ?? '' });
              }}
            />
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Routine"
          message={`Are you sure you want to delete "${deleteTarget.name}"? All log entries for this routine will also be permanently deleted.`}
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
```

### B7.3 Create HealthScreen test

**File:** `tests/screens/health/HealthScreen.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '../../../src/data/db';
import { createRoutine, createLogEntry } from '../../../src/data/health-service';
import HealthScreen from '../../../src/screens/health/HealthScreen';
import * as dates from '../../../src/lib/dates';

beforeEach(async () => {
  await db.healthRoutines.clear();
  await db.healthLogEntries.clear();
  vi.spyOn(dates, 'today').mockReturnValue('2026-03-18');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('HealthScreen', () => {
  const defaultProps = {
    onCreateRoutine: vi.fn(),
    onEditRoutine: vi.fn(),
    onQuickLog: vi.fn(),
  };

  it('should show empty state when no routines exist', async () => {
    render(<HealthScreen {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/no health routines yet/i)).toBeInTheDocument();
    });
  });

  it('should show create routine button', async () => {
    render(<HealthScreen {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByTestId('create-routine-button')).toBeInTheDocument();
    });
  });

  it('should display routines with adherence indicators', async () => {
    const routine = await createRoutine({
      name: 'Morning Run',
      targetFrequency: 3,
    });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-16' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-18' });

    render(<HealthScreen {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Morning Run')).toBeInTheDocument();
      expect(screen.getByText('3x / week')).toBeInTheDocument();
      expect(screen.getByTestId(`adherence-${routine.id}`)).toHaveTextContent(
        '2 of 3 this week'
      );
    });
  });

  it('should call onQuickLog when Log Today is clicked', async () => {
    const routine = await createRoutine({
      name: 'Yoga',
      targetFrequency: 5,
    });

    render(<HealthScreen {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Yoga')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByTestId(`quick-log-${routine.id}`));

    expect(defaultProps.onQuickLog).toHaveBeenCalledWith(routine.id);
  });

  it('should call onCreateRoutine when create button is clicked', async () => {
    render(<HealthScreen {...defaultProps} />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByTestId('create-routine-button')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('create-routine-button'));
    expect(defaultProps.onCreateRoutine).toHaveBeenCalled();
  });
});
```

**Test command:**
```bash
npx vitest run tests/screens/health/HealthScreen.test.tsx
```

**Commit:** `feat: add HealthScreen layout with RoutineCard and adherence indicators`

---

## Task B8: Routine creation/edit form

**File:** `src/screens/health/RoutineForm.tsx`
**Test file:** `tests/screens/health/RoutineForm.test.tsx`
**Time:** 5 min

### B8.1 Create the RoutineForm component

**File:** `src/screens/health/RoutineForm.tsx`

```typescript
import React, { useState } from 'react';
import type { HealthRoutine, TrackedMetric } from '../../data/db';
import type { CreateRoutineInput, UpdateRoutineInput } from '../../data/health-service';

interface RoutineFormProps {
  routine?: HealthRoutine; // if editing
  onSubmit: (input: CreateRoutineInput | UpdateRoutineInput) => Promise<void>;
  onCancel: () => void;
}

const METRIC_TYPE_OPTIONS: { value: TrackedMetric['type']; label: string }[] = [
  { value: 'duration', label: 'Duration (minutes)' },
  { value: 'distance', label: 'Distance' },
  { value: 'reps', label: 'Reps' },
  { value: 'weight', label: 'Weight' },
];

export default function RoutineForm({ routine, onSubmit, onCancel }: RoutineFormProps) {
  const isEditing = !!routine;
  const [name, setName] = useState(routine?.name ?? '');
  const [frequency, setFrequency] = useState(String(routine?.targetFrequency ?? ''));
  const [metrics, setMetrics] = useState<TrackedMetric[]>(
    routine?.trackedMetrics ?? []
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Routine name is required';
    const freq = parseInt(frequency, 10);
    if (!frequency || isNaN(freq) || freq <= 0 || !Number.isInteger(freq)) {
      errs.frequency = 'Frequency must be a positive whole number';
    }
    return errs;
  }

  function addMetric() {
    setMetrics([...metrics, { type: 'duration', unit: 'minutes' }]);
  }

  function removeMetric(index: number) {
    setMetrics(metrics.filter((_, i) => i !== index));
  }

  function updateMetric(index: number, field: 'type' | 'unit', value: string) {
    const updated = [...metrics];
    if (field === 'type') {
      updated[index] = {
        ...updated[index],
        type: value as TrackedMetric['type'],
        unit: value === 'duration' ? 'minutes' : updated[index].unit,
      };
    } else {
      updated[index] = { ...updated[index], unit: value };
    }
    setMetrics(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      const input = {
        name: name.trim(),
        targetFrequency: parseInt(frequency, 10),
        trackedMetrics: metrics,
      };
      await onSubmit(input);
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : 'Failed to save routine',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg p-4">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        {isEditing ? 'Edit Routine' : 'Create Routine'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4" data-testid="routine-form">
        {/* Name */}
        <div>
          <label htmlFor="routineName" className="block text-sm font-medium text-gray-700">
            Routine Name *
          </label>
          <input
            id="routineName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Morning Run, Yoga, Meditation"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
            data-testid="routine-name-input"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600" data-testid="error-name">
              {errors.name}
            </p>
          )}
        </div>

        {/* Frequency */}
        <div>
          <label htmlFor="frequency" className="block text-sm font-medium text-gray-700">
            Target Frequency (per week) *
          </label>
          <input
            id="frequency"
            type="number"
            min="1"
            step="1"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            placeholder="e.g., 3"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
            data-testid="frequency-input"
          />
          {errors.frequency && (
            <p className="mt-1 text-sm text-red-600" data-testid="error-frequency">
              {errors.frequency}
            </p>
          )}
        </div>

        {/* Tracked Metrics */}
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Tracked Metrics (optional)
            </label>
            <button
              type="button"
              onClick={addMetric}
              className="text-sm text-blue-600 hover:underline"
              data-testid="add-metric-button"
            >
              + Add Metric
            </button>
          </div>

          {metrics.length > 0 && (
            <div className="mt-2 space-y-2">
              {metrics.map((metric, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded border border-gray-200 p-2"
                  data-testid={`metric-${index}`}
                >
                  <select
                    value={metric.type}
                    onChange={(e) => updateMetric(index, 'type', e.target.value)}
                    className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                    data-testid={`metric-type-${index}`}
                  >
                    {METRIC_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {metric.type !== 'duration' && metric.type !== 'reps' && (
                    <input
                      type="text"
                      value={metric.unit ?? ''}
                      onChange={(e) => updateMetric(index, 'unit', e.target.value)}
                      placeholder="Unit (e.g., km, lbs)"
                      className="rounded border border-gray-300 px-2 py-1 text-sm"
                      data-testid={`metric-unit-${index}`}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeMetric(index)}
                    className="text-red-400 hover:text-red-600"
                    aria-label="Remove metric"
                    data-testid={`remove-metric-${index}`}
                  >
                    &#10005;
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form-level error */}
        {errors.form && (
          <p className="text-sm text-red-600" data-testid="error-form">
            {errors.form}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            data-testid="submit-routine-button"
          >
            {submitting
              ? 'Saving...'
              : isEditing
                ? 'Save Changes'
                : 'Create Routine'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            data-testid="cancel-routine-button"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
```

### B8.2 Create RoutineForm test

**File:** `tests/screens/health/RoutineForm.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RoutineForm from '../../../src/screens/health/RoutineForm';

describe('RoutineForm', () => {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    onSubmit.mockResolvedValue(undefined);
  });

  it('should render the form with required fields', () => {
    render(<RoutineForm onSubmit={onSubmit} onCancel={onCancel} />);
    expect(screen.getByTestId('routine-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('frequency-input')).toBeInTheDocument();
  });

  it('should show validation errors when submitting empty form', async () => {
    render(<RoutineForm onSubmit={onSubmit} onCancel={onCancel} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId('submit-routine-button'));

    await waitFor(() => {
      expect(screen.getByTestId('error-name')).toBeInTheDocument();
      expect(screen.getByTestId('error-frequency')).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should submit a valid routine', async () => {
    render(<RoutineForm onSubmit={onSubmit} onCancel={onCancel} />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId('routine-name-input'), 'Morning Run');
    await user.type(screen.getByTestId('frequency-input'), '3');
    await user.click(screen.getByTestId('submit-routine-button'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Morning Run',
          targetFrequency: 3,
          trackedMetrics: [],
        })
      );
    });
  });

  it('should add and remove tracked metrics', async () => {
    render(<RoutineForm onSubmit={onSubmit} onCancel={onCancel} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId('add-metric-button'));
    expect(screen.getByTestId('metric-0')).toBeInTheDocument();

    await user.click(screen.getByTestId('add-metric-button'));
    expect(screen.getByTestId('metric-1')).toBeInTheDocument();

    await user.click(screen.getByTestId('remove-metric-0'));
    expect(screen.queryByTestId('metric-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('metric-0')).toBeInTheDocument();
  });

  it('should submit routine with metrics', async () => {
    render(<RoutineForm onSubmit={onSubmit} onCancel={onCancel} />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId('routine-name-input'), 'Run');
    await user.type(screen.getByTestId('frequency-input'), '3');
    await user.click(screen.getByTestId('add-metric-button'));
    await user.selectOptions(screen.getByTestId('metric-type-0'), 'distance');
    await user.type(screen.getByTestId('metric-unit-0'), 'km');
    await user.click(screen.getByTestId('submit-routine-button'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          trackedMetrics: [{ type: 'distance', unit: 'km' }],
        })
      );
    });
  });

  it('should call onCancel when cancel is clicked', async () => {
    render(<RoutineForm onSubmit={onSubmit} onCancel={onCancel} />);
    const user = userEvent.setup();

    await user.click(screen.getByTestId('cancel-routine-button'));
    expect(onCancel).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should pre-fill form when editing', () => {
    render(
      <RoutineForm
        routine={{
          id: 1,
          name: 'Yoga',
          targetFrequency: 5,
          trackedMetrics: [{ type: 'duration', unit: 'minutes' }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );

    expect(screen.getByTestId('routine-name-input')).toHaveValue('Yoga');
    expect(screen.getByTestId('frequency-input')).toHaveValue(5);
    expect(screen.getByTestId('metric-0')).toBeInTheDocument();
  });
});
```

**Test command:**
```bash
npx vitest run tests/screens/health/RoutineForm.test.tsx
```

**Commit:** `feat: add RoutineForm for creating and editing health routines`

---

## Task B9: Health routine logging interface

**File:** `src/screens/health/LogEntryForm.tsx`
**Test file:** `tests/screens/health/LogEntryForm.test.tsx`
**Time:** 5 min

### B9.1 Create the LogEntryForm component

**File:** `src/screens/health/LogEntryForm.tsx`

```typescript
import React, { useState } from 'react';
import type { HealthRoutine } from '../../data/db';
import type { CreateLogEntryInput } from '../../data/health-service';
import { today as getToday } from '../../lib/dates';

interface LogEntryFormProps {
  routines: HealthRoutine[];
  preSelectedRoutineId?: number;
  onSubmit: (input: CreateLogEntryInput) => Promise<void>;
  onCancel: () => void;
}

export default function LogEntryForm({
  routines,
  preSelectedRoutineId,
  onSubmit,
  onCancel,
}: LogEntryFormProps) {
  const [routineId, setRoutineId] = useState<number | ''>(
    preSelectedRoutineId ?? ''
  );
  const [date, setDate] = useState(getToday());
  const [metricValues, setMetricValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const selectedRoutine = routines.find((r) => r.id === routineId);

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!routineId) errs.routineId = 'Please select a routine';
    if (!date) {
      errs.date = 'Date is required';
    } else if (date > getToday()) {
      errs.date = 'Date cannot be in the future';
    }

    // Validate metric values if provided
    if (selectedRoutine) {
      for (const metric of selectedRoutine.trackedMetrics) {
        const val = metricValues[metric.type];
        if (val && val.trim() !== '') {
          const num = parseFloat(val);
          if (isNaN(num) || num < 0) {
            errs[`metric_${metric.type}`] = `${metric.type} must be a non-negative number`;
          }
        }
      }
    }

    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      const metrics: Record<string, number> = {};
      if (selectedRoutine) {
        for (const metric of selectedRoutine.trackedMetrics) {
          const val = metricValues[metric.type];
          if (val && val.trim() !== '') {
            metrics[metric.type] = parseFloat(val);
          }
        }
      }

      await onSubmit({
        routineId: routineId as number,
        date,
        metrics: Object.keys(metrics).length > 0 ? metrics : undefined,
      });

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onCancel(); // Return to routines screen
      }, 1500);
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : 'Failed to save log entry',
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleRoutineChange(newId: number | '') {
    setRoutineId(newId);
    setMetricValues({});
  }

  return (
    <div className="mx-auto max-w-lg p-4">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Log Routine</h1>

      {showSuccess && (
        <div
          className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700"
          data-testid="success-message"
        >
          Entry logged successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" data-testid="log-entry-form">
        {/* Routine select */}
        <div>
          <label htmlFor="routineSelect" className="block text-sm font-medium text-gray-700">
            Routine *
          </label>
          <select
            id="routineSelect"
            value={routineId}
            onChange={(e) =>
              handleRoutineChange(e.target.value ? parseInt(e.target.value, 10) : '')
            }
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
            data-testid="routine-select"
          >
            <option value="">Select routine...</option>
            {routines.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          {errors.routineId && (
            <p className="mt-1 text-sm text-red-600" data-testid="error-routineId">
              {errors.routineId}
            </p>
          )}
        </div>

        {/* Date */}
        <div>
          <label htmlFor="logDate" className="block text-sm font-medium text-gray-700">
            Date *
          </label>
          <input
            id="logDate"
            type="date"
            value={date}
            max={getToday()}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
            data-testid="log-date-input"
          />
          {errors.date && (
            <p className="mt-1 text-sm text-red-600" data-testid="error-date">
              {errors.date}
            </p>
          )}
        </div>

        {/* Metric fields (dynamic based on selected routine) */}
        {selectedRoutine && selectedRoutine.trackedMetrics.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Metrics (optional)</p>
            {selectedRoutine.trackedMetrics.map((metric) => (
              <div key={metric.type}>
                <label
                  htmlFor={`metric-${metric.type}`}
                  className="block text-sm text-gray-600"
                >
                  {metric.type.charAt(0).toUpperCase() + metric.type.slice(1)}
                  {metric.unit ? ` (${metric.unit})` : ''}
                </label>
                <input
                  id={`metric-${metric.type}`}
                  type="number"
                  min="0"
                  step="any"
                  value={metricValues[metric.type] ?? ''}
                  onChange={(e) =>
                    setMetricValues({ ...metricValues, [metric.type]: e.target.value })
                  }
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                  data-testid={`metric-input-${metric.type}`}
                />
                {errors[`metric_${metric.type}`] && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors[`metric_${metric.type}`]}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Form-level error */}
        {errors.form && (
          <p className="text-sm text-red-600" data-testid="error-form">
            {errors.form}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            data-testid="submit-log-button"
          >
            {submitting ? 'Logging...' : 'Log Entry'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            data-testid="cancel-log-button"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
```

### B9.2 Create LogEntryForm test

**File:** `tests/screens/health/LogEntryForm.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LogEntryForm from '../../../src/screens/health/LogEntryForm';
import type { HealthRoutine } from '../../../src/data/db';
import * as dates from '../../../src/lib/dates';

const mockRoutines: HealthRoutine[] = [
  {
    id: 1,
    name: 'Morning Run',
    targetFrequency: 3,
    trackedMetrics: [
      { type: 'duration', unit: 'minutes' },
      { type: 'distance', unit: 'km' },
    ],
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Meditation',
    targetFrequency: 7,
    trackedMetrics: [],
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
  },
];

describe('LogEntryForm', () => {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    onSubmit.mockResolvedValue(undefined);
    vi.spyOn(dates, 'today').mockReturnValue('2026-03-18');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render with routine selector and date', () => {
    render(
      <LogEntryForm
        routines={mockRoutines}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );
    expect(screen.getByTestId('routine-select')).toBeInTheDocument();
    expect(screen.getByTestId('log-date-input')).toBeInTheDocument();
  });

  it('should pre-select routine when preSelectedRoutineId is provided', () => {
    render(
      <LogEntryForm
        routines={mockRoutines}
        preSelectedRoutineId={1}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );
    expect(screen.getByTestId('routine-select')).toHaveValue('1');
  });

  it('should show metric fields when routine with metrics is selected', async () => {
    render(
      <LogEntryForm
        routines={mockRoutines}
        preSelectedRoutineId={1}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );
    expect(screen.getByTestId('metric-input-duration')).toBeInTheDocument();
    expect(screen.getByTestId('metric-input-distance')).toBeInTheDocument();
  });

  it('should not show metric fields for routine without metrics', async () => {
    render(
      <LogEntryForm
        routines={mockRoutines}
        preSelectedRoutineId={2}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );
    expect(screen.queryByTestId('metric-input-duration')).not.toBeInTheDocument();
  });

  it('should submit log entry with metrics', async () => {
    render(
      <LogEntryForm
        routines={mockRoutines}
        preSelectedRoutineId={1}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );
    const user = userEvent.setup();

    await user.type(screen.getByTestId('metric-input-duration'), '30');
    await user.type(screen.getByTestId('metric-input-distance'), '5');
    await user.click(screen.getByTestId('submit-log-button'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        routineId: 1,
        date: '2026-03-18',
        metrics: { duration: 30, distance: 5 },
      });
    });
  });

  it('should submit log entry without metrics', async () => {
    render(
      <LogEntryForm
        routines={mockRoutines}
        preSelectedRoutineId={2}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );
    const user = userEvent.setup();

    await user.click(screen.getByTestId('submit-log-button'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        routineId: 2,
        date: '2026-03-18',
        metrics: undefined,
      });
    });
  });

  it('should default date to today', () => {
    render(
      <LogEntryForm
        routines={mockRoutines}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );
    expect(screen.getByTestId('log-date-input')).toHaveValue('2026-03-18');
  });

  it('should validate routine selection', async () => {
    render(
      <LogEntryForm
        routines={mockRoutines}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );
    const user = userEvent.setup();

    await user.click(screen.getByTestId('submit-log-button'));

    await waitFor(() => {
      expect(screen.getByTestId('error-routineId')).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should call onCancel when cancel is clicked', async () => {
    render(
      <LogEntryForm
        routines={mockRoutines}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );
    const user = userEvent.setup();

    await user.click(screen.getByTestId('cancel-log-button'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('should show success message after submission', async () => {
    render(
      <LogEntryForm
        routines={mockRoutines}
        preSelectedRoutineId={2}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );
    const user = userEvent.setup();

    await user.click(screen.getByTestId('submit-log-button'));

    await waitFor(() => {
      expect(screen.getByTestId('success-message')).toBeInTheDocument();
    });
  });
});
```

**Test command:**
```bash
npx vitest run tests/screens/health/LogEntryForm.test.tsx
```

**Commit:** `feat: add LogEntryForm for health routine logging with metrics`

---

## Task B10: Health screen orchestrator

**File:** `src/screens/health/HealthScreenContainer.tsx`
**Time:** 3 min

### B10.1 Create the orchestrator component

**File:** `src/screens/health/HealthScreenContainer.tsx`

```typescript
import React, { useState } from 'react';
import { useHealth } from '../../hooks/useHealth';
import type { RoutineWithAdherence } from '../../hooks/useHealth';
import type { CreateRoutineInput, UpdateRoutineInput, CreateLogEntryInput } from '../../data/health-service';
import HealthScreen from './HealthScreen';
import RoutineForm from './RoutineForm';
import LogEntryForm from './LogEntryForm';

type HealthView = 'list' | 'createRoutine' | 'editRoutine' | 'log';

export default function HealthScreenContainer() {
  const [view, setView] = useState<HealthView>('list');
  const [editingRoutine, setEditingRoutine] = useState<RoutineWithAdherence | null>(null);
  const [preSelectedRoutineId, setPreSelectedRoutineId] = useState<number | undefined>();

  const { routines, addRoutine, editRoutine, logEntry } = useHealth();

  function handleBackToList() {
    setView('list');
    setEditingRoutine(null);
    setPreSelectedRoutineId(undefined);
  }

  async function handleCreateRoutine(input: CreateRoutineInput | UpdateRoutineInput) {
    await addRoutine(input as CreateRoutineInput);
    handleBackToList();
  }

  async function handleEditRoutine(input: CreateRoutineInput | UpdateRoutineInput) {
    if (editingRoutine) {
      await editRoutine(editingRoutine.id!, input as UpdateRoutineInput);
    }
    handleBackToList();
  }

  async function handleLogEntry(input: CreateLogEntryInput) {
    await logEntry(input);
    // LogEntryForm handles its own success -> redirect via onCancel
  }

  function handleQuickLog(routineId: number) {
    setPreSelectedRoutineId(routineId);
    setView('log');
  }

  function handleEditRoutineNav(routine: RoutineWithAdherence) {
    setEditingRoutine(routine);
    setView('editRoutine');
  }

  switch (view) {
    case 'createRoutine':
      return (
        <RoutineForm
          onSubmit={handleCreateRoutine}
          onCancel={handleBackToList}
        />
      );

    case 'editRoutine':
      if (!editingRoutine) {
        setView('list');
        return null;
      }
      return (
        <RoutineForm
          routine={editingRoutine}
          onSubmit={handleEditRoutine}
          onCancel={handleBackToList}
        />
      );

    case 'log':
      return (
        <LogEntryForm
          routines={routines}
          preSelectedRoutineId={preSelectedRoutineId}
          onSubmit={handleLogEntry}
          onCancel={handleBackToList}
        />
      );

    case 'list':
    default:
      return (
        <HealthScreen
          onCreateRoutine={() => setView('createRoutine')}
          onEditRoutine={handleEditRoutineNav}
          onQuickLog={handleQuickLog}
        />
      );
  }
}
```

Update `src/App.tsx` to use it:

```typescript
// Replace:
//   <Route path="/health" element={<HealthPlaceholder />} />
// With:
import HealthScreenContainer from './screens/health/HealthScreenContainer';
//   <Route path="/health" element={<HealthScreenContainer />} />
```

**Commit:** `feat: add HealthScreenContainer orchestrator and wire route`

---

## Task B11: Dashboard health routines aggregation widget

**File:** `src/screens/dashboard/HealthWidget.tsx`
**File:** `src/screens/dashboard/HealthWidgetContainer.tsx`
**Test file:** `tests/screens/dashboard/HealthWidget.test.tsx`
**Time:** 5 min

### B11.1 Create the HealthWidget component

**File:** `src/screens/dashboard/HealthWidget.tsx`

```typescript
import React from 'react';

export interface HealthWidgetProps {
  routinesCompletedToday: number;
  totalRoutines: number;
  onTrackCount: number;
  behindCount: number;
  bestStreak: { weeks: number; routineName: string } | null;
  onNavigate: () => void;
}

export default function HealthWidget({
  routinesCompletedToday,
  totalRoutines,
  onTrackCount,
  behindCount,
  bestStreak,
  onNavigate,
}: HealthWidgetProps) {
  const hasRoutines = totalRoutines > 0;

  return (
    <button
      type="button"
      onClick={onNavigate}
      className="w-full rounded-lg border border-gray-200 bg-white p-4 text-left transition-colors hover:bg-gray-50"
      data-testid="health-widget"
    >
      <h2 className="mb-2 text-lg font-semibold text-gray-900">Health Routines</h2>

      {!hasRoutines ? (
        <div data-testid="health-zero-state">
          <p className="text-sm text-gray-500">
            No routines defined yet. Tap here to create your first health routine and start tracking.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Today's completions */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Today</span>
            <span className="font-medium text-gray-900" data-testid="today-count">
              {routinesCompletedToday} of {totalRoutines} routines
            </span>
          </div>

          {/* Weekly adherence */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">This Week</span>
            <span className="font-medium" data-testid="weekly-summary">
              <span className="text-green-600">{onTrackCount} on track</span>
              {behindCount > 0 && (
                <>
                  {' / '}
                  <span className="text-red-600">{behindCount} behind</span>
                </>
              )}
            </span>
          </div>

          {/* Best streak */}
          {bestStreak && (
            <div className="mt-1 flex justify-between text-sm" data-testid="best-streak">
              <span className="text-gray-600">Best Streak</span>
              <span className="font-medium text-orange-600">
                {bestStreak.weeks} week{bestStreak.weeks !== 1 ? 's' : ''} ({bestStreak.routineName})
              </span>
            </div>
          )}
        </div>
      )}
    </button>
  );
}
```

### B11.2 Create the HealthWidget live-data wrapper

**File:** `src/screens/dashboard/HealthWidgetContainer.tsx`

```typescript
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useHealthAggregation } from '../../hooks/useHealth';
import HealthWidget from './HealthWidget';

export default function HealthWidgetContainer() {
  const navigate = useNavigate();
  const { aggregation } = useHealthAggregation();

  return (
    <HealthWidget
      routinesCompletedToday={aggregation.routinesCompletedToday}
      totalRoutines={aggregation.totalRoutines}
      onTrackCount={aggregation.onTrackCount}
      behindCount={aggregation.behindCount}
      bestStreak={aggregation.bestStreak}
      onNavigate={() => navigate('/health')}
    />
  );
}
```

### B11.3 Create HealthWidget test

**File:** `tests/screens/dashboard/HealthWidget.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HealthWidget from '../../../src/screens/dashboard/HealthWidget';

describe('HealthWidget', () => {
  const onNavigate = vi.fn();

  it('should show zero state when no routines defined', () => {
    render(
      <HealthWidget
        routinesCompletedToday={0}
        totalRoutines={0}
        onTrackCount={0}
        behindCount={0}
        bestStreak={null}
        onNavigate={onNavigate}
      />
    );
    expect(screen.getByTestId('health-zero-state')).toBeInTheDocument();
    expect(screen.getByText(/no routines defined yet/i)).toBeInTheDocument();
  });

  it('should show today routines completed', () => {
    render(
      <HealthWidget
        routinesCompletedToday={2}
        totalRoutines={3}
        onTrackCount={2}
        behindCount={1}
        bestStreak={null}
        onNavigate={onNavigate}
      />
    );
    expect(screen.getByTestId('today-count')).toHaveTextContent('2 of 3 routines');
  });

  it('should show weekly adherence summary', () => {
    render(
      <HealthWidget
        routinesCompletedToday={1}
        totalRoutines={4}
        onTrackCount={3}
        behindCount={1}
        bestStreak={null}
        onNavigate={onNavigate}
      />
    );
    expect(screen.getByTestId('weekly-summary')).toHaveTextContent('3 on track');
    expect(screen.getByTestId('weekly-summary')).toHaveTextContent('1 behind');
  });

  it('should not show behind count when all on track', () => {
    render(
      <HealthWidget
        routinesCompletedToday={2}
        totalRoutines={2}
        onTrackCount={2}
        behindCount={0}
        bestStreak={null}
        onNavigate={onNavigate}
      />
    );
    expect(screen.getByTestId('weekly-summary')).toHaveTextContent('2 on track');
    expect(screen.getByTestId('weekly-summary')).not.toHaveTextContent('behind');
  });

  it('should show best streak when available', () => {
    render(
      <HealthWidget
        routinesCompletedToday={1}
        totalRoutines={2}
        onTrackCount={1}
        behindCount={1}
        bestStreak={{ weeks: 12, routineName: 'Morning Run' }}
        onNavigate={onNavigate}
      />
    );
    expect(screen.getByTestId('best-streak')).toHaveTextContent('12 weeks');
    expect(screen.getByTestId('best-streak')).toHaveTextContent('Morning Run');
  });

  it('should not show best streak when null', () => {
    render(
      <HealthWidget
        routinesCompletedToday={0}
        totalRoutines={1}
        onTrackCount={1}
        behindCount={0}
        bestStreak={null}
        onNavigate={onNavigate}
      />
    );
    expect(screen.queryByTestId('best-streak')).not.toBeInTheDocument();
  });

  it('should call onNavigate when clicked', async () => {
    render(
      <HealthWidget
        routinesCompletedToday={0}
        totalRoutines={1}
        onTrackCount={0}
        behindCount={1}
        bestStreak={null}
        onNavigate={onNavigate}
      />
    );
    const user = userEvent.setup();
    await user.click(screen.getByTestId('health-widget'));
    expect(onNavigate).toHaveBeenCalled();
  });

  it('should count same routine logged twice today as 1', () => {
    // This is tested at the service level; widget just displays the count.
    // The contract is that routinesCompletedToday already counts distinct routines.
    render(
      <HealthWidget
        routinesCompletedToday={1}
        totalRoutines={1}
        onTrackCount={1}
        behindCount={0}
        bestStreak={null}
        onNavigate={onNavigate}
      />
    );
    expect(screen.getByTestId('today-count')).toHaveTextContent('1 of 1 routines');
  });
});
```

**Test command:**
```bash
npx vitest run tests/screens/dashboard/HealthWidget.test.tsx
```

**Commit:** `feat: add dashboard health routines aggregation widget with live data`

---

## Task B12: Wire dashboard widgets into DashboardScreen

**Time:** 3 min

### B12.1 Update the dashboard screen

In `src/screens/dashboard/DashboardScreen.tsx`, replace the placeholder goals and health sections with the new container widgets.

Add these imports:

```typescript
import GoalsWidgetContainer from './GoalsWidgetContainer';
import HealthWidgetContainer from './HealthWidgetContainer';
```

Replace the placeholder Goals section with:

```tsx
<GoalsWidgetContainer />
```

Replace the placeholder Health section with:

```tsx
<HealthWidgetContainer />
```

The scroll order should be: countdown, daily budget card, monthly performance card, goals widget, health widget.

**Commit:** `feat: wire GoalsWidget and HealthWidget into DashboardScreen`

---

# Final Integration

---

## Task F1: Run all tests

**Time:** 2 min

```bash
npx vitest run
```

Verify all tests pass. Fix any failures.

**Commit:** `test: verify all Stage 5 tests pass`

---

## Task F2: Smoke test in browser

**Time:** 3 min

```bash
npm run dev
```

Manual checklist:

1. Navigate to Goals screen from bottom nav
2. Create a numeric goal (Save $5,000, financial, target 5000)
3. Create a freeform goal (Learn Spanish, personal, status "Planning")
4. Verify both appear in list with correct progress indicators
5. Click a goal, update progress, verify it reflects
6. Complete a goal, verify it moves out of default view
7. Navigate to Health screen from bottom nav
8. Create a routine (Morning Run, 3x/week, duration + distance metrics)
9. Create a routine (Meditation, 7x/week, no metrics)
10. Log Morning Run via quick log button, enter duration and distance
11. Verify adherence updates to "1 of 3 this week"
12. Navigate to Dashboard
13. Verify Goals widget shows active/completed counts
14. Verify Health widget shows today's completions and weekly adherence
15. Verify both widgets navigate to their respective screens

---

## Summary

### Files Created (Track A -- Goals)

| File | Purpose |
|------|---------|
| `src/data/goal-service.ts` | Goal CRUD, validation, status transitions, aggregation |
| `src/hooks/useGoals.ts` | `useGoals` + `useGoalAggregation` hooks |
| `src/screens/goals/GoalCard.tsx` | Goal list card with progress indicator |
| `src/screens/goals/GoalsScreen.tsx` | Goals list with type/status filters |
| `src/screens/goals/GoalForm.tsx` | Goal creation form with dynamic fields |
| `src/screens/goals/GoalDetail.tsx` | Goal detail with progress update + status transitions |
| `src/screens/goals/GoalsScreenContainer.tsx` | View orchestrator (list/create/detail) |
| `src/screens/dashboard/GoalsWidget.tsx` | Dashboard goals widget (presentational) |
| `src/screens/dashboard/GoalsWidgetContainer.tsx` | Dashboard goals widget (live data) |
| `tests/data/goal-service.test.ts` | Goal service unit tests |
| `tests/hooks/useGoals.test.ts` | Hook tests |
| `tests/screens/goals/GoalsScreen.test.tsx` | Screen tests |
| `tests/screens/goals/GoalForm.test.tsx` | Form tests |
| `tests/screens/goals/GoalDetail.test.tsx` | Detail view tests |
| `tests/screens/dashboard/GoalsWidget.test.tsx` | Widget tests |

### Files Created (Track B -- Health)

| File | Purpose |
|------|---------|
| `src/data/health-service.ts` | Routine + log entry CRUD, streaks, adherence, aggregation |
| `src/hooks/useHealth.ts` | `useHealth` + `useHealthAggregation` hooks |
| `src/screens/health/RoutineCard.tsx` | Routine card with adherence + streak |
| `src/screens/health/HealthScreen.tsx` | Routines list with adherence indicators |
| `src/screens/health/RoutineForm.tsx` | Routine create/edit form with metrics |
| `src/screens/health/LogEntryForm.tsx` | Log entry form with optional metrics |
| `src/screens/health/HealthScreenContainer.tsx` | View orchestrator (list/create/edit/log) |
| `src/screens/dashboard/HealthWidget.tsx` | Dashboard health widget (presentational) |
| `src/screens/dashboard/HealthWidgetContainer.tsx` | Dashboard health widget (live data) |
| `tests/data/health-service.test.ts` | Health service unit tests (incl. streaks) |
| `tests/hooks/useHealth.test.ts` | Hook tests |
| `tests/screens/health/HealthScreen.test.tsx` | Screen tests |
| `tests/screens/health/RoutineForm.test.tsx` | Form tests |
| `tests/screens/health/LogEntryForm.test.tsx` | Log entry form tests |
| `tests/screens/dashboard/HealthWidget.test.tsx` | Widget tests |

### Files Modified

| File | Change |
|------|--------|
| `src/App.tsx` | Wire `/goals` and `/health` routes to containers |
| `src/screens/dashboard/DashboardScreen.tsx` | Replace placeholders with live widgets |

### Commit Log (expected)

```
feat: add goal service input types and validation helpers
feat: add goal service CRUD operations
feat: add goal status transition functions
feat: add goal aggregation helpers for dashboard widget
test: add comprehensive goal service tests
feat: add useGoals and useGoalAggregation hooks
feat: add GoalsScreen layout with filtering and GoalCard component
feat: add goal creation form with dynamic fields per progress model
feat: add GoalDetail with progress updates and status transitions
feat: add GoalsScreenContainer orchestrator and wire route
feat: add dashboard goals aggregation widget with live data
feat: add health service input types and validation helpers
feat: add health service routine and log entry CRUD operations
feat: add streak calculation and weekly adherence logic
feat: add health dashboard aggregation function
test: add comprehensive health service tests including streaks
feat: add useHealth and useHealthAggregation hooks
feat: add HealthScreen layout with RoutineCard and adherence indicators
feat: add RoutineForm for creating and editing health routines
feat: add LogEntryForm for health routine logging with metrics
feat: add HealthScreenContainer orchestrator and wire route
feat: add dashboard health routines aggregation widget with live data
feat: wire GoalsWidget and HealthWidget into DashboardScreen
test: verify all Stage 5 tests pass
```
