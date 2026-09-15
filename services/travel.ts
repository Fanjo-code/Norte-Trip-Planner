/**
 * Real travel data service.
 * Calls the local Norte travel-data proxy (server/index.mjs) which aggregates
 * free APIs: Nominatim, Overpass/OSM, Open-Meteo.
 * Returns a normalized Trip object with REAL data. No flights or stays.
 */

import type { Trip, DayPlan, Activity, Place, Restaurant, TransportOption, IoniconName, UserPreferences, BudgetTier } from '@/types/trip';
import { daysBetween, nightsBetween } from '@/lib/format';
import { DEFAULT_PREFS } from '@/contexts/preferences-context';

const PROXY_URL = process.env.EXPO_PUBLIC_PROXY_URL ?? 'http://localhost:8787';

/** Normalized OSM element from proxy (after overpass.mjs normalize()) */
interface OsmElement {
  id: string;  // e.g., "place-node-123"
  name: string;
  category: string;
  lat: number | undefined;
  lng: number | undefined;
  tags: Record<string, string>;
  rating: number | null;
  url: string | undefined;
  wikipedia: string | null;
}

/** Normalized OSM response from proxy */
interface ProxyPlacesResponse { places: OsmElement[] }
interface ProxyRestaurantsResponse { restaurants: OsmElement[] }
interface ProxyTransportResponse { stations: OsmElement[]; routes: OsmElement[] }
interface ProxyWeatherResponse { weather: any[] }
interface ProxyGeocodeResponse { lat: number; lng: number; name: string; countryCode?: string }

// Ionicons for OSM amenity/tourism tags
const AMENITY_ICONS: Record<string, string> = {
  restaurant: 'restaurant', cafe: 'cafe', bar: 'wine', pub: 'beer',
  fast_food: 'fast-food', food_court: 'fast-food', ice_cream: 'ice-cream',
};

const TOURISM_ICONS: Record<string, string> = {
  attraction: 'eye', museum: 'library', artwork: 'color-palette',
  gallery: 'images', viewpoint: 'eye', zoo: 'paw', aquarium: 'fish',
  theme_park: 'happy',
};

const TRANSPORT_ICONS: Record<string, string> = {
  subway: 'subway', light_rail: 'train', train: 'train', bus: 'bus',
  tram: 'tram', ferry: 'boat', airport: 'airplane',
};

// Interest → place-category hints. Used to order itinerary picks toward what the
// traveler likes (never drops places — the Places tab stays comprehensive).
const INTEREST_CATEGORY_HINTS: Record<string, RegExp> = {
  art: /museum|gallery|artwork|art/,
  food: /restaurant|cafe|market|food/,
  history: /historic|castle|palace|monument|ruin|fort|memorial|temple|cathedral|church/,
  nature: /park|garden|beach|nature|zoo|botanical|island/,
  nightlife: /bar|club|nightlife/,
  shopping: /market|shop|mall|boutique|department/,
  architecture: /architecture|building|bridge|tower|square|facade|opera/,
  views: /viewpoint|view|panorama|observation|belvedere|mirador/,
};

let idCounter = 0;
function uid(): string {
  return `live-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;
}

/** Error class for proxy failures with context */
export class ProxyError extends Error {
  constructor(
    message: string,
    public readonly path: string,
    public readonly status: number,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ProxyError';
  }
}

/** Cache for in-flight requests to deduplicate parallel calls */
const inflightCache = new Map<string, Promise<any>>();

async function proxyFetch<T = any>(path: string, params: Record<string, any>): Promise<T> {
  const search = new URLSearchParams(
    Object.entries(params)
      .filter(([_, v]) => v != null && v !== '')
      .map(([k, v]) => [k, String(v)])
  ).toString();

  const cacheKey = `${path}?${search}`;

  // Return in-flight request if already pending
  const existing = inflightCache.get(cacheKey);
  if (existing) {
    console.log('[Travel] Deduplicated:', cacheKey);
    return existing as Promise<T>;
  }

  const url = `${PROXY_URL}${path}?${search}`;
  console.log('[Travel] Fetching:', url);

  const promise = (async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new ProxyError(`Proxy ${res.status} for ${path}`, path, res.status);
      }
      return res.json() as Promise<T>;
    } finally {
      inflightCache.delete(cacheKey);
    }
  })();

  inflightCache.set(cacheKey, promise);
  return promise;
}

/** Map OSM amenity/tourism to Ionicons name */
function iconForOsm(tags: Record<string, string>, type: string): IoniconName {
  if (type === 'restaurant') {
    const amenity = tags.amenity;
    return (AMENITY_ICONS[amenity] || 'restaurant') as IoniconName;
  }
  if (type === 'place') {
    const tourism = tags.tourism;
    return (TOURISM_ICONS[tourism] || 'location') as IoniconName;
  }
  if (type === 'transport') {
    const station = tags.station;
    return (TRANSPORT_ICONS[station] || 'bus') as IoniconName;
  }
  return 'ellipse-outline' as IoniconName;
}

/** Build a Trip from real API data */
export async function generateTrip(
  destination: string,
  startDate: Date,
  endDate: Date,
  prefs: UserPreferences = DEFAULT_PREFS
): Promise<Trip | null> {
  const startISO = startDate.toISOString().slice(0, 10);
  const endISO = endDate.toISOString().slice(0, 10);
  const days = daysBetween(startDate, endDate);
  const nights = nightsBetween(startDate, endDate);

  try {
    // 1. Geocode destination → lat/lng
    const geo = await proxyFetch('/api/geocode', { q: destination });
    const { lat, lng, name: geoName, countryCode } = geo;
    if (lat == null || lng == null) throw new Error('Geocoding failed');

    // 2. Fetch all real data in parallel
    const [placesRes, restaurantsRes, transportRes, weatherRes] = await Promise.all([
      proxyFetch<ProxyPlacesResponse>('/api/places', { lat, lng, radius: 8000 }),
      proxyFetch<ProxyRestaurantsResponse>('/api/restaurants', { lat, lng, radius: 2000 }),
      proxyFetch<ProxyTransportResponse>('/api/transport', { lat, lng, radius: 5000 }),
      proxyFetch<ProxyWeatherResponse>('/api/weather', { lat, lng, startDate: startISO, endDate: endISO }),
    ]);

    const places: OsmElement[] = placesRes.places || [];
    const restaurants: OsmElement[] = restaurantsRes.restaurants || [];
    const transport = transportRes || { stations: [], routes: [] };
    const weather: any[] = weatherRes.weather || [];

    // 3. Normalize to Trip types
    const normalizedPlaces: Place[] = places.slice(0, 100).map((p) => ({
      id: p.id,
      name: p.name,
      category: p.tags?.tourism || 'Attraction',
      rating: p.rating ?? estimateRating(p),
      timeToSpend: estimateDuration(p),
      description: buildDescription(p, destination),
      price: 0,
      icon: iconForOsm(p.tags, 'place'),
      url: p.url ?? undefined,
      lat: p.lat,
      lng: p.lng,
    }));

    const normalizedRestaurants: Restaurant[] = restaurants.slice(0, 12).map((r) => ({
      id: r.id,
      name: r.name,
      cuisine: r.tags?.cuisine || detectCuisine(r),
      meal: guessMeal(r),
      rating: r.rating ?? estimateRating(r),
      priceLevel: estimatePriceLevel(r),
      neighborhood: r.tags?.['addr:suburb'] || r.tags?.['addr:city'] || 'City centre',
      description: buildDescription(r, destination),
      icon: iconForOsm(r.tags, 'restaurant'),
      isMustTry: false,
      url: r.url ?? undefined,
    }));

    const normalizedTransport: TransportOption[] = [
      ...transport.stations.slice(0, 4).map((s) => ({
        id: s.id,
        name: s.name,
        icon: iconForOsm(s.tags, 'transport'),
        description: s.tags?.station ? `${s.tags.station.charAt(0).toUpperCase() + s.tags.station.slice(1)} station — ${s.name}` : s.name,
        bestFor: s.tags?.station || 'Transit',
        cost: getTransportCost(s.tags?.station),
        isRecommended: false,
        url: buildTransportUrl(s.tags?.station, destination),
      })),
      ...transport.routes.slice(0, 2).map((r) => ({
        id: r.id,
        name: r.tags?.ref || r.name || 'Line',
        icon: iconForOsm(r.tags, 'transport'),
        description: `Route ${r.tags?.ref || ''} — ${r.tags?.to || r.name}`,
        bestFor: r.tags?.to || 'Transit',
        cost: getTransportCost(r.tags?.station || r.tags?.route),
        isRecommended: false,
        url: buildTransportUrl(r.tags?.route || r.tags?.station, destination),
      })),
    ];
    if (normalizedTransport.length === 0) {
      normalizedTransport.push({
        id: uid(),
        name: 'Walking',
        icon: 'walk',
        description: 'Explore the city centre on foot — most attractions are walkable.',
        bestFor: 'Central sightseeing',
        cost: 'Free',
        isRecommended: true,
        url: `https://www.google.com/maps/search/${encodeURIComponent(destination)}+walking+tours`,
      });
    } else {
      normalizedTransport[0].isRecommended = true;
    }

    // 4. Build itinerary from real places + restaurants, personalized by prefs
    const itinerary: DayPlan[] = buildItinerary(
      days,
      normalizedPlaces,
      normalizedRestaurants,
      destination,
      prefs
    );

    // 5. Daily budget estimate from the traveler's budget style
    const dailyBudget = estimateDailyBudget(prefs.budget);

    const trip: Trip = {
      destination: geoName || destination,
      currency: 'EUR',
      dailyBudget,
      itinerary,
      restaurants: normalizedRestaurants,
      places: normalizedPlaces,
      transport: normalizedTransport,
      source: 'live',
    };

    return trip;
  } catch (err) {
    console.error('[Travel] Generation failed:', err);
    return null;
  }
}

// --- Helpers ---

/** Default time/order map uses only `timeSlots`; removed the unused `slotTitles`. */
function buildItinerary(
  days: number,
  places: Place[],
  restaurants: Restaurant[],
  destination: string,
  prefs: UserPreferences = DEFAULT_PREFS,
): DayPlan[] {
  const timeSlots = ['09:00', '11:30', '13:30', '15:30', '18:00', '20:30'];

  // Pace → places/day: relaxed 2, balanced 3, packed 4.
  const perDay = prefs.pace === 'relaxed' ? 2 : prefs.pace === 'packed' ? 4 : 3;

  // Order places so interest-matched categories surface first in the itinerary
  // (non-matching places still appear — the list stays comprehensive).
  const reorderedPlaces = orderPlacesByInterests(places, prefs.interests);

  // Budget style → restaurant priceLevel filter (1=cheap … 3=pricey).
  const budgetFiltered = restaurants.filter((r) => {
    if (prefs.budget === 'budget') return r.priceLevel <= 2;
    if (prefs.budget === 'premium') return r.priceLevel >= 2;
    return true;
  });
  const restaurantPool = budgetFiltered.length > 0 ? budgetFiltered : restaurants;

  const itinerary: DayPlan[] = [];
  for (let d = 1; d <= days; d++) {
    const activities: Activity[] = [];
    const placesForDay = reorderedPlaces.slice((d - 1) * perDay, (d - 1) * perDay + perDay);
    const restaurantsForDay = restaurantPool.slice((d - 1) * 2, (d - 1) * 2 + 2);

    let slotIdx = 0;
    for (const p of placesForDay) {
      if (slotIdx >= timeSlots.length) break;
      activities.push({
        id: uid(),
        time: timeSlots[slotIdx],
        title: p.name,
        place: p.category,
        description: p.description,
        icon: p.icon,
        price: p.price,
        lat: p.lat,
        lng: p.lng,
        url: p.url,
      });
      slotIdx++;
    }

    for (const r of restaurantsForDay) {
      if (slotIdx >= timeSlots.length) break;
      activities.push({
        id: uid(),
        time: timeSlots[slotIdx],
        title: `Eat at ${r.name}`,
        place: r.neighborhood,
        description: r.description,
        icon: r.icon,
        price: r.priceLevel * 15,
        lat: r.lat,
        lng: r.lng,
        url: r.url,
      });
      slotIdx++;
    }

    if (activities.length === 0) {
      activities.push({
        id: uid(),
        time: '10:00',
        title: `Explore ${destination}`,
        place: 'City centre',
        description: 'Wander and discover the local atmosphere.',
        icon: 'walk',
        price: 0,
      });
    }

    itinerary.push({
      day: d,
      title: `Day ${d} in ${destination}`,
      activities,
    });
  }
  return itinerary;
}

/** Stable-sort places so interest-matched categories come first (interests optional). */
function orderPlacesByInterests(places: Place[], interests: string[]): Place[] {
  if (interests.length === 0) return places;
  const score = (p: Place): number => {
    const hay = `${p.name} ${p.category} ${p.description ?? ''}`.toLowerCase();
    let s = 0;
    for (const it of interests) {
      const re = INTEREST_CATEGORY_HINTS[it];
      if (re && re.test(hay)) s++;
    }
    return s;
  };
  return [...places].sort((a, b) => score(b) - score(a));
}

function estimateRating(item: any): number {
  // OSM has no ratings; estimate from tags/popularity
  if (item.tags?.wikidata) return 4.5;
  if (item.tags?.website) return 4.2;
  return 4.0;
}

function estimateDuration(p: any): string {
  const tourism = p.tags?.tourism;
  if (tourism === 'museum' || tourism === 'gallery' || tourism === 'artwork') return '2 h';
  if (tourism === 'zoo' || tourism === 'aquarium' || tourism === 'theme_park') return 'Half day';
  if (tourism === 'viewpoint' || tourism === 'attraction') return '1 h';
  return '1.5 h';
}

function buildDescription(item: any, destination: string): string {
  const parts = [];
  if (item.tags?.description) parts.push(item.tags.description);
  if (item.tags?.opening_hours) parts.push(`Open: ${item.tags.opening_hours}`);

  if (parts.length === 0) {
    const type = item.tags?.tourism || item.tags?.amenity || 'spot';
    const capitalized = type.charAt(0).toUpperCase() + type.slice(1);
    parts.push(`A popular ${capitalized.toLowerCase()} in ${destination}.`);
  }

  if (item.wikipedia) parts.push(`Learn more: ${item.wikipedia}`);
  return parts.join(' · ');
}

function detectCuisine(r: any): string {
  if (r.tags?.cuisine) return r.tags.cuisine.charAt(0).toUpperCase() + r.tags.cuisine.slice(1);
  if (r.tags?.amenity === 'cafe') return 'Café';
  if (r.tags?.amenity === 'bar') return 'Bar';
  if (r.tags?.amenity === 'pub') return 'Pub';
  if (r.tags?.amenity === 'fast_food') return 'Fast food';
  return 'Local';
}

function guessMeal(r: any): 'Breakfast' | 'Lunch' | 'Dinner' | 'Drinks' {
  const amenity = r.tags?.amenity;
  if (amenity === 'cafe') return 'Breakfast';
  if (amenity === 'bar' || amenity === 'pub') return 'Drinks';
  if (amenity === 'fast_food') return 'Lunch';
  return 'Dinner';
}

function estimatePriceLevel(r: any): number {
  // Estimate from OSM tags if available
  if (r.tags?.price_range) {
    const range = r.tags.price_range;
    if (range === '1') return 1;
    if (range === '2') return 2;
    if (range === '3' || range === '4') return 3;
  }
  return 2;
}

function getTransportCost(stationType?: string): string {
  const costs: Record<string, string> = {
    subway: '€1.50–2.00 / ride',
    train: '€2.00–5.00 / ride',
    light_rail: '€1.50–2.50 / ride',
    tram: '€1.50–2.00 / ride',
    bus: '€1.50–2.00 / ride',
    ferry: '€2.50–5.00 / ride',
    airport: '€5–15 to city',
    taxi: '€8–15 / ride',
  };
  return costs[stationType?.toLowerCase() || ''] || 'Varies';
}

function buildTransportUrl(type?: string, destination?: string): string {
  const base = 'https://www.google.com/maps/search/';
  const queries: Record<string, string> = {
    subway: `${destination}+metro+subway`,
    train: `${destination}+train+station`,
    light_rail: `${destination}+light+rail+tram`,
    tram: `${destination}+tram`,
    bus: `${destination}+bus+station`,
    ferry: `${destination}+ferry`,
    airport: `${destination}+airport`,
    taxi: `${destination}+taxi`,
  };
  return `${base}${encodeURIComponent(queries[type?.toLowerCase() || ''] || `${destination}+transport`)}`;
}

/** Daily spend by budget style (meals + local transport) in EUR. */
function estimateDailyBudget(budget: BudgetTier): number {
  return budget === 'budget' ? 35 : budget === 'premium' ? 90 : 55;
}