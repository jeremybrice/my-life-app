---
title: "Dashboard Budget Summary Cards Shell"
type: story
status: Draft
product: My Life App
module: Core Infrastructure
client: null
team: null
parent: null
story_points: null
jira_card: null
source_conversation: null
created: 2026-03-17
updated: 2026-03-17
---

## Background / Context

Two budget cards on the dashboard: Daily Budget and Monthly Performance. In this Epic, they have no live data. This story creates visual containers and defines data interfaces for Epic 2 to connect.

## Feature Requirements / Functional Behavior

### UI Behavior

- Two cards below countdown: Daily Budget and Monthly Performance.
- Both show zero-state messages indicating budget data not yet available.
- Clear visual structure: card title, primary content area, secondary detail area.
- Visually consistent with each other and dashboard.
- Read-only.

### Business Rules

- Daily Budget card interface: remaining amount, color indicator, spending total.
- Monthly Performance card interface: total budget, total spent, remaining balance, health indicator.
- Zero-state should be informative, not empty.

## Acceptance Tests

### Test 1: Cards Visible

**Steps:** Navigate to Dashboard.

**Expected:** Both cards visible below countdown.

### Test 2: Daily Budget Zero State

**Steps:** Open Dashboard, no budget data.

**Expected:** Meaningful zero-state message.

### Test 3: Monthly Performance Zero State

**Steps:** Same.

**Expected:** Meaningful zero-state message.

### Test 4: Visual Consistency

**Steps:** View all dashboard elements.

**Expected:** Consistent style, proper alignment.

### Test 5: Data Interface

**Steps:** Review component code.

**Expected:** Well-defined data structures for each card.

## Implementation Context

- Primary value is data interface definition for Epic 2.
- Zero-state should feel polished, like onboarding content.

