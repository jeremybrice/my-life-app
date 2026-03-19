import { formatCurrency } from '@/lib/currency';
import type { BalanceSnapshot } from '@/data/budget-service';

interface BalanceHeaderProps {
  balance: BalanceSnapshot;
  today: string;
}

export function BalanceHeader({ balance, today }: BalanceHeaderProps) {
  const isPositive = balance.balance >= 0;

  return (
    <div className="px-4 py-6 text-center" data-testid="balance-header">
      {/* Current Balance */}
      <p className="text-sm text-fg-muted uppercase tracking-wide">
        Current Balance
      </p>
      <p
        className={`text-5xl font-bold mt-1 ${
          isPositive ? 'text-green-600' : 'text-red-600'
        }`}
        data-testid="balance-amount"
      >
        {isPositive ? '' : '-'}${formatCurrency(Math.abs(balance.balance))}
      </p>

      {/* Today's info row */}
      <div className="mt-4 flex justify-center gap-6 text-sm text-fg-secondary">
        <div>
          <p className="font-medium">{today}</p>
          <p className="text-xs text-fg-muted">Today</p>
        </div>
        <div>
          <p className="font-medium">${formatCurrency(balance.dailyAllowance)}</p>
          <p className="text-xs text-fg-muted">Daily Budget</p>
        </div>
        <div>
          <p className="font-medium">${formatCurrency(balance.todaySpent)}</p>
          <p className="text-xs text-fg-muted">Spent Today</p>
        </div>
      </div>
    </div>
  );
}
