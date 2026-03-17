---
title: "Expense Table with Daily Grouping"
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

The Daily Budget Tracker's expense table is the primary way the user reviews their spending history within a month. Expenses are grouped by date, and each date row provides a snapshot: how much was budgeted for that day, how much was actually spent, and the running balance through that day. This grouping lets the user quickly scan for days where they overspent and see how that affected subsequent days.

This story builds the expense table that sits below the balance header on the budget screen (Story 3). It reads from the expense data model (Story 2) and uses the budget month configuration (Story 1) for the daily budget figure. The table only shows data for the currently selected month (the month selector is built in Story 7, but the table should accept a month parameter from the start).

## Feature Requirements / Functional Behavior

**UI Behavior**

- The expense table appears on the budget screen below the balance header.
- Expenses are grouped by date, with the most recent date at the top.
- Each date group header displays: the date, the daily budget amount, the total spent that day, and the running balance through that date.
- The running balance for a date group reflects the cumulative budget through that day minus cumulative expenses through that day, plus carry-over and additional funds.
- Within each date group, individual expense rows display: vendor, amount, category (if present), and description (if present).
- Date groups with multiple expenses are expandable and collapsible. Tapping the date header toggles visibility of the individual expense rows beneath it.
- Date groups with a single expense may show the expense details inline with the header or as a single expandable row (consistent with multi-expense behavior).
- If no expenses exist for the current month, the table area displays an empty state message.

**Business Rules**

- Daily budget is the same value for every day in the month (monthly amount divided by days in month).
- Daily total is the sum of all expense amounts for that date.
- Running balance for a given date is: (daily allowance multiplied by the day number in the month) plus carry-over plus additional funds, minus total expenses from day 1 through that date.
- Running balance for dates in the past uses the same formula. There is no distinction between past and future daily budgets; the cumulative allowance accrues day by day.
- All displayed monetary values are rounded to two decimal places.

## Acceptance Tests

**Test 1: Expenses Grouped by Date**
Steps: Create expenses on March 15, March 16, and March 17. Navigate to the budget screen.
Expected Result: Three date groups appear, ordered March 17 (top), March 16, March 15 (bottom). Each group header shows the date and its daily budget, daily total, and running balance.

**Test 2: Running Balance Calculation Across Days**
Steps: Budget month with daily allowance 100.00, carry-over 0.00, additional funds 0.00. Expenses: March 1 = 80.00, March 2 = 120.00, March 3 = 50.00.
Expected Result: March 1 running balance = 20.00 (100 - 80). March 2 running balance = 0.00 (200 - 200). March 3 running balance = 50.00 (300 - 250).

**Test 3: Expandable Date Group**
Steps: Create three expenses on the same date. View the expense table.
Expected Result: The date group header shows the combined daily total. Tapping the header expands to reveal three individual expense rows with vendor, amount, category, and description for each.

**Test 4: Empty State**
Steps: Navigate to the budget screen for a month with no expenses.
Expected Result: The expense table area displays an empty state message indicating no expenses have been recorded.

**Test 5: Running Balance Includes Carry-Over and Additional Funds**
Steps: Budget month with daily allowance 100.00, carry-over 50.00, additional funds 25.00. One expense on March 1 for 60.00.
Expected Result: March 1 running balance = 115.00 (100 + 50 + 25 - 60).

## Implementation Context

The table is read-only in this story. Story 6 adds tap-to-edit behavior to individual expense rows. The table must accept a month parameter so that Story 7 (Month Selector) can switch the displayed data. Consider performance: even a heavy spending month is unlikely to exceed a few hundred expense records, so client-side grouping and sorting should be performant without pagination. The running balance calculation mirrors the balance display formula from Story 3 but computed per-day rather than as a single current value.
