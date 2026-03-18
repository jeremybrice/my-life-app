---
title: "Budget Threshold Alert Notifications"
type: story
status: Draft
product: My Life App
module: Platform
client: null
team: null
parent: notifications-importexport-polish
story_points: null
jira_card: null
source_conversation: null
created: 2026-03-17
updated: 2026-03-17
---

## Background / Context

The budget module (Epic 2) tracks daily and monthly spending, but it only surfaces this information when the user opens the app. For a budget tool to be effective, the user needs proactive alerts when their spending crosses meaningful thresholds. Without these alerts, the user could overspend for days before noticing.

This story implements the logic that monitors budget data after each expense entry and fires notifications when configured thresholds are crossed. The default thresholds are daily overspend (spending exceeds daily allowance) and monthly percentages (80%, 90%, 100% of monthly budget consumed). The user can adjust these thresholds in settings (Story 049 covers the UI for that).

## Feature Requirements / Functional Behavior

**UI Behavior**

- Push notifications appear as standard system notifications outside the app with a clear title and body message.
- Daily overspend notification includes the amount over budget for the day.
- Monthly threshold notifications include the percentage reached and the total amount spent versus the monthly budget.
- Tapping a notification opens the app to the budget screen (if the platform supports notification click handling).

**Business Rules**

- Daily overspend check: after any expense is added or modified, if today's total spending exceeds today's daily allowance, a notification fires. This notification fires at most once per day. If the user has already been notified of daily overspend today, additional expenses do not trigger another daily overspend notification.
- Monthly threshold checks: after any expense is added or modified, the system checks total monthly spending against each configured threshold percentage. A notification fires the first time each threshold is crossed in a given month. If the 80% threshold was already crossed, another expense does not re-trigger the 80% notification, but may trigger the 90% notification.
- Default thresholds are daily overspend, and monthly 80%, 90%, 100%. The user can enable or disable individual thresholds and adjust the monthly percentages.
- If push notifications are not available (per capability detection from Story 040), this logic should still run and route alerts to the in-app fallback system (Story 044).
- Notifications must not fire for budget data in past months. Only the current month's data triggers threshold checks.

## Acceptance Tests

**Test 1: Daily Overspend Notification Fires**
Steps: Set a daily budget allowance of $50. Add expenses totaling $55 for today.
Expected Result: A push notification appears indicating the user has exceeded today's budget by $5.

**Test 2: Daily Overspend Fires Only Once Per Day**
Steps: After receiving the daily overspend notification, add another $20 expense for today.
Expected Result: No additional daily overspend notification fires.

**Test 3: Monthly 80% Threshold Notification**
Steps: Set a monthly budget of $1000. Add expenses that bring the monthly total to $810.
Expected Result: A notification fires indicating monthly spending has reached 80% of the budget ($810 of $1000).

**Test 4: Multiple Thresholds Fire Sequentially**
Steps: With a $1000 monthly budget, add expenses to cross 80% ($800+), then later add expenses to cross 90% ($900+).
Expected Result: The 80% notification fires when that threshold is first crossed. The 90% notification fires separately when that threshold is crossed. Each fires exactly once.

**Test 5: Disabled Threshold Does Not Fire**
Steps: Disable the 80% monthly threshold in settings. Add expenses that exceed 80% of the monthly budget.
Expected Result: No notification fires for the 80% threshold. The 90% and 100% thresholds remain active and fire when crossed.

**Test 6: Past Month Data Does Not Trigger Notifications**
Steps: Navigate to a previous month and edit an expense that would push that month over a threshold.
Expected Result: No notification fires because the threshold check only applies to the current month.

## Implementation Context

The threshold check logic should run after every write to the expenses store. Consider where to store "already fired" flags for each threshold in a given month and day to prevent duplicate notifications. These flags should reset when a new day begins (for daily) or a new month begins (for monthly). The notification dispatch should check capability flags from Story 040 and route to push or in-app fallback accordingly. The settings screen (Story 049) will store threshold configuration; this story should read from that configuration.

