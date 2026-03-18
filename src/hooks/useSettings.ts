import { useState, useEffect, useCallback } from 'react';
import type { Settings } from '@/lib/types';
import {
  getSettings,
  saveSettings,
  type SaveSettingsInput,
} from '@/data/settings-service';

interface UseSettingsReturn {
  settings: Settings | undefined;
  loading: boolean;
  error: Error | null;
  save: (input: SaveSettingsInput) => Promise<Settings>;
}

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<Settings | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getSettings();
      setSettings(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load settings'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async (input: SaveSettingsInput): Promise<Settings> => {
    const result = await saveSettings(input);
    setSettings(result);
    return result;
  }, []);

  return { settings, loading, error, save };
}
