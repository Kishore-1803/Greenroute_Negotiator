import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'greenroute.settings.v1';

export interface AppSettings {
  /** Read the recommendation aloud after a voice-planned trip. */
  spokenRecommendations: boolean;
}

// Voice on by default: the spoken reply is the point of the voice flow, and someone who has
// just talked to the app expects it to talk back.
const DEFAULTS: AppSettings = {
  spokenRecommendations: true,
};

interface AppSettingsContextValue {
  settings: AppSettings;
  /** True until the stored values are read, so a toggle never renders the default and then
   * visibly flips to the saved value a frame later. */
  loading: boolean;
  update: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

const AppSettingsContext = createContext<AppSettingsContextValue | undefined>(undefined);

export const AppSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw && !cancelled) {
          // Spread over DEFAULTS rather than replacing: a stored blob written by an older build
          // is missing any setting added since, and those must fall back rather than be
          // undefined.
          setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
        }
      } catch {
        // Unreadable or corrupt. Defaults are already in state; a preference is not worth
        // surfacing an error over.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback<AppSettingsContextValue['update']>((key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      // Applied to state immediately and persisted in the background: a toggle that waits on
      // disk before moving feels broken, and a failed write costs one preference, not the tap.
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(() => ({ settings, loading, update }), [loading, settings, update]);

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
};

export function useAppSettings(): AppSettingsContextValue {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) throw new Error('useAppSettings must be used within an AppSettingsProvider');
  return ctx;
}
