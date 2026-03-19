import { sendMessage } from '@/services/claude-client';
import { EXPENSE_SYSTEM_PROMPT } from '@/services/expense-parser-prompts';
import { today } from '@/lib/dates';
import { roundCurrency } from '@/lib/currency';
import { MAX_VENDOR_LENGTH } from '@/lib/constants';
import type { ClaudeMessage } from '@/services/claude-client';
import type { ParsedExpense } from '@/screens/agent/agent-types';

export interface ExpenseParseResult {
  type: 'expense' | 'clarification' | 'redirect';
  expense?: ParsedExpense;
  message?: string;
  partial?: Partial<ParsedExpense>;
}

/**
 * Parse a natural language expense description using the Claude API.
 * Takes the full conversation history for multi-turn context.
 */
export async function parseExpenseMessage(
  conversationHistory: ClaudeMessage[]
): Promise<ExpenseParseResult> {
  const systemPrompt = EXPENSE_SYSTEM_PROMPT.replace(
    '{{TODAY_DATE}}',
    today()
  );

  const response = await sendMessage(conversationHistory, systemPrompt);
  return parseResponse(response.text);
}

/**
 * Parse the Claude response text into a structured result.
 * Handles JSON extraction from markdown code blocks and plain text.
 */
export function parseResponse(responseText: string): ExpenseParseResult {
  const jsonStr = extractJson(responseText);

  if (!jsonStr) {
    // Response is conversational (no JSON) -- treat as clarification
    return {
      type: 'clarification',
      message: responseText.trim(),
    };
  }

  try {
    const parsed = JSON.parse(jsonStr);

    if (parsed.type === 'expense') {
      return {
        type: 'expense',
        expense: normalizeExpense(parsed),
      };
    }

    if (parsed.type === 'clarification') {
      return {
        type: 'clarification',
        message: parsed.message,
        partial: parsed.partial,
      };
    }

    if (parsed.type === 'redirect') {
      return {
        type: 'redirect',
        message: parsed.message,
      };
    }

    // Unknown type -- treat as clarification
    return {
      type: 'clarification',
      message: responseText.trim(),
    };
  } catch {
    // JSON parse failed -- treat as conversational response
    return {
      type: 'clarification',
      message: responseText.trim(),
    };
  }
}

/**
 * Extract JSON from a response that may contain markdown code fences.
 */
export function extractJson(text: string): string | null {
  // Try to extract from ```json ... ``` code block
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find raw JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      JSON.parse(jsonMatch[0]);
      return jsonMatch[0];
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Normalize parsed expense fields: round currency, truncate vendor, default date.
 */
function normalizeExpense(raw: Record<string, unknown>): ParsedExpense {
  const vendor = typeof raw.vendor === 'string'
    ? raw.vendor.slice(0, MAX_VENDOR_LENGTH)
    : '';

  const amount = typeof raw.amount === 'number'
    ? roundCurrency(raw.amount)
    : 0;

  const date = typeof raw.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.date)
    ? raw.date
    : today();

  const category = typeof raw.category === 'string' && raw.category
    ? raw.category
    : undefined;

  const description = typeof raw.description === 'string' && raw.description
    ? raw.description
    : undefined;

  return { amount, vendor, category, date, description };
}
