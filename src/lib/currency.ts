/**
 * Currency utility functions.
 * All monetary math in the app MUST use roundCurrency() to avoid
 * floating-point precision errors.
 */

/**
 * Round to exactly 2 decimal places using Math.round.
 * Avoids floating-point drift (e.g., 0.1 + 0.2 = 0.30000000000000004).
 */
export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Format a number as currency display (e.g., "1,234.56").
 * Always shows exactly 2 decimal places.
 * Does NOT include a currency symbol — the caller adds that if needed.
 */
export function formatCurrency(value: number): string {
  return roundCurrency(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
