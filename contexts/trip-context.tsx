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

import type { SavedTrip, Trip } from '@/types/trip';

export const TRIPS_KEY = 'norte.trips.v1';
const DATA_PREFIX = 'norte.tripdata.v1:';

export interface TripState {
  id: string;
  destination: string;
  startDate: Date;
  endDate: Date;
}

interface TripContextValue {
  trips: SavedTrip[];
  trip: TripState;
  /** AI-generated trip plan for the current trip. null = not yet generated. */
  currentTripData: Trip | null;
  /** Whether trip data is currently being generated. */
  isGenerating: boolean;
  addTrip: (input: { destination: string; startDate: Date; endDate: Date }) => string;
  selectTrip: (id: string) => void;
  setTripData: (id: string, data: Trip) => void;
  setGenerating: (v: boolean) => void;
  deleteTrip: (id: string) => void;
}

const TripContext = createContext<TripContextValue | null>(null);

function makeId(destination: string): string {
  const slug = destination.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${slug || 'trip'}-${Date.now()}`;
}

function seedTrip(): SavedTrip {
  const start = new Date(2026, 7, 12);
  const end = new Date(2026, 7, 16);
  return {
    id: makeId('Porto'),
    destination: 'Porto',
    startDateISO: start.toISOString(),
    endDateISO: end.toISOString(),
  };
}

export function TripProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [currentTripData, setCurrentTripData] = useState<Trip | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Load persisted trips.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(TRIPS_KEY);
        if (mounted) {
          if (raw) {
            const stored = JSON.parse(raw) as SavedTrip[];
            setTrips(stored);
            setCurrentId(stored[0]?.id ?? null);
          } else {
            const seeded = [seedTrip()];
            setTrips(seeded);
            setCurrentId(seeded[0].id);
            await AsyncStorage.setItem(TRIPS_KEY, JSON.stringify(seeded));
          }
        }
      } catch {
        const seeded = [seedTrip()];
        if (mounted) {
          setTrips(seeded);
          setCurrentId(seeded[0].id);
        }
      } finally {
        if (mounted) setLoaded(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Persist trips list.
  useEffect(() => {
    if (loaded) AsyncStorage.setItem(TRIPS_KEY, JSON.stringify(trips)).catch(() => {});
  }, [trips, loaded]);

  // Load trip data when current trip changes.
  useEffect(() => {
    if (!currentId || !loaded) {
      setCurrentTripData(null);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DATA_PREFIX + currentId);
        if (mounted) setCurrentTripData(raw ? JSON.parse(raw) : null);
      } catch {
        if (mounted) setCurrentTripData(null);
      }
    })();
    return () => { mounted = false; };
  }, [currentId, loaded]);

  const setTripData = useCallback((id: string, data: Trip) => {
    setCurrentTripData(data);
    AsyncStorage.setItem(DATA_PREFIX + id, JSON.stringify(data)).catch(() => {});
  }, []);

  const addTrip = useCallback(
    (input: { destination: string; startDate: Date; endDate: Date }) => {
      const id = makeId(input.destination);
      const saved: SavedTrip = {
        id,
        destination: input.destination.trim(),
        startDateISO: input.startDate.toISOString(),
        endDateISO: input.endDate.toISOString(),
      };
      setTrips((prev) => [saved, ...prev]);
      setCurrentId(id);
      setCurrentTripData(null);
      return id;
    },
    []
  );

  const selectTrip = useCallback((id: string) => {
    setCurrentId(id);
  }, []);

  const deleteTrip = useCallback(
    (id: string) => {
      setTrips((prev) => prev.filter((t) => t.id !== id));
      // Also delete the trip data
      AsyncStorage.removeItem(DATA_PREFIX + id).catch(() => {});
      // If we're deleting the current trip, switch to another one
      if (currentId === id) {
        const remaining = trips.filter((t) => t.id !== id);
        setCurrentId(remaining[0]?.id ?? null);
        setCurrentTripData(null);
      }
    },
    [currentId, trips]
  );

  const trip = useMemo<TripState>(() => {
    const current = trips.find((t) => t.id === currentId);
    if (current) {
      return {
        id: current.id,
        destination: current.destination,
        startDate: new Date(current.startDateISO),
        endDate: new Date(current.endDateISO),
      };
    }
    const first = trips[0];
    if (first) {
      return {
        id: first.id,
        destination: first.destination,
        startDate: new Date(first.startDateISO),
        endDate: new Date(first.endDateISO),
      };
    }
    const seeded = seedTrip();
    return {
      id: seeded.id,
      destination: seeded.destination,
      startDate: new Date(seeded.startDateISO),
      endDate: new Date(seeded.endDateISO),
    };
  }, [trips, currentId]);

  const value = useMemo<TripContextValue>(
    () => ({
      trips,
      trip,
      currentTripData,
      isGenerating,
      addTrip,
      selectTrip,
      setTripData,
      setGenerating: setIsGenerating,
      deleteTrip,
    }),
    [trips, trip, currentTripData, isGenerating, addTrip, selectTrip, setTripData, deleteTrip]
  );

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTrip() {
  const ctx = useContext(TripContext);
  if (!ctx) {
    throw new Error('useTrip must be used within a TripProvider');
  }
  return ctx;
}
