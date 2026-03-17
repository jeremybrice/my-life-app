---
title: "Goals Screen Layout and List View"
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

The Goals screen is one of the six primary screens in My Life App, accessible from the persistent app navigation established in Epic 1. This screen is the user's primary interface for viewing and managing all of their goals across types and statuses. The founder's emphasis on "any type of goal" means this screen must gracefully display goals with different progress models side by side, giving each goal a clear visual indication of where it stands without requiring the user to open each goal individually.

The screen depends on the CRUD operations from Story 1 for reading goal data and on the navigation shell from Epic 1 for placement within the app.

## Feature Requirements / Functional Behavior

**UI Behavior**

- The goals screen displays a list of all goals. Each goal entry shows the goal title, type, status, and a progress indicator appropriate to the goal's progress model.
- Numeric target goals display progress as current value out of target value (e.g., "$2,500 / $5,000") with a visual progress indicator.
- Date-based goals display the target date and how many days remain.
- Percentage-based goals display the current percentage with a visual progress indicator.
- Freeform status goals display the current status label.
- The screen provides filter controls for type (financial, personal, strategic, custom, or all) and status (active, completed, archived, or all). Filters can be combined.
- When no goals exist, the screen displays an empty state message encouraging the user to create their first goal.
- Completed goals are visually distinguishable from active goals (e.g., muted styling or a completion indicator).
- Archived goals are only visible when the "archived" status filter is explicitly selected. They are hidden by default.
- The screen provides a way to navigate to goal creation (Story 3).

**Business Rules**

- The default view shows active goals across all types. The user must explicitly filter to see completed or archived goals.
- Goals are sorted by most recently updated within each status group, with active goals appearing first when viewing all statuses together.
- Filter selections do not persist across screen navigations. Returning to the goals screen resets to the default view.

## Acceptance Tests

**Test 1: Display goals with mixed progress models**
Steps: Create one numeric target goal, one date-based goal, one percentage goal, and one freeform goal, all with active status. Navigate to the goals screen.
Expected Result: All four goals appear in the list. Each goal displays a progress indicator matching its progress model type. All required information (title, type, progress) is visible without opening the goal.

**Test 2: Filter by type**
Steps: Create goals of types financial, personal, and strategic. Navigate to the goals screen. Select the "financial" type filter.
Expected Result: Only the financial goal is visible. Selecting "all" restores all goals to the view.

**Test 3: Filter by status**
Steps: Create one active goal, one completed goal, and one archived goal. Navigate to the goals screen.
Expected Result: Only the active goal appears by default. Selecting the "completed" status filter shows only the completed goal. Selecting the "archived" filter shows only the archived goal.

**Test 4: Empty state**
Steps: Ensure no goals exist in IndexedDB. Navigate to the goals screen.
Expected Result: The screen displays an empty state message and provides a clear path to create a new goal.

**Test 5: Combined filters**
Steps: Create a financial active goal, a financial completed goal, and a personal active goal. Set type filter to "financial" and status filter to "completed."
Expected Result: Only the financial completed goal is visible.

## Implementation Context

This screen reads from the goal data model established in Story 1. The navigation entry point (Goals tab) is established in Epic 1's app shell. Consider that the number of goals could grow over time; the list should handle dozens of goals without performance degradation. The screen should also provide an entry point to the Goal Creation Form (Story 3), typically through a prominent create/add action.
