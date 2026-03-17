---
title: "PWA Shell, Dashboard & Settings"
type: epic
status: Planning
product: My Life App
module: Core Infrastructure
client: null
team: null
jira_card: null
parent: null
children:
  []
description: "Foundational PWA infrastructure including service worker, manifest, IndexedDB schema design, main dashboard with configurable milestone countdown, daily budget and monthly performance summary cards, and a settings screen for API key, birth date, target dates, and budget configuration."
source_intake: null
source_conversation: null
created: 2026-03-17
updated: 2026-03-17
---

## Background/Context

This Epic establishes the technical and visual foundation for the entire My Life App. Without a functioning PWA shell, offline capability, data persistence layer, and core navigation, no other module can be built or integrated. This is the Sprint 1 priority and the critical path for all subsequent Epics.

The parent Initiative ("My Life App v1: Personal Life Management PWA") envisions a locally installed Progressive Web App consolidating budgeting, goals, health routines, and milestone countdowns into a single personal management tool. This Epic delivers the installation experience, the main dashboard that serves as the user's daily landing page, and the settings screen that configures the entire application. The dashboard's milestone countdown is the central motivational element of the app; it should be visually prominent and immediately communicate progress toward the user's target date.

## Epic Scope

This Epic covers three distinct deliverables. First, the PWA shell: a fully compliant Progressive Web App with service worker registration, web app manifest, offline caching strategy, and installable experience from any modern browser. The service worker must cache all application assets for offline use of non-API features. Second, the main dashboard screen featuring a configurable countdown calculated from birth date to target date, placeholder cards for daily budget summary and monthly performance (to be wired to live data in Epic 2), and aggregation slots for goals and health routine status (to be wired in Epic 3). Third, a settings screen where the user configures their Claude API key (stored locally), birth date, target date, and budget parameters.

The IndexedDB schema design is part of this Epic's scope. The schema must accommodate budgets, expenses, goals, health routines, and settings from the start, even though not all stores will be populated until later Epics. Designing the full schema upfront prevents rework when subsequent modules need to write and read data.

## Affected Systems

- Browser PWA Runtime (service workers, web app manifest, offline caching)
- Local Device Storage (IndexedDB schema design and initialization)
- Static Hosting Service (initial PWA installation entry point and service worker registration)

## Functional Capabilities

- **PWA Installation Flow**: The user navigates to the hosted URL and installs the app to their device. After installation, the app launches in a standalone window and functions offline for all non-API features. The service worker caches all static assets and handles offline fallback gracefully.

- **Milestone Countdown Display**: The dashboard displays a visually prominent countdown showing days remaining from the user's birth date to their configured target date. The countdown recalculates daily. The target date label is user-configurable (e.g., "Retirement," "Age 50," or any personal milestone). This is the first thing the user sees when opening the app.

- **Dashboard Summary Cards (Shell)**: The dashboard renders card components for daily budget summary and monthly performance. In this Epic, these cards display placeholder or zero-state content. They expose the data-binding interface that Epic 2 (Budget Module) will connect to live budget data.

- **Dashboard Aggregation Slots**: The dashboard includes designated areas for goals status and health routine status. These render empty or instructional states until Epic 3 wires them to live data.

- **Settings Screen**: A settings screen allows the user to enter and persist their Claude API key, birth date, target date and its label, and budget configuration parameters (monthly amount, default daily amount). All settings persist in IndexedDB. The API key is stored in local storage only and is never transmitted except when making Claude API calls in Epic 4.

- **IndexedDB Schema Initialization**: On first launch, the app creates the full IndexedDB schema including object stores for settings, budget months, expenses, goals, and health routines. Schema versioning supports future migrations.

- **App Navigation**: A persistent navigation structure (bottom tabs or sidebar) provides access to all primary screens: Dashboard, Budget, Goals, Health, AI Agent, and Settings. Screens not yet implemented display a placeholder state.

## Suggested Story Breakdown

1. PWA Manifest and Service Worker Setup
2. IndexedDB Schema Design and Initialization
3. App Shell and Navigation Structure
4. Settings Screen
5. Dashboard Milestone Countdown
6. Dashboard Budget Summary Cards (Shell)
7. Dashboard Aggregation Slots for Goals and Health
8. Offline Capability Verification

## Success Criteria

- The app is installable from a modern browser (Chrome, Safari, Firefox, Edge) on desktop and mobile. After installation, it launches in a standalone window without browser chrome.
- The app functions fully offline after initial installation for all non-API screens.
- The dashboard displays a correct, daily-updating countdown from the configured birth date to the configured target date.
- The settings screen persists and retrieves all configuration values across app sessions using IndexedDB.
- The IndexedDB schema is created on first launch with all required object stores, and schema versioning is in place.
- Navigation allows access to all six primary screen locations, with placeholder content for screens not yet implemented.

## Dependencies

- No upstream Epic dependencies. This is the foundation.
- Epic 2 (Budget Module) depends on IndexedDB schema, settings screen, and dashboard card interfaces.
- Epic 3 (Goals & Health Routines) depends on dashboard aggregation slots and IndexedDB object stores.
- Epic 4 (AI Agent Integration) depends on API key in settings and IndexedDB write interfaces.
- Epic 5 (Notifications, Import/Export & Polish) depends on service worker and full IndexedDB schema.

## Open Questions

- Should the user be able to configure multiple milestone countdowns, or is the dashboard limited to one primary countdown?
- What is the visual layout priority order for dashboard cards?





