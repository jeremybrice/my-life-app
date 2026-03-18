# My Life App — Global Conventions & Shared Contracts

> This document is the source of truth for all stage implementation plans.
> Every agent writing a stage plan MUST conform to these conventions.
> Deviations between stages will be treated as alignment failures.

## Tech Stack

- **Build:** Vite 6.x + React 19 + TypeScript (strict mode)
- **Routing:** React Router v7 (6 routes)
- **Data:** Dexie.js 4.x (IndexedDB wrapper)
- **Service Worker:** vite-plugin-pwa (Workbox under the hood)
- **Styling:** Tailwind CSS 4.x
- **Testing:** Vitest + React Testing Library + @testing-library/user-event
- **Linting:** ESLint + Prettier
- **Hosting:** Netlify (static, SPA redirect via netlify.toml)
- **AI:** Claude API via @anthropic-ai/sdk (browser-compatible fetch)

## Project Structure

```
my-life-app/
├── public/
│   ├── manifest.json
│   ├── icons/                  # PWA icons (192x192, 512x512)
│   └── offline.html            # Offline fallback page
├── src/
│   ├── main.tsx                # Entry point, renders <App />
│   ├── App.tsx                 # Router + AppShell layout
│   ├── components/             # Shared UI components
│   │   ├── AppShell.tsx        # Layout with navigation
│   │   ├── BottomNav.tsx       # Mobile bottom tabs
│   │   ├── EmptyState.tsx      # Reusable empty state
│   │   ├── LoadingSpinner.tsx  # Reusable loading indicator
│   │   ├── ErrorState.tsx      # Reusable error display
│   │   └── ConfirmDialog.tsx   # Reusable confirmation modal
│   ├── screens/
│   │   ├── dashboard/          # Dashboard screen components
│   │   ├── budget/             # Budget screen components
│   │   ├── goals/              # Goals screen components
│   │   ├── health/             # Health routines screen components
│   │   ├── agent/              # AI Agent screen components
│   │   └── settings/           # Settings screen components
│   ├── data/
│   │   ├── db.ts               # Dexie database instance + schema
│   │   ├── settings-service.ts # Settings CRUD
│   │   ├── budget-service.ts   # Budget month CRUD + balance calculations
│   │   ├── expense-service.ts  # Expense CRUD + validation
│   │   ├── goal-service.ts     # Goal CRUD + progress logic
│   │   ├── health-service.ts   # Health routine + log entry CRUD
│   │   └── notification-service.ts # Notification dispatch + capability
│   ├── hooks/
│   │   ├── useSettings.ts      # React hook wrapping settings-service
│   │   ├── useBudget.ts        # React hook wrapping budget-service
│   │   ├── useExpenses.ts      # React hook wrapping expense-service
│   │   ├── useGoals.ts         # React hook wrapping goal-service
│   │   ├── useHealth.ts        # React hook wrapping health-service
│   │   └── useOnlineStatus.ts  # Network connectivity hook
│   ├── services/
│   │   ├── claude-client.ts    # Claude API client
│   │   ├── expense-parser.ts   # NL expense parsing logic
│   │   └── receipt-processor.ts # Receipt image processing
│   └── lib/
│       ├── constants.ts         # Shared constants (MAX_VENDOR_LENGTH, SETTINGS_ID, etc.)
│       ├── currency.ts         # Currency formatting + 2-decimal math
│       ├── dates.ts            # Date helpers (days in month, elapsed, etc.)
│       └── types.ts            # Shared TypeScript interfaces
├── tests/
│   ├── data/                   # Data service tests
│   ├── hooks/                  # Hook tests
│   ├── screens/                # Screen component tests
│   ├── services/               # Service tests
│   └── setup.ts                # Test setup (fake-indexeddb, etc.)
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── netlify.toml
└── package.json
```

## Naming Conventions

| Thing | Convention | Example |
| ----- | ---------- | ------- |
| Files | kebab-case | `budget-service.ts` |
| React Components | PascalCase | `BudgetScreen.tsx` |
| Functions | camelCase | `createExpense()` |
| Interfaces/Types | PascalCase | `Expense` |
| Constants | SCREAMING_SNAKE | `MAX_VENDOR_LENGTH` |
| Test files | `*.test.ts` or `*.test.tsx` | `budget-service.test.ts` |
| CSS classes | Tailwind utilities | `className="text-lg font-bold"` |

## Routes

| Path | Screen | Component |
| ---- | ------ | --------- |
| `/` | Dashboard | `DashboardScreen` |
| `/budget` | Budget | `BudgetScreen` |
| `/goals` | Goals | `GoalsScreen` |
| `/health` | Health Routines | `HealthScreen` |
| `/agent` | AI Agent | `AgentScreen` |
| `/settings` | Settings | `SettingsScreen` |

## Database Schema (Dexie)

Database name: `myLifeAppDB`

```typescript
// src/data/db.ts
import Dexie, { type Table } from 'dexie';

export interface Settings {
  id: number;              // always 1 (singleton)
  apiKey?: string;
  birthDate?: string;      // ISO date "1985-06-15"
  targetDate?: string;     // ISO date "2035-06-15"
  targetDateLabel?: string;
  monthlyBudget?: number;
  dailyBudget?: number;
  notificationPreferences?: NotificationPreferences;
}

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

export interface BudgetMonth {
  yearMonth: string;       // "2026-03" (primary key)
  monthlyAmount: number;
  dailyAllowance: number;  // monthlyAmount / days in month
  carryOver: number;
  additionalFunds: number;
  createdAt: string;       // ISO datetime
  updatedAt: string;
}

export interface Expense {
  id?: number;             // auto-increment
  yearMonth: string;       // "2026-03" (indexed)
  date: string;            // "2026-03-17" (indexed)
  vendor: string;          // max 20 chars
  amount: number;          // positive, 2 decimal places
  category?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id?: number;             // auto-increment
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
  id?: number;             // auto-increment
  name: string;
  targetFrequency: number; // per week (positive integer)
  trackedMetrics: TrackedMetric[];
  createdAt: string;
  updatedAt: string;
}

export interface TrackedMetric {
  type: 'duration' | 'distance' | 'reps' | 'weight';
  unit?: string;           // e.g., "km", "lbs", "minutes"
}

export interface HealthLogEntry {
  id?: number;             // auto-increment
  routineId: number;       // indexed
  date: string;            // "2026-03-17" (indexed)
  metrics?: Record<string, number>;
  createdAt: string;
}

export class MyLifeAppDB extends Dexie {
  settings!: Table<Settings>;
  budgetMonths!: Table<BudgetMonth>;
  expenses!: Table<Expense>;
  goals!: Table<Goal>;
  healthRoutines!: Table<HealthRoutine>;
  healthLogEntries!: Table<HealthLogEntry>;

  constructor() {
    super('myLifeAppDB');
    this.version(1).stores({
      settings: 'id',
      budgetMonths: 'yearMonth',
      expenses: '++id, yearMonth, date',
      goals: '++id, status, type',
      healthRoutines: '++id',
      healthLogEntries: '++id, routineId, date',
    });
  }
}

export const db = new MyLifeAppDB();
```

## Shared Constants

```typescript
// src/lib/constants.ts
export const MAX_VENDOR_LENGTH = 20;
export const SETTINGS_ID = 1;
export const DB_NAME = 'myLifeAppDB';
```

## Currency Utility Contract

```typescript
// src/lib/currency.ts
/** Round to exactly 2 decimal places using banker's rounding */
export function roundCurrency(value: number): number;

/** Format a number as currency display (e.g., "1,234.56") */
export function formatCurrency(value: number): string;
```

## Date Utility Contract

```typescript
// src/lib/dates.ts
/** Number of days in a given year-month (e.g., "2026-03" → 31) */
export function daysInMonth(yearMonth: string): number;

/** Number of days elapsed in the month through today (inclusive) */
export function daysElapsed(yearMonth: string): number;

/** Current year-month as "YYYY-MM" */
export function currentYearMonth(): string;

/** Today as "YYYY-MM-DD" */
export function today(): string;

/** Days between two ISO dates (inclusive) */
export function daysBetween(from: string, to: string): number;

/** Get the Monday of the week containing the given date */
export function weekStart(date: string): string;

/** Get the previous year-month */
export function previousYearMonth(yearMonth: string): string;

/** Get the next year-month */
export function nextYearMonth(yearMonth: string): string;
```

## Data Service Contract Pattern

All data services follow this pattern:

```typescript
// Every service function:
// 1. Is a standalone async function (NOT tied to React)
// 2. Validates inputs before writing
// 3. Returns the created/updated record on success
// 4. Throws a descriptive Error on validation failure
// 5. Uses roundCurrency() for all monetary calculations

// Example:
export async function createExpense(input: CreateExpenseInput): Promise<Expense>;
export async function updateExpense(id: number, input: UpdateExpenseInput): Promise<Expense>;
export async function deleteExpense(id: number): Promise<void>;
export async function getExpensesByMonth(yearMonth: string): Promise<Expense[]>;
```

> **Note:** `settings-service.ts` exports both `saveSettings` and `updateSettings` (alias) for compatibility across stages.

## React Hook Contract Pattern

All hooks follow this pattern:

```typescript
// Every hook:
// 1. Wraps the corresponding data service
// 2. Returns { data, loading, error } shape
// 3. Triggers re-render when data changes
// 4. Exposes mutation functions that call the service

// Example:
export function useExpenses(yearMonth: string) {
  return {
    expenses: Expense[],
    loading: boolean,
    error: Error | null,
    addExpense: (input: CreateExpenseInput) => Promise<Expense>,
    updateExpense: (id: number, input: UpdateExpenseInput) => Promise<Expense>,
    deleteExpense: (id: number) => Promise<void>,
  };
}
```

## Testing Conventions

- **Unit tests** for all data services (pure logic, use fake-indexeddb)
- **Component tests** for all screens (React Testing Library)
- **Test setup:** `tests/setup.ts` initializes fake-indexeddb for Dexie
- **Test command:** `npx vitest run`
- **Watch command:** `npx vitest`
- **Single test:** `npx vitest run tests/data/expense-service.test.ts`
- **Test naming:** `it('should reject expense with vendor exceeding 20 chars')`
- **No mocking IndexedDB in service tests** — use fake-indexeddb for real Dexie behavior

```typescript
// tests/setup.ts
import 'fake-indexeddb/auto';
```

## Commit Message Convention

```
feat: add expense entry form with validation
fix: correct carry-over calculation for negative balances
test: add budget month CRUD service tests
refactor: extract balance calculation to shared utility
```

## Key Architectural Rules

1. **Data services are framework-agnostic.** They import Dexie and export pure async functions. They do NOT import React.
2. **The expense write interface is a shared contract.** Both the manual form (Stage 3) and the AI agent (Stage 6) call the same `createExpense()` function. No duplicate persistence logic.
3. **Dashboard cards define TypeScript prop interfaces in Stage 2.** Stages 4 and 5 wire live data to these cards, using the exact same prop types. Later stages may add optional props (like `onNavigate` callbacks) but must not rename existing fields.
4. **All monetary math uses `roundCurrency()`.** No raw floating-point arithmetic on currency values.
5. **Dexie's `liveQuery` for reactive data.** Hooks use `useLiveQuery` from `dexie-react-hooks` to auto-update when IndexedDB changes.
6. **No global state library.** Dexie + React hooks is the state management approach. No Redux, Zustand, etc.
