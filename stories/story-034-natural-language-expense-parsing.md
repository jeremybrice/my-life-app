---
title: "Natural Language Expense Parsing"
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

Natural language expense parsing is the core intelligence behind conversational expense entry. Users should be able to describe an expense in plain language (e.g., "I spent $25 at Chipotle on dining out today") and have the agent extract the structured data fields. The parser must handle variable input gracefully, asking clarifying questions when information is missing or ambiguous rather than guessing or fabricating data.

## Feature Requirements / Functional Behavior

**UI Behavior**

- When the user sends a message describing an expense, the agent responds with the parsed data fields formatted for confirmation.
- If required information is missing, the agent asks a targeted clarifying question (e.g., "How much did you spend?").
- If the input is ambiguous, the agent asks targeted questions to resolve the ambiguity.
- If the message is not about an expense, the agent responds with a redirect message guiding the user back to expense logging.

**Business Rules**

- Parsed fields: amount (required), vendor (required, 20 character max), category (optional, suggested from a common list), date (defaults to today), description (optional).
- Vendor names are truncated at 20 characters if they exceed the limit.
- Relative date references (e.g., "yesterday," "last Friday") are resolved to actual dates.
- If no currency symbol is provided, the local currency is assumed.
- Category suggestions are drawn from a common predefined list.
- The agent must never fabricate data that was not present or inferable from the user's input.

## Acceptance Tests

**Test 1: Complete Input**
Steps: Send "I spent $25 at Chipotle on dining out today."
Expected Result: All fields are parsed correctly: amount $25, vendor "Chipotle," category "dining out," date today.

**Test 2: Missing Amount**
Steps: Send "I ate at Subway for lunch."
Expected Result: The agent asks how much was spent.

**Test 3: Relative Date**
Steps: Send "Spent $15 at Shell gas station yesterday."
Expected Result: The date is resolved to yesterday's actual date.

**Test 4: Ambiguous Input**
Steps: Send "I spent some money today."
Expected Result: The agent asks clarifying questions about the amount and vendor.

**Test 5: Non-Expense Message**
Steps: Send "What's the meaning of life?"
Expected Result: The agent responds with a redirect message guiding the user to log an expense.

**Test 6: Long Vendor Name**
Steps: Send "$50 at The Cheesecake Factory."
Expected Result: The vendor is extracted and truncated to 20 characters if it exceeds the limit.

## Implementation Context

Prompt engineering is critical for this story. The system prompt must instruct the Claude API to output structured JSON containing the parsed fields. The response parsing logic must handle both structured JSON responses and conversational responses (e.g., when the agent asks a clarifying question). Design the system prompt carefully to ensure reliable extraction across varied input styles.

