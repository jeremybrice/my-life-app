import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '@/data/db';
import { createRoutine, createLogEntry } from '@/data/health-service';
import { HealthScreen } from '@/screens/health/HealthScreen';
import * as dates from '@/lib/dates';

beforeEach(async () => {
  await db.healthRoutines.clear();
  await db.healthLogEntries.clear();
  vi.spyOn(dates, 'today').mockReturnValue('2026-03-18');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('HealthScreen', () => {
  it('should show empty state when no routines exist', async () => {
    render(<HealthScreen />);
    await waitFor(() => {
      expect(screen.getByText(/no health routines yet/i)).toBeInTheDocument();
    });
  });

  it('should show create routine button', async () => {
    render(<HealthScreen />);
    await waitFor(() => {
      expect(screen.getByTestId('create-routine-button')).toBeInTheDocument();
    });
  });

  it('should display routines with adherence indicators', async () => {
    const routine = await createRoutine({
      name: 'Morning Run',
      frequencyType: 'weekly',
      targetFrequency: 3,
    });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-16' });
    await createLogEntry({ routineId: routine.id!, date: '2026-03-18' });

    render(<HealthScreen />);

    await waitFor(() => {
      expect(screen.getByText('Morning Run')).toBeInTheDocument();
      expect(screen.getByTestId(`adherence-${routine.id}`)).toHaveTextContent(
        '2/3 this week'
      );
    });
  });

  it('should navigate to create routine form when button clicked', async () => {
    render(<HealthScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('create-routine-button')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByTestId('create-routine-button'));

    await waitFor(() => {
      expect(screen.getByTestId('routine-form')).toBeInTheDocument();
    });
  });
});
