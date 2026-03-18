---
title: "Network Connectivity Detection and Graceful Degradation"
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

The AI Agent is the only feature in the My Life App with a hard network dependency (the Claude API). All other modules operate against local IndexedDB data. The agent must proactively detect connectivity issues and present a clear unavailable state rather than allowing the user to type messages that will silently fail. This ensures a graceful degradation experience scoped specifically to the AI Agent screen.

## Feature Requirements / Functional Behavior

**UI Behavior**

- When the device is offline and the user navigates to the AI Agent screen, an unavailable message is displayed instead of the chat interface. The message clearly communicates that an internet connection is required.
- Navigation to all other screens in the app remains unaffected by connectivity status.
- When connectivity is restored, the unavailable message is replaced with the chat interface without requiring a manual page refresh.
- If connectivity is lost mid-conversation, a banner or indicator is shown but the existing message thread remains visible (not destroyed).

**Business Rules**

- Connectivity detection is scoped to the AI Agent screen only. Other screens are not affected.
- Detection uses a two-layer approach: browser online/offline APIs for immediate detection, plus API call failure detection as a secondary signal.
- The system does not use continuous polling to check connectivity.
- Other screens continue to function normally regardless of network status.
- Loss of connectivity does not destroy the current conversation thread.

## Acceptance Tests

**Test 1: Offline on Load**
Steps: Disable the network connection. Navigate to the AI Agent screen.
Expected Result: An unavailable message is displayed instead of the chat interface.

**Test 2: Connectivity Restored**
Steps: While viewing the unavailable message, re-enable the network connection.
Expected Result: The chat interface appears without requiring a manual page refresh.

**Test 3: Other Screens Unaffected**
Steps: Disable the network connection. Navigate to the dashboard, budget, goals, health, and settings screens.
Expected Result: All screens function normally.

**Test 4: Mid-Conversation Connectivity Loss**
Steps: Start a conversation in the AI Agent. Disable the network connection. Attempt to send another message.
Expected Result: The existing message thread remains visible. An unavailable indicator is shown. The message is not sent.

**Test 5: API Unreachable (Network Up, API Down)**
Steps: With the network connection active but the Claude API unreachable, send a message.
Expected Result: A service unavailable message is displayed.

## Implementation Context

Use a two-layer approach: browser `online`/`offline` events for immediate detection, combined with API call failure detection for cases where the network is up but the API is unreachable. Keep the connectivity state local to the AI Agent screen rather than as a global app concern.

