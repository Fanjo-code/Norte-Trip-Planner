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

import { useTrip } from '@/contexts/trip-context';

const CITY_KEY = 'norte.cityprogress.v1';

/**
 * Per-city, persisted completion ("I've seen 75% of Paris").
 * key = canonical city name (lowercase). seen = normalized place names.
 * total = the largest comprehensive place count ever generated for the city,
 * so a shorter later trip can't water down the "everything that matters" bar.
 */
type CityRecord = { seen: string[]; total: number };
type CityProgressMap = Record<string, CityRecord>;

interface CityProgressContextValue {
  isPlaceSeen: (destination: string, name: string) => boolean;
  togglePlaceSeen: (destination: string, name: string) => void;
  /** Raw record for a city (no place list needed) — for list cards / journal. */
  getCityRecord: (destination: string) => CityRecord;
  /** Completion against a live place list: seen ∩ placeList / max(total, placeList.length). */
  getCityProgress: (destination: string, placeList: { name: string }[]) => number;
  /** Number of seen places present in the given list. */
  countSeenInList: (destination: string, placeList: { name: string }[]) => number;
}

const CityProgressContext = createContext<CityProgressContextValue | null>(null);

/** Max canonical bar for a city — keeps "100% of Paris" attainable even if one
 *  trip's over-generated list is huge. Comprehensive, but finite. */
const MAX_CITY_TOTAL = 50;

/** Canonical city key: "Paris" / "paris" / "Paris, France" all map to "paris". */
function cityKey(destination: string): string {
  return destination.toLowerCase().trim().split(',')[0].trim();
}

/**
 * Canonical place key from a name: lowercase, strip accents, collapse non-alphanumerics.
 * "Eiffel Tower" → "eiffeltower". Binds check-offs across trips to the same place.
 */
function placeKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

const EMPTY: CityRecord = { seen: [], total: 0 };

export function CityProgressProvider({ children }: { children: ReactNode }) {
  const { currentTripData } = useTrip();
  const [cityMap, setCityMap] = useState<CityProgressMap>({});
  const [loaded, setLoaded] = useState(false);

  // Load persisted map.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CITY_KEY);
        if (mounted && raw) setCityMap(JSON.parse(raw) as CityProgressMap);
      } catch {
        // ignore
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
    if (loaded) AsyncStorage.setItem(CITY_KEY, JSON.stringify(cityMap)).catch(() => {});
  }, [cityMap, loaded]);

  // Reconcile the canonical total whenever trip data loads: total = max(prev, min(places, cap)).
  useEffect(() => {
    if (!loaded || !currentTripData) return;
    const key = cityKey(currentTripData.destination);
    const placeCount = Math.min(currentTripData.places.length, MAX_CITY_TOTAL);
    if (placeCount <= 0) return;
    setCityMap((prev) => {
      const record = prev[key] ?? EMPTY;
      if (placeCount <= record.total) return prev; // nothing to bump
      return { ...prev, [key]: { seen: record.seen, total: placeCount } };
    });
  }, [loaded, currentTripData]);

  const togglePlaceSeen = useCallback((destination: string, name: string) => {
    if (!loaded) return; // avoid the AsyncStorage load (below) clobbering an early toggle
    const pk = placeKey(name);
    if (!pk) return;
    const key = cityKey(destination);
    setCityMap((prev) => {
      const record = prev[key] ?? EMPTY;
      const seen = record.seen;
      const next = seen.includes(pk) ? seen.filter((s) => s !== pk) : [...seen, pk];
      return { ...prev, [key]: { seen: next, total: record.total } };
    });
  }, [loaded]);

  const value = useMemo<CityProgressContextValue>(() => {
    const getCityRecord = (destination: string): CityRecord => cityMap[cityKey(destination)] ?? EMPTY;

    const isPlaceSeen = (destination: string, name: string) => {
      const pk = placeKey(name);
      if (!pk) return false;
      return getCityRecord(destination).seen.includes(pk);
    };

    const countSeenInList = (destination: string, placeList: { name: string }[]) => {
      const pkSet = new Set(getCityRecord(destination).seen);
      return placeList.filter((p) => pkSet.has(placeKey(p.name))).length;
    };

    const getCityProgress = (destination: string, placeList: { name: string }[]) => {
      const record = getCityRecord(destination);
      const total = Math.min(Math.max(record.total, placeList.length), MAX_CITY_TOTAL);
      if (total === 0) return 0;
      return countSeenInList(destination, placeList) / total;
    };

    return {
      isPlaceSeen,
      togglePlaceSeen,
      getCityRecord,
      getCityProgress,
      countSeenInList,
    };
  }, [cityMap, togglePlaceSeen, loaded]);

  return <CityProgressContext.Provider value={value}>{children}</CityProgressContext.Provider>;
}

export function useCityProgress() {
  const ctx = useContext(CityProgressContext);
  if (!ctx) {
    throw new Error('useCityProgress must be used within a CityProgressProvider');
  }
  return ctx;
}