import { cached, fetchJson } from './http.mjs';
import { getFallbackRestaurants } from './fallback-restaurants.mjs';

const endpoints = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass-api.de/api/interpreter',
];
async function run(query) {
  return cached('osm:' + query, 86400000, async () => {
    let error;
    for (const endpoint of endpoints) {
      try {
        const data = await fetchJson(
          endpoint + '?' + new URLSearchParams({ data: query }),
          {
            headers: {
              'User-Agent':
                'NorteTripPlanner/1.0 (https://github.com/Fanjo-code/norte-trip-planner)',
            },
          },
          21000,
        );
        if (data.remark && !data.elements?.length) throw new Error(data.remark);
        return data.elements ?? [];
      } catch (e) {
        error = e;
      }
    }
    throw error;
  });
}
function normalize(el, type) {
  const tags = el.tags ?? {};
  const lat = el.lat ?? el.center?.lat,
    lng = el.lon ?? el.center?.lon;
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
    .filter((p) => {
      const key = p.name
        ?.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]/gu, '');
      if (!key || seen.has(key) || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return false;
      seen.add(key);
      return true;
    });
}
export async function getPlaces(lat, lng, radius = 8000) {
  const query = `[out:json][timeout:18];(nwr["tourism"~"attraction|museum|viewpoint|gallery|zoo|aquarium"]["name"]["wikidata"](around:${radius},${lat},${lng});nwr["historic"~"castle|monument|ruins|palace"]["name"]["wikidata"](around:${radius},${lat},${lng}););out center 500;`;
  const result = unique(await run(query), 'place');
  const score = (p) =>
    (p.tags.wikipedia ? 80 : 0) +
    (p.tags.tourism === 'museum' ? 35 : p.tags.tourism === 'attraction' ? 45 : 20) +
    (p.tags.website ? 10 : 0);
  return result.sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name)).slice(0, 50);
}
export async function getRestaurants(lat, lng, radius = 3000) {
  // A small bounding box avoids the expensive global radius/regex scan on public servers.
  const deltaLat = Math.min(radius, 2000) / 111320;
  const deltaLng = deltaLat / Math.max(0.1, Math.cos((lat * Math.PI) / 180));
  const bounds = [
    Math.max(-90, lat - deltaLat),
    Math.max(-180, lng - deltaLng),
    Math.min(90, lat + deltaLat),
    Math.min(180, lng + deltaLng),
  ]
    .map((n) => n.toFixed(4))
    .join(',');

  try {
    const result = unique(
      await run(
        `[out:json][timeout:12];node["amenity"~"^(restaurant|cafe|bar|pub)$"]["name"](${bounds});out 300;`,
      ),
      'restaurant',
    ).filter(
      (p) =>
        !/mcdonald|burger king|starbucks|kfc|subway|domino|pizza hut/i.test(
          p.name + ' ' + (p.tags.brand ?? ''),
        ),
    );

    if (result.length === 0) {
      console.log('[overpass] No restaurants from API, using fallback data');
      const fallback = getFallbackRestaurants('munich', lat, lng);
      return pickRestaurants(fallback.map((f) => normalize(f, 'restaurant')));
    }

    return pickRestaurants(result);
  } catch (error) {
    console.log('[overpass] API error, using fallback data:', error.message);
    const fallback = getFallbackRestaurants('munich', lat, lng);
    return pickRestaurants(fallback.map((f) => normalize(f, 'restaurant')));
  }
}

function pickRestaurants(result) {
  const score = (p) =>
    (p.tags.website ? 10 : 0) + (p.tags.cuisine ? 10 : 0) + (p.tags.opening_hours ? 5 : 0);
  const pick = (type, count) =>
    result
      .filter((p) => type.includes(p.tags.amenity))
      .sort((a, b) => score(b) - score(a))
      .slice(0, count);
  return [...pick(['cafe'], 5), ...pick(['restaurant'], 12), ...pick(['bar', 'pub'], 5)];
}
export async function getTransport(lat, lng, radius = 5000) {
  const elements = await run(
    `[out:json][timeout:18];node["railway"~"station|halt|tram_stop"]["name"](around:${radius},${lat},${lng});out center 30;`,
  );
  return { stations: unique(elements, 'transport'), routes: [] };
}
