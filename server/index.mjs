import http from 'node:http';
import { Buffer } from 'node:buffer';
import { loadEnvFile } from 'node:process';
import { geocode, reverseGeocode } from './lib/geocode.mjs';
import { getPlaces, getRestaurants, getTransport } from './lib/overpass.mjs';
import { getWeather } from './lib/weather.mjs';
import { aiConfigured, enrichTrip } from './lib/ai.mjs';
import { AppError, publicError } from './lib/errors.mjs';
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
  const requestId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  res.once('finish', () =>
    console.log(
      JSON.stringify({
        scope: 'request',
        requestId,
        method: req.method,
        path: req.url?.split('?')[0],
        status: res.statusCode,
        elapsedMs: Date.now() - startedAt,
      }),
    ),
  );
  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return;
  }
  try {
    const url = new URL(req.url, 'http://localhost');
    const q = url.searchParams;
    if (url.pathname === '/health') {
      reply(res, 200, { status: 'ok', aiConfigured: aiConfigured(), requestId });
      return;
    }
    if (url.pathname === '/api/ai-plan') {
      if (req.method !== 'POST') {
        throw new AppError('INVALID_REQUEST', 'ai', 'Method not allowed.', {
          status: 405,
          retryable: false,
        });
      }
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (Buffer.byteLength(body) > 500000) {
          throw new AppError('INVALID_REQUEST', 'ai', 'Request is too large.', {
            status: 413,
            retryable: false,
          });
        }
      }
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new AppError('INVALID_REQUEST', 'ai', 'Valid JSON is required.', {
          status: 400,
          retryable: false,
        });
      }
      const data = await enrichTrip(parsed.trip, parsed.prefs);
      reply(res, 200, {
        data,
        meta: { requestId, source: 'configured-ai', elapsedMs: Date.now() - startedAt },
      });
      return;
    }
    if (req.method !== 'GET') {
      throw new AppError('INVALID_REQUEST', 'landmarks', 'Method not allowed.', {
        status: 405,
        retryable: false,
      });
    }
    if (url.pathname === '/api/geocode') {
      const city = q.get('q')?.trim();
      if (!city || city.length > 150) {
        throw new AppError(
          'INVALID_REQUEST',
          'geocode',
          'Enter a city name (up to 150 characters).',
          {
            status: 400,
            retryable: false,
          },
        );
        return;
      }
      const result = await geocode(city);
      reply(res, 200, {
        data: { results: result.results },
        meta: {
          ...result.meta,
          requestId,
          elapsedMs: Date.now() - startedAt,
          count: result.results.length,
        },
      });
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
      throw new AppError('INVALID_REQUEST', 'landmarks', 'Valid coordinates are required.', {
        status: 400,
        retryable: false,
      });
    }
    switch (url.pathname) {
      case '/api/places':
        {
          const result = await getPlaces(lat, lng, radius);
          reply(res, 200, {
            data: { places: result.places },
            meta: { ...result.meta, requestId, elapsedMs: Date.now() - startedAt },
          });
        }
        break;
      case '/api/restaurants':
        {
          const result = await getRestaurants(lat, lng, radius);
          reply(res, 200, {
            data: { restaurants: result.restaurants },
            meta: { ...result.meta, requestId, elapsedMs: Date.now() - startedAt },
          });
        }
        break;
      case '/api/transport':
        {
          const result = await getTransport(lat, lng, radius);
          reply(res, 200, {
            data: { stations: result.stations, routes: result.routes },
            meta: { ...result.meta, requestId, elapsedMs: Date.now() - startedAt },
          });
        }
        break;
      case '/api/reverse-geocode':
        reply(res, 200, {
          data: await reverseGeocode(lat, lng),
          meta: { requestId, elapsedMs: Date.now() - startedAt },
        });
        break;
      case '/api/weather':
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(q.get('startDate') ?? '') ||
          !/^\d{4}-\d{2}-\d{2}$/.test(q.get('endDate') ?? '')
        ) {
          throw new AppError('INVALID_REQUEST', 'weather', 'Valid dates are required.', {
            status: 400,
            retryable: false,
          });
        }
        reply(res, 200, {
          data: { weather: await getWeather(lat, lng, q.get('startDate'), q.get('endDate')) },
          meta: { requestId, elapsedMs: Date.now() - startedAt },
        });
        break;
      default:
        throw new AppError('INVALID_REQUEST', 'landmarks', 'Endpoint not found.', {
          status: 404,
          retryable: false,
        });
    }
  } catch (e) {
    const error = publicError(e, requestId);
    reply(res, error.status, error.body);
  }
});
server.listen(port, '0.0.0.0', () => console.log('Norte travel data ready on port ' + port));
