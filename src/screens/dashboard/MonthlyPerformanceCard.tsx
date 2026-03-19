import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { getMonthlyPerformanceCardData, type MonthlyPerformanceCardData } from '@/data/budget-service';
import { formatCurrency } from '@/lib/currency';

/**
 * MonthlyPerformanceCardProps — preserved for type compatibility.
 */
export interface MonthlyPerformanceCardProps {
  /** Total budget for the current month (monthly amount + carry-over + additional funds) */
  totalBudget: number;
  /** Total spent this month */
  totalSpent: number;
  /** Net change (totalBudget - totalSpent); positive = under budget, negative = over */
  netChange: number;
  /** Current year-month displayed, e.g., "March 2026" */
  monthLabel: string;
  /** Optional callback to navigate to the Budget tab */
  onNavigate?: () => void;
}

export function MonthlyPerformanceCard() {
  const navigate = useNavigate();
  const [data, setData] = useState<MonthlyPerformanceCardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        const cardData = await getMonthlyPerformanceCardData();
        if (!cancelled) {
          setData(cardData);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, []);

  const handleClick = () => {
    navigate('/budget');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4 animate-pulse" data-testid="monthly-performance-card">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-6 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className="bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        data-testid="monthly-performance-card"
      >
        <h3 className="text-sm font-medium text-gray-500 mb-1">Monthly Performance</h3>
        <p className="text-gray-400 text-sm" data-testid="monthly-performance-zero-state">
          Set up your monthly budget to see performance tracking.
        </p>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      data-testid="monthly-performance-card"
    >
      <h3 className="text-sm font-medium text-gray-500 mb-1">Monthly Performance</h3>
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total Budget</span>
          <span className="font-medium" data-testid="monthly-total-budget">
            ${formatCurrency(data.totalBudget)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total Spent</span>
          <span className="font-medium" data-testid="monthly-total-spent">
            ${formatCurrency(data.totalSpent)}
          </span>
        </div>
        <div className="flex justify-between text-sm font-semibold pt-1 border-t border-gray-100">
          <span className="text-gray-700">Net Change</span>
          <span
            className={data.netChange >= 0 ? 'text-green-600' : 'text-red-600'}
            data-testid="monthly-net-change"
          >
            ${formatCurrency(data.netChange)}
          </span>
        </div>
      </div>
    </div>
  );
}
