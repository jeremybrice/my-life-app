# Mission Brief

**Playbook:** feature-build
**Design Doc:** docs/plans/stage-6-ai-agent.md
**Supplementary:** docs/plans/global-conventions.md
**Created:** 2026-03-18

## Requirements Summary

1. Chat UI with message thread: familiar messaging interface, text input + send button + image upload button, auto-scroll, session-scoped (navigating away resets)
2. Claude API client (src/services/claude-client.ts): reads API key from settings on each call, configurable model, loading indicator, timeout, distinct errors (missing key, 401, 429, timeout, network)
3. Network connectivity detection scoped to agent screen: offline shows unavailable message, restored shows chat without refresh, mid-conversation disconnect preserves thread
4. API key validation on screen load: lightweight API call, missing vs invalid distinguished, network error defers to connectivity handling
5. Natural language expense parsing (src/services/expense-parser.ts): system prompt for structured JSON output, extracts amount/vendor/category/date/description, asks clarifying questions for missing fields, relative date resolution, vendor truncation to 20 chars
6. Expense confirmation flow: inline confirm/cancel cards in thread, "yes" typed also works, edit-before-confirm, writes through createExpense() from expense-service.ts (Stage 3 contract)
7. Image upload + receipt processing (src/services/receipt-processor.ts): JPEG/PNG, multimodal API call, extract vendor/amount/date/line items, non-receipt images handled
8. Transient image handling: no persistence anywhere (IndexedDB, localStorage, sessionStorage, service worker cache), object URLs revoked, Anthropic disclosure on first upload
9. Conversation context management: full history per API call, session-scoped, context window limit drops oldest messages

## Key Files

**Existing (from prior stages):**
- `src/data/expense-service.ts` — createExpense() contract surface (Stage 3)
- `src/data/settings-service.ts` — getSettings() for API key retrieval
- `src/hooks/useOnlineStatus.ts` — network connectivity hook
- `src/screens/agent/AgentScreen.tsx` — replace with full chat UI

**New files to create:**
- `src/services/claude-client.ts` — Claude API client
- `src/services/expense-parser.ts` — NL expense parsing logic
- `src/services/receipt-processor.ts` — Receipt image processing
- Chat UI components in src/screens/agent/

## Test Command

```
npx vitest run
```

## Developer Callouts

- **All work on `staging` branch.** Do NOT create new branches.
- **CRITICAL: Agent writes expenses through createExpense() from src/data/expense-service.ts** — the SAME function the manual form uses. NO duplicate persistence logic. Do NOT pass yearMonth to createExpense — it derives yearMonth from date internally.
- **API key read from IndexedDB via settings service on each API call.** Never cached in memory, never hardcoded.
- **Images NEVER persisted** — not in IndexedDB, localStorage, sessionStorage, or service worker cache. Object URLs revoked after API response.
- **Conversation is session-scoped.** Navigating away resets everything.
- **The agent NEVER fabricates data** not present in user input.
- **@anthropic-ai/sdk** for Claude API calls (already in package.json dependencies).
- Follow global-conventions.md for naming, structure, patterns.

## Success Criteria

- User can type NL expense description and have agent parse + confirm + create expense via createExpense()
- User can upload receipt image and have agent extract + confirm + create expense
- Expenses created by agent are identical in structure to manual form entries
- When API unreachable, agent screen shows clear unavailable message, all other screens work
- Receipt images never stored locally
- Agent asks for confirmation before writing any data
- All tests pass with `npx vitest run`
