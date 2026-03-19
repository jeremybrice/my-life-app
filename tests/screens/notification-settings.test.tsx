import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationSettings } from '@/screens/settings/NotificationSettings';
import { db } from '@/data/db';
import { SETTINGS_ID } from '@/lib/constants';
import { detectCapabilities } from '@/data/notification-service';

// Mock useSettings hook
const mockSave = vi.fn();
let mockSettings: Record<string, unknown> | null = null;

vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    settings: mockSettings,
    loading: false,
    error: null,
    save: mockSave,
  }),
}));

describe('NotificationSettings', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockSettings = {
      id: SETTINGS_ID,
      notificationPreferences: {
        masterEnabled: true,
        dailyOverspend: true,
        monthlyThresholds: [
          { percentage: 80, enabled: true },
          { percentage: 90, enabled: true },
          { percentage: 100, enabled: true },
        ],
        milestoneIntervals: [
          { days: 30, enabled: true },
          { days: 7, enabled: true },
          { days: 1, enabled: true },
        ],
      },
    };

    vi.stubGlobal('Notification', { permission: 'default' });
    detectCapabilities();
  });

  it('should render the notification settings section', () => {
    render(<NotificationSettings />);
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Budget Alerts')).toBeInTheDocument();
    expect(screen.getByText('Milestone Alerts')).toBeInTheDocument();
  });

  it('should display default thresholds', () => {
    render(<NotificationSettings />);
    expect(screen.getByText('80% of monthly budget')).toBeInTheDocument();
    expect(screen.getByText('90% of monthly budget')).toBeInTheDocument();
    expect(screen.getByText('100% of monthly budget')).toBeInTheDocument();
  });

  it('should display default milestone intervals', () => {
    render(<NotificationSettings />);
    expect(screen.getByText('30 days before')).toBeInTheDocument();
    expect(screen.getByText('7 days before')).toBeInTheDocument();
    expect(screen.getByText('1 day before')).toBeInTheDocument();
  });

  it('should reject invalid threshold percentage', async () => {
    const user = userEvent.setup();
    render(<NotificationSettings />);

    await user.type(screen.getByLabelText('New threshold percentage'), '250');
    await user.click(screen.getAllByText('Add')[0]!);

    expect(screen.getByText('Percentage must be between 1 and 200.')).toBeInTheDocument();
  });

  it('should reject duplicate threshold', async () => {
    const user = userEvent.setup();
    render(<NotificationSettings />);

    await user.type(screen.getByLabelText('New threshold percentage'), '80');
    await user.click(screen.getAllByText('Add')[0]!);

    expect(screen.getByText('This threshold already exists.')).toBeInTheDocument();
  });

  it('should show denied permission message', () => {
    vi.stubGlobal('Notification', { permission: 'denied' });
    detectCapabilities();

    render(<NotificationSettings />);
    expect(
      screen.getByText(/Notification permission has been denied/)
    ).toBeInTheDocument();
  });
});
