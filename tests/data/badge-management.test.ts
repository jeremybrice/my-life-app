import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/data/db';
import {
  updateBadgeCount,
  clearBadgeForScreen,
  getActiveAlertCount,
  detectCapabilities,
} from '@/data/notification-service';

describe('badge management', () => {
  let mockSetAppBadge: ReturnType<typeof vi.fn>;
  let mockClearAppBadge: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    await db.delete();
    await db.open();

    mockSetAppBadge = vi.fn().mockResolvedValue(undefined);
    mockClearAppBadge = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(navigator, 'setAppBadge', {
      value: mockSetAppBadge,
      configurable: true,
    });
    Object.defineProperty(navigator, 'clearAppBadge', {
      value: mockClearAppBadge,
      configurable: true,
    });

    detectCapabilities();
  });

  it('should set badge count to number of active alerts', async () => {
    await db.notificationAlerts.bulkPut([
      {
        id: 'alert-1',
        type: 'budget-daily',
        title: 'Test 1',
        body: 'Test body',
        timestamp: '2026-03-18T00:00:00Z',
        dismissed: false,
        screen: 'budget',
      },
      {
        id: 'alert-2',
        type: 'milestone',
        title: 'Test 2',
        body: 'Test body',
        timestamp: '2026-03-18T00:00:00Z',
        dismissed: false,
        screen: 'dashboard',
      },
    ]);

    await updateBadgeCount();
    expect(mockSetAppBadge).toHaveBeenCalledWith(2);
  });

  it('should clear badge when no active alerts', async () => {
    await updateBadgeCount();
    expect(mockClearAppBadge).toHaveBeenCalled();
  });

  it('should dismiss alerts for budget screen and update badge', async () => {
    await db.notificationAlerts.bulkPut([
      {
        id: 'budget-alert',
        type: 'budget-daily',
        title: 'Budget',
        body: 'Over budget',
        timestamp: '2026-03-18T00:00:00Z',
        dismissed: false,
        screen: 'budget',
      },
      {
        id: 'milestone-alert',
        type: 'milestone',
        title: 'Milestone',
        body: '30 days',
        timestamp: '2026-03-18T00:00:00Z',
        dismissed: false,
        screen: 'dashboard',
      },
    ]);

    await clearBadgeForScreen('budget');

    const budgetAlert = await db.notificationAlerts.get('budget-alert');
    expect(budgetAlert?.dismissed).toBe(true);

    const milestoneAlert = await db.notificationAlerts.get('milestone-alert');
    expect(milestoneAlert?.dismissed).toBe(false);

    expect(mockSetAppBadge).toHaveBeenCalledWith(1);
  });

  it('should get accurate active alert count', async () => {
    await db.notificationAlerts.bulkPut([
      {
        id: 'active',
        type: 'budget-daily',
        title: 'Active',
        body: 'Active',
        timestamp: '2026-03-18T00:00:00Z',
        dismissed: false,
        screen: 'budget',
      },
      {
        id: 'dismissed',
        type: 'budget-monthly',
        title: 'Dismissed',
        body: 'Dismissed',
        timestamp: '2026-03-18T00:00:00Z',
        dismissed: true,
        screen: 'budget',
      },
    ]);

    const count = await getActiveAlertCount();
    expect(count).toBe(1);
  });

  it('should silently skip when badge API is not supported', async () => {
    // Remove badge API
    const desc = Object.getOwnPropertyDescriptor(navigator, 'setAppBadge');
    Object.defineProperty(navigator, 'setAppBadge', {
      value: undefined,
      configurable: true,
    });
    detectCapabilities();

    // Should not throw
    await expect(updateBadgeCount()).resolves.not.toThrow();

    // Restore
    if (desc) {
      Object.defineProperty(navigator, 'setAppBadge', desc);
    }
  });
});
