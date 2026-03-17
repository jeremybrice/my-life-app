---
title: "Additional Funds Management"
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

Life does not conform neatly to a fixed monthly budget. The user receives bonuses, gifts, refunds, or other income that should increase their spending capacity for the month. The Daily Budget Tracker handles this with an "additional funds" field that adds to the available balance without modifying the base monthly budget amount. This separation is important: the user wants to know their core budget discipline (monthly amount) is intact while still benefiting from extra income.

This story adds the UI for managing additional funds and ensures the value is correctly incorporated into all balance calculations across the budget screen, expense table running balances, and the carry-over chain.

## Feature Requirements / Functional Behavior

**UI Behavior**

- The budget screen provides a way to view and modify the additional funds amount for the currently selected month.
- The additional funds control may appear as an editable field in a budget configuration section, a modal accessible from the budget header, or another accessible location on the budget screen.
- When the user adds or changes additional funds, the balance display, expense table running balances, and all dependent calculations update immediately.
- The additional funds amount is displayed somewhere visible on the budget screen so the user can see how much extra has been added.

**Business Rules**

- Additional funds is a single numeric value per budget month, representing the cumulative extra funds added. It is not an itemized list of individual additions.
- Additional funds default to zero for every new budget month. They are not copied from the previous month during monthly chaining (unlike the monthly budget amount).
- Additional funds must be zero or positive. Negative additional funds are not permitted; reductions in budget should be handled by editing the monthly budget amount.
- Additional funds contribute to the balance calculation: balance = (daily allowance x days elapsed) + carry-over + additional funds - total expenses.
- Additional funds contribute to the carry-over calculation for the next month. A month's ending balance, including additional funds, carries forward.

## Acceptance Tests

**Test 1: Add Additional Funds Updates Balance**
Steps: Budget month with daily allowance 100.00, carry-over 0.00, additional funds 0.00, and 500.00 in expenses through day 10 (cumulative budget 1000.00). Current balance is 500.00. Add 200.00 in additional funds.
Expected Result: Balance updates to 700.00 (1000.00 + 0.00 + 200.00 - 500.00). The additional funds amount displays as 200.00.

**Test 2: Additional Funds Default to Zero for New Month**
Steps: Create or initialize a new budget month.
Expected Result: Additional funds is 0.00. Balance calculations treat additional funds as zero.

**Test 3: Reject Negative Additional Funds**
Steps: Attempt to set additional funds to -50.00.
Expected Result: The input is rejected. Additional funds remains at its previous value. A validation message indicates the value must be zero or positive.

**Test 4: Additional Funds Included in Running Balance**
Steps: Budget month with 100.00 daily allowance, 0.00 carry-over, 150.00 additional funds. Expense of 80.00 on day 1.
Expected Result: Day 1 running balance = 170.00 (100 + 0 + 150 - 80).

**Test 5: Additional Funds Not Copied to New Month**
Steps: March has additional funds of 200.00. Navigate to April for the first time, triggering month initialization.
Expected Result: April's additional funds is 0.00, not 200.00. April's monthly budget amount is copied from March, but additional funds starts fresh.

## Implementation Context

The budget month data model (Story 1) already includes the additional funds field. This story adds the UI for modifying that field and verifies the end-to-end integration with balance display (Story 3), expense table running balances (Story 5), and carry-over calculations (Story 8). Consider whether additional funds should be editable from the budget header area (quick access) or from a separate budget configuration view. The Daily Budget Tracker places it alongside the monthly budget amount in a configuration section.
