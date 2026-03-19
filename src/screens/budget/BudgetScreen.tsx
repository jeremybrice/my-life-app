import { useState, useEffect } from 'react';
import { useBudget } from '@/hooks/useBudget';
import { useExpenses } from '@/hooks/useExpenses';
import { today as getToday, currentYearMonth } from '@/lib/dates';
import { initializeMonth } from '@/data/budget-service';
import { BalanceHeader } from './BalanceHeader';
import { BudgetSetupPrompt } from './BudgetSetupPrompt';
import { ExpenseForm } from './ExpenseForm';
import { ExpenseTable } from './ExpenseTable';
import MonthSelector from './MonthSelector';
import AdditionalFundsInput from './AdditionalFundsInput';
import BudgetSummary from './BudgetSummary';
import { LoadingSpinner } from '@/components/LoadingSpinner';

type BudgetTab = 'expenses' | 'summary';

export function BudgetScreen() {
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth());
  const [activeTab, setActiveTab] = useState<BudgetTab>('expenses');

  // Reset to current month on screen re-entry (component mount)
  useEffect(() => {
    setSelectedMonth(currentYearMonth());
  }, []);

  const handleMonthChange = async (yearMonth: string) => {
    setSelectedMonth(yearMonth);
    await initializeMonth(yearMonth);
  };

  const { budgetMonth, balance, loading: budgetLoading, createMonth, setAdditionalFunds } = useBudget(selectedMonth);
  const { expenses, loading: expensesLoading, addExpense, editExpense, removeExpense } =
    useExpenses(selectedMonth);

  const loading = budgetLoading || expensesLoading;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (!budgetMonth) {
    return (
      <div>
        <MonthSelector
          selectedMonth={selectedMonth}
          onMonthChange={handleMonthChange}
        />
        <BudgetSetupPrompt yearMonth={selectedMonth} onSetup={createMonth} />
      </div>
    );
  }

  return (
    <div className="pb-20" data-testid="budget-screen">
      <MonthSelector
        selectedMonth={selectedMonth}
        onMonthChange={handleMonthChange}
      />

      {/* Balance Header */}
      {balance && <BalanceHeader balance={balance} today={getToday()} />}

      {/* Additional Funds */}
      <div className="px-4 py-2">
        <AdditionalFundsInput
          currentAmount={budgetMonth.additionalFunds}
          onUpdate={async (amount) => {
            await setAdditionalFunds(amount);
          }}
        />
      </div>

      {/* Tab Toggle */}
      <div className="flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('expenses')}
          className={`flex-1 py-2 text-sm font-medium text-center border-b-2 transition-colors ${
            activeTab === 'expenses'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          data-testid="tab-expenses"
        >
          Expenses
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('summary')}
          className={`flex-1 py-2 text-sm font-medium text-center border-b-2 transition-colors ${
            activeTab === 'summary'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          data-testid="tab-summary"
        >
          Summary
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'expenses' ? (
        <>
          {/* Expense Entry Form */}
          <ExpenseForm onSubmit={addExpense} />

          {/* Expense Table with Daily Grouping */}
          <ExpenseTable
            expenses={expenses}
            dailyAllowance={budgetMonth.dailyAllowance}
            carryOver={budgetMonth.carryOver}
            additionalFunds={budgetMonth.additionalFunds}
            onEdit={editExpense}
            onDelete={removeExpense}
          />
        </>
      ) : (
        <BudgetSummary yearMonth={selectedMonth} />
      )}
    </div>
  );
}
