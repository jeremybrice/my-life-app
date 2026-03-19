import { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { daysBetweenInclusive, lifetimeProgress, today } from '../../lib/dates';

export function MilestoneCountdown() {
  const { settings, loading } = useSettings();
  const [currentDate, setCurrentDate] = useState(today());

  const recalculate = useCallback(() => {
    setCurrentDate(today());
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        recalculate();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [recalculate]);

  if (loading) {
    return (
      <div data-testid="countdown-loading" className="p-6 text-center">
        <p className="text-fg-muted">Loading...</p>
      </div>
    );
  }

  const birthDate = settings?.birthDate;
  const targetDate = settings?.targetDate;
  const label = settings?.targetDateLabel;

  // No dates configured
  if (!birthDate && !targetDate) {
    return (
      <div data-testid="countdown-unconfigured" className="rounded-2xl bg-surface-secondary p-6 text-center">
        <p className="text-lg font-semibold text-fg-secondary">Set Your Milestone</p>
        <p className="mt-2 text-sm text-fg-muted">
          Go to Settings to add your birth date and a target date to see your life countdown.
        </p>
      </div>
    );
  }

  // Only one date configured
  if (!birthDate || !targetDate) {
    return (
      <div data-testid="countdown-partial" className="rounded-2xl bg-surface-secondary p-6 text-center">
        <p className="text-lg font-semibold text-fg-secondary">Almost There</p>
        <p className="mt-2 text-sm text-fg-muted">
          Both a birth date and a target date are needed for the countdown. Check Settings.
        </p>
      </div>
    );
  }

  const daysCount = daysBetweenInclusive(currentDate, targetDate);
  const isTargetInPast = currentDate > targetDate;
  const isTargetToday = currentDate === targetDate;
  const progress = lifetimeProgress(birthDate, targetDate, currentDate);
  const progressPercent = Math.round(progress * 100);

  return (
    <div data-testid="countdown-display" className="rounded-2xl bg-gradient-to-br from-[#c76140] to-[#a8502f] p-6 text-white shadow-lg">
      {isTargetToday ? (
        <>
          <p className="text-center text-lg font-medium opacity-90">
            {label ? label : 'Your Milestone'}
          </p>
          <p data-testid="countdown-number" className="mt-2 text-center text-5xl font-bold">
            Today!
          </p>
          <p className="mt-1 text-center text-sm opacity-80">
            Milestone day has arrived
          </p>
        </>
      ) : isTargetInPast ? (
        <>
          <p className="text-center text-lg font-medium opacity-90">
            {label ? label : 'Milestone'}
          </p>
          <p data-testid="countdown-reached" className="mt-2 text-center text-sm opacity-80">
            Milestone reached
          </p>
          <p data-testid="countdown-number" className="mt-1 text-center text-5xl font-bold">
            {daysCount}
          </p>
          <p className="mt-1 text-center text-sm opacity-80">
            {daysCount === 1 ? 'day ago' : 'days ago'}
          </p>
        </>
      ) : (
        <>
          <p className="text-center text-lg font-medium opacity-90">
            {label ? label : 'Countdown'}
          </p>
          <p data-testid="countdown-number" className="mt-2 text-center text-5xl font-bold">
            {daysCount.toLocaleString()}
          </p>
          <p className="mt-1 text-center text-sm opacity-80">
            {daysCount === 1 ? 'day remaining' : 'days remaining'}
          </p>
        </>
      )}

      {/* Progress indicator */}
      <div className="mt-4">
        <div className="flex justify-between text-xs opacity-70">
          <span>Birth</span>
          <span>Today</span>
          <span>Target</span>
        </div>
        <div className="relative mt-1 h-2 overflow-hidden rounded-full bg-white/20">
          <div
            data-testid="countdown-progress"
            className="h-full rounded-full bg-white/80 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="mt-1 text-center text-xs opacity-60">
          {progressPercent}% of the journey
        </p>
      </div>
    </div>
  );
}
