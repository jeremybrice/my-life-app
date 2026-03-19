import type { ClaudeMessage } from '@/services/claude-client';

/**
 * Maximum approximate token count before trimming old messages.
 * Claude's context window is large (200K+), but we set a practical limit
 * to avoid excessively large requests. One token ~= 4 characters.
 */
const MAX_CONTEXT_TOKENS = 100_000;
const CHARS_PER_TOKEN = 4;

/**
 * Estimate the token count of a message array.
 * This is a rough approximation: ~4 characters per token.
 */
export function estimateTokenCount(messages: ClaudeMessage[]): number {
  let totalChars = 0;
  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      totalChars += msg.content.length;
    } else {
      // Content blocks
      for (const block of msg.content) {
        if (block.type === 'text' && block.text) {
          totalChars += block.text.length;
        }
        if (block.type === 'image' && block.source?.data) {
          // Base64 image data: rough estimate
          totalChars += block.source.data.length;
        }
      }
    }
  }
  return Math.ceil(totalChars / CHARS_PER_TOKEN);
}

/**
 * Trim the conversation history to fit within the context window.
 * Drops the oldest messages (preserving the system prompt which is sent separately).
 * Always keeps at least the most recent user message.
 */
export function trimConversationHistory(
  messages: ClaudeMessage[],
  maxTokens: number = MAX_CONTEXT_TOKENS
): ClaudeMessage[] {
  if (messages.length === 0) return [];

  let currentTokens = estimateTokenCount(messages);

  if (currentTokens <= maxTokens) {
    return messages;
  }

  // Drop oldest messages until we're under the limit
  const trimmed = [...messages];
  while (trimmed.length > 1 && estimateTokenCount(trimmed) > maxTokens) {
    trimmed.shift();
  }

  // Ensure the first message is from the user (Claude API requires alternating roles starting with user)
  while (trimmed.length > 0 && trimmed[0]!.role !== 'user') {
    trimmed.shift();
  }

  return trimmed;
}

/**
 * Create a new conversation context (empty message array).
 */
export function createConversationContext(): ClaudeMessage[] {
  return [];
}

/**
 * Add a message to the conversation history, trimming if necessary.
 */
export function addToConversationHistory(
  history: ClaudeMessage[],
  message: ClaudeMessage
): ClaudeMessage[] {
  const updated = [...history, message];
  return trimConversationHistory(updated);
}
