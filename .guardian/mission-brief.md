# Mission Brief

**Playbook:** feature-build
**Design Doc:** docs/plans/stage-2-dashboard-offline.md
**Supplementary:** docs/plans/global-conventions.md
**Created:** 2026-03-18

## Requirements Summary

1. Build MilestoneCountdown component reading birth/target dates from Settings via useSettings hook — days remaining, progress indicator, handles unconfigured/past target/missing label states
2. Build DailyBudgetCard shell with DailyBudgetCardProps interface (todayBalance, dailyBudget, todaySpending, isPositive, onNavigate) — zero-state content when no data
3. Build MonthlyPerformanceCard shell with MonthlyPerformanceCardProps interface (totalBudget, totalSpent, netChange, onNavigate) — zero-state content when no data
4. Build GoalsWidget with GoalsWidgetProps interface (activeCount, completedCount, aggregateProgress, onNavigate) — placeholder content
5. Build HealthWidget with HealthWidgetProps interface (routinesCompletedToday, totalRoutines, onTrack, behind, bestStreak, onNavigate) — placeholder content
6. Assemble DashboardScreen with scroll order: countdown, budget cards, goals, health
7. Re-export all card interfaces from src/lib/types.ts
8. Verify full offline capability (all 6 screens, settings save/load, AI Agent shows network-required)

## Key Files

**Existing (from Stage 1):**
- `src/hooks/useSettings.ts` — provides settings data for countdown
- `src/lib/dates.ts` — date helpers (may need daysBetweenInclusive added)
- `src/lib/types.ts` — shared interfaces (add card prop types here)
- `src/screens/dashboard/DashboardScreen.tsx` — replace placeholder
- `src/screens/agent/AgentScreen.tsx` — update with network-required message
- `src/hooks/useOnlineStatus.ts` — network connectivity hook
- `src/components/` — shared components available

**New files to create:**
- `src/screens/dashboard/MilestoneCountdown.tsx`
- `src/screens/dashboard/DailyBudgetCard.tsx`
- `src/screens/dashboard/MonthlyPerformanceCard.tsx`
- `src/screens/dashboard/GoalsWidget.tsx`
- `src/screens/dashboard/HealthWidget.tsx`

## Test Command

```
npx vitest run
```

## Developer Callouts

- **All work on `staging` branch.** Do not create new branches.
- Card prop interfaces defined here become contracts for Stages 4 and 5 — field names must not change
- Countdown recalculates on document.visibilitychange event
- Days remaining = calendar days today to target (inclusive)
- Target in past = "milestone reached" with days ago (no negative numbers)
- Zero state for unconfigured dates = instructional message directing to Settings
- useSettings hook uses useState/useEffect (not useLiveQuery) per Stage 1 design doc
- Follow global-conventions.md: kebab-case files, PascalCase components, Tailwind styling

## Success Criteria

- Dashboard shows working milestone countdown with correct day calculation
- All 4 card shells render with zero-state content and define TypeScript prop interfaces
- Dashboard scroll order: countdown, daily budget, monthly performance, goals, health
- Card interfaces re-exported from src/lib/types.ts
- App works fully offline after install (all 6 screens navigate, settings persist)
- AI Agent screen shows network-required message when offline
- All tests pass with `npx vitest run`
