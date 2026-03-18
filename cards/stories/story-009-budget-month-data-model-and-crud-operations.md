---
title: "Budget Month Data Model and CRUD Operations"
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

The Budget Module requires a persistent data model for budget months before any UI can display balances or accept expenses. Each budget month represents a discrete accounting period containing a monthly budget amount, a calculated daily allowance, a carry-over value from the previous month, and an additional funds amount. The Epic 1 IndexedDB schema establishes the `budgetMonths` object store, and this story populates it with the actual data access layer.

This is the foundational data story for the entire Budget Module. Every subsequent story (balance display, expense entry, monthly chaining, dashboard integration) depends on being able to create, read, and update budget month records reliably. The data model must also anticipate the AI agent's write path from Epic 4, which will need to look up the current month's configuration when creating expenses.

## Feature Requirements / Functional Behavior

**Business Rules**

- A budget month is uniquely identified by a year-month value (e.g., "2026-03"). Only one budget month record may exist for any given year-month.
- Monthly budget amount is a positive numeric value set by the user. Daily allowance is calculated as monthly amount divided by the number of calendar days in that month, rounded to two decimal places.
- Carry-over represents the previous month's ending balance (positive or negative) and is stored as a signed numeric value. The very first budget month defaults carry-over to zero unless the user specifies a starting balance.
- Additional funds default to zero for every new budget month. They represent supplemental income (bonuses, gifts, refunds) that increases available balance without altering the base monthly budget.
- All monetary values must be stored and returned with two decimal place precision. No floating-point drift is acceptable in stored values.

**UI Behavior**

- No direct UI is built in this story. This story delivers the data access functions that subsequent stories consume.
- CRUD operations should return data in a predictable shape that UI components can bind to without transformation.

## Acceptance Tests

**Test 1: Create a New Budget Month**
Steps: Call the create operation with year-month "2026-03", monthly amount 3100.00, carry-over 0.00, additional funds 0.00. Read the record back.
Expected Result: A budget month record exists for "2026-03" with monthly amount 3100.00, daily amount 100.00 (3100 / 31 days), carry-over 0.00, and additional funds 0.00.

**Test 2: Daily Allowance Calculation for Different Month Lengths**
Steps: Create budget months for February 2026 (28 days) and March 2026 (31 days), both with monthly amount 3100.00.
Expected Result: February daily amount is 110.71 (3100 / 28, rounded to two decimals). March daily amount is 100.00 (3100 / 31).

**Test 3: Duplicate Month Prevention**
Steps: Create a budget month for "2026-03". Attempt to create another budget month for "2026-03".
Expected Result: The second create operation fails or is rejected. Only one record exists for "2026-03".

**Test 4: Update Monthly Amount Recalculates Daily Allowance**
Steps: Create a budget month for "2026-04" with monthly amount 3000.00. Update the monthly amount to 3600.00.
Expected Result: The stored record reflects monthly amount 3600.00 and daily amount 120.00 (3600 / 30 days).

**Test 5: Currency Precision on Odd Divisions**
Steps: Create a budget month for "2026-07" (31 days) with monthly amount 1000.00.
Expected Result: Daily amount is 32.26 (1000 / 31 = 32.258... rounded to two decimals). Reading the value back returns exactly 32.26, not 32.258064516129035 or similar.

## Implementation Context

Epic 1 (PWA Shell, Dashboard & Settings) establishes the IndexedDB schema and the `budgetMonths` object store. This story builds the data access layer on top of that store. The key index should be the year-month string for efficient lookups. Consider how the update operation should behave if the user changes the monthly amount mid-month when expenses already exist; the daily allowance recalculation applies to the full month regardless. The open question from the Epic about first-month initialization (starting balance vs. zero) is addressed here by defaulting carry-over to zero, but the create operation should accept an optional starting balance parameter for flexibility.
