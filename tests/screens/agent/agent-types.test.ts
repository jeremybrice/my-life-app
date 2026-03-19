import { describe, it, expect } from 'vitest';
import type { ChatMessage, ParsedExpense, ParsedHealthLog, ParsedGoalAction, AgentStatus } from '../../../src/screens/agent/agent-types';

describe('agent-types', () => {
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

  it('should allow creating a health log confirmation message', () => {
    const log: ParsedHealthLog = {
      routineId: 1,
      routineName: 'Running',
      date: '2026-03-18',
      metrics: { distance: 5 },
    };
    const msg: ChatMessage = {
      id: '3',
      role: 'assistant',
      contentType: 'health-log-confirmation',
      parsedHealthLog: log,
      confirmationStatus: 'pending',
      timestamp: Date.now(),
    };
    expect(msg.parsedHealthLog?.routineName).toBe('Running');
  });

  it('should allow creating a goal confirmation message', () => {
    const goal: ParsedGoalAction = {
      action: 'create',
      goalTitle: 'Save $5000',
      goalType: 'financial',
      progressModel: 'numeric',
      targetValue: 5000,
    };
    const msg: ChatMessage = {
      id: '4',
      role: 'assistant',
      contentType: 'goal-create-confirmation',
      parsedGoalAction: goal,
      confirmationStatus: 'pending',
      timestamp: Date.now(),
    };
    expect(msg.parsedGoalAction?.goalTitle).toBe('Save $5000');
  });

  it('should support all AgentStatus values', () => {
    const statuses: AgentStatus[] = [
      'initializing', 'ready', 'loading', 'offline',
      'no-api-key', 'invalid-api-key', 'error',
    ];
    expect(statuses).toHaveLength(7);
  });

  it('should support pipelineId on messages', () => {
    const msg: ChatMessage = {
      id: '5',
      role: 'user',
      contentType: 'text',
      text: 'Test',
      timestamp: Date.now(),
      pipelineId: 'expense',
    };
    expect(msg.pipelineId).toBe('expense');
  });
});
