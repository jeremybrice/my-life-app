import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationBanner } from '@/components/NotificationBanner';
import type { NotificationAlert } from '@/lib/types';

const budgetAlert: NotificationAlert = {
  id: 'budget-daily-2026-03-18',
  type: 'budget-daily',
  title: 'Daily Budget Exceeded',
  body: "You've spent $5.00 over today's budget.",
  timestamp: '2026-03-18T12:00:00Z',
  dismissed: false,
  screen: 'budget',
};

const milestoneAlert: NotificationAlert = {
  id: 'milestone-30-2026-04-17',
  type: 'milestone',
  title: 'Retirement Countdown',
  body: '30 days until Retirement! Stay focused.',
  timestamp: '2026-03-18T08:00:00Z',
  dismissed: false,
  screen: 'dashboard',
};

describe('NotificationBanner', () => {
  it('should render nothing when there are no alerts', () => {
    const { container } = render(
      <NotificationBanner alerts={[]} onDismiss={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render budget alert with amber styling', () => {
    render(
      <NotificationBanner alerts={[budgetAlert]} onDismiss={vi.fn()} />
    );
    expect(screen.getByText('Daily Budget Exceeded')).toBeInTheDocument();
    expect(screen.getByText("You've spent $5.00 over today's budget.")).toBeInTheDocument();
  });

  it('should render milestone alert with blue styling', () => {
    render(
      <NotificationBanner alerts={[milestoneAlert]} onDismiss={vi.fn()} />
    );
    expect(screen.getByText('Retirement Countdown')).toBeInTheDocument();
  });

  it('should render multiple banners simultaneously', () => {
    render(
      <NotificationBanner
        alerts={[budgetAlert, milestoneAlert]}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getAllByRole('alert')).toHaveLength(2);
  });

  it('should call onDismiss with alert id when dismiss button clicked', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();

    render(
      <NotificationBanner alerts={[budgetAlert]} onDismiss={onDismiss} />
    );

    await user.click(
      screen.getByLabelText('Dismiss Daily Budget Exceeded')
    );
    expect(onDismiss).toHaveBeenCalledWith('budget-daily-2026-03-18');
  });
});
