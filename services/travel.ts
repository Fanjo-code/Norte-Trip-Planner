import type { Trip, Place, Restaurant, UserPreferences, IoniconName } from '@/types/trip';
import { daysBetween, localISO } from '@/lib/format';
import { placeKey, validCoords } from '@/lib/places';
import { DEFAULT_PREFS } from '@/lib/preferences';
import { buildItinerary } from '@/lib/itinerary';
const BASE = process.env.EXPO_PUBLIC_PROXY_URL ?? 'http://localhost:8787';
interface Osm {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
  tags: Record<string, string>;
  rating: number | null;
  url?: string;
  wikipedia?: string;
}
export class ProxyError extends Error {
  constructor(
    message: string,
    public path: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ProxyError';
  }
}
export async function proxyFetch<T>(
  path: string,
  params: Record<string, string | number> = {},
  signal?: AbortSignal,
): Promise<T> {
  const ctrl = new AbortController();
  const abort = () => ctrl.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) ctrl.abort();
  const timer = setTimeout(abort, 55000);
  try {
    const res = await fetch(
      BASE +
        path +
        '?' +
        new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])),
      { signal: ctrl.signal },
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ProxyError(
        body.error ?? 'Travel data is temporarily unavailable.',
        path,
        res.status,
      );
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
const label = (s: string) => s.replace(/_/g, ' ').replace(/^./, (x) => x.toUpperCase());
const icon = (p: Osm): IoniconName =>
  p.tags.tourism === 'museum'
    ? 'library-outline'
    : p.tags.tourism === 'viewpoint'
      ? 'eye-outline'
      : p.tags.tourism === 'gallery' || p.tags.tourism === 'artwork'
        ? 'color-palette-outline'
        : 'location-outline';
const description = (p: Osm) =>
  p.tags['description:en'] ||
  (p.tags.opening_hours
    ? 'Opening hours: ' + p.tags.opening_hours
    : `${label(p.tags.tourism || p.tags.historic || p.tags.amenity || 'Local spot')}${p.tags['addr:street'] ? ' on ' + p.tags['addr:street'] : ''}. Open the map for more details and current opening hours.`);
function price(p: Osm) {
  if (p.tags.fee === 'no') return 0;
  const n = Number(p.tags.charge?.replace(/\s*EUR$/, ''));
  return p.tags.charge && Number.isFinite(n) ? n : null;
}
function meal(p: Osm): Restaurant['meal'] {
  return p.tags.amenity === 'cafe'
    ? 'Breakfast'
    : ['bar', 'pub'].includes(p.tags.amenity)
      ? 'Drinks'
      : p.tags.lunch === 'yes'
        ? 'Lunch'
        : 'Dinner';
}
export { buildItinerary } from '@/lib/itinerary';
export async function generateTrip(
  destination: string,
  start: Date,
  end: Date,
  prefs: UserPreferences = DEFAULT_PREFS,
  signal?: AbortSignal,
): Promise<Trip | null> {
  const geo = await proxyFetch<{ lat: number; lng: number; name: string }>(
    '/api/geocode',
    { q: destination },
    signal,
  );
  if (!validCoords(geo)) throw new Error('We could not locate that city. Try adding its country.');
  const params = { lat: geo.lat, lng: geo.lng };
  const results = await Promise.allSettled([
    proxyFetch<{ places: Osm[] }>('/api/places', { ...params, radius: 8000 }, signal),
    proxyFetch<{ restaurants: Osm[] }>('/api/restaurants', { ...params, radius: 3000 }, signal),
    proxyFetch<{ stations: Osm[]; routes: Osm[] }>(
      '/api/transport',
      { ...params, radius: 5000 },
      signal,
    ),
  ]);
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  const rawPlaces = results[0].status === 'fulfilled' ? results[0].value.places : [];
  if (!rawPlaces.length)
    throw new Error(
      'We couldn’t load enough places to build a useful journey. Please try again in a moment or try a nearby city.',
    );
  const unique = new Set<string>();
  const places: Place[] = rawPlaces
    .filter((p) => {
      const k = placeKey(p.name);
      if (!validCoords(p) || !k || unique.has(k)) return false;
      unique.add(k);
      return true;
    })
    .slice(0, 50)
    .map((p) => ({
      id: p.id,
      name: p.name,
      category: label(p.tags.tourism || p.tags.historic || 'Attraction'),
      rating: p.rating ?? null,
      timeToSpend: p.tags.tourism === 'museum' ? 'Allow ~2 hours' : 'Allow ~1 hour',
      description: description(p),
      price: price(p),
      icon: icon(p),
      url: p.url,
      lat: p.lat,
      lng: p.lng,
    }));
  const rawRestaurants = results[1].status === 'fulfilled' ? results[1].value.restaurants : [];
  const restaurants: Restaurant[] = rawRestaurants.filter(validCoords).map((r) => ({
    id: r.id,
    name: r.name,
    cuisine: label((r.tags.cuisine || r.tags.amenity || 'Local').replace(/;/g, ' · ')),
    meal: meal(r),
    rating: r.rating ?? null,
    priceLevel: /^[1-3]$/.test(r.tags.price_range) ? Number(r.tags.price_range) : null,
    neighborhood: r.tags['addr:suburb'] || r.tags['addr:street'] || geo.name,
    description: description(r),
    icon:
      r.tags.amenity === 'cafe'
        ? 'cafe-outline'
        : ['bar', 'pub'].includes(r.tags.amenity)
          ? 'wine-outline'
          : 'restaurant-outline',
    url: r.url,
    lat: r.lat,
    lng: r.lng,
  }));
  const transit = results[2].status === 'fulfilled' ? results[2].value.stations : [];
  const transport: Trip['transport'] = transit.slice(0, 4).map((p) => ({
    id: p.id,
    name: p.name,
    icon: 'train-outline',
    description: label(p.tags.station || p.tags.railway || 'Public transport'),
    bestFor: 'Around the city',
    cost: 'Check local fares',
    url: p.url,
  }));
  transport.unshift({
    id: 'walking',
    name: 'Take the scenic route',
    icon: 'walk-outline',
    description:
      'Nearby sights are grouped together in your itinerary. Open each day’s route for walking directions.',
    bestFor: 'Neighbourhood exploring',
    cost: 'On foot',
    isRecommended: true,
    url: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(geo.name),
  });
  const notes: string[] = [];
  if (!restaurants.length)
    notes.push(
      'Restaurant information is temporarily unavailable. Your city sights are ready to explore.',
    );
  if (!transit.length)
    notes.push('Transit information is limited. Check local operators before travelling.');
  return {
    destination: geo.name,
    currency: 'EUR',
    dailyBudget: prefs.budget === 'budget' ? 35 : prefs.budget === 'premium' ? 90 : 55,
    places,
    restaurants,
    transport,
    itinerary: buildItinerary(daysBetween(start, end), places, restaurants, geo.name, prefs),
    source: 'live',
    notes,
    createdAt: localISO(new Date()),
  };
}
