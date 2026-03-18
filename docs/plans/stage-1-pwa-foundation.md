# Stage 1: PWA Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Scaffold the My Life App as an installable PWA with persistent settings, full IndexedDB schema, and navigation to all 6 screens.

**Architecture:** Vite + React + TypeScript with Dexie.js for IndexedDB, Workbox for service worker, Tailwind for styling, React Router for client-side routing. All data services are framework-agnostic pure async functions.

**Tech Stack:** Vite 6, React 19, TypeScript, Dexie.js 4, vite-plugin-pwa, Tailwind CSS 4, React Router v7, Vitest, React Testing Library

**Depends on:** Nothing (this is the foundation)
**Produces for later stages:** Dexie DB schema, project structure, routing, settings service, shared components, lib utilities

---

## Phase 1: Project Scaffold

### Task 1.1 — Initialize Vite + React + TypeScript project

Create the Vite project in-place (the repo root already exists).

**File: `package.json`**
```json
{
  "name": "my-life-app",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint ."
  },
  "dependencies": {
    "dexie": "^4.0.11",
    "dexie-react-hooks": "^1.1.7",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-router": "^7.5.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.25.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/react": "^19.1.2",
    "@types/react-dom": "^19.1.2",
    "@vitejs/plugin-react": "^4.4.1",
    "eslint": "^9.25.0",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.20",
    "fake-indexeddb": "^6.0.0",
    "globals": "^16.0.0",
    "jsdom": "^26.1.0",
    "tailwindcss": "^4.1.4",
    "@tailwindcss/vite": "^4.1.4",
    "typescript": "^5.8.3",
    "typescript-eslint": "^8.30.1",
    "vite": "^6.3.2",
    "vite-plugin-pwa": "^1.0.0",
    "vitest": "^3.1.1"
  }
}
```

**Run:**
```bash
cd /Users/jeremybrice/Documents/GitHub/my-life-app && npm install
```

**Commit:** `feat: initialize project with Vite + React + TypeScript dependencies`

---

### Task 1.2 — Create TypeScript config

**File: `tsconfig.json`**
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

**File: `tsconfig.app.json`**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"]
}
```

**File: `tsconfig.node.json`**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["vite.config.ts", "eslint.config.js"]
}
```

---

### Task 1.3 — Create Vite config with PWA plugin

**File: `vite.config.ts`**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'offline.html'],
      manifest: false, // We provide our own manifest.json in public/
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/offline\.html$/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.anthropic\.com\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    css: false,
  },
});
```

---

### Task 1.4 — Create ESLint config

**File: `eslint.config.js`**
```javascript
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
);
```

---

### Task 1.5 — Create index.html entry point

**File: `index.html`**
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#1e293b" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png" />
    <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
    <title>My Life App</title>
  </head>
  <body class="bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

### Task 1.6 — Create test setup

**File: `tests/setup.ts`**
```typescript
import 'fake-indexeddb/auto';
import '@testing-library/jest-dom';
```

**Commit:** `feat: add project config files (TypeScript, Vite, ESLint, test setup)`

---

## Phase 2: Tailwind + Base Styling

### Task 2.1 — Create global CSS with Tailwind

**File: `src/index.css`**
```css
@import "tailwindcss";

@theme {
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-200: #bfdbfe;
  --color-primary-300: #93c5fd;
  --color-primary-400: #60a5fa;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;
  --color-primary-800: #1e40af;
  --color-primary-900: #1e3a8a;

  --color-positive: #16a34a;
  --color-negative: #dc2626;
  --color-warning: #f59e0b;
}

/* Base styles */
body {
  @apply min-h-screen antialiased;
  -webkit-tap-highlight-color: transparent;
}

/* Standalone PWA: account for safe areas */
@supports (padding: env(safe-area-inset-bottom)) {
  .pb-safe {
    padding-bottom: env(safe-area-inset-bottom);
  }
  .pt-safe {
    padding-top: env(safe-area-inset-top);
  }
}
```

**Commit:** `feat: add Tailwind CSS setup with custom theme tokens`

---

## Phase 3: Shared Lib Utilities

### Task 3.1 — Create shared TypeScript interfaces

**File: `src/lib/types.ts`**
```typescript
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
```

---

### Task 3.2 — Create shared constants

**File: `src/lib/constants.ts`**
```typescript
/** The singleton settings record always uses this ID */
export const SETTINGS_ID = 1;

/** IndexedDB database name */
export const DB_NAME = 'myLifeAppDB';

/** Maximum characters for expense vendor field */
export const MAX_VENDOR_LENGTH = 20;

/** App display name */
export const APP_NAME = 'My Life App';

/** Route paths */
export const ROUTES = {
  DASHBOARD: '/',
  BUDGET: '/budget',
  GOALS: '/goals',
  HEALTH: '/health',
  AGENT: '/agent',
  SETTINGS: '/settings',
} as const;

/** Navigation items in display order */
export const NAV_ITEMS = [
  { path: ROUTES.DASHBOARD, label: 'Dashboard', icon: 'home' },
  { path: ROUTES.BUDGET, label: 'Budget', icon: 'wallet' },
  { path: ROUTES.GOALS, label: 'Goals', icon: 'target' },
  { path: ROUTES.HEALTH, label: 'Health', icon: 'heart' },
  { path: ROUTES.AGENT, label: 'AI Agent', icon: 'bot' },
  { path: ROUTES.SETTINGS, label: 'Settings', icon: 'settings' },
] as const;

/** Default notification preferences */
export const DEFAULT_NOTIFICATION_PREFERENCES = {
  masterEnabled: true,
  dailyOverspend: true,
  monthlyThresholds: [
    { percentage: 80, enabled: true },
    { percentage: 90, enabled: true },
    { percentage: 100, enabled: true },
  ],
  milestoneIntervals: [
    { days: 30, enabled: true },
    { days: 7, enabled: true },
    { days: 1, enabled: true },
  ],
} as const;
```

---

### Task 3.3 — Create currency utility + tests

**File: `src/lib/currency.ts`**
```typescript
/**
 * Currency utility functions.
 * All monetary math in the app MUST use roundCurrency() to avoid
 * floating-point precision errors.
 */

/**
 * Round to exactly 2 decimal places using Math.round.
 * Avoids floating-point drift (e.g., 0.1 + 0.2 = 0.30000000000000004).
 */
export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Format a number as currency display (e.g., "1,234.56").
 * Always shows exactly 2 decimal places.
 * Does NOT include a currency symbol — the caller adds that if needed.
 */
export function formatCurrency(value: number): string {
  return roundCurrency(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
```

**File: `tests/lib/currency.test.ts`**
```typescript
import { describe, it, expect } from 'vitest';
import { roundCurrency, formatCurrency } from '@/lib/currency';

describe('roundCurrency', () => {
  it('should round to 2 decimal places', () => {
    expect(roundCurrency(1.005)).toBe(1.01);
    expect(roundCurrency(1.004)).toBe(1.0);
    expect(roundCurrency(1.999)).toBe(2.0);
  });

  it('should handle floating-point drift', () => {
    expect(roundCurrency(0.1 + 0.2)).toBe(0.3);
  });

  it('should handle whole numbers', () => {
    expect(roundCurrency(100)).toBe(100);
  });

  it('should handle zero', () => {
    expect(roundCurrency(0)).toBe(0);
  });

  it('should handle negative values', () => {
    expect(roundCurrency(-1.005)).toBe(-1.0);
    expect(roundCurrency(-99.999)).toBe(-100.0);
  });
});

describe('formatCurrency', () => {
  it('should format with 2 decimal places', () => {
    expect(formatCurrency(1234.5)).toBe('1,234.50');
  });

  it('should format with comma separators', () => {
    expect(formatCurrency(1234567.89)).toBe('1,234,567.89');
  });

  it('should format zero', () => {
    expect(formatCurrency(0)).toBe('0.00');
  });

  it('should format negative values', () => {
    expect(formatCurrency(-42.5)).toBe('-42.50');
  });

  it('should round before formatting', () => {
    expect(formatCurrency(0.1 + 0.2)).toBe('0.30');
  });
});
```

**Test:** `npx vitest run tests/lib/currency.test.ts`

---

### Task 3.4 — Create date utility + tests

**File: `src/lib/dates.ts`**
```typescript
/**
 * Date utility functions for the My Life App.
 * All date strings use ISO format: "YYYY-MM-DD" for dates, "YYYY-MM" for months.
 */

/** Number of days in a given year-month (e.g., "2026-03" -> 31) */
export function daysInMonth(yearMonth: string): number {
  const [year, month] = yearMonth.split('-').map(Number);
  // Day 0 of the next month gives the last day of the current month
  return new Date(year!, month!, 0).getDate();
}

/** Number of days elapsed in the month through today (inclusive) */
export function daysElapsed(yearMonth: string): number {
  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  if (yearMonth < currentYM) {
    // Past month: all days elapsed
    return daysInMonth(yearMonth);
  }
  if (yearMonth > currentYM) {
    // Future month: zero days elapsed
    return 0;
  }
  // Current month: today's date number
  return now.getDate();
}

/** Current year-month as "YYYY-MM" */
export function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Today as "YYYY-MM-DD" */
export function today(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Days between two ISO dates (absolute value, inclusive of both endpoints) */
export function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00');
  const b = new Date(to + 'T00:00:00');
  const diffMs = Math.abs(b.getTime() - a.getTime());
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/** Get the Monday of the week containing the given date */
export function weekStart(date: string): string {
  const d = new Date(date + 'T00:00:00');
  const day = d.getDay();
  // getDay(): 0=Sun, 1=Mon, ..., 6=Sat
  // Shift so Monday=0
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** Get the previous year-month (e.g., "2026-01" -> "2025-12") */
export function previousYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  if (month === 1) {
    return `${year! - 1}-12`;
  }
  return `${year}-${String(month! - 1).padStart(2, '0')}`;
}

/** Get the next year-month (e.g., "2026-12" -> "2027-01") */
export function nextYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  if (month === 12) {
    return `${year! + 1}-01`;
  }
  return `${year}-${String(month! + 1).padStart(2, '0')}`;
}
```

**File: `tests/lib/dates.test.ts`**
```typescript
import { describe, it, expect } from 'vitest';
import {
  daysInMonth,
  daysBetween,
  weekStart,
  previousYearMonth,
  nextYearMonth,
  today,
  currentYearMonth,
} from '@/lib/dates';

describe('daysInMonth', () => {
  it('should return 31 for March', () => {
    expect(daysInMonth('2026-03')).toBe(31);
  });

  it('should return 28 for non-leap February', () => {
    expect(daysInMonth('2026-02')).toBe(28);
  });

  it('should return 29 for leap February', () => {
    expect(daysInMonth('2024-02')).toBe(29);
  });

  it('should return 30 for April', () => {
    expect(daysInMonth('2026-04')).toBe(30);
  });

  it('should return 31 for December', () => {
    expect(daysInMonth('2026-12')).toBe(31);
  });
});

describe('daysBetween', () => {
  it('should return 0 for same date', () => {
    expect(daysBetween('2026-03-18', '2026-03-18')).toBe(0);
  });

  it('should return correct days between two dates', () => {
    expect(daysBetween('2026-03-01', '2026-03-31')).toBe(30);
  });

  it('should handle order of arguments', () => {
    expect(daysBetween('2026-03-31', '2026-03-01')).toBe(30);
  });

  it('should handle cross-month', () => {
    expect(daysBetween('2026-01-31', '2026-02-01')).toBe(1);
  });

  it('should handle cross-year', () => {
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1);
  });
});

describe('weekStart', () => {
  it('should return Monday for a Wednesday', () => {
    // 2026-03-18 is a Wednesday
    expect(weekStart('2026-03-18')).toBe('2026-03-16');
  });

  it('should return same day for a Monday', () => {
    expect(weekStart('2026-03-16')).toBe('2026-03-16');
  });

  it('should return previous Monday for a Sunday', () => {
    // 2026-03-22 is a Sunday
    expect(weekStart('2026-03-22')).toBe('2026-03-16');
  });
});

describe('previousYearMonth', () => {
  it('should return previous month', () => {
    expect(previousYearMonth('2026-03')).toBe('2026-02');
  });

  it('should wrap to December of previous year', () => {
    expect(previousYearMonth('2026-01')).toBe('2025-12');
  });
});

describe('nextYearMonth', () => {
  it('should return next month', () => {
    expect(nextYearMonth('2026-03')).toBe('2026-04');
  });

  it('should wrap to January of next year', () => {
    expect(nextYearMonth('2026-12')).toBe('2027-01');
  });
});

describe('today', () => {
  it('should return a string in YYYY-MM-DD format', () => {
    const result = today();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('currentYearMonth', () => {
  it('should return a string in YYYY-MM format', () => {
    const result = currentYearMonth();
    expect(result).toMatch(/^\d{4}-\d{2}$/);
  });
});
```

**Test:** `npx vitest run tests/lib/dates.test.ts`

**Commit:** `feat: add shared lib utilities (types, constants, currency, dates) with tests`

---

## Phase 4: Dexie DB Schema + Initialization

### Task 4.1 — Create Dexie database instance with full schema

**File: `src/data/db.ts`**
```typescript
import Dexie, { type Table } from 'dexie';
import type {
  Settings,
  BudgetMonth,
  Expense,
  Goal,
  HealthRoutine,
  HealthLogEntry,
} from '@/lib/types';

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

---

### Task 4.2 — Create DB initialization tests

**File: `tests/data/db.test.ts`**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MyLifeAppDB } from '@/data/db';

describe('MyLifeAppDB', () => {
  let db: MyLifeAppDB;

  beforeEach(async () => {
    db = new MyLifeAppDB();
    // Ensure clean state
    await db.delete();
    db = new MyLifeAppDB();
    await db.open();
  });

  it('should create the database at version 1', () => {
    expect(db.verno).toBe(1);
  });

  it('should have a settings table', async () => {
    const count = await db.settings.count();
    expect(count).toBe(0);
  });

  it('should have a budgetMonths table', async () => {
    const count = await db.budgetMonths.count();
    expect(count).toBe(0);
  });

  it('should have an expenses table', async () => {
    const count = await db.expenses.count();
    expect(count).toBe(0);
  });

  it('should have a goals table', async () => {
    const count = await db.goals.count();
    expect(count).toBe(0);
  });

  it('should have a healthRoutines table', async () => {
    const count = await db.healthRoutines.count();
    expect(count).toBe(0);
  });

  it('should have a healthLogEntries table', async () => {
    const count = await db.healthLogEntries.count();
    expect(count).toBe(0);
  });

  it('should persist data across re-open', async () => {
    await db.settings.put({ id: 1, apiKey: 'test-key' } as any);
    db.close();

    const db2 = new MyLifeAppDB();
    await db2.open();
    const settings = await db2.settings.get(1);
    expect(settings?.apiKey).toBe('test-key');
    db2.close();
  });

  it('should support expenses indexed by yearMonth', async () => {
    await db.expenses.add({
      yearMonth: '2026-03',
      date: '2026-03-18',
      vendor: 'Coffee',
      amount: 4.50,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await db.expenses.add({
      yearMonth: '2026-02',
      date: '2026-02-15',
      vendor: 'Lunch',
      amount: 12.00,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const marchExpenses = await db.expenses
      .where('yearMonth')
      .equals('2026-03')
      .toArray();
    expect(marchExpenses).toHaveLength(1);
    expect(marchExpenses[0]!.vendor).toBe('Coffee');
  });

  it('should support goals indexed by status', async () => {
    await db.goals.add({
      title: 'Save $1000',
      type: 'financial',
      progressModel: 'numeric',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await db.goals.add({
      title: 'Read 12 books',
      type: 'personal',
      progressModel: 'numeric',
      status: 'completed',
      completedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const activeGoals = await db.goals
      .where('status')
      .equals('active')
      .toArray();
    expect(activeGoals).toHaveLength(1);
    expect(activeGoals[0]!.title).toBe('Save $1000');
  });
});
```

**Test:** `npx vitest run tests/data/db.test.ts`

**Commit:** `feat: add Dexie IndexedDB schema with all 6 object stores and tests`

---

## Phase 5: Settings Data Service + Tests

### Task 5.1 — Create settings data service

**File: `src/data/settings-service.ts`**
```typescript
import { db } from '@/data/db';
import { SETTINGS_ID } from '@/lib/constants';
import type { Settings } from '@/lib/types';

/**
 * Settings data service.
 * Framework-agnostic async functions for settings CRUD.
 * Settings is a singleton record (id=1).
 */

/** Get the current settings. Returns undefined if no settings saved yet. */
export async function getSettings(): Promise<Settings | undefined> {
  return db.settings.get(SETTINGS_ID);
}

/** Input type for saving settings. All fields optional for partial saves. */
export interface SaveSettingsInput {
  apiKey?: string;
  birthDate?: string;
  targetDate?: string;
  targetDateLabel?: string;
  monthlyBudget?: number;
  dailyBudget?: number;
}

/**
 * Save settings. Merges with existing settings (partial update).
 * Creates the singleton record if it doesn't exist.
 * Returns the full saved Settings object.
 */
export async function saveSettings(input: SaveSettingsInput): Promise<Settings> {
  // Validate birth date is not in the future
  if (input.birthDate) {
    const birth = new Date(input.birthDate + 'T00:00:00');
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (birth > now) {
      throw new Error('Birth date cannot be in the future');
    }
  }

  // Validate budget amounts are non-negative if provided
  if (input.monthlyBudget !== undefined && input.monthlyBudget < 0) {
    throw new Error('Monthly budget must be non-negative');
  }
  if (input.dailyBudget !== undefined && input.dailyBudget < 0) {
    throw new Error('Daily budget must be non-negative');
  }

  const existing = await db.settings.get(SETTINGS_ID);

  const settings: Settings = {
    ...(existing ?? { id: SETTINGS_ID }),
    ...input,
    id: SETTINGS_ID, // Always enforce singleton ID
  };

  await db.settings.put(settings);
  return settings;
}

/** Clear all settings (reset to empty). */
export async function clearSettings(): Promise<void> {
  await db.settings.delete(SETTINGS_ID);
}

/** Alias for saveSettings — used by later stages (e.g., Stage 7). */
export const updateSettings = saveSettings;
```

---

### Task 5.2 — Create settings service tests

**File: `tests/data/settings-service.test.ts`**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/data/db';
import {
  getSettings,
  saveSettings,
  clearSettings,
} from '@/data/settings-service';

describe('settings-service', () => {
  beforeEach(async () => {
    // Clean slate for each test
    await db.delete();
    await db.open();
  });

  describe('getSettings', () => {
    it('should return undefined when no settings exist', async () => {
      const result = await getSettings();
      expect(result).toBeUndefined();
    });

    it('should return saved settings', async () => {
      await saveSettings({ apiKey: 'sk-test-123' });
      const result = await getSettings();
      expect(result).toBeDefined();
      expect(result!.apiKey).toBe('sk-test-123');
    });
  });

  describe('saveSettings', () => {
    it('should create settings on first save', async () => {
      const result = await saveSettings({ birthDate: '1990-01-15' });
      expect(result.id).toBe(1);
      expect(result.birthDate).toBe('1990-01-15');
    });

    it('should always use singleton id=1', async () => {
      const result = await saveSettings({ apiKey: 'test' });
      expect(result.id).toBe(1);

      const count = await db.settings.count();
      expect(count).toBe(1);
    });

    it('should merge with existing settings (partial update)', async () => {
      await saveSettings({ apiKey: 'my-key', birthDate: '1990-01-15' });
      const result = await saveSettings({ monthlyBudget: 3000 });

      expect(result.apiKey).toBe('my-key');
      expect(result.birthDate).toBe('1990-01-15');
      expect(result.monthlyBudget).toBe(3000);
    });

    it('should allow partial saves with only some fields', async () => {
      const result = await saveSettings({ monthlyBudget: 5000 });
      expect(result.monthlyBudget).toBe(5000);
      expect(result.apiKey).toBeUndefined();
      expect(result.birthDate).toBeUndefined();
    });

    it('should save all 6 fields correctly', async () => {
      const result = await saveSettings({
        apiKey: 'sk-ant-api03-secret',
        birthDate: '1985-06-15',
        targetDate: '2035-06-15',
        targetDateLabel: 'Financial Freedom',
        monthlyBudget: 4000,
        dailyBudget: 130,
      });

      expect(result.apiKey).toBe('sk-ant-api03-secret');
      expect(result.birthDate).toBe('1985-06-15');
      expect(result.targetDate).toBe('2035-06-15');
      expect(result.targetDateLabel).toBe('Financial Freedom');
      expect(result.monthlyBudget).toBe(4000);
      expect(result.dailyBudget).toBe(130);
    });

    it('should reject future birth date', async () => {
      await expect(
        saveSettings({ birthDate: '2099-01-01' })
      ).rejects.toThrow('Birth date cannot be in the future');
    });

    it('should reject negative monthly budget', async () => {
      await expect(
        saveSettings({ monthlyBudget: -100 })
      ).rejects.toThrow('Monthly budget must be non-negative');
    });

    it('should reject negative daily budget', async () => {
      await expect(
        saveSettings({ dailyBudget: -50 })
      ).rejects.toThrow('Daily budget must be non-negative');
    });

    it('should allow zero budgets', async () => {
      const result = await saveSettings({
        monthlyBudget: 0,
        dailyBudget: 0,
      });
      expect(result.monthlyBudget).toBe(0);
      expect(result.dailyBudget).toBe(0);
    });

    it('should overwrite existing field values', async () => {
      await saveSettings({ apiKey: 'old-key' });
      const result = await saveSettings({ apiKey: 'new-key' });
      expect(result.apiKey).toBe('new-key');
    });
  });

  describe('clearSettings', () => {
    it('should remove all settings', async () => {
      await saveSettings({ apiKey: 'test', monthlyBudget: 1000 });
      await clearSettings();
      const result = await getSettings();
      expect(result).toBeUndefined();
    });

    it('should not throw when no settings exist', async () => {
      await expect(clearSettings()).resolves.not.toThrow();
    });
  });
});
```

**Test:** `npx vitest run tests/data/settings-service.test.ts`

**Commit:** `feat: add settings data service with CRUD operations and tests`

---

## Phase 6: Shared UI Components

### Task 6.1 — Create NavIcon helper component

This component renders inline SVG icons for the navigation. Keeps icon definitions colocated with navigation code.

**File: `src/components/NavIcon.tsx`**
```tsx
interface NavIconProps {
  icon: string;
  className?: string;
}

export function NavIcon({ icon, className = 'w-6 h-6' }: NavIconProps) {
  switch (icon) {
    case 'home':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955a1.126 1.126 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      );
    case 'wallet':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
        </svg>
      );
    case 'target':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
        </svg>
      );
    case 'heart':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
        </svg>
      );
    case 'bot':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
        </svg>
      );
    case 'settings':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      );
    default:
      return null;
  }
}
```

---

### Task 6.2 — Create BottomNav component

**File: `src/components/BottomNav.tsx`**
```tsx
import { NavLink } from 'react-router';
import { NAV_ITEMS } from '@/lib/constants';
import { NavIcon } from '@/components/NavIcon';

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 pb-safe md:hidden">
      <ul className="flex justify-around items-center h-16">
        {NAV_ITEMS.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors ${
                  isActive
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`
              }
            >
              <NavIcon icon={item.icon} className="w-6 h-6" />
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

---

### Task 6.3 — Create Sidebar component (desktop)

**File: `src/components/Sidebar.tsx`**
```tsx
import { NavLink } from 'react-router';
import { NAV_ITEMS, APP_NAME } from '@/lib/constants';
import { NavIcon } from '@/components/NavIcon';

export function Sidebar() {
  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-slate-800 dark:bg-slate-900 text-white">
      <div className="flex items-center h-16 px-6 border-b border-slate-700">
        <h1 className="text-xl font-bold">{APP_NAME}</h1>
      </div>
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`
                }
              >
                <NavIcon icon={item.icon} className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
```

---

### Task 6.4 — Create AppShell layout component

**File: `src/components/AppShell.tsx`**
```tsx
import { Outlet } from 'react-router';
import { BottomNav } from '@/components/BottomNav';
import { Sidebar } from '@/components/Sidebar';
import { APP_NAME } from '@/lib/constants';

export function AppShell() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="md:ml-64">
        {/* Mobile header */}
        <header className="sticky top-0 z-40 flex items-center h-14 px-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 pt-safe md:hidden">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            {APP_NAME}
          </h1>
        </header>

        {/* Screen content */}
        <main className="px-4 py-6 pb-24 md:pb-6 md:px-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom tabs */}
      <BottomNav />
    </div>
  );
}
```

---

### Task 6.5 — Create EmptyState component

**File: `src/components/EmptyState.tsx`**
```tsx
interface EmptyStateProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-sm">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
```

---

### Task 6.6 — Create LoadingSpinner component

**File: `src/components/LoadingSpinner.tsx`**
```tsx
interface LoadingSpinnerProps {
  /** Optional message to display below the spinner */
  message?: string;
}

export function LoadingSpinner({ message }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-8 h-8 border-4 border-slate-200 dark:border-slate-700 border-t-primary-600 rounded-full animate-spin" />
      {message && (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          {message}
        </p>
      )}
    </div>
  );
}
```

---

### Task 6.7 — Create ErrorState component

**File: `src/components/ErrorState.tsx`**
```tsx
interface ErrorStateProps {
  title?: string;
  message: string;
  retry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  retry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 mb-4 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
        <svg className="w-8 h-8 text-negative" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-1">
        {title}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-sm">
        {message}
      </p>
      {retry && (
        <button
          onClick={retry}
          className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
```

---

### Task 6.8 — Create ConfirmDialog component

**File: `src/components/ConfirmDialog.tsx`**
```tsx
import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'default';
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const confirmButtonClass =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : 'bg-primary-600 hover:bg-primary-700 text-white';

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      className="rounded-xl shadow-xl backdrop:bg-black/50 p-0 max-w-sm w-full"
    >
      <div className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          {title}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
          {message}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${confirmButtonClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
```

**Commit:** `feat: add shared UI components (AppShell, BottomNav, Sidebar, EmptyState, LoadingSpinner, ErrorState, ConfirmDialog)`

---

### Task 6.9 — Create useOnlineStatus hook

A lightweight hook used by later stages (e.g., Stage 7 AI Agent) to detect online/offline status reactively.

**File: `src/hooks/useOnlineStatus.ts`**
```typescript
import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot);
}
```

**Commit:** `feat: add useOnlineStatus hook for online/offline detection`

---

## Phase 7: React Router + Placeholder Screens

### Task 7.1 — Create placeholder screen components

Each placeholder screen follows the same minimal pattern showing the screen name.

**File: `src/screens/dashboard/DashboardScreen.tsx`**
```tsx
export function DashboardScreen() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
        Dashboard
      </h2>
      <div className="rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <p className="text-slate-500 dark:text-slate-400">
          Your life at a glance. Milestone countdown, budget summary, goals progress, and health routine tracking will appear here.
        </p>
      </div>
    </div>
  );
}
```

**File: `src/screens/budget/BudgetScreen.tsx`**
```tsx
export function BudgetScreen() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
        Budget
      </h2>
      <div className="rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <p className="text-slate-500 dark:text-slate-400">
          Track your daily and monthly spending. Expense entry, balance tracking, and budget reports will appear here.
        </p>
      </div>
    </div>
  );
}
```

**File: `src/screens/goals/GoalsScreen.tsx`**
```tsx
export function GoalsScreen() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
        Goals
      </h2>
      <div className="rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <p className="text-slate-500 dark:text-slate-400">
          Set and track financial, personal, and strategic goals. Create goals, update progress, and celebrate completions here.
        </p>
      </div>
    </div>
  );
}
```

**File: `src/screens/health/HealthScreen.tsx`**
```tsx
export function HealthScreen() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
        Health Routines
      </h2>
      <div className="rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <p className="text-slate-500 dark:text-slate-400">
          Build and maintain healthy habits. Define routines, log activities, and track your streaks here.
        </p>
      </div>
    </div>
  );
}
```

**File: `src/screens/agent/AgentScreen.tsx`**
```tsx
export function AgentScreen() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
        AI Agent
      </h2>
      <div className="rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <p className="text-slate-500 dark:text-slate-400">
          Chat with your AI assistant to log expenses by text or receipt photo. Requires an internet connection and API key configured in Settings.
        </p>
      </div>
    </div>
  );
}
```

---

### Task 7.2 — Create App.tsx with React Router

**File: `src/App.tsx`**
```tsx
import { BrowserRouter, Routes, Route } from 'react-router';
import { AppShell } from '@/components/AppShell';
import { DashboardScreen } from '@/screens/dashboard/DashboardScreen';
import { BudgetScreen } from '@/screens/budget/BudgetScreen';
import { GoalsScreen } from '@/screens/goals/GoalsScreen';
import { HealthScreen } from '@/screens/health/HealthScreen';
import { AgentScreen } from '@/screens/agent/AgentScreen';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardScreen />} />
          <Route path="/budget" element={<BudgetScreen />} />
          <Route path="/goals" element={<GoalsScreen />} />
          <Route path="/health" element={<HealthScreen />} />
          <Route path="/agent" element={<AgentScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

---

### Task 7.3 — Create main.tsx entry point

**File: `src/main.tsx`**
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/App';
import '@/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

---

### Task 7.4 — Create vite-env.d.ts

**File: `src/vite-env.d.ts`**
```typescript
/// <reference types="vite/client" />
```

---

### Task 7.5 — Create navigation tests

**File: `tests/screens/navigation.test.tsx`**
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App';

describe('Navigation', () => {
  it('should render the Dashboard by default', () => {
    render(<App />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('should navigate to Budget screen', async () => {
    const user = userEvent.setup();
    render(<App />);

    const budgetLinks = screen.getAllByText('Budget');
    await user.click(budgetLinks[0]!);

    expect(screen.getByText(/Track your daily and monthly spending/)).toBeInTheDocument();
  });

  it('should navigate to Goals screen', async () => {
    const user = userEvent.setup();
    render(<App />);

    const goalLinks = screen.getAllByText('Goals');
    await user.click(goalLinks[0]!);

    expect(screen.getByText(/Set and track financial/)).toBeInTheDocument();
  });

  it('should navigate to Health screen', async () => {
    const user = userEvent.setup();
    render(<App />);

    const healthLinks = screen.getAllByText('Health');
    await user.click(healthLinks[0]!);

    expect(screen.getByText(/Build and maintain healthy habits/)).toBeInTheDocument();
  });

  it('should navigate to AI Agent screen', async () => {
    const user = userEvent.setup();
    render(<App />);

    const agentLinks = screen.getAllByText('AI Agent');
    await user.click(agentLinks[0]!);

    expect(screen.getByText(/Chat with your AI assistant/)).toBeInTheDocument();
  });

  it('should navigate to Settings screen', async () => {
    const user = userEvent.setup();
    render(<App />);

    const settingsLinks = screen.getAllByText('Settings');
    await user.click(settingsLinks[0]!);

    expect(screen.getByText(/AI Configuration/i)).toBeInTheDocument();
  });

  it('should show all 6 nav items', () => {
    render(<App />);

    // Mobile bottom nav renders all items
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Budget').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Goals').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Health').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('AI Agent').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Settings').length).toBeGreaterThanOrEqual(1);
  });
});
```

**Test:** `npx vitest run tests/screens/navigation.test.tsx`

**Commit:** `feat: add React Router with 6 routes, placeholder screens, and navigation tests`

---

## Phase 8: Settings Screen + Tests

### Task 8.1 — Create useSettings hook

**File: `src/hooks/useSettings.ts`**
```typescript
import { useState, useEffect, useCallback } from 'react';
import type { Settings } from '@/lib/types';
import {
  getSettings,
  saveSettings,
  type SaveSettingsInput,
} from '@/data/settings-service';

interface UseSettingsReturn {
  settings: Settings | undefined;
  loading: boolean;
  error: Error | null;
  save: (input: SaveSettingsInput) => Promise<Settings>;
}

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<Settings | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getSettings();
      setSettings(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load settings'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async (input: SaveSettingsInput): Promise<Settings> => {
    const result = await saveSettings(input);
    setSettings(result);
    return result;
  }, []);

  return { settings, loading, error, save };
}
```

---

### Task 8.2 — Create SettingsScreen component

**File: `src/screens/settings/SettingsScreen.tsx`**
```tsx
import { useState, useEffect } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorState } from '@/components/ErrorState';

export function SettingsScreen() {
  const { settings, loading, error, save } = useSettings();

  // Form state
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [birthDate, setBirthDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [targetDateLabel, setTargetDateLabel] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [dailyBudget, setDailyBudget] = useState('');

  // UI state
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  // Populate form when settings load
  useEffect(() => {
    if (settings) {
      setApiKey(settings.apiKey ?? '');
      setBirthDate(settings.birthDate ?? '');
      setTargetDate(settings.targetDate ?? '');
      setTargetDateLabel(settings.targetDateLabel ?? '');
      setMonthlyBudget(
        settings.monthlyBudget !== undefined ? String(settings.monthlyBudget) : ''
      );
      setDailyBudget(
        settings.dailyBudget !== undefined ? String(settings.dailyBudget) : ''
      );
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage('');
    setSaveError('');

    try {
      await save({
        apiKey: apiKey || undefined,
        birthDate: birthDate || undefined,
        targetDate: targetDate || undefined,
        targetDateLabel: targetDateLabel || undefined,
        monthlyBudget: monthlyBudget ? parseFloat(monthlyBudget) : undefined,
        dailyBudget: dailyBudget ? parseFloat(dailyBudget) : undefined,
      });
      setSaveMessage('Settings saved successfully');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Failed to save settings'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading settings..." />;
  }

  if (error) {
    return <ErrorState message={error.message} />;
  }

  const todayStr = new Date().toISOString().split('T')[0]!;

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
        Settings
      </h2>

      <div className="space-y-8">
        {/* AI Configuration */}
        <section className="rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            AI Configuration
          </h3>
          <div>
            <label
              htmlFor="apiKey"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Claude API Key
            </label>
            <div className="relative">
              <input
                id="apiKey"
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="w-full px-3 py-2 pr-20 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
              >
                {showApiKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Stored locally on your device. Never sent anywhere except directly to the Claude API.
            </p>
          </div>
        </section>

        {/* Life Milestone */}
        <section className="rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Life Milestone
          </h3>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="birthDate"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Birth Date
              </label>
              <input
                id="birthDate"
                type="date"
                value={birthDate}
                max={todayStr}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
              />
            </div>
            <div>
              <label
                htmlFor="targetDate"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Target Date
              </label>
              <input
                id="targetDate"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
              />
            </div>
            <div>
              <label
                htmlFor="targetDateLabel"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Target Date Label
              </label>
              <input
                id="targetDateLabel"
                type="text"
                value={targetDateLabel}
                onChange={(e) => setTargetDateLabel(e.target.value)}
                placeholder="e.g., Financial Freedom, Retirement"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
              />
            </div>
          </div>
        </section>

        {/* Budget Configuration */}
        <section className="rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Budget Configuration
          </h3>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="monthlyBudget"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Monthly Budget ($)
              </label>
              <input
                id="monthlyBudget"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
              />
            </div>
            <div>
              <label
                htmlFor="dailyBudget"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Daily Budget ($)
              </label>
              <input
                id="dailyBudget"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={dailyBudget}
                onChange={(e) => setDailyBudget(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
              />
            </div>
          </div>
        </section>

        {/* Save button + messages */}
        <div className="flex flex-col items-stretch gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>

          {saveMessage && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm text-center" role="status">
              {saveMessage}
            </div>
          )}

          {saveError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm text-center" role="alert">
              {saveError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

### Task 8.3 — Create SettingsScreen tests

**File: `tests/screens/settings-screen.test.tsx`**
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { db } from '@/data/db';
import { getSettings } from '@/data/settings-service';

function renderSettings() {
  return render(
    <BrowserRouter>
      <SettingsScreen />
    </BrowserRouter>
  );
}

describe('SettingsScreen', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('should render the settings form', async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    expect(screen.getByText('AI Configuration')).toBeInTheDocument();
    expect(screen.getByText('Life Milestone')).toBeInTheDocument();
    expect(screen.getByText('Budget Configuration')).toBeInTheDocument();
  });

  it('should save and retrieve all 6 fields', async () => {
    const user = userEvent.setup();
    renderSettings();

    await waitFor(() => {
      expect(screen.getByLabelText('Claude API Key')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Claude API Key'), 'sk-ant-test');
    await user.type(screen.getByLabelText('Birth Date'), '1990-01-15');
    await user.type(screen.getByLabelText('Target Date'), '2040-06-15');
    await user.type(screen.getByLabelText('Target Date Label'), 'Financial Freedom');
    await user.type(screen.getByLabelText('Monthly Budget ($)'), '5000');
    await user.type(screen.getByLabelText('Daily Budget ($)'), '160');

    await user.click(screen.getByText('Save Settings'));

    await waitFor(() => {
      expect(screen.getByText('Settings saved successfully')).toBeInTheDocument();
    });

    // Verify persistence
    const saved = await getSettings();
    expect(saved?.apiKey).toBe('sk-ant-test');
    expect(saved?.birthDate).toBe('1990-01-15');
    expect(saved?.targetDate).toBe('2040-06-15');
    expect(saved?.targetDateLabel).toBe('Financial Freedom');
    expect(saved?.monthlyBudget).toBe(5000);
    expect(saved?.dailyBudget).toBe(160);
  });

  it('should allow partial saves', async () => {
    const user = userEvent.setup();
    renderSettings();

    await waitFor(() => {
      expect(screen.getByLabelText('Monthly Budget ($)')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Monthly Budget ($)'), '3000');
    await user.click(screen.getByText('Save Settings'));

    await waitFor(() => {
      expect(screen.getByText('Settings saved successfully')).toBeInTheDocument();
    });

    const saved = await getSettings();
    expect(saved?.monthlyBudget).toBe(3000);
    expect(saved?.apiKey).toBeUndefined();
  });

  it('should pre-populate form with existing settings', async () => {
    // Pre-seed settings
    await db.settings.put({
      id: 1,
      apiKey: 'existing-key',
      monthlyBudget: 4000,
      dailyBudget: 130,
    });

    renderSettings();

    await waitFor(() => {
      expect(screen.getByLabelText('Claude API Key')).toHaveValue('existing-key');
    });

    expect(screen.getByLabelText('Monthly Budget ($)')).toHaveValue(4000);
    expect(screen.getByLabelText('Daily Budget ($)')).toHaveValue(130);
  });

  it('should mask API key by default', async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByLabelText('Claude API Key')).toBeInTheDocument();
    });

    const apiKeyInput = screen.getByLabelText('Claude API Key');
    expect(apiKeyInput).toHaveAttribute('type', 'password');
  });

  it('should toggle API key visibility', async () => {
    const user = userEvent.setup();
    renderSettings();

    await waitFor(() => {
      expect(screen.getByLabelText('Claude API Key')).toBeInTheDocument();
    });

    const apiKeyInput = screen.getByLabelText('Claude API Key');
    expect(apiKeyInput).toHaveAttribute('type', 'password');

    await user.click(screen.getByText('Show'));
    expect(apiKeyInput).toHaveAttribute('type', 'text');

    await user.click(screen.getByText('Hide'));
    expect(apiKeyInput).toHaveAttribute('type', 'password');
  });

  it('should show save confirmation message', async () => {
    const user = userEvent.setup();
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText('Save Settings')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Save Settings'));

    await waitFor(() => {
      expect(screen.getByText('Settings saved successfully')).toBeInTheDocument();
    });
  });

  it('should prevent future birth dates via max attribute', async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByLabelText('Birth Date')).toBeInTheDocument();
    });

    const birthInput = screen.getByLabelText('Birth Date');
    expect(birthInput).toHaveAttribute('max');
  });

  it('should use number input for budget fields', async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByLabelText('Monthly Budget ($)')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Monthly Budget ($)')).toHaveAttribute('type', 'number');
    expect(screen.getByLabelText('Daily Budget ($)')).toHaveAttribute('type', 'number');
  });
});
```

**Test:** `npx vitest run tests/screens/settings-screen.test.tsx`

**Commit:** `feat: add Settings screen with save/load, API key masking, and validation tests`

---

## Phase 9: PWA Manifest + Service Worker Config

### Task 9.1 — Create PWA manifest

**File: `public/manifest.json`**
```json
{
  "name": "My Life App",
  "short_name": "My Life",
  "description": "Personal life management - budget tracking, goals, health routines, and AI-powered expense entry.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f8fafc",
  "theme_color": "#1e293b",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["finance", "lifestyle", "productivity"]
}
```

---

### Task 9.2 — Create placeholder PWA icons

Generate minimal placeholder icons. These should be replaced with proper icons before deployment, but the app needs something valid to be installable.

**Run:**
```bash
mkdir -p /Users/jeremybrice/Documents/GitHub/my-life-app/public/icons
```

We need to create simple SVG-based PNG placeholders. For now, create a script that generates them, or note that proper icons should be designed.

**File: `public/icons/generate-placeholder.html`**
```html
<!--
  Open this file in a browser to generate placeholder icons.
  Right-click each canvas and "Save Image As" to create:
  - icon-192x192.png
  - icon-512x512.png

  Replace these with proper designed icons before deployment.
-->
<!DOCTYPE html>
<html>
<body>
<h2>192x192</h2>
<canvas id="c192" width="192" height="192"></canvas>
<h2>512x512</h2>
<canvas id="c512" width="512" height="512"></canvas>
<script>
function drawIcon(canvas, size) {
  const ctx = canvas.getContext('2d');
  // Background
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, size, size);
  // Circle
  ctx.beginPath();
  ctx.arc(size/2, size/2, size*0.35, 0, Math.PI*2);
  ctx.fillStyle = '#3b82f6';
  ctx.fill();
  // Text
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${size*0.2}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ML', size/2, size/2);
}
drawIcon(document.getElementById('c192'), 192);
drawIcon(document.getElementById('c512'), 512);
</script>
</body>
</html>
```

> **Note for implementer:** After running the generate-placeholder.html in a browser, save the resulting canvas images as `icon-192x192.png` and `icon-512x512.png` in `public/icons/`. Alternatively, use any 192x192 and 512x512 PNG files. The build will work without real icons but the app won't be installable without them.

**Commit:** `feat: add PWA manifest and placeholder icon generator`

---

## Phase 10: Netlify Config

### Task 10.1 — Create netlify.toml

**File: `netlify.toml`**
```toml
[build]
  command = "npm run build"
  publish = "dist"

# SPA redirect: send all routes to index.html so React Router handles them
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Commit:** `feat: add Netlify config with SPA redirect`

---

## Phase 11: Offline Fallback Page

### Task 11.1 — Create self-contained offline fallback

**File: `public/offline.html`**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Life App - Offline</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #f8fafc;
      color: #334155;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1rem;
    }
    .container {
      text-align: center;
      max-width: 24rem;
    }
    .icon {
      width: 4rem;
      height: 4rem;
      margin: 0 auto 1.5rem;
      color: #94a3b8;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 0.5rem;
    }
    p {
      font-size: 0.875rem;
      line-height: 1.5;
      color: #64748b;
      margin-bottom: 1.5rem;
    }
    button {
      padding: 0.625rem 1.5rem;
      background-color: #3b82f6;
      color: white;
      border: none;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.15s;
    }
    button:hover {
      background-color: #2563eb;
    }
    @media (prefers-color-scheme: dark) {
      body { background-color: #0f172a; color: #cbd5e1; }
      h1 { color: #f1f5f9; }
      p { color: #94a3b8; }
    }
  </style>
</head>
<body>
  <div class="container">
    <svg class="icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
    <h1>You're Offline</h1>
    <p>
      It looks like you've lost your internet connection. Most features of My Life App work offline once loaded. Please check your connection and try again.
    </p>
    <button onclick="window.location.reload()">Retry</button>
  </div>
</body>
</html>
```

**Commit:** `feat: add offline fallback page`

---

## Final Verification

### Task 12.1 — Run full test suite

**Run:**
```bash
npx vitest run
```

All tests should pass:
- `tests/lib/currency.test.ts` — currency utility tests
- `tests/lib/dates.test.ts` — date utility tests
- `tests/data/db.test.ts` — database schema tests
- `tests/data/settings-service.test.ts` — settings CRUD tests
- `tests/screens/navigation.test.tsx` — navigation integration tests
- `tests/screens/settings-screen.test.tsx` — settings screen component tests

---

### Task 12.2 — Verify dev server starts

**Run:**
```bash
npx vite --open
```

**Manual checks:**
1. App loads at localhost, shows "Dashboard" screen
2. All 6 nav items visible in bottom tabs
3. Clicking each tab navigates to the correct screen
4. Settings screen: fill in all 6 fields, click Save, see confirmation
5. Navigate away and back to Settings -- fields are populated
6. API key is masked by default, Show/Hide toggle works
7. Resize to desktop width: sidebar appears, bottom tabs hide

---

### Task 12.3 — Verify build succeeds

**Run:**
```bash
npx vite build
```

**Expected:** Build completes with no errors, outputs to `dist/` directory.

**Commit:** `feat: complete Stage 1 PWA foundation with all tests passing`

---

## File Inventory

After completing all tasks, the following files should exist:

```
my-life-app/
├── public/
│   ├── manifest.json
│   ├── offline.html
│   └── icons/
│       └── generate-placeholder.html
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── vite-env.d.ts
│   ├── components/
│   │   ├── AppShell.tsx
│   │   ├── BottomNav.tsx
│   │   ├── Sidebar.tsx
│   │   ├── NavIcon.tsx
│   │   ├── EmptyState.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── ErrorState.tsx
│   │   └── ConfirmDialog.tsx
│   ├── screens/
│   │   ├── dashboard/
│   │   │   └── DashboardScreen.tsx
│   │   ├── budget/
│   │   │   └── BudgetScreen.tsx
│   │   ├── goals/
│   │   │   └── GoalsScreen.tsx
│   │   ├── health/
│   │   │   └── HealthScreen.tsx
│   │   ├── agent/
│   │   │   └── AgentScreen.tsx
│   │   └── settings/
│   │       └── SettingsScreen.tsx
│   ├── data/
│   │   ├── db.ts
│   │   └── settings-service.ts
│   ├── hooks/
│   │   └── useSettings.ts
│   └── lib/
│       ├── constants.ts
│       ├── currency.ts
│       ├── dates.ts
│       └── types.ts
├── tests/
│   ├── setup.ts
│   ├── lib/
│   │   ├── currency.test.ts
│   │   └── dates.test.ts
│   ├── data/
│   │   ├── db.test.ts
│   │   └── settings-service.test.ts
│   └── screens/
│       ├── navigation.test.tsx
│       └── settings-screen.test.tsx
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── eslint.config.js
├── netlify.toml
└── package.json
```

## Commit Log (expected)

```
feat: initialize project with Vite + React + TypeScript dependencies
feat: add project config files (TypeScript, Vite, ESLint, test setup)
feat: add Tailwind CSS setup with custom theme tokens
feat: add shared lib utilities (types, constants, currency, dates) with tests
feat: add Dexie IndexedDB schema with all 6 object stores and tests
feat: add settings data service with CRUD operations and tests
feat: add shared UI components (AppShell, BottomNav, Sidebar, EmptyState, LoadingSpinner, ErrorState, ConfirmDialog)
feat: add React Router with 6 routes, placeholder screens, and navigation tests
feat: add Settings screen with save/load, API key masking, and validation tests
feat: add PWA manifest and placeholder icon generator
feat: add Netlify config with SPA redirect
feat: add offline fallback page
feat: complete Stage 1 PWA foundation with all tests passing
```
