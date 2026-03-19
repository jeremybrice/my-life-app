import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

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

// Mock expense-parser
vi.mock('../../../src/services/expense-parser', () => ({
  parseExpenseMessage: vi.fn(),
}));

// Mock expense-service
vi.mock('../../../src/data/expense-service', () => ({
  createExpense: vi.fn(),
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
import { createExpense } from '../../../src/data/expense-service';

const mockValidateApiKey = vi.mocked(validateApiKey);
const mockParseExpenseMessage = vi.mocked(parseExpenseMessage);
const mockCreateExpense = vi.mocked(createExpense);

function renderScreen() {
  return render(
    <MemoryRouter>
      <AgentScreen />
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

  it('should show welcome message after successful validation', async () => {
    renderScreen();
    await waitFor(() => {
      expect(screen.getByText(/expense assistant/i)).toBeTruthy();
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

  describe('expense parsing flow', () => {
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

      renderScreen();
      await waitFor(() => {
        expect(screen.getByTestId('agent-screen')).toBeTruthy();
      });

      await user.type(screen.getByTestId('chat-input'), 'Spent $25 at Chipotle');
      await user.click(screen.getByTestId('send-btn'));

      await waitFor(() => {
        expect(screen.getByText('Chipotle')).toBeTruthy();
        expect(screen.getByTestId('confirm-expense-btn')).toBeTruthy();
      });
    });

    it('should show clarification message when fields are missing', async () => {
      const user = userEvent.setup();
      mockParseExpenseMessage.mockResolvedValue({
        type: 'clarification',
        message: 'How much did you spend?',
      });

      renderScreen();
      await waitFor(() => {
        expect(screen.getByTestId('agent-screen')).toBeTruthy();
      });

      await user.type(screen.getByTestId('chat-input'), 'Lunch at Subway');
      await user.click(screen.getByTestId('send-btn'));

      await waitFor(() => {
        expect(screen.getByText('How much did you spend?')).toBeTruthy();
      });
    });

    it('should show redirect message for non-expense input', async () => {
      const user = userEvent.setup();
      mockParseExpenseMessage.mockResolvedValue({
        type: 'redirect',
        message: 'I can only help with expense logging.',
      });

      renderScreen();
      await waitFor(() => {
        expect(screen.getByTestId('agent-screen')).toBeTruthy();
      });

      await user.type(screen.getByTestId('chat-input'), 'What is the meaning of life?');
      await user.click(screen.getByTestId('send-btn'));

      await waitFor(() => {
        expect(screen.getByText('I can only help with expense logging.')).toBeTruthy();
      });
    });
  });

  describe('expense confirmation', () => {
    it('should save expense when confirm button is clicked', async () => {
      const user = userEvent.setup();
      mockParseExpenseMessage.mockResolvedValue({
        type: 'expense',
        expense: {
          amount: 25.00,
          vendor: 'Chipotle',
          date: '2026-03-18',
        },
      });

      renderScreen();
      await waitFor(() => {
        expect(screen.getByTestId('agent-screen')).toBeTruthy();
      });

      await user.type(screen.getByTestId('chat-input'), 'Spent $25 at Chipotle');
      await user.click(screen.getByTestId('send-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('confirm-expense-btn')).toBeTruthy();
      });

      await user.click(screen.getByTestId('confirm-expense-btn'));

      await waitFor(() => {
        expect(mockCreateExpense).toHaveBeenCalledWith(
          expect.objectContaining({
            vendor: 'Chipotle',
            amount: 25.00,
            date: '2026-03-18',
          })
        );
      });
    });

    it('should not save expense when cancel button is clicked', async () => {
      const user = userEvent.setup();
      mockParseExpenseMessage.mockResolvedValue({
        type: 'expense',
        expense: {
          amount: 25.00,
          vendor: 'Chipotle',
          date: '2026-03-18',
        },
      });

      renderScreen();
      await waitFor(() => {
        expect(screen.getByTestId('agent-screen')).toBeTruthy();
      });

      await user.type(screen.getByTestId('chat-input'), 'Spent $25 at Chipotle');
      await user.click(screen.getByTestId('send-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('cancel-expense-btn')).toBeTruthy();
      });

      await user.click(screen.getByTestId('cancel-expense-btn'));

      expect(mockCreateExpense).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.getByText(/not saved/)).toBeTruthy();
      });
    });
  });

  describe('error handling', () => {
    it('should show error message when API call fails', async () => {
      const user = userEvent.setup();
      mockParseExpenseMessage.mockRejectedValue(
        new ClaudeClientError('Rate limit exceeded.', 'rate-limited')
      );

      renderScreen();
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
