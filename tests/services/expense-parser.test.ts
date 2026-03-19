import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseResponse, extractJson, parseExpenseMessage } from '../../src/services/expense-parser';
import type { ExpenseParseResult } from '../../src/services/expense-parser';

// Mock dependencies
vi.mock('../../src/services/claude-client', () => ({
  sendMessage: vi.fn(),
}));

vi.mock('../../src/lib/dates', () => ({
  today: () => '2026-03-18',
}));

vi.mock('../../src/lib/currency', () => ({
  roundCurrency: (v: number) => Math.round(v * 100) / 100,
}));

vi.mock('../../src/lib/constants', () => ({
  MAX_VENDOR_LENGTH: 20,
}));

import { sendMessage } from '../../src/services/claude-client';
const mockSendMessage = vi.mocked(sendMessage);

describe('expense-parser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractJson', () => {
    it('should extract JSON from markdown code block', () => {
      const text = 'Here is the result:\n```json\n{"type":"expense","amount":25}\n```';
      expect(extractJson(text)).toBe('{"type":"expense","amount":25}');
    });

    it('should extract JSON from code block without language tag', () => {
      const text = '```\n{"type":"expense"}\n```';
      expect(extractJson(text)).toBe('{"type":"expense"}');
    });

    it('should extract raw JSON object from text', () => {
      const text = 'The parsed expense is {"type":"expense","amount":10}';
      expect(extractJson(text)).toBe('{"type":"expense","amount":10}');
    });

    it('should return null for non-JSON text', () => {
      expect(extractJson('How much did you spend?')).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      expect(extractJson('{invalid json}')).toBeNull();
    });
  });

  describe('parseResponse', () => {
    it('should parse expense type response', () => {
      const json = '```json\n{"type":"expense","amount":25.50,"vendor":"Chipotle","category":"Dining","date":"2026-03-18","description":null}\n```';
      const result = parseResponse(json);
      expect(result.type).toBe('expense');
      expect(result.expense?.amount).toBe(25.50);
      expect(result.expense?.vendor).toBe('Chipotle');
      expect(result.expense?.category).toBe('Dining');
      expect(result.expense?.date).toBe('2026-03-18');
    });

    it('should parse clarification type response', () => {
      const json = '```json\n{"type":"clarification","message":"How much did you spend?","partial":{"vendor":"Subway"}}\n```';
      const result = parseResponse(json);
      expect(result.type).toBe('clarification');
      expect(result.message).toBe('How much did you spend?');
      expect(result.partial?.vendor).toBe('Subway');
    });

    it('should parse redirect type response', () => {
      const json = '```json\n{"type":"redirect","message":"I can only help with expense logging."}\n```';
      const result = parseResponse(json);
      expect(result.type).toBe('redirect');
      expect(result.message).toBe('I can only help with expense logging.');
    });

    it('should treat non-JSON response as clarification', () => {
      const text = 'Could you tell me the amount?';
      const result = parseResponse(text);
      expect(result.type).toBe('clarification');
      expect(result.message).toBe('Could you tell me the amount?');
    });

    it('should truncate vendor names exceeding 20 characters', () => {
      const json = '```json\n{"type":"expense","amount":50,"vendor":"The Cheesecake Factory Restaurant","date":"2026-03-18"}\n```';
      const result = parseResponse(json);
      expect(result.expense?.vendor.length).toBeLessThanOrEqual(20);
    });

    it('should default to today date when date is missing', () => {
      const json = '```json\n{"type":"expense","amount":10,"vendor":"Store"}\n```';
      const result = parseResponse(json);
      expect(result.expense?.date).toBe('2026-03-18');
    });

    it('should default to today date when date format is invalid', () => {
      const json = '```json\n{"type":"expense","amount":10,"vendor":"Store","date":"March 18"}\n```';
      const result = parseResponse(json);
      expect(result.expense?.date).toBe('2026-03-18');
    });

    it('should round amount to 2 decimal places', () => {
      const json = '```json\n{"type":"expense","amount":10.999,"vendor":"Store","date":"2026-03-18"}\n```';
      const result = parseResponse(json);
      expect(result.expense?.amount).toBe(11.00);
    });

    it('should handle null category and description as undefined', () => {
      const json = '```json\n{"type":"expense","amount":10,"vendor":"Store","category":null,"description":null,"date":"2026-03-18"}\n```';
      const result = parseResponse(json);
      expect(result.expense?.category).toBeUndefined();
      expect(result.expense?.description).toBeUndefined();
    });
  });

  describe('parseExpenseMessage', () => {
    it('should call sendMessage with conversation history and system prompt', async () => {
      mockSendMessage.mockResolvedValue({
        text: '```json\n{"type":"expense","amount":25,"vendor":"Chipotle","date":"2026-03-18"}\n```',
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      const history = [{ role: 'user' as const, content: 'Spent $25 at Chipotle' }];
      const result = await parseExpenseMessage(history);

      expect(mockSendMessage).toHaveBeenCalledTimes(1);
      expect(result.type).toBe('expense');
      expect(result.expense?.amount).toBe(25);
    });

    it('should include today date in system prompt', async () => {
      mockSendMessage.mockResolvedValue({
        text: '```json\n{"type":"expense","amount":10,"vendor":"Store","date":"2026-03-18"}\n```',
        usage: { input_tokens: 50, output_tokens: 30 },
      });

      const history = [{ role: 'user' as const, content: 'Spent $10 at store' }];
      await parseExpenseMessage(history);

      const systemPromptArg = mockSendMessage.mock.calls[0][1];
      expect(systemPromptArg).toContain('2026-03-18');
      expect(systemPromptArg).not.toContain('{{TODAY_DATE}}');
    });
  });
});
