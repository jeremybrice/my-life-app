---
title: "Browser Notification Capability Detection"
type: story
status: Draft
product: My Life App
module: Platform
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

PWA notification support varies significantly across browsers and operating systems. Chrome on Android has robust push and badge support. Safari on iOS gained push notification support relatively recently and still has limitations. Firefox and Edge have their own variations. The app cannot assume uniform support and must detect capabilities at runtime to decide which notification pathways are available.

This story creates a capability detection layer that other notification stories depend on. Without it, attempting to use unsupported APIs would cause errors or silent failures, and the user would have no understanding of why notifications are not working on their platform.

## Feature Requirements / Functional Behavior

**UI Behavior**

- When the user navigates to notification-related settings, the screen displays the current platform's notification capability status. Each capability (push notifications, badge updates, persistent notifications) shows as supported or unsupported.
- On platforms where one or more capabilities are unsupported, a brief explanatory message appears near the unsupported capability, explaining that the platform does not support this feature and that in-app alternatives will be used.
- The capability status does not require user action to display. It is informational and updates automatically based on the detected environment.

**Business Rules**

- Capability detection must run when the app initializes and again when notification settings are accessed (to handle cases where the user has switched browsers or updated their OS).
- The following capabilities must be individually detected: push notification support, badge API support, and persistent notification support.
- Detected capabilities must be stored as flags accessible to other parts of the app so that notification-sending logic can branch appropriately without re-detecting on every notification attempt.
- Capability flags must reflect the actual runtime environment, not a static lookup of browser names. Feature detection based on API availability is required.

## Acceptance Tests

**Test 1: Full Capability Detection on Chrome Desktop**
Steps: Open the app in Chrome on a desktop computer. Navigate to notification settings.
Expected Result: Push notifications and persistent notifications show as supported. Badge API status reflects the current Chrome version's support. No limitation messages appear for supported capabilities.

**Test 2: Limited Capability Detection on iOS Safari**
Steps: Open the app in Safari on an iOS device. Navigate to notification settings.
Expected Result: Capabilities that iOS Safari does not support are shown as unsupported with explanatory messages. Supported capabilities show as available.

**Test 3: Capability Flags Accessible at Runtime**
Steps: Trigger a budget threshold notification (from Story 041) on a browser with full push support.
Expected Result: The notification logic reads the stored capability flags and sends a push notification without re-running detection.

**Test 4: Capability Re-Detection on Settings Access**
Steps: Open notification settings, note the displayed capabilities. Simulate a change in browser context (e.g., using a different browser). Open notification settings again.
Expected Result: The capability display updates to reflect the new environment's actual support levels.

**Test 5: Graceful Handling of Fully Unsupported Environment**
Steps: Open the app in a browser or context where no notification APIs are available (e.g., an older browser or an embedded webview).
Expected Result: All three capabilities show as unsupported. Explanatory messages indicate that in-app notification alternatives will be used. No errors are thrown.

## Implementation Context

Feature detection should check for the existence of specific APIs (`Notification` constructor, `navigator.setAppBadge`, service worker push manager) rather than user-agent sniffing. The capability flags should be stored somewhere accessible to other modules (a simple in-memory object refreshed on init and settings access is sufficient, with no need for IndexedDB persistence since capabilities are environment-specific). Consider creating a notification capability service or utility that encapsulates all detection logic in one place.

