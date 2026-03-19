import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HealthWidget } from '../../../src/screens/dashboard/HealthWidget';
import type { HealthWidgetProps } from '../../../src/screens/dashboard/HealthWidget';

describe('HealthWidget', () => {
  it('should render placeholder when no data provided', () => {
    render(<HealthWidget />);
    expect(screen.getByTestId('health-widget')).toBeInTheDocument();
    expect(screen.getByTestId('health-widget-placeholder')).toBeInTheDocument();
    expect(screen.getByText(/define your first routine/i)).toBeInTheDocument();
  });

  it('should render with live data', () => {
    const data: HealthWidgetProps = {
      routinesCompletedToday: 2,
      totalRoutines: 4,
      onTrackCount: 3,
      behindCount: 1,
      bestStreak: { weeks: 5, routineName: 'Morning Run' },
    };
    render(<HealthWidget data={data} />);
    expect(screen.getByTestId('health-completed-today')).toHaveTextContent('2/4');
    expect(screen.getByTestId('health-weekly-status')).toHaveTextContent('3');
    expect(screen.getByTestId('health-best-streak')).toHaveTextContent('5w');
  });

  it('should show behind count when routines are behind', () => {
    const data: HealthWidgetProps = {
      routinesCompletedToday: 1,
      totalRoutines: 3,
      onTrackCount: 1,
      behindCount: 2,
      bestStreak: { weeks: 3, routineName: 'Meditation' },
    };
    render(<HealthWidget data={data} />);
    expect(screen.getByTestId('health-behind-count')).toHaveTextContent('2 routines behind this week');
  });

  it('should not show behind message when no routines behind', () => {
    const data: HealthWidgetProps = {
      routinesCompletedToday: 3,
      totalRoutines: 3,
      onTrackCount: 3,
      behindCount: 0,
      bestStreak: { weeks: 8, routineName: 'Evening Stretch' },
    };
    render(<HealthWidget data={data} />);
    expect(screen.queryByTestId('health-behind-count')).not.toBeInTheDocument();
  });

  it('should use singular "routine" for 1 behind', () => {
    const data: HealthWidgetProps = {
      routinesCompletedToday: 1,
      totalRoutines: 2,
      onTrackCount: 1,
      behindCount: 1,
      bestStreak: { weeks: 2, routineName: 'Walking' },
    };
    render(<HealthWidget data={data} />);
    expect(screen.getByTestId('health-behind-count')).toHaveTextContent('1 routine behind this week');
  });

  it('should have the section title "Health Routines"', () => {
    render(<HealthWidget />);
    expect(screen.getByText('Health Routines')).toBeInTheDocument();
  });
});
