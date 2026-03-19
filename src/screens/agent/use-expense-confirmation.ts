import { useCallback } from 'react';
import { createExpense } from '@/data/expense-service';
import { roundCurrency } from '@/lib/currency';
import type { ChatMessage, ParsedExpense } from './agent-types';

interface UseExpenseConfirmationProps {
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  addMessage: (msg: ChatMessage) => void;
}

export function useExpenseConfirmation({
  updateMessage,
  addMessage,
}: UseExpenseConfirmationProps) {
  const handleConfirm = useCallback(async (messageId: string, messages: ChatMessage[]) => {
    const confirmationMsg = messages.find((m) => m.id === messageId);
    if (!confirmationMsg?.parsedExpense) return;

    const expense = confirmationMsg.parsedExpense;

    // Set saving state
    updateMessage(messageId, { confirmationStatus: 'saving' });

    try {
      await createExpense({
        date: expense.date,
        vendor: expense.vendor,
        amount: roundCurrency(expense.amount),
        category: expense.category,
        description: expense.description,
      });

      updateMessage(messageId, { confirmationStatus: 'saved' });
    } catch (error) {
      updateMessage(messageId, { confirmationStatus: 'error' });

      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        contentType: 'error',
        text: 'Failed to save the expense. Please try entering it via the manual expense form on the Budget screen.',
        timestamp: Date.now(),
      };
      addMessage(errorMsg);
    }
  }, [updateMessage, addMessage]);

  const handleCancel = useCallback((messageId: string) => {
    updateMessage(messageId, { confirmationStatus: 'cancelled' });

    const cancelMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      contentType: 'text',
      text: 'No problem -- the expense was not saved. Let me know if you want to log something else.',
      timestamp: Date.now(),
    };
    addMessage(cancelMsg);
  }, [updateMessage, addMessage]);

  /**
   * Check if the user's text message is an affirmative confirmation
   * (e.g., "yes", "confirm", "yep", "ok") when there's a pending confirmation.
   */
  const isAffirmativeConfirmation = useCallback((text: string): boolean => {
    const affirmatives = ['yes', 'yep', 'yeah', 'y', 'confirm', 'ok', 'sure', 'do it', 'save it', 'go ahead'];
    return affirmatives.includes(text.toLowerCase().trim());
  }, []);

  /**
   * Find the most recent pending confirmation in the message list.
   */
  const findPendingConfirmation = useCallback((messages: ChatMessage[]): ChatMessage | undefined => {
    return [...messages].reverse().find(
      (m) => m.contentType === 'expense-confirmation' && m.confirmationStatus === 'pending'
    );
  }, []);

  return {
    handleConfirm,
    handleCancel,
    isAffirmativeConfirmation,
    findPendingConfirmation,
  };
}
