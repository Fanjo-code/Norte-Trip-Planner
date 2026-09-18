/**
 * Fallback restaurant data for when Overpass API is unavailable or rate-limited.
 * Provides basic dining options for major cities.
 */

export const FALLBACK_RESTAURANTS = {
  munich: [
    {
      id: 'fallback-munich-cafe-1',
      name: 'Cafe Frischhut',
      amenity: 'cafe',
      cuisine: 'coffee_shop',
      lat: 48.1351,
      lng: 11.5820,
    },
    {
      id: 'fallback-munich-cafe-2',
      name: 'Man vs Machine',
      amenity: 'cafe',
      cuisine: 'coffee_shop',
      lat: 48.1376,
      lng: 11.5759,
    },
    {
      id: 'fallback-munich-cafe-3',
      name: 'Cafe Luitpold',
      amenity: 'cafe',
      cuisine: 'coffee_shop',
      lat: 48.1425,
      lng: 11.5778,
    },
    {
      id: 'fallback-munich-rest-1',
      name: 'Augustiner-Brau',
      amenity: 'restaurant',
      cuisine: 'bavarian',
      lat: 48.1445,
      lng: 11.5582,
    },
    {
      id: 'fallback-munich-rest-2',
      name: 'Ratskeller Munchen',
      amenity: 'restaurant',
      cuisine: 'german',
      lat: 48.1374,
      lng: 11.5755,
    },
    {
      id: 'fallback-munich-rest-3',
      name: 'Hofbrauhaus',
      amenity: 'restaurant',
      cuisine: 'bavarian',
      lat: 48.1376,
      lng: 11.5799,
    },
    {
      id: 'fallback-munich-rest-4',
      name: 'Viktualienmarkt Biergarten',
      amenity: 'restaurant',
      cuisine: 'german',
      lat: 48.1351,
      lng: 11.5761,
    },
    {
      id: 'fallback-munich-rest-5',
      name: 'Schneider Brauhaus',
      amenity: 'restaurant',
      cuisine: 'bavarian',
      lat: 48.1372,
      lng: 11.5791,
    },
    {
      id: 'fallback-munich-rest-6',
      name: 'Wirtshaus in der Au',
      amenity: 'restaurant',
      cuisine: 'german',
      lat: 48.1273,
      lng: 11.5888,
    },
    {
      id: 'fallback-munich-bar-1',
      name: 'Schumann Bar',
      amenity: 'bar',
      cuisine: 'cocktails',
      lat: 48.1390,
      lng: 11.5775,
    },
    {
      id: 'fallback-munich-bar-2',
      name: 'Pusser Bar',
      amenity: 'bar',
      cuisine: 'cocktails',
      lat: 48.1395,
      lng: 11.5820,
    },
  ],
};

export function getFallbackRestaurants(cityName, lat, lng) {
  const normalized = cityName.toLowerCase().replace(/[^a-z]/g, '');
  const cityData = FALLBACK_RESTAURANTS[normalized] || [];

  // Add default coordinates and tags to match expected structure
  return cityData.map((r) => ({
    id: r.id,
    name: r.name,
    lat: r.lat,
    lng: r.lng,
    tags: {
      name: r.name,
      amenity: r.amenity,
      cuisine: r.cuisine || r.amenity,
    },
    rating: null,
    url: `https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lng}`,
    wikipedia: null,
  }));
}
