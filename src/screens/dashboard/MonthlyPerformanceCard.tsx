/**
 * MonthlyPerformanceCardProps — Stage 4 will pass live data to this interface.
 * Do NOT modify this interface's type shape when connecting live data.
 */
export interface MonthlyPerformanceCardProps {
  /** Total budget for the current month (monthly amount + carry-over + additional funds) */
  totalBudget: number;
  /** Total spent this month */
  totalSpent: number;
  /** Net change (totalBudget - totalSpent); positive = under budget, negative = over */
  netChange: number;
  /** Current year-month displayed, e.g., "March 2026" */
  monthLabel: string;
  /** Optional callback to navigate to the Budget tab */
  onNavigate?: () => void;
}

interface MonthlyPerformanceCardInternalProps {
  data?: MonthlyPerformanceCardProps;
}

function netChangeColor(netChange: number): string {
  if (netChange < 0) return 'text-red-600';
  if (netChange === 0) return 'text-yellow-600';
  return 'text-green-600';
}

export function MonthlyPerformanceCard({ data }: MonthlyPerformanceCardInternalProps) {
  if (!data) {
    return (
      <div data-testid="monthly-performance-card" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Monthly Performance
        </h3>
        <div data-testid="monthly-performance-zero-state" className="mt-3 text-center">
          <p className="text-2xl font-bold text-gray-300">--</p>
          <p className="mt-2 text-sm text-gray-400">
            Your monthly spending overview will appear here once you start tracking expenses.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="monthly-performance-card" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Monthly Performance
        </h3>
        <span data-testid="monthly-performance-month" className="text-xs text-gray-400">
          {data.monthLabel}
        </span>
      </div>
      <div className="mt-3">
        <p
          data-testid="monthly-performance-remaining"
          className={`text-3xl font-bold ${netChangeColor(data.netChange)}`}
        >
          ${data.netChange.toFixed(2)}
        </p>
        <p className="mt-1 text-xs text-gray-400">net change this month</p>
      </div>
      <div className="mt-3 flex justify-between text-sm text-gray-500">
        <span data-testid="monthly-performance-budget">Budget: ${data.totalBudget.toFixed(2)}</span>
        <span data-testid="monthly-performance-spent">Spent: ${data.totalSpent.toFixed(2)}</span>
      </div>
    </div>
  );
}
