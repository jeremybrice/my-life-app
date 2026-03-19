# Mission Brief

**Playbook:** feature-build
**Design Doc:** docs/plans/stage-1-pwa-foundation.md
**Supplementary:** docs/plans/global-conventions.md
**Created:** 2026-03-18

## Requirements Summary

1. Scaffold a Vite + React + TypeScript project with all dependencies (Dexie.js, React Router, Tailwind CSS, vite-plugin-pwa, Vitest)
2. Create the full IndexedDB schema via Dexie.js with 6 object stores: settings, budgetMonths, expenses, goals, healthRoutines, healthLogEntries
3. Build shared lib utilities: TypeScript interfaces (types.ts), constants (constants.ts), currency formatting with 2-decimal precision (currency.ts), date helpers (dates.ts)
4. Build shared UI components: AppShell, BottomNav, Sidebar, EmptyState, LoadingSpinner, ErrorState, ConfirmDialog
5. Implement React Router with 6 routes (/, /budget, /goals, /health, /agent, /settings) and placeholder screens for unbuilt features
6. Build a Settings screen with API key (masked with toggle), birth date (no future dates), target date + label, monthly/daily budget amounts — persisted via IndexedDB settings service
7. Configure PWA manifest (standalone display, icons, theme colors) and Workbox service worker (cache-first for static assets)
8. Create netlify.toml with SPA redirect rule
9. Create self-contained offline fallback page
10. Export both `saveSettings` and `updateSettings` (alias) from settings-service
11. Create `useOnlineStatus` hook for network connectivity detection

## Key Files

This is a greenfield project. All files will be created new. The project structure is defined in `docs/plans/global-conventions.md` and must be followed exactly:

- `src/data/db.ts` — Dexie database instance + schema (all 6 stores)
- `src/data/settings-service.ts` — Settings CRUD (framework-agnostic async functions)
- `src/lib/types.ts` — All shared TypeScript interfaces
- `src/lib/constants.ts` — Shared constants
- `src/lib/currency.ts` — Currency formatting + 2-decimal math
- `src/lib/dates.ts` — Date helpers
- `src/components/` — Shared UI components (AppShell, BottomNav, etc.)
- `src/screens/` — One directory per screen
- `src/hooks/useSettings.ts` — React hook wrapping settings-service
- `src/hooks/useOnlineStatus.ts` — Network connectivity hook
- `src/App.tsx` — Router + layout shell
- `src/main.tsx` — Entry point

## Test Command

```
npx vitest run
```

## Developer Callouts

- **MUST conform to `docs/plans/global-conventions.md`** — file naming (kebab-case), component naming (PascalCase), function naming (camelCase), database schema, service patterns
- **Data services are framework-agnostic.** They import Dexie and export pure async functions. They do NOT import React.
- **All monetary math uses `roundCurrency()`.** No raw floating-point arithmetic.
- **Dexie's `useLiveQuery` from `dexie-react-hooks` for reactive data** in hooks
- **No global state library.** Dexie + React hooks is the state management approach.
- **The Settings service exports both `saveSettings` and `updateSettings`** (alias) for cross-stage compatibility
- **IndexedDB schema must include ALL stores upfront** — even those not populated until later stages
- **Use `fake-indexeddb` for tests** — real Dexie behavior, no mocking

## Success Criteria

- App is installable from a modern browser (Chrome, Safari, Firefox, Edge) and launches in standalone window
- All 6 routes navigate correctly with placeholder screens for unbuilt features
- Settings screen saves and retrieves all 6 fields across app sessions via IndexedDB
- IndexedDB database `myLifeAppDB` exists with all 6 object stores, version 1, correct indexes
- Service worker caches static assets; app shell loads from cache when offline
- All tests pass with `npx vitest run`
- TypeScript compiles without errors in strict mode
- Project structure matches global-conventions.md exactly
