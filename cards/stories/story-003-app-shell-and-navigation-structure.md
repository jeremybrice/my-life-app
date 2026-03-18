---
title: "App Shell and Navigation Structure"
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

The My Life App has six primary screens. This story creates the navigation skeleton and app shell layout. It is the structural spine that every other story attaches content to.

## Feature Requirements / Functional Behavior

### UI Behavior

- Persistent navigation (bottom tabs mobile, sidebar/top on wider viewports) visible on every screen.
- Six items: Dashboard, Budget, Goals, Health, AI Agent, Settings with icons and labels.
- Active item highlighted.
- Dashboard is default landing.
- Unimplemented screens show placeholder.
- Instant transitions.

### Business Rules

- All six destinations present from day one.
- Consistent layout across screens.
- Navigation order reflects usage priority.
- All items accessible without scrolling on small screens.

## Acceptance Tests

### Test 1: Default Landing

**Steps:** Launch app.

**Expected:** Dashboard loads, Dashboard nav highlighted.

### Test 2: Navigation to All

**Steps:** Tap each of 6 items.

**Expected:** Each loads, active item updates, no errors.

### Test 3: Placeholder Content

**Steps:** Navigate to Budget (not yet implemented).

**Expected:** Styled placeholder with feature name.

### Test 4: Responsive

**Steps:** Open on 375px then 1200px viewport.

**Expected:** Navigation adapts, all items accessible both sizes.

### Test 5: Persistence

**Steps:** Navigate to Settings, refresh.

**Expected:** Navigation immediately visible.

## Implementation Context

- Bottom tabs standard for mobile-first PWAs.
- Placeholder screens should be proper routes.
- Consider client-side routing approach.

