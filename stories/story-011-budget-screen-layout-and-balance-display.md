---
title: "Budget Screen Layout and Balance Display"
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

The budget screen is the user's daily landing page within the Budget Module. The founder uses the Daily Budget Tracker every day, and the first thing they look at is the current balance. The balance communicates at a glance whether they are on track (green) or overspending (red). This visual feedback loop is the core motivational mechanic of the budget system.

This story builds the budget screen's primary layout and the balance display header. It connects to the budget month and expense data models created in Stories 1 and 2, pulling live data from IndexedDB to render the current state. The screen must feel immediate; there should be no loading delay perceptible to the user when they navigate to the budget tab.

## Feature Requirements / Functional Behavior

**UI Behavior**

- The budget screen header displays the current balance as the largest, most prominent element on the screen.
- The balance is displayed in green when positive (the user is on track or ahead of their daily budget) and in red when negative (the user has overspent relative to the cumulative daily allowance through today).
- Below or alongside the balance, the screen displays today's date, today's daily budget amount, and the total amount spent today.
- All displayed values update immediately when the underlying data changes (e.g., after an expense is added via the form or the AI agent).
- If no budget month exists for the current month, the screen displays a setup prompt directing the user to configure their monthly budget (either through settings or an inline setup flow).
- The screen layout provides a container area below the header for the expense table (Story 5) and a navigation path to summary reports (Story 10).

**Business Rules**

- Current balance is calculated as: (daily allowance multiplied by the number of days elapsed in the month, including today) plus carry-over plus additional funds, minus total expenses for the month. All values rounded to two decimal places.
- "Days elapsed" includes today. On March 17 of a 31-day month, the cumulative budget through today is daily allowance multiplied by 17.
- Today's daily budget is the daily allowance for the current month (monthly amount divided by days in the month).
- Today's spent is the sum of all expense amounts with today's date.
- The green/red threshold is exactly zero. A balance of 0.00 displays as green.

## Acceptance Tests

**Test 1: Positive Balance Displays Green**
Steps: Configure a budget month with monthly amount 3100.00 (daily allowance 100.00). On day 17, total expenses for the month are 1500.00. Navigate to the budget screen.
Expected Result: Balance displays as 200.00 in green (1700.00 cumulative budget + 0.00 carry-over + 0.00 additional funds - 1500.00 expenses). Today's daily budget shows 100.00.

**Test 2: Negative Balance Displays Red**
Steps: Same budget configuration. On day 17, total expenses for the month are 2000.00. Navigate to the budget screen.
Expected Result: Balance displays as -300.00 in red (1700.00 - 2000.00).

**Test 3: Zero Balance Displays Green**
Steps: Same budget configuration. On day 17, total expenses for the month are exactly 1700.00.
Expected Result: Balance displays as 0.00 in green.

**Test 4: Today's Spent Reflects Only Today's Expenses**
Steps: Expenses exist for multiple dates in the month. Two expenses today totaling 45.00. Navigate to the budget screen.
Expected Result: Today's spent displays 45.00, not the full month's total.

**Test 5: No Budget Month Configured**
Steps: Navigate to the budget screen when no budget month record exists for the current month.
Expected Result: The screen displays a setup prompt or message indicating the user needs to configure their monthly budget. No balance, daily budget, or spending values are shown.

## Implementation Context

This screen replaces the placeholder budget screen created in Epic 1's navigation structure. The balance calculation depends on the budget month data (Story 1) and expense data (Story 2). Consider whether the balance should be computed on the fly each time the screen renders or cached and invalidated on data changes. The Daily Budget Tracker prior art uses real-time recalculation, which is feasible given the data volumes (a single user's monthly expenses). The carry-over and additional funds values factor into the balance formula, but those features are built in Stories 8 and 9 respectively; the formula should account for them from the start so that the display is correct once those values are populated.
