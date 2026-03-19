# Mission Brief

**Playbook:** feature-build
**Design Doc:** docs/plans/stage-5-goals-health.md
**Supplementary:** docs/plans/global-conventions.md
**Created:** 2026-03-18

## Requirements Summary

### Track A: Goals (Stories 020-023, 028)
1. Goal service: CRUD with 4 progress models (numeric, date-based, percentage, freeform), status transitions (active/completed/archived), validation
2. Goals screen: list view with progress indicators per model type, filter by type + status, default = active
3. Goal creation form: dynamic fields based on progress model selection
4. Goal progress update + completion/archive/reactivate lifecycle
5. Dashboard goals widget: active count, completed count, aggregate progress %

### Track B: Health Routines (Stories 024-027, 029)
6. Health routine + log entry service: two-entity model (definitions + logs), cascade delete, weekly frequency
7. Health routines screen: adherence indicators, quick-log action
8. Health routine logging: date (no future), optional metrics, multiple per day
9. Streak calculation: consecutive weeks meeting target frequency (Mon-Sun), resets on miss
10. Dashboard health widget: routines completed today, weekly on-track/behind, best streak

## Key Files

**Existing:**
- `src/data/db.ts` — goals + healthRoutines + healthLogEntries stores
- `src/lib/types.ts` — Goal, HealthRoutine, HealthLogEntry, TrackedMetric interfaces
- `src/screens/dashboard/GoalsWidget.tsx` — replace shell with live data
- `src/screens/dashboard/HealthWidget.tsx` — replace shell with live data
- `src/screens/goals/GoalsScreen.tsx` — replace placeholder
- `src/screens/health/HealthScreen.tsx` — replace placeholder

**New files to create:**
- `src/data/goal-service.ts` — Goal CRUD + aggregation
- `src/data/health-service.ts` — Routine + log CRUD + streak calculation
- `src/hooks/useGoals.ts`, `src/hooks/useHealth.ts`
- Goal screen components (GoalCard, GoalForm, GoalDetail, GoalsScreenContainer)
- Health screen components (RoutineCard, RoutineForm, LogEntryForm, HealthScreenContainer)

## Test Command

```
npx vitest run
```

## Developer Callouts

- **All work on `staging` branch.** Do NOT create new branches.
- **Two independent tracks** — Goals and Health can be built in parallel
- **Streak calculation**: consecutive completed weeks (Mon-Sun) where log count >= target frequency. Current week counts only if target already met. Calculated on demand, not stored.
- **Goal status transitions**: active→completed, active→archived, completed→archived, completed→active, archived→active. NO archived→completed.
- **Dashboard widgets replace Stage 2 shells** — use the same component names but with live data
- **All monetary math uses roundCurrency()** where applicable (goal numeric targets may involve currency)
- Follow global-conventions.md for naming, structure, patterns

## Success Criteria

- Goals with all 4 progress models can be created, viewed, updated, completed, archived
- Goals screen filters by type and status correctly
- Health routines with weekly frequency targets can be defined and logged
- Streak calculation correctly counts consecutive weeks, resets on miss
- Dashboard widgets show live aggregated data from both modules
- All tests pass with `npx vitest run`
