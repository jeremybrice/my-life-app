---
title: "Goal Data Model and CRUD Operations"
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

The parent Initiative positions My Life App as a "daily operating system for personal life," and the Goals module is one of two capabilities (alongside Health Routines) that expand the app beyond budgeting. During intake, the founder emphasized supporting "any type of goal," which means the data model must be flexible enough to handle financial targets, personal milestones, strategic objectives, and custom goals without imposing a rigid schema on what a goal can be.

The PWA Shell Epic (Epic 1) establishes the IndexedDB schema with a goals object store already provisioned. This story fills that store with a well-defined data model and the CRUD operations that all subsequent goals stories depend on. No goals screen, form, or dashboard integration can proceed without a working data layer.

## Feature Requirements / Functional Behavior

**Business Rules**

- Every goal must have a title and a type. Supported types are financial, personal, strategic, and custom.
- Each goal selects one progress model that determines how progress is tracked. Supported progress models are: numeric target (current value progressing toward a target value), date-based (tracking toward a target date), percentage-based (manual percentage updates from 0 to 100), and freeform status (user-defined status labels such as "Not Started," "In Progress," "Done").
- A goal has one of three statuses: active, completed, or archived. New goals default to active status.
- Goals must record created and updated timestamps. The updated timestamp refreshes on any modification.
- Deleting a goal permanently removes it from IndexedDB. There is no soft delete or trash concept in v1.
- Goal titles are required and must not be empty. All other fields beyond title, type, and progress model are optional depending on the selected progress model.

**UI Behavior**

- This story is a data layer story. There is no direct UI deliverable. The CRUD operations expose an interface that subsequent stories (Goals Screen, Goal Creation Form, Goal Progress Update) consume.

## Acceptance Tests

**Test 1: Create a goal with numeric target progress model**
Steps: Call the create goal operation with title "Save $5,000," type "financial," progress model "numeric," target value 5000, and current value 0.
Expected Result: A new goal record is persisted in IndexedDB with all provided fields, status defaulting to "active," and both created and updated timestamps populated with the current date/time.

**Test 2: Read goals filtered by type**
Steps: Create three goals: one financial, one personal, one strategic. Query goals filtered by type "financial."
Expected Result: Only the financial goal is returned. Querying with no filter returns all three goals.

**Test 3: Update a goal's current value**
Steps: Create a numeric target goal with current value 0 and target value 100. Update the current value to 50.
Expected Result: The goal record reflects current value 50. The updated timestamp is more recent than the created timestamp.

**Test 4: Delete a goal**
Steps: Create a goal and note its ID. Delete the goal by ID. Attempt to read the goal by ID.
Expected Result: The delete operation succeeds. The subsequent read returns no record.

**Test 5: Reject goal creation with missing required fields**
Steps: Attempt to create a goal with an empty title. Attempt to create a goal with no type. Attempt to create a goal with no progress model.
Expected Result: Each attempt is rejected with a meaningful error. No partial record is persisted to IndexedDB.

**Test 6: Create a freeform status goal**
Steps: Create a goal with title "Learn Spanish," type "personal," progress model "freeform," and initial status label "Not Started."
Expected Result: The goal is persisted with the freeform progress model and the provided status label. No numeric target or percentage fields are required or stored.

## Implementation Context

The IndexedDB goals object store is provisioned by Epic 1 (PWA Shell, Dashboard & Settings). This story populates and operates against that store. The data model defined here becomes the contract that the Goal Creation Form (Story 3), Goal Progress Update (Story 4), Goals Screen (Story 2), and Dashboard Goals Aggregation (Story 9) all depend on. Consider how the progress model type affects which fields are relevant; numeric goals need target and current values, date-based goals need a target date, percentage goals need a percentage value, and freeform goals need a status label string. The model should cleanly handle this variation without requiring all fields on every goal.
