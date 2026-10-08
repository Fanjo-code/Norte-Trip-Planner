import { cachedWithMeta, fetchJson } from './http.mjs';
import { AppError } from './errors.mjs';

const ENDPOINTS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://private.coffee/api/interpreter',
];

const health = new Map();
let optionalStageQueue = Promise.resolve();

export function resetEndpointHealth() {
  health.clear();
  optionalStageQueue = Promise.resolve();
}

function endpointFor(purpose) {
  return ENDPOINTS;
}

function buildPlacesQuery(lat, lng, radius) {
  return `[out:json][timeout:15];(
    node["tourism"~"museum|viewpoint|gallery|artwork"](around:${radius},${lat},${lng});
    way["tourism"~"museum|viewpoint|gallery|artwork"](around:${radius},${lat},${lng});
    relation["tourism"~"museum|viewpoint|gallery|artwork"](around:${radius},${lat},${lng});
    node["historic"](around:${radius},${lat},${lng});
    way["historic"](around:${radius},${lat},${lng});
    relation["historic"](around:${radius},${lat},${lng});
    node["leisure"="park"](around:${radius},${lat},${lng});
    way["leisure"="park"](around:${radius},${lat},${lng});
    node["building"="church"](around:${radius},${lat},${lng});
    way["building"="church"](around:${radius},${lat},${lng});
    node["tourism"="garden"](around:${radius},${lat},${lng});
    way["tourism"="garden"](around:${radius},${lat},${lng});
  );out center;`;
}

function mapPlace(el, lat, lng) {
  return {
    id: 'overpass-' + el.type + '-' + el.id,
    name: el.tags?.name || 'Verified place',
    lat: el.lat ?? el.center?.lat ?? lat,
    lng: el.lon ?? el.center?.lon ?? lng,
    tags: { ...el.tags },
    rating: null,
    url: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    wikipedia: null,
  };
}

export async function getPlaces(lat, lng, radius = 3000) {
  const key = `places:${lat.toFixed(5)},${lng.toFixed(5)}:${radius}`;
  const result = await cachedWithMeta(
    key,
    { freshMs: 7 * 86400000, staleMs: 30 * 86400000, validate: (data) => Array.isArray(data) && data.length > 0 },
    async () => {
      const endpoints = endpointFor('places');
      const errors = [];
      for (const endpoint of endpoints) {
        if (health.get(endpoint) === 'down') continue;
        try {
          const response = await fetchJson(
            endpoint,
            { method: 'POST', body: 'data=' + encodeURIComponent(buildPlacesQuery(lat, lng, radius)) },
            20000,
          );
          const elements = response.elements || [];
          if (!elements.length) continue;
          return elements.map((el) => mapPlace(el, lat, lng));
        } catch (error) {
          errors.push(error);
          health.set(endpoint, 'down');
        }
      }
      if (errors.length === endpoints.length) {
        throw new AppError('UPSTREAM_UNAVAILABLE', 'landmarks', 'All places endpoints failed.', {
          status: 502,
          retryable: true,
          cause: errors[0],
        });
      }
      throw new AppError('NO_RESULTS', 'places', 'No places found for this location.', {
        status: 404,
        retryable: false,
      });
    },
  );
  return { places: result.data, meta: result.meta };
}

export async function getRestaurants(lat, lng, radius = 3000) {
  return new Promise((resolve) => {
    optionalStageQueue = optionalStageQueue
      .then(async () => {
        try {
          const result = await cachedWithMeta(
            `restaurants:${lat.toFixed(5)},${lng.toFixed(5)}:${radius}`,
            { freshMs: 7 * 86400000, staleMs: 30 * 86400000, validate: (data) => Array.isArray(data) },
            async () => {
              const endpoints = endpointFor('restaurants');
              const errors = [];
              for (const endpoint of endpoints) {
                if (health.get(endpoint) === 'down') continue;
                try {
                  const query = `[out:json][timeout:15];(
                    node["amenity"~"restaurant|cafe|bar|pub"](around:${radius},${lat},${lng});
                    way["amenity"~"restaurant|cafe|bar|pub"](around:${radius},${lat},${lng});
                    relation["amenity"~"restaurant|cafe|bar|pub"](around:${radius},${lat},${lng});
                  );out center;`;
                  const response = await fetchJson(
                    endpoint,
                    { method: 'POST', body: 'data=' + encodeURIComponent(query) },
                    20000,
                  );
                  const elements = response.elements || [];
                  if (!elements.length) continue;
                  return elements.map((el) => ({
                    id: 'overpass-' + el.type + '-' + el.id,
                    name: el.tags?.name || 'Venue',
                    lat: el.lat ?? el.center?.lat ?? lat,
                    lng: el.lon ?? el.center?.lon ?? lng,
                    tags: { ...el.tags, amenity: el.tags?.amenity || 'restaurant' },
                    rating: null,
                    url: `https://www.openstreetmap.org/${el.type}/${el.id}`,
                    wikipedia: null,
                  }));
                } catch (error) {
                  errors.push(error);
                  health.set(endpoint, 'down');
                }
              }
              if (errors.length === endpoints.length) {
                throw new AppError('UPSTREAM_UNAVAILABLE', 'restaurants', 'All restaurant endpoints failed.', {
                  status: 502,
                  retryable: true,
                  cause: errors[0],
                });
              }
              return [];
            },
          );
          resolve({ restaurants: result.data || [], meta: result.meta || {} });
        } catch (err) {
          resolve({ restaurants: [], meta: { error: err.message } });
        }
      })
      .catch(() => resolve({ restaurants: [], meta: {} }));
  });
}

export async function getTransport(lat, lng, radius = 5000) {
  return new Promise((resolve) => {
    optionalStageQueue = optionalStageQueue
      .then(async () => {
        try {
          const result = await cachedWithMeta(
            `transport:${lat.toFixed(5)},${lng.toFixed(5)}:${radius}`,
            { freshMs: 7 * 86400000, staleMs: 30 * 86400000, validate: (data) => data && Array.isArray(data.stations) },
            async () => {
              const endpoints = endpointFor('transport');
              const errors = [];
              for (const endpoint of endpoints) {
                if (health.get(endpoint) === 'down') continue;
                try {
                  const query = `[out:json][timeout:15];(
                    node["public_transport"="station"](around:${radius},${lat},${lng});
                    way["public_transport"="station"](around:${radius},${lat},${lng});
                    node["railway"="station"](around:${radius},${lat},${lng});
                    way["railway"="station"](around:${radius},${lat},${lng});
                    node["highway"="bus_stop"](around:${radius},${lat},${lng});
                    way["highway"="bus_stop"](around:${radius},${lat},${lng});
                  );out center;`;
                  const response = await fetchJson(
                    endpoint,
                    { method: 'POST', body: 'data=' + encodeURIComponent(query) },
                    20000,
                  );
                  const elements = response.elements || [];
                  if (!elements.length) continue;
                  const stations = elements.map((el) => ({
                    id: 'overpass-' + el.type + '-' + el.id,
                    name: el.tags?.name || 'Station',
                    lat: el.lat ?? el.center?.lat ?? lat,
                    lng: el.lon ?? el.center?.lon ?? lng,
                    tags: { ...el.tags },
                    rating: null,
                    url: `https://www.openstreetmap.org/${el.type}/${el.id}`,
                    wikipedia: null,
                  }));
                  return { stations, routes: [] };
                } catch (error) {
                  errors.push(error);
                  health.set(endpoint, 'down');
                }
              }
              if (errors.length === endpoints.length) {
                throw new AppError('UPSTREAM_UNAVAILABLE', 'transport', 'All transport endpoints failed.', {
                  status: 502,
                  retryable: true,
                  cause: errors[0],
                });
              }
              return { stations: [], routes: [] };
            },
          );
          resolve({ stations: result.data?.stations || [], routes: result.data?.routes || [], meta: result.meta || {} });
        } catch (err) {
          resolve({ stations: [], routes: [], meta: { error: err.message } });
        }
      })
      .catch(() => resolve({ stations: [], routes: [], meta: {} }));
  });
}
