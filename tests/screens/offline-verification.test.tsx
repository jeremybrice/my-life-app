import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { DashboardScreen } from '../../src/screens/dashboard/DashboardScreen';
import { AgentScreen } from '../../src/screens/agent/AgentScreen';

// Mock dependencies
vi.mock('../../src/hooks/useSettings', () => ({
  useSettings: () => ({
    settings: {
      id: 1,
      birthDate: '1985-06-15',
      targetDate: '2035-06-15',
      targetDateLabel: 'Age 50',
    },
    loading: false,
    error: null,
  }),
}));

vi.mock('../../src/lib/dates', async () => {
  const actual = await vi.importActual<typeof import('../../src/lib/dates')>('../../src/lib/dates');
  return {
    ...actual,
    today: vi.fn(() => '2026-03-18'),
  };
});

const mockOnlineStatus = vi.fn();
vi.mock('../../src/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => mockOnlineStatus(),
}));

describe('Offline Verification (Story 008)', () => {
  it('should render dashboard correctly (simulating offline — no network dependencies)', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<DashboardScreen />} />
        </Routes>
      </MemoryRouter>
    );
    // Dashboard renders entirely from IndexedDB data via hooks — no network calls
    expect(screen.getByTestId('dashboard-screen')).toBeInTheDocument();
    expect(screen.getByTestId('countdown-display')).toBeInTheDocument();
    expect(screen.getByTestId('daily-budget-card')).toBeInTheDocument();
    expect(screen.getByTestId('monthly-performance-card')).toBeInTheDocument();
    expect(screen.getByTestId('goals-widget')).toBeInTheDocument();
    expect(screen.getByTestId('health-widget')).toBeInTheDocument();
  });

  it('should show no unnecessary offline banners on dashboard', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<DashboardScreen />} />
        </Routes>
      </MemoryRouter>
    );
    // Dashboard should NOT contain any offline banner or warning
    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/no connection/i)).not.toBeInTheDocument();
  });

  it('should show network-required message on Agent screen when offline', () => {
    mockOnlineStatus.mockReturnValue(false);
    render(
      <MemoryRouter initialEntries={['/agent']}>
        <Routes>
          <Route path="/agent" element={<AgentScreen />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId('agent-offline-message')).toBeInTheDocument();
    expect(screen.getByText(/internet required/i)).toBeInTheDocument();
  });

  it('should show placeholder on Agent screen when online', () => {
    mockOnlineStatus.mockReturnValue(true);
    render(
      <MemoryRouter initialEntries={['/agent']}>
        <Routes>
          <Route path="/agent" element={<AgentScreen />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.queryByTestId('agent-offline-message')).not.toBeInTheDocument();
    expect(screen.getByTestId('agent-placeholder')).toBeInTheDocument();
  });
});
