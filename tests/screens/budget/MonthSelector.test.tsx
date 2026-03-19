import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import MonthSelector from '../../../src/screens/budget/MonthSelector';

describe('MonthSelector', () => {
  it('should display the formatted month and year', () => {
    render(<MonthSelector selectedMonth="2026-03" onMonthChange={() => {}} />);
    expect(screen.getByTestId('month-label')).toHaveTextContent('March 2026');
  });

  it('should call onMonthChange with previous month when left arrow clicked', async () => {
    const user = userEvent.setup();
    const onMonthChange = vi.fn();
    render(<MonthSelector selectedMonth="2026-03" onMonthChange={onMonthChange} />);

    await user.click(screen.getByLabelText('Previous month'));
    expect(onMonthChange).toHaveBeenCalledWith('2026-02');
  });

  it('should call onMonthChange with next month when right arrow clicked', async () => {
    const user = userEvent.setup();
    const onMonthChange = vi.fn();
    render(<MonthSelector selectedMonth="2026-03" onMonthChange={onMonthChange} />);

    await user.click(screen.getByLabelText('Next month'));
    expect(onMonthChange).toHaveBeenCalledWith('2026-04');
  });

  it('should handle year boundary correctly (January to December)', () => {
    render(<MonthSelector selectedMonth="2026-01" onMonthChange={() => {}} />);
    expect(screen.getByTestId('month-label')).toHaveTextContent('January 2026');
  });

  it('should handle December display', () => {
    render(<MonthSelector selectedMonth="2025-12" onMonthChange={() => {}} />);
    expect(screen.getByTestId('month-label')).toHaveTextContent('December 2025');
  });
});
