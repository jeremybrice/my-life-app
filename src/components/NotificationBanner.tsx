import type { NotificationAlert } from '@/lib/types';

interface NotificationBannerProps {
  alerts: NotificationAlert[];
  onDismiss: (alertId: string) => void;
}

export function NotificationBanner({ alerts, onDismiss }: NotificationBannerProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {alerts.map(alert => (
        <div
          key={alert.id}
          className={`flex items-start justify-between rounded-lg border p-3 ${
            alert.type === 'milestone'
              ? 'border-blue-200 bg-blue-50'
              : 'border-amber-200 bg-amber-50'
          }`}
          role="alert"
        >
          <div className="min-w-0 flex-1">
            <p
              className={`text-sm font-semibold ${
                alert.type === 'milestone'
                  ? 'text-blue-800'
                  : 'text-amber-800'
              }`}
            >
              {alert.title}
            </p>
            <p
              className={`mt-0.5 text-sm ${
                alert.type === 'milestone'
                  ? 'text-blue-700'
                  : 'text-amber-700'
              }`}
            >
              {alert.body}
            </p>
          </div>
          <button
            onClick={() => onDismiss(alert.id)}
            className={`ml-2 flex-shrink-0 rounded p-1 ${
              alert.type === 'milestone'
                ? 'text-blue-400 hover:bg-blue-100 hover:text-blue-600'
                : 'text-amber-400 hover:bg-amber-100 hover:text-amber-600'
            }`}
            aria-label={`Dismiss ${alert.title}`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
