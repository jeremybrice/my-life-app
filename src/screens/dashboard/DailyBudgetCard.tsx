import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { getDailyBudgetCardData, type DailyBudgetCardData } from '@/data/budget-service';
import { formatCurrency } from '@/lib/currency';

/**
 * DailyBudgetCardProps — preserved for type compatibility.
 */
export interface DailyBudgetCardProps {
  /** Today's remaining balance (daily allowance - today's spending + carry-over fraction) */
  todayBalance: number;
  /** The daily budget allowance amount */
  dailyBudget: number;
  /** Total amount spent today */
  todaySpending: number;
  /** 'under' = spending within budget, 'over' = spending exceeds daily allowance */
  status: 'under' | 'over';
  /** Optional callback to navigate to the Budget tab */
  onNavigate?: () => void;
}

export function DailyBudgetCard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DailyBudgetCardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        const cardData = await getDailyBudgetCardData();
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
      <div className="bg-white rounded-xl shadow-sm p-4 animate-pulse" data-testid="daily-budget-card">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
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
        data-testid="daily-budget-card"
      >
        <h3 className="text-sm font-medium text-gray-500 mb-1">Daily Budget</h3>
        <p className="text-gray-400 text-sm" data-testid="daily-budget-zero-state">
          Set up your monthly budget to see daily tracking.
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
      data-testid="daily-budget-card"
    >
      <h3 className="text-sm font-medium text-gray-500 mb-1">Daily Budget</h3>
      <div
        className={`text-2xl font-bold ${data.isPositive ? 'text-green-600' : 'text-red-600'}`}
        data-testid="daily-budget-balance"
      >
        ${formatCurrency(data.todayBalance)}
      </div>
      <div className="flex justify-between mt-2 text-sm text-gray-500">
        <span data-testid="daily-budget-allowance">Daily: ${formatCurrency(data.dailyBudget)}</span>
        <span data-testid="daily-budget-today-spent">Today: ${formatCurrency(data.todaySpending)}</span>
      </div>
    </div>
  );
}
