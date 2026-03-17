---
title: "Health Routine Data Model and CRUD Operations"
type: story
status: Draft
product: My Life App
module: Goals & Health
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

The Health Routines module tracks two related but distinct concepts. First, routine definitions describe what the user wants to track: the routine name, how often they intend to do it, and what metrics they want to record. Second, log entries record individual instances of performing a routine, capturing the date and any quantitative metrics. This two-entity model supports both the "recurring routine" pattern (e.g., "run 3 times per week") and the "one-off log" pattern (e.g., logging a workout with specific metrics) that the Epic scope calls for.

The PWA Shell Epic (Epic 1) provisions the IndexedDB health routines object store. This story fills that store with a well-defined data model and the operations that all subsequent health stories depend on.

## Feature Requirements / Functional Behavior

**Business Rules**

- A routine definition has a name (required), a target frequency expressed as a count per period (e.g., 3 times per week), and a list of zero or more tracked metrics. The period for frequency is weekly in v1.
- Supported metric types are duration (in minutes), distance (with a user-chosen unit), reps (count), and weight (with a user-chosen unit). A routine can track any combination of these or none at all.
- A log entry records the date of completion, the routine it belongs to (by ID), and values for any metrics the routine tracks. Metric values are optional on each log entry even if the routine defines tracked metrics.
- Deleting a routine definition also deletes all associated log entries.
- Routine names must not be empty. Target frequency count must be a positive integer. Target frequency period defaults to "weekly."
- Log entry dates must not be in the future. A user can back-date a log entry to record a routine they forgot to log.
- Multiple log entries for the same routine on the same date are permitted (e.g., two separate runs in one day).

**UI Behavior**

- This story is a data layer story. There is no direct UI deliverable. The CRUD operations expose an interface consumed by the Health Routines Screen (Story 6), Health Routine Logging (Story 7), Streak Calculation (Story 8), and Dashboard Health Aggregation (Story 10).

## Acceptance Tests

**Test 1: Create a routine with target frequency and metrics**
Steps: Create a routine named "Morning Run" with target frequency of 3 per week and tracked metrics of duration and distance.
Expected Result: The routine is persisted in IndexedDB with name, frequency (3/week), and two tracked metrics. Created and updated timestamps are populated.

**Test 2: Create a log entry for a routine**
Steps: Create a routine. Create a log entry for today's date referencing that routine, with duration value of 30 minutes and distance value of 5 km.
Expected Result: The log entry is persisted with the correct routine ID, date, and metric values.

**Test 3: Read log entries filtered by routine and date range**
Steps: Create two routines. Log entries for both over a two-week span. Query log entries for only the first routine within the last seven days.
Expected Result: Only log entries matching the specified routine and date range are returned.

**Test 4: Delete a routine cascades to log entries**
Steps: Create a routine. Create three log entries for that routine. Delete the routine.
Expected Result: The routine and all three associated log entries are removed from IndexedDB.

**Test 5: Reject invalid log entry dates**
Steps: Attempt to create a log entry with a date in the future.
Expected Result: The operation is rejected with a meaningful error. No log entry is persisted.

**Test 6: Create a routine with no tracked metrics**
Steps: Create a routine named "Meditation" with target frequency of 7 per week and no tracked metrics.
Expected Result: The routine is persisted successfully. Log entries for this routine need only a date with no metric values.

## Implementation Context

The two-entity model (routine definitions and log entries) means the IndexedDB store needs to support both record types or use two separate stores. Log entries are the higher-volume entity; a user logging routines daily for months will accumulate many entries. Indexing by routine ID and by date will be important for the streak calculation (Story 8) and dashboard aggregation (Story 10) queries. The cascade delete on routine removal simplifies data integrity at the cost of being irreversible.
