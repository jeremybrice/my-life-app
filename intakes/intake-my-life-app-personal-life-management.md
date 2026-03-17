---
title: My Life App - Personal Life Management
type: intake
status: Submitted
product: My Life App
module: null
client: null
team: null
source: Founder/Owner direct request
requested_by: Jeremy Brice
priority: High
generated_initiatives: []
generated_epics: []
source_conversation: null
created: 2026-03-17
updated: '2026-03-17'
children:
- my-life-app-v1-personal-life-management-pwa.md
---

## Intake Summary

My Life App is a greenfield Progressive Web App for personal life management. It consolidates daily budgeting, goal tracking, health routines, and milestone countdowns into a single locally-installed application. The user has a proven prior art reference in the Daily Budget Tracker, which serves as the functional blueprint for the budgeting module. The app is designed for single user, fully local operation with no authentication required. A distinguishing capability is an embedded AI agent interface powered by the Claude API that supports multimodal conversational data entry, including image processing for receipts. Images are transient and used only for data extraction, not stored long-term. The strategic intent is to replace fragmented personal tracking tools with one cohesive PWA that the user installs from a browser and runs entirely on their device.

## Problem Statement

The user currently manages personal finances, goals, health routines, and life milestones across separate tools or mental tracking. There is no unified view that connects daily spending discipline to longer-term life objectives. The existing Daily Budget Tracker app proves the budgeting concept works but lives in isolation, disconnected from the broader personal management workflow the user needs.

## Proposed Solution

Build a Progressive Web App with six primary screens: a main dashboard with a milestone countdown and aggregated status cards, a full-featured budget tracker adapted from the existing Daily Budget Tracker, a flexible goals management screen, a health routines tracker, an AI agent chat interface for conversational data entry, and a settings screen for configuration. All data persists locally with import/export for backup. The Claude API integration enables multimodal chat-based data entry as an alternative to manual forms. Receipt images are processed transiently and not stored.

## In Scope

- PWA shell and installation flow, compatible with any OS via browser installation
- Main Dashboard screen with configurable countdown to a target date (calculated from birth date and target date), daily budget summary card, monthly performance card, and aggregated goal status
- Budget Screen incorporating all Daily Budget Tracker functionality: monthly budget divided into daily amounts, current balance with green/red color coding, carry over from previous months, additional funds support (bonuses, gifts), expense entry with date, category, vendor (20 character limit), amount, and description, month selector for historical viewing, summary reports by category and vendor, and monthly chaining where each month's leftover becomes the next month's starting balance
- Goals Screen supporting arbitrary goal types (financial, strategic, personal) with status tracking that aggregates to the dashboard
- Health Routines Screen for exercise tracking and health goal management
- AI Agent Screen with Claude API chat interface, multimodal image support for receipt scanning, and conversational data entry that writes to app data stores
- Settings Screen for Claude API key storage (locally persisted), birth date entry, target date configuration, and budget setup parameters
- Local storage persistence for all data in v1
- Import/export capability for data backup
- Push notifications for approaching milestones and budget status alerts
- Badge notifications for key events

## Out of Scope

- User authentication or multi-user support
- Cloud sync or server-side data storage
- Native app store distribution (PWA only)
- Offline AI agent functionality (requires network for Claude API calls)
- Automated bank or financial institution integrations
- Social or sharing features
- Advanced analytics or ML-based predictions beyond what the Claude agent provides conversationally

## Affected Systems

- Browser PWA runtime (service workers, web app manifest, IndexedDB)
- Claude API (Anthropic) for the AI agent chat interface and multimodal image processing
- Push Notification API (browser-based push and badge support)
- Local device storage (IndexedDB for all persistent data)

## User Impact

This is a single-user personal tool. The user gains a unified dashboard for life management that replaces multiple disconnected tracking methods. Daily financial discipline is reinforced through the proven daily budget model from the prior app. The AI agent reduces friction for data entry by allowing the user to snap a photo of a receipt or type naturally instead of filling forms. Push and badge notifications keep the user engaged with approaching milestones and budget thresholds without requiring them to open the app.

## Estimated Scope

Medium to large effort for a single developer. The app has six distinct screens, a well-defined data model (budgets, goals, health routines, milestones), and a third-party API integration. The budget module has strong prior art which reduces design risk. Recommended approach is 5 epics spanning approximately 4 to 6 sprints.

### Suggested Epic Breakdown

1. PWA Shell, Dashboard, and Settings (foundational infrastructure)
2. Budget Module (porting and adapting Daily Budget Tracker)
3. Goals and Health Routines Modules
4. AI Agent Integration (Claude API, multimodal chat, data entry bridging)
5. Notifications, Import/Export, and Polish

## Risks and Dependencies

- **Claude API dependency**: The AI agent screen requires a valid Claude API key and network connectivity. The app must degrade gracefully when the API is unreachable, clearly indicating that agent features are unavailable offline.
- **PWA notification support**: Push notification and badge support varies significantly across browsers and operating systems. iOS Safari has limited PWA notification support that may constrain the notification experience on iPhones.
- **Receipt images leave device**: Multimodal image handling through the Claude API requires sending images to Anthropic's servers. Images are transient and not stored locally after processing.
- **No authentication**: Because there is no authentication, anyone with physical or remote access to the device can view all personal financial and health data. Accepted for v1.
- **Budget module fidelity**: The Daily Budget Tracker reference document provides a solid blueprint, but translating from an existing standalone app into a module within a larger app will require careful data model integration so budget data can surface properly on the main dashboard.

## Interview Notes

- The user has direct experience building and using the Daily Budget Tracker, which validates the budgeting UX patterns. This prior art significantly de-risks the budget module.
- The countdown feature on the main dashboard is a central motivational element. The user enters a birth date and a target date, and the app displays days remaining alongside what the target represents (e.g., retirement, a milestone age). This should be visually prominent.
- "Any type of goal" was emphasized for the Goals screen. The data model should be flexible enough to accommodate financial targets, personal milestones, strategic objectives, and anything else without being overly prescriptive about goal categories.
- The AI agent is intended as a convenience layer, not a replacement for manual entry. Both paths (forms and chat) should write to the same underlying data stores. The agent should be able to handle natural language like "I spent $12.50 at Starbucks today" and create the corresponding expense entry.
- API key storage in local settings means the key persists in the browser. This is acceptable for single-user local use but would need revisiting if the app ever moved toward multi-user or cloud scenarios.
- The user specified "someone goes to the site, installs it, runs locally" which confirms this is a deploy-once, use-anywhere PWA model. A hosting solution (even a simple static host) is needed for initial installation and service worker registration.

## Open Questions

1. What attributes define a goal? Is there a target date, a numeric target, a percentage completion, or freeform status? How granular should goal progress tracking be?
2. Are health routines recurring schedules (e.g., "run 3x per week") or one-off entries? Should they track metrics like duration, reps, weight, or distance?
3. How should goals and health routines summarize on the dashboard? A simple count of active/completed goals? A streak counter for health routines? Color-coded status indicators?
4. Export format: CSV (like the prior app) or JSON for the richer data model (goals, health, budget combined)?
5. Can the user configure multiple countdowns or milestone targets, or is there strictly one primary countdown on the dashboard?
6. How is the very first budget month initialized? Does the user enter a starting balance?
7. At what points should notifications fire? For budget: when daily spending exceeds the daily amount? When monthly spending hits 80%? For milestones: at 30 days, 7 days, 1 day?
8. Beyond expense entry, should the agent be able to create goals, log health routines, or modify settings in v1?





