import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTrip } from '@/contexts/trip-context';
interface Value {
  isDone: (id: string) => boolean;
  toggle: (id: string) => void;
  doneCount: number;
  totalItems: number;
  progress: number;
  tripStreak: number;
  totalCheckOffs: number;
  getTripDoneCount: (id: string) => number;
  getTripProgress: (id: string) => number;
  getTripStreak: (id: string) => number;
}
const Context = createContext<Value | null>(null);
const KEY = 'norte.done.v1';
export function ProgressProvider({ children }: { children: ReactNode }) {
  const { trip, currentTripData, trips, isLoading } = useTrip();
  const [map, setMap] = useState<Record<string, string[]>>({});
  const [loaded, setLoaded] = useState(false);
  const queue = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (active && raw) setMap(JSON.parse(raw));
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (loaded && !isLoading)
      setMap((prev) => {
        const next = Object.fromEntries(
          Object.entries(prev).filter(([id]) => trips.some((t) => t.id === id)),
        );
        return Object.keys(next).length === Object.keys(prev).length ? prev : next;
      });
  }, [trips, loaded, isLoading]);
  useEffect(() => {
    if (loaded)
      queue.current = queue.current
        .then(() => AsyncStorage.setItem(KEY, JSON.stringify(map)))
        .catch(() => {});
  }, [map, loaded]);
  const all = currentTripData
    ? [
        ...currentTripData.itinerary.flatMap((d) => d.activities.map((a) => a.id)),
        ...currentTripData.restaurants.map((r) => r.id),
      ]
    : [];
  const done = new Set((map[trip.id] ?? []).filter((id) => all.includes(id)));
  const totalItems = all.length;
  let streak = 0,
    best = 0;
  for (const day of currentTripData?.itinerary ?? []) {
    streak = day.activities.some((a) => done.has(a.id)) ? streak + 1 : 0;
    best = Math.max(best, streak);
  }
  const toggle = (id: string) => {
    if (!loaded || !trip.id) return;
    setMap((prev) => {
      const ids = prev[trip.id] ?? [];
      return { ...prev, [trip.id]: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] };
    });
  };
  return (
    <Context.Provider
      value={{
        isDone: (id) => done.has(id),
        toggle,
        doneCount: done.size,
        totalItems,
        progress: totalItems ? done.size / totalItems : 0,
        tripStreak: best,
        totalCheckOffs: Object.values(map).reduce((s, a) => s + a.length, 0),
        getTripDoneCount: (id) => (map[id] ?? []).length,
        getTripProgress: (id) => (id === trip.id && totalItems ? done.size / totalItems : 0),
        getTripStreak: (id) => (id === trip.id ? best : 0),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useProgress() {
  const c = useContext(Context);
  if (!c) throw new Error('ProgressProvider missing');
  return c;
}
