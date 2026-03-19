import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GoalsWidget } from '../../../src/screens/dashboard/GoalsWidget';
import type { GoalsWidgetProps } from '../../../src/screens/dashboard/GoalsWidget';

describe('GoalsWidget', () => {
  it('should render placeholder when no data provided', () => {
    render(<GoalsWidget />);
    expect(screen.getByTestId('goals-widget')).toBeInTheDocument();
    expect(screen.getByTestId('goals-widget-placeholder')).toBeInTheDocument();
    expect(screen.getByText(/create your first goal/i)).toBeInTheDocument();
  });

  it('should render with live data', () => {
    const data: GoalsWidgetProps = {
      activeCount: 5,
      completedCount: 3,
      aggregateProgress: 62,
    };
    render(<GoalsWidget data={data} />);
    expect(screen.getByTestId('goals-active-count')).toHaveTextContent('5');
    expect(screen.getByTestId('goals-completed-count')).toHaveTextContent('3');
    expect(screen.getByTestId('goals-avg-progress')).toHaveTextContent('62%');
  });

  it('should show "--" when average progress is null', () => {
    const data: GoalsWidgetProps = {
      activeCount: 2,
      completedCount: 0,
      aggregateProgress: null,
    };
    render(<GoalsWidget data={data} />);
    expect(screen.getByTestId('goals-avg-progress')).toHaveTextContent('--');
  });

  it('should show zero counts correctly', () => {
    const data: GoalsWidgetProps = {
      activeCount: 0,
      completedCount: 0,
      aggregateProgress: null,
    };
    render(<GoalsWidget data={data} />);
    expect(screen.getByTestId('goals-active-count')).toHaveTextContent('0');
    expect(screen.getByTestId('goals-completed-count')).toHaveTextContent('0');
  });

  it('should have the section title "Goals"', () => {
    render(<GoalsWidget />);
    expect(screen.getByText('Goals')).toBeInTheDocument();
  });
});
