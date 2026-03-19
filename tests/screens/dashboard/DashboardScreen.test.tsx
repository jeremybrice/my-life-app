import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardScreen } from '../../../src/screens/dashboard/DashboardScreen';

// Mock useSettings for the MilestoneCountdown child
vi.mock('../../../src/hooks/useSettings', () => ({
  useSettings: () => ({
    settings: { id: 1, birthDate: '1985-06-15', targetDate: '2035-06-15', targetDateLabel: 'Age 50' },
    loading: false,
    error: null,
  }),
}));

vi.mock('../../../src/lib/dates', async () => {
  const actual = await vi.importActual<typeof import('../../../src/lib/dates')>('../../../src/lib/dates');
  return {
    ...actual,
    today: vi.fn(() => '2026-03-18'),
  };
});

describe('DashboardScreen', () => {
  it('should render the dashboard screen container', () => {
    render(<DashboardScreen />);
    expect(screen.getByTestId('dashboard-screen')).toBeInTheDocument();
  });

  it('should render the milestone countdown', () => {
    render(<DashboardScreen />);
    expect(screen.getByTestId('countdown-display')).toBeInTheDocument();
  });

  it('should render the daily budget card in zero state', () => {
    render(<DashboardScreen />);
    expect(screen.getByTestId('daily-budget-card')).toBeInTheDocument();
    expect(screen.getByTestId('daily-budget-zero-state')).toBeInTheDocument();
  });

  it('should render the monthly performance card in zero state', () => {
    render(<DashboardScreen />);
    expect(screen.getByTestId('monthly-performance-card')).toBeInTheDocument();
    expect(screen.getByTestId('monthly-performance-zero-state')).toBeInTheDocument();
  });

  it('should render the goals widget placeholder', () => {
    render(<DashboardScreen />);
    expect(screen.getByTestId('goals-widget')).toBeInTheDocument();
    expect(screen.getByTestId('goals-widget-placeholder')).toBeInTheDocument();
  });

  it('should render the health widget placeholder', () => {
    render(<DashboardScreen />);
    expect(screen.getByTestId('health-widget')).toBeInTheDocument();
    expect(screen.getByTestId('health-widget-placeholder')).toBeInTheDocument();
  });

  it('should render components in correct scroll order (countdown, budget, goals, health)', () => {
    const { container } = render(<DashboardScreen />);
    const dashboard = container.querySelector('[data-testid="dashboard-screen"]')!;
    const children = Array.from(dashboard.children);

    // Helper: check if element itself or a descendant matches the testid
    const hasTestId = (el: Element, testId: string) =>
      el.matches(`[data-testid="${testId}"]`) || el.querySelector(`[data-testid="${testId}"]`) !== null;

    // First child: MilestoneCountdown
    expect(hasTestId(children[0], 'countdown-display')).toBeTruthy();
    // Second child: budget cards grid
    expect(hasTestId(children[1], 'daily-budget-card')).toBeTruthy();
    expect(hasTestId(children[1], 'monthly-performance-card')).toBeTruthy();
    // Third child: goals widget
    expect(hasTestId(children[2], 'goals-widget')).toBeTruthy();
    // Fourth child: health widget
    expect(hasTestId(children[3], 'health-widget')).toBeTruthy();
  });
});
