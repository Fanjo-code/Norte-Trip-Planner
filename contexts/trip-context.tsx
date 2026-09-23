import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { SavedTrip, Trip } from '@/types/trip';
import { addDays, localISO, parseDate } from '@/lib/format';
import { scheduleTripNotifications } from '@/services/notifications';
export const TRIPS_KEY = 'norte.trips.v1';
const DATA_PREFIX = 'norte.tripdata.v1:';
const SELECTED_KEY = 'norte.selected.v1';
export interface TripState {
  id: string;
  destination: string;
  startDate: Date;
  endDate: Date;
}
interface Value {
  trips: SavedTrip[];
  trip: TripState;
  currentTripData: Trip | null;
  isGenerating: boolean;
  isLoading: boolean;
  storageError: string | null;
  addTrip: (input: { destination: string; startDate: Date; endDate: Date }, data?: Trip) => string;
  selectTrip: (id: string) => void;
  setTripData: (id: string, data: Trip) => void;
  setGenerating: (v: boolean) => void;
  deleteTrip: (id: string) => void;
}
const Context = createContext<Value | null>(null);
export function TripProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [dataMap, setDataMap] = useState<Record<string, Trip>>({});
  const [loaded, setLoaded] = useState(false);
  const [isGenerating, setGenerating] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const queue = useRef(Promise.resolve());
  const persist = useCallback((job: () => Promise<void>) => {
    queue.current = queue.current
      .then(job)
      .catch(() =>
        setStorageError(
          'These changes could not be saved on this device. Keep Norte open and check your available storage.',
        ),
      );
  }, []);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(TRIPS_KEY);
        const parsed: SavedTrip[] = raw ? JSON.parse(raw) : [];
        const valid = Array.isArray(parsed)
          ? parsed.filter(
              (x) =>
                x &&
                x.id &&
                x.destination &&
                Number.isFinite(new Date(x.startDateISO).getTime()) &&
                Number.isFinite(new Date(x.endDateISO).getTime()),
            )
          : [];
        const pairs = await AsyncStorage.multiGet(valid.map((x) => DATA_PREFIX + x.id));
        const map: Record<string, Trip> = {};
        for (const [key, val] of pairs) {
          try {
            const d = val ? JSON.parse(val) : null;
            if (
              d &&
              Array.isArray(d.places) &&
              Array.isArray(d.itinerary) &&
              Array.isArray(d.restaurants) &&
              Array.isArray(d.transport)
            )
              map[key.slice(DATA_PREFIX.length)] = d;
          } catch {}
        }
        const selectedId = await AsyncStorage.getItem(SELECTED_KEY);
        if (active) {
          setTrips(valid);
          setDataMap(map);
          setCurrentId(
            valid.some((t) => t.id === selectedId) ? selectedId : (valid[0]?.id ?? null),
          );
        }
      } catch {
        if (active)
          setStorageError(
            'Saved journeys could not be read. Your existing storage has been left untouched.',
          );
      } finally {
        if (active) setLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  const addTrip = useCallback(
    (input: { destination: string; startDate: Date; endDate: Date }, data?: Trip) => {
      const id = 'trip-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
      const saved = {
        id,
        destination: input.destination.trim(),
        startDateISO: localISO(input.startDate),
        endDateISO: localISO(input.endDate),
      };
      setTrips((prev) => [saved, ...prev]);
      setCurrentId(id);
      if (data) setDataMap((prev) => ({ ...prev, [id]: data }));
      persist(async () => {
        const raw = await AsyncStorage.getItem(TRIPS_KEY);
        const prev = raw ? JSON.parse(raw) : [];
        await AsyncStorage.multiSet([
          [TRIPS_KEY, JSON.stringify([saved, ...(Array.isArray(prev) ? prev : [])])],
          ...(data ? [[DATA_PREFIX + id, JSON.stringify(data)] as [string, string]] : []),
        ]);
      });
      return id;
    },
    [persist],
  );
  const setTripData = useCallback(
    (id: string, data: Trip) => {
      setDataMap((prev) => ({ ...prev, [id]: data }));
      persist(() => AsyncStorage.setItem(DATA_PREFIX + id, JSON.stringify(data)));
    },
    [persist],
  );
  const deleteTrip = useCallback(
    (id: string) => {
      setTrips((prev) => prev.filter((x) => x.id !== id));
      setDataMap((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setCurrentId((prev) => (prev === id ? null : prev));
      persist(async () => {
        const raw = await AsyncStorage.getItem(TRIPS_KEY);
        const list = raw ? JSON.parse(raw) : [];
        await AsyncStorage.setItem(
          TRIPS_KEY,
          JSON.stringify(list.filter((x: SavedTrip) => x.id !== id)),
        );
        await AsyncStorage.multiRemove([DATA_PREFIX + id, 'norte.note.v1:' + id]);
      });
    },
    [persist],
  );
  useEffect(() => {
    if (loaded && currentId) persist(() => AsyncStorage.setItem(SELECTED_KEY, currentId));
  }, [loaded, currentId, persist]);
  const selected = trips.find((x) => x.id === currentId) ?? trips[0];
  const trip = useMemo<TripState>(
    () =>
      selected
        ? {
            id: selected.id,
            destination: selected.destination,
            startDate: parseDate(selected.startDateISO),
            endDate: parseDate(selected.endDateISO),
          }
        : {
            id: '',
            destination: 'Your next city',
            startDate: new Date(),
            endDate: addDays(new Date(), 3),
          },
    [selected],
  );
  useEffect(() => {
    if (!loaded) return;

    const now = new Date();
    const isDuringTrip = trip.id !== '' && trip.startDate <= now && trip.endDate >= now;

    // For re-engagement, if no active trip or trip is over,
    // pass a value that triggers the 7-day reminder
    const daysUntilNext = trip.id === '' || trip.endDate < now ? 30 : 0;

    scheduleTripNotifications(trip.id !== '' ? trip : null, isDuringTrip, daysUntilNext);
  }, [loaded, trip]);

  return (
    <Context.Provider
      value={{
        trips,
        trip,
        currentTripData: dataMap[trip.id] ?? null,
        isLoading: !loaded,
        isGenerating,
        storageError,
        addTrip,
        selectTrip: setCurrentId,
        setTripData,
        setGenerating,
        deleteTrip,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useTrip() {
  const c = useContext(Context);
  if (!c) throw new Error('TripProvider missing');
  return c;
}
