/**
 * GoalsWidgetProps — Stage 5 will pass live data to this interface.
 * Do NOT modify this interface's type shape when connecting live data.
 */
export interface GoalsWidgetProps {
  /** Number of goals in 'active' status */
  activeCount: number;
  /** Number of goals in 'completed' status */
  completedCount: number;
  /** Aggregate progress percentage across numeric/percentage goals (0-100), or null if none */
  aggregateProgress: number | null;
  /** Optional callback to navigate to the Goals tab */
  onNavigate?: () => void;
}

interface GoalsWidgetInternalProps {
  data?: GoalsWidgetProps;
}

export function GoalsWidget({ data }: GoalsWidgetInternalProps) {
  if (!data) {
    return (
      <div data-testid="goals-widget" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Goals
        </h3>
        <div data-testid="goals-widget-placeholder" className="mt-3 text-center">
          <p className="text-3xl">&#127919;</p>
          <p className="mt-2 text-sm text-gray-500">
            Track financial, personal, and strategic goals. Create your first goal in the Goals tab to see progress here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="goals-widget" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Goals
      </h3>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <p data-testid="goals-active-count" className="text-2xl font-bold text-indigo-600">
            {data.activeCount}
          </p>
          <p className="text-xs text-gray-400">Active</p>
        </div>
        <div>
          <p data-testid="goals-completed-count" className="text-2xl font-bold text-green-600">
            {data.completedCount}
          </p>
          <p className="text-xs text-gray-400">Done</p>
        </div>
        <div>
          <p data-testid="goals-avg-progress" className="text-2xl font-bold text-purple-600">
            {data.aggregateProgress !== null ? `${data.aggregateProgress}%` : '--'}
          </p>
          <p className="text-xs text-gray-400">Avg Progress</p>
        </div>
      </div>
    </div>
  );
}
