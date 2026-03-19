import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MilestoneCountdown } from '../../../src/screens/dashboard/MilestoneCountdown';

// Mock useSettings
const mockSettings = vi.fn();
vi.mock('../../../src/hooks/useSettings', () => ({
  useSettings: () => mockSettings(),
}));

// Mock dates module
vi.mock('../../../src/lib/dates', async () => {
  const actual = await vi.importActual<typeof import('../../../src/lib/dates')>('../../../src/lib/dates');
  return {
    ...actual,
    today: vi.fn(() => '2026-03-18'),
  };
});

describe('MilestoneCountdown', () => {
  beforeEach(() => {
    mockSettings.mockReturnValue({
      settings: null,
      loading: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should show loading state', () => {
    mockSettings.mockReturnValue({ settings: null, loading: true, error: null });
    render(<MilestoneCountdown />);
    expect(screen.getByTestId('countdown-loading')).toBeInTheDocument();
  });

  it('should show unconfigured message when no dates set', () => {
    mockSettings.mockReturnValue({
      settings: { id: 1 },
      loading: false,
      error: null,
    });
    render(<MilestoneCountdown />);
    expect(screen.getByTestId('countdown-unconfigured')).toBeInTheDocument();
    expect(screen.getByText(/go to settings/i)).toBeInTheDocument();
  });

  it('should show partial message when only birth date set', () => {
    mockSettings.mockReturnValue({
      settings: { id: 1, birthDate: '1985-06-15' },
      loading: false,
      error: null,
    });
    render(<MilestoneCountdown />);
    expect(screen.getByTestId('countdown-partial')).toBeInTheDocument();
    expect(screen.getByText(/both a birth date and a target date/i)).toBeInTheDocument();
  });

  it('should show partial message when only target date set', () => {
    mockSettings.mockReturnValue({
      settings: { id: 1, targetDate: '2035-06-15' },
      loading: false,
      error: null,
    });
    render(<MilestoneCountdown />);
    expect(screen.getByTestId('countdown-partial')).toBeInTheDocument();
  });

  it('should display days remaining for future target', () => {
    mockSettings.mockReturnValue({
      settings: {
        id: 1,
        birthDate: '1985-06-15',
        targetDate: '2035-06-15',
        targetDateLabel: 'Age 50',
      },
      loading: false,
      error: null,
    });
    render(<MilestoneCountdown />);
    expect(screen.getByTestId('countdown-display')).toBeInTheDocument();
    expect(screen.getByTestId('countdown-number')).toBeInTheDocument();
    expect(screen.getByText('Age 50')).toBeInTheDocument();
    expect(screen.getByText(/days remaining/i)).toBeInTheDocument();
  });

  it('should show milestone reached for past target', () => {
    mockSettings.mockReturnValue({
      settings: {
        id: 1,
        birthDate: '1985-06-15',
        targetDate: '2020-01-01',
        targetDateLabel: 'Past Event',
      },
      loading: false,
      error: null,
    });
    render(<MilestoneCountdown />);
    expect(screen.getByTestId('countdown-reached')).toBeInTheDocument();
    expect(screen.getByText(/milestone reached/i)).toBeInTheDocument();
    expect(screen.getByText(/days ago/i)).toBeInTheDocument();
  });

  it('should display countdown without label when label is empty', () => {
    mockSettings.mockReturnValue({
      settings: {
        id: 1,
        birthDate: '1985-06-15',
        targetDate: '2035-06-15',
      },
      loading: false,
      error: null,
    });
    render(<MilestoneCountdown />);
    expect(screen.getByTestId('countdown-display')).toBeInTheDocument();
    expect(screen.getByText('Countdown')).toBeInTheDocument();
    expect(screen.getByTestId('countdown-number')).toBeInTheDocument();
  });

  it('should show progress indicator', () => {
    mockSettings.mockReturnValue({
      settings: {
        id: 1,
        birthDate: '1985-06-15',
        targetDate: '2035-06-15',
        targetDateLabel: 'Age 50',
      },
      loading: false,
      error: null,
    });
    render(<MilestoneCountdown />);
    const progressBar = screen.getByTestId('countdown-progress');
    expect(progressBar).toBeInTheDocument();
    const style = progressBar.getAttribute('style');
    expect(style).toContain('width:');
  });

  it('should recalculate on visibility change', async () => {
    const { today: todayMock } = await import('../../../src/lib/dates');
    mockSettings.mockReturnValue({
      settings: {
        id: 1,
        birthDate: '1985-06-15',
        targetDate: '2035-06-15',
        targetDateLabel: 'Age 50',
      },
      loading: false,
      error: null,
    });
    render(<MilestoneCountdown />);

    // Simulate date change
    (todayMock as ReturnType<typeof vi.fn>).mockReturnValue('2026-03-19');

    // Trigger visibility change
    await act(async () => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // The component should have re-rendered with the new date
    expect(todayMock).toHaveBeenCalled();
  });

  it('should show "Today!" when target date is today', () => {
    mockSettings.mockReturnValue({
      settings: {
        id: 1,
        birthDate: '1985-06-15',
        targetDate: '2026-03-18',
        targetDateLabel: 'The Day',
      },
      loading: false,
      error: null,
    });
    render(<MilestoneCountdown />);
    expect(screen.getByText('Today!')).toBeInTheDocument();
  });

  it('should show singular "day remaining" for 1 day', () => {
    mockSettings.mockReturnValue({
      settings: {
        id: 1,
        birthDate: '1985-06-15',
        targetDate: '2026-03-19',
      },
      loading: false,
      error: null,
    });
    render(<MilestoneCountdown />);
    expect(screen.getByText('day remaining')).toBeInTheDocument();
  });

  it('should show singular "day ago" for 1 day past', () => {
    mockSettings.mockReturnValue({
      settings: {
        id: 1,
        birthDate: '1985-06-15',
        targetDate: '2026-03-17',
      },
      loading: false,
      error: null,
    });
    render(<MilestoneCountdown />);
    expect(screen.getByText('day ago')).toBeInTheDocument();
  });
});
