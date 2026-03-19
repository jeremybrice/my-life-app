import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/data/db';
import { dismissAlert } from '@/data/notification-service';
import type { NotificationAlert } from '@/lib/types';

export function useNotificationAlerts() {
  const alerts = useLiveQuery(
    () => db.notificationAlerts.toArray().then(
      all => all.filter(a => !a.dismissed)
    ),
    [],
    [] as NotificationAlert[]
  );

  const budgetAlertCount = alerts.filter(a => a.screen === 'budget').length;
  const dashboardAlertCount = alerts.filter(a => a.screen === 'dashboard').length;

  return {
    alerts,
    budgetAlertCount,
    dashboardAlertCount,
    totalCount: alerts.length,
    dismiss: async (alertId: string) => {
      await dismissAlert(alertId);
    },
  };
}
