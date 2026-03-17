---
title: Goals & Health Routines
type: epic
status: Planning
product: My Life App
module: Goals & Health
client: null
team: null
jira_card: null
parent: null
children:
- story-020-goal-data-model-and-crud-operations.md
- story-021-goals-screen-layout-and-list-view.md
- story-022-goal-creation-form.md
- story-023-goal-progress-update-and-completion.md
- story-024-health-routine-data-model-and-crud-operations.md
- story-025-health-routines-screen-layout.md
- story-026-health-routine-logging-and-metrics-entry.md
- story-027-health-routine-streak-calculation.md
- story-028-dashboard-goals-aggregation-widget.md
- story-029-dashboard-health-routines-aggregation-widget.md
description: Goals management screen supporting arbitrary goal types (financial, personal,
  strategic) with flexible data model, and health routines screen for exercise tracking
  and health goals. Both modules aggregate status to the main dashboard.
source_intake: null
source_conversation: null
created: 2026-03-17
updated: '2026-03-17'
---

## Background/Context

This Epic introduces the two modules that expand My Life App beyond budgeting into broader personal life management. The parent Initiative envisions the app as a "daily operating system for personal life," and goals and health routines are the capabilities that fulfill that vision. Without these modules, the app is a budget tracker with a countdown; with them, it becomes the comprehensive life management tool described in the Initiative.

The founder emphasized "any type of goal" during intake, signaling that the goals data model must be flexible enough to accommodate financial targets, personal milestones, strategic objectives, and anything else without being overly prescriptive. Health routines add physical wellness tracking alongside financial and personal progress. Both modules aggregate their status to the main dashboard.

This Epic carries the most unresolved open questions from the Initiative. The goal data model attributes, health routine structure, and dashboard aggregation approach all need decisions before or during Story creation.

## Epic Scope

This Epic delivers two screens. The Goals screen allows the user to create, view, edit, and complete goals of any type. Each goal has a flexible set of attributes that can accommodate different goal shapes (date-based targets, numeric targets, percentage completion, or freeform status). The user can categorize goals by type (financial, personal, strategic, or custom) and track progress over time.

The Health Routines screen allows the user to define and track health-related activities. The structure supports both recurring routines (e.g., "run 3 times per week") and individual log entries (e.g., "ran 5K today"). Quantitative metrics such as duration, distance, reps, or weight are supported where applicable.

Both modules write to IndexedDB and expose aggregated status to the main dashboard.

## Affected Systems

- Local Device Storage (IndexedDB goals and health routines object stores)
- Browser PWA Runtime (UI rendering for goals screen, health routines screen, and dashboard aggregation)

## Functional Capabilities

- **Goal Creation and Management**: The user creates goals with a title, type (financial, personal, strategic, or custom), and a flexible progress model. Goals can be marked as active, completed, or archived.

- **Flexible Goal Progress Tracking**: Goals support multiple progress models. A numeric target goal tracks current value against a target. A date-based goal tracks progress toward a target date. A percentage-based goal allows manual progress updates. A freeform goal uses status labels.

- **Goals List and Filtering**: The goals screen displays all goals with their current status and progress. The user can filter by type and by status.

- **Health Routine Definition**: The user defines health routines with a name, target frequency (e.g., "3 times per week"), and optional metrics to track (duration, distance, reps, weight, or custom).

- **Health Routine Logging**: The user logs individual routine completions with the date, which routine was performed, and any applicable metrics.

- **Health Routine Streak and Adherence Tracking**: For recurring routines, the app tracks adherence against the target frequency. A streak counter shows consecutive periods where the user met the routine's target.

- **Dashboard Goals Aggregation**: The dashboard goals section displays a summary of goal status (active/completed counts, overall progress indicators).

- **Dashboard Health Routines Aggregation**: The dashboard health section displays routine adherence information (current streaks, routines completed today, weekly adherence).

## Suggested Story Breakdown

1. Goal Data Model and CRUD Operations
2. Goals Screen Layout and List View
3. Goal Creation Form
4. Goal Progress Update and Completion
5. Health Routine Data Model and CRUD Operations
6. Health Routines Screen Layout
7. Health Routine Logging and Metrics Entry
8. Health Routine Streak Calculation
9. Dashboard Goals Aggregation Widget
10. Dashboard Health Routines Aggregation Widget

## Success Criteria

- The user can create goals of different types and track progress using at least two distinct progress models.
- Goals can be filtered by type and status on the goals screen.
- The user can define recurring health routines with target frequencies and log completions with optional quantitative metrics.
- Streak tracking correctly calculates consecutive adherence periods and resets on missed periods.
- The dashboard displays aggregated goal status and health routine adherence sourced from live data in IndexedDB.
- All goal and health routine data persists across app sessions.

## Dependencies

- Depends on Epic 1 (PWA Shell, Dashboard & Settings) for IndexedDB object stores, app navigation, and dashboard aggregation slot components.
- Epic 4 (AI Agent Integration) may optionally write to goals and health routine data stores.
- Epic 5 (Notifications) may send alerts related to goal deadlines or routine adherence.

## Open Questions

- What specific attributes define a goal beyond title and type? Should goals support sub-goals in v1?
- Are health routines recurring schedules, one-off log entries, or both?
- How should goals and health routines aggregate on the dashboard? Simple counts, streak counters, progress bars, or color-coded indicators?





