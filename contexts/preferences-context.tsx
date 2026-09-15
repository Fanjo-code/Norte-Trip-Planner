import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { UserPreferences } from '@/types/trip';

const PREFS_KEY = 'norte.preferences.v1';

export const DEFAULT_PREFS: UserPreferences = {
  interests: [],
  pace: 'balanced',
  budget: 'standard',
};

/** Friendly labels for preference values (used by Guide + new-trip chips). */
export const INTEREST_LABELS: Record<string, string> = {
  art: 'Art & museums',
  food: 'Food & dining',
  history: 'History & heritage',
  nature: 'Nature & outdoors',
  nightlife: 'Nightlife',
  shopping: 'Shopping',
  architecture: 'Architecture',
  views: 'Viewpoints',
};

export const PACE_LABELS: Record<'relaxed' | 'balanced' | 'packed', string> = {
  relaxed: 'Relaxed',
  balanced: 'Balanced',
  packed: 'Packed',
};

export const BUDGET_LABELS: Record<'budget' | 'standard' | 'premium', string> = {
  budget: 'Budget',
  standard: 'Standard',
  premium: 'Premium',
};

interface PreferencesContextValue {
  prefs: UserPreferences;
  /** Whether the traveler has customized anything (interests chosen or a non-default pace/budget). */
  hasCustomized: boolean;
  updatePrefs: (partial: Partial<UserPreferences>) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);

  // Load persisted preferences.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PREFS_KEY);
        if (mounted && raw) {
          const parsed = JSON.parse(raw) as Partial<UserPreferences>;
          setPrefs({ ...DEFAULT_PREFS, ...parsed });
        }
      } catch {
        // ignore — fall back to defaults
      } finally {
        if (mounted) setLoaded(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Persist on change.
  useEffect(() => {
    if (loaded) AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs)).catch(() => {});
  }, [prefs, loaded]);

  const updatePrefs = useCallback((partial: Partial<UserPreferences>) => {
    setPrefs((prev) => ({ ...prev, ...partial }));
  }, []);

  const hasCustomized =
    prefs.interests.length > 0 || prefs.pace !== DEFAULT_PREFS.pace || prefs.budget !== DEFAULT_PREFS.budget;

  const value = useMemo<PreferencesContextValue>(
    () => ({ prefs, hasCustomized, updatePrefs }),
    [prefs, hasCustomized, updatePrefs]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return ctx;
}