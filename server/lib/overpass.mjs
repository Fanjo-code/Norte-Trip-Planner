import { cachedWithMeta, fetchJson, ProviderError } from './http.mjs';
import { AppError } from './errors.mjs';

const endpoints = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass-api.de/api/interpreter',
];
const health = new Map(endpoints.map((endpoint) => [endpoint, { failures: 0, retryAt: 0 }]));
let optionalQueue = Promise.resolve();

const logAttempt = (details) => console.log(JSON.stringify({ scope: 'overpass', ...details }));

function orderedEndpoints() {
  const now = Date.now();
  const ready = endpoints.filter((endpoint) => {
    const h = health.get(endpoint);
    return !h || h.retryAt <= now;
  });
  return ready.length ? ready : endpoints;
}

async function providerQuery(query, stage) {
  const started = Date.now();
  let lastError;
  for (const endpoint of orderedEndpoints()) {
    if (Date.now() - started >= 38000) break;
    const attemptStarted = Date.now();
    try {
      const data = await fetchJson(
        endpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            'User-Agent': 'NorteTripPlanner/1.0 (https://github.com/Fanjo-code/norte-trip-planner)',
          },
          body: new URLSearchParams({ data: query }),
        },
        Math.min(12000, Math.max(1000, 38000 - (Date.now() - started))),
      );
      if (!Array.isArray(data.elements) || (data.remark && !data.elements.length))
        throw new ProviderError('Overpass returned an unusable response.');
      health.set(endpoint, { failures: 0, retryAt: 0 });
      logAttempt({
        stage,
        endpoint: new URL(endpoint).host,
        ok: true,
        elapsedMs: Date.now() - attemptStarted,
      });
      return { elements: data.elements, provider: new URL(endpoint).host };
    } catch (error) {
      lastError = error;
      const failures = health.get(endpoint).failures + 1;
      health.set(endpoint, { failures, retryAt: failures >= 2 ? Date.now() + 60000 : 0 });
      logAttempt({
        stage,
        endpoint: new URL(endpoint).host,
        ok: false,
        code: error.code || 'UPSTREAM_UNAVAILABLE',
        elapsedMs: Date.now() - attemptStarted,
      });
    }
  }
  throw new AppError(
    lastError?.code === 'UPSTREAM_TIMEOUT' ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE',
    stage,
    stage === 'landmarks'
      ? 'Landmark services did not respond in time. Your trip details are still here—please retry.'
      : `Verified ${stage} data is temporarily unavailable.`,
    { cause: lastError },
  );
}

async function run(query, { stage, freshMs, staleMs, allowEmpty = false, optional = false }) {
  const execute = () =>
    cachedWithMeta(
      'osm:' + query,
      {
        freshMs,
        staleMs,
        validate: (value) =>
          value && Array.isArray(value.elements) && (allowEmpty || value.elements.length > 0),
      },
      () => providerQuery(query, stage),
    );
  if (!optional) return execute();
  const job = optionalQueue.then(execute, execute);
  optionalQueue = job.catch(() => {});
  return job;
}

function normalize(el, type) {
  const tags = el.tags ?? {};
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  return {
    id: type + '-' + el.type + '-' + el.id,
    name: tags['name:en'] || tags.name,
    lat,
    lng,
    tags,
    rating: tags.rating && Number(tags.rating) <= 5 ? Number(tags.rating) : null,
    url: 'https://www.google.com/maps/search/?api=1&query=' + lat + ',' + lng,
    wikipedia: tags.wikipedia ?? null,
  };
}

function unique(elements, type) {
  const seen = new Set();
  return elements
    .map((el) => normalize(el, type))
    .filter((place) => {
      const key = place.name
        ?.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]/gu, '');
      if (!key || seen.has(key) || !Number.isFinite(place.lat) || !Number.isFinite(place.lng))
        return false;
      seen.add(key);
      return true;
    });
}

const metadata = (result, count) => ({
  source: 'openstreetmap',
  cache: result.meta.cache,
  fetchedAt: new Date(result.meta.fetchedAt).toISOString(),
  provider: result.data.provider,
  count,
});

export async function getPlaces(lat, lng, radius = 8000) {
  const query = `[out:json][timeout:10];(nwr["tourism"~"attraction|museum|viewpoint|gallery|zoo|aquarium"]["name"](around:${radius},${lat},${lng});nwr["historic"~"castle|monument|ruins|palace"]["name"](around:${radius},${lat},${lng}););out center 500;`;
  const result = await run(query, {
    stage: 'landmarks',
    freshMs: 7 * 86400000,
    staleMs: 90 * 86400000,
  });
  const score = (place) =>
    (place.tags.wikipedia ? 80 : 0) +
    (place.tags.tourism === 'museum' ? 35 : place.tags.tourism === 'attraction' ? 45 : 20) +
    (place.tags.website ? 10 : 0);
  const places = unique(result.data.elements, 'place')
    .sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))
    .slice(0, 50);
  if (!places.length)
    throw new AppError(
      'NO_RESULTS',
      'landmarks',
      'No verified landmarks were found for this location.',
      {
        status: 404,
        retryable: false,
      },
    );
  return { places, meta: metadata(result, places.length) };
}

function pickRestaurants(result) {
  const score = (place) =>
    (place.tags.website ? 10 : 0) +
    (place.tags.cuisine ? 10 : 0) +
    (place.tags.opening_hours ? 5 : 0);
  const pick = (types, count) =>
    result
      .filter((place) => types.includes(place.tags.amenity))
      .sort((a, b) => score(b) - score(a))
      .slice(0, count);
  return [...pick(['cafe'], 5), ...pick(['restaurant'], 12), ...pick(['bar', 'pub'], 5)];
}

export async function getRestaurants(lat, lng, radius = 3000) {
  const deltaLat = Math.min(radius, 2000) / 111320;
  const deltaLng = deltaLat / Math.max(0.1, Math.cos((lat * Math.PI) / 180));
  const bounds = [lat - deltaLat, lng - deltaLng, lat + deltaLat, lng + deltaLng]
    .map((number) => number.toFixed(4))
    .join(',');
  const query = `[out:json][timeout:10];node["amenity"~"^(restaurant|cafe|bar|pub)$"]["name"](${bounds});out 300;`;
  const result = await run(query, {
    stage: 'restaurants',
    freshMs: 86400000,
    staleMs: 30 * 86400000,
    allowEmpty: true,
    optional: true,
  });
  const restaurants = pickRestaurants(
    unique(result.data.elements, 'restaurant').filter(
      (place) =>
        !/mcdonald|burger king|starbucks|kfc|subway|domino|pizza hut/i.test(
          place.name + ' ' + (place.tags.brand ?? ''),
        ),
    ),
  );
  return { restaurants, meta: metadata(result, restaurants.length) };
}

export async function getTransport(lat, lng, radius = 5000) {
  const query = `[out:json][timeout:10];node["railway"~"station|halt|tram_stop"]["name"](around:${radius},${lat},${lng});out 30;`;
  const result = await run(query, {
    stage: 'transport',
    freshMs: 7 * 86400000,
    staleMs: 90 * 86400000,
    allowEmpty: true,
    optional: true,
  });
  const stations = unique(result.data.elements, 'transport');
  return { stations, routes: [], meta: metadata(result, stations.length) };
}

export function resetEndpointHealth() {
  for (const endpoint of endpoints) health.set(endpoint, { failures: 0, retryAt: 0 });
}
