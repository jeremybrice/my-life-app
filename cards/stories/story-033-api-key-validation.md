---
title: "API Key Validation"
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

Proactive API key validation on screen load saves the user from frustrating failure loops where they type a message, wait for a response, and only then discover their key is missing or invalid. By validating the key as soon as the AI Agent screen loads, the app can surface actionable guidance immediately, directing the user to settings before they waste time composing messages.

## Feature Requirements / Functional Behavior

**UI Behavior**

- A validation check runs automatically when the AI Agent screen loads.
- A subtle loading indicator is displayed during the validation check.
- If no API key is configured, a message is displayed with a clear path to the settings screen.
- If the API key is invalid, an error message is displayed directing the user to update the key in settings.
- If the key is expired or revoked, a specific message is displayed distinguishing this from a missing key.
- Returning to the AI Agent screen after updating the key in settings re-triggers validation.

**Business Rules**

- Validation uses a lightweight API call (minimal cost/tokens).
- Validation runs on every navigation to the AI Agent screen.
- Missing key messaging differs from invalid key messaging.
- Validation does not affect other screens in the app.
- If a network error occurs during validation, the system defers to connectivity handling (Story 032) rather than showing an invalid key error.

## Acceptance Tests

**Test 1: Valid Key**
Steps: Configure a valid API key. Navigate to the AI Agent screen.
Expected Result: A brief initialization period occurs, then the chat interface becomes interactive.

**Test 2: No Key Configured**
Steps: Ensure no API key is stored. Navigate to the AI Agent screen.
Expected Result: A message indicates that an API key is required, with a link or direction to the settings screen.

**Test 3: Invalid Key**
Steps: Configure an invalid API key. Navigate to the AI Agent screen.
Expected Result: An error message indicates the key is invalid.

**Test 4: Network Error During Validation**
Steps: Configure a valid API key. Disable the network connection. Navigate to the AI Agent screen.
Expected Result: The connectivity unavailable state is shown (from Story 032), not an invalid key error.

**Test 5: Updated Key Re-Validates**
Steps: See the invalid key error. Navigate to settings, update the API key to a valid one, and return to the AI Agent screen.
Expected Result: The key is re-validated. The chat interface becomes interactive.

## Implementation Context

There is no dedicated "validate" endpoint on the Claude API. Use a minimal, low-cost API request (e.g., a short message with minimal tokens) to verify the key. This story interacts closely with Story 031 (API client) and Story 032 (connectivity detection).

