import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/data/db';
import { SETTINGS_ID } from '@/lib/constants';
import {
  shouldShowPermissionPrompt,
  deferPermissionPrompt,
  recordQualifyingAction,
  incrementSessionCount,
  detectCapabilities,
} from '@/data/notification-service';

describe('notification permission flow', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await db.settings.put({
      id: SETTINGS_ID,
      sessionCount: 0,
      hasQualifyingAction: false,
    });
    // Mock Notification API as available with default permission
    vi.stubGlobal('Notification', { permission: 'default', requestPermission: vi.fn() });
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {},
      configurable: true,
    });
    detectCapabilities();
  });

  it('should not show prompt on first session', async () => {
    await db.settings.update(SETTINGS_ID, {
      sessionCount: 1,
      hasQualifyingAction: true,
    });
    expect(await shouldShowPermissionPrompt()).toBe(false);
  });

  it('should not show prompt without qualifying action', async () => {
    await db.settings.update(SETTINGS_ID, {
      sessionCount: 5,
      hasQualifyingAction: false,
    });
    expect(await shouldShowPermissionPrompt()).toBe(false);
  });

  it('should show prompt after qualifying action and multiple sessions', async () => {
    await db.settings.update(SETTINGS_ID, {
      sessionCount: 3,
      hasQualifyingAction: true,
    });
    expect(await shouldShowPermissionPrompt()).toBe(true);
  });

  it('should not show prompt when permission already granted', async () => {
    vi.stubGlobal('Notification', { permission: 'granted' });
    detectCapabilities();
    await db.settings.update(SETTINGS_ID, {
      sessionCount: 5,
      hasQualifyingAction: true,
    });
    expect(await shouldShowPermissionPrompt()).toBe(false);
  });

  it('should not show prompt when permission denied', async () => {
    vi.stubGlobal('Notification', { permission: 'denied' });
    detectCapabilities();
    await db.settings.update(SETTINGS_ID, {
      sessionCount: 5,
      hasQualifyingAction: true,
    });
    expect(await shouldShowPermissionPrompt()).toBe(false);
  });

  it('should defer and respect cooldown period', async () => {
    await db.settings.update(SETTINGS_ID, {
      sessionCount: 3,
      hasQualifyingAction: true,
    });
    expect(await shouldShowPermissionPrompt()).toBe(true);

    await deferPermissionPrompt();
    // Should not show immediately after deferral
    expect(await shouldShowPermissionPrompt()).toBe(false);
  });

  it('should record qualifying action only once', async () => {
    await recordQualifyingAction();
    const settings1 = await db.settings.get(SETTINGS_ID);
    expect(settings1?.hasQualifyingAction).toBe(true);

    // Calling again should not error
    await recordQualifyingAction();
  });

  it('should increment session count', async () => {
    await incrementSessionCount();
    const settings = await db.settings.get(SETTINGS_ID);
    expect(settings?.sessionCount).toBe(1);

    await incrementSessionCount();
    const settings2 = await db.settings.get(SETTINGS_ID);
    expect(settings2?.sessionCount).toBe(2);
  });
});
