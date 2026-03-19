import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processReceipt, fileToBase64, getMediaType } from '../../src/services/receipt-processor';

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

function createMockFile(type: string = 'image/jpeg'): File {
  const blob = new Blob(['fake-image-data'], { type });
  return new File([blob], 'receipt.jpg', { type });
}

describe('receipt-processor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMediaType', () => {
    it('should return image/jpeg for JPEG files', () => {
      const file = createMockFile('image/jpeg');
      expect(getMediaType(file)).toBe('image/jpeg');
    });

    it('should return image/png for PNG files', () => {
      const file = createMockFile('image/png');
      expect(getMediaType(file)).toBe('image/png');
    });

    it('should default to image/jpeg for unknown types', () => {
      const file = createMockFile('image/webp');
      expect(getMediaType(file)).toBe('image/jpeg');
    });
  });

  describe('fileToBase64', () => {
    it('should convert a file to base64 string', async () => {
      const file = createMockFile();
      const result = await fileToBase64(file);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('processReceipt', () => {
    it('should return parsed receipt data on successful extraction', async () => {
      mockSendMessage.mockResolvedValue({
        text: '```json\n{"type":"receipt","amount":45.67,"vendor":"Target","date":"2026-03-15","lineItems":[{"description":"Milk","amount":3.99},{"description":"Bread","amount":2.49}],"category":"Groceries"}\n```',
        usage: { input_tokens: 500, output_tokens: 100 },
      });

      const file = createMockFile();
      const result = await processReceipt(file);

      expect(result.type).toBe('receipt');
      expect(result.expense?.amount).toBe(45.67);
      expect(result.expense?.vendor).toBe('Target');
      expect(result.expense?.date).toBe('2026-03-15');
      expect(result.expense?.lineItems).toHaveLength(2);
      expect(result.expense?.category).toBe('Groceries');
    });

    it('should return not-receipt for non-receipt images', async () => {
      mockSendMessage.mockResolvedValue({
        text: '```json\n{"type":"not-receipt","message":"This appears to be a landscape photo."}\n```',
        usage: { input_tokens: 500, output_tokens: 50 },
      });

      const file = createMockFile();
      const result = await processReceipt(file);

      expect(result.type).toBe('not-receipt');
      expect(result.message).toContain('landscape');
    });

    it('should default date to today when receipt date is null', async () => {
      mockSendMessage.mockResolvedValue({
        text: '```json\n{"type":"receipt","amount":20.00,"vendor":"Store","date":null,"lineItems":[]}\n```',
        usage: { input_tokens: 500, output_tokens: 50 },
      });

      const file = createMockFile();
      const result = await processReceipt(file);

      expect(result.expense?.date).toBe('2026-03-18');
    });

    it('should truncate long vendor names to 20 characters', async () => {
      mockSendMessage.mockResolvedValue({
        text: '```json\n{"type":"receipt","amount":50.00,"vendor":"The Cheesecake Factory Restaurant","date":"2026-03-18","lineItems":[]}\n```',
        usage: { input_tokens: 500, output_tokens: 50 },
      });

      const file = createMockFile();
      const result = await processReceipt(file);

      expect(result.expense?.vendor.length).toBeLessThanOrEqual(20);
    });

    it('should include accompanying text in the API call', async () => {
      mockSendMessage.mockResolvedValue({
        text: '```json\n{"type":"receipt","amount":30.00,"vendor":"Cafe","date":"2026-03-18","lineItems":[]}\n```',
        usage: { input_tokens: 500, output_tokens: 50 },
      });

      const file = createMockFile();
      await processReceipt(file, 'team lunch last week');

      const callArgs = mockSendMessage.mock.calls[0][0];
      const lastMessage = callArgs[callArgs.length - 1];
      expect(Array.isArray(lastMessage.content)).toBe(true);
      const textBlock = (lastMessage.content as Array<{ type: string; text?: string }>).find(
        (b) => b.type === 'text'
      );
      expect(textBlock?.text).toBe('team lunch last week');
    });

    it('should return error when response cannot be parsed', async () => {
      mockSendMessage.mockResolvedValue({
        text: 'I cannot read this image clearly.',
        usage: { input_tokens: 500, output_tokens: 20 },
      });

      const file = createMockFile();
      const result = await processReceipt(file);

      expect(result.type).toBe('error');
    });
  });
});
