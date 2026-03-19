export type MessageRole = 'user' | 'assistant' | 'system';

export type MessageContentType =
  | 'text'
  | 'image'
  | 'expense-confirmation'
  | 'expense-delete-confirmation'
  | 'health-log-confirmation'
  | 'health-delete-confirmation'
  | 'health-routine-create-confirmation'
  | 'health-routine-delete-confirmation'
  | 'goal-create-confirmation'
  | 'goal-update-confirmation'
  | 'goal-edit-confirmation'
  | 'goal-delete-confirmation'
  | 'data-answer'
  | 'error'
  | 'disclosure';

export interface ParsedExpense {
  amount: number;
  vendor: string;
  category?: string;
  date: string;        // "YYYY-MM-DD"
  description?: string;
  lineItems?: LineItem[];
}

export interface LineItem {
  description: string;
  amount: number;
}

export interface ParsedHealthLog {
  routineId: number;
  routineName: string;
  date: string;
  metrics?: Record<string, number>;
}

export interface ParsedHealthRoutineAction {
  action: 'create' | 'delete';
  routineId?: number;
  name: string;
  frequencyType?: 'daily' | 'weekly';
  dailyTarget?: number;
  targetFrequency?: number;
  trackedMetrics?: { type: string; unit: string }[];
  message?: string;
}

export interface ParsedGoalAction {
  action: 'create' | 'update' | 'edit' | 'delete';
  goalId?: number;
  goalTitle: string;
  goalType?: string;
  progressModel?: string;
  targetValue?: number;
  currentValue?: number;
  targetDate?: string;
  description?: string;
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
  updates?: Record<string, unknown>;
  message?: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  contentType: MessageContentType;
  text?: string;
  imageUrl?: string;       // Object URL for thumbnail (session-only)
  parsedExpense?: ParsedExpense;
  parsedHealthLog?: ParsedHealthLog;
  parsedHealthRoutineAction?: ParsedHealthRoutineAction;
  parsedGoalAction?: ParsedGoalAction;
  confirmationStatus?: 'pending' | 'confirmed' | 'cancelled' | 'saving' | 'saved' | 'error';
  pipelineId?: string;
  timestamp: number;
}

export type AgentStatus =
  | 'initializing'      // checking API key on load
  | 'ready'             // chat active
  | 'loading'           // waiting for API response
  | 'offline'           // no network connection
  | 'no-api-key'        // API key not configured
  | 'invalid-api-key'   // API key invalid (401)
  | 'error';            // generic error

