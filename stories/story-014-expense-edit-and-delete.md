---
title: "Expense Edit and Delete"
type: story
status: Draft
product: My Life App
module: Budget
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

Mistakes happen. The user enters the wrong amount, selects the wrong date, or realizes they logged a refunded expense. The Daily Budget Tracker allows editing and deleting any expense, and the balance recalculates instantly. This is essential for maintaining trust in the displayed balance; if the user cannot correct errors, they lose confidence in the numbers and stop using the tool.

This story adds interactivity to the expense table rows built in Story 5. Tapping an expense opens it for editing with the same field controls used in the entry form (Story 4). A delete action removes the expense entirely. Both operations trigger immediate balance recalculation through the expense CRUD layer (Story 2).

## Feature Requirements / Functional Behavior

**UI Behavior**

- Tapping an individual expense row in the expense table opens an edit view for that expense.
- The edit view pre-populates all fields with the expense's current values: date, category, vendor, amount, and description.
- The edit view provides a save action and a delete action. Save persists field changes. Delete removes the expense entirely.
- The same validation rules from the expense entry form apply: vendor is required and limited to 20 characters, amount is required and must be greater than zero.
- After saving or deleting, the user is returned to the expense table. The table, daily totals, running balances, and the header balance all reflect the changes immediately.
- Delete requires a confirmation step before execution. The user must confirm they want to delete the expense to prevent accidental data loss.

**Business Rules**

- Editing an expense's date may move it to a different date group in the table. If the date changes to a different budget month, the expense moves to that month and both months' balances recalculate.
- Deleting an expense removes it permanently. There is no undo or trash/recycle mechanism.
- Balance recalculation after edit or delete follows the same formula used in the balance display (Story 3) and expense table running balances (Story 5).

## Acceptance Tests

**Test 1: Edit Expense Amount**
Steps: Create an expense for 25.00 at vendor "Amazon". Tap the expense row. Change amount to 30.00. Save.
Expected Result: The expense row shows 30.00. The daily total for that date increases by 5.00. The running balance and header balance decrease by 5.00.

**Test 2: Delete Expense with Confirmation**
Steps: Create an expense for 15.00. Tap the expense row. Tap delete. A confirmation prompt appears. Confirm deletion.
Expected Result: The expense is removed from the table. The daily total decreases by 15.00. The running balance and header balance increase by 15.00.

**Test 3: Cancel Delete Does Not Remove Expense**
Steps: Create an expense. Tap the expense row. Tap delete. A confirmation prompt appears. Cancel the deletion.
Expected Result: The expense remains in the table unchanged.

**Test 4: Validation on Edit**
Steps: Open an expense for editing. Clear the vendor field. Attempt to save.
Expected Result: The save is rejected with a validation message indicating vendor is required. The original expense data is unchanged.

**Test 5: Edit Date Moves Expense Between Date Groups**
Steps: Create an expense on March 15. Edit the expense and change the date to March 16.
Expected Result: The expense no longer appears under March 15's group. It appears under March 16's group. Both dates' daily totals and running balances recalculate.

## Implementation Context

The edit view may reuse the same form component as the expense entry form (Story 4), pre-populated with existing values and augmented with a delete action. The delete confirmation should be a simple dialog or action sheet, not a full-screen flow. The expense CRUD layer (Story 2) already handles balance recalculation on update and delete, so this story focuses on the UI interaction pattern and wiring. Consider accessibility: the tap target for expense rows should be large enough for comfortable mobile interaction.
