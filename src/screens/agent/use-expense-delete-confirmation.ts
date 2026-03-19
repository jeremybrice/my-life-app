import { useCallback } from 'react';
import { deleteExpense } from '@/data/expense-service';
import type { ChatMessage } from './agent-types';

interface UseExpenseDeleteConfirmationProps {
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  addMessage: (msg: ChatMessage) => void;
}

export function useExpenseDeleteConfirmation({
  updateMessage,
  addMessage,
}: UseExpenseDeleteConfirmationProps) {
  const handleConfirm = useCallback(async (messageId: string, messages: ChatMessage[]) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg?.parsedExpense) return;

    updateMessage(messageId, { confirmationStatus: 'saving' });

    try {
      // The parsedExpense.lineItems[0].amount stores the expense ID for delete operations
      const expenseId = msg.parsedExpense.lineItems?.[0]?.amount;
      if (typeof expenseId !== 'number') {
        throw new Error('No expense ID found for deletion');
      }
      await deleteExpense(expenseId);
      updateMessage(messageId, { confirmationStatus: 'saved' });
    } catch (error) {
      updateMessage(messageId, { confirmationStatus: 'error' });
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        contentType: 'error',
        text: error instanceof Error ? error.message : 'Failed to delete expense.',
        timestamp: Date.now(),
      });
    }
  }, [updateMessage, addMessage]);

  const handleCancel = useCallback((messageId: string) => {
    updateMessage(messageId, { confirmationStatus: 'cancelled' });
    addMessage({
      id: crypto.randomUUID(),
      role: 'assistant',
      contentType: 'text',
      text: 'No problem — the expense was not deleted.',
      timestamp: Date.now(),
    });
  }, [updateMessage, addMessage]);

  const findPendingConfirmation = useCallback((messages: ChatMessage[]): ChatMessage | undefined => {
    return [...messages].reverse().find(
      (m) => m.contentType === 'expense-delete-confirmation' && m.confirmationStatus === 'pending'
    );
  }, []);

  return { handleConfirm, handleCancel, findPendingConfirmation };
}
