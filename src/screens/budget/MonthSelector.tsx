import { previousYearMonth, nextYearMonth } from '@/lib/dates';

export interface MonthSelectorProps {
  selectedMonth: string; // "YYYY-MM"
  onMonthChange: (yearMonth: string) => void;
}

function formatMonthLabel(yearMonth: string): string {
  const [yearStr, monthStr] = yearMonth.split('-');
  const date = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function MonthSelector({ selectedMonth, onMonthChange }: MonthSelectorProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2">
      <button
        type="button"
        aria-label="Previous month"
        onClick={() => onMonthChange(previousYearMonth(selectedMonth))}
        className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </button>
      <span className="text-lg font-semibold" data-testid="month-label">
        {formatMonthLabel(selectedMonth)}
      </span>
      <button
        type="button"
        aria-label="Next month"
        onClick={() => onMonthChange(nextYearMonth(selectedMonth))}
        className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
}
