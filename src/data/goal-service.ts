import { db } from '@/data/db';
import type { Goal } from '@/lib/types';

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
