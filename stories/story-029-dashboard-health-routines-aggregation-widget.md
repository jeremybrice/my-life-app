---
title: "Dashboard Health Routines Aggregation Widget"
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

The dashboard's health aggregation slot, like the goals slot, was established as a placeholder in Epic 1 awaiting live data. With the health routine data model (Story 5), logging interface (Story 7), and streak calculation (Story 8) in place, this story connects the dashboard to real health routine data. The health widget should give the user a daily pulse on their routine adherence: what they have done today, how the week is going, and how strong their streaks are.

## Feature Requirements / Functional Behavior

**UI Behavior**

- The dashboard health widget replaces the placeholder content from Epic 1 with live data sourced from the health routines and log entries in IndexedDB.
- The widget displays how many routines the user has completed today out of how many are defined (e.g., "2 of 4 routines today").
- The widget displays a weekly adherence summary showing how many routines are on track to meet their weekly target versus how many are behind.
- The widget displays the longest current streak across all routines as a highlight (e.g., "Best streak: 12 weeks (Morning Run)").
- The widget provides a quick navigation action to the full health routines screen.
- If no routines are defined, the widget displays a zero state encouraging the user to define their first routine, with a path to the health routines screen.
- The widget refreshes its data whenever the dashboard screen is loaded or returned to.

**Business Rules**

- "Completed today" counts the number of distinct routines that have at least one log entry for today's date. A routine logged twice today still counts as one routine completed.
- Weekly adherence classifies each routine as "on track" (log entries this week are at or above the target, or are on pace to meet the target given remaining days) or "behind" (log entries this week are below the pace needed to meet the target in remaining days).
- The "best streak" value is the highest streak among all defined routines, calculated using the streak logic from Story 8. If multiple routines share the same highest streak, display any one of them.
- If no routines have any log entries, the widget shows zero counts and no streak highlight.

## Acceptance Tests

**Test 1: Display today's routine completions**
Steps: Define 3 routines. Log entries for 2 of them today. Navigate to the dashboard.
Expected Result: The health widget shows "2 of 3 routines today."

**Test 2: Display weekly adherence summary**
Steps: Define routine A (target 3x/week, 3 logged this week) and routine B (target 5x/week, 1 logged this week with 2 days remaining). Navigate to the dashboard.
Expected Result: Routine A is classified as "on track." Routine B is classified as "behind" (needs 4 more in 2 days, which is behind pace). The widget reflects one routine on track and one behind.

**Test 3: Display best streak**
Steps: Define two routines. Routine A has a streak of 5 weeks. Routine B has a streak of 2 weeks. Navigate to the dashboard.
Expected Result: The widget highlights "5 weeks" as the best streak, attributed to routine A.

**Test 4: Zero state when no routines defined**
Steps: Ensure no health routines exist. Navigate to the dashboard.
Expected Result: The health widget shows a zero state message encouraging routine creation, with a path to the health routines screen.

**Test 5: Navigate to health routines screen**
Steps: Navigate to the dashboard. Activate the navigation action on the health widget.
Expected Result: The user is taken to the full health routines screen (Story 6).

**Test 6: Same routine logged twice today counts once**
Steps: Define 1 routine. Log it twice today. Navigate to the dashboard.
Expected Result: The widget shows "1 of 1 routines today," not "2 of 1."

## Implementation Context

This widget depends on the streak calculation from Story 8, log entry data from Story 5, and the dashboard slot interface from Epic 1. The "on track" vs. "behind" classification for weekly adherence requires a pace calculation: (target frequency minus entries logged this week) compared to remaining days in the week. This is a heuristic; a routine needing 3 more entries with 1 day left is behind, while needing 1 more entry with 3 days left is on track. The threshold for "on track" vs. "behind" should feel fair and not overly aggressive. Defining the week as Monday through Sunday keeps consistency with the streak calculation in Story 8.
