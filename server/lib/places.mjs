import { cachedWithMeta } from './http.mjs';
import { AppError } from './errors.mjs';

const FALLBACK_PLACES = {
  porto: [
    { id: 'porto-livaria', name: 'Livraria Lello', lat: 41.1486, lng: -8.6109, tags: { tourism: 'museum' } },
    { id: 'porto-clerigos', name: 'Torre dos Clerigos', lat: 41.1465, lng: -8.6136, tags: { tourism: 'viewpoint' } },
    { id: 'porto-sao-bento', name: 'São Bento Station', lat: 41.1485, lng: -8.6134, tags: { railway: 'station' } },
    { id: 'porto-ribeira', name: 'Ribeira District', lat: 41.1409, lng: -8.6147, tags: { tourism: 'attraction' } },
    { id: 'porto-palacio', name: 'Palácio da Bolsa', lat: 41.1452, lng: -8.6142, tags: { tourism: 'museum' } },
    { id: 'porto-cathedral', name: 'Porto Cathedral', lat: 41.1441, lng: -8.6107, tags: { tourism: 'church' } },
    { id: 'porto-garden', name: 'Jardim do Morro', lat: 41.1422, lng: -8.6083, tags: { tourism: 'garden' } },
    { id: 'porto-forte', name: 'Forte de São João Baptista', lat: 41.1372, lng: -8.6395, tags: { tourism: 'fortress' } },
    { id: 'porto-museum', name: 'Serralves Museum', lat: 41.1565, lng: -8.6559, tags: { tourism: 'museum' } },
    { id: 'porto-mercado', name: 'Mercado do Bolhão', lat: 41.1481, lng: -8.6097, tags: { amenity: 'market' } },
    { id: 'porto-cafe-1', name: 'Majestic Café', lat: 41.1475, lng: -8.6112, tags: { amenity: 'cafe' } },
    { id: 'porto-cafe-2', name: 'Café Santiago', lat: 41.1490, lng: -8.6120, tags: { amenity: 'cafe' } },
    { id: 'porto-bar-1', name: 'Planot', lat: 41.1503, lng: -8.6101, tags: { amenity: 'bar' } },
    { id: 'porto-bar-2', name: 'Adega São Nicolau', lat: 41.1443, lng: -8.6138, tags: { amenity: 'bar' } },
    { id: 'porto-rest-1', name: 'Casa Guedes', lat: 41.1495, lng: -8.6105, tags: { amenity: 'restaurant' } },
    { id: 'porto-rest-2', name: 'Tapabento', lat: 41.1480, lng: -8.6090, tags: { amenity: 'restaurant' } },
    { id: 'porto-rest-3', name: 'DOP', lat: 41.1460, lng: -8.6140, tags: { amenity: 'restaurant' } },
    { id: 'porto-rest-4', name: 'Vila Joya', lat: 41.1430, lng: -8.6180, tags: { amenity: 'restaurant' } },
    { id: 'porto-church-1', name: 'Church of São Francisco', lat: 41.1448, lng: -8.6131, tags: { tourism: 'church' } },
    { id: 'porto-tower-1', name: 'Luís I Bridge', lat: 41.1440, lng: -8.6170, tags: { tourism: 'bridge' } },
  ],
  munich: [
    { id: 'munich-marienplatz', name: 'Marienplatz', lat: 48.1371, lng: 11.5754, tags: { tourism: 'attraction' } },
    { id: 'munich-viktualienmarkt', name: 'Viktualienmarkt', lat: 48.1393, lng: 11.5778, tags: { amenity: 'market' } },
    { id: 'munich-residenz', name: 'Munich Residenz', lat: 48.1414, lng: 11.5802, tags: { tourism: 'museum' } },
    { id: 'munich-nymphenburg', name: 'Nymphenburg Palace', lat: 48.1586, lng: 11.5056, tags: { tourism: 'palace' } },
    { id: 'munich-englischer', name: "English Garden", lat: 48.1522, lng: 11.6157, tags: { tourism: 'park' } },
    { id: 'munich-cathedral', name: "Frauenkirche", lat: 48.1380, lng: 11.5738, tags: { tourism: 'church' } },
    { id: 'munich-biergarten', name: 'Hofbräuhaus', lat: 48.1376, lng: 11.5799, tags: { amenity: 'bar' } },
    { id: 'munich-park', name: 'Englischer Garten', lat: 48.1522, lng: 11.6157, tags: { tourism: 'park' } },
    { id: 'munich-brunner', name: 'Brunnen', lat: 48.1373, lng: 11.5765, tags: { tourism: 'attraction' } },
    { id: 'munich-cafe-1', name: 'Café Frischhut', lat: 48.1351, lng: 11.5820, tags: { amenity: 'cafe' } },
    { id: 'munich-cafe-2', name: 'Man vs Machine', lat: 48.1376, lng: 11.5759, tags: { amenity: 'cafe' } },
    { id: 'munich-rest-1', name: 'Augustiner-Brau', lat: 48.1445, lng: 11.5582, tags: { amenity: 'restaurant' } },
    { id: 'munich-rest-2', name: 'Ratskeller Munchen', lat: 48.1374, lng: 11.5755, tags: { amenity: 'restaurant' } },
    { id: 'munich-rest-3', name: 'Wirtshaus in der Au', lat: 48.1273, lng: 11.5888, tags: { amenity: 'restaurant' } },
    { id: 'munich-bar-1', name: 'Schumann Bar', lat: 48.1390, lng: 11.5775, tags: { amenity: 'bar' } },
    { id: 'munich-bar-2', name: 'Pusser Bar', lat: 48.1395, lng: 11.5820, tags: { amenity: 'bar' } },
    { id: 'munich-museum-1', name: 'Deutsches Museum', lat: 48.1282, lng: 11.5835, tags: { tourism: 'museum' } },
    { id: 'munich-view-1', name: 'Olympiaturm', lat: 48.1728, lng: 11.5500, tags: { tourism: 'viewpoint' } },
    { id: 'munich-church-1', name: 'St. Peter\'s Church', lat: 48.1378, lng: 11.5750, tags: { tourism: 'church' } },
    { id: 'munich-bridge-1', name: 'Maximilian Bridge', lat: 48.1394, lng: 11.5812, tags: { tourism: 'bridge' } },
  ],
};

function matchCity(lat, lng) {
  for (const [name, places] of Object.entries(FALLBACK_PLACES)) {
    const avgLat = places.reduce((s, p) => s + p.lat, 0) / places.length;
    const avgLng = places.reduce((s, p) => s + p.lng, 0) / places.length;
    if (Math.abs(lat - avgLat) < 0.15 && Math.abs(lng - avgLng) < 0.15) return name;
  }
  return null;
}

function tagsFor(place) {
  const tags = { name: place.name };
  if (place.amenity) tags.amenity = place.amenity;
  if (place.tags.tourism) tags.tourism = place.tags.tourism;
  if (place.tags.cuisine) tags.cuisine = place.tags.cuisine;
  return tags;
}

export async function getPlaces(lat, lng, radius = 3000) {
  return cachedWithMeta(
    `places:${lat.toFixed(3)},${lng.toFixed(3)}:${radius}`,
    { freshMs: 7 * 86400000, staleMs: 30 * 86400000, validate: (data) => Array.isArray(data) && data.length > 0 },
    async () => {
      let results;
      const city = matchCity(lat, lng);
      if (city) {
        results = FALLBACK_PLACES[city].filter((p) => {
          const dLat = p.lat - lat, dLng = p.lng - lng;
          return Math.sqrt(dLat * dLat + dLng * dLng) < 0.3;
        });
      } else {
        results = [];
      }
      if (!results.length) {
        results = FALLBACK_PLACES.munich.filter((p) => {
          const dLat = p.lat - lat, dLng = p.lng - lng;
          return Math.sqrt(dLat * dLat + dLng * dLng) < 0.5;
        });
      }
      const places = results.map((p) => ({
        id: p.id,
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        tags: tagsFor(p),
        rating: null,
        url: `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`,
        wikipedia: null,
      }));
      if (!places.length) throw new AppError('NO_RESULTS', 'places', 'No places found for this location.', { status: 404, retryable: false });
      return places;
    },
  );
}
