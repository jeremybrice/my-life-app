import { useEffect, useRef, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { getPipelineConfig } from './pipelines';
import { useAgentConnectivity } from '@/hooks/useAgentConnectivity';
import { useExpenseConfirmation } from './use-expense-confirmation';
import { useExpenseDeleteConfirmation } from './use-expense-delete-confirmation';
import { useHealthConfirmation } from './use-health-confirmation';
import { useGoalConfirmation } from './use-goal-confirmation';
import { addToConversationHistory } from './conversation-context';
import { validateApiKey, ClaudeClientError } from '@/services/claude-client';
import { parseExpenseMessage } from '@/services/expense-parser';
import { parseBudgetQuery } from '@/services/budget-insights-parser';
import { parseHealthMessage } from '@/services/health-parser';
import { parseGoalsMessage } from '@/services/goals-parser';
import { processReceipt } from '@/services/receipt-processor';
import type { ChatMessage, AgentStatus } from './agent-types';
import type { ClaudeMessage } from '@/services/claude-client';

export function AgentScreen() {
  const { pipelineId } = useParams<{ pipelineId: string }>();
  const navigate = useNavigate();
  const config = getPipelineConfig(pipelineId ?? '');

  // Redirect to workflow selector if invalid pipeline
  useEffect(() => {
    if (!config) {
      navigate('/agent', { replace: true });
    }
  }, [config, navigate]);

  const welcomeMessage: ChatMessage = {
    id: 'welcome',
    role: 'assistant',
    contentType: 'text',
    text: config?.welcomeMessage ?? '',
    timestamp: 0,
    pipelineId: pipelineId,
  };

  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [localStatus, setLocalStatus] = useState<AgentStatus>('initializing');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const connectivity = useAgentConnectivity();

  const conversationHistoryRef = useRef<ClaudeMessage[]>([]);
  const disclosureShownRef = useRef(false);

  const status: AgentStatus = !connectivity.isOnline ? 'offline' : localStatus;
  const showReconnectionBanner = connectivity.wasOfflineDuringSession && connectivity.isOnline && messages.length > 1;

  // Validate API key on mount
  useEffect(() => {
    let cancelled = false;

    async function validate() {
      if (!connectivity.isOnline) return;

      setLocalStatus('initializing');
      try {
        await validateApiKey();
        if (!cancelled) {
          setLocalStatus('ready');
        }
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ClaudeClientError) {
          switch (error.errorType) {
            case 'missing-api-key':
              setLocalStatus('no-api-key');
              break;
            case 'invalid-api-key':
              setLocalStatus('invalid-api-key');
              break;
            case 'network-error':
              connectivity.markApiFailure();
              break;
            default:
              setLocalStatus('error');
          }
        } else {
          setLocalStatus('error');
        }
      }
    }

    validate();

    return () => {
      cancelled = true;
    };
  }, [connectivity.isOnline]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setMessages((prev) => {
        prev.forEach((msg) => {
          if (msg.imageUrl) {
            URL.revokeObjectURL(msg.imageUrl);
          }
        });
        return prev;
      });
      conversationHistoryRef.current = [];
    };
  }, []);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<ChatMessage>) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg))
    );
  }, []);

  // Confirmation hooks
  const expenseConfirmation = useExpenseConfirmation({ updateMessage, addMessage });
  const expenseDeleteConfirmation = useExpenseDeleteConfirmation({ updateMessage, addMessage });
  const healthConfirmation = useHealthConfirmation({ updateMessage, addMessage });
  const goalConfirmation = useGoalConfirmation({ updateMessage, addMessage });

  // Find any pending confirmation across all types
  const findAnyPendingConfirmation = useCallback((msgs: ChatMessage[]): ChatMessage | undefined => {
    return expenseConfirmation.findPendingConfirmation(msgs)
      ?? expenseDeleteConfirmation.findPendingConfirmation(msgs)
      ?? healthConfirmation.findPendingConfirmation(msgs)
      ?? goalConfirmation.findPendingConfirmation(msgs);
  }, [expenseConfirmation, expenseDeleteConfirmation, healthConfirmation, goalConfirmation]);

  // Route confirm/cancel to the right handler based on content type
  const handleConfirm = useCallback(async (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;

    const ct = msg.contentType;
    if (ct === 'expense-confirmation') {
      await expenseConfirmation.handleConfirm(messageId, messages);
    } else if (ct === 'expense-delete-confirmation') {
      await expenseDeleteConfirmation.handleConfirm(messageId, messages);
    } else if (ct.startsWith('health-')) {
      await healthConfirmation.handleConfirm(messageId, messages);
    } else if (ct.startsWith('goal-')) {
      await goalConfirmation.handleConfirm(messageId, messages);
    }
  }, [messages, expenseConfirmation, expenseDeleteConfirmation, healthConfirmation, goalConfirmation]);

  const handleCancel = useCallback((messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;

    const ct = msg.contentType;
    if (ct === 'expense-confirmation') {
      expenseConfirmation.handleCancel(messageId);
    } else if (ct === 'expense-delete-confirmation') {
      expenseDeleteConfirmation.handleCancel(messageId);
    } else if (ct.startsWith('health-')) {
      healthConfirmation.handleCancel(messageId);
    } else if (ct.startsWith('goal-')) {
      goalConfirmation.handleCancel(messageId);
    }
  }, [messages, expenseConfirmation, expenseDeleteConfirmation, healthConfirmation, goalConfirmation]);

  // Dispatch message to the correct parser based on pipeline
  const dispatchMessage = useCallback(async (conversationHistory: ClaudeMessage[]) => {
    switch (pipelineId) {
      case 'expense': {
        const result = await parseExpenseMessage(conversationHistory);
        return handleExpenseResult(result);
      }
      case 'budget-insights': {
        const result = await parseBudgetQuery(conversationHistory);
        return handleBudgetResult(result);
      }
      case 'health': {
        const result = await parseHealthMessage(conversationHistory);
        return handleHealthResult(result);
      }
      case 'goals': {
        const result = await parseGoalsMessage(conversationHistory);
        return handleGoalsResult(result);
      }
      default:
        return {
          id: crypto.randomUUID(),
          role: 'assistant' as const,
          contentType: 'error' as const,
          text: 'Unknown pipeline.',
          timestamp: Date.now(),
        };
    }
  }, [pipelineId]);

  const handleSendMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      contentType: 'text',
      text,
      timestamp: Date.now(),
      pipelineId,
    };
    addMessage(userMsg);

    // Check for affirmative confirmation of pending card
    const pendingConfirmation = findAnyPendingConfirmation(messages);
    if (pendingConfirmation && expenseConfirmation.isAffirmativeConfirmation(text)) {
      await handleConfirm(pendingConfirmation.id);
      return;
    }

    conversationHistoryRef.current = addToConversationHistory(
      conversationHistoryRef.current,
      { role: 'user', content: text }
    );

    setLocalStatus('loading');

    try {
      const response = await dispatchMessage(conversationHistoryRef.current);
      connectivity.markApiSuccess();

      // Add assistant response to conversation history
      const historyContent = ('parsedExpense' in response && response.parsedExpense)
        ? `I parsed the following: ${JSON.stringify(response.parsedExpense)}. Please confirm or cancel.`
        : response.text ?? 'Done.';
      conversationHistoryRef.current = addToConversationHistory(
        conversationHistoryRef.current,
        { role: 'assistant', content: historyContent }
      );

      addMessage(response);
    } catch (error) {
      if (error instanceof ClaudeClientError) {
        if (error.errorType === 'network-error') {
          connectivity.markApiFailure();
        }
        addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          contentType: 'error',
          text: error.message,
          timestamp: Date.now(),
        });
      } else {
        addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          contentType: 'error',
          text: 'An unexpected error occurred. Please try again.',
          timestamp: Date.now(),
        });
      }
    } finally {
      setLocalStatus('ready');
    }
  }, [messages, addMessage, pipelineId, findAnyPendingConfirmation, expenseConfirmation, handleConfirm, dispatchMessage, connectivity]);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!disclosureShownRef.current) {
      disclosureShownRef.current = true;
      addMessage({
        id: crypto.randomUUID(),
        role: 'system',
        contentType: 'disclosure',
        text: 'Receipt images are sent to Anthropic (Claude API) for processing. Images are not stored and exist only in memory during processing.',
        timestamp: Date.now(),
      });
    }

    const imageUrl = URL.createObjectURL(file);
    addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      contentType: 'image',
      imageUrl,
      timestamp: Date.now(),
      pipelineId,
    });

    setLocalStatus('loading');

    try {
      const result = await processReceipt(file, undefined, conversationHistoryRef.current);
      connectivity.markApiSuccess();

      if (result.type === 'receipt' && result.expense) {
        conversationHistoryRef.current = addToConversationHistory(
          conversationHistoryRef.current,
          {
            role: 'assistant',
            content: `I extracted the following from the receipt: ${JSON.stringify(result.expense)}. Please confirm or cancel.`,
          }
        );

        addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          contentType: 'expense-confirmation',
          parsedExpense: result.expense,
          confirmationStatus: 'pending',
          timestamp: Date.now(),
        });
      } else if (result.type === 'not-receipt') {
        const responseText = result.message || 'This image does not appear to be a receipt.';
        conversationHistoryRef.current = addToConversationHistory(
          conversationHistoryRef.current,
          { role: 'assistant', content: responseText }
        );
        addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          contentType: 'text',
          text: responseText,
          timestamp: Date.now(),
        });
      } else {
        addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          contentType: 'error',
          text: result.message || 'Could not process the receipt. Please try again.',
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      if (error instanceof ClaudeClientError && error.errorType === 'network-error') {
        connectivity.markApiFailure();
      }
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        contentType: 'error',
        text: error instanceof ClaudeClientError
          ? error.message
          : 'Failed to process receipt. Please try again.',
        timestamp: Date.now(),
      });
    } finally {
      setLocalStatus('ready');
    }
  }, [addMessage, connectivity, pipelineId]);

  if (!config) return null;

  // Status screens
  if (status === 'offline' && messages.length <= 1) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center" data-testid="offline-state">
        <p className="text-lg font-medium text-fg-secondary mb-2">Agent Unavailable</p>
        <p className="text-sm text-fg-muted">
          An internet connection is required to use the AI agent. Other features continue to work offline.
        </p>
      </div>
    );
  }

  if (status === 'no-api-key') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center" data-testid="no-api-key-state">
        <p className="text-lg font-medium text-fg-secondary mb-2">API Key Required</p>
        <p className="text-sm text-fg-muted">
          Please add your Claude API key in <a href="/settings" className="text-accent underline">Settings</a> to use the AI agent.
        </p>
      </div>
    );
  }

  if (status === 'invalid-api-key') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center" data-testid="invalid-api-key-state">
        <p className="text-lg font-medium text-fg-secondary mb-2">Invalid API Key</p>
        <p className="text-sm text-fg-muted">
          Your Claude API key appears to be invalid. Please update it in <a href="/settings" className="text-accent underline">Settings</a>.
        </p>
      </div>
    );
  }

  if (status === 'initializing') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8" data-testid="initializing-state">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mb-3"></div>
        <p className="text-sm text-fg-muted">Initializing agent...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in flex flex-col fixed inset-0 top-0 bottom-16 md:left-64 md:bottom-0 z-30" data-testid="agent-screen">
      {/* Pipeline header with back button */}
      <div className="flex items-center gap-3 px-4 py-3 pt-safe border-b border-edge bg-surface-card">
        <button
          type="button"
          onClick={() => navigate('/agent')}
          className="text-fg-muted hover:text-fg-secondary"
          aria-label="Back to workflows"
          data-testid="back-to-workflows"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-sm font-semibold text-fg">{config.title}</h2>
          <p className="text-xs text-fg-muted">{config.categoryDescription}</p>
        </div>
      </div>

      {/* Offline banner mid-conversation */}
      {status === 'offline' && messages.length > 1 && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800 text-center" data-testid="offline-banner">
          You are offline. The conversation is preserved but you cannot send new messages until reconnected.
        </div>
      )}

      {/* Reconnection banner */}
      {showReconnectionBanner && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-2 text-sm text-green-700 text-center" data-testid="reconnection-banner">
          Connection restored. You can continue your conversation.
        </div>
      )}

      {/* Message Thread */}
      <div className="flex-1 overflow-y-auto p-4" data-testid="message-thread">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        ))}
        {localStatus === 'loading' && (
          <div className="flex justify-start mb-3" data-testid="typing-indicator">
            <div className="bg-surface-tertiary rounded-lg px-4 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-fg-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-fg-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-fg-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <ChatInput
        onSendMessage={handleSendMessage}
        onImageUpload={handleImageUpload}
        disabled={status === 'offline'}
        loading={localStatus === 'loading'}
        placeholder={config.inputPlaceholder}
        showImageUpload={config.supportsImageUpload}
      />
    </div>
  );
}

// --- Result handlers: convert parser output to ChatMessage ---

function handleExpenseResult(result: Awaited<ReturnType<typeof parseExpenseMessage>>): ChatMessage {
  if (result.type === 'expense' && result.expense) {
    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      contentType: 'expense-confirmation',
      parsedExpense: result.expense,
      confirmationStatus: 'pending',
      timestamp: Date.now(),
    };
  }
  if (result.type === 'expense-delete' && result.deleteExpense) {
    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      contentType: 'expense-delete-confirmation',
      parsedExpense: {
        amount: result.deleteExpense.amount,
        vendor: result.deleteExpense.vendor,
        date: result.deleteExpense.date,
        // Store expense ID in lineItems for the delete handler
        lineItems: [{ description: 'expense-id', amount: result.expenseId ?? 0 }],
      },
      confirmationStatus: 'pending',
      timestamp: Date.now(),
    };
  }
  return {
    id: crypto.randomUUID(),
    role: 'assistant',
    contentType: 'text',
    text: result.message || 'I could not understand that. Could you describe the expense differently?',
    timestamp: Date.now(),
  };
}

function handleBudgetResult(result: Awaited<ReturnType<typeof parseBudgetQuery>>): ChatMessage {
  if (result.type === 'answer') {
    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      contentType: 'data-answer',
      text: result.text ?? result.message ?? '',
      timestamp: Date.now(),
    };
  }
  return {
    id: crypto.randomUUID(),
    role: 'assistant',
    contentType: 'text',
    text: result.message ?? 'That question is outside the scope of budget insights. Try the other workflows for that.',
    timestamp: Date.now(),
  };
}

function handleHealthResult(result: Awaited<ReturnType<typeof parseHealthMessage>>): ChatMessage {
  switch (result.type) {
    case 'health-log':
      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        contentType: 'health-log-confirmation',
        parsedHealthLog: {
          routineId: result.routineId,
          routineName: result.routineName,
          date: result.date,
          metrics: result.metrics,
        },
        confirmationStatus: 'pending',
        timestamp: Date.now(),
      };
    case 'health-delete':
      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        contentType: 'health-delete-confirmation',
        parsedHealthLog: {
          routineId: result.routineId,
          routineName: result.routineName,
          date: result.date,
        },
        confirmationStatus: 'pending',
        timestamp: Date.now(),
      };
    case 'health-routine-create':
      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        contentType: 'health-routine-create-confirmation',
        parsedHealthRoutineAction: {
          action: 'create',
          name: result.name,
          frequencyType: result.frequencyType,
          dailyTarget: result.dailyTarget,
          targetFrequency: result.targetFrequency,
          trackedMetrics: result.trackedMetrics,
        },
        confirmationStatus: 'pending',
        timestamp: Date.now(),
      };
    case 'health-routine-delete':
      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        contentType: 'health-routine-delete-confirmation',
        parsedHealthRoutineAction: {
          action: 'delete',
          routineId: result.routineId,
          name: result.routineName,
          message: result.message,
        },
        confirmationStatus: 'pending',
        timestamp: Date.now(),
      };
    case 'health-answer':
      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        contentType: 'data-answer',
        text: result.text,
        timestamp: Date.now(),
      };
    case 'clarification':
      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        contentType: 'text',
        text: result.message,
        timestamp: Date.now(),
      };
    case 'redirect':
      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        contentType: 'text',
        text: result.message,
        timestamp: Date.now(),
      };
  }
}

function handleGoalsResult(result: Awaited<ReturnType<typeof parseGoalsMessage>>): ChatMessage {
  switch (result.type) {
    case 'goal-create':
      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        contentType: 'goal-create-confirmation',
        parsedGoalAction: {
          action: 'create',
          goalTitle: result.title,
          goalType: result.goalType,
          progressModel: result.progressModel,
          targetValue: result.targetValue,
          currentValue: result.currentValue,
          targetDate: result.targetDate,
          description: result.description,
        },
        confirmationStatus: 'pending',
        timestamp: Date.now(),
      };
    case 'goal-update':
      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        contentType: 'goal-update-confirmation',
        parsedGoalAction: {
          action: 'update',
          goalId: result.goalId,
          goalTitle: result.goalTitle,
          field: result.field,
          oldValue: result.oldValue,
          newValue: result.newValue,
          message: result.message,
        },
        confirmationStatus: 'pending',
        timestamp: Date.now(),
      };
    case 'goal-edit':
      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        contentType: 'goal-edit-confirmation',
        parsedGoalAction: {
          action: 'edit',
          goalId: result.goalId,
          goalTitle: result.goalTitle,
          updates: result.updates,
          message: result.message,
        },
        confirmationStatus: 'pending',
        timestamp: Date.now(),
      };
    case 'goal-delete':
      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        contentType: 'goal-delete-confirmation',
        parsedGoalAction: {
          action: 'delete',
          goalId: result.goalId,
          goalTitle: result.goalTitle,
        },
        confirmationStatus: 'pending',
        timestamp: Date.now(),
      };
    case 'goal-answer':
      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        contentType: 'data-answer',
        text: result.text,
        timestamp: Date.now(),
      };
    case 'clarification':
      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        contentType: 'text',
        text: result.message,
        timestamp: Date.now(),
      };
    case 'redirect':
      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        contentType: 'text',
        text: result.message,
        timestamp: Date.now(),
      };
  }
}
