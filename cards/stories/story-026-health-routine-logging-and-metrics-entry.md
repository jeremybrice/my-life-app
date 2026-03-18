---
title: "Health Routine Logging and Metrics Entry"
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

Logging a routine completion is the most frequent action a user takes in the Health Routines module. Every day the user exercises, meditates, or performs any tracked activity, they create a log entry. The logging interface must be fast and low-friction since it competes with the user's motivation to record the activity at all. If logging feels cumbersome, the user will stop tracking.

The interface supports both simple completion logging (just "I did it today") and detailed metric entry (duration, distance, reps, weight) depending on what the routine tracks. This story writes log entries through the CRUD operations from Story 5 and is accessed from the Health Routines Screen (Story 6).

## Feature Requirements / Functional Behavior

**UI Behavior**

- The logging interface allows the user to select which routine they are logging. If accessed via the quick log action from the routines screen, the routine is pre-selected.
- The interface presents a date field defaulting to today. The user can change the date to a past date for back-logging a forgotten entry.
- If the selected routine tracks metrics, the interface shows input fields for each tracked metric (duration in minutes, distance with unit, reps as count, weight with unit). All metric fields are optional; the user can log a completion without recording metrics.
- A submit action saves the log entry and returns the user to the health routines screen, where adherence indicators update to reflect the new entry.
- A cancel action discards the entry and returns to the previous screen.
- After a successful log, the interface provides visual confirmation that the entry was saved.

**Business Rules**

- A log entry must be associated with an existing routine. The user cannot log against a routine that has been deleted.
- The log date cannot be in the future.
- Metric values must be non-negative numbers when provided.
- Duration is recorded in minutes. Distance and weight units are displayed as configured on the routine definition.
- Multiple log entries for the same routine on the same date are allowed, supporting activities done more than once per day.
- The log entry persists the metric types and values as they exist at the time of logging. If the routine's tracked metrics are later changed, historical log entries are not affected.

## Acceptance Tests

**Test 1: Log a routine with metrics**
Steps: Define a routine "Morning Run" tracking duration and distance. Open the logging interface with "Morning Run" selected. Enter today's date, duration of 30 minutes, distance of 5 km. Submit.
Expected Result: The log entry is saved. Returning to the routines screen shows the adherence count incremented by one for this week.

**Test 2: Log a routine without metrics**
Steps: Define a routine "Meditation" tracking duration. Open the logging interface. Select "Meditation," today's date. Leave duration blank. Submit.
Expected Result: The log entry is saved with no metric values. The adherence count still increments because the routine was completed.

**Test 3: Back-date a log entry**
Steps: Open the logging interface. Select a routine. Change the date to three days ago. Submit.
Expected Result: The log entry is saved with the back-dated date. If the back-dated date falls within the current week, the weekly adherence count reflects it.

**Test 4: Reject a future date**
Steps: Open the logging interface. Select a routine. Set the date to tomorrow. Attempt to submit.
Expected Result: Validation rejects the future date with an inline message. The log entry is not saved.

**Test 5: Pre-selected routine from quick log**
Steps: From the health routines screen, use the quick log action on a specific routine. Observe the logging interface.
Expected Result: The logging interface opens with that routine already selected. The user only needs to confirm the date and optionally enter metrics.

**Test 6: Multiple entries same day**
Steps: Log a routine for today. Log the same routine again for today with different metric values.
Expected Result: Both entries are saved. The adherence count reflects both entries (count of 2 for today if the routine tracks per-entry).

## Implementation Context

Speed and simplicity are the primary design considerations. The user will use this interface daily, possibly multiple times per day. Minimizing taps/clicks from intent to saved entry is more important than feature richness. The pre-selection flow from Story 6's quick log action should bypass any unnecessary selection steps. Consider how metric units are displayed; they should match whatever the user configured when defining the routine (Story 5/Story 6).
