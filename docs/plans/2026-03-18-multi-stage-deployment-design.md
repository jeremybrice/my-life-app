# My Life App v1 — Multi-Stage Deployment Design

**Date:** 2026-03-18
**Status:** Approved
**Author:** Jeremy Brice + Claude

## Overview

This document defines the 7-stage development plan for My Life App v1, a Progressive Web App for personal life management. Each stage produces a working, testable build. Deployment to Netlify happens after Stage 7 when the app is feature-complete.

### Tech Stack

- **Framework:** React + TypeScript (Vite)
- **Routing:** React Router (6 routes)
- **Data Persistence:** IndexedDB via Dexie.js
- **Service Worker:** Workbox (via vite-plugin-pwa)
- **Styling:** Tailwind CSS
- **AI Integration:** Claude API (Anthropic)
- **Hosting:** Netlify (static site, SPA redirect)

### Project Structure

```
src/
  components/     # shared UI components
  screens/        # one directory per screen
  data/           # Dexie DB definition, data access layer
  hooks/          # React hooks for data access
  services/       # API client, notification service
  App.tsx          # Router + layout shell
  main.tsx         # Entry point
public/
  manifest.json
  icons/
netlify.toml
```

## Open Question Decisions

These decisions were made upfront to unblock IndexedDB schema design in Stage 1.

| # | Question | Decision |
|---|----------|----------|
| 1 | Goal attributes | Title, type (financial/personal/strategic/custom), one of 4 progress models (numeric target, date-based, percentage, freeform status), optional description. No sub-goals in v1. Per stories 020-023. |
| 2 | Health routine structure | Two-entity model: routine definitions (name, weekly frequency, optional metrics) + log entries (date, routine ID, metric values). Both recurring and one-off patterns supported. Per story 024. |
| 3 | Dashboard aggregation | Goals: active/completed counts + average progress % across numeric/percentage goals. Health: routines completed today, weekly on-track/behind, best streak. Per stories 028-029. |
| 4 | Export format | JSON file (or zip with multiple JSON files per data domain). Metadata includes export date, app version, schema version. |
| 5 | Milestone countdowns | Single countdown in v1. One birth date + one target date + one label. Prominent top-of-dashboard position. |
| 6 | First budget month | Carry-over defaults to zero. Create operation accepts optional starting balance. Per story 009. |
| 7 | Notification thresholds | Defaults: daily overspend (enabled), monthly 80%/90%/100% (enabled), milestone 30/7/1 days (enabled). All configurable. Per story 049. |
| 8 | AI agent scope in v1 | Expense entry only (text + receipt images). Architecture allows future extension but v1 keeps it focused on financial records. |

---

## Stage 1: PWA Foundation + Data Layer + Navigation + Settings

**Goal:** Installable PWA shell with persistent settings and all routes wired up.

### Stories

| Story | Title |
|-------|-------|
| 001 | PWA Manifest and Service Worker Setup |
| 002 | IndexedDB Schema Design and Initialization |
| 003 | App Shell and Navigation Structure |
| 004 | Settings Screen |

### Testable Outcomes

- Visit hosted URL (or localhost), install app from browser
- App launches in standalone window without browser chrome
- Bottom tabs (mobile) / sidebar (desktop) navigate between 6 screens
- Dashboard, Budget, Goals, Health, AI Agent show styled placeholders
- Settings screen saves and retrieves: API key (masked), birth date, target date + label, monthly budget, daily budget
- IndexedDB has all 5 object stores created (settings, budgetMonths, expenses, goals, healthRoutines)
- Service worker caches static assets
- Netlify config with SPA redirect rule in place

### Tech Decisions

- Dexie.js for IndexedDB (schema versioning out of the box)
- Workbox via vite-plugin-pwa for service worker
- Tailwind CSS for styling
- Full IndexedDB schema designed upfront (all stores, indexes) even though not all populated until later stages

### Architecture Established

- Data access layer as clean module functions (not tied to React lifecycle)
- Shared component library started (navigation, layout containers)
- React Router with 6 routes, placeholder screens for unbuilt features

---

## Stage 2: Dashboard Live + Offline Verification

**Goal:** Dashboard goes from placeholder to functional. Countdown works, card shells in place, offline verified.

### Stories

| Story | Title |
|-------|-------|
| 005 | Dashboard Milestone Countdown |
| 006 | Dashboard Budget Summary Cards Shell |
| 007 | Dashboard Aggregation Slots for Goals and Health |
| 008 | Offline Capability Verification |

### Testable Outcomes

- Prominent countdown showing days remaining from today to target date with user's label
- Progress indicator showing position between birth date and target date
- If no dates configured, instructional message directing to Settings
- If target date in past, shows "milestone reached" with days ago
- Two budget cards below countdown with zero-state messages
- Goals and Health sections below budget cards with forward-looking placeholder content
- Scroll order: countdown, daily budget card, monthly performance card, goals, health
- Countdown recalculates on foreground (visibility change event)
- Budget cards and aggregation slots define TypeScript data-binding interfaces

### Offline Verification

- Install, load once, go offline — app shell loads from cache
- All 6 screens navigate correctly offline
- Settings save/load works offline
- AI Agent placeholder shows "internet required" message
- No unnecessary offline banners on screens that work fine offline
- Data survives reconnection

---

## Stage 3: Budget Core — Data Layer + Screen + Expense CRUD

**Goal:** Working budget screen with expense entry, viewing, editing, and deletion with live balance.

### Stories

| Story | Title |
|-------|-------|
| 009 | Budget Month Data Model and CRUD Operations |
| 010 | Expense Data Model and CRUD Operations |
| 011 | Budget Screen Layout and Balance Display |
| 012 | Expense Entry Form |
| 013 | Expense Table with Daily Grouping |
| 014 | Expense Edit and Delete |

### Testable Outcomes

- Budget screen replaces placeholder
- Current balance prominent — green (positive/zero), red (negative)
- Balance = (daily allowance x days elapsed incl. today) + carry-over + additional funds - total expenses
- Today's date, daily budget, and today's total spending visible
- No budget month → setup prompt
- Expense entry form: date (default today), category (freeform), vendor (required, 20 char max with counter), amount (required, numeric, > 0), description (optional)
- Balance updates immediately on submit, form clears
- Expense table grouped by date (most recent top), expandable/collapsible date groups
- Each date header: date, daily budget, daily total, running balance
- Tap expense to edit (pre-populated), delete with confirmation
- All recalculations immediate on any data change

### Critical Architecture

- Expense CRUD is a clean importable module function — this is the contract surface for the AI agent in Stage 6
- All monetary values: 2 decimal precision, no floating-point drift
- Vendor > 20 chars rejected at data layer (not silently truncated)
- Balance recalculation on every write operation

---

## Stage 4: Budget Advanced — Carry-Over, Additional Funds, Reports, Dashboard Integration

**Goal:** Full Daily Budget Tracker feature parity. Dashboard budget cards go live.

### Stories

| Story | Title |
|-------|-------|
| 015 | Month Selector and Historical Viewing |
| 016 | Carry-Over and Monthly Chaining Logic |
| 017 | Additional Funds Management |
| 018 | Summary Reports (Category and Vendor Breakdown) |
| 019 | Dashboard Budget Cards Integration |

### Testable Outcomes

- Month selector: current month default, navigate previous/next, all data updates to selected month
- Months with no record show setup prompt, returning to screen resets to current month
- Monthly chaining: new month auto-initializes (copies budget amount, calculates carry-over)
- Carry-over = previous month's ending balance (positive or negative, no floor/ceiling)
- First-ever month = zero carry-over
- Past month expense edits trigger forward propagation of carry-over (immediate, not lazy)
- Additional funds: editable per month, >= 0, defaults to 0, not copied during chaining
- Summary reports: category breakdown, vendor breakdown (both sorted descending), monthly stats (total budget, total spent, net change, avg daily spending)
- Reports scoped to selected month
- Dashboard daily budget card: today's balance (color-coded), daily budget, today's spending
- Dashboard monthly performance card: total budget, total spent, net change
- Both cards refresh on dashboard load, zero state when no budget configured
- Tapping card navigates to budget screen

### Review Checkpoint

After this stage the budget module has full parity with the Daily Budget Tracker. Natural pause point before building new modules.

---

## Stage 5: Goals & Health Routines

**Goal:** Both new modules fully functional with dashboard aggregation live.

### Stories

| Story | Title |
|-------|-------|
| 020 | Goal Data Model and CRUD Operations |
| 021 | Goals Screen Layout and List View |
| 022 | Goal Creation Form |
| 023 | Goal Progress Update and Completion |
| 024 | Health Routine Data Model and CRUD Operations |
| 025 | Health Routines Screen Layout |
| 026 | Health Routine Logging and Metrics Entry |
| 027 | Health Routine Streak Calculation |
| 028 | Dashboard Goals Aggregation Widget |
| 029 | Dashboard Health Routines Aggregation Widget |

### Testable Outcomes — Goals

- Create goals: title, type (financial/personal/strategic/custom), progress model (numeric/date-based/percentage/freeform)
- Form adapts dynamically to selected progress model
- Goals list with progress indicators per model type
- Filter by type and status, default = active across all types
- Progress updates: numeric values, percentages, status labels, target dates
- Lifecycle: active → completed, active → archived, completed → archived, completed → active, archived → active
- Completion prompt at target (no auto-complete)
- Dashboard widget: active count, completed count, aggregate progress %, navigate to goals

### Testable Outcomes — Health Routines

- Define routines: name, weekly frequency target, optional metrics (duration, distance, reps, weight)
- Routines list with adherence indicator ("2 of 3 this week")
- Quick-log action → logging interface with routine pre-selected
- Log entries: date (default today, no future), optional metrics, multiple per day allowed
- Streak: consecutive weeks meeting target, resets on miss, current week counts only if target met
- Back-dated entries recalculate streaks
- Delete routine cascades log entries (with confirmation)
- Dashboard widget: routines completed today, weekly on-track/behind, best streak, navigate to health

### Parallelism Note

Goals (020-023, 028) and Health (024-027, 029) are independent tracks — can be built in parallel by subagents during implementation.

---

## Stage 6: AI Agent Integration

**Goal:** Conversational expense entry via Claude API with text and receipt image support.

### Stories

| Story | Title |
|-------|-------|
| 030 | Chat UI Layout and Message Thread |
| 031 | Claude API Client Integration |
| 032 | Network Connectivity Detection and Graceful Degradation |
| 033 | API Key Validation |
| 034 | Natural Language Expense Parsing |
| 035 | Expense Confirmation and Data Store Write |
| 036 | Image Upload and Receipt Processing |
| 037 | Transient Image Handling and User Disclosure |
| 038 | Conversation Context Management |

### Testable Outcomes

- Chat UI: messaging interface, text input + send + image upload, auto-scroll, welcome message, session-scoped
- API client: reads key from IndexedDB, configurable model, loading indicator, timeout, distinct errors (missing key, 401, 429, timeout)
- Connectivity: offline → unavailable message (rest of app unaffected), restored → chat appears without refresh, mid-conversation disconnect → thread preserved with banner
- API key validation: validated on screen load, missing vs. invalid distinguished, network error defers to connectivity handling
- NL expense parsing: extracts amount/vendor/category/date/description, asks clarifying questions for missing fields, resolves relative dates, truncates long vendor names, redirects non-expense messages
- Confirmation flow: structured card with confirm/cancel inline, "yes" works, edit before confirming, writes through budget CRUD interface (identical data structure to manual form), write failure → fallback message
- Receipt scanning: JPEG/PNG upload → thumbnail → extraction → confirmation format, multi-item receipts show total with split option, non-receipt images handled, missing date defaults to today, text + image together processed contextually
- Transient images: no persistence anywhere (IndexedDB, localStorage, sessionStorage, service worker cache), object URLs revoked, first-upload Anthropic disclosure, thumbnails gone after navigation
- Context management: follow-ups work naturally, full history per API call, context window limit drops oldest, session reset clears everything

### Prompt Engineering

- System prompt instructs Claude to output structured JSON for parsed expense fields
- Response parsing handles both structured JSON and conversational responses
- Receipt extraction prompt targets vendor, amount, date, line items

---

## Stage 7: Notifications, Import/Export, Polish

**Goal:** Release-ready app. Proactive alerts, data backup/restore, cross-browser verified, UX polished.

### Stories

| Story | Title |
|-------|-------|
| 039 | Notification Permission Request Flow |
| 040 | Browser Notification Capability Detection |
| 041 | Budget Threshold Alert Notifications |
| 042 | Milestone Countdown Alert Notifications |
| 043 | Badge Notification Updates |
| 044 | In-App Notification Fallback |
| 045 | Data Export to File |
| 046 | Data Import from File |
| 047 | Cross-Browser Testing and Fixes |
| 048 | UX Polish Pass |
| 049 | Notification Threshold Settings UI |

### Testable Outcomes — Notifications

- Pre-permission in-app prompt (Enable/Not Now/dismiss), never on first session, triggers after meaningful action
- Runtime capability detection for push, badge, persistent notifications
- Budget alerts: daily overspend (once/day), monthly 80%/90%/100% (once each/month), current month only
- Milestone alerts: 30/7/1 days remaining (once each), daily check, motivational tone
- Badge: increments on alerts, clears on relevant screen view, skipped on unsupported platforms
- In-app fallback: dashboard banners when push unavailable, dismissible, navigation indicators, inactive when push granted
- Notification settings UI: master toggle, budget alert config, milestone alert config, auto-save, permission state display

### Testable Outcomes — Import/Export

- Export: JSON file from settings, all IndexedDB stores, metadata (date, app version, schema version), date in filename
- Import: file picker → validate → confirmation warning → replace all data, rejects invalid/incompatible files, cancel preserves data, atomic (no partial corruption)

### Testable Outcomes — Polish

- Cross-browser: Chrome, Safari, Firefox, Edge on desktop + mobile (8 combos), PWA install verified, no console errors
- UX polish: consistent spacing/typography/colors, loading/empty/error states on every screen, transitions < 300ms, respects prefers-reduced-motion
- Design tokens established (CSS custom properties or Tailwind config)

### After Stage 7

The app is feature-complete and deployed to Netlify.

---

## Stage Dependency Map

```
Stage 1 (PWA Shell)
  ↓
Stage 2 (Dashboard + Offline)
  ↓
Stage 3 (Budget Core)
  ↓
Stage 4 (Budget Advanced)
  ↓
Stage 5 (Goals & Health)    ← can partially overlap with Stage 4 completion
  ↓
Stage 6 (AI Agent)          ← depends on Stages 1 + 3 (CRUD interface)
  ↓
Stage 7 (Notifications/Export/Polish) ← depends on all prior stages
```

## Story-to-Stage Mapping

| Stage | Stories |
|-------|--------|
| 1 | 001, 002, 003, 004 |
| 2 | 005, 006, 007, 008 |
| 3 | 009, 010, 011, 012, 013, 014 |
| 4 | 015, 016, 017, 018, 019 |
| 5 | 020, 021, 022, 023, 024, 025, 026, 027, 028, 029 |
| 6 | 030, 031, 032, 033, 034, 035, 036, 037, 038 |
| 7 | 039, 040, 041, 042, 043, 044, 045, 046, 047, 048, 049 |
