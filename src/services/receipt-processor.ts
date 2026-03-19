import { sendMessage } from '@/services/claude-client';
import { RECEIPT_SYSTEM_PROMPT } from '@/services/expense-parser-prompts';
import { extractJson } from '@/services/expense-parser';
import { today } from '@/lib/dates';
import { roundCurrency } from '@/lib/currency';
import { MAX_VENDOR_LENGTH } from '@/lib/constants';
import type { ClaudeMessage, ClaudeContentBlock } from '@/services/claude-client';
import type { ParsedExpense, LineItem } from '@/screens/agent/agent-types';

export interface ReceiptProcessResult {
  type: 'receipt' | 'not-receipt' | 'error';
  expense?: ParsedExpense;
  message?: string;
}

/**
 * Convert a File to a base64 string for the Claude API.
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1] ?? '';
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Get the media type for the Claude API from a File.
 */
export function getMediaType(file: File): 'image/jpeg' | 'image/png' {
  if (file.type === 'image/png') return 'image/png';
  return 'image/jpeg'; // Default to JPEG for any other type
}

/**
 * Process a receipt image using the Claude API.
 * Optionally includes accompanying text for context.
 */
export async function processReceipt(
  file: File,
  accompanyingText?: string,
  conversationHistory?: ClaudeMessage[]
): Promise<ReceiptProcessResult> {
  const base64 = await fileToBase64(file);
  const mediaType = getMediaType(file);

  const systemPrompt = RECEIPT_SYSTEM_PROMPT.replace('{{TODAY_DATE}}', today());

  // Build the content blocks for the user message
  const contentBlocks: ClaudeContentBlock[] = [
    {
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaType,
        data: base64,
      },
    },
  ];

  if (accompanyingText) {
    contentBlocks.push({
      type: 'text',
      text: accompanyingText,
    });
  } else {
    contentBlocks.push({
      type: 'text',
      text: 'Please analyze this receipt and extract the expense data.',
    });
  }

  // Build messages: include conversation history if present, then new message
  const messages: ClaudeMessage[] = [
    ...(conversationHistory || []),
    { role: 'user', content: contentBlocks },
  ];

  const response = await sendMessage(messages, systemPrompt, {
    maxTokens: 2048, // Receipts may need more tokens for line items
  });

  return parseReceiptResponse(response.text);
}

function parseReceiptResponse(responseText: string): ReceiptProcessResult {
  const jsonStr = extractJson(responseText);

  if (!jsonStr) {
    return {
      type: 'error',
      message: 'Could not parse the receipt. Please try taking a clearer photo.',
    };
  }

  try {
    const parsed = JSON.parse(jsonStr);

    if (parsed.type === 'not-receipt') {
      return {
        type: 'not-receipt',
        message: parsed.message || 'This image does not appear to be a receipt.',
      };
    }

    if (parsed.type === 'receipt') {
      const vendor = typeof parsed.vendor === 'string'
        ? parsed.vendor.slice(0, MAX_VENDOR_LENGTH)
        : 'Unknown';

      const amount = typeof parsed.amount === 'number'
        ? roundCurrency(parsed.amount)
        : 0;

      const date = typeof parsed.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)
        ? parsed.date
        : today();

      const lineItems: LineItem[] = Array.isArray(parsed.lineItems)
        ? parsed.lineItems.map((item: Record<string, unknown>) => ({
            description: typeof item.description === 'string' ? item.description : '',
            amount: typeof item.amount === 'number' ? roundCurrency(item.amount) : 0,
          }))
        : [];

      const category = typeof parsed.category === 'string' && parsed.category
        ? parsed.category
        : undefined;

      return {
        type: 'receipt',
        expense: {
          amount,
          vendor,
          date,
          category,
          lineItems: lineItems.length > 0 ? lineItems : undefined,
        },
      };
    }

    return {
      type: 'error',
      message: 'Unexpected response format from receipt processing.',
    };
  } catch {
    return {
      type: 'error',
      message: 'Failed to parse receipt data. Please try again.',
    };
  }
}
