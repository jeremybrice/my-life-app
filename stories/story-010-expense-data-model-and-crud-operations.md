---
title: "Expense Data Model and CRUD Operations"
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

Expenses are the primary transactional data in the Budget Module. Every day the user logs one or more expenses, and those entries drive balance calculations, daily groupings, and summary reports. The expense data model must be robust enough to serve the manual entry form (Story 4), the edit/delete flow (Story 6), the AI agent's conversational entry (Epic 4), and the summary report aggregations (Story 10).

A critical architectural requirement from the parent Epic is that the expense write interface must be clean and accessible enough that the AI agent can call it directly. This means the create and update operations cannot be tightly coupled to a UI component. They must accept a well-defined input shape, validate it, persist the record, and trigger balance recalculation through the same code path regardless of whether the call originates from a form submission or an agent action.

## Feature Requirements / Functional Behavior

**Business Rules**

- Each expense record contains: date, category, vendor, amount, description, and a reference to the budget month it belongs to.
- Vendor is required and limited to 20 characters maximum. Entries exceeding 20 characters must be rejected, not silently truncated.
- Amount is required and must be a positive numeric value, stored with two decimal place precision.
- Date is required and must be a valid calendar date. If no date is provided, it defaults to today.
- Category is optional. It may be freeform text entered by the user. An empty category is acceptable.
- Description is optional and has no character limit.
- When an expense is created, updated, or deleted, the affected budget month's running balance must be recalculated immediately. There should be no state where the balance is stale after a write operation.
- The write interface must accept the same input shape regardless of caller (manual form or AI agent). Validation rules apply identically to both paths.

**UI Behavior**

- No direct UI is built in this story. This story delivers the data access functions and validation logic consumed by the expense form (Story 4), edit/delete flow (Story 6), and AI agent (Epic 4).

## Acceptance Tests

**Test 1: Create a Valid Expense**
Steps: Create an expense with date "2026-03-17", vendor "Starbucks", amount 5.75, category "Coffee", description "Morning latte". Read it back.
Expected Result: The expense record exists with all fields as provided. The associated budget month's balance reflects the 5.75 deduction.

**Test 2: Reject Expense with Missing Vendor**
Steps: Attempt to create an expense with amount 10.00 but no vendor.
Expected Result: The create operation rejects the input with a validation error indicating vendor is required.

**Test 3: Reject Vendor Exceeding 20 Characters**
Steps: Attempt to create an expense with vendor "International House of Pancakes" (31 characters).
Expected Result: The create operation rejects the input with a validation error indicating vendor exceeds 20 characters. No record is created.

**Test 4: Delete Expense Recalculates Balance**
Steps: Create a budget month with monthly amount 3100.00. Create two expenses of 50.00 each. Verify balance reflects 100.00 in deductions. Delete one expense.
Expected Result: After deletion, the budget month's running calculations reflect only 50.00 in deductions. The deleted record no longer appears when querying expenses.

**Test 5: Update Expense Amount Recalculates Balance**
Steps: Create an expense with amount 25.00. Update the amount to 40.00.
Expected Result: The balance reflects the updated 40.00 deduction, not the original 25.00. The expense record shows amount 40.00.

**Test 6: Default Date to Today When Omitted**
Steps: Create an expense with vendor "Target", amount 32.50, but no date specified.
Expected Result: The created expense record has today's date as its date value.

## Implementation Context

The expense write interface is a contract surface for Epic 4 (AI Agent Integration). The AI agent will call this same interface to create expenses from parsed natural language or receipt scans. The interface should be importable as a module function, not tied to any UI framework lifecycle. Consider indexing expenses by date and by budget month identifier for efficient querying in the expense table (Story 5) and summary reports (Story 10). Balance recalculation on write means querying all expenses for the affected month and recomputing totals; consider whether this should be a derived calculation or a stored aggregate.
