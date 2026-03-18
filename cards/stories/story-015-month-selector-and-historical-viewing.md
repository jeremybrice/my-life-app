---
title: "Month Selector and Historical Viewing"
type: story
status: Draft
product: My Life App
module: Budget
client: null
team: null
parent: budget-module
story_points: null
jira_card: null
source_conversation: null
created: 2026-03-17
updated: 2026-03-17
---

## Background / Context

The Daily Budget Tracker includes a month selector that lets the user review any previous month's spending. Historical viewing is important for understanding spending trends, verifying carry-over amounts, and reconciling past records. Without this capability, the budget screen would only ever show the current month, and the user would lose visibility into their financial history.

This story adds a month selection control to the budget screen and wires the entire screen's data context (balance header, expense table, running balances) to the selected month. When the user changes months, all displayed data must update to reflect the selected month's configuration and expenses.

## Feature Requirements / Functional Behavior

**UI Behavior**

- A month selector control appears on the budget screen, displaying the currently selected month and year (e.g., "March 2026").
- The selector defaults to the current calendar month on initial load.
- The user can navigate to previous or next months using the selector. Navigation may be implemented as left/right arrows, a dropdown, a swipe gesture, or any intuitive pattern.
- When the selected month changes, the balance header, expense table, daily groupings, running balances, and all displayed values update to reflect the selected month's data.
- If the user navigates to a month with no budget month record, the screen displays the same setup prompt as when no current month is configured (per Story 3).
- The selector should indicate which months have existing data, or limit navigation to months that have been initialized, to prevent confusion from navigating to empty future months.

**Business Rules**

- The budget screen always operates in the context of a single selected month. All balance calculations, expense lists, and daily groupings are scoped to the selected month.
- Switching months does not create or modify any data. It is a read-only navigation action.
- The current month remains the default when the user first navigates to the budget screen or returns to it from another tab.

## Acceptance Tests

**Test 1: Default to Current Month**
Steps: Navigate to the budget screen. Observe the month selector.
Expected Result: The selector displays the current calendar month and year. The budget data shown corresponds to the current month.

**Test 2: Navigate to Previous Month**
Steps: Budget months exist for February 2026 and March 2026 with different expenses. From March, navigate to February using the month selector.
Expected Result: The balance header shows February's balance. The expense table shows February's expenses grouped by date with February's daily budget and running balances.

**Test 3: Navigate to Month with No Data**
Steps: Navigate to a future month that has no budget month record.
Expected Result: The screen displays a setup prompt or message indicating no budget is configured for that month.

**Test 4: Return to Budget Screen Defaults to Current Month**
Steps: Select February 2026 in the month selector. Navigate away to a different app screen (e.g., Dashboard). Navigate back to the budget screen.
Expected Result: The budget screen shows the current calendar month, not February.

**Test 5: Expense Added Reflects in Correct Month Context**
Steps: Navigate to the current month. Add an expense. Navigate to the previous month. Verify the expense does not appear. Navigate back to the current month.
Expected Result: The expense appears only in the current month's expense table. The previous month's data is unchanged.

## Implementation Context

The month selector must pass the selected month identifier to the balance display (Story 3), expense table (Story 5), and summary reports (Story 10). All these components should already accept a month parameter by design. The selector state is transient (not persisted); it resets to the current month on screen re-entry. Consider the UX of the selector: sequential arrow navigation works well for adjacent months, but if the user has many months of history, a dropdown or scrollable list may be more efficient.
