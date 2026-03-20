import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GoalsWidget } from '../../../src/screens/dashboard/GoalsWidget';
import type { GoalsWidgetProps } from '../../../src/screens/dashboard/GoalsWidget';

describe('GoalsWidget', () => {
  it('should render placeholder when no data provided', () => {
    render(<GoalsWidget />);
    expect(screen.getByTestId('goals-widget')).toBeInTheDocument();
    expect(screen.getByTestId('goals-widget-placeholder')).toBeInTheDocument();
    expect(screen.getByText(/create your first target/i)).toBeInTheDocument();
  });

  it('should render risk counts with live data', () => {
    const data: GoalsWidgetProps = {
      activeCount: 5,
      completedCount: 3,
      aggregateProgress: 62,
      criticalCount: 1,
      warningCount: 2,
      normalCount: 2,
    };
    render(<GoalsWidget data={data} />);
    expect(screen.getByTestId('targets-critical-count')).toHaveTextContent('1');
    expect(screen.getByTestId('targets-warning-count')).toHaveTextContent('2');
    expect(screen.getByTestId('targets-normal-count')).toHaveTextContent('2');
  });

  it('should show completed count when completedCount > 0', () => {
    const data: GoalsWidgetProps = {
      activeCount: 2,
      completedCount: 3,
      aggregateProgress: null,
      criticalCount: 0,
      warningCount: 1,
      normalCount: 1,
    };
    render(<GoalsWidget data={data} />);
    expect(screen.getByText('3 completed')).toBeInTheDocument();
  });

  it('should show zero counts correctly', () => {
    const data: GoalsWidgetProps = {
      activeCount: 0,
      completedCount: 0,
      aggregateProgress: null,
      criticalCount: 0,
      warningCount: 0,
      normalCount: 0,
    };
    render(<GoalsWidget data={data} />);
    expect(screen.getByTestId('targets-critical-count')).toHaveTextContent('0');
    expect(screen.getByTestId('targets-warning-count')).toHaveTextContent('0');
    expect(screen.getByTestId('targets-normal-count')).toHaveTextContent('0');
  });

  it('should have the section title "Targets"', () => {
    render(<GoalsWidget />);
    expect(screen.getByText('Targets')).toBeInTheDocument();
  });
});
