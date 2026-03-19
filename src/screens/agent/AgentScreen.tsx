import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export function AgentScreen() {
  const isOnline = useOnlineStatus();

  return (
    <div data-testid="agent-screen" className="p-4 pb-24">
      <h1 className="text-2xl font-bold text-gray-800">AI Agent</h1>
      {!isOnline ? (
        <div data-testid="agent-offline-message" className="mt-6 rounded-xl border border-yellow-200 bg-yellow-50 p-6 text-center">
          <p className="text-3xl">&#127760;</p>
          <p className="mt-2 text-lg font-semibold text-yellow-800">Internet Required</p>
          <p className="mt-1 text-sm text-yellow-600">
            The AI Agent needs an internet connection to process your requests.
            All other features work offline.
          </p>
        </div>
      ) : (
        <div data-testid="agent-placeholder" className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-3xl">&#129302;</p>
          <p className="mt-2 text-lg font-semibold text-gray-700">Coming Soon</p>
          <p className="mt-1 text-sm text-gray-500">
            Conversational expense entry with receipt scanning will be available in a future update.
          </p>
        </div>
      )}
    </div>
  );
}
