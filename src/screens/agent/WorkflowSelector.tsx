import { useNavigate } from 'react-router';
import { PIPELINES } from './pipelines';

const ICON_MAP: Record<string, string> = {
  receipt: '\uD83E\uDDFE',
  chart: '\uD83D\uDCCA',
  heart: '\u2764\uFE0F',
  target: '\uD83C\uDFAF',
};

export function WorkflowSelector() {
  const navigate = useNavigate();

  return (
    <div
      className="animate-fade-in flex flex-col items-center px-4 pb-24 pt-8"
      data-testid="workflow-selector"
    >
      <h1 className="text-2xl font-semibold text-accent">How can I help?</h1>
      <p className="mt-2 text-sm text-fg-muted">Select a workflow to get started.</p>

      <div className="mt-8 grid w-full max-w-lg grid-cols-2 gap-4">
        {PIPELINES.map((pipeline) => (
          <button
            key={pipeline.id}
            type="button"
            onClick={() => navigate(`/agent/${pipeline.id}`)}
            className="flex flex-col items-center rounded-xl border border-edge bg-surface-card p-5 text-center shadow-sm transition-colors hover:bg-surface-hover active:bg-surface-tertiary"
            data-testid={`workflow-card-${pipeline.id}`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-2xl">
              {ICON_MAP[pipeline.icon] ?? '\u2728'}
            </div>
            <h3 className="mt-3 text-sm font-bold text-fg">{pipeline.title}</h3>
            <p className="mt-1 text-xs text-fg-muted leading-relaxed">
              {pipeline.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
