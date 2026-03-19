export function AgentScreen() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
        AI Agent
      </h2>
      <div className="rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <p className="text-slate-500 dark:text-slate-400">
          Chat with your AI assistant to log expenses by text or receipt photo. Requires an internet connection and API key configured in Settings.
        </p>
      </div>
    </div>
  );
}
