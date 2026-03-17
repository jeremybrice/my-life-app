---
title: "PWA Manifest and Service Worker Setup"
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

The My Life App is a Progressive Web App that users install from a browser and run entirely on their device. Before any screens or features can function, the foundational PWA plumbing must be in place. This means a valid web app manifest that tells browsers the app's name, icons, theme, and display preferences, and a service worker that intercepts network requests to serve cached assets. Without these two artifacts, the app cannot be installed to a home screen, cannot launch in a standalone window, and cannot operate offline. This story is the first thing that must land because every other story in this Epic assumes the PWA shell is operational.

## Feature Requirements / Functional Behavior

### UI Behavior

- When the user navigates to the hosted URL in a supported browser, the browser's install prompt becomes available.
- After installation, the app launches in a standalone window without browser chrome.
- If offline, a styled offline fallback page appears.
- The app icon and name appear correctly on the device home screen.

### Business Rules

- Manifest must declare standalone display mode.
- Theme and background colors consistent with app identity.
- Icons at 192x192 and 512x512 minimum.
- Service worker uses cache-first strategy for static assets.
- Network-dependent requests not cached.
- Service worker activates immediately and claims all clients.

## Acceptance Tests

### Test 1: Installability on Desktop Chrome

**Steps:** Open app URL in Chrome. Wait for load. Check for install icon.

**Expected:** Install option available, installs correctly, launches standalone.

### Test 2: Installability on Mobile Safari

**Steps:** Open URL in Safari iOS. Share > Add to Home Screen.

**Expected:** Added with correct icon and name, launches standalone.

### Test 3: Offline Fallback

**Steps:** Install, open with network, go offline, reopen.

**Expected:** App shell loads from cache, uncached routes show styled fallback.

### Test 4: Static Asset Caching

**Steps:** Install, open, check DevTools Cache Storage, go offline, reload.

**Expected:** All static assets cached, loads fully from cache.

### Test 5: Manifest Validation

**Steps:** Open URL, check DevTools Application > Manifest.

**Expected:** No errors, includes name, short name, start URL, standalone, theme/background colors, icons.

## Implementation Context

- Consider cache invalidation strategy for service worker updates.
- Offline fallback should be self-contained HTML.
- iOS Safari PWA quirks require `apple-mobile-web-app-capable` and `apple-touch-icon` meta tags.

