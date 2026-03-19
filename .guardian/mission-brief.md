# Mission Brief

**Playbook:** feature-build
**Design Doc:** docs/plans/stage-3-budget-core.md
**Supplementary:** docs/plans/global-conventions.md
**Created:** 2026-03-18

## Requirements Summary

1. Budget month data service (src/data/budget-service.ts): create, read, update budget months with daily allowance calculation (monthlyAmount / days in month, rounded to 2 decimals). Duplicate month prevention. Year-month string key ("2026-03").
2. Expense data service (src/data/expense-service.ts): create, read, update, delete expenses with validation. Vendor required + max 20 chars (REJECT, don't truncate). Amount required + positive. Date defaults to today. Every write triggers balance recalculation. THIS IS THE CONTRACT SURFACE for Stage 6 AI Agent.
3. Budget screen layout with live balance display: green when >= 0, red when < 0. Balance = (dailyAllowance x daysElapsed) + carryOver + additionalFunds - totalExpenses.
4. Expense entry form: date (default today), category (freeform), vendor (required, 20 char counter), amount (required, numeric, > 0), description (optional). Form clears on submit, balance updates immediately.
5. Expense table with daily grouping: grouped by date (most recent top), expandable/collapsible date headers showing daily budget, daily total, running balance.
6. Expense edit and delete: tap to edit (pre-populated), delete with confirmation dialog, immediate recalculation.

## Key Files

**Existing (from Stages 1-2):**
- `src/data/db.ts` — Dexie DB with budgetMonths + expenses stores
- `src/lib/types.ts` — BudgetMonth and Expense interfaces
- `src/lib/currency.ts` — roundCurrency() for all monetary math
- `src/lib/dates.ts` — daysInMonth(), daysElapsed(), currentYearMonth(), today()
- `src/lib/constants.ts` — MAX_VENDOR_LENGTH = 20
- `src/components/ConfirmDialog.tsx` — for delete confirmation
- `src/screens/budget/BudgetScreen.tsx` — placeholder to replace

**New files to create:**
- `src/data/budget-service.ts` — Budget month CRUD
- `src/data/expense-service.ts` — Expense CRUD (contract surface)
- `src/hooks/useBudget.ts` — React hook wrapping budget-service
- `src/hooks/useExpenses.ts` — React hook wrapping expense-service
- `src/screens/budget/BalanceHeader.tsx` — Balance display (green/red)
- `src/screens/budget/BudgetSetupPrompt.tsx` — No budget configured state
- `src/screens/budget/ExpenseForm.tsx` — Expense entry form
- `src/screens/budget/ExpenseTable.tsx` — Daily-grouped expense table
- `src/screens/budget/ExpenseEditModal.tsx` — Edit/delete modal

## Test Command

```
npx vitest run
```

## Developer Callouts

- **All work on `staging` branch.** Do NOT create new branches.
- **CRITICAL: expense-service.ts is a contract surface.** createExpense(), updateExpense(), deleteExpense() must be clean importable functions. NOT tied to React. Stage 6 AI Agent calls these same functions.
- **All monetary math uses roundCurrency().** No raw floating-point arithmetic.
- **Vendor > 20 chars must be REJECTED with an error**, not silently truncated.
- **Every expense write triggers balance recalculation** for the affected month.
- **Balance formula:** (dailyAllowance x daysElapsed including today) + carryOver + additionalFunds - totalExpenses
- **Green at >= 0, Red at < 0.** Zero is green.
- **Use dexie-react-hooks useLiveQuery** for reactive hooks where possible, but useState/useEffect is also acceptable per Stage 1 pattern.
- Follow global-conventions.md: kebab-case files, PascalCase components, camelCase functions.

## Success Criteria

- Budget month can be created with correct daily allowance calculation
- Expenses can be created, read, updated, deleted with all validation enforced
- Budget screen shows live balance (green/red) that updates immediately on any data change
- Expense form enforces vendor required + 20 char max, amount > 0
- Expense table groups by date with running balances
- Edit and delete work with confirmation and immediate recalculation
- All tests pass with `npx vitest run`
- expense-service.ts functions are importable without React dependency
