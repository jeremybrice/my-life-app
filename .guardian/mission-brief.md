# Mission Brief

**Playbook:** feature-build
**Design Doc:** docs/plans/stage-7-notifications-polish.md
**Supplementary:** docs/plans/global-conventions.md
**Created:** 2026-03-18

## Requirements Summary

### Notifications
1. Capability detection (push, badge, persistent) — runtime feature detection
2. Permission flow — pre-permission prompt, not first session, after meaningful action
3. Budget alerts — daily overspend + monthly thresholds, after expense writes
4. Milestone alerts — countdown intervals, daily check on app launch
5. Badge updates — setAppBadge/clearAppBadge, skip unsupported
6. In-app fallback — dashboard banners when push unavailable
7. Notification settings UI — master toggle, threshold config

### Import/Export
8. Export — JSON with metadata, all stores, date in filename
9. Import — validate, confirm, atomic replace

### Polish
10. Cross-browser testing + fixes
11. UX polish — design tokens, states, animations, reduced-motion

## Test Command

```
npx vitest run
```

## Developer Callouts

- All work on `staging` branch
- Use AppNotificationPermission (not NotificationPermission)
- Import is destructive — atomic with rollback
- prefers-reduced-motion respected
