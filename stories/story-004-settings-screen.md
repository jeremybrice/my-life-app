---
title: "Settings Screen"
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

The Settings screen is the configuration hub. Every module depends on values set here. This is critical path; the data contract here becomes the source of truth for the rest of the app.

## Feature Requirements / Functional Behavior

### UI Behavior

- Accessible via Settings nav.
- Form with sections:
  - **AI Config:** API key, masked with reveal toggle.
  - **Life Milestone:** Birth date picker, target date picker, target date label text.
  - **Budget Config:** Monthly amount currency, daily amount currency.
- Save button persists to IndexedDB with visual confirmation.
- Pre-populated on open.
- Currency fields numeric only with 2 decimals.
- Birth date prevents future dates.

### Business Rules

- API key stored locally only, never transmitted from this screen.
- Target date label is freeform.
- Monthly and daily amounts are independent.
- All settings optional; partial save OK.
- Single-instance settings.

## Acceptance Tests

### Test 1: Save and Retrieve

**Steps:** Enter all 6 fields, Save, navigate away, return.

**Expected:** All values populated.

### Test 2: Partial Save

**Steps:** Enter only birth date and monthly budget, Save, reopen app, check Settings.

**Expected:** Those fields populated, others empty, no error.

### Test 3: API Key Masking

**Steps:** Enter API key.

**Expected:** Obscured by default, toggle reveals/hides.

### Test 4: Save Confirmation

**Steps:** Modify field, Save.

**Expected:** Visible confirmation message.

### Test 5: Currency Validation

**Steps:** Enter letters in monthly budget.

**Expected:** Rejected or stripped.

### Test 6: Date Validation

**Steps:** Set birth date to future.

**Expected:** Prevented or error shown.

## Implementation Context

- Depends on IndexedDB Schema story.
- API key field needs clipboard paste support.

