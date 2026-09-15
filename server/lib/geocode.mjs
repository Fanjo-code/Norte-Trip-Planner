/**
 * Nominatim geocoding (OpenStreetMap).
 * Free, no API key. Respect 1 req/sec + descriptive User-Agent.
 * Returns { lat, lng, name, countryCode, boundingBox }.
 */

const USER_AGENT = 'NorteTripPlanner/1.0 (https://github.com/norte-trip-planner; contact@norte.app)';
const BASE_URL = 'https://nominatim.openstreetmap.org/search';

/** In-memory cache + file persistence to avoid repeated hits. */
const cache = new Map();

async function loadCache() {
  try {
    const fs = await import('fs/promises');
    const data = await fs.readFile('.cache/geocode.json', 'utf-8');
    const parsed = JSON.parse(data);
    for (const [k, v] of Object.entries(parsed)) cache.set(k, v);
  } catch { /* ignore */ }
}

async function saveCache() {
  try {
    const fs = await import('fs/promises');
    await fs.mkdir('.cache', { recursive: true });
    const obj = Object.fromEntries(cache);
    await fs.writeFile('.cache/geocode.json', JSON.stringify(obj));
  } catch { /* ignore */ }
}

let lastRequest = 0;
const MIN_INTERVAL = 1100; // ms, be polite to Nominatim

export async function geocode(query) {
  await loadCache();

  const key = query.toLowerCase().trim();
  if (cache.has(key)) return cache.get(key);

  // Rate limit
  const now = Date.now();
  const wait = MIN_INTERVAL - (now - lastRequest);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequest = Date.now();

  const url = `${BASE_URL}?${new URLSearchParams({
    q: query,
    format: 'json',
    limit: '1',
    addressdetails: '1',
    accept_language: 'en',
  })}`;

  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);

  const data = await res.json();
  if (!data.length) throw new Error('No results');

  const r = data[0];
  const result = {
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    name: r.display_name.split(',')[0],
    countryCode: r.address?.country_code?.toUpperCase(),
    boundingBox: r.boundingbox ? r.boundingbox.map(parseFloat) : null,
  };

  cache.set(key, result);
  await saveCache();
  return result;
}

export async function reverseGeocode(lat, lng) {
  await loadCache();
  const key = `rev:${lat},${lng}`;
  if (cache.has(key)) return cache.get(key);

  const now = Date.now();
  const wait = MIN_INTERVAL - (now - lastRequest);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequest = Date.now();

  const url = `https://nominatim.openstreetmap.org/reverse?${new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'json',
    addressdetails: '1',
  })}`;

  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Nominatim reverse ${res.status}`);

  const r = await res.json();
  const result = {
    name: r.display_name?.split(',')[0] ?? 'Unknown',
    countryCode: r.address?.country_code?.toUpperCase(),
  };
  cache.set(key, result);
  await saveCache();
  return result;
}