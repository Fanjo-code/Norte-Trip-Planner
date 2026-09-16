import { cached, fetchJson } from './http.mjs';
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
  return cached('geo:' + query.toLowerCase().trim(), 30 * 86400000, async () => {
    const data = await nominatim('search', {
      q: query,
      format: 'json',
      limit: '1',
      addressdetails: '1',
    });
    if (!data.length) throw new Error('City not found. Try adding the country.');
    const r = data[0];
    return {
      lat: Number(r.lat),
      lng: Number(r.lon),
      name: r.name || r.display_name.split(',')[0],
      countryCode: r.address?.country_code?.toUpperCase(),
    };
  });
}
export async function reverseGeocode(lat, lng) {
  return cached('reverse:' + lat + ',' + lng, 30 * 86400000, async () => {
    const r = await nominatim('reverse', { lat: String(lat), lon: String(lng), format: 'json' });
    return {
      name: r.name || r.display_name?.split(',')[0],
      countryCode: r.address?.country_code?.toUpperCase(),
    };
  });
}
