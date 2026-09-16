// Manual live-data probe. Start npm run proxy first.
const base = 'http://localhost:8787';
async function get(path) {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(60000) });
  const body = await response.json();
  if (!response.ok) throw new Error(path + ': ' + body.error);
  return body;
}
try {
  await get('/health');
  const geo = await get('/api/geocode?q=Porto');
  const query = new URLSearchParams({ lat: String(geo.lat), lng: String(geo.lng) });
  for (const [endpoint, key] of [
    ['places', 'places'],
    ['restaurants', 'restaurants'],
    ['transport', 'stations'],
  ]) {
    const data = await get('/api/' + endpoint + '?' + query);
    if (!Array.isArray(data[key])) throw new Error('Invalid ' + endpoint + ' response');
    console.log(endpoint + ': ' + data[key].length + ' real records');
  }
  console.log('Live data probe passed.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
