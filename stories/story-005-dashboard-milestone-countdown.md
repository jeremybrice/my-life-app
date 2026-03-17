---
title: "Dashboard Milestone Countdown"
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

The milestone countdown is the central motivational element. It answers how many days remain between now and a target date, framed in the context of the user's life. It should command the top of the dashboard and feel meaningful.

## Feature Requirements / Functional Behavior

### UI Behavior

- Occupies most prominent position above all cards.
- Large, emphasized days remaining number.
- Target date label displayed alongside.
- Total span birth-to-target communicated visually (progress indicator).
- If no dates configured, instructional message directing to Settings.
- If only one date configured, message that both needed.
- Updates daily.

### Business Rules

- Days remaining = calendar days today to target, inclusive.
- If target in past, show milestone reached with days ago (no negative).
- Birth date for context/progress only; countdown is today-to-target.
- Recalculates on foreground (visibility change).
- No label configured = display countdown without label, not blank.

## Acceptance Tests

### Test 1: Configured Display

**Steps:** Set birth 1985-06-15, target 2035-06-15, label "Age 50", go to Dashboard.

**Expected:** Correct days remaining, "Age 50" visible, progress indicator.

### Test 2: Unconfigured

**Steps:** Clear settings, go to Dashboard.

**Expected:** Instructional message, no errors.

### Test 3: Target in Past

**Steps:** Set target to 2020-01-01.

**Expected:** Shows milestone reached, days ago, no negative.

### Test 4: Daily Update

**Steps:** Note count today, return next day.

**Expected:** Decreased by one.

### Test 5: Missing Label

**Steps:** Set dates but leave label empty.

**Expected:** Countdown shows correctly without label, no blank space.

## Implementation Context

- Depends on Settings Screen story.
- Use visibility change events for foreground recalculation.
- Implement single countdown; multiple countdowns may come later.

