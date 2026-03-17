---
title: "In-App Notification Fallback"
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

Not all platforms support push notifications, and some users will decline notification permissions. In these scenarios, the app still needs to communicate urgent information such as budget overspend and approaching milestones. Without an in-app fallback, users on unsupported platforms (or who denied permissions) would have no proactive awareness of these events, undermining the core value of the notification system.

This story creates in-app visual notification components that display the same alert content that would have been sent as push notifications. These fallbacks ensure feature parity in information delivery even when the delivery mechanism differs.

## Feature Requirements / Functional Behavior

**UI Behavior**

- A notification banner area is visible at the top of the dashboard screen when there are active alerts. The banner is distinct from regular dashboard content (visually differentiated through background color or border).
- Each active alert appears as a separate entry within the banner area, showing the alert title and a brief summary (same content as the push notification body).
- Alert indicators (such as a colored dot or small icon) appear on the navigation items for Budget and Dashboard when those areas have related active alerts.
- Banners are dismissible. The user can tap a dismiss action on individual banners to acknowledge them.
- When all banners are dismissed, the banner area collapses and is no longer visible.

**Business Rules**

- In-app fallback activates when push notifications are unavailable (capability detection reports no push support) or when the user has denied notification permission.
- The in-app fallback displays the same alerts that push notifications would deliver: daily budget overspend, monthly budget thresholds, and milestone countdown intervals.
- Dismissed banners do not reappear for the same event. If the user dismisses a "daily overspend" banner, it does not return for that day's overspend event (but may appear again for a new day's overspend).
- If push notifications are available and granted, the in-app fallback does not display. The user should not see both a push notification and an in-app banner for the same event.
- Alert indicators on navigation items clear when the user navigates to the corresponding screen and views the information.

## Acceptance Tests

**Test 1: Banner Appears on Dashboard for Budget Alert**
Steps: On a platform without push support, add expenses that exceed the daily budget. Navigate to the dashboard.
Expected Result: A notification banner appears at the top of the dashboard indicating daily budget overspend, including the amount over budget.

**Test 2: Banner Appears for Milestone Alert**
Steps: On a platform without push support, reach a configured countdown interval (e.g., 30 days remaining). Open the dashboard.
Expected Result: A notification banner appears with the milestone countdown alert message.

**Test 3: Multiple Banners Display Simultaneously**
Steps: Trigger both a budget alert and a milestone alert on a platform without push support. View the dashboard.
Expected Result: Both banners appear in the banner area, each as a separate entry with its own dismiss action.

**Test 4: Banner Dismissal**
Steps: Tap the dismiss action on a budget overspend banner.
Expected Result: The banner disappears. It does not reappear on subsequent visits to the dashboard for that same event. Other active banners remain visible.

**Test 5: Navigation Alert Indicators**
Steps: Trigger a budget alert. Look at the navigation bar before navigating to the budget screen.
Expected Result: The Budget navigation item shows an alert indicator (colored dot or icon). After navigating to the budget screen, the indicator clears.

**Test 6: Fallback Inactive When Push Is Available**
Steps: On a platform with push support and notification permission granted, trigger a budget threshold. View the dashboard.
Expected Result: No in-app banner appears on the dashboard. The alert was delivered via push notification only.

## Implementation Context

The in-app fallback needs a shared alert queue or store that budget threshold checks (Story 041) and milestone countdown checks (Story 042) write to when push is unavailable. The dashboard and navigation components read from this store to render banners and indicators. Consider an "alerts" store in IndexedDB or an in-memory alert list that persists dismissal state. The routing logic between push and in-app should live in one place (likely in the notification dispatch logic from Stories 041 and 042) based on capability flags from Story 040.

