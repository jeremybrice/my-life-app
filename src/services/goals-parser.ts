import { sendMessage } from '@/services/claude-client';
import { GOALS_SYSTEM_PROMPT } from '@/services/agent-prompts';
import { extractJson } from '@/services/expense-parser';
import { today } from '@/lib/dates';
import { getAllGoals } from '@/data/goal-service';
import type { ClaudeMessage } from '@/services/claude-client';

export interface GoalCreateAction {
  type: 'goal-create';
  title: string;
  goalType: 'financial' | 'personal' | 'strategic' | 'custom';
  progressModel: 'numeric' | 'percentage' | 'date-based' | 'freeform';
  targetValue?: number;
  currentValue?: number;
  targetDate?: string;
  description?: string;
}

export interface GoalUpdateAction {
  type: 'goal-update';
  goalId: number;
  goalTitle: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  message: string;
}

export interface GoalEditAction {
  type: 'goal-edit';
  goalId: number;
  goalTitle: string;
  updates: Record<string, unknown>;
  message: string;
}

export interface GoalDeleteAction {
  type: 'goal-delete';
  goalId: number;
  goalTitle: string;
  message: string;
}

export interface GoalAnswerAction {
  type: 'goal-answer';
  text: string;
}

export interface GoalClarificationAction {
  type: 'clarification';
  message: string;
}

export interface GoalRedirectAction {
  type: 'redirect';
  message: string;
}

export type GoalsParseResult =
  | GoalCreateAction
  | GoalUpdateAction
  | GoalEditAction
  | GoalDeleteAction
  | GoalAnswerAction
  | GoalClarificationAction
  | GoalRedirectAction;

export async function parseGoalsMessage(
  conversationHistory: ClaudeMessage[]
): Promise<GoalsParseResult> {
  const context = await buildGoalsContext();
  const systemPrompt = GOALS_SYSTEM_PROMPT
    .replace('{{TODAY_DATE}}', today())
    .replace('{{GOALS_CONTEXT}}', context);

  const response = await sendMessage(conversationHistory, systemPrompt);
  return parseResponse(response.text);
}

function parseResponse(responseText: string): GoalsParseResult {
  const jsonStr = extractJson(responseText);

  if (!jsonStr) {
    return { type: 'goal-answer', text: responseText.trim() };
  }

  try {
    const parsed = JSON.parse(jsonStr);

    switch (parsed.type) {
      case 'goal-create':
        return {
          type: 'goal-create',
          title: parsed.title ?? '',
          goalType: parsed.goalType ?? 'custom',
          progressModel: parsed.progressModel ?? 'freeform',
          targetValue: parsed.targetValue ?? undefined,
          currentValue: parsed.currentValue ?? undefined,
          targetDate: parsed.targetDate ?? undefined,
          description: parsed.description ?? undefined,
        };

      case 'goal-update':
        return {
          type: 'goal-update',
          goalId: parsed.goalId,
          goalTitle: parsed.goalTitle ?? '',
          field: parsed.field ?? '',
          oldValue: parsed.oldValue,
          newValue: parsed.newValue,
          message: parsed.message ?? '',
        };

      case 'goal-edit':
        return {
          type: 'goal-edit',
          goalId: parsed.goalId,
          goalTitle: parsed.goalTitle ?? '',
          updates: parsed.updates ?? {},
          message: parsed.message ?? '',
        };

      case 'goal-delete':
        return {
          type: 'goal-delete',
          goalId: parsed.goalId,
          goalTitle: parsed.goalTitle ?? '',
          message: parsed.message ?? '',
        };

      case 'goal-answer':
        return { type: 'goal-answer', text: parsed.text ?? '' };

      case 'clarification':
        return { type: 'clarification', message: parsed.message ?? '' };

      case 'redirect':
        return { type: 'redirect', message: parsed.message ?? '' };

      default:
        return { type: 'goal-answer', text: responseText.trim() };
    }
  } catch {
    return { type: 'goal-answer', text: responseText.trim() };
  }
}

async function buildGoalsContext(): Promise<string> {
  const goals = await getAllGoals();

  if (goals.length === 0) {
    return 'No targets defined yet.';
  }

  const lines: string[] = ['Active and recent targets:'];

  for (const g of goals) {
    let progress = '';
    switch (g.progressModel) {
      case 'numeric':
        progress = `${g.currentValue ?? 0}/${g.targetValue ?? '?'} (${g.targetValue ? Math.round(((g.currentValue ?? 0) / g.targetValue) * 100) : 0}%)`;
        break;
      case 'percentage':
        progress = `${g.percentage ?? 0}%`;
        break;
      case 'date-based':
        progress = g.targetDate ? `target: ${g.targetDate}` : 'no target date';
        break;
      case 'freeform':
        progress = g.statusLabel ?? 'no status';
        break;
    }

    const datePart = g.targetDate ? ` | target: ${g.targetDate}` : '';
    const descPart = g.description ? ` | "${g.description}"` : '';

    lines.push(
      `- ${g.title} (id:${g.id}) | ${g.type} | ${g.progressModel} | ${progress} | status: ${g.status}${datePart}${descPart}`
    );
  }

  return lines.join('\n');
}
