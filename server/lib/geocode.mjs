import { cachedWithMeta, fetchJson } from './http.mjs';
import { AppError } from './errors.mjs';
let queue = Promise.resolve();
let last = 0;
function nominatim(path, params) {
  const job = queue.then(async () => {
    await new Promise((r) => setTimeout(r, Math.max(0, 1100 - (Date.now() - last))));
    last = Date.now();
    return fetchJson(
      'https://nominatim.openstreetmap.org/' + path + '?' + new URLSearchParams(params),
      {
        headers: {
          'User-Agent': 'NorteTripPlanner/1.0 (https://github.com/Fanjo-code/norte-trip-planner)',
          'Accept-Language': 'en',
        },
      },
      12000,
    );
  });
  queue = job.catch(() => {});
  return job;
}
export async function geocode(query) {
  const result = await cachedWithMeta(
    'geo:' + query.toLowerCase().trim(),
    {
      freshMs: 30 * 86400000,
      staleMs: 150 * 86400000,
      validate: (data) => Array.isArray(data) && data.length > 0,
    },
    async () => {
      const data = await nominatim('search', {
        q: query,
        format: 'json',
        limit: '8',
        addressdetails: '1',
      });
      const results = data
        .filter((r) =>
          ['city', 'town', 'village', 'municipality', 'administrative'].includes(r.type),
        )
        .slice(0, 5)
        .map((r) => ({
          id: 'nominatim-' + r.place_id,
          name: r.name || r.display_name.split(',')[0],
          region: r.address?.state || r.address?.region || r.address?.county || null,
          country: r.address?.country || null,
          countryCode: r.address?.country_code?.toUpperCase() || null,
          displayName: r.display_name,
          lat: Number(r.lat),
          lng: Number(r.lon),
          boundingBox: Array.isArray(r.boundingbox) ? r.boundingbox.map(Number) : null,
        }))
        .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng));
      if (!results.length)
        throw new AppError(
          'NO_RESULTS',
          'geocode',
          'No matching city was found. Try adding the country.',
          {
            status: 404,
            retryable: false,
          },
        );
      return results;
    },
  );
  return { results: result.data, meta: result.meta };
}
export async function reverseGeocode(lat, lng) {
  return (
    await cachedWithMeta('reverse:' + lat + ',' + lng, { freshMs: 30 * 86400000 }, async () => {
      const r = await nominatim('reverse', { lat: String(lat), lon: String(lng), format: 'json' });
      return {
        name: r.name || r.display_name?.split(',')[0],
        countryCode: r.address?.country_code?.toUpperCase(),
      };
    })
  ).data;
}
