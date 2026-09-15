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
import type { Trip } from '@/types/trip';

const DONE_KEY = 'norte.done.v1';

type DoneMap = Record<string, string[]>;

interface ProgressContextValue {
  isDone: (id: string) => boolean;
  toggle: (id: string) => void;
  doneCount: number;
  totalItems: number;
  progress: number;
  tripStreak: number;
  totalCheckOffs: number;
  getTripDoneCount: (tripId: string) => number;
  getTripProgress: (tripId: string) => number;
  getTripStreak: (tripId: string) => number;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

/** Count total checkable items in a Trip. Returns 0 if no trip data is loaded.
 *  Places are tracked per-city (see city-progress-context), so only itinerary
 *  activities and restaurants count toward the trip's own progress. */
function countItems(data: Trip | null): number {
  if (!data) return 0;
  return (
    data.itinerary.reduce((n, day) => n + day.activities.length, 0) +
    data.restaurants.length
  );
}

function computeStreak(doneIds: Set<string>, data: Trip | null): number {
  if (!data) return 0;
  let streak = 0;
  for (const day of data.itinerary) {
    if (day.activities.some((a) => doneIds.has(a.id))) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { trip, currentTripData } = useTrip();
  const [doneMap, setDoneMap] = useState<DoneMap>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DONE_KEY);
        if (mounted && raw) setDoneMap(JSON.parse(raw) as DoneMap);
      } catch {
        // ignore
      } finally {
        if (mounted) setLoaded(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(DONE_KEY, JSON.stringify(doneMap)).catch(() => {});
  }, [doneMap, loaded]);

  const toggle = useCallback(
    (id: string) => {
      setDoneMap((prev) => {
        const current = prev[trip.id] ?? [];
        const next = current.includes(id)
          ? current.filter((x) => x !== id)
          : [...current, id];
        return { ...prev, [trip.id]: next };
      });
    },
    [trip.id]
  );

  const value = useMemo<ProgressContextValue>(() => {
    const currentDone = doneMap[trip.id] ?? [];
    const doneSet = new Set(currentDone);
    const totalItems = countItems(currentTripData);
    const totalCheckOffs = Object.values(doneMap).reduce((n, ids) => n + ids.length, 0);

    const getTripDoneCount = (tripId: string) => doneMap[tripId]?.length ?? 0;
    const getTripStreak = (tripId: string) => {
      // Other trips' full data isn't loaded in memory, so streak is 0.
      return computeStreak(new Set(doneMap[tripId] ?? []), null);
    };

    return {
      isDone: (id: string) => doneSet.has(id),
      toggle,
      doneCount: doneSet.size,
      totalItems,
      progress: totalItems === 0 ? 0 : doneSet.size / totalItems,
      tripStreak: computeStreak(doneSet, currentTripData),
      totalCheckOffs,
      getTripDoneCount,
      getTripProgress: (tripId: string) =>
        totalItems === 0 ? 0 : getTripDoneCount(tripId) / totalItems,
      getTripStreak,
    };
  }, [doneMap, toggle, trip.id, currentTripData]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return ctx;
}
