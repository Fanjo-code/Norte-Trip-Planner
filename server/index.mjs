import http from 'node:http';
import { Buffer } from 'node:buffer';
import { loadEnvFile } from 'node:process';
import { geocode, reverseGeocode } from './lib/geocode.mjs';
import { getPlaces, getRestaurants, getTransport } from './lib/overpass.mjs';
import { getWeather } from './lib/weather.mjs';
import { aiConfigured, enrichTrip } from './lib/ai.mjs';
try {
  loadEnvFile();
} catch {}
const port = Number(process.env.PROXY_PORT) || 8787;
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};
const reply = (res, status, data) => {
  res.writeHead(status, headers);
  res.end(JSON.stringify(data));
};
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return;
  }
  try {
    const url = new URL(req.url, 'http://localhost');
    const q = url.searchParams;
    if (url.pathname === '/health') {
      reply(res, 200, { status: 'ok', aiConfigured: aiConfigured() });
      return;
    }
    if (url.pathname === '/api/ai-plan') {
      if (req.method !== 'POST') {
        reply(res, 405, { error: 'Method not allowed' });
        return;
      }
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (Buffer.byteLength(body) > 500000) {
          reply(res, 413, { error: 'Request is too large.' });
          return;
        }
      }
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        reply(res, 400, { error: 'Valid JSON is required.' });
        return;
      }
      try {
        reply(res, 200, { trip: await enrichTrip(parsed.trip, parsed.prefs) });
      } catch (e) {
        reply(res, e.status ?? 502, {
          error:
            e.status === 400 || e.status === 503
              ? e.message
              : 'AI editing is temporarily unavailable. Your live itinerary is still ready.',
        });
      }
      return;
    }
    if (req.method !== 'GET') {
      reply(res, 405, { error: 'Method not allowed' });
      return;
    }
    if (url.pathname === '/api/geocode') {
      const city = q.get('q')?.trim();
      if (!city || city.length > 150) {
        reply(res, 400, { error: 'Enter a city name (up to 150 characters).' });
        return;
      }
      reply(res, 200, await geocode(city));
      return;
    }
    const lat = Number(q.get('lat')),
      lng = Number(q.get('lng')),
      radius = Math.min(10000, Math.max(500, Number(q.get('radius') ?? 3000)));
    if (
      !q.has('lat') ||
      !q.has('lng') ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180 ||
      !Number.isFinite(radius)
    ) {
      reply(res, 400, { error: 'Valid coordinates are required.' });
      return;
    }
    switch (url.pathname) {
      case '/api/places':
        reply(res, 200, { places: await getPlaces(lat, lng, radius) });
        break;
      case '/api/restaurants':
        reply(res, 200, { restaurants: await getRestaurants(lat, lng, radius) });
        break;
      case '/api/transport':
        reply(res, 200, await getTransport(lat, lng, radius));
        break;
      case '/api/reverse-geocode':
        reply(res, 200, await reverseGeocode(lat, lng));
        break;
      case '/api/weather':
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(q.get('startDate') ?? '') ||
          !/^\d{4}-\d{2}-\d{2}$/.test(q.get('endDate') ?? '')
        ) {
          reply(res, 400, { error: 'Valid dates are required.' });
          break;
        }
        reply(res, 200, {
          weather: await getWeather(lat, lng, q.get('startDate'), q.get('endDate')),
        });
        break;
      default:
        reply(res, 404, { error: 'Not found' });
    }
  } catch (e) {
    console.error('[travel]', e.message);
    reply(res, 502, {
      error: e.message?.includes('City not found')
        ? e.message
        : 'The city data service is busy. Please try again shortly.',
    });
  }
});
server.listen(port, '0.0.0.0', () => console.log('Norte travel data ready on port ' + port));
