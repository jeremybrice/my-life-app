import { sendMessage } from '@/services/claude-client';
import { BUDGET_INSIGHTS_SYSTEM_PROMPT } from '@/services/agent-prompts';
import { extractJson } from '@/services/expense-parser';
import { today, currentYearMonth } from '@/lib/dates';
import { formatCurrency } from '@/lib/currency';
import { calculateBalance, getCategoryBreakdown } from '@/data/budget-service';
import { getExpensesByMonth } from '@/data/expense-service';
import type { ClaudeMessage } from '@/services/claude-client';

export interface BudgetInsightsResult {
  type: 'answer' | 'redirect';
  text?: string;
  message?: string;
}

export async function parseBudgetQuery(
  conversationHistory: ClaudeMessage[]
): Promise<BudgetInsightsResult> {
  const context = await buildBudgetContext();
  const systemPrompt = BUDGET_INSIGHTS_SYSTEM_PROMPT
    .replace('{{TODAY_DATE}}', today())
    .replace('{{BUDGET_CONTEXT}}', context);

  const response = await sendMessage(conversationHistory, systemPrompt, {
    model: 'claude-sonnet-4-6',
  });

  return parseResponse(response.text);
}

function parseResponse(responseText: string): BudgetInsightsResult {
  const jsonStr = extractJson(responseText);

  if (!jsonStr) {
    return { type: 'answer', text: responseText.trim() };
  }

  try {
    const parsed = JSON.parse(jsonStr);

    if (parsed.type === 'answer') {
      return { type: 'answer', text: parsed.text };
    }

    if (parsed.type === 'redirect') {
      return { type: 'redirect', message: parsed.message };
    }

    return { type: 'answer', text: responseText.trim() };
  } catch {
    return { type: 'answer', text: responseText.trim() };
  }
}

async function buildBudgetContext(): Promise<string> {
  const yearMonth = currentYearMonth();
  const lines: string[] = [`Current month: ${yearMonth}`];

  try {
    const balance = await calculateBalance(yearMonth);
    lines.push(
      `Spent: ${formatCurrency(balance.totalExpenses)} | Remaining balance: ${formatCurrency(balance.balance)} | Daily allowance: ${formatCurrency(balance.dailyAllowance)} | Today spent: ${formatCurrency(balance.todaySpent)}`
    );
  } catch {
    lines.push('No budget set up for this month.');
  }

  try {
    const categories = await getCategoryBreakdown(yearMonth);
    if (categories.length > 0) {
      const catSummary = categories
        .slice(0, 8)
        .map((c) => `${c.label} (${formatCurrency(c.total)})`)
        .join(', ');
      lines.push(`Top categories: ${catSummary}`);
    }
  } catch {
    // skip category data
  }

  try {
    const expenses = await getExpensesByMonth(yearMonth);
    if (expenses.length > 0) {
      const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date));
      const recent = sorted.slice(0, 10).map(
        (e) => `${formatCurrency(e.amount)} ${e.vendor} (${e.date}${e.category ? ', ' + e.category : ''})`
      );
      lines.push(`Recent expenses (last ${recent.length}):\n${recent.join('\n')}`);
    } else {
      lines.push('No expenses recorded this month.');
    }
  } catch {
    // skip expense data
  }

  return lines.join('\n');
}
