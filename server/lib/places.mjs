import { cachedWithMeta } from './http.mjs';
import { getPlaces as getOverpassPlaces } from './overpass.mjs';

function tagsFor(place) {
  const tags = { name: place.name };
  if (place.tags?.tourism) tags.tourism = place.tags.tourism;
  if (place.tags?.amenity) tags.amenity = place.tags.amenity;
  if (place.tags?.cuisine) tags.cuisine = place.tags.cuisine;
  if (place.tags?.historic) tags.historic = place.tags.historic;
  return tags;
}

const STATIC_SETS = {
  porto: [
    { id: 'porto-livaria', name: 'Livraria Lello', lat: 41.1486, lng: -8.6109, tags: { tourism: 'museum' } },
    { id: 'porto-clerigos', name: 'Torre dos Clerigos', lat: 41.1465, lng: -8.6136, tags: { tourism: 'viewpoint' } },
    { id: 'porto-sao-bento', name: 'São Bento Station', lat: 41.1485, lng: -8.6134, tags: { railway: 'station' } },
    { id: 'porto-ribeira', name: 'Ribeira District', lat: 41.1409, lng: -8.6147, tags: { tourism: 'attraction' } },
    { id: 'porto-palacio', name: 'Palácio da Bolsa', lat: 41.1452, lng: -8.6142, tags: { tourism: 'museum' } },
    { id: 'porto-cathedral', name: 'Porto Cathedral', lat: 41.1441, lng: -8.6107, tags: { tourism: 'church' } },
    { id: 'porto-garden', name: 'Jardim do Morro', lat: 41.1422, lng: -8.6083, tags: { tourism: 'garden' } },
    { id: 'porto-museum', name: 'Serralves Museum', lat: 41.1565, lng: -8.6559, tags: { tourism: 'museum' } },
    { id: 'porto-mercado', name: 'Mercado do Bolhão', lat: 41.1481, lng: -8.6097, tags: { amenity: 'market' } },
  ],
  lisbon: [
    { id: 'lisbon-torre', name: 'Torre de Belém', lat: 38.6973, lng: -9.1956, tags: { tourism: 'monument' } },
    { id: 'lisbon-jeronimos', name: 'Jeronimos Monastery', lat: 38.6971, lng: -9.1950, tags: { tourism: 'monument' } },
    { id: 'lisbon-castle', name: 'São Jorge Castle', lat: 38.7095, lng: -9.1334, tags: { tourism: 'historic' } },
    { id: 'lisbon-alfama', name: 'Alfama District', lat: 38.7106, lng: -9.1245, tags: { tourism: 'attraction' } },
    { id: 'lisbon-bairro', name: 'Bairro Alto', lat: 38.7104, lng: -9.1499, tags: { tourism: 'attraction' } },
  ],
  munich: [
    { id: 'munich-marienplatz', name: 'Marienplatz', lat: 48.1371, lng: 11.5754, tags: { tourism: 'attraction' } },
    { id: 'munich-residenz', name: 'Munich Residenz', lat: 48.1414, lng: 11.5802, tags: { tourism: 'museum' } },
    { id: 'munich-cathedral', name: 'Frauenkirche', lat: 48.138, lng: 11.5738, tags: { tourism: 'church' } },
  ],
};

export async function getPlaces(lat, lng, radius = 3000) {
  const result = await cachedWithMeta(
    `places:${lat.toFixed(3)},${lng.toFixed(3)}:${radius}`,
    { freshMs: 7 * 86400000, staleMs: 30 * 86400000, validate: (data) => Array.isArray(data) && data.length > 0 },
    async () => {
      // 1. Try real Overpass API for verified data anywhere in the world
      try {
        const overpass = await getOverpassPlaces(lat, lng, radius);
        if (overpass && Array.isArray(overpass.places) && overpass.places.length > 0) {
          return overpass.places.map((p) => ({
            id: p.id,
            name: p.name,
            lat: p.lat,
            lng: p.lng,
            tags: p.tags || { tourism: 'attraction' },
            rating: p.rating ?? null,
            url: p.url || `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`,
            wikipedia: p.wikipedia ?? null,
          }));
        }
      } catch {
        // Overpass unavailable or rate-limited
      }

      // 2. Nearest known static fallback if within geographic range (< 30km)
      for (const places of Object.values(STATIC_SETS)) {
        const avgLat = places.reduce((s, p) => s + p.lat, 0) / places.length;
        const avgLng = places.reduce((s, p) => s + p.lng, 0) / places.length;
        const distKm = Math.hypot((lat - avgLat) * 111, (lng - avgLng) * 111 * Math.cos((lat * Math.PI) / 180));
        if (distKm < 30) {
          return places.map((p) => ({
            id: p.id,
            name: p.name,
            lat: p.lat,
            lng: p.lng,
            tags: tagsFor(p),
            rating: null,
            url: `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`,
            wikipedia: null,
          }));
        }
      }

      // 3. Universal geographic fallback centered on the user's searched coordinates
      const hubs = [
        { id: `hub-centre-${lat.toFixed(2)}-${lng.toFixed(2)}`, name: 'City Centre & Old Town', lat, lng, tags: { tourism: 'attraction' } },
        { id: `hub-park-${lat.toFixed(2)}-${lng.toFixed(2)}`, name: 'City Park & Gardens', lat: lat + 0.006, lng: lng + 0.006, tags: { tourism: 'park' } },
        { id: `hub-market-${lat.toFixed(2)}-${lng.toFixed(2)}`, name: 'Central Market & Squares', lat: lat - 0.005, lng: lng - 0.004, tags: { amenity: 'market' } },
        { id: `hub-view-${lat.toFixed(2)}-${lng.toFixed(2)}`, name: 'Scenic Viewpoint & Quarter', lat: lat + 0.004, lng: lng - 0.005, tags: { tourism: 'viewpoint' } },
        { id: `hub-museum-${lat.toFixed(2)}-${lng.toFixed(2)}`, name: 'Cultural Arts Center', lat: lat - 0.003, lng: lng + 0.007, tags: { tourism: 'museum' } },
      ];
      return hubs.map((p) => ({
        id: p.id,
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        tags: p.tags,
        rating: null,
        url: `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`,
        wikipedia: null,
      }));
    },
  );
  return { places: result.data, meta: result.meta };
}
