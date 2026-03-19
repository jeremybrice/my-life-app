import { useState, useEffect } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorState } from '@/components/ErrorState';
import { roundCurrency } from '@/lib/currency';
import { ExportButton } from './ExportButton';
import { ImportButton } from './ImportButton';
import { NotificationSettings } from './NotificationSettings';

export function SettingsScreen() {
  const { settings, loading, error, save } = useSettings();

  // Form state
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [birthDate, setBirthDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [targetDateLabel, setTargetDateLabel] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState('');

  // UI state
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  // Populate form when settings load
  useEffect(() => {
    if (settings) {
      setApiKey(settings.apiKey ?? '');
      setBirthDate(settings.birthDate ?? '');
      setTargetDate(settings.targetDate ?? '');
      setTargetDateLabel(settings.targetDateLabel ?? '');
      setMonthlyBudget(
        settings.monthlyBudget !== undefined ? String(settings.monthlyBudget) : ''
      );
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage('');
    setSaveError('');

    try {
      await save({
        apiKey: apiKey || undefined,
        birthDate: birthDate || undefined,
        targetDate: targetDate || undefined,
        targetDateLabel: targetDateLabel || undefined,
        monthlyBudget: monthlyBudget && !isNaN(parseFloat(monthlyBudget)) ? roundCurrency(parseFloat(monthlyBudget)) : undefined,
      });
      setSaveMessage('Settings saved successfully');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Failed to save settings'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading settings..." />;
  }

  if (error) {
    return <ErrorState message={error.message} />;
  }

  const todayStr = new Date().toISOString().split('T')[0]!;

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-fg mb-6">
        Settings
      </h2>

      <div className="space-y-8">
        {/* AI Configuration */}
        <section className="rounded-xl bg-surface-card shadow-sm border border-edge p-6">
          <h3 className="text-lg font-semibold text-fg mb-4">
            AI Configuration
          </h3>
          <div>
            <label
              htmlFor="apiKey"
              className="block text-sm font-medium text-fg-secondary mb-1"
            >
              Claude API Key
            </label>
            <div className="relative">
              <input
                id="apiKey"
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="w-full px-3 py-2 pr-20 rounded-lg border border-edge bg-surface-card text-fg placeholder-fg-muted focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium text-fg-secondary hover:text-fg transition-colors"
                aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
              >
                {showApiKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="mt-1 text-xs text-fg-muted">
              Stored locally on your device. Never sent anywhere except directly to the Claude API.
            </p>
          </div>
        </section>

        {/* Life Milestone */}
        <section className="rounded-xl bg-surface-card shadow-sm border border-edge p-6">
          <h3 className="text-lg font-semibold text-fg mb-4">
            Life Milestone
          </h3>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="birthDate"
                className="block text-sm font-medium text-fg-secondary mb-1"
              >
                Birth Date
              </label>
              <input
                id="birthDate"
                type="date"
                value={birthDate}
                max={todayStr}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-edge bg-surface-card text-fg focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-colors"
              />
            </div>
            <div>
              <label
                htmlFor="targetDate"
                className="block text-sm font-medium text-fg-secondary mb-1"
              >
                Target Date
              </label>
              <input
                id="targetDate"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-edge bg-surface-card text-fg focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-colors"
              />
            </div>
            <div>
              <label
                htmlFor="targetDateLabel"
                className="block text-sm font-medium text-fg-secondary mb-1"
              >
                Target Date Label
              </label>
              <input
                id="targetDateLabel"
                type="text"
                value={targetDateLabel}
                onChange={(e) => setTargetDateLabel(e.target.value)}
                placeholder="e.g., Financial Freedom, Retirement"
                className="w-full px-3 py-2 rounded-lg border border-edge bg-surface-card text-fg placeholder-fg-muted focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-colors"
              />
            </div>
          </div>
        </section>

        {/* Budget Configuration */}
        <section className="rounded-xl bg-surface-card shadow-sm border border-edge p-6">
          <h3 className="text-lg font-semibold text-fg mb-4">
            Budget Configuration
          </h3>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="monthlyBudget"
                className="block text-sm font-medium text-fg-secondary mb-1"
              >
                Monthly Budget ($)
              </label>
              <input
                id="monthlyBudget"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg border border-edge bg-surface-card text-fg placeholder-fg-muted focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-colors"
              />
            </div>
          </div>
        </section>

        {/* Save button + messages */}
        <div className="flex flex-col items-stretch gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-accent text-white font-medium rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>

          {saveMessage && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm text-center" role="status">
              {saveMessage}
            </div>
          )}

          {saveError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm text-center" role="alert">
              {saveError}
            </div>
          )}
        </div>

        {/* Notification Settings */}
        <section className="rounded-xl bg-surface-card shadow-sm border border-edge p-6">
          <NotificationSettings />
        </section>

        {/* Data Management */}
        <section className="rounded-xl bg-surface-card shadow-sm border border-edge p-6">
          <h3 className="text-lg font-semibold text-fg mb-4">
            Data Management
          </h3>
          <div className="space-y-3">
            <ExportButton />
            <ImportButton />
          </div>
        </section>

        {/* Version */}
        <p className="text-center text-xs text-fg-muted pb-4">
          Version 0.2
        </p>
      </div>
    </div>
  );
}
