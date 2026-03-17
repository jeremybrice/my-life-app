---
title: "Dashboard Goals Aggregation Widget"
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

The main dashboard is the user's daily landing page and the central motivational hub of My Life App. Epic 1 established a goals aggregation slot on the dashboard as a placeholder awaiting live data. Now that the goals data model and full CRUD lifecycle exist (Stories 1 through 4), this story connects the dashboard to real goal data. The user should see at a glance how many goals they are actively pursuing, how many they have completed, and a sense of overall progress without navigating to the full goals screen.

## Feature Requirements / Functional Behavior

**UI Behavior**

- The dashboard goals widget replaces the placeholder content from Epic 1 with live data sourced from the goals IndexedDB store.
- The widget displays the count of active goals and the count of completed goals.
- The widget displays an overall progress summary. For goals with numeric or percentage progress models, an aggregate progress indicator (e.g., average completion percentage across active goals) provides a sense of momentum.
- The widget provides a quick navigation action to the full goals screen.
- If no goals exist, the widget displays a zero state encouraging the user to create their first goal, with a path to the goal creation form.
- The widget refreshes its data whenever the dashboard screen is loaded or returned to.

**Business Rules**

- Archived goals are excluded from all dashboard counts and progress calculations.
- Active goals count includes only goals with "active" status. Completed goals count includes only goals with "completed" status.
- The aggregate progress indicator considers only active goals that have a calculable progress (numeric and percentage models). Date-based and freeform goals are excluded from the aggregate progress calculation but are included in the active count.
- If all active goals are freeform or date-based (no calculable progress), the aggregate progress indicator is not displayed.

## Acceptance Tests

**Test 1: Display active and completed counts**
Steps: Create 3 active goals and 2 completed goals. Navigate to the dashboard.
Expected Result: The goals widget shows "3 active" and "2 completed."

**Test 2: Archived goals excluded**
Steps: Create 2 active goals and 1 archived goal. Navigate to the dashboard.
Expected Result: The widget shows "2 active" and "0 completed." The archived goal is not counted anywhere in the widget.

**Test 3: Aggregate progress calculation**
Steps: Create two active numeric target goals. Goal A: target 100, current 50 (50% complete). Goal B: target 200, current 100 (50% complete). Navigate to the dashboard.
Expected Result: The aggregate progress indicator reflects approximately 50% average progress across the two calculable goals.

**Test 4: Zero state when no goals exist**
Steps: Ensure no goals exist. Navigate to the dashboard.
Expected Result: The goals widget displays a zero state with an encouraging message and a path to create the first goal.

**Test 5: Navigate to goals screen from widget**
Steps: Navigate to the dashboard. Activate the navigation action on the goals widget.
Expected Result: The user is taken to the full goals screen (Story 2).

## Implementation Context

The dashboard aggregation slot interface was established in Epic 1's "Dashboard Aggregation Slots for Goals and Health" story. This story wires that slot to live data. The data queries are straightforward reads from the goals store with filtering by status. The aggregate progress calculation involves reading active goals, filtering to those with numeric or percentage models, computing individual completion percentages, and averaging them. This should be a lightweight computation for the expected data volume in v1.
