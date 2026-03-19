import { describe, it, expect } from 'vitest';
import { EXPENSE_SYSTEM_PROMPT, RECEIPT_SYSTEM_PROMPT } from '../../src/services/expense-parser-prompts';

describe('expense-parser-prompts', () => {
  it('should contain the TODAY_DATE placeholder in expense prompt', () => {
    expect(EXPENSE_SYSTEM_PROMPT).toContain('{{TODAY_DATE}}');
  });

  it('should contain the TODAY_DATE placeholder in receipt prompt', () => {
    expect(RECEIPT_SYSTEM_PROMPT).toContain('{{TODAY_DATE}}');
  });

  it('should mention 20 character vendor limit in expense prompt', () => {
    expect(EXPENSE_SYSTEM_PROMPT).toContain('20 characters');
  });

  it('should instruct JSON output format in expense prompt', () => {
    expect(EXPENSE_SYSTEM_PROMPT).toContain('"type": "expense"');
    expect(EXPENSE_SYSTEM_PROMPT).toContain('"type": "clarification"');
    expect(EXPENSE_SYSTEM_PROMPT).toContain('"type": "redirect"');
  });

  it('should instruct JSON output format in receipt prompt', () => {
    expect(RECEIPT_SYSTEM_PROMPT).toContain('"type": "receipt"');
    expect(RECEIPT_SYSTEM_PROMPT).toContain('"type": "not-receipt"');
  });

  it('should include category list in expense prompt', () => {
    expect(EXPENSE_SYSTEM_PROMPT).toContain('Groceries');
    expect(EXPENSE_SYSTEM_PROMPT).toContain('Dining');
    expect(EXPENSE_SYSTEM_PROMPT).toContain('Transportation');
  });

  it('should mention line items in receipt prompt', () => {
    expect(RECEIPT_SYSTEM_PROMPT).toContain('lineItems');
  });
});
