# Mission Brief

**Playbook:** feature-build
**Design Doc:** docs/plans/stage-4-budget-advanced.md
**Supplementary:** docs/plans/global-conventions.md
**Created:** 2026-03-18

## Requirements Summary

1. Month selector component: navigate between months (prev/next), defaults to current month, resets on screen re-entry, all budget data updates to selected month
2. Monthly chaining / carry-over: new month auto-initializes from previous month (copies budget amount, calculates carry-over). First month = zero carry-over. Past month expense edits propagate forward IMMEDIATELY through all subsequent months.
3. Additional funds management: per-month, >= 0, defaults 0, not copied during chaining. UI to view/modify on budget screen.
4. Summary reports: category breakdown + vendor breakdown (sorted descending), monthly stats (total budget, total spent, net change, avg daily spending). "Uncategorized" for blank categories. Case-sensitive matching.
5. Dashboard budget cards integration: wire DailyBudgetCard and MonthlyPerformanceCard to live data. Tapping navigates to /budget.

## Key Files

**Existing (from Stage 3):**
- `src/data/budget-service.ts` — extend with chaining, carry-over propagation, additional funds, reporting
- `src/data/expense-service.ts` — may need to trigger carry-over propagation on past-month writes
- `src/hooks/useBudget.ts` — extend for month selector context
- `src/hooks/useExpenses.ts` — extend for month context
- `src/screens/budget/BudgetScreen.tsx` — add month selector, additional funds, summary reports
- `src/screens/dashboard/DailyBudgetCard.tsx` — wire to live data
- `src/screens/dashboard/MonthlyPerformanceCard.tsx` — wire to live data
- `src/lib/dates.ts` — previousYearMonth(), nextYearMonth() already exist

**New files to create:**
- `src/screens/budget/MonthSelector.tsx`
- `src/screens/budget/AdditionalFundsInput.tsx`
- `src/screens/budget/BudgetSummary.tsx`

## Test Command

```
npx vitest run
```

## Developer Callouts

- **All work on `staging` branch.** Do NOT create new branches.
- **Carry-over propagation is the most complex piece.** When a past month's expenses change, all subsequent months must recalculate carry-over sequentially (each depends on previous). Immediate propagation, not lazy.
- **Additional funds are NOT copied during monthly chaining** (unlike monthly budget amount which IS copied).
- **Summary report category matching is case-sensitive.** "Dining" and "dining" are separate categories.
- **Dashboard cards replace the shells from Stage 2.** They now fetch their own data internally.
- **All monetary math uses roundCurrency().** No raw floating-point.
- **Month selector state is transient** — not persisted, resets to current month on screen re-entry.
- **Tests should use `tests/lib/dates.test.ts`** (not `tests/data/dates.test.ts`) for date utility tests.

## Success Criteria

- Month selector navigates between months, all data updates correctly
- New month auto-initializes with carry-over from previous month
- Past month expense edits propagate carry-over forward through all subsequent months
- Additional funds editable per month, >= 0, reflected in balance and carry-over
- Summary reports show correct category/vendor breakdowns and monthly stats
- Dashboard cards show live budget data with green/red color coding
- Tapping dashboard cards navigates to /budget
- All tests pass with `npx vitest run`
