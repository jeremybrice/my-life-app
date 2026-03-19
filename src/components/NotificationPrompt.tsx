import { useState } from 'react';
import {
  requestNotificationPermission,
  deferPermissionPrompt,
} from '@/data/notification-service';

interface NotificationPromptProps {
  onClose: () => void;
}

export function NotificationPrompt({ onClose }: NotificationPromptProps) {
  const [permissionResult, setPermissionResult] = useState<string | null>(null);

  async function handleEnable() {
    const result = await requestNotificationPermission();
    if (result === 'granted') {
      setPermissionResult('granted');
      setTimeout(onClose, 2000);
    } else if (result === 'denied') {
      setPermissionResult('denied');
    } else {
      setPermissionResult('unsupported');
    }
  }

  async function handleNotNow() {
    await deferPermissionPrompt();
    onClose();
  }

  if (permissionResult === 'granted') {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
        <div className="mx-4 mb-4 w-full max-w-md rounded-2xl bg-surface-card p-6 shadow-xl sm:mb-0">
          <div className="text-center">
            <p className="text-lg font-semibold text-green-700">
              Notifications enabled!
            </p>
            <p className="mt-1 text-sm text-fg-secondary">
              You will receive budget alerts and milestone reminders.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (permissionResult === 'denied') {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
        <div className="mx-4 mb-4 w-full max-w-md rounded-2xl bg-surface-card p-6 shadow-xl sm:mb-0">
          <div className="text-center">
            <p className="text-lg font-semibold text-amber-700">
              Notifications blocked
            </p>
            <p className="mt-2 text-sm text-fg-secondary">
              To enable notifications later, go to your browser settings and
              allow notifications for this site.
            </p>
            <button
              onClick={onClose}
              className="mt-4 rounded-lg bg-surface-tertiary px-4 py-2 text-sm font-medium text-fg-secondary hover:bg-surface-hover"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="mx-4 mb-4 w-full max-w-md rounded-2xl bg-surface-card p-6 shadow-xl sm:mb-0">
        <h2 className="text-lg font-semibold text-fg">
          Stay on top of your goals
        </h2>
        <p className="mt-2 text-sm text-fg-secondary">
          Get notified when your spending crosses budget thresholds and when
          important milestones are approaching. You can customize which alerts
          you receive in Settings.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            onClick={handleNotNow}
            className="rounded-lg border border-edge px-4 py-2 text-sm font-medium text-fg-secondary hover:bg-surface-hover"
          >
            Not Now
          </button>
          <button
            onClick={handleEnable}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Enable Notifications
          </button>
        </div>
      </div>
    </div>
  );
}
