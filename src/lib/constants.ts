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
