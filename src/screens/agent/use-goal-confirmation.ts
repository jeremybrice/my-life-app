import { useCallback } from 'react';
import {
  createGoal,
  updateGoal,
  deleteGoal,
} from '@/data/goal-service';
import type { ChatMessage } from './agent-types';

interface UseGoalConfirmationProps {
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  addMessage: (msg: ChatMessage) => void;
}

export function useGoalConfirmation({
  updateMessage,
  addMessage,
}: UseGoalConfirmationProps) {
  const handleConfirm = useCallback(async (messageId: string, messages: ChatMessage[]) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg?.parsedGoalAction) return;

    updateMessage(messageId, { confirmationStatus: 'saving' });
    const action = msg.parsedGoalAction;

    try {
      switch (action.action) {
        case 'create':
          await createGoal({
            title: action.goalTitle,
            type: (action.goalType as 'financial' | 'personal' | 'strategic' | 'custom') ?? 'custom',
            progressModel: (action.progressModel as 'numeric' | 'percentage' | 'date-based' | 'freeform') ?? 'freeform',
            targetValue: action.targetValue,
            currentValue: action.currentValue ?? 0,
            targetDate: action.targetDate,
            description: action.description,
          });
          break;

        case 'update': {
          if (!action.goalId) throw new Error('No goal ID');
          const updateData: Record<string, unknown> = {};
          if (action.field) {
            updateData[action.field] = action.newValue;
          }
          await updateGoal(action.goalId, updateData);
          break;
        }

        case 'edit': {
          if (!action.goalId) throw new Error('No goal ID');
          const updates: Record<string, unknown> = {};
          if (action.updates) {
            for (const [key, val] of Object.entries(action.updates)) {
              if (val !== null && val !== undefined) {
                updates[key] = val;
              }
            }
          }
          await updateGoal(action.goalId, updates);
          break;
        }

        case 'delete':
          if (!action.goalId) throw new Error('No goal ID');
          await deleteGoal(action.goalId);
          break;

        default:
          throw new Error(`Unknown goal action: ${action.action}`);
      }

      updateMessage(messageId, { confirmationStatus: 'saved' });
    } catch (error) {
      updateMessage(messageId, { confirmationStatus: 'error' });
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        contentType: 'error',
        text: error instanceof Error ? error.message : 'Failed to save. Please try again.',
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
      text: 'No problem — action cancelled. What else can I help with?',
      timestamp: Date.now(),
    });
  }, [updateMessage, addMessage]);

  const findPendingConfirmation = useCallback((messages: ChatMessage[]): ChatMessage | undefined => {
    const goalTypes: ChatMessage['contentType'][] = [
      'goal-create-confirmation',
      'goal-update-confirmation',
      'goal-edit-confirmation',
      'goal-delete-confirmation',
    ];
    return [...messages].reverse().find(
      (m) => goalTypes.includes(m.contentType) && m.confirmationStatus === 'pending'
    );
  }, []);

  return { handleConfirm, handleCancel, findPendingConfirmation };
}
