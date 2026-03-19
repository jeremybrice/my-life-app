import { describe, it, expect } from 'vitest';
import { WELCOME_MESSAGE } from '../../../src/screens/agent/agent-types';
import type { ChatMessage, ParsedExpense, AgentStatus } from '../../../src/screens/agent/agent-types';

describe('agent-types', () => {
  it('should export WELCOME_MESSAGE with correct shape', () => {
    expect(WELCOME_MESSAGE.id).toBe('welcome');
    expect(WELCOME_MESSAGE.role).toBe('assistant');
    expect(WELCOME_MESSAGE.contentType).toBe('text');
    expect(WELCOME_MESSAGE.text).toBeTruthy();
    expect(WELCOME_MESSAGE.timestamp).toBe(0);
  });

  it('should allow creating a user text message', () => {
    const msg: ChatMessage = {
      id: '1',
      role: 'user',
      contentType: 'text',
      text: 'Hello',
      timestamp: Date.now(),
    };
    expect(msg.role).toBe('user');
    expect(msg.contentType).toBe('text');
  });

  it('should allow creating an expense confirmation message', () => {
    const expense: ParsedExpense = {
      amount: 25.00,
      vendor: 'Chipotle',
      category: 'Dining',
      date: '2026-03-18',
    };
    const msg: ChatMessage = {
      id: '2',
      role: 'assistant',
      contentType: 'expense-confirmation',
      parsedExpense: expense,
      confirmationStatus: 'pending',
      timestamp: Date.now(),
    };
    expect(msg.parsedExpense?.amount).toBe(25.00);
    expect(msg.confirmationStatus).toBe('pending');
  });

  it('should support all AgentStatus values', () => {
    const statuses: AgentStatus[] = [
      'initializing', 'ready', 'loading', 'offline',
      'no-api-key', 'invalid-api-key', 'error',
    ];
    expect(statuses).toHaveLength(7);
  });
});
