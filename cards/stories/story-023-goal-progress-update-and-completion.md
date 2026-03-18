---
title: "Goal Progress Update and Completion"
type: story
status: Draft
product: My Life App
module: Goals & Health
client: null
team: null
parent: goals-health-routines
story_points: null
jira_card: null
source_conversation: null
created: 2026-03-17
updated: 2026-03-17
---

## Background / Context

Goals are not static records; their value comes from tracking progress over time. Each progress model requires a different update interaction. A numeric target goal needs its current value incremented or adjusted. A percentage goal needs its percentage updated. A date-based goal has progress implicitly driven by time passing but may allow status annotation. A freeform goal needs its status label changed. Beyond progress updates, goals need lifecycle transitions: marking a goal as completed when the user has achieved it, or archiving a goal that is no longer relevant.

This story depends on the goal data model (Story 1) for persistence and the goals screen (Story 2) for displaying updated state.

## Feature Requirements / Functional Behavior

**UI Behavior**

- The user can select a goal from the goals screen to view its detail and update progress.
- For numeric target goals, the user can update the current value. The interface supports both setting an absolute value and incrementing by an amount.
- For percentage-based goals, the user can adjust the current percentage.
- For freeform status goals, the user can change the status label to any text value.
- For date-based goals, the user can view days remaining and update the target date if needed.
- A "Mark Complete" action is available on active goals. Activating it transitions the goal to completed status.
- A "Archive" action is available on active and completed goals. Activating it transitions the goal to archived status.
- A "Reactivate" action is available on completed and archived goals, returning them to active status.
- When a numeric target goal's current value reaches or exceeds the target value, the interface prompts the user to mark it as complete (but does not auto-complete).
- When a percentage goal reaches 100%, the interface similarly prompts completion.
- Progress updates reflect immediately in the goals list view upon returning to the screen.

**Business Rules**

- Progress values must remain valid for their model. Numeric current values cannot be negative. Percentages must stay between 0 and 100.
- Completing a goal records the completion date.
- Archiving a goal preserves all data but removes it from the default goals list view.
- Status transitions are: active to completed, active to archived, completed to archived, completed to active, archived to active. Direct transition from archived to completed is not supported.
- The updated timestamp refreshes on every progress update and status change.

## Acceptance Tests

**Test 1: Update numeric target progress**
Steps: Create a numeric target goal with target 1000 and current 0. Open the goal. Update current value to 500.
Expected Result: The goal's current value shows 500. The goals list displays "500 / 1,000." The updated timestamp is refreshed.

**Test 2: Mark a goal as completed**
Steps: Create an active goal. Open the goal. Select "Mark Complete."
Expected Result: The goal's status changes to "completed." A completion date is recorded. The goal appears with completed styling on the goals screen.

**Test 3: Archive a goal**
Steps: Create an active goal. Open the goal. Select "Archive."
Expected Result: The goal's status changes to "archived." It disappears from the default goals list view. It reappears when the archived filter is selected.

**Test 4: Reactivate a completed goal**
Steps: Create a goal and mark it complete. Open the completed goal. Select "Reactivate."
Expected Result: The goal returns to "active" status and appears in the default active goals list view.

**Test 5: Numeric target goal prompts completion at target**
Steps: Create a numeric target goal with target 100. Update current value to 100.
Expected Result: The interface prompts the user to mark the goal as complete. The goal is not automatically completed; the user must confirm.

**Test 6: Reject invalid progress values**
Steps: Attempt to set a numeric goal's current value to a negative number. Attempt to set a percentage goal to 105%.
Expected Result: Both updates are rejected with validation feedback. The previous valid values are preserved.

## Implementation Context

This story completes the full goals CRUD lifecycle. After this story, goals can be created (Story 3), viewed and filtered (Story 2), updated, completed, and archived. The Dashboard Goals Aggregation Widget (Story 9) will query these statuses to produce summary counts. Consider whether the goal detail view is a separate screen or an inline/modal interaction from the goals list; either approach works, but the choice affects navigation flow.
