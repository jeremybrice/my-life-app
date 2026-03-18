---
title: "Summary Reports Category and Vendor Breakdown"
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

Knowing how much you spent is only half the picture. Understanding where you spent it reveals patterns and opportunities for adjustment. The Daily Budget Tracker provides summary reports that break down monthly spending by category and by vendor. A user might discover they spent $300 at restaurants this month, prompting a conscious decision about dining habits next month. This is the analytical complement to the transactional expense table.

This story builds the summary view, which aggregates expense data for the selected month into category and vendor breakdowns, along with top-line monthly statistics. The view reads from the same expense data model (Story 2) and operates within the month context provided by the month selector (Story 7).

## Feature Requirements / Functional Behavior

**UI Behavior**

- A summary view is accessible from the budget screen via a clearly labeled navigation element (e.g., a "Summary" tab, button, or swipeable section).
- The summary view displays two breakdown sections: spending by category and spending by vendor.
- Each breakdown lists entries sorted by total amount descending (highest spending first). Each entry shows the category or vendor name and the total amount spent.
- Expenses with no category are grouped under a label such as "Uncategorized" in the category breakdown.
- The summary view also displays monthly statistics: total budget (monthly amount + carry-over + additional funds), total spent, net change (total budget minus total spent), and average daily spending (total spent divided by the number of days that have expenses, or by days elapsed in the month).
- All values are displayed with two decimal place precision.
- The summary view operates on the currently selected month from the month selector. Changing months updates the summary.

**Business Rules**

- Category breakdown aggregates expense amounts by their category value. Matching is case-sensitive; "Dining" and "dining" are treated as separate categories.
- Vendor breakdown aggregates expense amounts by their vendor value.
- A category or vendor that appears in only one expense still appears as its own row in the breakdown.
- Total budget is the sum of the monthly budget amount, carry-over, and additional funds for the selected month.
- Net change is total budget minus total spent. Positive means under budget; negative means over budget.
- Average daily spending is total spent divided by the number of days elapsed in the month (including today if the month is the current month, or all days if viewing a past month).

## Acceptance Tests

**Test 1: Category Breakdown Totals**
Steps: Create expenses: Coffee/Starbucks/$5.00, Coffee/Peets/$4.50, Dining/Chipotle/$12.00, Dining/Subway/$8.00. Open summary view.
Expected Result: Category breakdown shows Coffee: 9.50 and Dining: 20.00. Dining appears first (highest total).

**Test 2: Vendor Breakdown Totals**
Steps: Same expenses as Test 1. View vendor breakdown.
Expected Result: Vendor breakdown shows Chipotle: 12.00, Subway: 8.00, Starbucks: 5.00, Peets: 4.50 (sorted by amount descending).

**Test 3: Uncategorized Expenses**
Steps: Create expenses with no category: vendor "Shell" $40.00, vendor "Costco" $85.00. Open summary view.
Expected Result: Category breakdown includes an "Uncategorized" entry totaling 125.00.

**Test 4: Monthly Statistics**
Steps: Budget month with monthly amount 3100.00, carry-over 100.00, additional funds 50.00. Total expenses across 15 days: 1200.00. Open summary view.
Expected Result: Total budget shows 3250.00. Total spent shows 1200.00. Net change shows 2050.00. Average daily spending shows 80.00 (1200.00 / 15).

**Test 5: Summary Scoped to Selected Month**
Steps: March has expenses totaling 2000.00. February has expenses totaling 1500.00. View summary for March, then switch to February.
Expected Result: March summary shows total spent 2000.00. February summary shows total spent 1500.00. Breakdowns reflect only the selected month's data.

## Implementation Context

The summary view reads from the expense data model (Story 2) and budget month configuration (Story 1). All aggregation happens client-side by querying the month's expenses and grouping by the relevant field. Consider whether the summary should be a separate screen/route or a section within the budget screen (e.g., a tab alongside the expense table). The Daily Budget Tracker presents it as a separate view accessible from the main budget screen. The category aggregation depends on user-entered freeform text, so minor variations in capitalization or spelling will produce separate groups. This is acceptable for v1.
