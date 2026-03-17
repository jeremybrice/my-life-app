---
title: "Notification Permission Request Flow"
type: story
status: Draft
product: My Life App
module: Platform
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

The My Life App relies on push notifications to keep the user informed about budget threshold breaches and approaching milestone deadlines. However, requesting notification permissions on first launch is a well-documented anti-pattern that leads to high denial rates. Users who deny permissions often never revisit the decision, permanently cutting off a key engagement channel.

This story introduces a permission request flow that triggers only after the user has demonstrated engagement with the app. The flow must clearly explain the value of notifications before asking, and it must gracefully handle all outcomes including the user choosing "not now" so they can be prompted again later.

## Feature Requirements / Functional Behavior

**UI Behavior**

- A notification permission prompt appears as an in-app modal or bottom sheet, not as a raw browser permission dialog. The in-app prompt appears first, and only if the user agrees does the browser-level permission request fire.
- The prompt displays a brief explanation of the notification types the user will receive: budget alerts when spending exceeds thresholds, and milestone countdown reminders as important dates approach.
- Three clear action options are visible: "Enable Notifications," "Not Now," and an implicit close/dismiss action that behaves the same as "Not Now."
- If the user selects "Enable Notifications," the browser permission dialog appears immediately after.
- If the browser permission is granted, a brief confirmation message appears and the prompt closes.
- If the browser permission is denied (by the user clicking deny on the browser dialog), the app displays a message explaining how to re-enable notifications through browser settings and closes the prompt.
- If the user selects "Not Now," the prompt closes without triggering the browser dialog, and the app records that the prompt was deferred.

**Business Rules**

- The permission prompt must not appear on the user's first app session. It should trigger after the user has completed at least one meaningful action (such as setting a budget, adding an expense, or configuring a milestone).
- If the user selects "Not Now," the prompt may reappear after a reasonable number of subsequent sessions, but must not appear on every session.
- If browser-level permission has already been granted or permanently denied, the in-app prompt should never appear. The app should check the current permission state before triggering the flow.
- The user's permission state and deferral history must persist across sessions.

## Acceptance Tests

**Test 1: Prompt Does Not Appear on First Launch**
Steps: Install the app and open it for the first time. Navigate through the dashboard and settings without performing any data-entry actions.
Expected Result: The notification permission prompt does not appear at any point during this first session.

**Test 2: Prompt Appears After Meaningful Engagement**
Steps: Open the app and perform a qualifying action (e.g., save a budget configuration or add an expense). Continue using the app normally.
Expected Result: The notification permission prompt appears after the qualifying action, displaying the explanation of notification types and the "Enable Notifications" and "Not Now" options.

**Test 3: Successful Permission Grant**
Steps: When the in-app prompt appears, tap "Enable Notifications." When the browser permission dialog appears, select "Allow."
Expected Result: A confirmation message appears briefly. The prompt closes. Subsequent app sessions do not show the permission prompt again.

**Test 4: Browser Permission Denial**
Steps: When the in-app prompt appears, tap "Enable Notifications." When the browser permission dialog appears, select "Block" or "Deny."
Expected Result: The app displays a message explaining how to re-enable notifications in browser settings. The in-app prompt does not reappear in future sessions (since the browser-level state is now "denied").

**Test 5: User Defers with "Not Now"**
Steps: When the in-app prompt appears, tap "Not Now." Continue using the app for several more sessions.
Expected Result: The prompt closes immediately. It does not reappear on the very next session, but does reappear after a reasonable deferral period.

**Test 6: Existing Permission State Prevents Prompt**
Steps: Manually grant notification permission for the app's origin in browser settings before using the app. Open the app and use it normally.
Expected Result: The in-app permission prompt never appears because the browser-level permission is already granted.

## Implementation Context

The Notification API's `Notification.permission` property returns "default," "granted," or "denied" and should be checked before showing the in-app prompt. The in-app prompt is a "pre-permission" pattern that improves grant rates by explaining value before the irreversible browser dialog. Consider storing the deferral count and qualifying action state in IndexedDB (the settings store from Epic 1 is a natural fit). The service worker from Epic 1 must already be registered for push notification support to function.

