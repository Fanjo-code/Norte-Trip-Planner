import type {
  IoniconName,
  LocationIdentity,
  PlanningStage,
  Restaurant,
  Trip,
  UserPreferences,
  Place,
} from '@/types/trip';
import { daysBetween, localISO } from '@/lib/format';
import { placeKey, validCoords } from '@/lib/places';
import { DEFAULT_PREFS } from '@/lib/preferences';
import { buildItinerary } from '@/lib/itinerary';

const BASE = (process.env.EXPO_PUBLIC_PROXY_URL ?? 'http://localhost:8787').replace(/\/$/, '');

interface Osm {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
  tags: Record<string, string>;
  rating: number | null;
  url?: string;
}
interface ApiErrorBody {
  error?: {
    code?: string;
    stage?: string;
    message?: string;
    retryable?: boolean;
    requestId?: string;
  };
}
interface ApiResponse<T> {
  data: T;
  meta: {
    requestId?: string;
    source?: string;
    cache?: 'fresh' | 'stale' | 'miss';
    fetchedAt?: string;
    elapsedMs?: number;
    count?: number;
  };
}

export class ProxyError extends Error {
  constructor(
    message: string,
    public path: string,
    public status: number,
    public code = 'UPSTREAM_UNAVAILABLE',
    public stage = 'landmarks',
    public retryable = true,
    public requestId?: string,
  ) {
    super(message);
    this.name = 'ProxyError';
  }
}

function stageForPath(path: string) {
  if (path.includes('geocode')) return 'geocode';
  if (path.includes('restaurants')) return 'restaurants';
  if (path.includes('transport')) return 'transport';
  if (path.includes('ai-plan')) return 'ai';
  return 'landmarks';
}

export async function proxyFetch<T>(
  path: string,
  params: Record<string, string | number> = {},
  signal?: AbortSignal,
  timeoutMs = 45000,
): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, timeoutMs);
  try {
    const query = new URLSearchParams(
      Object.entries(params).map(([key, value]) => [key, String(value)]),
    );
    const response = await fetch(BASE + path + (query.size ? '?' + query : ''), {
      signal: controller.signal,
    });
    const body = (await response.json().catch(() => ({}))) as ApiResponse<T> & ApiErrorBody;
    if (!response.ok) {
      const error = body.error;
      throw new ProxyError(
        error?.message ?? 'Travel data is temporarily unavailable.',
        path,
        response.status,
        error?.code,
        error?.stage,
        error?.retryable,
        error?.requestId,
      );
    }
    if (!body.data) throw new ProxyError('The server returned an invalid response.', path, 502);
    return body;
  } catch (error) {
    if (error instanceof ProxyError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError' && !signal?.aborted)
      throw new ProxyError(
        'This planning stage timed out. Please retry.',
        path,
        504,
        'UPSTREAM_TIMEOUT',
        stageForPath(path),
      );
    if (
      (error instanceof DOMException && error.name === 'AbortError') ||
      (error as Error).name === 'FetchRequestCanceledException' ||
      (error as Error).message?.startsWith('Fetch request has been canceled')
    )
      throw new DOMException('Cancelled', 'AbortError');
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

const label = (value: string) =>
  value.replace(/_/g, ' ').replace(/^./, (first) => first.toUpperCase());
const icon = (place: Osm): IoniconName =>
  place.tags.tourism === 'museum'
    ? 'library-outline'
    : place.tags.tourism === 'viewpoint'
      ? 'eye-outline'
      : place.tags.tourism === 'gallery' || place.tags.tourism === 'artwork'
        ? 'color-palette-outline'
        : 'location-outline';
const description = (place: Osm) =>
  place.tags['description:en'] ||
  (place.tags.opening_hours
    ? 'Opening hours: ' + place.tags.opening_hours
    : `${label(place.tags.tourism || place.tags.historic || place.tags.amenity || 'Local spot')}${place.tags['addr:street'] ? ' on ' + place.tags['addr:street'] : ''}. Check the map for current details.`);
function price(place: Osm) {
  if (place.tags.fee === 'no') return 0;
  const amount = Number(place.tags.charge?.replace(/\s*EUR$/, ''));
  return place.tags.charge && Number.isFinite(amount) ? amount : null;
}
function meal(place: Osm): Restaurant['meal'] {
  return place.tags.amenity === 'cafe'
    ? 'Breakfast'
    : ['bar', 'pub'].includes(place.tags.amenity)
      ? 'Drinks'
      : place.tags.lunch === 'yes'
        ? 'Lunch'
        : 'Dinner';
}
const now = () => localISO(new Date()) + 'T' + new Date().toTimeString().slice(0, 8);
export const stage = (
  state: PlanningStage['state'],
  extra: Partial<PlanningStage> = {},
): PlanningStage => ({ state, updatedAt: new Date().toISOString(), ...extra });

export async function searchCities(query: string, signal?: AbortSignal) {
  return (
    await proxyFetch<{ results: LocationIdentity[] }>(
      '/api/geocode',
      { q: query.trim() },
      signal,
      15000,
    )
  ).data.results;
}

function mapPlaces(rawPlaces: Osm[]) {
  const seen = new Set<string>();
  return rawPlaces
    .filter((place) => {
      const key = placeKey(place.name);
      if (!validCoords(place) || !key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 50)
    .map<Place>((place) => {
      const durationMinutes = place.tags.tourism === 'museum' ? 120 : 60;
      return {
        id: place.id,
        name: place.name,
        category: label(place.tags.tourism || place.tags.historic || 'Attraction'),
        rating: place.rating ?? null,
        timeToSpend: durationMinutes === 120 ? 'Allow ~2 hours' : 'Allow ~1 hour',
        durationMinutes,
        description: description(place),
        price: price(place),
        icon: icon(place),
        url: place.url,
        lat: place.lat,
        lng: place.lng,
      };
    });
}

export async function createCoreTrip(
  location: LocationIdentity,
  start: Date,
  end: Date,
  prefs: UserPreferences = DEFAULT_PREFS,
  aiRequested = false,
  signal?: AbortSignal,
): Promise<Trip> {
  const response = await proxyFetch<{ places: Osm[] }>(
    '/api/places',
    { lat: location.lat, lng: location.lng, radius: 8000 },
    signal,
    45000,
  );
  const places = mapPlaces(response.data.places);
  if (!places.length)
    throw new ProxyError(
      'No verified landmarks were found for this location.',
      '/api/places',
      404,
      'NO_RESULTS',
      'landmarks',
      false,
    );
  const notes =
    response.meta.cache === 'stale' && response.meta.fetchedAt
      ? [
          `Landmarks use previously verified OpenStreetMap data from ${response.meta.fetchedAt.slice(0, 10)}.`,
        ]
      : [];
  return {
    destination: location.name,
    location,
    currency: null,
    dailyBudget: null,
    places,
    restaurants: [],
    transport: [walkingTransport(location)],
    itinerary: buildItinerary(daysBetween(start, end), places, [], location.name, prefs),
    source: 'live',
    notes,
    createdAt: now(),
    planning: {
      version: 2,
      revision: 1,
      aiRequested,
      stages: {
        landmarks: stage('succeeded'),
        restaurants: stage('idle'),
        transport: stage('idle'),
        ai: stage(aiRequested ? 'idle' : 'succeeded'),
      },
    },
  };
}

function walkingTransport(location: LocationIdentity): Trip['transport'][number] {
  return {
    id: 'walking',
    name: 'Take the scenic route',
    icon: 'walk-outline',
    description: 'Nearby sights are grouped together. Open each day for walking directions.',
    bestFor: 'Neighbourhood exploring',
    cost: 'On foot',
    isRecommended: true,
    url:
      'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(location.displayName),
  };
}

export async function fetchRestaurants(location: LocationIdentity, signal?: AbortSignal) {
  const response = await proxyFetch<{ restaurants: Osm[] }>(
    '/api/restaurants',
    { lat: location.lat, lng: location.lng, radius: 3000 },
    signal,
  );
  const restaurants = response.data.restaurants.filter(validCoords).map<Restaurant>((place) => ({
    id: place.id,
    name: place.name,
    cuisine: label((place.tags.cuisine || place.tags.amenity || 'Local').replace(/;/g, ' · ')),
    meal: meal(place),
    rating: place.rating ?? null,
    priceLevel: /^[1-3]$/.test(place.tags.price_range) ? Number(place.tags.price_range) : null,
    neighborhood: place.tags['addr:suburb'] || place.tags['addr:street'] || location.name,
    description: description(place),
    icon:
      place.tags.amenity === 'cafe'
        ? 'cafe-outline'
        : ['bar', 'pub'].includes(place.tags.amenity)
          ? 'wine-outline'
          : 'restaurant-outline',
    url: place.url,
    lat: place.lat,
    lng: place.lng,
  }));
  return { restaurants, meta: response.meta };
}

export async function fetchTransport(location: LocationIdentity, signal?: AbortSignal) {
  const response = await proxyFetch<{ stations: Osm[]; routes: Osm[] }>(
    '/api/transport',
    { lat: location.lat, lng: location.lng, radius: 5000 },
    signal,
  );
  const transport: Trip['transport'] = response.data.stations.slice(0, 4).map((place) => ({
    id: place.id,
    name: place.name,
    icon: 'train-outline',
    description: label(place.tags.station || place.tags.railway || 'Public transport'),
    bestFor: 'Around the city',
    cost: 'Check local fares',
    url: place.url,
  }));
  return { transport: [walkingTransport(location), ...transport], meta: response.meta };
}

// Compatibility entry point for existing callers and tests. New UI resolves the city first.
export async function generateTrip(
  destination: string,
  start: Date,
  end: Date,
  prefs: UserPreferences = DEFAULT_PREFS,
  signal?: AbortSignal,
) {
  const locations = await searchCities(destination, signal);
  if (!locations[0]) throw new Error('No matching city was found.');
  return createCoreTrip(locations[0], start, end, prefs, false, signal);
}

export { buildItinerary } from '@/lib/itinerary';
