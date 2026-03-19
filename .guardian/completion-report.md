# Completion Report: Stage 6 — AI Agent Integration

**Mission:** Stage 6 — AI Agent (Chat UI, Claude API Client, NL Expense Parsing, Receipt Processing, Conversation Context)
**Date:** 2026-03-18
**Design Doc:** `docs/plans/stage-6-ai-agent.md`
**Global Conventions:** `docs/plans/global-conventions.md`

---

## Summary

Stage 6 adds a conversational AI agent for expense entry via natural language text and receipt images. The agent uses the Claude API (@anthropic-ai/sdk) for natural language understanding and multimodal receipt extraction. All expense writes go through the existing `createExpense()` function from Stage 3's `expense-service.ts` -- no duplicate persistence logic. Images are transient (never persisted). Conversation state is session-scoped (resets on navigation away). The agent validates the API key on screen load and handles network connectivity with appropriate UI states.

All 568 tests pass across 51 test files. No regressions in Stage 1-5 tests.

---

## Requirements Mapping

| # | Requirement | Status | Notes |
|---|------------|--------|-------|
| 1 | Chat UI with message thread: text input + send button + image upload | Done | `AgentScreen.tsx`, `ChatInput.tsx`, `MessageBubble.tsx` -- familiar messaging layout with auto-scroll |
| 2 | Claude API client: reads API key from settings on each call, configurable model, loading indicator, timeout, distinct errors | Done | `claude-client.ts` -- `sendMessage()` reads from IndexedDB each call, AbortController timeout, 5 error types |
| 3 | Network connectivity detection scoped to agent screen | Done | `useAgentConnectivity.ts` -- offline shows unavailable message, restored shows chat, mid-conversation preserves thread |
| 4 | API key validation on screen load: missing vs invalid distinguished | Done | `AgentScreen.tsx` useEffect -- initializing/no-api-key/invalid-api-key/error states, network error defers to connectivity |
| 5 | Natural language expense parsing: system prompt for structured JSON, extracts fields, clarifying questions | Done | `expense-parser.ts` + `expense-parser-prompts.ts` -- JSON extraction, vendor truncation, relative date resolution, amount rounding |
| 6 | Expense confirmation flow: inline confirm/cancel cards, "yes" typed works, writes through createExpense() | Done | `use-expense-confirmation.ts` -- saving/saved/cancelled/error states, affirmative text detection, `createExpense()` from expense-service |
| 7 | Image upload + receipt processing: JPEG/PNG, multimodal API call, extract fields, non-receipt handled | Done | `receipt-processor.ts` -- `fileToBase64()`, multimodal content blocks, line item extraction, not-receipt detection |
| 8 | Transient image handling: no persistence, object URLs revoked, Anthropic disclosure on first upload | Done | Object URLs revoked after API response + on error + on unmount, disclosure via `disclosureShownRef`, no storage writes |
| 9 | Conversation context management: full history per API call, session-scoped, context window limit drops oldest | Done | `conversation-context.ts` -- token estimation (~4 chars/token), trimming to 100K tokens, ensures first message is user role |

---

## Success Criteria Assessment

| Criterion | Status | Evidence |
|-----------|--------|----------|
| User can type NL expense description and have agent parse + confirm + create expense via createExpense() | Done | AgentScreen.test.tsx: "should show confirmation card when expense is parsed", "should save expense when confirm button is clicked" |
| User can upload receipt image and have agent extract + confirm + create expense | Done | receipt-processor.test.ts (10 tests), AgentScreen.tsx `handleImageUpload` wires to `processReceipt()` then shows confirmation card |
| Expenses created by agent are identical in structure to manual form entries | Done | use-expense-confirmation.test.ts: `createExpense` called with `{ date, vendor, amount, category, description }` -- no `yearMonth`, same interface as manual form |
| When API unreachable, agent screen shows clear unavailable message, all other screens work | Done | AgentScreen.test.tsx: "should show offline state when browser is offline", connectivity scoped to agent only |
| Receipt images never stored locally | Done | transient-image-handling.test.ts (6 tests): no localStorage/sessionStorage/IndexedDB writes, object URL lifecycle verified |
| Agent asks for confirmation before writing any data | Done | Confirmation card shown with Confirm/Cancel buttons before any `createExpense()` call, "yes" text also triggers confirm |
| All tests pass with `npx vitest run` | Done | 568/568 tests pass across 51 files |

---

## Test Results

```
 Test Files  51 passed (51)
      Tests  568 passed (568)
   Duration  4.60s

Stage 6 specific tests:
 tests/services/claude-client.test.ts                     --  9 tests passed (new)
 tests/services/expense-parser.test.ts                    -- 16 tests passed (new)
 tests/services/expense-parser-prompts.test.ts            --  7 tests passed (new)
 tests/services/receipt-processor.test.ts                 -- 10 tests passed (new)
 tests/hooks/useAgentConnectivity.test.ts                 --  8 tests passed (new)
 tests/screens/agent/agent-types.test.ts                  --  4 tests passed (new)
 tests/screens/agent/MessageBubble.test.tsx                --  9 tests passed (new)
 tests/screens/agent/ChatInput.test.tsx                   -- 10 tests passed (new)
 tests/screens/agent/AgentScreen.test.tsx                 -- 12 tests passed (new)
 tests/screens/agent/use-expense-confirmation.test.ts     -- 13 tests passed (new)
 tests/screens/agent/conversation-context.test.ts         -- 12 tests passed (new)
 tests/screens/agent/transient-image-handling.test.ts     --  6 tests passed (new)
 tests/screens/agent/session-reset.test.tsx               --  2 tests passed (new)
```

---

## Critical Review Points (All Verified)

1. **Agent uses createExpense() from expense-service.ts -- does NOT pass yearMonth.** Verified at `use-expense-confirmation.ts:25-31`. The call is `createExpense({ date, vendor, amount, category, description })`. The `yearMonth` field is not present in the input object. `createExpense()` derives it internally via `yearMonthFromDate(date)`.

2. **API key read from settings on each call, never cached/hardcoded.** Verified at `claude-client.ts:59-60`. Each `sendMessage()` invocation calls `getSettings()` from IndexedDB. The Anthropic client is instantiated fresh per call (line 74). No caching in memory, no hardcoded keys.

3. **Images NEVER persisted.** No IndexedDB, localStorage, sessionStorage, or service worker cache writes for image data exist anywhere in the Stage 6 code. `ChatMessage.imageUrl` is an object URL (in-memory blob reference only). `CreateExpenseInput` has no image field. The DB schema has no image-related stores or columns.

4. **Object URLs revoked after API response.** Verified at `AgentScreen.tsx:244` (success path), `AgentScreen.tsx:297` (error/catch path), and `AgentScreen.tsx:80-88` (unmount cleanup revokes all remaining image URLs).

5. **Conversation session-scoped -- navigating away resets.** All state is in `useState` and `useRef`, which reset on component unmount/remount. The cleanup effect at `AgentScreen.tsx:79-91` explicitly clears `conversationHistoryRef.current = []` and revokes all image URLs. `session-reset.test.tsx` verifies this behavior.

6. **Agent never fabricates data not in user input.** System prompts in `expense-parser-prompts.ts` contain explicit rules: "Never fabricate data that was not stated or clearly inferable from the user's input" (rule 4) and "Never fabricate data not visible in the receipt" (receipt rule 5). The `normalizeExpense` function defaults to empty string/today's date rather than inventing values.

---

## Deviations from Spec

1. **Import paths use relative `../../` instead of `@/` alias.** All Stage 6 files under `src/screens/agent/` and `src/services/receipt-processor.ts` use relative import paths. The rest of the codebase (Stages 1-5) consistently uses `@/` alias paths. Both resolve correctly but this breaks the established convention. **Severity: minor.** Fix tasks #9 and #10 created.

2. **Image upload user message uses `contentType: 'text'` instead of `'image'`.** The design doc (Section 7.2, line 3730) specifies `contentType: 'image'` for the user message when an image is uploaded. Implementation uses `contentType: 'text'` with `text: 'Uploaded a receipt image'`. Functionally works since `MessageBubble` renders `imageUrl` regardless of content type. **Severity: should-fix.** Fix task #11 created.

3. **Disclosure message role is `'assistant'` instead of `'system'`.** The design doc (Section 7.2, line 3716) specifies `role: 'system'` for the Anthropic disclosure message. Implementation uses `role: 'assistant'`. Renders identically since `MessageBubble` routes by `contentType === 'disclosure'`, not role. **Severity: minor.** Fix task #12 created.

4. **Disclosure text wording differs from spec.** Design doc: "Your image will be sent to Anthropic's Claude API for processing. No image data is stored locally on your device." Implementation: "Receipt images are sent to Anthropic (Claude API) for processing. Images are not stored and exist only in memory during processing." Same meaning, different wording. **Severity: acceptable -- no fix needed.**

5. **Image upload conversation history tracking.** Design doc adds both a user `'[User uploaded a receipt image]'` and an assistant message to conversation history after receipt processing. Implementation only adds the assistant response (no user placeholder for the image). The image was already sent to the API via `processReceipt()`, so the conversation context is functionally adequate. **Severity: acceptable -- no fix needed.**

None of these deviations affect correctness, data integrity, or the contract surface.

---

## Outstanding Issues

Fix tasks created for minor deviations (all non-blocking):

| Task | Issue | Severity |
|------|-------|----------|
| #9 | Import paths in `receipt-processor.ts` should use `@/` alias | minor |
| #10 | Import paths in agent screen files should use `@/` alias | minor |
| #11 | Image upload message `contentType` should be `'image'` not `'text'` | should-fix |
| #12 | Disclosure message `role` should be `'system'` not `'assistant'` | minor |

---

## File Inventory

**New source files (Stage 6):**
- `src/services/claude-client.ts` -- Claude API client with error classification (5 error types), per-call settings read, timeout via AbortController
- `src/services/expense-parser.ts` -- NL expense parsing with JSON extraction, normalization, vendor truncation, date defaulting
- `src/services/expense-parser-prompts.ts` -- System prompts for expense parsing and receipt extraction with structured JSON output formats
- `src/services/receipt-processor.ts` -- Receipt image processing via multimodal API calls, file-to-base64 conversion, receipt/not-receipt parsing
- `src/hooks/useAgentConnectivity.ts` -- Agent-scoped network connectivity hook with API failure/success tracking
- `src/screens/agent/agent-types.ts` -- ChatMessage, ParsedExpense, AgentStatus types, WELCOME_MESSAGE constant
- `src/screens/agent/MessageBubble.tsx` -- Message rendering: text bubbles, expense confirmation cards, error/disclosure messages, image thumbnails
- `src/screens/agent/ChatInput.tsx` -- Text input with Enter-to-send, image upload button, disabled states
- `src/screens/agent/use-expense-confirmation.ts` -- Confirm/cancel hook using `createExpense()`, affirmative text detection, pending confirmation finder
- `src/screens/agent/conversation-context.ts` -- Token estimation, conversation trimming (100K token limit), ensures user-first message ordering
- `src/screens/agent/AgentScreen.tsx` -- Main agent screen integrating all pieces: chat UI, API key validation, connectivity, NL parsing, receipt upload, confirmation flow, context management

**New test files (Stage 6):**
- `tests/services/claude-client.test.ts` -- 9 tests
- `tests/services/expense-parser.test.ts` -- 16 tests
- `tests/services/expense-parser-prompts.test.ts` -- 7 tests
- `tests/services/receipt-processor.test.ts` -- 10 tests
- `tests/hooks/useAgentConnectivity.test.ts` -- 8 tests
- `tests/screens/agent/agent-types.test.ts` -- 4 tests
- `tests/screens/agent/MessageBubble.test.tsx` -- 9 tests
- `tests/screens/agent/ChatInput.test.tsx` -- 10 tests
- `tests/screens/agent/AgentScreen.test.tsx` -- 12 tests
- `tests/screens/agent/use-expense-confirmation.test.ts` -- 13 tests
- `tests/screens/agent/conversation-context.test.ts` -- 12 tests
- `tests/screens/agent/transient-image-handling.test.ts` -- 6 tests
- `tests/screens/agent/session-reset.test.tsx` -- 2 tests

**Modified source files (Stage 6):**
- `src/screens/agent/AgentScreen.tsx` -- Replaced placeholder with full chat UI implementation
