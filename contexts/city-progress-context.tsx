import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTrip } from '@/contexts/trip-context';
import { cityKey, placeKey } from '@/lib/places';
type RecordValue = { seen: string[]; total: number; known?: string[] };
interface Value {
  isPlaceSeen: (city: string, name: string) => boolean;
  togglePlaceSeen: (city: string, name: string) => void;
  getCityRecord: (city: string) => RecordValue;
  getCityProgress: (city: string, list: { name: string }[]) => number;
  countSeenInList: (city: string, list: { name: string }[]) => number;
}
const Context = createContext<Value | null>(null);
const KEY = 'norte.cityprogress.v1';
export function CityProgressProvider({ children }: { children: ReactNode }) {
  const { currentTripData } = useTrip();
  const [map, setMap] = useState<Record<string, RecordValue>>({});
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
    if (loaded) {
      queue.current = queue.current
        .then(() => AsyncStorage.setItem(KEY, JSON.stringify(map)))
        .catch(() => {});
    }
  }, [map, loaded]);
  useEffect(() => {
    if (!loaded || !currentTripData) return;
    const key = cityKey(currentTripData.destination);
    const names = [
      ...new Set(currentTripData.places.map((p) => placeKey(p.name)).filter(Boolean)),
    ].slice(0, 50);
    setMap((prev) => {
      const old = prev[key] ?? { seen: [], total: 0 };
      const known = old.known?.length ? old.known : names;
      const expanded = [...new Set([...known, ...names])].slice(0, 50);
      if (JSON.stringify(old.known) === JSON.stringify(expanded)) return prev;
      return { ...prev, [key]: { ...old, known: expanded, total: expanded.length } };
    });
  }, [loaded, currentTripData]);
  const getCityRecord = (city: string) => {
    const record = map[cityKey(city)] ?? { seen: [], total: 0 };
    const seen = [...new Set(record.seen)].slice(0, Math.min(50, record.total));
    return { ...record, seen, total: Math.min(50, record.total) };
  };
  const countSeenInList = (city: string, list: { name: string }[]) =>
    new Set(
      list
        .filter((p) => map[cityKey(city)]?.seen.includes(placeKey(p.name)))
        .map((p) => placeKey(p.name)),
    ).size;
  const getCityProgress = (city: string, list: { name: string }[]) => {
    const r = getCityRecord(city);
    const total = r.total || Math.min(50, new Set(list.map((p) => placeKey(p.name))).size);
    return total ? Math.min(1, r.seen.length / total) : 0;
  };
  const togglePlaceSeen = (city: string, name: string) => {
    if (!loaded) return;
    const key = cityKey(city),
      pk = placeKey(name);
    if (!pk) return;
    setMap((prev) => {
      const old = prev[key] ?? { seen: [], total: 0 };
      return {
        ...prev,
        [key]: {
          ...old,
          seen: old.seen.includes(pk) ? old.seen.filter((x) => x !== pk) : [...old.seen, pk],
        },
      };
    });
  };
  return (
    <Context.Provider
      value={{
        getCityRecord,
        countSeenInList,
        getCityProgress,
        togglePlaceSeen,
        isPlaceSeen: (city, name) => Boolean(map[cityKey(city)]?.seen.includes(placeKey(name))),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useCityProgress() {
  const c = useContext(Context);
  if (!c) throw new Error('CityProgressProvider missing');
  return c;
}
