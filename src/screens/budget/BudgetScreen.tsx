import { useBudget } from '@/hooks/useBudget';
import { useExpenses } from '@/hooks/useExpenses';
import { today as getToday, currentYearMonth } from '@/lib/dates';
import { BalanceHeader } from './BalanceHeader';
import { BudgetSetupPrompt } from './BudgetSetupPrompt';
import { ExpenseForm } from './ExpenseForm';
import { ExpenseTable } from './ExpenseTable';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export function BudgetScreen() {
  const yearMonth = currentYearMonth();
  const { budgetMonth, balance, loading: budgetLoading, createMonth } = useBudget(yearMonth);
  const { expenses, loading: expensesLoading, addExpense, editExpense, removeExpense } =
    useExpenses(yearMonth);

  const loading = budgetLoading || expensesLoading;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (!budgetMonth) {
    return <BudgetSetupPrompt yearMonth={yearMonth} onSetup={createMonth} />;
  }

  return (
    <div className="pb-20" data-testid="budget-screen">
      {/* Balance Header */}
      {balance && <BalanceHeader balance={balance} today={getToday()} />}

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
    </div>
  );
}
