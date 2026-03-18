---
title: "Carry-Over and Monthly Chaining Logic"
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

Monthly chaining is a defining feature of the Daily Budget Tracker. At the end of each month, whatever balance remains (positive or negative) carries forward into the next month. A frugal February gives the user extra budget in March. An overspent January starts February in the hole. This creates a continuous financial narrative across months rather than isolated snapshots.

The chaining logic must handle three scenarios: the user navigating to a new month for the first time (which triggers initialization), retroactive changes to a past month's expenses (which may affect carry-over downstream), and the very first budget month (which has no predecessor). This story implements the calculation engine and the month initialization process.

## Feature Requirements / Functional Behavior

**Business Rules**

- When a budget month is accessed for the first time (either by the month selector or by the system when a new calendar month begins), and no record exists for that month, the system initializes a new budget month record.
- Initialization copies the previous month's monthly budget amount and calculates carry-over as the previous month's ending balance (cumulative daily allowance plus carry-over plus additional funds, minus total expenses).
- If the previous month also does not exist, the system does not create it. Only the requested month is created with zero carry-over and the budget amount from settings.
- The very first budget month in the chain has a carry-over of zero (or a user-specified starting balance if provided during setup).
- Carry-over can be positive (surplus) or negative (deficit). There is no floor or ceiling.
- When an expense is added, edited, or deleted in a past month, the carry-over for subsequent months should be recalculated to maintain chain integrity. This recalculation propagates forward through all months that depend on the modified month.
- All carry-over calculations use two decimal place precision.

**UI Behavior**

- When the user navigates to a new month that has never been viewed, the system initializes it automatically. The user sees the new month with the carried-over balance and the copied budget settings without needing to manually configure anything.
- If a past month's data changes and carry-over recalculation affects the current month, the current month's balance display updates accordingly.

## Acceptance Tests

**Test 1: New Month Inherits Previous Month's Settings and Carry-Over**
Steps: March 2026 has monthly budget 3100.00, total expenses 2900.00, carry-over 0.00, additional funds 0.00. Navigate to April 2026 for the first time.
Expected Result: April 2026 is created with monthly budget 3100.00 (copied), carry-over 200.00 (3100.00 - 2900.00), and additional funds 0.00.

**Test 2: Negative Carry-Over**
Steps: March 2026 has monthly budget 3100.00, total expenses 3500.00, carry-over 0.00, additional funds 0.00. Navigate to April 2026 for the first time.
Expected Result: April 2026 is created with carry-over -400.00 (3100.00 - 3500.00).

**Test 3: First Month in Chain Has Zero Carry-Over**
Steps: No budget months exist. Navigate to March 2026 (the first month ever).
Expected Result: March 2026 is created with carry-over 0.00.

**Test 4: Chain Propagation After Past Month Edit**
Steps: March has carry-over 0.00, budget 3100.00, expenses 2900.00. April was initialized with carry-over 200.00. Edit a March expense to increase total expenses to 3200.00.
Expected Result: March's ending balance changes to -100.00. April's carry-over updates to -100.00. April's displayed balance reflects the new carry-over.

**Test 5: Carry-Over Includes Previous Month's Additional Funds**
Steps: March has monthly budget 3100.00, carry-over 0.00, additional funds 200.00, and total expenses 3000.00. Navigate to April for the first time.
Expected Result: April's carry-over is 300.00 (3100.00 + 0.00 + 200.00 - 3000.00).

## Implementation Context

Chain propagation after a past month edit is the most complex aspect of this story. Consider the scope: if the user has 12 months of history and edits January, all 11 subsequent months need carry-over recalculation. This is a sequential process since each month's carry-over depends on the previous one. Given the data volumes (at most dozens of months for a personal user), this should complete quickly even if done synchronously. The question is when to trigger propagation: immediately on any past-month expense change, or lazily when the affected month is next viewed. Immediate propagation maintains data integrity. Lazy propagation may cause user confusion if they see stale carry-over values.
