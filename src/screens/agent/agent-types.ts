export type MessageRole = 'user' | 'assistant' | 'system';

export type MessageContentType = 'text' | 'image' | 'expense-confirmation' | 'error' | 'disclosure';

export interface ParsedExpense {
  amount: number;
  vendor: string;
  category?: string;
  date: string;        // "YYYY-MM-DD"
  description?: string;
  lineItems?: LineItem[];
}

export interface LineItem {
  description: string;
  amount: number;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  contentType: MessageContentType;
  text?: string;
  imageUrl?: string;       // Object URL for thumbnail (session-only)
  parsedExpense?: ParsedExpense;
  confirmationStatus?: 'pending' | 'confirmed' | 'cancelled' | 'saving' | 'saved' | 'error';
  timestamp: number;
}

export type AgentStatus =
  | 'initializing'      // checking API key on load
  | 'ready'             // chat active
  | 'loading'           // waiting for API response
  | 'offline'           // no network connection
  | 'no-api-key'        // API key not configured
  | 'invalid-api-key'   // API key invalid (401)
  | 'error';            // generic error

export const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  contentType: 'text',
  text: "Hi! I'm your expense assistant. You can tell me about purchases in plain language (e.g., \"Spent $12 at Starbucks for coffee\") or upload a receipt photo. I'll help you log them to your budget.",
  timestamp: 0,
};
