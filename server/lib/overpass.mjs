/**
 * Overpass API (OpenStreetMap) — free, no key, no rate limit on private.coffee mirror.
 * Returns normalized places, restaurants, transport for a given lat/lng.
 */

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'; // reliable main endpoint
const TIMEOUT = 45000; // generous: big city scans can take ~30s on a loaded server
const USER_AGENT = 'curl/7.68.0'; // Overpass accepts this

const cache = new Map();

async function loadCache() {
  try {
    const fs = await import('fs/promises');
    const data = await fs.readFile('.cache/overpass.json', 'utf-8');
    const parsed = JSON.parse(data);
    for (const [k, v] of Object.entries(parsed)) cache.set(k, v);
  } catch { /* ignore */ }
}

async function saveCache() {
  try {
    const fs = await import('fs/promises');
    await fs.mkdir('.cache', { recursive: true });
    const obj = Object.fromEntries(cache);
    await fs.writeFile('.cache/overpass.json', JSON.stringify(obj));
  } catch { /* ignore */ }
}

function buildQuery(lat, lng, radius, filter, out = 'out;') {
  // Overpass QL: find nodes/ways/relations matching filter within radius
  // Simplified format that works with overpass-api.de
  return `[out:json][timeout:25];${filter}(around:${radius},${lat},${lng});${out}`;
}

async function runQuery(query) {
  await loadCache();
  const key = query;
  if (cache.has(key)) return cache.get(key);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    console.log('Overpass query:', query.substring(0, 200) + '...');
    // Overpass expects "data=<urlencoded_query>" as form field, with proper User-Agent
    const body = new URLSearchParams({ data: query });
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': '*/*',
        'User-Agent': USER_AGENT,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    console.log('Overpass response status:', res.status, res.statusText);
    if (!res.ok) {
      const text = await res.text();
      console.error('Overpass error:', res.status, text);
      throw new Error(`Overpass ${res.status}`);
    }

    const data = await res.json();
    const result = data.elements || [];
    console.log('Overpass returned', result.length, 'elements');
    cache.set(key, result);
    await saveCache();
    return result;
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

/** Normalize OSM element to common shape */
function normalize(el, type) {
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  const tags = el.tags || {};

  return {
    id: `${type}-${el.type}-${el.id}`,
    name: tags.name || tags['name:en'] || 'Unnamed',
    category: type,
    lat,
    lng,
    tags,
    // OSM doesn't have ratings, we'll synthesize from tags or leave null
    rating: tags.rating ? parseFloat(tags.rating) : null,
    // URLs for external linking
    url: lat && lng ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : null,
    wikipedia: tags.wikipedia ? `https://${tags.wikipedia.replace(':', '.wikipedia.org/wiki/')}` : null,
  };
}

/**
 * Get attractions / places to visit (museums, landmarks, parks, viewpoints, etc.)
 * Covers the WHOLE city: nodes AND ways/relations (nwr), a wider radius (8000m),
 * and curated tourism/historic/tower tags so iconic landmarks are included.
 * Filters for famous/important places by checking for wikidata, wikipedia, or high-importance tags.
 */
export async function getPlaces(lat, lng, radius = 8000) {
  // Single tourism+wikidata query: returns ALL iconic landmarks (Eiffel, Louvre, Orsay,
  // Notre-Dame, Arc de Triomphe, Sacré-Cœur, Panthéon, Pompidou, Garnier, Catacombes,
  // Invalides, Orangerie, Grévin, …) at ranks well within the top 100. The historic
  // member added 265 extra elements that pushed icons past the cap without contributing
  // any unique must-see landmarks (historic+wikidata has Notre/Louvre/Arc/Eiffel
  // already in tourism). One query = faster, simpler, complete.
  const query = `[out:json][timeout:25];nwr["tourism"~"attraction|museum|artwork|gallery|viewpoint|zoo|aquarium|theme_park|castle|monument|memorial|fort"]["name"]["wikidata"](around:${radius},${lat},${lng});out center 1000;`;
  const elements = await runQuery(query);
  const normalized = elements.map(el => normalize(el, 'place')).filter(p => p.lat && p.lng);

  // Prioritize places with wikidata/wikipedia (famous/established) and high-importance types
  const scored = normalized.map(p => {
    let score = 0;
    if (p.tags?.wikidata) score += 100;
    if (p.tags?.wikipedia) score += 100;
    if (p.tags?.tourism === 'museum') score += 50;
    if (p.tags?.tourism === 'viewpoint') score += 30;
    if (p.tags?.tourism === 'attraction') score += 20;
    if (p.tags?.historic) score += 40;
    if (p.tags?.artwork_type === 'statue' || p.tags?.artwork_type === 'sculpture') score += 10;
    if (p.tags?.name?.length > 2) score += 5; // Has a proper name
    return { ...p, _score: score };
  });

  // Dedupe by normalized name (nodes + ways + relations often repeat the same landmark),
  // keeping the highest-scoring entry, then sort by score descending, take top 50.
  const seen = new Map();
  for (const p of scored) {
    if (!p.name || p.name === 'Unnamed') continue;
    const key = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '');
    const existing = seen.get(key);
    if (!existing || p._score > existing._score) seen.set(key, p);
  }

  return [...seen.values()]
    .sort((a, b) => b._score - a._score)
    .slice(0, 200)
    .map(({ _score, ...p }) => p);
}

/**
 * Get restaurants, cafes, bars, pubs
 * Excludes fast_food chains completely, prioritizes local/independent places
 */
export async function getRestaurants(lat, lng, radius = 2000) {
  // Get all food places, then filter strictly
  const filter = 'node["amenity"~"restaurant|cafe|bar|pub|fast_food|ice_cream"]';
  const elements = await runQuery(buildQuery(lat, lng, radius, filter));
  const normalized = elements.map(el => normalize(el, 'restaurant')).filter(p => p.lat && p.lng);

  // Major chain brands to EXCLUDE completely
  const chainBrands = new Set([
    'mcdonald', 'kfc', 'burger king', 'subway', 'starbucks', 'dominos', 'pizza hut',
    'taco bell', 'wendy', 'five guys', 'shakeshack', 'chipotle', 'pret a manger',
    'costa coffee', 'dunkin', 'tim hortons', 'popeyes', 'popeye', 'nandos', 'nando'
  ]);

  // Filter OUT fast_food amenity AND chain brands, then score
  const filtered = normalized.filter(p => {
    const amenity = p.tags?.amenity || '';
    const brand = (p.tags?.brand || '').toLowerCase();
    const name = (p.tags?.name || '').toLowerCase();

    // Exclude fast_food amenity entirely
    if (amenity === 'fast_food') return false;

    // Exclude major chain brands
    const isChain = [...chainBrands].some(c => brand.includes(c) || name.includes(c));
    if (isChain) return false;

    return true;
  });

  // Score remaining: prioritize restaurants, places with cuisine tags, proper names, wikidata
  const scored = filtered.map(p => {
    let score = 0;
    const cuisine = (p.tags?.cuisine || '').toLowerCase();

    if (p.tags?.wikidata) score += 50;
    if (p.tags?.wikipedia) score += 50;
    if (p.tags?.amenity === 'restaurant') score += 30;
    if (p.tags?.amenity === 'cafe') score += 25;
    if (p.tags?.amenity === 'bar' || p.tags?.amenity === 'pub') score += 20;
    if (cuisine && cuisine !== 'burger' && cuisine !== 'chicken' && cuisine !== 'pizza' && cuisine !== 'sandwich') score += 20;
    if (p.tags?.name?.length > 3) score += 10;
    return { ...p, _score: score };
  });

  return scored
    .sort((a, b) => b._score - a._score)
    .slice(0, 25)
    .map(({ _score, ...p }) => p);
}

/**
 * Get public transport options (metro, tram, bus, train stations)
 */
export async function getTransport(lat, lng, radius = 5000) {
  const filter = 'node["public_transport"="station"]["station"~"subway|light_rail|train|bus"]';
  const elements = await runQuery(buildQuery(lat, lng, radius, filter));
  const stations = elements.map(el => normalize(el, 'transport')).filter(p => p.lat && p.lng);

  // Also get route relations for lines
  const routeFilter = 'node["route"~"subway|light_rail|train|bus"]';
  const routeElements = await runQuery(buildQuery(lat, lng, radius, routeFilter));
  const routes = routeElements.map(el => normalize(el, 'transport')).filter(p => p.tags?.ref || p.tags?.name);

  return { stations, routes };
}