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
