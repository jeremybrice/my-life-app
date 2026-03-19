# Plan: Card-Based Workflow Pipelines for AI Agent Tab

## Overview

Replace the current single-purpose expense-only AgentScreen with a **workflow selector home screen** (2x2 card grid) that launches **scoped chat sessions** per pipeline. Mirrors the Lightspeed AI Assistant UX pattern — each card opens a focused, short-lived conversation with its own system prompt, response types, and confirmation UI.

## Design Reference

- **Home screen**: 2x2 grid of workflow cards, each with icon + title + description
- **Chat session**: Header with back arrow + pipeline name, category pill at top, opening assistant message, standard chat bubbles with pipeline-specific action cards, shared input bar
- **Scoping**: Each pipeline refuses/redirects off-topic requests back to its purpose

---

## Pipelines

| Card | Title | Description | What It Does |
|------|-------|-------------|--------------|
| 1 | **Log Expense** | Log purchases via text or receipt photos | Existing expense pipeline (no changes to behavior) |
| 2 | **Ask About Budget** | Ask questions about your spending and budget | Queries budget data from IndexedDB, returns conversational answers with numbers |
| 3 | **Log Health** | Log routines or ask about your streaks | Quick-log a health routine via text, or ask about progress |
| 4 | **Ask About Goals** | Check goal progress and get insights | Query goal status, milestones, completion rates |

---

## Implementation Steps

### Step 1: Define Pipeline Registry (`src/screens/agent/pipelines.ts`) — NEW FILE

Create a pipeline configuration type and registry:

```ts
interface PipelineConfig {
  id: string;                    // 'expense' | 'budget-query' | 'health' | 'goals'
  title: string;                 // Card title and chat header
  description: string;           // Card description text
  icon: string;                  // Icon identifier
  welcomeMessage: string;        // Opening assistant message in chat
  categoryLabel: string;         // Pill label shown at top of chat
  categoryDescription: string;   // Description below the pill
  supportsImageUpload: boolean;  // Show camera button?
  inputPlaceholder: string;      // Chat input placeholder text
}
```

Define 4 pipeline configs. This is pure data — no logic, easy to extend later.

### Step 2: Create System Prompts (`src/services/agent-prompts.ts`) — NEW FILE

Add 3 new system prompts alongside the existing expense ones (which stay in `expense-parser-prompts.ts` untouched):

- **`BUDGET_QUERY_SYSTEM_PROMPT`**: Instructs Claude to answer budget/spending questions. Receives a `{{BUDGET_CONTEXT}}` template variable with current month's budget data (balance, total spent, category breakdown, recent expenses). Response format: `{ type: "answer", text: "..." }` or `{ type: "redirect", message: "..." }`.

- **`HEALTH_LOG_SYSTEM_PROMPT`**: Instructs Claude to parse health routine logging ("I ran 3 miles" or "did yoga") and answer health questions. Receives `{{HEALTH_CONTEXT}}` with routine names, daily/weekly counts, streaks. Response types: `{ type: "health-log", routineId, date, metrics }`, `{ type: "health-answer", text }`, `{ type: "clarification", message }`, `{ type: "redirect", message }`.

- **`GOALS_QUERY_SYSTEM_PROMPT`**: Instructs Claude to answer goal progress questions. Receives `{{GOALS_CONTEXT}}` with active goals, progress percentages, milestones. Response format: `{ type: "answer", text: "..." }` or `{ type: "redirect", message: "..." }`.

### Step 3: Create Pipeline Parsers (`src/services/budget-query-parser.ts`, `health-parser.ts`, `goals-query-parser.ts`) — 3 NEW FILES

Each parser follows the same pattern as `expense-parser.ts`:

- **`parseBudgetQuery(history)`**: Fetches current budget data from IndexedDB, injects into prompt template, calls Claude, returns `{ type: 'answer', text } | { type: 'redirect', message }`.

- **`parseHealthMessage(history)`**: Fetches routines/adherence from IndexedDB, injects into prompt, calls Claude. Returns `{ type: 'health-log', ... } | { type: 'health-answer', text } | { type: 'clarification', message } | { type: 'redirect', message }`.

- **`parseGoalsQuery(history)`**: Fetches goals data, injects into prompt, calls Claude. Returns `{ type: 'answer', text } | { type: 'redirect', message }`.

Data fetching uses existing service functions (`getExpensesByMonth`, `getAllRoutines`, `getWeeklyCount`, etc.) — no new DB queries needed.

### Step 4: Create Workflow Selector Screen (`src/screens/agent/WorkflowSelector.tsx`) — NEW FILE

The home screen that replaces the current AgentScreen as the default view:

- 2x2 grid of cards reading from the pipeline registry
- Each card: rounded container, icon (in light-blue circle), bold title, description text
- Tapping a card sets the active pipeline and transitions to the chat view
- Matches the Lightspeed screenshot aesthetic: clean, centered, white cards with subtle borders

### Step 5: Extend Types (`src/screens/agent/agent-types.ts`) — MODIFY

Add new content types for pipeline-specific UI cards:

```ts
// Extend MessageContentType
type MessageContentType =
  | 'text' | 'image' | 'expense-confirmation' | 'error' | 'disclosure'
  | 'health-log-confirmation'   // NEW: health routine log card
  | 'data-answer';              // NEW: formatted data response card

// Add to ChatMessage
interface ChatMessage {
  // ... existing fields ...
  parsedHealthLog?: ParsedHealthLog;  // NEW
  pipelineId?: string;                // NEW: which pipeline this message belongs to
}

interface ParsedHealthLog {
  routineId: number;
  routineName: string;
  date: string;
  metrics?: Record<string, number>;
}
```

### Step 6: Create Confirmation Hooks — NEW FILES

- **`use-health-log-confirmation.ts`**: Similar to `use-expense-confirmation.ts`. On confirm, calls `createLogEntry()` from health-service. Handles saving state, error state.

The budget and goals pipelines are read-only (query only), so they don't need confirmation hooks.

### Step 7: Extend MessageBubble (`src/screens/agent/MessageBubble.tsx`) — MODIFY

Add rendering for new content types:

- **`health-log-confirmation`**: Card showing routine name, date, metrics with Confirm/Cancel buttons (styled like the Lightspeed "Proposed Mapping Change" card)
- **`data-answer`**: Formatted text response card (could just be regular text, but with a subtle card wrapper for visual distinction)

### Step 8: Refactor AgentScreen (`src/screens/agent/AgentScreen.tsx`) — MODIFY

This is the biggest change. The current AgentScreen becomes a **generic chat session** that accepts a pipeline config:

- Accept `pipelineId` prop (or read from local state)
- Route messages to the correct parser based on pipeline:
  - `expense` → `parseExpenseMessage()` + `processReceipt()`  (existing)
  - `budget-query` → `parseBudgetQuery()`
  - `health` → `parseHealthMessage()` + handle health-log confirmations
  - `goals` → `parseGoalsQuery()`
- Show pipeline-specific header (back arrow + title)
- Show category pill + description at chat top
- Show pipeline-specific welcome message
- Conditionally show/hide image upload based on pipeline config
- Each pipeline gets its own conversation history (reset on back)

The key refactor: extract the message dispatch into a `usePipelineDispatch(pipelineId)` hook that returns a `handleSendMessage` function wired to the right parser.

### Step 9: Wire Up Navigation — MODIFY EXISTING FILES

**`App.tsx`**: Change route structure:
```tsx
<Route path="/agent" element={<AgentScreen />} />
// becomes:
<Route path="/agent" element={<WorkflowSelector />} />
<Route path="/agent/:pipelineId" element={<AgentScreen />} />
```

**`WorkflowSelector`**: Uses `navigate('/agent/expense')` etc. on card tap.

**`AgentScreen`**: Reads `pipelineId` from `useParams()`, looks up config from registry, renders accordingly. Back arrow navigates to `/agent`.

### Step 10: Update Tests — MODIFY + NEW FILES

- Update existing `AgentScreen.test.tsx` to pass pipeline props
- Add `WorkflowSelector.test.tsx` — renders 4 cards, clicking navigates
- Add `budget-query-parser.test.ts` — mock Claude responses, verify parsing
- Add `health-parser.test.ts` — mock responses, verify health-log and answer types
- Add `goals-query-parser.test.ts` — mock responses, verify answer parsing
- Add `use-health-log-confirmation.test.ts` — verify save flow

---

## Files Changed Summary

| File | Action | Description |
|------|--------|-------------|
| `src/screens/agent/pipelines.ts` | CREATE | Pipeline registry (4 configs) |
| `src/services/agent-prompts.ts` | CREATE | 3 new system prompts |
| `src/services/budget-query-parser.ts` | CREATE | Budget query parser |
| `src/services/health-parser.ts` | CREATE | Health log/query parser |
| `src/services/goals-query-parser.ts` | CREATE | Goals query parser |
| `src/screens/agent/WorkflowSelector.tsx` | CREATE | Card grid home screen |
| `src/screens/agent/use-health-log-confirmation.ts` | CREATE | Health log save hook |
| `src/screens/agent/agent-types.ts` | MODIFY | Add new content types + ParsedHealthLog |
| `src/screens/agent/AgentScreen.tsx` | MODIFY | Accept pipeline, route to parsers |
| `src/screens/agent/MessageBubble.tsx` | MODIFY | Render new card types |
| `src/screens/agent/ChatInput.tsx` | MODIFY | Conditional image upload per pipeline |
| `src/App.tsx` | MODIFY | Add `/agent/:pipelineId` route |
| `src/lib/constants.ts` | MODIFY | Update ROUTES |
| Tests (multiple) | CREATE/MODIFY | Cover new pipelines + selector |

**Existing files NOT changed**: `expense-parser.ts`, `expense-parser-prompts.ts`, `receipt-processor.ts`, `claude-client.ts`, `conversation-context.ts`, `use-expense-confirmation.ts` — the expense pipeline stays exactly as-is.

---

## Context Injection Strategy

The query pipelines (budget, health, goals) need real data from IndexedDB to answer questions. Each parser will:

1. Fetch relevant data using existing service functions (no new DB code)
2. Format it as a compact text summary
3. Inject it into the system prompt via template variable replacement
4. This happens on every message send (fresh data each time)

Example for budget:
```
Current month: March 2026
Budget: $3,000 | Spent: $1,847.23 | Remaining: $1,152.77
Top categories: Dining ($423), Groceries ($312), Transportation ($189)
Recent expenses: $45 Whole Foods (Mar 18), $12 Starbucks (Mar 17), ...
```

This keeps prompts grounded in real data without giving Claude direct DB access.

---

## Execution Order

1. Steps 1-2 (pipeline registry + prompts) — foundation, no UI changes yet
2. Steps 3 + 5-6 (parsers + types + hooks) — backend pipeline logic
3. Steps 4 + 7-8 (WorkflowSelector + MessageBubble + AgentScreen refactor) — UI
4. Step 9 (navigation wiring) — connect everything
5. Step 10 (tests) — verify

Estimated scope: ~12-15 new/modified files, moderate complexity. The expense pipeline is completely preserved — this is additive.
