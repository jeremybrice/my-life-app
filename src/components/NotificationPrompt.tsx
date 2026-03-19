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
        <div className="mx-4 mb-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:mb-0">
          <div className="text-center">
            <p className="text-lg font-semibold text-green-700">
              Notifications enabled!
            </p>
            <p className="mt-1 text-sm text-gray-600">
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
        <div className="mx-4 mb-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:mb-0">
          <div className="text-center">
            <p className="text-lg font-semibold text-amber-700">
              Notifications blocked
            </p>
            <p className="mt-2 text-sm text-gray-600">
              To enable notifications later, go to your browser settings and
              allow notifications for this site.
            </p>
            <button
              onClick={onClose}
              className="mt-4 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
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
      <div className="mx-4 mb-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:mb-0">
        <h2 className="text-lg font-semibold text-gray-900">
          Stay on top of your goals
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Get notified when your spending crosses budget thresholds and when
          important milestones are approaching. You can customize which alerts
          you receive in Settings.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            onClick={handleNotNow}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Not Now
          </button>
          <button
            onClick={handleEnable}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Enable Notifications
          </button>
        </div>
      </div>
    </div>
  );
}
