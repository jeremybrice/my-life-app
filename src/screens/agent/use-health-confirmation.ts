import { useCallback } from 'react';
import {
  createLogEntry,
  deleteLogEntry,
  getLogEntriesByRoutine,
  createRoutine,
  deleteRoutine,
} from '@/data/health-service';
import type { ChatMessage } from './agent-types';

interface UseHealthConfirmationProps {
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  addMessage: (msg: ChatMessage) => void;
}

export function useHealthConfirmation({
  updateMessage,
  addMessage,
}: UseHealthConfirmationProps) {
  const handleConfirm = useCallback(async (messageId: string, messages: ChatMessage[]) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;

    updateMessage(messageId, { confirmationStatus: 'saving' });

    try {
      switch (msg.contentType) {
        case 'health-log-confirmation': {
          if (!msg.parsedHealthLog) throw new Error('No health log data');
          await createLogEntry({
            routineId: msg.parsedHealthLog.routineId,
            date: msg.parsedHealthLog.date,
            metrics: msg.parsedHealthLog.metrics,
          });
          break;
        }

        case 'health-delete-confirmation': {
          if (!msg.parsedHealthLog) throw new Error('No health log data');
          // Find and delete the most recent entry for this routine on this date
          const entries = await getLogEntriesByRoutine(msg.parsedHealthLog.routineId);
          const match = entries.find((e) => e.date === msg.parsedHealthLog!.date);
          if (match?.id) {
            await deleteLogEntry(match.id);
          } else {
            throw new Error('Could not find the log entry to delete');
          }
          break;
        }

        case 'health-routine-create-confirmation': {
          if (!msg.parsedHealthRoutineAction) throw new Error('No routine action data');
          const action = msg.parsedHealthRoutineAction;
          await createRoutine({
            name: action.name,
            frequencyType: action.frequencyType ?? 'weekly',
            dailyTarget: action.dailyTarget,
            targetFrequency: action.targetFrequency,
            trackedMetrics: action.trackedMetrics?.map((m) => ({
              type: m.type as 'duration' | 'distance' | 'reps' | 'weight',
              unit: m.unit,
            })) ?? [],
          });
          break;
        }

        case 'health-routine-delete-confirmation': {
          if (!msg.parsedHealthRoutineAction?.routineId) throw new Error('No routine ID');
          await deleteRoutine(msg.parsedHealthRoutineAction.routineId);
          break;
        }

        default:
          throw new Error(`Unknown health confirmation type: ${msg.contentType}`);
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
    const healthTypes: ChatMessage['contentType'][] = [
      'health-log-confirmation',
      'health-delete-confirmation',
      'health-routine-create-confirmation',
      'health-routine-delete-confirmation',
    ];
    return [...messages].reverse().find(
      (m) => healthTypes.includes(m.contentType) && m.confirmationStatus === 'pending'
    );
  }, []);

  return { handleConfirm, handleCancel, findPendingConfirmation };
}
