---
title: "Chat UI Layout and Message Thread"
type: story
status: Draft
product: My Life App
module: AI Agent
client: null
team: null
parent: null
story_points: null
jira_card: null
source_conversation: null
created: 2026-03-17
updated: 2026-03-17
---

## Background / Context

The AI Agent screen is the primary surface for conversational interaction within the My Life App. Without the chat UI, none of the other agent capabilities have a place to render. The screen must feel like a familiar messaging interface so users can interact naturally with the AI agent for expense logging and other tasks.

## Feature Requirements / Functional Behavior

**UI Behavior**

- The Agent screen is accessible from the app's main navigation.
- The message thread is scrollable, displaying messages in chronological order.
- User messages and agent messages are visually distinct through different alignment and/or color treatment.
- The thread auto-scrolls to the newest message when a new message is added.
- A text input field is anchored at the bottom of the screen.
- A send button is positioned adjacent to the text input.
- Tapping the send button submits the current text as a user message.
- The input field clears after a message is sent.
- When there is no conversation history, an empty state displays a welcome prompt that orients the user on the agent's capabilities.
- Agent messages may contain structured content (e.g., confirmation cards with parsed expense data).

**Business Rules**

- Messages are ephemeral to the current session and are not persisted across sessions.
- The send button is disabled when the text input is empty.
- Messages display in chronological order within the thread.
- The welcome message orients the user on what the agent can help with.

## Acceptance Tests

**Test 1: Empty State**
Steps: Navigate to the AI Agent screen with no prior conversation in the session.
Expected Result: A welcome message is displayed. The text input and send button are visible.

**Test 2: Sending a Message**
Steps: Type "Hello" into the text input and tap the send button.
Expected Result: A user message bubble appears in the thread with "Hello." The text input clears.

**Test 3: Scrolling**
Steps: Send enough messages to exceed the visible area of the message thread.
Expected Result: The thread is scrollable. It auto-scrolls to show the newest message.

**Test 4: Send Button Disabled When Empty**
Steps: Focus the text input without typing any text.
Expected Result: The send button is disabled and cannot be tapped.

**Test 5: Visual Distinction Between User and Agent Messages**
Steps: Send a message and observe the agent's response.
Expected Result: User and agent messages have different alignment and/or color treatment, making them clearly distinguishable.

## Implementation Context

This is a purely UI story; no API integration is needed. Stub agent responses for testing purposes. Design the input area to accommodate a future image upload button. Design the message rendering to support future structured confirmation cards (parsed expense data with confirm/cancel actions).

