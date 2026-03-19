import { useState, useEffect } from 'react';
import {
  getCategoryBreakdown,
  getVendorBreakdown,
  getMonthlyStats,
  type BreakdownEntry,
  type MonthlyStats,
} from '@/data/budget-service';
import { formatCurrency } from '@/lib/currency';

export interface BudgetSummaryProps {
  yearMonth: string;
}

export default function BudgetSummary({ yearMonth }: BudgetSummaryProps) {
  const [categoryBreakdown, setCategoryBreakdown] = useState<BreakdownEntry[]>([]);
  const [vendorBreakdown, setVendorBreakdown] = useState<BreakdownEntry[]>([]);
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [categories, vendors, monthlyStats] = await Promise.all([
          getCategoryBreakdown(yearMonth),
          getVendorBreakdown(yearMonth),
          getMonthlyStats(yearMonth),
        ]);
        if (!cancelled) {
          setCategoryBreakdown(categories);
          setVendorBreakdown(vendors);
          setStats(monthlyStats);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load summary');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [yearMonth]);

  if (loading) {
    return <div data-testid="summary-loading" className="p-4 text-center text-fg-muted">Loading summary...</div>;
  }

  if (error) {
    return <div data-testid="summary-error" className="p-4 text-center text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6 p-4" data-testid="budget-summary">
      {/* Monthly Statistics */}
      {stats && (
        <section>
          <h3 className="text-lg font-semibold mb-3">Monthly Statistics</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-secondary rounded-lg p-3">
              <div className="text-sm text-fg-secondary">Total Budget</div>
              <div className="text-lg font-bold" data-testid="stats-total-budget">
                ${formatCurrency(stats.totalBudget)}
              </div>
            </div>
            <div className="bg-surface-secondary rounded-lg p-3">
              <div className="text-sm text-fg-secondary">Total Spent</div>
              <div className="text-lg font-bold" data-testid="stats-total-spent">
                ${formatCurrency(stats.totalSpent)}
              </div>
            </div>
            <div className="bg-surface-secondary rounded-lg p-3">
              <div className="text-sm text-fg-secondary">Net Change</div>
              <div
                className={`text-lg font-bold ${stats.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}
                data-testid="stats-net-change"
              >
                ${formatCurrency(stats.netChange)}
              </div>
            </div>
            <div className="bg-surface-secondary rounded-lg p-3">
              <div className="text-sm text-fg-secondary">Avg Daily Spending</div>
              <div className="text-lg font-bold" data-testid="stats-avg-daily">
                ${formatCurrency(stats.avgDailySpending)}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Category Breakdown */}
      <section>
        <h3 className="text-lg font-semibold mb-3">Spending by Category</h3>
        {categoryBreakdown.length === 0 ? (
          <p className="text-fg-muted text-sm">No expenses recorded this month.</p>
        ) : (
          <ul className="space-y-2" data-testid="category-breakdown">
            {categoryBreakdown.map((entry) => (
              <li key={entry.label} className="flex justify-between items-center py-2 border-b border-edge">
                <span className="text-sm font-medium">{entry.label}</span>
                <span className="text-sm font-semibold">${formatCurrency(entry.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Vendor Breakdown */}
      <section>
        <h3 className="text-lg font-semibold mb-3">Spending by Vendor</h3>
        {vendorBreakdown.length === 0 ? (
          <p className="text-fg-muted text-sm">No expenses recorded this month.</p>
        ) : (
          <ul className="space-y-2" data-testid="vendor-breakdown">
            {vendorBreakdown.map((entry) => (
              <li key={entry.label} className="flex justify-between items-center py-2 border-b border-edge">
                <span className="text-sm font-medium">{entry.label}</span>
                <span className="text-sm font-semibold">${formatCurrency(entry.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
