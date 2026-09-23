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
import type { PlanningStageName, SavedTrip, Trip, UserPreferences } from '@/types/trip';
import { addDays, localISO, parseDate } from '@/lib/format';
import { buildItineraryFromSelection } from '@/lib/itinerary';
import { interruptRunningStages, mergePlanningStage } from '@/lib/planning-state';
import { fetchRestaurants, fetchTransport, ProxyError, stage } from '@/services/travel';
import { requestAiSuggestion } from '@/services/ai';
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
  setGenerating: (value: boolean) => void;
  deleteTrip: (id: string) => void;
  beginEnrichment: (id: string, prefs: UserPreferences) => void;
  retryPlanningStage: (id: string, name: PlanningStageName, prefs: UserPreferences) => void;
  applyAiSuggestion: (id: string) => void;
  dismissAiSuggestion: (id: string) => void;
}

const Context = createContext<Value | null>(null);

export function TripProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [dataMap, setDataMap] = useState<Record<string, Trip>>({});
  const dataRef = useRef<Record<string, Trip>>({});
  const controllers = useRef<Record<string, Partial<Record<PlanningStageName, AbortController>>>>(
    {},
  );
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

  const replaceMap = useCallback((map: Record<string, Trip>) => {
    dataRef.current = map;
    setDataMap(map);
  }, []);

  const updateTrip = useCallback(
    (id: string, updater: (current: Trip) => Trip) => {
      const current = dataRef.current[id];
      if (!current) return;
      const next = updater(current);
      const map = { ...dataRef.current, [id]: next };
      dataRef.current = map;
      setDataMap(map);
      persist(() => AsyncStorage.setItem(DATA_PREFIX + id, JSON.stringify(next)));
    },
    [persist],
  );

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(TRIPS_KEY);
        const parsed: SavedTrip[] = raw ? JSON.parse(raw) : [];
        const valid = Array.isArray(parsed)
          ? parsed.filter(
              (item) =>
                item?.id &&
                item.destination &&
                Number.isFinite(new Date(item.startDateISO).getTime()) &&
                Number.isFinite(new Date(item.endDateISO).getTime()),
            )
          : [];
        const pairs = await AsyncStorage.multiGet(valid.map((item) => DATA_PREFIX + item.id));
        const map: Record<string, Trip> = {};
        const interruptedWrites: [string, string][] = [];
        for (const [key, value] of pairs) {
          try {
            const data = value ? JSON.parse(value) : null;
            if (
              data &&
              Array.isArray(data.places) &&
              Array.isArray(data.itinerary) &&
              Array.isArray(data.restaurants) &&
              Array.isArray(data.transport)
            ) {
              const normalized = interruptRunningStages(data);
              const id = key.slice(DATA_PREFIX.length);
              map[id] = normalized;
              if (normalized !== data) interruptedWrites.push([key, JSON.stringify(normalized)]);
            }
          } catch {}
        }
        if (interruptedWrites.length) await AsyncStorage.multiSet(interruptedWrites);
        const selectedId = await AsyncStorage.getItem(SELECTED_KEY);
        if (active) {
          setTrips(valid);
          replaceMap(map);
          setCurrentId(
            valid.some((item) => item.id === selectedId) ? selectedId : (valid[0]?.id ?? null),
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
  }, [replaceMap]);

  const addTrip = useCallback(
    (input: { destination: string; startDate: Date; endDate: Date }, data?: Trip) => {
      const id = 'trip-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
      const saved = {
        id,
        destination: input.destination.trim(),
        startDateISO: localISO(input.startDate),
        endDateISO: localISO(input.endDate),
      };
      setTrips((previous) => [saved, ...previous]);
      setCurrentId(id);
      if (data) replaceMap({ ...dataRef.current, [id]: data });
      persist(async () => {
        const raw = await AsyncStorage.getItem(TRIPS_KEY);
        const previous = raw ? JSON.parse(raw) : [];
        await AsyncStorage.multiSet([
          [TRIPS_KEY, JSON.stringify([saved, ...(Array.isArray(previous) ? previous : [])])],
          ...(data ? [[DATA_PREFIX + id, JSON.stringify(data)] as [string, string]] : []),
        ]);
      });
      return id;
    },
    [persist, replaceMap],
  );

  const setTripData = useCallback(
    (id: string, data: Trip) => {
      replaceMap({ ...dataRef.current, [id]: data });
      persist(() => AsyncStorage.setItem(DATA_PREFIX + id, JSON.stringify(data)));
    },
    [persist, replaceMap],
  );

  const markStage = useCallback(
    (id: string, name: PlanningStageName, value: ReturnType<typeof stage>) =>
      updateTrip(id, (current) => mergePlanningStage(current, name, value)),
    [updateTrip],
  );

  const runStage = useCallback(
    async (id: string, name: PlanningStageName, prefs: UserPreferences) => {
      const tripData = dataRef.current[id];
      if (!tripData?.location || !tripData.planning || name === 'landmarks') return;
      controllers.current[id] ??= {};
      controllers.current[id][name]?.abort();
      const controller = new AbortController();
      controllers.current[id][name] = controller;
      markStage(id, name, stage('running'));
      try {
        if (name === 'restaurants') {
          const result = await fetchRestaurants(tripData.location, controller.signal);
          if (controller.signal.aborted || controllers.current[id]?.[name] !== controller) return;
          updateTrip(id, (current) =>
            mergePlanningStage(current, 'restaurants', stage('succeeded'), {
              restaurants: result.restaurants,
              notes:
                result.meta.cache === 'stale' && result.meta.fetchedAt
                  ? [
                      ...(current.notes ?? []).filter(
                        (note) => !note.startsWith('Restaurants use previously verified'),
                      ),
                      `Restaurants use previously verified OpenStreetMap data from ${result.meta.fetchedAt.slice(0, 10)}.`,
                    ]
                  : current.notes,
            }),
          );
        } else if (name === 'transport') {
          const result = await fetchTransport(tripData.location, controller.signal);
          if (controller.signal.aborted || controllers.current[id]?.[name] !== controller) return;
          updateTrip(id, (current) =>
            mergePlanningStage(current, 'transport', stage('succeeded'), {
              transport: result.transport,
              notes:
                result.meta.cache === 'stale' && result.meta.fetchedAt
                  ? [
                      ...(current.notes ?? []).filter(
                        (note) => !note.startsWith('Transport uses previously verified'),
                      ),
                      `Transport uses previously verified OpenStreetMap data from ${result.meta.fetchedAt.slice(0, 10)}.`,
                    ]
                  : current.notes,
            }),
          );
        } else if (name === 'ai') {
          const suggestion = await requestAiSuggestion(tripData, prefs, controller.signal);
          if (controller.signal.aborted || controllers.current[id]?.[name] !== controller) return;
          updateTrip(id, (current) =>
            mergePlanningStage(current, 'ai', stage('succeeded'), {}, { aiSuggestion: suggestion }),
          );
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        const proxy = error instanceof ProxyError ? error : null;
        markStage(
          id,
          name,
          stage('failed', {
            errorCode: proxy?.code ?? 'UPSTREAM_UNAVAILABLE',
            message:
              error instanceof Error ? error.message : 'This update is temporarily unavailable.',
            retryable: proxy?.retryable ?? true,
          }),
        );
      } finally {
        if (controllers.current[id]?.[name] === controller) delete controllers.current[id][name];
      }
    },
    [markStage, updateTrip],
  );

  const beginEnrichment = useCallback(
    (id: string, prefs: UserPreferences) => {
      void runStage(id, 'restaurants', prefs);
      void runStage(id, 'transport', prefs);
      if (dataRef.current[id]?.planning?.aiRequested) void runStage(id, 'ai', prefs);
    },
    [runStage],
  );

  const applyAiSuggestion = useCallback(
    (id: string) =>
      updateTrip(id, (current) => {
        const suggestion = current.planning?.aiSuggestion;
        if (!suggestion) return current;
        const places = new Map(current.places.map((place) => [place.id, place]));
        const selection = suggestion.days.map((day) =>
          day.placeIds.map((placeId) => places.get(placeId)).filter((place) => place != null),
        );
        return {
          ...current,
          source: 'ai',
          itinerary: buildItineraryFromSelection(selection),
          planning: {
            ...current.planning!,
            revision: current.planning!.revision + 1,
            aiSuggestion: undefined,
          },
        };
      }),
    [updateTrip],
  );

  const dismissAiSuggestion = useCallback(
    (id: string) =>
      updateTrip(id, (current) =>
        current.planning
          ? {
              ...current,
              planning: {
                ...current.planning,
                revision: current.planning.revision + 1,
                aiSuggestion: undefined,
              },
            }
          : current,
      ),
    [updateTrip],
  );

  const deleteTrip = useCallback(
    (id: string) => {
      for (const controller of Object.values(controllers.current[id] ?? {})) controller?.abort();
      delete controllers.current[id];
      setTrips((previous) => previous.filter((item) => item.id !== id));
      const map = { ...dataRef.current };
      delete map[id];
      replaceMap(map);
      setCurrentId((previous) => (previous === id ? null : previous));
      persist(async () => {
        const raw = await AsyncStorage.getItem(TRIPS_KEY);
        const list = raw ? JSON.parse(raw) : [];
        await AsyncStorage.setItem(
          TRIPS_KEY,
          JSON.stringify(list.filter((item: SavedTrip) => item.id !== id)),
        );
        await AsyncStorage.multiRemove([DATA_PREFIX + id, 'norte.note.v1:' + id]);
      });
    },
    [persist, replaceMap],
  );

  useEffect(() => {
    if (loaded && currentId) persist(() => AsyncStorage.setItem(SELECTED_KEY, currentId));
  }, [loaded, currentId, persist]);

  const selected = trips.find((item) => item.id === currentId) ?? trips[0];
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
    const current = new Date();
    const isDuringTrip = trip.id !== '' && trip.startDate <= current && trip.endDate >= current;
    const daysUntilNext = trip.id === '' || trip.endDate < current ? 30 : 0;
    void scheduleTripNotifications(trip.id !== '' ? trip : null, isDuringTrip, daysUntilNext).catch(
      () => {},
    );
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
        beginEnrichment,
        retryPlanningStage: (id, name, prefs) => void runStage(id, name, prefs),
        applyAiSuggestion,
        dismissAiSuggestion,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useTrip() {
  const context = useContext(Context);
  if (!context) throw new Error('TripProvider missing');
  return context;
}
