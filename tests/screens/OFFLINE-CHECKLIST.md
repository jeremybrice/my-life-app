# Offline Capability Verification Checklist (Story 008)

Run this checklist manually after all automated tests pass.

## Prerequisites
- App built for production: `npm run build`
- Served locally: `npx serve dist` (or deployed to Netlify)
- Tested in Chrome (DevTools available)

## Test 1: Full Offline Launch
- [ ] Open app in browser, wait for service worker to install (check DevTools > Application > Service Workers)
- [ ] Close the tab
- [ ] Enable airplane mode / disable network (DevTools > Network > Offline)
- [ ] Reopen the app URL
- [ ] **Expected:** Dashboard loads with all visual elements correct

## Test 2: Offline Navigation
- [ ] While offline, tap/click each of the 6 navigation items:
  - [ ] Dashboard (`/`) loads correctly
  - [ ] Budget (`/budget`) loads correctly
  - [ ] Goals (`/goals`) loads correctly
  - [ ] Health (`/health`) loads correctly
  - [ ] AI Agent (`/agent`) loads correctly — shows "Internet Required" message
  - [ ] Settings (`/settings`) loads correctly
- [ ] **Expected:** No broken pages, no white screens, no console errors

## Test 3: Offline Settings
- [ ] While offline, navigate to Settings
- [ ] Change a setting value (e.g., target date label)
- [ ] Navigate away to Dashboard
- [ ] Navigate back to Settings
- [ ] **Expected:** Changed value persists

## Test 4: AI Agent Offline Message
- [ ] While offline, navigate to AI Agent screen
- [ ] **Expected:** Clear "Internet Required" message displayed
- [ ] **Expected:** Message states "All other features work offline"

## Test 5: Data Survives Reconnection
- [ ] While offline, save a settings change
- [ ] Re-enable network connection
- [ ] Refresh the page
- [ ] Navigate to Settings
- [ ] **Expected:** Previously saved value is intact

## Test 6: No Unnecessary Warnings
- [ ] While offline, navigate to Dashboard
- [ ] **Expected:** No "offline" banner or warning on Dashboard
- [ ] Navigate to Settings
- [ ] **Expected:** No "offline" banner or warning on Settings
- [ ] Navigate to Budget, Goals, Health
- [ ] **Expected:** No "offline" banners on any of these screens

## Test 7: Service Worker Caching
- [ ] Open DevTools > Application > Cache Storage
- [ ] **Expected:** Static assets (JS, CSS, HTML, icons) are cached
- [ ] **Expected:** manifest.json is cached or available

## Test 8: PWA Install
- [ ] On a mobile device or using Chrome desktop install prompt
- [ ] **Expected:** App can be installed
- [ ] **Expected:** Installed app launches in standalone window (no browser chrome)
- [ ] Disable network
- [ ] **Expected:** Installed app still functions
