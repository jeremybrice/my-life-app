import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/data/db';
import { SETTINGS_ID } from '@/lib/constants';
import { checkMilestoneCountdown, detectCapabilities } from '@/data/notification-service';
import * as dates from '@/lib/dates';

describe('milestone countdown alerts', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();

    detectCapabilities();
  });

  it('should fire 30-day countdown notification', async () => {
    vi.spyOn(dates, 'today').mockReturnValue('2026-03-18');

    await db.settings.put({
      id: SETTINGS_ID,
      targetDate: '2026-04-17',
      targetDateLabel: 'Retirement',
      notificationPreferences: {
        masterEnabled: true,
        dailyOverspend: false,
        monthlyThresholds: [],
        milestoneIntervals: [
          { days: 30, enabled: true },
          { days: 7, enabled: true },
          { days: 1, enabled: true },
        ],
      },
    });

    await checkMilestoneCountdown();
    const alerts = await db.notificationAlerts.toArray();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].title).toBe('Retirement Countdown');
    expect(alerts[0].body).toContain('30 days');
  });

  it('should fire 1-day countdown with motivational message', async () => {
    vi.spyOn(dates, 'today').mockReturnValue('2026-04-16');

    await db.settings.put({
      id: SETTINGS_ID,
      targetDate: '2026-04-17',
      targetDateLabel: 'Launch Day',
      notificationPreferences: {
        masterEnabled: true,
        dailyOverspend: false,
        monthlyThresholds: [],
        milestoneIntervals: [
          { days: 1, enabled: true },
        ],
      },
    });

    await checkMilestoneCountdown();
    const alerts = await db.notificationAlerts.toArray();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].body).toContain('Tomorrow is the day');
  });

  it('should fire each interval only once', async () => {
    vi.spyOn(dates, 'today').mockReturnValue('2026-03-18');

    await db.settings.put({
      id: SETTINGS_ID,
      targetDate: '2026-04-17',
      targetDateLabel: 'Goal',
      notificationPreferences: {
        masterEnabled: true,
        dailyOverspend: false,
        monthlyThresholds: [],
        milestoneIntervals: [{ days: 30, enabled: true }],
      },
    });

    await checkMilestoneCountdown();
    await checkMilestoneCountdown(); // second call

    const alerts = await db.notificationAlerts.toArray();
    expect(alerts).toHaveLength(1);
  });

  it('should not fire for past target date', async () => {
    vi.spyOn(dates, 'today').mockReturnValue('2026-03-18');

    await db.settings.put({
      id: SETTINGS_ID,
      targetDate: '2026-03-13',
      targetDateLabel: 'Past Event',
      notificationPreferences: {
        masterEnabled: true,
        dailyOverspend: false,
        monthlyThresholds: [],
        milestoneIntervals: [{ days: 30, enabled: true }],
      },
    });

    await checkMilestoneCountdown();
    const alerts = await db.notificationAlerts.toArray();
    expect(alerts).toHaveLength(0);
  });

  it('should not fire for disabled intervals', async () => {
    vi.spyOn(dates, 'today').mockReturnValue('2026-03-18');

    await db.settings.put({
      id: SETTINGS_ID,
      targetDate: '2026-03-25',
      targetDateLabel: 'Deadline',
      notificationPreferences: {
        masterEnabled: true,
        dailyOverspend: false,
        monthlyThresholds: [],
        milestoneIntervals: [{ days: 7, enabled: false }],
      },
    });

    await checkMilestoneCountdown();
    const alerts = await db.notificationAlerts.toArray();
    expect(alerts).toHaveLength(0);
  });

  it('should not fire when no target date configured', async () => {
    vi.spyOn(dates, 'today').mockReturnValue('2026-03-18');

    await db.settings.put({
      id: SETTINGS_ID,
      notificationPreferences: {
        masterEnabled: true,
        dailyOverspend: false,
        monthlyThresholds: [],
        milestoneIntervals: [{ days: 30, enabled: true }],
      },
    });

    await checkMilestoneCountdown();
    const alerts = await db.notificationAlerts.toArray();
    expect(alerts).toHaveLength(0);
  });

  it('should use default label when targetDateLabel is empty', async () => {
    vi.spyOn(dates, 'today').mockReturnValue('2026-03-18');

    await db.settings.put({
      id: SETTINGS_ID,
      targetDate: '2026-04-17',
      notificationPreferences: {
        masterEnabled: true,
        dailyOverspend: false,
        monthlyThresholds: [],
        milestoneIntervals: [{ days: 30, enabled: true }],
      },
    });

    await checkMilestoneCountdown();
    const alerts = await db.notificationAlerts.toArray();
    expect(alerts[0].title).toBe('Your Milestone Countdown');
  });
});
