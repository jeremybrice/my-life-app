---
title: "Badge Notification Updates"
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

App icon badges provide a passive, glanceable signal that something requires the user's attention. When the user sees a badge count on the My Life App icon, they know there are active alerts without needing to open the app or read individual notifications. This is a lightweight complement to push notifications that reinforces engagement.

The Badge API is not universally supported across all browsers and platforms. This story must use the capability detection from Story 040 to determine availability and degrade gracefully when the API is absent.

## Feature Requirements / Functional Behavior

**UI Behavior**

- The app icon badge displays a numeric count representing the number of currently active, unacknowledged alerts.
- The badge count increments when a new budget threshold notification or milestone countdown notification fires.
- The badge count decrements (or clears) when the user opens the app and views the relevant information (dashboard for milestones, budget screen for budget alerts).
- When there are no active alerts, the badge is cleared entirely (no badge displayed, not a badge showing "0").

**Business Rules**

- Badge count is the sum of active budget threshold alerts and active milestone countdown alerts that the user has not yet acknowledged by viewing the app.
- Opening the app and navigating to the budget screen clears budget-related badge counts. Opening the app and viewing the dashboard clears milestone-related badge counts.
- On platforms where the Badge API is not supported (as reported by capability detection from Story 040), badge update calls are silently skipped. No errors are thrown and no fallback is attempted for badges specifically.
- Badge updates happen whenever a notification fires and whenever the user views the relevant screen. The badge should also recalculate on app launch in case the state has drifted.

## Acceptance Tests

**Test 1: Badge Appears After Budget Alert**
Steps: Trigger a daily overspend notification by exceeding the daily budget. Observe the app icon without opening the app.
Expected Result: The app icon displays a badge with a count of 1 (or incremented from the previous count).

**Test 2: Badge Count Increments with Multiple Alerts**
Steps: Trigger a daily overspend notification and a milestone countdown notification without opening the app between them.
Expected Result: The badge count reflects the total number of active alerts (e.g., 2).

**Test 3: Badge Clears When User Views Relevant Screen**
Steps: With a badge count of 2 (one budget alert, one milestone alert), open the app and navigate to the budget screen, then navigate to the dashboard.
Expected Result: The badge count decrements as each relevant screen is viewed and clears entirely when all alerts are acknowledged.

**Test 4: Badge Cleared When No Active Alerts**
Steps: Acknowledge all active alerts by viewing the relevant screens. Check the app icon.
Expected Result: No badge is displayed on the app icon.

**Test 5: Graceful Skip on Unsupported Platform**
Steps: Open the app in a browser that does not support the Badge API. Trigger a notification that would normally update the badge.
Expected Result: No error occurs. The notification still fires (push or in-app), but no badge appears since the API is unavailable.

## Implementation Context

The Badge API uses `navigator.setAppBadge(count)` and `navigator.clearAppBadge()`. These should be called from both the service worker (when notifications fire in the background) and the main app thread (when screens are viewed). An "active alerts" count needs to be tracked persistently, likely in IndexedDB, since the badge may need recalculation on app launch. Consider creating a small badge management module that Story 041, Story 042, and screen navigation handlers all call into.

