import { useEffect } from 'react';
import { MilestoneCountdown } from './MilestoneCountdown';
import { DailyBudgetCard } from './DailyBudgetCard';
import { GoalsWidgetContainer } from './GoalsWidgetContainer';
import { HealthWidgetContainer } from './HealthWidgetContainer';
import { useNotificationAlerts } from '@/hooks/useNotificationAlerts';
import { NotificationBanner } from '@/components/NotificationBanner';
import { clearBadgeForScreen, isPushAvailable } from '@/data/notification-service';

export function DashboardScreen() {
  const { alerts, dismiss } = useNotificationAlerts();

  useEffect(() => {
    clearBadgeForScreen('dashboard').catch(() => {});
  }, []);

  return (
    <div data-testid="dashboard-screen" className="animate-fade-in space-y-4 p-4 pb-24">
      {/* In-app notification banners (shown when push unavailable) */}
      {!isPushAvailable() && (
        <NotificationBanner alerts={alerts} onDismiss={dismiss} />
      )}

      {/* 1. Milestone Countdown — most prominent, top of dashboard */}
      <MilestoneCountdown />

      {/* 2. Daily Budget */}
      <DailyBudgetCard />

      {/* 3. Goals Aggregation */}
      <GoalsWidgetContainer />

      {/* 4. Health Routines Aggregation */}
      <HealthWidgetContainer />
    </div>
  );
}
