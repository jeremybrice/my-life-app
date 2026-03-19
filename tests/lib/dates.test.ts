import { describe, it, expect } from 'vitest';
import {
  daysInMonth,
  daysBetween,
  weekStart,
  previousYearMonth,
  nextYearMonth,
  today,
  currentYearMonth,
} from '@/lib/dates';

describe('daysInMonth', () => {
  it('should return 31 for March', () => {
    expect(daysInMonth('2026-03')).toBe(31);
  });

  it('should return 28 for non-leap February', () => {
    expect(daysInMonth('2026-02')).toBe(28);
  });

  it('should return 29 for leap February', () => {
    expect(daysInMonth('2024-02')).toBe(29);
  });

  it('should return 30 for April', () => {
    expect(daysInMonth('2026-04')).toBe(30);
  });

  it('should return 31 for December', () => {
    expect(daysInMonth('2026-12')).toBe(31);
  });
});

describe('daysBetween', () => {
  it('should return 0 for same date', () => {
    expect(daysBetween('2026-03-18', '2026-03-18')).toBe(0);
  });

  it('should return correct days between two dates', () => {
    expect(daysBetween('2026-03-01', '2026-03-31')).toBe(30);
  });

  it('should handle order of arguments', () => {
    expect(daysBetween('2026-03-31', '2026-03-01')).toBe(30);
  });

  it('should handle cross-month', () => {
    expect(daysBetween('2026-01-31', '2026-02-01')).toBe(1);
  });

  it('should handle cross-year', () => {
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1);
  });
});

describe('weekStart', () => {
  it('should return Monday for a Wednesday', () => {
    // 2026-03-18 is a Wednesday
    expect(weekStart('2026-03-18')).toBe('2026-03-16');
  });

  it('should return same day for a Monday', () => {
    expect(weekStart('2026-03-16')).toBe('2026-03-16');
  });

  it('should return previous Monday for a Sunday', () => {
    // 2026-03-22 is a Sunday
    expect(weekStart('2026-03-22')).toBe('2026-03-16');
  });
});

describe('previousYearMonth', () => {
  it('should return previous month', () => {
    expect(previousYearMonth('2026-03')).toBe('2026-02');
  });

  it('should wrap to December of previous year', () => {
    expect(previousYearMonth('2026-01')).toBe('2025-12');
  });
});

describe('nextYearMonth', () => {
  it('should return next month', () => {
    expect(nextYearMonth('2026-03')).toBe('2026-04');
  });

  it('should wrap to January of next year', () => {
    expect(nextYearMonth('2026-12')).toBe('2027-01');
  });
});

describe('today', () => {
  it('should return a string in YYYY-MM-DD format', () => {
    const result = today();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('currentYearMonth', () => {
  it('should return a string in YYYY-MM format', () => {
    const result = currentYearMonth();
    expect(result).toMatch(/^\d{4}-\d{2}$/);
  });
});
