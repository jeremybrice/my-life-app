import { useNavigate } from 'react-router';
import { useHealthAggregation } from '@/hooks/useHealth';
import { HealthWidget } from './HealthWidget';

export function HealthWidgetContainer() {
  const navigate = useNavigate();
  const { aggregation } = useHealthAggregation();

  return (
    <HealthWidget
      data={{
        routinesCompletedToday: aggregation.routinesCompletedToday,
        totalRoutines: aggregation.totalRoutines,
        onTrackCount: aggregation.onTrackCount,
        behindCount: aggregation.behindCount,
        bestStreak: aggregation.bestStreak,
        onNavigate: () => navigate('/health'),
      }}
    />
  );
}
