# Plan: Card-Based Workflow Pipelines for AI Agent Tab

## Overview

Replace the current single-purpose expense-only AgentScreen with a **workflow selector home screen** (2x2 card grid) that launches **scoped chat sessions** per pipeline. Mirrors the Lightspeed AI Assistant UX pattern — each card opens a focused, short-lived conversation with its own system prompt, response types, and confirmation UI.

## Design Reference

- **Home screen**: 2x2 grid of workflow cards, each with icon + title + description
- **Chat session**: Header with back arrow + pipeline name, category pill at top, opening assistant message, standard chat bubbles with pipeline-specific action cards, shared input bar
- **Scoping**: Each pipeline refuses/redirects off-topic requests back to its purpose

---

## Model Strategy

| Pipeline | Model | Rationale |
|----------|-------|-----------|
| Log Expense | `claude-haiku-4-5-20251001` | Structured extraction, fast |
| Budget Insights | `claude-sonnet-4-6` | Needs reasoning over spending patterns |
| Log Health | `claude-haiku-4-5-20251001` | Structured extraction, fast |
| Goals | `claude-haiku-4-5-20251001` | Structured extraction + simple Q&A |

The `claude-client.ts` DEFAULT_MODEL will be updated from `claude-sonnet-4-20250514` to `claude-haiku-4-5-20251001`. The budget pipeline will override to `claude-sonnet-4-6` via the existing `options.model` parameter.

---

## Pipelines

| Card | Title | Description | Capabilities | Model |
|------|-------|-------------|-------------|-------|
| 1 | **Log Expense** | Add, edit, or delete expenses via text or receipt photos | **Full CRUD**: Create expenses (text/receipt), edit existing expenses, delete expenses, query recent entries for context | Haiku 4.5 |
| 2 | **Budget Insights** | Ask questions about your spending and budget | **Read only**: Query spending patterns, balances, category breakdowns, trends, monthly comparisons. No writes — redirects to Log Expense for that | Sonnet 4.6 |
| 3 | **Log Health** | Log routines, manage entries, check streaks | **Full CRUD**: Log routine entries ("ran 3 miles"), edit log entries, delete log entries, create/delete routines, query streaks/progress | Haiku 4.5 |
| 4 | **Goals** | Create goals, log progress, check status | **Full CRUD**: Create goals, update progress ("add $200 to savings"), edit goals, delete goals, query progress/milestones | Haiku 4.5 |

### Pipeline CRUD Detail

#### Log Expense (existing + extended)
| Action | Example | Response Type |
|--------|---------|---------------|
| Create | "Spent $12 at Starbucks" / receipt photo | `expense-create` → confirmation card |
| Read | "What was my last expense?" | `expense-answer` → text response |
| Update | "Change that Starbucks to $15" | `expense-update` → confirmation card showing old → new |
| Delete | "Remove the last expense" | `expense-delete` → confirmation card |

#### Budget Insights (read-only)
| Action | Example | Response Type |
|--------|---------|---------------|
| Query | "How much did I spend on dining?" | `answer` → text response |
| Query | "Am I on track this month?" | `answer` → text response |
| Redirect | "Add a $50 expense" | `redirect` → "Use Log Expense for that" |

#### Log Health (full CRUD)
| Action | Example | Response Type |
|--------|---------|---------------|
| Log entry | "Did yoga today" / "Ran 3 miles" | `health-log` → confirmation card |
| Read | "How's my running streak?" | `health-answer` → text response |
| Edit entry | "Change today's run to 4 miles" | `health-update` → confirmation card |
| Delete entry | "Remove today's yoga log" | `health-delete` → confirmation card |
| Create routine | "Add a new routine: meditation, daily" | `health-routine-create` → confirmation card |
| Delete routine | "Remove the meditation routine" | `health-routine-delete` → confirmation card |

#### Goals (full CRUD)
| Action | Example | Response Type |
|--------|---------|---------------|
| Create | "Start a savings goal for $5000" | `goal-create` → confirmation card |
| Read | "How close am I to my savings goal?" | `goal-answer` → text response |
| Update progress | "Add $200 to savings goal" | `goal-update` → confirmation card |
| Edit | "Change target to $6000" | `goal-edit` → confirmation card |
| Delete | "Delete my reading goal" | `goal-delete` → confirmation card |

---

## Implementation Steps

### Step 1: Update Claude Client + Define Pipeline Registry

**`src/services/claude-client.ts`** — MODIFY:
- Change `DEFAULT_MODEL` from `claude-sonnet-4-20250514` to `claude-haiku-4-5-20251001`
- No other changes needed (already supports `options.model` override)

**`src/screens/agent/pipelines.ts`** — NEW FILE:

Create a pipeline configuration type and registry:

```ts
interface PipelineConfig {
  id: string;                    // 'expense' | 'budget-insights' | 'health' | 'goals'
  title: string;                 // Card title and chat header
  description: string;           // Card description text
  icon: string;                  // Icon identifier
  welcomeMessage: string;        // Opening assistant message in chat
  categoryLabel: string;         // Pill label shown at top of chat
  categoryDescription: string;   // Description below the pill
  supportsImageUpload: boolean;  // Show camera button?
  inputPlaceholder: string;      // Chat input placeholder text
  model?: string;                // Model override (budget-insights uses sonnet-4-6)
}
```

Define 4 pipeline configs. This is pure data — no logic, easy to extend later.

### Step 2: Create System Prompts (`src/services/agent-prompts.ts`) — NEW FILE

Add 3 new system prompts alongside the existing expense ones (which stay in `expense-parser-prompts.ts` untouched):

- **`BUDGET_INSIGHTS_SYSTEM_PROMPT`**: Instructs Claude to answer budget/spending questions. Receives `{{BUDGET_CONTEXT}}` with current month's budget data (balance, total spent, category breakdown, recent expenses). Read-only — redirects write requests to Log Expense pipeline. Response types: `{ type: "answer", text }` or `{ type: "redirect", message }`.

- **`HEALTH_SYSTEM_PROMPT`**: Full CRUD for health routines and log entries. Receives `{{HEALTH_CONTEXT}}` with routine names, IDs, daily/weekly counts, streaks, recent logs. Response types: `health-log`, `health-update`, `health-delete`, `health-routine-create`, `health-routine-delete`, `health-answer`, `clarification`, `redirect`.

- **`GOALS_SYSTEM_PROMPT`**: Full CRUD for goals. Receives `{{GOALS_CONTEXT}}` with active goals, progress, milestones, types. Response types: `goal-create`, `goal-update`, `goal-edit`, `goal-delete`, `goal-answer`, `clarification`, `redirect`.

### Step 3: Create Pipeline Parsers — 3 NEW FILES

Each parser follows the same pattern as `expense-parser.ts`:

**`src/services/budget-insights-parser.ts`**:
- Fetches current month budget data from IndexedDB
- Injects into `BUDGET_INSIGHTS_SYSTEM_PROMPT`
- Calls Claude with `model: 'claude-sonnet-4-6'`
- Returns `{ type: 'answer', text } | { type: 'redirect', message }`

**`src/services/health-parser.ts`**:
- Fetches routines, adherence data, recent logs from IndexedDB
- Injects into `HEALTH_SYSTEM_PROMPT`
- Returns parsed action (log, update, delete, create routine, answer, etc.)
- Includes routineId resolution (matches "yoga" → routine ID from context)

**`src/services/goals-parser.ts`**:
- Fetches goals, progress, milestones from IndexedDB
- Injects into `GOALS_SYSTEM_PROMPT`
- Returns parsed action (create, update, edit, delete, answer, etc.)

Data fetching uses existing service functions — no new DB queries needed.

### Step 4: Extend Types (`src/screens/agent/agent-types.ts`) — MODIFY

Add new content types and data structures:

```ts
type MessageContentType =
  | 'text' | 'image' | 'expense-confirmation' | 'error' | 'disclosure'
  // NEW:
  | 'expense-update-confirmation'    // edit expense card (old → new)
  | 'expense-delete-confirmation'    // delete expense card
  | 'health-log-confirmation'        // log routine entry card
  | 'health-update-confirmation'     // edit log entry card
  | 'health-delete-confirmation'     // delete log entry card
  | 'health-routine-confirmation'    // create/delete routine card
  | 'goal-confirmation'              // create/update/edit/delete goal card
  | 'data-answer';                   // formatted query response

interface ChatMessage {
  // ... existing fields ...
  parsedHealthLog?: ParsedHealthLog;
  parsedGoalAction?: ParsedGoalAction;
  pipelineId?: string;
}

interface ParsedHealthLog {
  routineId: number;
  routineName: string;
  date: string;
  metrics?: Record<string, number>;
}

interface ParsedGoalAction {
  action: 'create' | 'update' | 'edit' | 'delete';
  goalId?: number;
  goalTitle?: string;
  updates?: Record<string, unknown>;
}
```

### Step 5: Create Confirmation Hooks — NEW FILES

**`src/screens/agent/use-health-confirmation.ts`**:
- `handleConfirmHealthLog(messageId)` → calls `createLogEntry()`
- `handleConfirmHealthUpdate(messageId)` → calls `deleteLogEntry()` + `createLogEntry()`
- `handleConfirmHealthDelete(messageId)` → calls `deleteLogEntry()`
- `handleConfirmRoutineCreate(messageId)` → calls `createRoutine()`
- `handleConfirmRoutineDelete(messageId)` → calls `deleteRoutine()`

**`src/screens/agent/use-goal-confirmation.ts`**:
- `handleConfirmGoalCreate(messageId)` → calls goal service create
- `handleConfirmGoalUpdate(messageId)` → calls goal service update progress
- `handleConfirmGoalEdit(messageId)` → calls goal service update
- `handleConfirmGoalDelete(messageId)` → calls goal service delete

**`src/screens/agent/use-expense-update-confirmation.ts`**:
- `handleConfirmExpenseUpdate(messageId)` → calls expense service update
- `handleConfirmExpenseDelete(messageId)` → calls expense service delete

Existing `use-expense-confirmation.ts` stays untouched for expense creation.

### Step 6: Create Workflow Selector Screen (`src/screens/agent/WorkflowSelector.tsx`) — NEW FILE

The home screen that replaces the current AgentScreen as the default view:

- 2x2 grid of cards reading from the pipeline registry
- Each card: rounded container with subtle border, icon in light-blue circle, bold title, description text
- Tapping a card navigates to `/agent/:pipelineId`
- Matches the Lightspeed screenshot: clean, centered, white cards

### Step 7: Extend MessageBubble (`src/screens/agent/MessageBubble.tsx`) — MODIFY

Add rendering for new content types:

- **Confirmation cards** (health-log, health-update, health-delete, goal-*, expense-update, expense-delete): Styled like Lightspeed "Proposed Mapping Change" — structured data display with labeled fields, current → new values for updates, Approve/Reject buttons
- **`data-answer`**: Text response with subtle card wrapper for visual distinction from regular chat

### Step 8: Refactor AgentScreen (`src/screens/agent/AgentScreen.tsx`) — MODIFY

The current AgentScreen becomes a **generic chat session** parameterized by pipeline:

- Read `pipelineId` from `useParams()`
- Look up config from pipeline registry
- Route messages to the correct parser:
  - `expense` → `parseExpenseMessage()` + `processReceipt()` (existing)
  - `budget-insights` → `parseBudgetInsights()`
  - `health` → `parseHealthMessage()`
  - `goals` → `parseGoalsMessage()`
- Route confirmations to the correct hook
- Show pipeline-specific header (back arrow + title + overflow menu)
- Show category pill + description at chat top
- Show pipeline-specific welcome message
- Conditionally show/hide image upload based on `config.supportsImageUpload`
- Fresh conversation history per session (reset on navigate back)

Key refactor: extract message dispatch into a `usePipelineDispatch(pipelineId)` hook.

### Step 9: Wire Up Navigation — MODIFY EXISTING FILES

**`App.tsx`**:
```tsx
// Replace:
<Route path="/agent" element={<AgentScreen />} />
// With:
<Route path="/agent" element={<WorkflowSelector />} />
<Route path="/agent/:pipelineId" element={<AgentScreen />} />
```

**`src/lib/constants.ts`**: Update ROUTES to include `AGENT_PIPELINE: '/agent/:pipelineId'`.

### Step 10: Update Expense Pipeline for Edit/Delete

Extend the existing `EXPENSE_SYSTEM_PROMPT` in `expense-parser-prompts.ts` to support update and delete response types in addition to the existing create flow. Add `expense-update` and `expense-delete` JSON response schemas.

Update `expense-parser.ts` to handle the new response types and return them to AgentScreen.

### Step 11: Update Tests — MODIFY + NEW FILES

- Update existing `AgentScreen.test.tsx` to work with pipeline routing
- Add `WorkflowSelector.test.tsx` — renders 4 cards, clicking navigates to correct pipeline
- Add `budget-insights-parser.test.ts` — mock Claude responses, verify parsing
- Add `health-parser.test.ts` — mock responses for all CRUD operations
- Add `goals-parser.test.ts` — mock responses for all CRUD operations
- Add `use-health-confirmation.test.ts` — verify save/update/delete flows
- Add `use-goal-confirmation.test.ts` — verify CRUD flows
- Add `use-expense-update-confirmation.test.ts` — verify edit/delete flows

---

## Files Changed Summary

| File | Action | Description |
|------|--------|-------------|
| `src/services/claude-client.ts` | MODIFY | Default model → Haiku 4.5 |
| `src/screens/agent/pipelines.ts` | CREATE | Pipeline registry (4 configs with model overrides) |
| `src/services/agent-prompts.ts` | CREATE | 3 new system prompts (budget, health, goals) |
| `src/services/budget-insights-parser.ts` | CREATE | Budget query parser (Sonnet 4.6) |
| `src/services/health-parser.ts` | CREATE | Health CRUD parser |
| `src/services/goals-parser.ts` | CREATE | Goals CRUD parser |
| `src/screens/agent/WorkflowSelector.tsx` | CREATE | Card grid home screen |
| `src/screens/agent/use-health-confirmation.ts` | CREATE | Health CRUD confirmation hook |
| `src/screens/agent/use-goal-confirmation.ts` | CREATE | Goals CRUD confirmation hook |
| `src/screens/agent/use-expense-update-confirmation.ts` | CREATE | Expense edit/delete confirmation hook |
| `src/screens/agent/agent-types.ts` | MODIFY | New content types, ParsedHealthLog, ParsedGoalAction |
| `src/screens/agent/AgentScreen.tsx` | MODIFY | Pipeline-aware dispatch, header, routing |
| `src/screens/agent/MessageBubble.tsx` | MODIFY | Render new confirmation cards + data answers |
| `src/screens/agent/ChatInput.tsx` | MODIFY | Conditional image upload per pipeline config |
| `src/services/expense-parser-prompts.ts` | MODIFY | Add update/delete response schemas |
| `src/services/expense-parser.ts` | MODIFY | Handle update/delete response types |
| `src/App.tsx` | MODIFY | Add `/agent/:pipelineId` route |
| `src/lib/constants.ts` | MODIFY | Add AGENT_PIPELINE route constant |
| Tests (8+ files) | CREATE/MODIFY | Cover all new pipelines, selector, confirmation hooks |

---

## Context Injection Strategy

The pipelines that need real data inject it into their system prompt on every message:

**Budget Insights** (injected fresh per message):
```
Current month: March 2026
Budget: $3,000 | Spent: $1,847.23 | Remaining: $1,152.77
Top categories: Dining ($423), Groceries ($312), Transportation ($189)
Recent expenses (last 10): $45 Whole Foods (Mar 18), $12 Starbucks (Mar 17), ...
```

**Health** (injected fresh per message):
```
Routines:
- Morning Run (id:1) | weekly 3x | 2/3 this week | 0/1 today | 5wk streak
- Brush Teeth (id:2) | daily 2x | 10/14 this week | 1/2 today | 3wk streak
- Yoga (id:3) | weekly 5x | 3/5 this week | 1/1 today | 0wk streak
Today's logs: Run 3mi (8am), Brush Teeth (7am)
```

**Goals** (injected fresh per message):
```
Active goals:
- Save $5000 (id:1) | financial | $3,200/$5,000 (64%) | target: Jun 2026
- Read 12 Books (id:2) | personal | 7/12 (58%) | target: Dec 2026
- Run a Marathon (id:3) | health | checklist 8/15 done | target: Oct 2026
```

This keeps prompts grounded in real data without giving Claude direct DB access. Routine/goal IDs are included so Claude can reference them in CRUD responses.

---

## Execution Order

1. Step 1 (client model update + pipeline registry) — foundation
2. Step 2 (system prompts) — no UI changes yet
3. Steps 3-5 (parsers + types + confirmation hooks) — backend pipeline logic
4. Steps 6-8 (WorkflowSelector + MessageBubble + AgentScreen refactor) — UI
5. Step 9 (navigation wiring) — connect everything
6. Step 10 (expense edit/delete extension)
7. Step 11 (tests) — verify all pipelines

Estimated scope: ~18-20 new/modified files. The existing expense creation flow is fully preserved — we're extending it with edit/delete and adding 3 new pipelines alongside it.
