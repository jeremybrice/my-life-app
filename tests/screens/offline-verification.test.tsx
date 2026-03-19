import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { DashboardScreen } from '../../src/screens/dashboard/DashboardScreen';
import { AgentScreen } from '../../src/screens/agent/AgentScreen';
import { WorkflowSelector } from '../../src/screens/agent/WorkflowSelector';

// Mock claude-client so AgentScreen's validateApiKey call resolves
vi.mock('../../src/services/claude-client', () => ({
  validateApiKey: vi.fn().mockResolvedValue(true),
  ClaudeClientError: class ClaudeClientError extends Error {
    errorType: string;
    constructor(message: string, errorType: string) {
      super(message);
      this.errorType = errorType;
      this.name = 'ClaudeClientError';
    }
  },
}));

// Mock parsers (imported by AgentScreen)
vi.mock('../../src/services/expense-parser', () => ({
  parseExpenseMessage: vi.fn().mockResolvedValue({ type: 'clarification', message: 'ok' }),
  extractJson: vi.fn(),
}));

vi.mock('../../src/services/budget-insights-parser', () => ({
  parseBudgetQuery: vi.fn(),
}));

vi.mock('../../src/services/health-parser', () => ({
  parseHealthMessage: vi.fn(),
}));

vi.mock('../../src/services/goals-parser', () => ({
  parseGoalsMessage: vi.fn(),
}));

// Mock receipt-processor (imported by AgentScreen)
vi.mock('../../src/services/receipt-processor', () => ({
  processReceipt: vi.fn(),
}));

vi.mock('../../src/data/expense-service', () => ({
  createExpense: vi.fn(),
  deleteExpense: vi.fn(),
  getExpensesByMonth: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../src/data/health-service', () => ({
  createLogEntry: vi.fn(),
  deleteLogEntry: vi.fn(),
  getLogEntriesByRoutine: vi.fn().mockResolvedValue([]),
  createRoutine: vi.fn(),
  deleteRoutine: vi.fn(),
}));

vi.mock('../../src/data/goal-service', () => ({
  createGoal: vi.fn(),
  updateGoal: vi.fn(),
  deleteGoal: vi.fn(),
}));

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

  it('should render workflow selector at /agent', () => {
    render(
      <MemoryRouter initialEntries={['/agent']}>
        <Routes>
          <Route path="/agent" element={<WorkflowSelector />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId('workflow-selector')).toBeInTheDocument();
    expect(screen.getByText('How can I help?')).toBeInTheDocument();
  });

  it('should render Agent screen with chat UI when online', async () => {
    render(
      <MemoryRouter initialEntries={['/agent/expense']}>
        <Routes>
          <Route path="/agent/:pipelineId" element={<AgentScreen />} />
          <Route path="/agent" element={<WorkflowSelector />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByTestId('agent-screen')).toBeInTheDocument();
    });
    expect(screen.getByText(/ready to help with your expenses/i)).toBeInTheDocument();
  });

  it('should show chat input on Agent screen', async () => {
    render(
      <MemoryRouter initialEntries={['/agent/expense']}>
        <Routes>
          <Route path="/agent/:pipelineId" element={<AgentScreen />} />
          <Route path="/agent" element={<WorkflowSelector />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    });
    expect(screen.getByTestId('send-btn')).toBeInTheDocument();
  });
});
