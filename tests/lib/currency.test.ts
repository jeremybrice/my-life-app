import { describe, it, expect } from 'vitest';
import { roundCurrency, formatCurrency } from '@/lib/currency';

describe('roundCurrency', () => {
  it('should round to 2 decimal places', () => {
    expect(roundCurrency(1.005)).toBe(1.01);
    expect(roundCurrency(1.004)).toBe(1.0);
    expect(roundCurrency(1.999)).toBe(2.0);
  });

  it('should handle floating-point drift', () => {
    expect(roundCurrency(0.1 + 0.2)).toBe(0.3);
  });

  it('should handle whole numbers', () => {
    expect(roundCurrency(100)).toBe(100);
  });

  it('should handle zero', () => {
    expect(roundCurrency(0)).toBe(0);
  });

  it('should handle negative values', () => {
    expect(roundCurrency(-1.005)).toBe(-1.0);
    expect(roundCurrency(-99.999)).toBe(-100.0);
  });
});

describe('formatCurrency', () => {
  it('should format with 2 decimal places', () => {
    expect(formatCurrency(1234.5)).toBe('1,234.50');
  });

  it('should format with comma separators', () => {
    expect(formatCurrency(1234567.89)).toBe('1,234,567.89');
  });

  it('should format zero', () => {
    expect(formatCurrency(0)).toBe('0.00');
  });

  it('should format negative values', () => {
    expect(formatCurrency(-42.5)).toBe('-42.50');
  });

  it('should round before formatting', () => {
    expect(formatCurrency(0.1 + 0.2)).toBe('0.30');
  });
});
