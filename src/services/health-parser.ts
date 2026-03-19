import { sendMessage } from '@/services/claude-client';
import { HEALTH_SYSTEM_PROMPT } from '@/services/agent-prompts';
import { extractJson } from '@/services/expense-parser';
import { today } from '@/lib/dates';
import {
  getAllRoutines,
  getWeeklyCount,
  getDailyCount,
  calculateStreak,
  getLogEntriesByDate,
} from '@/data/health-service';
import type { ClaudeMessage } from '@/services/claude-client';

export interface HealthLogAction {
  type: 'health-log';
  routineId: number;
  routineName: string;
  date: string;
  metrics?: Record<string, number>;
}

export interface HealthDeleteAction {
  type: 'health-delete';
  routineId: number;
  routineName: string;
  date: string;
  message: string;
}

export interface HealthRoutineCreateAction {
  type: 'health-routine-create';
  name: string;
  frequencyType: 'daily' | 'weekly';
  dailyTarget?: number;
  targetFrequency?: number;
  trackedMetrics: { type: string; unit: string }[];
}

export interface HealthRoutineDeleteAction {
  type: 'health-routine-delete';
  routineId: number;
  routineName: string;
  message: string;
}

export interface HealthAnswerAction {
  type: 'health-answer';
  text: string;
}

export interface HealthClarificationAction {
  type: 'clarification';
  message: string;
}

export interface HealthRedirectAction {
  type: 'redirect';
  message: string;
}

export type HealthParseResult =
  | HealthLogAction
  | HealthDeleteAction
  | HealthRoutineCreateAction
  | HealthRoutineDeleteAction
  | HealthAnswerAction
  | HealthClarificationAction
  | HealthRedirectAction;

export async function parseHealthMessage(
  conversationHistory: ClaudeMessage[]
): Promise<HealthParseResult> {
  const context = await buildHealthContext();
  const systemPrompt = HEALTH_SYSTEM_PROMPT
    .replace('{{TODAY_DATE}}', today())
    .replace('{{HEALTH_CONTEXT}}', context);

  const response = await sendMessage(conversationHistory, systemPrompt);
  return parseResponse(response.text);
}

function parseResponse(responseText: string): HealthParseResult {
  const jsonStr = extractJson(responseText);

  if (!jsonStr) {
    return { type: 'health-answer', text: responseText.trim() };
  }

  try {
    const parsed = JSON.parse(jsonStr);

    switch (parsed.type) {
      case 'health-log':
        return {
          type: 'health-log',
          routineId: parsed.routineId,
          routineName: parsed.routineName ?? '',
          date: normalizeDate(parsed.date),
          metrics: parsed.metrics,
        };

      case 'health-delete':
        return {
          type: 'health-delete',
          routineId: parsed.routineId,
          routineName: parsed.routineName ?? '',
          date: normalizeDate(parsed.date),
          message: parsed.message ?? '',
        };

      case 'health-routine-create':
        return {
          type: 'health-routine-create',
          name: parsed.name ?? '',
          frequencyType: parsed.frequencyType === 'daily' ? 'daily' : 'weekly',
          dailyTarget: parsed.dailyTarget ?? undefined,
          targetFrequency: parsed.targetFrequency ?? undefined,
          trackedMetrics: Array.isArray(parsed.trackedMetrics)
            ? parsed.trackedMetrics
            : [],
        };

      case 'health-routine-delete':
        return {
          type: 'health-routine-delete',
          routineId: parsed.routineId,
          routineName: parsed.routineName ?? '',
          message: parsed.message ?? '',
        };

      case 'health-answer':
        return { type: 'health-answer', text: parsed.text ?? '' };

      case 'clarification':
        return { type: 'clarification', message: parsed.message ?? '' };

      case 'redirect':
        return { type: 'redirect', message: parsed.message ?? '' };

      default:
        return { type: 'health-answer', text: responseText.trim() };
    }
  } catch {
    return { type: 'health-answer', text: responseText.trim() };
  }
}

function normalizeDate(date: unknown): string {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  return today();
}

async function buildHealthContext(): Promise<string> {
  const routines = await getAllRoutines();
  const todayStr = today();

  if (routines.length === 0) {
    return 'No health routines defined yet.';
  }

  const lines: string[] = ['Routines:'];

  for (const r of routines) {
    const weekly = await getWeeklyCount(r.id!);
    const daily = await getDailyCount(r.id!);
    const streak = await calculateStreak(r.id!);
    const freqLabel =
      r.frequencyType === 'daily'
        ? `daily ${r.dailyTarget}x`
        : `weekly ${r.targetFrequency}x`;
    const metricsLabel =
      r.trackedMetrics.length > 0
        ? ` | tracks: ${r.trackedMetrics.map((m) => `${m.type} (${m.unit})`).join(', ')}`
        : '';
    lines.push(
      `- ${r.name} (id:${r.id}) | ${freqLabel} | ${weekly}/${r.targetFrequency} this week | ${daily}/${r.frequencyType === 'daily' ? r.dailyTarget : 1} today | ${streak}wk streak${metricsLabel}`
    );
  }

  // Today's logs
  const todayLogs = await getLogEntriesByDate(todayStr);
  if (todayLogs.length > 0) {
    const logDescriptions = todayLogs.map((l) => {
      const routine = routines.find((r) => r.id === l.routineId);
      const name = routine?.name ?? `routine#${l.routineId}`;
      const metricsStr = l.metrics
        ? Object.entries(l.metrics)
            .map(([k, v]) => `${k}:${v}`)
            .join(', ')
        : '';
      return `${name}${metricsStr ? ' (' + metricsStr + ')' : ''}`;
    });
    lines.push(`\nToday's logs: ${logDescriptions.join(', ')}`);
  } else {
    lines.push('\nNo logs recorded today.');
  }

  return lines.join('\n');
}
