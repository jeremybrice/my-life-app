---
title: "Goal Creation Form"
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

Creating a goal is the first meaningful action a user takes in the Goals module. The form must balance flexibility (supporting four goal types and four progress models) with simplicity (not overwhelming the user with irrelevant fields). Because different progress models require different inputs, the form needs to adapt dynamically based on the user's selections. A numeric target goal needs a target value; a date-based goal needs a target date; a percentage goal needs no additional initial input beyond the starting percentage; a freeform goal needs an initial status label.

This form writes to IndexedDB through the CRUD operations established in Story 1 and is accessed from the Goals Screen (Story 2).

## Feature Requirements / Functional Behavior

**UI Behavior**

- The form collects: goal title (required), goal type selection (financial, personal, strategic, or custom), and progress model selection (numeric target, date-based, percentage-based, or freeform status).
- When the user selects a progress model, the form reveals only the fields relevant to that model. Numeric target shows a target value field and an optional starting value field (defaults to 0). Date-based shows a target date picker. Percentage-based shows an optional starting percentage (defaults to 0). Freeform shows an initial status label field.
- The form includes an optional description/notes field for any additional context the user wants to record.
- A submit action validates required fields and persists the goal. On success, the user is returned to the goals screen where the new goal appears.
- A cancel action discards the form and returns to the goals screen without creating a goal.
- Validation messages appear inline near the field with the issue.

**Business Rules**

- Title is required and must not be blank after trimming whitespace.
- Type is required. One of the four options must be selected.
- Progress model is required. One of the four options must be selected.
- For numeric target goals, the target value must be a positive number. Starting value must be zero or a positive number less than or equal to the target value.
- For date-based goals, the target date must be today or a future date.
- For percentage-based goals, the starting percentage must be between 0 and 100 inclusive.
- For freeform goals, an initial status label is required and must not be blank.
- New goals are always created with "active" status. The user cannot set initial status to completed or archived at creation time.

## Acceptance Tests

**Test 1: Create a numeric target goal successfully**
Steps: Open the goal creation form. Enter title "Save $10,000." Select type "financial." Select progress model "numeric target." Enter target value 10000. Leave starting value at 0. Submit the form.
Expected Result: The goal is created and persisted in IndexedDB. The user is returned to the goals screen where the new goal appears with title "Save $10,000," type financial, and progress showing "0 / 10,000."

**Test 2: Form adapts fields to progress model selection**
Steps: Open the form. Select progress model "numeric target" and observe available fields. Switch to "date-based" and observe. Switch to "freeform" and observe.
Expected Result: Numeric target shows target value and starting value fields. Date-based shows a date picker. Freeform shows a status label field. Fields from previously selected models are not visible.

**Test 3: Validation prevents incomplete submission**
Steps: Attempt to submit the form with a blank title. Attempt to submit with no type selected. Attempt to submit with no progress model selected. Attempt to submit a numeric target goal with target value of 0 or negative.
Expected Result: Each attempt shows an inline validation message near the relevant field. The form does not submit and no goal is created.

**Test 4: Cancel discards the form**
Steps: Open the form. Enter a title and select a type. Press cancel.
Expected Result: The user returns to the goals screen. No new goal is created in IndexedDB.

**Test 5: Create a date-based goal with a past date rejected**
Steps: Open the form. Enter title "Complete marathon." Select type "personal." Select progress model "date-based." Enter a date in the past. Submit.
Expected Result: Validation rejects the past date with an inline message. The goal is not created.

**Test 6: Create a freeform goal successfully**
Steps: Open the form. Enter title "Write a novel." Select type "personal." Select progress model "freeform." Enter initial status label "Brainstorming." Submit.
Expected Result: The goal is created with status label "Brainstorming." It appears on the goals screen with the freeform status displayed.

## Implementation Context

This form is the primary manual entry path for goals. The AI Agent (Epic 4) may also create goals conversationally, writing to the same data store through the same CRUD operations. The form's validation rules should be consistent with any validation applied at the data layer in Story 1 to avoid conflicting rules between manual and agent-driven creation.
