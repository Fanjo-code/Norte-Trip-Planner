// Manual live-data probe. Start npm run proxy first.
const base = 'http://localhost:8787';
const city = process.argv.slice(2).join(' ') || 'Porto';
async function get(path) {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(60000) });
  const body = await response.json();
  if (!response.ok)
    throw new Error(
      path + ': [' + (body.error?.stage ?? 'unknown') + '] ' + (body.error?.message ?? 'failed'),
    );
  return body;
}
try {
  await get('/health');
  const geo = await get('/api/geocode?q=' + encodeURIComponent(city));
  const selected = geo.data?.results?.[0];
  if (!selected) throw new Error('No city candidate returned for ' + city);
  console.log('geocode: ' + selected.displayName + ' [' + geo.meta.cache + ']');
  const query = new URLSearchParams({ lat: String(selected.lat), lng: String(selected.lng) });
  for (const [endpoint, key] of [
    ['places', 'places'],
    ['restaurants', 'restaurants'],
    ['transport', 'stations'],
  ]) {
    try {
      const result = await get('/api/' + endpoint + '?' + query);
      if (!Array.isArray(result.data?.[key])) throw new Error('Invalid ' + endpoint + ' response');
      console.log(
        endpoint + ': ' + result.data[key].length + ' verified records [' + result.meta.cache + ']',
      );
    } catch (error) {
      console.error(endpoint + ': ' + error.message);
      if (endpoint === 'places') throw error;
    }
  }
  console.log('Live data probe passed.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
