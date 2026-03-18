---
title: "Expense Entry Form"
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

Expense entry is the most frequent user interaction in the Budget Module. The founder enters multiple expenses daily, so this form must be fast and frictionless. The Daily Budget Tracker's form defaults the date to today and requires only vendor and amount to submit, keeping the minimum path to two field entries plus a tap.

This form is the manual entry path. The AI agent (Epic 4) provides an alternative conversational entry path, but both write through the same expense CRUD interface (Story 2). The form must enforce the same validation rules that the CRUD layer enforces, providing clear feedback before the user attempts to submit.

## Feature Requirements / Functional Behavior

**UI Behavior**

- The expense form is accessible from the budget screen. The entry point should be prominent and quick to reach (e.g., a floating action button or an always-visible "Add Expense" control).
- The form contains five fields: date picker (defaults to today), category (freeform text input), vendor (text input, required), amount (numeric input, required), and description (text input, optional).
- The vendor field displays a character counter or limit indicator showing the 20 character maximum. The field prevents input beyond 20 characters.
- The amount field accepts only numeric input with up to two decimal places. It should prevent non-numeric characters from being entered.
- The date picker defaults to today's date. The user can select any date within the current budget month.
- On successful submission, the form clears, the budget screen balance updates to reflect the new expense, and the user is returned to or remains on the budget screen.
- Validation errors display inline next to the offending field. The form does not submit if required fields are empty or invalid.

**Business Rules**

- Vendor is required. The form must not submit without a vendor value.
- Amount is required and must be greater than zero. The form must not submit with a zero or negative amount.
- Vendor is limited to 20 characters, enforced at the UI level and validated at the data layer.
- Category, if provided, is stored as entered. No normalization or forced casing.
- The expense is associated with the budget month corresponding to the selected date.

## Acceptance Tests

**Test 1: Submit Expense with All Fields**
Steps: Open the expense form. Enter date "2026-03-17", category "Dining", vendor "Chipotle", amount 12.50, description "Lunch burrito". Submit.
Expected Result: The form clears. The expense appears in the expense list. The budget balance decreases by 12.50.

**Test 2: Submit Expense with Only Required Fields**
Steps: Open the expense form. Leave date as today (default). Leave category empty. Enter vendor "Shell", amount 45.00. Leave description empty. Submit.
Expected Result: The form submits successfully. The expense is created with today's date, empty category, vendor "Shell", amount 45.00, and empty description.

**Test 3: Reject Submission Without Vendor**
Steps: Open the expense form. Enter amount 20.00. Leave vendor empty. Attempt to submit.
Expected Result: The form does not submit. A validation message appears at the vendor field indicating it is required.

**Test 4: Reject Amount of Zero**
Steps: Open the expense form. Enter vendor "Test", amount 0.00. Attempt to submit.
Expected Result: The form does not submit. A validation message appears at the amount field indicating the amount must be greater than zero.

**Test 5: Vendor Character Limit Enforced**
Steps: Open the expense form. Begin typing a vendor name that exceeds 20 characters.
Expected Result: The input stops accepting characters at 20. The character count indicator reflects the limit.

## Implementation Context

This form writes through the expense CRUD interface from Story 2. The form should not contain its own persistence logic; it should call the same create function that the AI agent will call. Consider whether the form should appear as a modal overlay, a slide-up panel, or an inline expansion on the budget screen. The Daily Budget Tracker uses a form at the top of the screen that is always visible. The category field is freeform in this story; Story 10 (Summary Reports) will aggregate by whatever category values the user enters, so consistency is on the user. The Epic's open question about whether categories should be a fixed list, user-defined, or freeform is resolved here as freeform.
