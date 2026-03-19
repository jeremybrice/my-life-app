import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExpenseConfirmation } from '../../../src/screens/agent/use-expense-confirmation';
import type { ChatMessage } from '../../../src/screens/agent/agent-types';

// Mock expense-service
vi.mock('../../../src/data/expense-service', () => ({
  createExpense: vi.fn(),
}));

vi.mock('../../../src/lib/currency', () => ({
  roundCurrency: (v: number) => Math.round(v * 100) / 100,
}));

import { createExpense } from '../../../src/data/expense-service';
const mockCreateExpense = vi.mocked(createExpense);

describe('useExpenseConfirmation', () => {
  let updateMessage: ReturnType<typeof vi.fn>;
  let addMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    updateMessage = vi.fn();
    addMessage = vi.fn();
  });

  function renderConfirmationHook() {
    return renderHook(() => useExpenseConfirmation({ updateMessage, addMessage }));
  }

  describe('handleConfirm', () => {
    it('should set saving state then saved state on success', async () => {
      mockCreateExpense.mockResolvedValue({
        id: 1,
        yearMonth: '2026-03',
        date: '2026-03-18',
        vendor: 'Chipotle',
        amount: 25.00,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const { result } = renderConfirmationHook();
      const messages: ChatMessage[] = [{
        id: 'msg-1',
        role: 'assistant',
        contentType: 'expense-confirmation',
        parsedExpense: {
          amount: 25.00,
          vendor: 'Chipotle',
          date: '2026-03-18',
          category: 'Dining',
        },
        confirmationStatus: 'pending',
        timestamp: Date.now(),
      }];

      await act(async () => {
        await result.current.handleConfirm('msg-1', messages);
      });

      // First call: saving
      expect(updateMessage).toHaveBeenNthCalledWith(1, 'msg-1', { confirmationStatus: 'saving' });
      // Second call: saved
      expect(updateMessage).toHaveBeenNthCalledWith(2, 'msg-1', { confirmationStatus: 'saved' });
    });

    it('should call createExpense with correct data', async () => {
      mockCreateExpense.mockResolvedValue({
        id: 1,
        yearMonth: '2026-03',
        date: '2026-03-18',
        vendor: 'Target',
        amount: 50.00,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const { result } = renderConfirmationHook();
      const messages: ChatMessage[] = [{
        id: 'msg-1',
        role: 'assistant',
        contentType: 'expense-confirmation',
        parsedExpense: {
          amount: 50.00,
          vendor: 'Target',
          date: '2026-03-18',
          category: 'Shopping',
          description: 'Household items',
        },
        confirmationStatus: 'pending',
        timestamp: Date.now(),
      }];

      await act(async () => {
        await result.current.handleConfirm('msg-1', messages);
      });

      expect(mockCreateExpense).toHaveBeenCalledWith({
        date: '2026-03-18',
        vendor: 'Target',
        amount: 50.00,
        category: 'Shopping',
        description: 'Household items',
      });
    });

    it('should set error state and add error message on write failure', async () => {
      mockCreateExpense.mockRejectedValue(new Error('IndexedDB error'));

      const { result } = renderConfirmationHook();
      const messages: ChatMessage[] = [{
        id: 'msg-1',
        role: 'assistant',
        contentType: 'expense-confirmation',
        parsedExpense: {
          amount: 25.00,
          vendor: 'Store',
          date: '2026-03-18',
        },
        confirmationStatus: 'pending',
        timestamp: Date.now(),
      }];

      await act(async () => {
        await result.current.handleConfirm('msg-1', messages);
      });

      expect(updateMessage).toHaveBeenCalledWith('msg-1', { confirmationStatus: 'error' });
      expect(addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: 'error',
          text: expect.stringContaining('manual expense form'),
        })
      );
    });

    it('should do nothing if message has no parsedExpense', async () => {
      const { result } = renderConfirmationHook();
      const messages: ChatMessage[] = [{
        id: 'msg-1',
        role: 'assistant',
        contentType: 'text',
        text: 'hello',
        timestamp: Date.now(),
      }];

      await act(async () => {
        await result.current.handleConfirm('msg-1', messages);
      });

      expect(mockCreateExpense).not.toHaveBeenCalled();
      expect(updateMessage).not.toHaveBeenCalled();
    });
  });

  describe('handleCancel', () => {
    it('should set cancelled state and add cancellation message', () => {
      const { result } = renderConfirmationHook();

      act(() => {
        result.current.handleCancel('msg-1');
      });

      expect(updateMessage).toHaveBeenCalledWith('msg-1', { confirmationStatus: 'cancelled' });
      expect(addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'assistant',
          contentType: 'text',
          text: expect.stringContaining('not saved'),
        })
      );
    });
  });

  describe('isAffirmativeConfirmation', () => {
    it('should return true for "yes"', () => {
      const { result } = renderConfirmationHook();
      expect(result.current.isAffirmativeConfirmation('yes')).toBe(true);
    });

    it('should return true for "Yes" (case insensitive)', () => {
      const { result } = renderConfirmationHook();
      expect(result.current.isAffirmativeConfirmation('Yes')).toBe(true);
    });

    it('should return true for "confirm"', () => {
      const { result } = renderConfirmationHook();
      expect(result.current.isAffirmativeConfirmation('confirm')).toBe(true);
    });

    it('should return true for "ok"', () => {
      const { result } = renderConfirmationHook();
      expect(result.current.isAffirmativeConfirmation('ok')).toBe(true);
    });

    it('should return false for "maybe"', () => {
      const { result } = renderConfirmationHook();
      expect(result.current.isAffirmativeConfirmation('maybe')).toBe(false);
    });

    it('should return false for expense descriptions', () => {
      const { result } = renderConfirmationHook();
      expect(result.current.isAffirmativeConfirmation('spent $25 at Target')).toBe(false);
    });
  });

  describe('findPendingConfirmation', () => {
    it('should return the most recent pending confirmation', () => {
      const { result } = renderConfirmationHook();
      const messages: ChatMessage[] = [
        {
          id: '1',
          role: 'assistant',
          contentType: 'expense-confirmation',
          parsedExpense: { amount: 10, vendor: 'A', date: '2026-03-18' },
          confirmationStatus: 'saved',
          timestamp: 1,
        },
        {
          id: '2',
          role: 'assistant',
          contentType: 'expense-confirmation',
          parsedExpense: { amount: 20, vendor: 'B', date: '2026-03-18' },
          confirmationStatus: 'pending',
          timestamp: 2,
        },
      ];
      const found = result.current.findPendingConfirmation(messages);
      expect(found?.id).toBe('2');
    });

    it('should return undefined when no pending confirmations exist', () => {
      const { result } = renderConfirmationHook();
      const messages: ChatMessage[] = [
        {
          id: '1',
          role: 'assistant',
          contentType: 'text',
          text: 'hello',
          timestamp: 1,
        },
      ];
      expect(result.current.findPendingConfirmation(messages)).toBeUndefined();
    });
  });
});
