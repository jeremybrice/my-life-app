/**
 * Shared TypeScript interfaces for the My Life App.
 * These types are the data contracts used across all stages.
 */

export interface NotificationPreferences {
  masterEnabled: boolean;
  dailyOverspend: boolean;
  monthlyThresholds: ThresholdConfig[];
  milestoneIntervals: IntervalConfig[];
}

export interface ThresholdConfig {
  percentage: number;
  enabled: boolean;
}

export interface IntervalConfig {
  days: number;
  enabled: boolean;
}

export interface Settings {
  id: number; // always 1 (singleton)
  apiKey?: string;
  birthDate?: string; // ISO date "1985-06-15"
  targetDate?: string; // ISO date "2035-06-15"
  targetDateLabel?: string;
  monthlyBudget?: number;
  dailyBudget?: number;
  notificationPreferences?: NotificationPreferences;
}

export interface BudgetMonth {
  yearMonth: string; // "2026-03" (primary key)
  monthlyAmount: number;
  dailyAllowance: number; // monthlyAmount / days in month
  carryOver: number;
  additionalFunds: number;
  createdAt: string; // ISO datetime
  updatedAt: string;
}

export interface Expense {
  id?: number; // auto-increment
  yearMonth: string; // "2026-03" (indexed)
  date: string; // "2026-03-17" (indexed)
  vendor: string; // max 20 chars
  amount: number; // positive, 2 decimal places
  category?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id?: number; // auto-increment
  title: string;
  type: 'financial' | 'personal' | 'strategic' | 'custom';
  progressModel: 'numeric' | 'date-based' | 'percentage' | 'freeform';
  status: 'active' | 'completed' | 'archived'; // indexed
  targetValue?: number;
  currentValue?: number;
  targetDate?: string;
  percentage?: number;
  statusLabel?: string;
  description?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HealthRoutine {
  id?: number; // auto-increment
  name: string;
  targetFrequency: number; // per week (positive integer)
  trackedMetrics: TrackedMetric[];
  createdAt: string;
  updatedAt: string;
}

export interface TrackedMetric {
  type: 'duration' | 'distance' | 'reps' | 'weight';
  unit?: string; // e.g., "km", "lbs", "minutes"
}

export interface HealthLogEntry {
  id?: number; // auto-increment
  routineId: number; // indexed
  date: string; // "2026-03-17" (indexed)
  metrics?: Record<string, number>;
  createdAt: string;
}

// Dashboard card interfaces (defined in Stage 2, consumed by Stages 4 & 5)
export type { DailyBudgetCardProps } from '../screens/dashboard/DailyBudgetCard';
export type { MonthlyPerformanceCardProps } from '../screens/dashboard/MonthlyPerformanceCard';
export type { GoalsWidgetProps } from '../screens/dashboard/GoalsWidget';
export type { HealthWidgetProps } from '../screens/dashboard/HealthWidget';
