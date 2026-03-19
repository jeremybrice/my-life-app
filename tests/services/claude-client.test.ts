import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendMessage, validateApiKey, ClaudeClientError } from '../../src/services/claude-client';
import type { ClaudeMessage } from '../../src/services/claude-client';

// Mock settings-service
vi.mock('../../src/data/settings-service', () => ({
  getSettings: vi.fn(),
}));

// Mock @anthropic-ai/sdk
vi.mock('@anthropic-ai/sdk', () => {
  class APIError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.name = 'APIError';
    }
  }

  const MockAnthropic = vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn(),
    },
  }));

  (MockAnthropic as any).APIError = APIError;

  return { default: MockAnthropic, APIError };
});

import { getSettings } from '../../src/data/settings-service';
import Anthropic from '@anthropic-ai/sdk';

const mockGetSettings = vi.mocked(getSettings);

describe('claude-client', () => {
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Get a fresh mock client each test
    mockCreate = vi.fn();
    (Anthropic as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      messages: { create: mockCreate },
    }));
  });

  describe('sendMessage', () => {
    it('should throw missing-api-key when no API key is configured', async () => {
      mockGetSettings.mockResolvedValue({ id: 1 });

      const messages: ClaudeMessage[] = [{ role: 'user', content: 'Hello' }];
      await expect(sendMessage(messages, 'system prompt')).rejects.toThrow(ClaudeClientError);

      try {
        await sendMessage(messages, 'system prompt');
      } catch (e) {
        expect((e as ClaudeClientError).errorType).toBe('missing-api-key');
      }
    });

    it('should return text response on successful call', async () => {
      mockGetSettings.mockResolvedValue({ id: 1, apiKey: 'sk-valid-key' });
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Hello back!' }],
        usage: { input_tokens: 10, output_tokens: 5 },
      });

      const messages: ClaudeMessage[] = [{ role: 'user', content: 'Hello' }];
      const result = await sendMessage(messages, 'system prompt');

      expect(result.text).toBe('Hello back!');
      expect(result.usage.input_tokens).toBe(10);
      expect(result.usage.output_tokens).toBe(5);
    });

    it('should throw invalid-api-key on 401 error', async () => {
      mockGetSettings.mockResolvedValue({ id: 1, apiKey: 'sk-bad-key' });
      const APIError = (Anthropic as any).APIError;
      mockCreate.mockRejectedValue(new APIError(401, 'Unauthorized'));

      const messages: ClaudeMessage[] = [{ role: 'user', content: 'Hello' }];
      try {
        await sendMessage(messages, 'system prompt');
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ClaudeClientError);
        expect((e as ClaudeClientError).errorType).toBe('invalid-api-key');
      }
    });

    it('should throw rate-limited on 429 error', async () => {
      mockGetSettings.mockResolvedValue({ id: 1, apiKey: 'sk-valid-key' });
      const APIError = (Anthropic as any).APIError;
      mockCreate.mockRejectedValue(new APIError(429, 'Rate limited'));

      const messages: ClaudeMessage[] = [{ role: 'user', content: 'Hello' }];
      try {
        await sendMessage(messages, 'system prompt');
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ClaudeClientError);
        expect((e as ClaudeClientError).errorType).toBe('rate-limited');
      }
    });

    it('should throw timeout when request is aborted', async () => {
      mockGetSettings.mockResolvedValue({ id: 1, apiKey: 'sk-valid-key' });
      mockCreate.mockRejectedValue(new DOMException('Aborted', 'AbortError'));

      const messages: ClaudeMessage[] = [{ role: 'user', content: 'Hello' }];
      try {
        await sendMessage(messages, 'system prompt');
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ClaudeClientError);
        expect((e as ClaudeClientError).errorType).toBe('timeout');
      }
    });

    it('should pass system prompt and messages to the API', async () => {
      mockGetSettings.mockResolvedValue({ id: 1, apiKey: 'sk-valid-key' });
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'ok' }],
        usage: { input_tokens: 5, output_tokens: 1 },
      });

      const messages: ClaudeMessage[] = [
        { role: 'user', content: 'First message' },
        { role: 'assistant', content: 'Response' },
        { role: 'user', content: 'Follow-up' },
      ];
      await sendMessage(messages, 'You are an expense assistant.');

      expect(mockCreate).toHaveBeenCalledTimes(1);
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.system).toBe('You are an expense assistant.');
      expect(callArgs.messages).toHaveLength(3);
      expect(callArgs.messages[0].content).toBe('First message');
    });

    it('should handle multimodal content blocks', async () => {
      mockGetSettings.mockResolvedValue({ id: 1, apiKey: 'sk-valid-key' });
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Receipt processed' }],
        usage: { input_tokens: 100, output_tokens: 20 },
      });

      const messages: ClaudeMessage[] = [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'abc123' } },
          { type: 'text', text: 'Process this receipt' },
        ],
      }];
      const result = await sendMessage(messages, 'system');
      expect(result.text).toBe('Receipt processed');
    });
  });

  describe('validateApiKey', () => {
    it('should return true for valid API key', async () => {
      mockGetSettings.mockResolvedValue({ id: 1, apiKey: 'sk-valid-key' });
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'ok' }],
        usage: { input_tokens: 3, output_tokens: 1 },
      });

      const result = await validateApiKey();
      expect(result).toBe(true);
    });

    it('should throw for invalid API key', async () => {
      mockGetSettings.mockResolvedValue({ id: 1, apiKey: 'sk-bad-key' });
      const APIError = (Anthropic as any).APIError;
      mockCreate.mockRejectedValue(new APIError(401, 'Unauthorized'));

      await expect(validateApiKey()).rejects.toThrow(ClaudeClientError);
    });
  });
});
