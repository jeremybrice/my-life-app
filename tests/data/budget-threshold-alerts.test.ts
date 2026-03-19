import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/data/db';
import { SETTINGS_ID } from '@/lib/constants';
import { checkBudgetThresholds, detectCapabilities } from '@/data/notification-service';
import * as dates from '@/lib/dates';

describe('budget threshold alerts', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();

    // Mock dates
    vi.spyOn(dates, 'currentYearMonth').mockReturnValue('2026-03');
    vi.spyOn(dates, 'today').mockReturnValue('2026-03-18');

    // No push support in test env
    detectCapabilities();

    // Default settings with notifications enabled
    await db.settings.put({
      id: SETTINGS_ID,
      monthlyBudget: 1000,
      dailyBudget: 50,
      notificationPreferences: {
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
      },
    });

    // Budget month
    await db.budgetMonths.put({
      yearMonth: '2026-03',
      monthlyAmount: 1000,
      dailyAllowance: 50,
      carryOver: 0,
      additionalFunds: 0,
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    });
  });

  it('should fire daily overspend when today total exceeds daily allowance', async () => {
    await db.expenses.bulkPut([
      {
        id: 1,
        yearMonth: '2026-03',
        date: '2026-03-18',
        vendor: 'Coffee Shop',
        amount: 30,
        createdAt: '2026-03-18T08:00:00Z',
        updatedAt: '2026-03-18T08:00:00Z',
      },
      {
        id: 2,
        yearMonth: '2026-03',
        date: '2026-03-18',
        vendor: 'Lunch',
        amount: 25,
        createdAt: '2026-03-18T12:00:00Z',
        updatedAt: '2026-03-18T12:00:00Z',
      },
    ]);

    await checkBudgetThresholds();
    const alerts = await db.notificationAlerts.toArray();
    const dailyAlert = alerts.find(a => a.type === 'budget-daily');
    expect(dailyAlert).toBeDefined();
    expect(dailyAlert!.title).toBe('Daily Budget Exceeded');
  });

  it('should not fire daily overspend when under budget', async () => {
    await db.expenses.put({
      id: 1,
      yearMonth: '2026-03',
      date: '2026-03-18',
      vendor: 'Coffee',
      amount: 5,
      createdAt: '2026-03-18T08:00:00Z',
      updatedAt: '2026-03-18T08:00:00Z',
    });

    await checkBudgetThresholds();
    const alerts = await db.notificationAlerts.toArray();
    expect(alerts.filter(a => a.type === 'budget-daily')).toHaveLength(0);
  });

  it('should fire daily overspend only once per day', async () => {
    await db.expenses.put({
      id: 1,
      yearMonth: '2026-03',
      date: '2026-03-18',
      vendor: 'Expensive',
      amount: 60,
      createdAt: '2026-03-18T08:00:00Z',
      updatedAt: '2026-03-18T08:00:00Z',
    });

    await checkBudgetThresholds();
    await checkBudgetThresholds(); // second call

    const alerts = await db.notificationAlerts.toArray();
    expect(alerts.filter(a => a.type === 'budget-daily')).toHaveLength(1);
  });

  it('should fire monthly 80% threshold when crossed', async () => {
    await db.expenses.put({
      id: 1,
      yearMonth: '2026-03',
      date: '2026-03-18',
      vendor: 'Big Purchase',
      amount: 810,
      createdAt: '2026-03-18T08:00:00Z',
      updatedAt: '2026-03-18T08:00:00Z',
    });

    await checkBudgetThresholds();
    const alerts = await db.notificationAlerts.toArray();
    const monthlyAlert = alerts.find(a => a.id === 'budget-monthly-80-2026-03');
    expect(monthlyAlert).toBeDefined();
    expect(monthlyAlert!.title).toContain('80%');
  });

  it('should fire multiple monthly thresholds when all crossed at once', async () => {
    await db.expenses.put({
      id: 1,
      yearMonth: '2026-03',
      date: '2026-03-18',
      vendor: 'Huge Purchase',
      amount: 1050,
      createdAt: '2026-03-18T08:00:00Z',
      updatedAt: '2026-03-18T08:00:00Z',
    });

    await checkBudgetThresholds();
    const alerts = await db.notificationAlerts.toArray();
    const monthlyAlerts = alerts.filter(a => a.type === 'budget-monthly');
    expect(monthlyAlerts).toHaveLength(3); // 80%, 90%, 100%
  });

  it('should not fire disabled thresholds', async () => {
    await db.settings.update(SETTINGS_ID, {
      notificationPreferences: {
        masterEnabled: true,
        dailyOverspend: true,
        monthlyThresholds: [
          { percentage: 80, enabled: false },
          { percentage: 90, enabled: true },
          { percentage: 100, enabled: true },
        ],
        milestoneIntervals: [],
      },
    });

    await db.expenses.put({
      id: 1,
      yearMonth: '2026-03',
      date: '2026-03-18',
      vendor: 'Purchase',
      amount: 850,
      createdAt: '2026-03-18T08:00:00Z',
      updatedAt: '2026-03-18T08:00:00Z',
    });

    await checkBudgetThresholds();
    const alerts = await db.notificationAlerts.toArray();
    expect(alerts.find(a => a.id === 'budget-monthly-80-2026-03')).toBeUndefined();
    expect(alerts.find(a => a.id === 'budget-monthly-90-2026-03')).toBeUndefined(); // 850 < 900
  });

  it('should not fire when master toggle is off', async () => {
    await db.settings.update(SETTINGS_ID, {
      notificationPreferences: {
        masterEnabled: false,
        dailyOverspend: true,
        monthlyThresholds: [
          { percentage: 80, enabled: true },
        ],
        milestoneIntervals: [],
      },
    });

    await db.expenses.put({
      id: 1,
      yearMonth: '2026-03',
      date: '2026-03-18',
      vendor: 'Purchase',
      amount: 900,
      createdAt: '2026-03-18T08:00:00Z',
      updatedAt: '2026-03-18T08:00:00Z',
    });

    await checkBudgetThresholds();
    const alerts = await db.notificationAlerts.toArray();
    expect(alerts).toHaveLength(0);
  });
});
