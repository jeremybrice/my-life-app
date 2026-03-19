import { useState, useCallback } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { getCapabilities } from '@/data/notification-service';
import type { NotificationPreferences } from '@/lib/types';

const DEFAULT_PREFS: NotificationPreferences = {
  masterEnabled: true,
  dailyOverspend: true,
  monthlyThresholds: [
    { percentage: 80, enabled: true },
    { percentage: 90, enabled: true },
    { percentage: 100, enabled: true },
  ],
  milestoneIntervals: [
    { days: 30, enabled: true },
    { days: 7, enabled: true },
    { days: 1, enabled: true },
  ],
};

export function NotificationSettings() {
  const { settings, save } = useSettings();
  const capabilities = getCapabilities();
  const prefs = settings?.notificationPreferences ?? DEFAULT_PREFS;

  const [newThreshold, setNewThreshold] = useState('');
  const [newInterval, setNewInterval] = useState('');
  const [thresholdError, setThresholdError] = useState('');
  const [intervalError, setIntervalError] = useState('');

  const savePrefs = useCallback(
    async (updated: NotificationPreferences) => {
      await save({ notificationPreferences: updated });
    },
    [save]
  );

  function handleMasterToggle() {
    savePrefs({ ...prefs, masterEnabled: !prefs.masterEnabled });
  }

  function handleDailyOverspendToggle() {
    savePrefs({ ...prefs, dailyOverspend: !prefs.dailyOverspend });
  }

  function handleThresholdToggle(index: number) {
    const updated = [...prefs.monthlyThresholds];
    updated[index] = { ...updated[index]!, enabled: !updated[index]!.enabled };
    savePrefs({ ...prefs, monthlyThresholds: updated });
  }

  function handleRemoveThreshold(index: number) {
    const updated = prefs.monthlyThresholds.filter((_, i) => i !== index);
    savePrefs({ ...prefs, monthlyThresholds: updated });
  }

  function handleAddThreshold() {
    setThresholdError('');
    const value = parseInt(newThreshold, 10);
    if (isNaN(value) || value < 1 || value > 200) {
      setThresholdError('Percentage must be between 1 and 200.');
      return;
    }
    if (prefs.monthlyThresholds.some(t => t.percentage === value)) {
      setThresholdError('This threshold already exists.');
      return;
    }
    const updated = [...prefs.monthlyThresholds, { percentage: value, enabled: true }];
    updated.sort((a, b) => a.percentage - b.percentage);
    savePrefs({ ...prefs, monthlyThresholds: updated });
    setNewThreshold('');
  }

  function handleIntervalToggle(index: number) {
    const updated = [...prefs.milestoneIntervals];
    updated[index] = { ...updated[index]!, enabled: !updated[index]!.enabled };
    savePrefs({ ...prefs, milestoneIntervals: updated });
  }

  function handleRemoveInterval(index: number) {
    const updated = prefs.milestoneIntervals.filter((_, i) => i !== index);
    savePrefs({ ...prefs, milestoneIntervals: updated });
  }

  function handleAddInterval() {
    setIntervalError('');
    const value = parseInt(newInterval, 10);
    if (isNaN(value) || value < 1) {
      setIntervalError('Interval must be a positive whole number.');
      return;
    }
    if (prefs.milestoneIntervals.some(i => i.days === value)) {
      setIntervalError('This interval already exists.');
      return;
    }
    const updated = [...prefs.milestoneIntervals, { days: value, enabled: true }];
    updated.sort((a, b) => b.days - a.days);
    savePrefs({ ...prefs, milestoneIntervals: updated });
    setNewInterval('');
  }

  const isDisabled = !prefs.masterEnabled;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-fg">Notifications</h2>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={prefs.masterEnabled}
            onChange={handleMasterToggle}
            className="peer sr-only"
            aria-label="Enable all notifications"
          />
          <div className="peer h-6 w-11 rounded-full bg-surface-tertiary after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-edge after:bg-white after:transition-all after:content-[''] peer-checked:bg-accent peer-checked:after:translate-x-full peer-checked:after:border-white" />
        </label>
      </div>

      {capabilities.permissionState === 'denied' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-800">
            Notification permission has been denied. To receive push
            notifications, enable them in your browser settings for this site.
            In-app alerts will still appear on the dashboard.
          </p>
        </div>
      )}
      {capabilities.permissionState === 'default' && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-sm text-blue-800">
            Notification permission has not been requested yet. You will be
            prompted to enable notifications after using the app.
          </p>
        </div>
      )}
      {capabilities.permissionState === 'unsupported' && (
        <div className="rounded-lg border border-edge bg-surface-secondary p-3">
          <p className="text-sm text-fg-secondary">
            Push notifications are not supported in this browser. Alerts will
            appear as banners on the dashboard instead.
          </p>
        </div>
      )}

      <div className={isDisabled ? 'opacity-50 pointer-events-none' : ''}>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fg-muted">
          Budget Alerts
        </h3>

        <div className="flex items-center justify-between rounded-lg bg-surface-secondary p-3">
          <div>
            <p className="text-sm font-medium text-fg">
              Daily Overspend
            </p>
            <p className="text-xs text-fg-muted">
              Alert when daily spending exceeds allowance
            </p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={prefs.dailyOverspend}
              onChange={handleDailyOverspendToggle}
              className="peer sr-only"
              aria-label="Enable daily overspend alerts"
            />
            <div className="peer h-6 w-11 rounded-full bg-surface-tertiary after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-edge after:bg-white after:transition-all after:content-[''] peer-checked:bg-accent peer-checked:after:translate-x-full peer-checked:after:border-white" />
          </label>
        </div>

        <div className="mt-3 space-y-2">
          <p className="text-sm font-medium text-fg-secondary">
            Monthly Thresholds
          </p>
          {prefs.monthlyThresholds.map((threshold, index) => (
            <div
              key={threshold.percentage}
              className="flex items-center justify-between rounded-lg bg-surface-secondary p-3"
            >
              <span className="text-sm text-fg">
                {threshold.percentage}% of monthly budget
              </span>
              <div className="flex items-center gap-2">
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={threshold.enabled}
                    onChange={() => handleThresholdToggle(index)}
                    className="peer sr-only"
                    aria-label={`Enable ${threshold.percentage}% threshold`}
                  />
                  <div className="peer h-6 w-11 rounded-full bg-surface-tertiary after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-edge after:bg-white after:transition-all after:content-[''] peer-checked:bg-accent peer-checked:after:translate-x-full peer-checked:after:border-white" />
                </label>
                <button
                  onClick={() => handleRemoveThreshold(index)}
                  className="rounded p-1 text-fg-muted hover:bg-surface-hover hover:text-fg-secondary"
                  aria-label={`Remove ${threshold.percentage}% threshold`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="200"
              value={newThreshold}
              onChange={e => setNewThreshold(e.target.value)}
              placeholder="Add %"
              className="w-24 rounded-lg border border-edge px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              aria-label="New threshold percentage"
            />
            <button
              onClick={handleAddThreshold}
              className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            >
              Add
            </button>
          </div>
          {thresholdError && (
            <p className="text-xs text-red-600" role="alert">{thresholdError}</p>
          )}
        </div>
      </div>

      <div className={isDisabled ? 'opacity-50 pointer-events-none' : ''}>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fg-muted">
          Milestone Alerts
        </h3>

        <div className="space-y-2">
          {prefs.milestoneIntervals.map((interval, index) => (
            <div
              key={interval.days}
              className="flex items-center justify-between rounded-lg bg-surface-secondary p-3"
            >
              <span className="text-sm text-fg">
                {interval.days} {interval.days === 1 ? 'day' : 'days'} before
              </span>
              <div className="flex items-center gap-2">
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={interval.enabled}
                    onChange={() => handleIntervalToggle(index)}
                    className="peer sr-only"
                    aria-label={`Enable ${interval.days}-day interval`}
                  />
                  <div className="peer h-6 w-11 rounded-full bg-surface-tertiary after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-edge after:bg-white after:transition-all after:content-[''] peer-checked:bg-accent peer-checked:after:translate-x-full peer-checked:after:border-white" />
                </label>
                <button
                  onClick={() => handleRemoveInterval(index)}
                  className="rounded p-1 text-fg-muted hover:bg-surface-hover hover:text-fg-secondary"
                  aria-label={`Remove ${interval.days}-day interval`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              value={newInterval}
              onChange={e => setNewInterval(e.target.value)}
              placeholder="Days"
              className="w-24 rounded-lg border border-edge px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              aria-label="New milestone interval in days"
            />
            <button
              onClick={handleAddInterval}
              className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            >
              Add
            </button>
          </div>
          {intervalError && (
            <p className="text-xs text-red-600" role="alert">{intervalError}</p>
          )}
        </div>
      </div>
    </section>
  );
}
