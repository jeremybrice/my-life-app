---
title: "Health Routines Screen Layout"
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

The Health Routines screen is one of the six primary screens accessible from the app's persistent navigation. While the Goals screen tracks progress toward discrete objectives, the Health Routines screen tracks ongoing habits and recurring activities. The user needs to see at a glance which routines they have defined, how well they are adhering to their targets this week, and have a quick path to log today's activities.

This screen depends on the health routine data model (Story 5) for reading routine definitions and log entries, and on the app navigation from Epic 1.

## Feature Requirements / Functional Behavior

**UI Behavior**

- The screen displays a list of all defined health routines. Each routine entry shows the routine name, target frequency (e.g., "3x / week"), and a visual indicator of adherence for the current week (e.g., "2 of 3 this week").
- Each routine entry shows the current streak count if a streak exists (wired to streak data from Story 8; displays "0" or no indicator until Story 8 is complete).
- The screen provides a quick action on each routine to log a completion for today, directing the user to the logging interface (Story 7).
- The screen provides a way to create a new routine definition (name, frequency, metrics). This can be a form within the screen or a dedicated creation view.
- The screen provides a way to edit or delete existing routine definitions.
- When no routines are defined, the screen displays an empty state encouraging the user to define their first routine.
- Routines are listed in alphabetical order by name.

**Business Rules**

- Weekly adherence is calculated by counting log entries for the current week (Monday through Sunday) against the target frequency.
- A routine that has met its weekly target is visually distinguished from one that has not.
- Deleting a routine from this screen triggers the cascade delete of all associated log entries (per Story 5 data model rules). The user must confirm before deletion.
- Editing a routine updates the definition but does not modify existing log entries. If the user changes tracked metrics, future log entries use the new metrics but historical entries retain their original values.

## Acceptance Tests

**Test 1: Display routines with adherence indicators**
Steps: Define a routine "Morning Run" with target 3x/week. Log two entries for this week. Navigate to the health routines screen.
Expected Result: "Morning Run" appears with "3x / week" target and adherence showing "2 of 3 this week."

**Test 2: Empty state when no routines defined**
Steps: Ensure no health routines exist. Navigate to the health routines screen.
Expected Result: An empty state message is displayed with a clear path to create the first routine.

**Test 3: Create a new routine from the screen**
Steps: Navigate to the health routines screen. Initiate routine creation. Enter name "Yoga," target frequency 5 per week, and tracked metrics of duration. Save.
Expected Result: "Yoga" appears in the routine list with "5x / week" and adherence showing "0 of 5 this week."

**Test 4: Delete a routine with confirmation**
Steps: Define a routine with log entries. Initiate deletion from the screen.
Expected Result: A confirmation prompt appears warning that all log entries will also be deleted. Confirming removes the routine and its entries. Canceling preserves everything.

**Test 5: Quick log action**
Steps: Define a routine. From the routines screen, tap/click the quick log action on that routine.
Expected Result: The user is directed to the logging interface (Story 7) with the routine pre-selected.

## Implementation Context

This screen is the hub for health routine management. It reads from both routine definitions and log entries to compute weekly adherence counts. The streak display depends on Story 8; until that story is complete, the streak indicator can show a placeholder or zero value. The quick log action bridges to Story 7's logging interface, so the two stories should coordinate on how the routine selection is communicated (e.g., navigation parameter or pre-filled state).
