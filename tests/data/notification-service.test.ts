import { describe, it, expect, beforeEach, vi } from 'vitest';
import { detectCapabilities, getCapabilities, refreshCapabilities, isPushAvailable } from '@/data/notification-service';

describe('notification capability detection', () => {
  beforeEach(() => {
    // Reset cached capabilities by calling detect fresh
    vi.restoreAllMocks();
  });

  it('should detect push support when Notification and serviceWorker exist', () => {
    // fake-indexeddb test environment has window but not Notification
    // We mock the globals
    vi.stubGlobal('Notification', { permission: 'default' });
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {},
      configurable: true,
    });

    const caps = detectCapabilities();
    expect(caps.pushSupported).toBe(true);
    expect(caps.permissionState).toBe('default');
  });

  it('should detect badge support when navigator.setAppBadge exists', () => {
    Object.defineProperty(navigator, 'setAppBadge', {
      value: vi.fn(),
      configurable: true,
    });

    const caps = detectCapabilities();
    expect(caps.badgeSupported).toBe(true);
  });

  it('should report unsupported when Notification API is missing', () => {
    vi.stubGlobal('Notification', undefined);
    // Remove Notification from window check
    const originalNotification = (window as Record<string, unknown>).Notification;
    delete (window as Record<string, unknown>).Notification;

    const caps = detectCapabilities();
    expect(caps.pushSupported).toBe(false);
    expect(caps.permissionState).toBe('unsupported');

    // Restore
    if (originalNotification) {
      (window as Record<string, unknown>).Notification = originalNotification;
    }
  });

  it('should cache capabilities and return cached on subsequent calls', () => {
    vi.stubGlobal('Notification', { permission: 'granted' });
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {},
      configurable: true,
    });

    detectCapabilities();
    const cached = getCapabilities();
    expect(cached.permissionState).toBe('granted');
  });

  it('should refresh capabilities when refreshCapabilities is called', () => {
    vi.stubGlobal('Notification', { permission: 'default' });
    detectCapabilities();
    expect(getCapabilities().permissionState).toBe('default');

    vi.stubGlobal('Notification', { permission: 'granted' });
    refreshCapabilities();
    expect(getCapabilities().permissionState).toBe('granted');
  });

  it('should report isPushAvailable correctly', () => {
    vi.stubGlobal('Notification', { permission: 'granted' });
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {},
      configurable: true,
    });
    detectCapabilities();
    expect(isPushAvailable()).toBe(true);
  });

  it('should report isPushAvailable false when permission denied', () => {
    vi.stubGlobal('Notification', { permission: 'denied' });
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {},
      configurable: true,
    });
    detectCapabilities();
    expect(isPushAvailable()).toBe(false);
  });
});
