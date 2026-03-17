---
title: "Notification Threshold Settings UI"
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

Stories 041 and 042 implement the notification triggers for budget thresholds and milestone countdowns, but the user needs a way to customize these settings. The defaults (daily overspend, monthly 80%/90%/100%, milestone at 30/7/1 days) may not suit every user. Some users may want fewer notifications; others may want to adjust the percentage thresholds or add different countdown intervals.

This story adds the notification configuration UI to the existing settings screen. It provides the controls that Stories 041 and 042 read from when deciding whether and when to send notifications.

## Feature Requirements / Functional Behavior

**UI Behavior**

- A "Notifications" section appears on the settings screen, grouped logically below or alongside existing settings sections.
- The section is divided into two subsections: "Budget Alerts" and "Milestone Alerts."
- Budget Alerts subsection contains: a toggle to enable or disable daily overspend notifications, and a list of monthly percentage thresholds. Each threshold shows its percentage value and a toggle to enable or disable it. The user can edit the percentage value of existing thresholds and add new custom thresholds.
- Milestone Alerts subsection contains: a list of countdown interval values (in days). Each interval shows its value and a toggle to enable or disable it. The user can edit existing intervals and add new custom intervals.
- A master "Notifications Enabled" toggle at the top of the section controls whether all notifications are active. When disabled, all individual toggles are visually dimmed and non-interactive.
- Changes save automatically when the user modifies any value (no separate save button needed).
- If notification permission has not been granted (or was denied), the section displays a message indicating the current permission state and links to the permission request flow (Story 039) or explains how to enable in browser settings.

**Business Rules**

- Default configuration on first use: daily overspend enabled, monthly thresholds at 80%, 90%, and 100% (all enabled), milestone intervals at 30, 7, and 1 days (all enabled).
- The user cannot create a monthly threshold below 1% or above 200%. Percentage values must be whole numbers.
- The user cannot create a milestone interval of 0 or negative days. Intervals must be positive whole numbers.
- Duplicate threshold or interval values are not allowed. If the user tries to add a value that already exists, a validation message appears.
- Removing all thresholds or intervals for a category is allowed. This effectively disables that notification category.
- Settings persist in IndexedDB and are read by Stories 041 and 042 when evaluating whether to fire notifications.

## Acceptance Tests

**Test 1: Default Settings Display**
Steps: Open the settings screen on a fresh app installation. Navigate to the Notifications section.
Expected Result: Budget alerts show daily overspend (enabled), 80% (enabled), 90% (enabled), 100% (enabled). Milestone alerts show 30 days (enabled), 7 days (enabled), 1 day (enabled). Master toggle is enabled.

**Test 2: Toggle Individual Threshold**
Steps: Disable the 80% monthly budget threshold toggle.
Expected Result: The toggle shows as disabled. Budget threshold checks (Story 041) no longer fire at 80%. The 90% and 100% thresholds remain active.

**Test 3: Add Custom Threshold**
Steps: Add a new monthly budget threshold at 50%.
Expected Result: A new entry appears in the list showing 50% with an enabled toggle. This threshold is now active and will fire notifications when crossed.

**Test 4: Invalid Threshold Rejected**
Steps: Try to add a monthly threshold of 0% or 250%.
Expected Result: A validation message indicates the value must be between 1% and 200%. The invalid threshold is not saved.

**Test 5: Master Toggle Disables All**
Steps: Turn off the master "Notifications Enabled" toggle.
Expected Result: All individual toggles appear dimmed and non-interactive. No notifications fire (budget or milestone) while the master toggle is off.

**Test 6: Permission State Display**
Steps: Deny notification permission at the browser level, then open the Notifications settings section.
Expected Result: A message appears indicating that notification permission has been denied and explains how to re-enable it in browser settings. The settings controls remain visible so the user can still configure their preferences for when permissions are later granted.

## Implementation Context

This story extends the settings screen from Epic 1. The notification settings should be stored in the existing settings IndexedDB store, using a structured object for notification preferences. Stories 041 and 042 read from this configuration to determine active thresholds and intervals. Consider the data shape carefully: an array of threshold objects (each with a value and enabled flag) is more flexible than individual fields. The master toggle state should also be checked by the notification dispatch logic before any notification is sent. The `Notification.permission` value can be read to determine the current browser permission state for the informational message.

