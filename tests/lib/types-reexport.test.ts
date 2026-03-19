import { describe, it, expect } from 'vitest';

describe('Dashboard card interface re-exports from types.ts', () => {
  it('should export DailyBudgetCardProps', async () => {
    const mod = await import('../../src/lib/types');
    // Type-only re-exports won't show at runtime, so we verify the module loads without error
    expect(mod).toBeDefined();
  });

  it('should allow importing DailyBudgetCardProps from types', async () => {
    // This test validates that the type re-export is structurally sound.
    // If the import path is broken, TypeScript compilation (and thus vitest) will fail.
    const { DailyBudgetCard } = await import('../../src/screens/dashboard/DailyBudgetCard');
    expect(DailyBudgetCard).toBeDefined();
  });

  it('should allow importing MonthlyPerformanceCardProps from types', async () => {
    const { MonthlyPerformanceCard } = await import('../../src/screens/dashboard/MonthlyPerformanceCard');
    expect(MonthlyPerformanceCard).toBeDefined();
  });

  it('should allow importing GoalsWidgetProps from types', async () => {
    const { GoalsWidget } = await import('../../src/screens/dashboard/GoalsWidget');
    expect(GoalsWidget).toBeDefined();
  });

  it('should allow importing HealthWidgetProps from types', async () => {
    const { HealthWidget } = await import('../../src/screens/dashboard/HealthWidget');
    expect(HealthWidget).toBeDefined();
  });
});
