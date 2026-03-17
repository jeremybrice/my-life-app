---
title: Budget Module
type: epic
status: Planning
product: My Life App
module: Budget
client: null
team: null
jira_card: null
parent: null
children:
- story-009-budget-month-data-model-and-crud-operations.md
- story-010-expense-data-model-and-crud-operations.md
- story-011-budget-screen-layout-and-balance-display.md
- story-012-expense-entry-form.md
- story-013-expense-table-with-daily-grouping.md
- story-014-expense-edit-and-delete.md
- story-015-month-selector-and-historical-viewing.md
- story-016-carry-over-and-monthly-chaining-logic.md
- story-017-additional-funds-management.md
- story-018-summary-reports-category-and-vendor-breakdown.md
- story-019-dashboard-budget-cards-integration.md
description: Full-featured budget tracking module ported from the Daily Budget Tracker.
  Monthly budget divided into daily amounts, color-coded balances, carry-over between
  months, additional funds, expense entry with categorization, month selector, summary
  reports, and monthly chaining.
source_intake: null
source_conversation: null
created: 2026-03-17
updated: '2026-03-17'
---

## Background/Context

This Epic ports the proven Daily Budget Tracker into the My Life App as an integrated module. The Daily Budget Tracker is a standalone application already built and used by the founder, providing a validated UX pattern and a working blueprint for the data model and interaction design. This prior art significantly de-risks the largest functional module in the application.

The parent Initiative identifies this as the highest-fidelity requirement in the build. The budget module represents the core daily-use feature of the app. Every day, the user opens the app, checks their balance, and logs expenses. The data model must support both standalone budget operations and dashboard aggregation, and it must be compatible with the AI agent's write path (Epic 4) so that conversational expense entry produces identical data to manual form entry.

## Epic Scope

This Epic delivers the complete Budget screen with full feature parity to the Daily Budget Tracker. The scope includes: monthly budget configuration divided into daily allowances, real-time current balance with green/red color coding, carry-over logic from previous months, additional funds support (bonuses, gifts, refunds), expense entry with date, category, vendor (20 character limit), amount, and description fields, a month selector for viewing historical months, summary reports broken down by category and by vendor, and monthly chaining where each month's leftover balance becomes the next month's starting balance.

This Epic also wires the dashboard budget summary card and monthly performance card (built as shells in Epic 1) to live budget data.

## Affected Systems

- Local Device Storage (IndexedDB budget months and expenses object stores)
- Browser PWA Runtime (UI rendering for budget screen, expense forms, and summary reports)

## Functional Capabilities

- **Monthly Budget Configuration**: The user sets a monthly budget amount. The app divides this by the number of days in the month to calculate a daily allowance. The user can alternatively set a daily amount and have the monthly total calculated.

- **Real-Time Balance with Color Coding**: The budget screen displays the current balance prominently. Green indicates positive balance (on track or ahead). Red indicates negative balance (overspending). The balance updates immediately when expenses are added, edited, or deleted.

- **Carry-Over Between Months**: When a new month begins, the previous month's remaining balance (positive or negative) carries forward as the new month's starting adjustment.

- **Additional Funds**: The user can add extra funds to any month (e.g., a bonus or gift). Additional funds increase the available balance without changing the base monthly budget.

- **Expense Entry**: The user creates expense entries with date (defaults to today), category (selectable or freeform), vendor (required, 20 character limit), amount (required, numeric), and description (optional).

- **Expense Editing and Deletion**: The user can tap any existing expense to edit its fields or delete it entirely. Balance and summaries recalculate immediately.

- **Month Selector**: A month selector control allows the user to navigate between months. Selecting a different month updates all displayed data.

- **Expense Table with Daily Grouping**: Expenses are displayed in a table grouped by date. Each date row shows daily budget, daily expenses total, and running balance.

- **Summary Reports by Category and Vendor**: A summary view shows total spending broken down by category and by vendor for the selected month.

- **Monthly Chaining**: When the user navigates to a new month for the first time, the app initializes that month by copying the previous month's budget configuration and calculating carry-over.

- **Dashboard Integration**: The daily budget summary card shows today's balance (color-coded) and today's spending. The monthly performance card shows the month's total budget, total spent, and net change.

## Suggested Story Breakdown

1. Budget Month Data Model and CRUD Operations
2. Expense Data Model and CRUD Operations
3. Budget Screen Layout and Balance Display
4. Expense Entry Form
5. Expense Table with Daily Grouping
6. Expense Edit and Delete
7. Month Selector and Historical Viewing
8. Carry-Over and Monthly Chaining Logic
9. Additional Funds Management
10. Summary Reports (Category and Vendor Breakdown)
11. Dashboard Budget Cards Integration

## Success Criteria

- The user can set a monthly budget, and the app correctly calculates the daily allowance based on days in the month.
- Current balance displays in green when positive and red when negative, updating in real time as expenses are added or modified.
- Expenses can be created, edited, and deleted with all required fields enforced (vendor, amount).
- Navigating between months loads the correct budget configuration and expense history for each month.
- Carry-over from the previous month's final balance is automatically applied when a new month is initialized.
- Summary reports accurately reflect total spending by category and by vendor for the selected month.
- The dashboard budget summary card and monthly performance card display correct, current data from the budget module.

## Dependencies

- Depends on Epic 1 (PWA Shell, Dashboard & Settings) for IndexedDB schema, settings screen budget configuration, and dashboard card shell components.
- Epic 4 (AI Agent Integration) depends on this Epic's data model and write operations.

## Technical Constraints

- The expense data model must expose a clean write interface that the AI agent (Epic 4) can call to create expense entries programmatically.
- Vendor field is hard-limited to 20 characters per the proven UX from the Daily Budget Tracker.
- All budget calculations must handle floating-point currency values correctly (rounding to two decimal places).

## Open Questions

- How is the very first budget month initialized? Starting balance or zero?
- Should category selection be a fixed list, user-defined, or freeform text entry?





