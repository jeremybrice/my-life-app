/**
 * HealthWidgetProps — Stage 5 will pass live data to this interface.
 * Do NOT modify this interface's type shape when connecting live data.
 */
export interface HealthWidgetProps {
  /** Number of routines completed today */
  routinesCompletedToday: number;
  /** Total number of active routines */
  totalRoutines: number;
  /** Number of routines on track for the week */
  onTrackCount: number;
  /** Number of routines behind for the week */
  behindCount: number;
  /** Longest active streak across all routines, or null if no streaks */
  bestStreak?: { weeks: number; routineName: string } | null;
  /** Optional callback to navigate to the Health tab */
  onNavigate?: () => void;
}

interface HealthWidgetInternalProps {
  data?: HealthWidgetProps;
}

export function HealthWidget({ data }: HealthWidgetInternalProps) {
  if (!data) {
    return (
      <div data-testid="health-widget" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Health Routines
        </h3>
        <div data-testid="health-widget-placeholder" className="mt-3 text-center">
          <p className="text-3xl">&#128170;</p>
          <p className="mt-2 text-sm text-gray-500">
            Build healthy habits with routine tracking. Define your first routine in the Health tab to see your progress here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="health-widget" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Health Routines
      </h3>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <p data-testid="health-completed-today" className="text-2xl font-bold text-green-600">
            {data.routinesCompletedToday}/{data.totalRoutines}
          </p>
          <p className="text-xs text-gray-400">Today</p>
        </div>
        <div>
          <p data-testid="health-weekly-status" className="text-2xl font-bold text-indigo-600">
            {data.onTrackCount}
          </p>
          <p className="text-xs text-gray-400">On Track</p>
        </div>
        <div>
          <p data-testid="health-best-streak" className="text-2xl font-bold text-amber-600">
            {data.bestStreak ? `${data.bestStreak.weeks}w` : '--'}
          </p>
          <p className="text-xs text-gray-400">Best Streak</p>
        </div>
      </div>
      {data.behindCount > 0 && (
        <p data-testid="health-behind-count" className="mt-2 text-center text-xs text-red-500">
          {data.behindCount} {data.behindCount === 1 ? 'routine' : 'routines'} behind this week
        </p>
      )}
    </div>
  );
}
