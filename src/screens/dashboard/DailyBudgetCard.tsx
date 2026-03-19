/**
 * DailyBudgetCardProps — Stage 4 will pass live data to this interface.
 * Do NOT modify this interface's type shape when connecting live data.
 */
export interface DailyBudgetCardProps {
  /** Today's remaining balance (daily allowance - today's spending + carry-over fraction) */
  todayBalance: number;
  /** The daily budget allowance amount */
  dailyBudget: number;
  /** Total amount spent today */
  todaySpending: number;
  /** 'under' = spending within budget, 'over' = spending exceeds daily allowance */
  status: 'under' | 'over';
  /** Optional callback to navigate to the Budget tab */
  onNavigate?: () => void;
}

interface DailyBudgetCardInternalProps {
  data?: DailyBudgetCardProps;
}

export function DailyBudgetCard({ data }: DailyBudgetCardInternalProps) {
  if (!data) {
    return (
      <div data-testid="daily-budget-card" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Daily Budget
        </h3>
        <div data-testid="daily-budget-zero-state" className="mt-3 text-center">
          <p className="text-2xl font-bold text-gray-300">--</p>
          <p className="mt-2 text-sm text-gray-400">
            Set up your monthly budget in the Budget tab to see your daily spending allowance here.
          </p>
        </div>
      </div>
    );
  }

  const isOver = data.status === 'over';

  return (
    <div data-testid="daily-budget-card" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Daily Budget
      </h3>
      <div className="mt-3">
        <p
          data-testid="daily-budget-remaining"
          className={`text-3xl font-bold ${isOver ? 'text-red-600' : 'text-green-600'}`}
        >
          ${data.todayBalance.toFixed(2)}
        </p>
        <p className="mt-1 text-xs text-gray-400">remaining today</p>
      </div>
      <div className="mt-3 flex justify-between text-sm text-gray-500">
        <span data-testid="daily-budget-allowance">Budget: ${data.dailyBudget.toFixed(2)}</span>
        <span data-testid="daily-budget-spent">Spent: ${data.todaySpending.toFixed(2)}</span>
      </div>
    </div>
  );
}
