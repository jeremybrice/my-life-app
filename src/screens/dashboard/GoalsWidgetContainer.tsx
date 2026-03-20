import { useNavigate } from 'react-router';
import { useGoalAggregation } from '@/hooks/useGoals';
import { GoalsWidget } from './GoalsWidget';

export function GoalsWidgetContainer() {
  const navigate = useNavigate();
  const { aggregation } = useGoalAggregation();

  return (
    <GoalsWidget
      data={{
        activeCount: aggregation.activeCount,
        completedCount: aggregation.completedCount,
        aggregateProgress: aggregation.aggregateProgress,
        criticalCount: aggregation.criticalCount,
        warningCount: aggregation.warningCount,
        normalCount: aggregation.normalCount,
        onNavigate: () => navigate('/goals'),
      }}
    />
  );
}
