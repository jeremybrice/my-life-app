import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router';

// Mock claude-client
vi.mock('../../../src/services/claude-client', () => ({
  validateApiKey: vi.fn(),
  ClaudeClientError: class ClaudeClientError extends Error {
    errorType: string;
    constructor(message: string, errorType: string) {
      super(message);
      this.errorType = errorType;
      this.name = 'ClaudeClientError';
    }
  },
}));

// Mock parsers
vi.mock('../../../src/services/expense-parser', () => ({
  parseExpenseMessage: vi.fn(),
  extractJson: vi.fn(),
}));

vi.mock('../../../src/services/budget-insights-parser', () => ({
  parseBudgetQuery: vi.fn(),
}));

vi.mock('../../../src/services/health-parser', () => ({
  parseHealthMessage: vi.fn(),
}));

vi.mock('../../../src/services/goals-parser', () => ({
  parseGoalsMessage: vi.fn(),
}));

// Mock expense-service
vi.mock('../../../src/data/expense-service', () => ({
  createExpense: vi.fn(),
  deleteExpense: vi.fn(),
  getExpensesByMonth: vi.fn().mockResolvedValue([]),
}));

// Mock health-service
vi.mock('../../../src/data/health-service', () => ({
  createLogEntry: vi.fn(),
  deleteLogEntry: vi.fn(),
  getLogEntriesByRoutine: vi.fn().mockResolvedValue([]),
  createRoutine: vi.fn(),
  deleteRoutine: vi.fn(),
}));

// Mock goal-service
vi.mock('../../../src/data/goal-service', () => ({
  createGoal: vi.fn(),
  updateGoal: vi.fn(),
  deleteGoal: vi.fn(),
}));

vi.mock('../../../src/lib/currency', () => ({
  roundCurrency: (v: number) => Math.round(v * 100) / 100,
  formatCurrency: (v: number) => v.toFixed(2),
}));

// Mock receipt-processor
vi.mock('../../../src/services/receipt-processor', () => ({
  processReceipt: vi.fn(),
}));

import { AgentScreen } from '../../../src/screens/agent/AgentScreen';
import { validateApiKey, ClaudeClientError } from '../../../src/services/claude-client';
import { parseExpenseMessage } from '../../../src/services/expense-parser';
import { parseBudgetQuery } from '../../../src/services/budget-insights-parser';
import { parseHealthMessage } from '../../../src/services/health-parser';
import { parseGoalsMessage } from '../../../src/services/goals-parser';
import { createExpense } from '../../../src/data/expense-service';

const mockValidateApiKey = vi.mocked(validateApiKey);
const mockParseExpenseMessage = vi.mocked(parseExpenseMessage);
const mockParseBudgetQuery = vi.mocked(parseBudgetQuery);
const mockParseHealthMessage = vi.mocked(parseHealthMessage);
const mockParseGoalsMessage = vi.mocked(parseGoalsMessage);
const mockCreateExpense = vi.mocked(createExpense);

function renderScreen(pipelineId = 'expense') {
  return render(
    <MemoryRouter initialEntries={[`/agent/${pipelineId}`]}>
      <Routes>
        <Route path="/agent/:pipelineId" element={<AgentScreen />} />
        <Route path="/agent" element={<div data-testid="workflow-selector">Selector</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AgentScreen', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
    mockValidateApiKey.mockResolvedValue(true);
    mockCreateExpense.mockResolvedValue({
      id: 1,
      yearMonth: '2026-03',
      date: '2026-03-18',
      vendor: 'Test',
      amount: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should show pipeline-specific welcome message', async () => {
    renderScreen('expense');
    await waitFor(() => {
      expect(screen.getByText(/ready to help with your expenses/i)).toBeTruthy();
    });
  });

  it('should show back button to workflows', async () => {
    renderScreen('expense');
    await waitFor(() => {
      expect(screen.getByTestId('back-to-workflows')).toBeTruthy();
    });
  });

  it('should redirect to workflow selector for invalid pipeline', async () => {
    renderScreen('invalid-pipeline');
    await waitFor(() => {
      expect(screen.getByTestId('workflow-selector')).toBeTruthy();
    });
  });

  describe('API key validation', () => {
    it('should show initializing state while validating', () => {
      mockValidateApiKey.mockReturnValue(new Promise(() => {}));
      renderScreen();
      expect(screen.getByTestId('initializing-state')).toBeTruthy();
    });

    it('should show no-api-key state when key is missing', async () => {
      const error = new ClaudeClientError('No key', 'missing-api-key');
      mockValidateApiKey.mockRejectedValue(error);
      renderScreen();
      await waitFor(() => {
        expect(screen.getByTestId('no-api-key-state')).toBeTruthy();
      });
    });

    it('should show invalid-api-key state when key is invalid', async () => {
      const error = new ClaudeClientError('Bad key', 'invalid-api-key');
      mockValidateApiKey.mockRejectedValue(error);
      renderScreen();
      await waitFor(() => {
        expect(screen.getByTestId('invalid-api-key-state')).toBeTruthy();
      });
    });
  });

  describe('connectivity', () => {
    it('should show offline state when browser is offline', () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
      renderScreen();
      expect(screen.getByTestId('offline-state')).toBeTruthy();
    });

    it('should show chat when connectivity is restored', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
      renderScreen();
      expect(screen.getByTestId('offline-state')).toBeTruthy();

      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('agent-screen')).toBeTruthy();
      });
    });
  });

  describe('expense pipeline', () => {
    it('should show confirmation card when expense is parsed', async () => {
      const user = userEvent.setup();
      mockParseExpenseMessage.mockResolvedValue({
        type: 'expense',
        expense: {
          amount: 25.00,
          vendor: 'Chipotle',
          category: 'Dining',
          date: '2026-03-18',
        },
      });

      renderScreen('expense');
      await waitFor(() => {
        expect(screen.getByTestId('agent-screen')).toBeTruthy();
      });

      await user.type(screen.getByTestId('chat-input'), 'Spent $25 at Chipotle');
      await user.click(screen.getByTestId('send-btn'));

      await waitFor(() => {
        expect(screen.getByText('Chipotle')).toBeTruthy();
        expect(screen.getByText('Approve')).toBeTruthy();
      });
    });

    it('should show clarification message when fields are missing', async () => {
      const user = userEvent.setup();
      mockParseExpenseMessage.mockResolvedValue({
        type: 'clarification',
        message: 'How much did you spend?',
      });

      renderScreen('expense');
      await waitFor(() => {
        expect(screen.getByTestId('agent-screen')).toBeTruthy();
      });

      await user.type(screen.getByTestId('chat-input'), 'Lunch at Subway');
      await user.click(screen.getByTestId('send-btn'));

      await waitFor(() => {
        expect(screen.getByText('How much did you spend?')).toBeTruthy();
      });
    });

    it('should show image upload button for expense pipeline', async () => {
      renderScreen('expense');
      await waitFor(() => {
        expect(screen.getByTestId('agent-screen')).toBeTruthy();
      });
      expect(screen.getByTestId('upload-image-btn')).toBeTruthy();
    });
  });

  describe('budget insights pipeline', () => {
    it('should show data answer for budget queries', async () => {
      const user = userEvent.setup();
      mockParseBudgetQuery.mockResolvedValue({
        type: 'answer',
        text: 'You spent $500 on dining this month.',
      });

      renderScreen('budget-insights');
      await waitFor(() => {
        expect(screen.getByTestId('agent-screen')).toBeTruthy();
      });

      await user.type(screen.getByTestId('chat-input'), 'How much did I spend on dining?');
      await user.click(screen.getByTestId('send-btn'));

      await waitFor(() => {
        expect(screen.getByText('You spent $500 on dining this month.')).toBeTruthy();
      });
    });

    it('should not show image upload for budget insights', async () => {
      renderScreen('budget-insights');
      await waitFor(() => {
        expect(screen.getByTestId('agent-screen')).toBeTruthy();
      });
      expect(screen.queryByTestId('upload-image-btn')).toBeNull();
    });
  });

  describe('health pipeline', () => {
    it('should show health log confirmation card', async () => {
      const user = userEvent.setup();
      mockParseHealthMessage.mockResolvedValue({
        type: 'health-log',
        routineId: 1,
        routineName: 'Running',
        date: '2026-03-18',
        metrics: { distance: 5 },
      });

      renderScreen('health');
      await waitFor(() => {
        expect(screen.getByTestId('agent-screen')).toBeTruthy();
      });

      await user.type(screen.getByTestId('chat-input'), 'Ran 5km today');
      await user.click(screen.getByTestId('send-btn'));

      await waitFor(() => {
        expect(screen.getByText('Running')).toBeTruthy();
        expect(screen.getByText('Approve')).toBeTruthy();
      });
    });

    it('should show health answer for queries', async () => {
      const user = userEvent.setup();
      mockParseHealthMessage.mockResolvedValue({
        type: 'health-answer',
        text: 'Your running streak is 5 days.',
      });

      renderScreen('health');
      await waitFor(() => {
        expect(screen.getByTestId('agent-screen')).toBeTruthy();
      });

      await user.type(screen.getByTestId('chat-input'), "How's my running streak?");
      await user.click(screen.getByTestId('send-btn'));

      await waitFor(() => {
        expect(screen.getByText('Your running streak is 5 days.')).toBeTruthy();
      });
    });
  });

  describe('goals pipeline', () => {
    it('should show goal create confirmation card', async () => {
      const user = userEvent.setup();
      mockParseGoalsMessage.mockResolvedValue({
        type: 'goal-create',
        title: 'Save $5000',
        goalType: 'financial',
        progressModel: 'numeric',
        targetValue: 5000,
      });

      renderScreen('goals');
      await waitFor(() => {
        expect(screen.getByTestId('agent-screen')).toBeTruthy();
      });

      await user.type(screen.getByTestId('chat-input'), 'Create a savings goal for $5000');
      await user.click(screen.getByTestId('send-btn'));

      await waitFor(() => {
        expect(screen.getByText('Save $5000')).toBeTruthy();
        expect(screen.getByText('Approve')).toBeTruthy();
      });
    });

    it('should show goal answer for queries', async () => {
      const user = userEvent.setup();
      mockParseGoalsMessage.mockResolvedValue({
        type: 'goal-answer',
        text: 'You are 60% of the way to your savings goal.',
      });

      renderScreen('goals');
      await waitFor(() => {
        expect(screen.getByTestId('agent-screen')).toBeTruthy();
      });

      await user.type(screen.getByTestId('chat-input'), 'How close am I to my savings goal?');
      await user.click(screen.getByTestId('send-btn'));

      await waitFor(() => {
        expect(screen.getByText('You are 60% of the way to your savings goal.')).toBeTruthy();
      });
    });
  });

  describe('error handling', () => {
    it('should show error message when API call fails', async () => {
      const user = userEvent.setup();
      mockParseExpenseMessage.mockRejectedValue(
        new ClaudeClientError('Rate limit exceeded.', 'rate-limited')
      );

      renderScreen('expense');
      await waitFor(() => {
        expect(screen.getByTestId('agent-screen')).toBeTruthy();
      });

      await user.type(screen.getByTestId('chat-input'), 'Test');
      await user.click(screen.getByTestId('send-btn'));

      await waitFor(() => {
        expect(screen.getByText('Rate limit exceeded.')).toBeTruthy();
      });
    });
  });
});
