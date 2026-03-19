import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/data/db';
import {
  getSettings,
  saveSettings,
  clearSettings,
} from '@/data/settings-service';

describe('settings-service', () => {
  beforeEach(async () => {
    // Clean slate for each test
    await db.delete();
    await db.open();
  });

  describe('getSettings', () => {
    it('should return undefined when no settings exist', async () => {
      const result = await getSettings();
      expect(result).toBeUndefined();
    });

    it('should return saved settings', async () => {
      await saveSettings({ apiKey: 'sk-test-123' });
      const result = await getSettings();
      expect(result).toBeDefined();
      expect(result!.apiKey).toBe('sk-test-123');
    });
  });

  describe('saveSettings', () => {
    it('should create settings on first save', async () => {
      const result = await saveSettings({ birthDate: '1990-01-15' });
      expect(result.id).toBe(1);
      expect(result.birthDate).toBe('1990-01-15');
    });

    it('should always use singleton id=1', async () => {
      const result = await saveSettings({ apiKey: 'test' });
      expect(result.id).toBe(1);

      const count = await db.settings.count();
      expect(count).toBe(1);
    });

    it('should merge with existing settings (partial update)', async () => {
      await saveSettings({ apiKey: 'my-key', birthDate: '1990-01-15' });
      const result = await saveSettings({ monthlyBudget: 3000 });

      expect(result.apiKey).toBe('my-key');
      expect(result.birthDate).toBe('1990-01-15');
      expect(result.monthlyBudget).toBe(3000);
    });

    it('should allow partial saves with only some fields', async () => {
      const result = await saveSettings({ monthlyBudget: 5000 });
      expect(result.monthlyBudget).toBe(5000);
      expect(result.apiKey).toBeUndefined();
      expect(result.birthDate).toBeUndefined();
    });

    it('should save all fields correctly', async () => {
      const result = await saveSettings({
        apiKey: 'sk-ant-api03-secret',
        birthDate: '1985-06-15',
        targetDate: '2035-06-15',
        targetDateLabel: 'Financial Freedom',
        monthlyBudget: 4000,
      });

      expect(result.apiKey).toBe('sk-ant-api03-secret');
      expect(result.birthDate).toBe('1985-06-15');
      expect(result.targetDate).toBe('2035-06-15');
      expect(result.targetDateLabel).toBe('Financial Freedom');
      expect(result.monthlyBudget).toBe(4000);
    });

    it('should reject future birth date', async () => {
      await expect(
        saveSettings({ birthDate: '2099-01-01' })
      ).rejects.toThrow('Birth date cannot be in the future');
    });

    it('should reject negative monthly budget', async () => {
      await expect(
        saveSettings({ monthlyBudget: -100 })
      ).rejects.toThrow('Monthly budget must be non-negative');
    });

    it('should allow zero budget', async () => {
      const result = await saveSettings({
        monthlyBudget: 0,
      });
      expect(result.monthlyBudget).toBe(0);
    });

    it('should overwrite existing field values', async () => {
      await saveSettings({ apiKey: 'old-key' });
      const result = await saveSettings({ apiKey: 'new-key' });
      expect(result.apiKey).toBe('new-key');
    });
  });

  describe('clearSettings', () => {
    it('should remove all settings', async () => {
      await saveSettings({ apiKey: 'test', monthlyBudget: 1000 });
      await clearSettings();
      const result = await getSettings();
      expect(result).toBeUndefined();
    });

    it('should not throw when no settings exist', async () => {
      await expect(clearSettings()).resolves.not.toThrow();
    });
  });
});
