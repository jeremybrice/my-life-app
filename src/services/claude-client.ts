import Anthropic from '@anthropic-ai/sdk';
import { getSettings } from '@/data/settings-service';

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_TOKENS = 1024;

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | ClaudeContentBlock[];
}

export interface ClaudeContentBlock {
  type: 'text' | 'image';
  text?: string;
  source?: {
    type: 'base64';
    media_type: 'image/jpeg' | 'image/png';
    data: string;
  };
}

export interface ClaudeResponse {
  text: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export type ClaudeErrorType =
  | 'missing-api-key'
  | 'invalid-api-key'
  | 'rate-limited'
  | 'timeout'
  | 'network-error'
  | 'api-error';

export class ClaudeClientError extends Error {
  constructor(
    message: string,
    public readonly errorType: ClaudeErrorType
  ) {
    super(message);
    this.name = 'ClaudeClientError';
  }
}

export async function sendMessage(
  messages: ClaudeMessage[],
  systemPrompt: string,
  options?: {
    model?: string;
    maxTokens?: number;
    timeoutMs?: number;
  }
): Promise<ClaudeResponse> {
  // 1. Read API key from IndexedDB
  const settings = await getSettings();
  const apiKey = settings?.apiKey;

  if (!apiKey) {
    throw new ClaudeClientError(
      'No API key configured. Please add your Claude API key in Settings.',
      'missing-api-key'
    );
  }

  // 2. Build client
  const model = options?.model ?? DEFAULT_MODEL;
  const maxTokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  // 3. Set up timeout via AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await client.messages.create(
      {
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: typeof msg.content === 'string'
            ? msg.content
            : msg.content.map((block) => {
                if (block.type === 'text') {
                  return { type: 'text' as const, text: block.text! };
                }
                return {
                  type: 'image' as const,
                  source: block.source!,
                };
              }),
        })),
      },
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    // Extract text from response
    const textBlock = response.content.find((b) => b.type === 'text');
    const text = textBlock && 'text' in textBlock ? textBlock.text : '';

    return {
      text,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    };
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if (error instanceof ClaudeClientError) {
      throw error;
    }

    // Abort/timeout
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ClaudeClientError(
        'Request timed out. Please try again.',
        'timeout'
      );
    }

    // Anthropic SDK errors
    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        throw new ClaudeClientError(
          'Your API key is invalid. Please update it in Settings.',
          'invalid-api-key'
        );
      }
      if (error.status === 429) {
        throw new ClaudeClientError(
          'Rate limit exceeded. Please wait a moment before trying again.',
          'rate-limited'
        );
      }
      throw new ClaudeClientError(
        `API error: ${error.message}`,
        'api-error'
      );
    }

    // Network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ClaudeClientError(
        'Network error. Please check your internet connection.',
        'network-error'
      );
    }

    throw new ClaudeClientError(
      `Unexpected error: ${(error as Error).message}`,
      'api-error'
    );
  }
}

/**
 * Validate API key with a minimal API call.
 * Returns true if valid, throws ClaudeClientError if not.
 */
export async function validateApiKey(): Promise<boolean> {
  await sendMessage(
    [{ role: 'user', content: 'hi' }],
    'Respond with only the word "ok".',
    { maxTokens: 4 }
  );
  return true;
}
