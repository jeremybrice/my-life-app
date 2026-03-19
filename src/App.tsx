import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import { AppShell } from '@/components/AppShell';
import { DatabaseErrorBoundary } from '@/components/DatabaseErrorBoundary';
import { DashboardScreen } from '@/screens/dashboard/DashboardScreen';
import { BudgetScreen } from '@/screens/budget/BudgetScreen';
import GoalsScreenContainer from '@/screens/goals/GoalsScreenContainer';
import { HealthScreen } from '@/screens/health/HealthScreen';
import { AgentScreen } from '@/screens/agent/AgentScreen';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { runAppLaunchChecks, incrementSessionCount, detectCapabilities } from '@/data/notification-service';

export default function App() {
  useEffect(() => {
    detectCapabilities();
    incrementSessionCount().catch(() => {});
    runAppLaunchChecks().catch(() => {});
  }, []);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        runAppLaunchChecks().catch(() => {});
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return (
    <DatabaseErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardScreen />} />
            <Route path="/budget" element={<BudgetScreen />} />
            <Route path="/goals" element={<GoalsScreenContainer />} />
            <Route path="/health" element={<HealthScreen />} />
            <Route path="/agent" element={<AgentScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DatabaseErrorBoundary>
  );
}
