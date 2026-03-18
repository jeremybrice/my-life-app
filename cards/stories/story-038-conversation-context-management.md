---
title: "Conversation Context Management"
type: story
status: Draft
product: My Life App
module: AI Agent
client: null
team: null
parent: ai-agent-integration
story_points: null
jira_card: null
source_conversation: null
created: 2026-03-17
updated: 2026-03-17
---

## Background / Context

Conversational interactions are inherently contextual. Follow-up messages like "actually make that $25" or "change the category to entertainment" must reference prior context to make sense. The Claude API supports multi-turn conversation via message arrays, where the full conversation history is sent with each request. This story manages the message array lifecycle between the UI and the API client, ensuring conversations feel natural within a session.

## Feature Requirements / Functional Behavior

**UI Behavior**

- Follow-up messages work naturally without the user needing to repeat context.
- Corrections to pending confirmations (e.g., "change the amount to $25") are handled within the same conversational flow.
- Starting a new session (navigating away and returning) resets the conversation context completely.

**Business Rules**

- A session is defined as a continuous visit to the AI Agent screen. Leaving the screen resets the session.
- The full message history is included in each API call to maintain conversational context.
- Under normal usage, no mid-session truncation occurs.
- When the conversation approaches the API's context window limit, the oldest messages are dropped to make room.
- The conversation context is held in memory only and is not persisted to any storage.
- A session reset clears all pending confirmation data along with the message history.
- Multi-step interactions (e.g., parse, edit, confirm) work correctly across multiple messages within a session.

## Acceptance Tests

**Test 1: Follow-Up Correction**
Steps: Send "I spent $20 at Target." Then send "Actually $25."
Expected Result: The agent updates the amount to $25 and re-presents the confirmation.

**Test 2: Category Change**
Steps: Parse an expense. Then send "Change the category to entertainment."
Expected Result: The category is updated and the confirmation is re-presented with the new category.

**Test 3: Session Reset**
Steps: Have a multi-message conversation. Navigate away from the AI Agent screen. Return to the AI Agent screen.
Expected Result: The message thread is empty. The welcome message is displayed. No prior context is retained.

**Test 4: Multiple Expenses in One Session**
Steps: Complete one expense (parse, confirm, save). Start describing a new expense.
Expected Result: The second expense is handled as a separate entry. It does not inherit data from the first expense.

**Test 5: Context Window Limit**
Steps: Send a very large number of messages in a single session to approach the context window limit.
Expected Result: The conversation continues to work. The oldest messages are dropped to stay within the limit.

**Test 6: Ambiguous Follow-Up**
Steps: Parse two separate expenses in the same session. Then send "Change the amount."
Expected Result: The agent either asks which expense to modify or applies the change to the most recent one.

## Implementation Context

This story manages the message array that is passed between the chat UI and the API client. For context window limits, consider either preemptive token estimation (counting tokens before sending) or reactive retry (catching a context-too-long error and trimming). Sessions are scoped to individual screen visits -- navigating away from the AI Agent screen constitutes a session boundary.

