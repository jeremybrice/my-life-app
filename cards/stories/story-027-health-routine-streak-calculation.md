---
title: "Health Routine Streak Calculation"
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

Streak tracking is a core motivational mechanism for habit formation. When a user sees that they have maintained their running routine for 8 consecutive weeks, that number itself becomes motivation to continue. Breaking a streak has real psychological weight, which is what makes it effective. The Epic scope specifies streak tracking for consecutive periods meeting target frequency with resets on missed periods. Since v1 uses weekly frequency targets, streaks are calculated in consecutive weeks.

This story computes streak values from the log entries created in Story 7, surfaces them on the Health Routines Screen (Story 6), and feeds into the Dashboard Health Widget (Story 10).

## Feature Requirements / Functional Behavior

**Business Rules**

- A streak counts the number of consecutive completed weeks where the user logged at least as many entries as the routine's target frequency.
- Weeks run Monday through Sunday.
- The current week counts toward the streak only if the target has already been met. If the current week is in progress and the target is not yet met, the streak reflects the count through the most recent fully completed week.
- If the most recently completed week did not meet the target, the streak is zero regardless of prior history.
- A new routine with no log history has a streak of zero.
- Back-dated log entries may retroactively affect streak calculations. If a user back-logs entries that fill a previously missed week, the streak should recalculate accordingly.
- Streak values are calculated on demand from log entry data rather than stored as a separate counter. This ensures accuracy when log entries are added, edited, or deleted.

**UI Behavior**

- The streak value appears on each routine's entry in the Health Routines Screen (Story 6), displayed as a count of consecutive weeks (e.g., "8 week streak").
- A routine with a zero streak shows no streak indicator or a neutral zero state rather than a discouraging message.
- The streak value updates whenever the user returns to or refreshes the routines screen.

## Acceptance Tests

**Test 1: Calculate a multi-week streak**
Steps: Define a routine with target of 3x/week. Create log entries meeting the target for three consecutive completed weeks (9+ entries spread across 3 weeks). Navigate to the routines screen.
Expected Result: The routine displays a streak of 3 weeks.

**Test 2: Streak resets on a missed week**
Steps: Define a routine with target 3x/week. Log entries meeting the target for weeks 1, 2, and 3. Log only 1 entry in week 4 (below target). Log entries meeting the target in week 5. Navigate to the routines screen after week 5 completes.
Expected Result: The streak is 1 (only week 5), not 4. The missed week 4 broke the chain.

**Test 3: Current week in progress does not inflate streak**
Steps: Define a routine with target 3x/week. Meet the target for the past 2 completed weeks. The current week has 1 of 3 logged. Navigate to the routines screen.
Expected Result: The streak shows 2 (the two completed weeks). The in-progress current week does not add to the streak.

**Test 4: Current week meeting target counts**
Steps: Define a routine with target 3x/week. Meet the target for the past 2 completed weeks. Log 3 entries in the current week (target met). Navigate to the routines screen.
Expected Result: The streak shows 3 (two completed weeks plus the current week that has already met its target).

**Test 5: New routine has zero streak**
Steps: Define a new routine. Navigate to the routines screen before logging any entries.
Expected Result: The routine shows a streak of 0 or no streak indicator.

**Test 6: Back-dated entry recalculates streak**
Steps: Define a routine with target 2x/week. Meet the target for weeks 1 and 3, but week 2 has only 1 entry (breaking the streak). Back-date a log entry to fill week 2 to 2 entries. Navigate to the routines screen.
Expected Result: The streak recalculates to reflect 3 consecutive weeks now that week 2 meets the target.

## Implementation Context

The streak calculation iterates backward from the current week through historical weeks, checking whether each week's log entry count meets the target. The iteration stops at the first week that does not meet the target. This is a read-heavy computation that queries log entries grouped by week. For a user with months of history, the query should be efficient. Consider whether to compute streaks on every screen load or to cache the result and invalidate on new log entries. The on-demand approach is simpler and acceptable for v1 data volumes. The streak value is consumed by both the routines screen (Story 6) and the dashboard health widget (Story 10).
