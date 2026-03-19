import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { db } from '@/data/db';
import { useNotificationAlerts } from '@/hooks/useNotificationAlerts';

describe('useNotificationAlerts', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('should return empty alerts when no alerts exist', async () => {
    const { result } = renderHook(() => useNotificationAlerts());

    await waitFor(() => {
      expect(result.current.totalCount).toBe(0);
    });
    expect(result.current.alerts).toHaveLength(0);
    expect(result.current.budgetAlertCount).toBe(0);
    expect(result.current.dashboardAlertCount).toBe(0);
  });

  it('should return only non-dismissed alerts', async () => {
    await db.notificationAlerts.bulkPut([
      {
        id: 'active-1',
        type: 'budget-daily',
        title: 'Active',
        body: 'Active alert',
        timestamp: '2026-03-18T00:00:00Z',
        dismissed: false,
        screen: 'budget',
      },
      {
        id: 'dismissed-1',
        type: 'budget-monthly',
        title: 'Dismissed',
        body: 'Dismissed alert',
        timestamp: '2026-03-18T00:00:00Z',
        dismissed: true,
        screen: 'budget',
      },
    ]);

    const { result } = renderHook(() => useNotificationAlerts());

    await waitFor(() => {
      expect(result.current.totalCount).toBe(1);
    });
  });

  it('should separate budget and dashboard alert counts', async () => {
    await db.notificationAlerts.bulkPut([
      {
        id: 'budget-1',
        type: 'budget-daily',
        title: 'Budget',
        body: 'Budget alert',
        timestamp: '2026-03-18T00:00:00Z',
        dismissed: false,
        screen: 'budget',
      },
      {
        id: 'milestone-1',
        type: 'milestone',
        title: 'Milestone',
        body: 'Milestone alert',
        timestamp: '2026-03-18T00:00:00Z',
        dismissed: false,
        screen: 'dashboard',
      },
    ]);

    const { result } = renderHook(() => useNotificationAlerts());

    await waitFor(() => {
      expect(result.current.budgetAlertCount).toBe(1);
      expect(result.current.dashboardAlertCount).toBe(1);
      expect(result.current.totalCount).toBe(2);
    });
  });
});
