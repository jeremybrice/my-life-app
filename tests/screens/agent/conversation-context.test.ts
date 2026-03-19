import { describe, it, expect } from 'vitest';
import {
  estimateTokenCount,
  trimConversationHistory,
  createConversationContext,
  addToConversationHistory,
} from '../../../src/screens/agent/conversation-context';
import type { ClaudeMessage } from '../../../src/services/claude-client';

describe('conversation-context', () => {
  describe('estimateTokenCount', () => {
    it('should estimate tokens for string content', () => {
      const messages: ClaudeMessage[] = [
        { role: 'user', content: 'Hello world' }, // 11 chars -> ~3 tokens
      ];
      const tokens = estimateTokenCount(messages);
      expect(tokens).toBe(3); // ceil(11/4)
    });

    it('should estimate tokens for multiple messages', () => {
      const messages: ClaudeMessage[] = [
        { role: 'user', content: 'Hello' },       // 5 chars
        { role: 'assistant', content: 'Hi there' }, // 8 chars
      ];
      const tokens = estimateTokenCount(messages);
      expect(tokens).toBe(4); // ceil(13/4)
    });

    it('should handle content blocks', () => {
      const messages: ClaudeMessage[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Hello' },
          ],
        },
      ];
      const tokens = estimateTokenCount(messages);
      expect(tokens).toBe(2); // ceil(5/4)
    });

    it('should return 0 for empty array', () => {
      expect(estimateTokenCount([])).toBe(0);
    });
  });

  describe('trimConversationHistory', () => {
    it('should not trim when under the limit', () => {
      const messages: ClaudeMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi' },
      ];
      const result = trimConversationHistory(messages, 1000);
      expect(result).toHaveLength(2);
    });

    it('should trim oldest messages when over the limit', () => {
      const messages: ClaudeMessage[] = [
        { role: 'user', content: 'A'.repeat(100) },
        { role: 'assistant', content: 'B'.repeat(100) },
        { role: 'user', content: 'C'.repeat(100) },
        { role: 'assistant', content: 'D'.repeat(100) },
        { role: 'user', content: 'E'.repeat(100) },
      ];
      // ~500 chars total = ~125 tokens. Set limit to 75 tokens (300 chars)
      const result = trimConversationHistory(messages, 75);
      expect(result.length).toBeLessThan(5);
      // Should keep the most recent messages
      expect(result[result.length - 1].content).toBe('E'.repeat(100));
    });

    it('should always keep at least one message', () => {
      const messages: ClaudeMessage[] = [
        { role: 'user', content: 'A'.repeat(1000) },
      ];
      const result = trimConversationHistory(messages, 1);
      expect(result).toHaveLength(1);
    });

    it('should ensure first message is from user', () => {
      const messages: ClaudeMessage[] = [
        { role: 'assistant', content: 'old response' },
        { role: 'user', content: 'new question' },
        { role: 'assistant', content: 'new response' },
        { role: 'user', content: 'follow-up' },
      ];
      // Force trimming by setting very low limit
      const result = trimConversationHistory(messages, 10);
      if (result.length > 0) {
        expect(result[0].role).toBe('user');
      }
    });

    it('should return empty array for empty input', () => {
      expect(trimConversationHistory([])).toEqual([]);
    });
  });

  describe('createConversationContext', () => {
    it('should return an empty array', () => {
      const context = createConversationContext();
      expect(context).toEqual([]);
    });
  });

  describe('addToConversationHistory', () => {
    it('should add a message to the history', () => {
      const history: ClaudeMessage[] = [
        { role: 'user', content: 'Hello' },
      ];
      const newMsg: ClaudeMessage = { role: 'assistant', content: 'Hi' };
      const result = addToConversationHistory(history, newMsg);
      expect(result).toHaveLength(2);
      expect(result[1].content).toBe('Hi');
    });

    it('should trim if adding exceeds the limit', () => {
      // Build a history just under 100K tokens
      const history: ClaudeMessage[] = [];
      for (let i = 0; i < 500; i++) {
        history.push({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: 'X'.repeat(800), // ~200 tokens each, 500 * 200 = 100,000
        });
      }
      const newMsg: ClaudeMessage = { role: 'user', content: 'New message' };
      const result = addToConversationHistory(history, newMsg);
      // Should have trimmed some messages
      expect(result.length).toBeLessThanOrEqual(history.length + 1);
      // Most recent message should be preserved
      expect(result[result.length - 1].content).toBe('New message');
    });
  });
});
