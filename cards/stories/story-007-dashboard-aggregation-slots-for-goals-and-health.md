---
title: "Dashboard Aggregation Slots for Goals and Health"
type: story
status: Draft
product: My Life App
module: Core Infrastructure
client: null
team: null
parent: pwa-shell-dashboard-settings
story_points: null
jira_card: null
source_conversation: null
created: 2026-03-17
updated: 2026-03-17
---

## Background / Context

Dashboard aggregates status from all modules. This story adds Goals Status and Health Routines Status sections with placeholder content and data interfaces for Epic 3.

## Feature Requirements / Functional Behavior

### UI Behavior

- Two sections below budget cards.
- Goals Status shows placeholder describing what will appear.
- Health Routines Status same.
- Visually distinct but consistent with dashboard.
- Scroll order: countdown, budget cards, goals, health.

### Business Rules

- Goals interface: active count, completed count, optional summary metric.
- Health interface: active routines count, today's completion ratio, optional streak metric.
- Placeholder content forward-looking.
- Sections coexist with budget cards regardless of data state.

## Acceptance Tests

### Test 1: Sections Visible

**Steps:** Navigate and scroll Dashboard.

**Expected:** Both sections visible below budget cards.

### Test 2: Goals Placeholder

**Steps:** Open with no goals.

**Expected:** Descriptive placeholder, no "null" text.

### Test 3: Health Placeholder

**Steps:** Same.

**Expected:** Descriptive placeholder.

### Test 4: Scroll Order

**Steps:** Scroll on mobile.

**Expected:** Countdown, daily budget, monthly performance, goals, health.

### Test 5: Aggregation Interface

**Steps:** Review component code.

**Expected:** Defined data structures for both sections.

## Implementation Context

- Similar to budget cards story.
- Consider how dashboard handles all-placeholder state on first launch.

