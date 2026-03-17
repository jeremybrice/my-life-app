---
title: "Dashboard Budget Cards Integration"
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

Epic 1 built the dashboard with placeholder shells for the daily budget summary card and the monthly performance card. These cards display zero-state or placeholder content until they are wired to live data. Now that the budget data model, expense operations, and balance calculations are in place, these cards can show meaningful, current information.

The dashboard is the user's first screen on every app launch. Seeing a quick budget snapshot without navigating to the full budget screen reinforces daily financial awareness. The daily budget summary card answers "How am I doing today?" and the monthly performance card answers "How am I doing this month?" Together, they give the user a reason to open the app even on days when they have no expenses to enter.

## Feature Requirements / Functional Behavior

**UI Behavior**

- The daily budget summary card on the dashboard displays: today's balance (color-coded green for positive, red for negative), today's daily budget, and today's total spending.
- The monthly performance card on the dashboard displays: the current month's total budget, total spent, and net change (total budget minus total spent).
- Both cards refresh their data when the dashboard screen is loaded or when the user navigates back to the dashboard from another screen.
- If no budget month is configured for the current month, both cards display a zero state or a prompt indicating the user should set up their budget.
- Tapping either card navigates the user to the full budget screen for detailed viewing.

**Business Rules**

- Today's balance on the daily summary card uses the same formula as the budget screen header: (daily allowance x days elapsed including today) + carry-over + additional funds - total month expenses. This is the current balance, not a today-only balance.
- Today's daily budget is the current month's daily allowance (monthly amount / days in month).
- Today's total spending is the sum of expenses with today's date.
- Monthly performance total budget is the monthly amount + carry-over + additional funds.
- Monthly performance total spent is the sum of all expenses for the current month.
- Monthly performance net change is total budget minus total spent.
- All values use two decimal place precision.

## Acceptance Tests

**Test 1: Daily Summary Card Shows Current Balance**
Steps: Current month has daily allowance 100.00, carry-over 50.00, additional funds 0.00. Through day 10, total expenses are 800.00. Navigate to the dashboard.
Expected Result: Daily summary card shows balance of 250.00 (1000 + 50 + 0 - 800) in green. Daily budget shows 100.00.

**Test 2: Daily Summary Card Shows Red for Negative Balance**
Steps: Same configuration but total expenses are 1200.00.
Expected Result: Daily summary card shows -150.00 in red.

**Test 3: Monthly Performance Card Shows Totals**
Steps: Current month has monthly amount 3100.00, carry-over 100.00, additional funds 50.00. Total expenses 1500.00. Navigate to dashboard.
Expected Result: Monthly performance card shows total budget 3250.00, total spent 1500.00, net change 1750.00.

**Test 4: Cards Update After Adding Expense**
Steps: View dashboard showing balance of 500.00. Navigate to budget screen. Add a 75.00 expense. Navigate back to dashboard.
Expected Result: Daily summary card balance is now 425.00. Monthly performance total spent increased by 75.00. Net change decreased by 75.00.

**Test 5: No Budget Month Configured**
Steps: Delete or ensure no budget month exists for the current month. Navigate to dashboard.
Expected Result: Both budget cards display a zero state or setup prompt. No balance, spending, or budget values are shown. No errors occur.

**Test 6: Tapping Card Navigates to Budget Screen**
Steps: Tap the daily budget summary card on the dashboard.
Expected Result: The app navigates to the full budget screen showing the current month's data.

## Implementation Context

The dashboard card shells from Epic 1 expose a data-binding interface. This story connects that interface to the budget month and expense data models. The cards should not contain complex calculation logic themselves; they should call the same balance and aggregation functions used by the budget screen. Consider whether the dashboard should query fresh data on every visit or subscribe to data change events. Given that the user may add an expense on the budget screen and immediately return to the dashboard, the data must be fresh on each dashboard render. The daily summary card and budget screen header display the same balance value; they should share the same calculation function to avoid drift.
