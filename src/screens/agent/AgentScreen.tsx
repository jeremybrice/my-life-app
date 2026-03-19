import { useEffect, useRef, useCallback, useState } from 'react';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { WELCOME_MESSAGE } from './agent-types';
import { useAgentConnectivity } from '@/hooks/useAgentConnectivity';
import { useExpenseConfirmation } from './use-expense-confirmation';
import { addToConversationHistory } from './conversation-context';
import { validateApiKey, ClaudeClientError } from '@/services/claude-client';
import { parseExpenseMessage } from '@/services/expense-parser';
import { processReceipt } from '@/services/receipt-processor';
import type { ChatMessage, AgentStatus } from './agent-types';
import type { ClaudeMessage } from '@/services/claude-client';

export function AgentScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [localStatus, setLocalStatus] = useState<AgentStatus>('initializing');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const connectivity = useAgentConnectivity();

  // Track conversation history for API calls (Claude message format)
  const conversationHistoryRef = useRef<ClaudeMessage[]>([]);

  // Track whether Anthropic disclosure has been shown this session
  const disclosureShownRef = useRef(false);

  // Effective status: connectivity overrides local status
  const status: AgentStatus = !connectivity.isOnline ? 'offline' : localStatus;
  // Show reconnection banner if was offline during session but now back online
  const showReconnectionBanner = connectivity.wasOfflineDuringSession && connectivity.isOnline && messages.length > 1;

  // Validate API key on mount (and re-mount after navigation)
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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Session reset: clean up on unmount
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

  // Expense confirmation hook
  const {
    handleConfirm: doConfirm,
    handleCancel: doCancel,
    isAffirmativeConfirmation,
    findPendingConfirmation,
  } = useExpenseConfirmation({ updateMessage, addMessage });

  const handleSendMessage = useCallback(async (text: string) => {
    // Add user message to UI
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      contentType: 'text',
      text,
      timestamp: Date.now(),
    };
    addMessage(userMsg);

    // Check if this is a "yes" confirmation for a pending expense
    const pendingConfirmation = findPendingConfirmation(messages);
    if (pendingConfirmation && isAffirmativeConfirmation(text)) {
      await doConfirm(pendingConfirmation.id, messages);
      return;
    }

    // Add to conversation history
    conversationHistoryRef.current = addToConversationHistory(
      conversationHistoryRef.current,
      { role: 'user', content: text }
    );

    setLocalStatus('loading');

    try {
      const result = await parseExpenseMessage(conversationHistoryRef.current);
      connectivity.markApiSuccess();

      if (result.type === 'expense' && result.expense) {
        // Add assistant response to conversation history
        conversationHistoryRef.current = addToConversationHistory(
          conversationHistoryRef.current,
          {
            role: 'assistant',
            content: `I parsed the following expense: ${JSON.stringify(result.expense)}. Please confirm or cancel.`,
          }
        );

        // Show confirmation card
        const confirmMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          contentType: 'expense-confirmation',
          parsedExpense: result.expense,
          confirmationStatus: 'pending',
          timestamp: Date.now(),
        };
        addMessage(confirmMsg);
      } else {
        // Clarification, redirect, or conversational response
        const responseText = result.message || 'I could not understand that. Could you describe the expense differently?';

        // Add to conversation history
        conversationHistoryRef.current = addToConversationHistory(
          conversationHistoryRef.current,
          { role: 'assistant', content: responseText }
        );

        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          contentType: 'text',
          text: responseText,
          timestamp: Date.now(),
        };
        addMessage(assistantMsg);
      }
    } catch (error) {
      if (error instanceof ClaudeClientError) {
        if (error.errorType === 'network-error') {
          connectivity.markApiFailure();
        }

        const errorMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          contentType: 'error',
          text: error.message,
          timestamp: Date.now(),
        };
        addMessage(errorMsg);
      } else {
        const errorMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          contentType: 'error',
          text: 'An unexpected error occurred. Please try again.',
          timestamp: Date.now(),
        };
        addMessage(errorMsg);
      }
    } finally {
      setLocalStatus('ready');
    }
  }, [messages, addMessage, findPendingConfirmation, isAffirmativeConfirmation, doConfirm, connectivity]);

  const handleImageUpload = useCallback(async (file: File) => {
    // Show Anthropic disclosure on first image upload this session
    if (!disclosureShownRef.current) {
      disclosureShownRef.current = true;
      const disclosureMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'system',
        contentType: 'disclosure',
        text: 'Receipt images are sent to Anthropic (Claude API) for processing. Images are not stored and exist only in memory during processing.',
        timestamp: Date.now(),
      };
      addMessage(disclosureMsg);
    }

    // Create object URL for thumbnail preview
    const imageUrl = URL.createObjectURL(file);

    // Add user message with image thumbnail
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      contentType: 'image',
      imageUrl,
      timestamp: Date.now(),
    };
    addMessage(userMsg);

    setLocalStatus('loading');

    try {
      const result = await processReceipt(file, undefined, conversationHistoryRef.current);
      connectivity.markApiSuccess();

      // Revoke object URL after API response (image no longer needed)
      URL.revokeObjectURL(imageUrl);

      if (result.type === 'receipt' && result.expense) {
        // Add to conversation history
        conversationHistoryRef.current = addToConversationHistory(
          conversationHistoryRef.current,
          {
            role: 'assistant',
            content: `I extracted the following from the receipt: ${JSON.stringify(result.expense)}. Please confirm or cancel.`,
          }
        );

        // Show confirmation card
        const confirmMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          contentType: 'expense-confirmation',
          parsedExpense: result.expense,
          confirmationStatus: 'pending',
          timestamp: Date.now(),
        };
        addMessage(confirmMsg);
      } else if (result.type === 'not-receipt') {
        const responseText = result.message || 'This image does not appear to be a receipt.';

        conversationHistoryRef.current = addToConversationHistory(
          conversationHistoryRef.current,
          { role: 'assistant', content: responseText }
        );

        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          contentType: 'text',
          text: responseText,
          timestamp: Date.now(),
        };
        addMessage(assistantMsg);
      } else {
        // Error from receipt processing
        const errorText = result.message || 'Could not process the receipt. Please try again.';

        const errorMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          contentType: 'error',
          text: errorText,
          timestamp: Date.now(),
        };
        addMessage(errorMsg);
      }
    } catch (error) {
      // Revoke object URL on error too
      URL.revokeObjectURL(imageUrl);

      if (error instanceof ClaudeClientError && error.errorType === 'network-error') {
        connectivity.markApiFailure();
      }

      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        contentType: 'error',
        text: error instanceof ClaudeClientError
          ? error.message
          : 'Failed to process receipt. Please try again.',
        timestamp: Date.now(),
      };
      addMessage(errorMsg);
    } finally {
      setLocalStatus('ready');
    }
  }, [addMessage, connectivity]);

  const handleConfirm = useCallback(async (messageId: string) => {
    await doConfirm(messageId, messages);
  }, [doConfirm, messages]);

  const handleCancel = useCallback((messageId: string) => {
    doCancel(messageId);
  }, [doCancel]);

  // Offline state: show full-screen offline message but preserve messages for when back online
  if (status === 'offline' && messages.length <= 1) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center" data-testid="offline-state">
        <p className="text-lg font-medium text-gray-700 mb-2">Agent Unavailable</p>
        <p className="text-sm text-gray-500">
          An internet connection is required to use the AI agent. Other features continue to work offline.
        </p>
      </div>
    );
  }

  if (status === 'no-api-key') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center" data-testid="no-api-key-state">
        <p className="text-lg font-medium text-gray-700 mb-2">API Key Required</p>
        <p className="text-sm text-gray-500">
          Please add your Claude API key in <a href="/settings" className="text-blue-600 underline">Settings</a> to use the AI agent.
        </p>
      </div>
    );
  }

  if (status === 'invalid-api-key') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center" data-testid="invalid-api-key-state">
        <p className="text-lg font-medium text-gray-700 mb-2">Invalid API Key</p>
        <p className="text-sm text-gray-500">
          Your Claude API key appears to be invalid. Please update it in <a href="/settings" className="text-blue-600 underline">Settings</a>.
        </p>
      </div>
    );
  }

  if (status === 'initializing') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8" data-testid="initializing-state">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
        <p className="text-sm text-gray-500">Initializing agent...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="agent-screen">
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
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
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
      />
    </div>
  );
}
