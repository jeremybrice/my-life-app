export interface GoalsWidgetProps {
  activeCount: number;
  completedCount: number;
  aggregateProgress: number | null;
  criticalCount: number;
  warningCount: number;
  normalCount: number;
  onNavigate?: () => void;
}

interface GoalsWidgetInternalProps {
  data?: GoalsWidgetProps;
}

export function GoalsWidget({ data }: GoalsWidgetInternalProps) {
  if (!data) {
    return (
      <div data-testid="goals-widget" className="rounded-xl border border-edge bg-surface-card p-4 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-fg-muted">
          Targets
        </h3>
        <div data-testid="goals-widget-placeholder" className="mt-3 text-center">
          <p className="text-3xl">&#127919;</p>
          <p className="mt-2 text-sm text-fg-muted">
            Track financial, personal, and strategic targets. Create your first target in the Targets tab to see progress here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="goals-widget" className="rounded-xl border border-edge bg-surface-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-fg-muted">
        Targets
      </h3>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <p data-testid="targets-critical-count" className="text-2xl font-bold text-danger-600">
            {data.criticalCount}
          </p>
          <p className="text-xs text-fg-muted">Urgent</p>
        </div>
        <div>
          <p data-testid="targets-warning-count" className="text-2xl font-bold text-warning-600">
            {data.warningCount}
          </p>
          <p className="text-xs text-fg-muted">Soon</p>
        </div>
        <div>
          <p data-testid="targets-normal-count" className="text-2xl font-bold text-success-600">
            {data.normalCount}
          </p>
          <p className="text-xs text-fg-muted">On Track</p>
        </div>
      </div>
      {data.completedCount > 0 && (
        <p className="mt-2 text-center text-xs text-fg-muted">
          {data.completedCount} completed
        </p>
      )}
    </div>
  );
}
