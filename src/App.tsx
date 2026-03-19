import { BrowserRouter, Routes, Route } from 'react-router';
import { AppShell } from '@/components/AppShell';
import { DashboardScreen } from '@/screens/dashboard/DashboardScreen';
import { BudgetScreen } from '@/screens/budget/BudgetScreen';
import GoalsScreenContainer from '@/screens/goals/GoalsScreenContainer';
import { HealthScreen } from '@/screens/health/HealthScreen';
import { AgentScreen } from '@/screens/agent/AgentScreen';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';

export default function App() {
  return (
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
  );
}
