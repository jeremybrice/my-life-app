export interface PipelineConfig {
  id: string;
  title: string;
  description: string;
  icon: string;
  welcomeMessage: string;
  categoryLabel: string;
  categoryDescription: string;
  supportsImageUpload: boolean;
  inputPlaceholder: string;
  model?: string;
}

export const PIPELINES: PipelineConfig[] = [
  {
    id: 'expense',
    title: 'Log Expense',
    description: 'Add, edit, or delete expenses via text or receipt photos',
    icon: 'receipt',
    welcomeMessage:
      "I'm ready to help with your expenses. Tell me about a purchase, upload a receipt, or ask me to edit or remove an existing expense.",
    categoryLabel: 'Log Expense',
    categoryDescription:
      'Describe a purchase, upload a receipt photo, or manage existing expenses.',
    supportsImageUpload: true,
    inputPlaceholder: 'Describe an expense...',
  },
  {
    id: 'budget-insights',
    title: 'Budget Insights',
    description: 'Ask questions about your spending and budget trends',
    icon: 'chart',
    welcomeMessage:
      'Ask me anything about your budget: spending patterns, category breakdowns, whether you\'re on track, or how this month compares to last.',
    categoryLabel: 'Budget Insights',
    categoryDescription:
      'Ask questions about your spending, balances, and budget trends.',
    supportsImageUpload: false,
    inputPlaceholder: 'Ask about your budget...',
    model: 'claude-sonnet-4-6',
  },
  {
    id: 'health',
    title: 'Log Health',
    description: 'Log routines, manage entries, and check your streaks',
    icon: 'heart',
    welcomeMessage:
      "I can help you log health routines, check your streaks, or manage your entries. Try something like \"did yoga today\" or \"how's my running streak?\"",
    categoryLabel: 'Log Health',
    categoryDescription:
      'Log a routine, ask about streaks, or manage health entries.',
    supportsImageUpload: false,
    inputPlaceholder: 'Log a routine or ask a question...',
  },
  {
    id: 'goals',
    title: 'Targets',
    description: 'Create targets, log progress, and check your status',
    icon: 'target',
    welcomeMessage:
      "I can help you create targets, log progress, or check how you're doing. Try \"how close am I to my savings target?\" or \"add $200 to my savings target.\"",
    categoryLabel: 'Targets',
    categoryDescription:
      'Create targets, update progress, or check your status.',
    supportsImageUpload: false,
    inputPlaceholder: 'Ask about targets or log progress...',
  },
];

export function getPipelineConfig(id: string): PipelineConfig | undefined {
  return PIPELINES.find((p) => p.id === id);
}
