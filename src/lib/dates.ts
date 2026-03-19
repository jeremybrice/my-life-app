/**
 * Date utility functions for the My Life App.
 * All date strings use ISO format: "YYYY-MM-DD" for dates, "YYYY-MM" for months.
 */

/** Number of days in a given year-month (e.g., "2026-03" -> 31) */
export function daysInMonth(yearMonth: string): number {
  const [year, month] = yearMonth.split('-').map(Number);
  // Day 0 of the next month gives the last day of the current month
  return new Date(year!, month!, 0).getDate();
}

/** Number of days elapsed in the month through today (inclusive) */
export function daysElapsed(yearMonth: string): number {
  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  if (yearMonth < currentYM) {
    // Past month: all days elapsed
    return daysInMonth(yearMonth);
  }
  if (yearMonth > currentYM) {
    // Future month: zero days elapsed
    return 0;
  }
  // Current month: today's date number
  return now.getDate();
}

/** Current year-month as "YYYY-MM" */
export function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Today as "YYYY-MM-DD" */
export function today(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Days between two ISO dates (absolute value, inclusive of both endpoints) */
export function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00');
  const b = new Date(to + 'T00:00:00');
  const diffMs = Math.abs(b.getTime() - a.getTime());
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/** Get the Monday of the week containing the given date */
export function weekStart(date: string): string {
  const d = new Date(date + 'T00:00:00');
  const day = d.getDay();
  // getDay(): 0=Sun, 1=Mon, ..., 6=Sat
  // Shift so Monday=0
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** Get the previous year-month (e.g., "2026-01" -> "2025-12") */
export function previousYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  if (month === 1) {
    return `${year! - 1}-12`;
  }
  return `${year}-${String(month! - 1).padStart(2, '0')}`;
}

/** Get the next year-month (e.g., "2026-12" -> "2027-01") */
export function nextYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  if (month === 12) {
    return `${year! + 1}-01`;
  }
  return `${year}-${String(month! + 1).padStart(2, '0')}`;
}
