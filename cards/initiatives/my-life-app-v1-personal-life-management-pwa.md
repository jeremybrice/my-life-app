---
title: 'My Life App v1: Personal Life Management PWA'
type: initiative
status: Draft
product: My Life App
module: null
client: null
team: null
confidence: Medium
estimate_hours: null
jira_card: null
source_intake: null
children:
- pwa-shell-dashboard-settings
- budget-module
- goals-health-routines
- ai-agent-integration
- notifications-importexport-polish
description: Greenfield Progressive Web App consolidating daily budgeting, goal tracking,
  health routines, and milestone countdowns into a unified personal life management
  tool. The application runs entirely on the users device with local data persistence,
  incorporates a proven budget tracker as prior art, and features an AI agent interface
  powered by the Claude API for multimodal conversational data entry.
source_conversation: null
created: 2026-03-17
updated: '2026-03-17'
---

## Background

Personal life management today is fragmented. The founder currently tracks finances, goals, health routines, and life milestones across disconnected tools and mental models. No unified view exists to connect daily spending discipline with longer-term personal objectives. The result is inconsistent tracking, lost context switching between tools, and no single source of truth for personal progress.

There is meaningful prior art to build on. The Daily Budget Tracker, a standalone application already built and used by the founder, validates the core budgeting concept. It provides a proven UX pattern: monthly budgets divided into daily amounts, color-coded balances, carry-over logic, and expense categorization. This existing reference significantly de-risks the largest functional module and provides a working blueprint for data modeling and interaction design.

The opportunity is to evolve from a single-purpose budget tool into a comprehensive personal management platform. By consolidating budgeting, goals, health routines, and milestone tracking into one locally installed PWA, the user gains a daily operating system for personal life. The addition of an AI agent powered by the Claude API introduces a conversational data entry channel that reduces friction; the user can snap a photo of a receipt or type a natural language instruction rather than filling out manual forms.

## Proposed Solution

My Life App v1 will be a Progressive Web App installable from any modern browser on any operating system. It consists of six primary screens: a main dashboard with a configurable life milestone countdown and aggregated status cards, a full-featured budget tracker ported from the Daily Budget Tracker, a flexible goals management screen, a health routines tracker, an AI agent chat interface, and a settings screen. All data persists locally using IndexedDB. There is no authentication, no cloud sync, and no server-side storage in v1. This is a single-user, local-first application.

The budget module carries over the full feature set of the existing Daily Budget Tracker: monthly budgets divided into daily allowances, color-coded balance indicators, carry-over between months, additional funds handling, and detailed expense entry with category and vendor tracking. The goals and health routines modules are new capabilities that aggregate status to the main dashboard, giving the user a single view of financial, personal, and health progress.

The AI agent screen connects to the Claude API to provide multimodal conversational data entry. The user can type natural language instructions ("I spent $12.50 at Starbucks today") or upload receipt images for automatic extraction and entry. Images are transient; they are sent to the Claude API for processing and not stored locally. This agent layer is a convenience channel that writes to the same data stores as the manual forms. Push and badge notifications keep the user engaged with budget thresholds and approaching milestones. An import/export capability provides data backup and portability.

## Affected Systems

- **Browser PWA Runtime**: Service workers, web app manifest, and IndexedDB for local data persistence and offline capability of non-AI features.
- **Claude API (Anthropic)**: Third-party API integration for the AI agent chat interface including multimodal image processing for receipt scanning.
- **Push Notification API**: Browser-based push notifications and badge support for budget alerts and milestone reminders.
- **Local Device Storage (IndexedDB)**: Primary persistence layer for all application data including budgets, goals, health routines, and settings.
- **Static Hosting Service**: Required for initial PWA installation and service worker registration. The app runs locally after install, but a host is needed for the install entry point.

## Potential Requirements

- **PWA Foundation and Installation Flow**: Implement a fully compliant Progressive Web App with service worker registration, web app manifest, and offline support for all non-API features. The app must install cleanly from any modern browser and function as a standalone window after installation.
- **Dashboard with Milestone Countdown and Status Aggregation**: Build a main dashboard screen featuring a configurable countdown (calculated from birth date to target date), a daily budget summary card, a monthly budget performance card, and aggregated goal and health routine status indicators. The countdown is the central motivational element and should be visually prominent.
- **Budget Module with Full Daily Budget Tracker Parity**: Port the complete Daily Budget Tracker functionality into an integrated module. This includes monthly budget divided into daily amounts, color-coded balance display (green/red), carry-over logic between months, additional funds support, expense entry with date, category, vendor (20 character limit), amount, and description fields, a month selector for historical viewing, category and vendor summary reports, and monthly chaining where each month's leftover becomes the next month's starting balance.
- **Goals and Health Routines Modules with Dashboard Aggregation**: Create a flexible goals screen supporting arbitrary goal types (financial, personal, strategic) with status tracking that rolls up to the dashboard. Build a health routines screen for exercise tracking and health goal management. Both modules must aggregate their status to the main dashboard view.
- **AI Agent Chat Interface with Multimodal Support**: Integrate the Claude API to provide a conversational data entry interface. Support text-based natural language instructions and image uploads (receipt scanning). The agent must write to the same data stores as the manual entry forms. Images are processed transiently and not stored. The app must degrade gracefully when the API is unreachable.
- **Settings, Import/Export, and Notifications**: Build a settings screen for API key storage (local only), birth date, target dates, and budget configuration. Implement import/export for full data backup. Implement push notifications and badge notifications for budget thresholds and milestone alerts.

## ROM Estimation

**Confidence**: Medium. The budget module has strong prior art which reduces uncertainty for the largest single module. However, the goals and health routines modules have unresolved data model questions, and the AI agent integration scope is not yet fully defined.

**Estimated Effort**: 4 to 6 two-week sprints for a single developer (320 to 440 hours, approximately 8 to 11 developer-weeks).

| Epic | Sprints | Hours |
|------|---------|-------|
| 1. PWA Shell, Dashboard & Settings | Sprint 1 | 60–80 |
| 2. Budget Module | Sprints 1–2 | 80–100 |
| 3. Goals & Health Routines | Sprint 3 | 60–80 |
| 4. AI Agent Integration | Sprints 3–4 | 80–120 |
| 5. Notifications, Import/Export & Polish | Sprints 5–6 | 40–60 |

## Additional Considerations

The Claude API integration introduces a hard network dependency for the AI agent screen. The application must clearly communicate when the agent is unavailable due to connectivity and ensure all other features function fully offline. This graceful degradation pattern should be established early in the PWA foundation work.

PWA notification support is inconsistent across platforms, particularly on iOS Safari. The notification implementation should be designed as an enhancement rather than a critical path feature. The team should plan for browser capability detection and provide alternative in-app notification patterns where push support is limited.

The API key is stored in local browser storage. This is acceptable for v1's single-user local model but would require a fundamentally different approach if multi-user or cloud features are ever introduced. This constraint should be documented as a known architectural boundary for v1.

The budget module translation from standalone app to integrated module is the highest-fidelity requirement in the build. The data model must support both standalone budget operations and dashboard aggregation. Careful attention to the data model design will prevent rework when connecting budget data to the dashboard cards and to the AI agent's write path.

Receipt image handling involves sending potentially sensitive financial images to Anthropic's API servers. While images are transient and not stored locally or by the API beyond processing, this data flow should be transparent to the user. A brief disclosure in the AI agent screen or settings is recommended.

## Out of Scope

- User authentication or multi-user support of any kind
- Cloud synchronization or server-side data storage
- Native app store distribution (PWA only)
- Offline AI agent functionality (Claude API requires network)
- Automated integrations with banks or financial institutions
- Social, sharing, or collaborative features
- Advanced analytics or ML-based predictions beyond conversational Claude agent responses

## Open Questions

1. What attributes define a goal? The goals module needs a clear data model. Options include target dates, numeric targets, percentage completion, freeform status, or a combination.
2. Are health routines recurring schedules (e.g., "run 3x per week") or one-off log entries? Should the system track quantitative metrics such as duration, reps, weight, or distance?
3. How should goals and health routines summarize on the dashboard? Options include simple active/completed counts, streak counters, color-coded status indicators, or progress bars.
4. What export format should be used? CSV (like the prior app) or JSON for the richer data model?
5. Can the user configure multiple milestone countdowns, or is the dashboard limited to one primary countdown?
6. How is the very first budget month initialized? Starting balance or zero?
7. What notification thresholds should trigger alerts?
8. Beyond expense entry, should the AI agent in v1 handle goals, health routines, or settings?

