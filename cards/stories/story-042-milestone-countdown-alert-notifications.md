---
title: "Milestone Countdown Alert Notifications"
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

The milestone countdown on the dashboard is the app's central motivational element, showing days remaining to the user's target date. However, the user only sees this when they open the app. Proactive notifications at key countdown intervals (30 days, 7 days, 1 day remaining) ensure the user stays aware of approaching milestones even when they have not opened the app recently.

This story implements the countdown check logic and notification dispatch for milestone alerts. The check must run periodically since milestone countdown changes are time-based (not triggered by user actions like budget alerts are).

## Feature Requirements / Functional Behavior

**UI Behavior**

- Push notifications appear as standard system notifications with a title referencing the milestone label (e.g., "Retirement Countdown") and a body stating the days remaining.
- The notification message is motivational in tone, not just informational (e.g., "30 days to Retirement! You're almost there." rather than "30 days remaining").
- Tapping the notification opens the app to the dashboard where the countdown is displayed.

**Business Rules**

- Default alert intervals are 30, 7, and 1 days before the target date. The user can configure which intervals are active and add or remove interval values.
- The countdown check must run daily. Since the app may not be opened every day, the check should leverage the service worker or run on app launch and compare against the last check date.
- Each interval notification fires at most once per milestone. If the user receives the "30 days remaining" notification, it does not fire again even if the app re-checks the next day.
- If the target date has passed, no countdown notifications fire.
- If no target date is configured in settings, countdown notifications are inactive and the user sees no alerts.
- If push notifications are unavailable, the alert routes to the in-app fallback (Story 044).

## Acceptance Tests

**Test 1: 30-Day Countdown Notification**
Steps: Configure a target date that is exactly 30 days from today. Open the app or wait for the daily check to run.
Expected Result: A push notification fires with the milestone label and a message indicating 30 days remain.

**Test 2: Notification Fires Only Once Per Interval**
Steps: After receiving the 30-day notification, close and reopen the app the next day (29 days remaining).
Expected Result: No duplicate 30-day notification fires. No notification fires at all since 29 days is not a configured interval.

**Test 3: Multiple Intervals Fire as Countdown Progresses**
Steps: Observe the app as the countdown progresses through 30, 7, and 1 days remaining.
Expected Result: A separate notification fires at each configured interval, each exactly once.

**Test 4: Disabled Interval Does Not Fire**
Steps: Disable the 7-day interval in notification settings. Reach 7 days before the target date.
Expected Result: No notification fires at the 7-day mark. The 1-day notification still fires when that interval is reached.

**Test 5: No Target Date Configured**
Steps: Remove the target date from settings. Wait for the countdown check cycle.
Expected Result: No milestone countdown notifications fire. No errors occur.

**Test 6: Past Target Date Produces No Notifications**
Steps: Set a target date in the past. Open the app.
Expected Result: No countdown notifications fire. The dashboard shows the milestone as reached or passed.

## Implementation Context

Unlike budget threshold checks (which trigger on expense writes), milestone checks are time-driven. Consider using the service worker's periodic background sync API where available, or running the check on each app launch while comparing against a stored "last checked" date to catch missed days. The "already fired" state per interval should persist in IndexedDB so it survives app restarts. The milestone target date and label come from the settings store established in Epic 1.

