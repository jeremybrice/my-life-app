# Cross-Browser Testing Checklist

## Target Browsers
- Chrome Desktop
- Chrome Mobile (Android)
- Safari Desktop (macOS)
- Safari Mobile (iOS)
- Firefox Desktop
- Firefox Mobile (Android)
- Edge Desktop
- Edge Mobile

## Test Matrix

### Per Browser — General
- [ ] App loads without console errors
- [ ] All 6 screens navigate correctly
- [ ] Bottom navigation renders and functions
- [ ] Forms accept input and submit correctly

### Per Browser — Dashboard
- [ ] Milestone countdown displays and updates
- [ ] Budget summary cards render with correct values
- [ ] Goals and health widgets display correctly
- [ ] Notification banners appear/dismiss (when push unavailable)

### Per Browser — Budget
- [ ] Expense entry form works (all fields)
- [ ] Expense table renders with date grouping
- [ ] Balance calculation is correct
- [ ] Month selector navigates between months
- [ ] Edit and delete expense functions

### Per Browser — Goals
- [ ] Goal creation form (all 4 progress models)
- [ ] Goal list with filtering
- [ ] Progress updates work
- [ ] Status transitions (active/completed/archived)

### Per Browser — Health
- [ ] Routine creation with metrics
- [ ] Quick-log functionality
- [ ] Streak display
- [ ] Weekly adherence indicator

### Per Browser — AI Agent
- [ ] Chat interface renders
- [ ] Text input sends messages (requires API key + network)
- [ ] Image upload functions
- [ ] Offline message displays when offline

### Per Browser — Settings
- [ ] All settings save and persist
- [ ] API key masking
- [ ] Notification settings toggles
- [ ] Export/Import buttons function
- [ ] File download (export) works
- [ ] File upload (import) works

### Per Browser — PWA
- [ ] Install prompt appears (where supported)
- [ ] Installed app launches in standalone mode
- [ ] App works offline after install
- [ ] Service worker caches assets

### Per Browser — Notifications
- [ ] Permission prompt appears (where Notification API supported)
- [ ] Push notifications fire (where supported)
- [ ] Badge updates (where Badge API supported)
- [ ] In-app fallback appears when push unavailable

## Known Platform Limitations

| Platform | Limitation | Handling |
|----------|-----------|----------|
| iOS Safari | Limited push notification support | In-app fallback banners |
| iOS Safari | No Badge API | Silently skipped |
| Firefox Mobile | No PWA install | App works as regular web app |
| Older browsers | No Notification API | In-app fallback only |

## Issues Found

| # | Browser | Issue | Severity | Fix |
|---|---------|-------|----------|-----|
| 1 | | | | |
