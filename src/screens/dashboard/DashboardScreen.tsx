import { MilestoneCountdown } from './MilestoneCountdown';
import { DailyBudgetCard } from './DailyBudgetCard';
import { MonthlyPerformanceCard } from './MonthlyPerformanceCard';
import { GoalsWidgetContainer } from './GoalsWidgetContainer';
import { HealthWidgetContainer } from './HealthWidgetContainer';

export function DashboardScreen() {
  // Stage 2: All cards render in zero-state / placeholder mode.
  // Stage 4 will connect DailyBudgetCard and MonthlyPerformanceCard to live data.
  // Stage 5 will connect GoalsWidget and HealthWidget to live data.
  return (
    <div data-testid="dashboard-screen" className="space-y-4 p-4 pb-24">
      {/* 1. Milestone Countdown — most prominent, top of dashboard */}
      <MilestoneCountdown />

      {/* 2. Budget Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DailyBudgetCard />
        <MonthlyPerformanceCard />
      </div>

      {/* 3. Goals Aggregation */}
      <GoalsWidgetContainer />

      {/* 4. Health Routines Aggregation */}
      <HealthWidgetContainer />
    </div>
  );
}
