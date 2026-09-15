/**
 * Norte Trip Planner — Local Travel Data Proxy
 * Aggregates free APIs: Nominatim, Overpass/OSM, Open-Meteo.
 * Run: node server/index.mjs  (port 8787)
 */

import http from 'http';
import { URL } from 'url';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { loadEnvFile } from 'process';

// Load .env file (Node 20.6+)
try {
  loadEnvFile();
} catch {
  // fallback for older Node
  try {
    const fs = await import('fs/promises');
    const envContent = await fs.readFile('.env', 'utf-8');
    for (const line of envContent.split('\n')) {
      const [key, ...val] = line.split('=');
      if (key && !process.env[key.trim()]) {
        process.env[key.trim()] = val.join('=').trim();
      }
    }
  } catch { /* ignore */ }
}

import { geocode, reverseGeocode } from './lib/geocode.mjs';
import { getPlaces, getRestaurants, getTransport } from './lib/overpass.mjs';
import { getWeather } from './lib/weather.mjs';

const PORT = process.env.PROXY_PORT || 8787;
const CORS_ORIGIN = '*'; // Expo Go on LAN

// Simple in-memory response cache (5 min TTL)
const responseCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function cacheKey(req) {
  return `${req.method}:${req.url}`;
}

function getCached(key) {
  const entry = responseCache.get(key);
  if (entry && Date.now() < entry.expiresAt) return entry.data;
  responseCache.delete(key);
  return null;
}

function setCache(key, data) {
  responseCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonResponse(res, status, data) {
  res.writeHead(status, { ...corsHeaders(), 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function errorResponse(res, status, message) {
  jsonResponse(res, status, { error: message });
}

async function handleGeocode(req, res, query) {
  const q = query.get('q');
  if (!q) return errorResponse(res, 400, 'Missing "q" parameter');
  try {
    const result = await geocode(q);
    jsonResponse(res, 200, result);
  } catch (e) {
    errorResponse(res, 502, `Geocode failed: ${e.message}`);
  }
}

async function handleReverseGeocode(req, res, query) {
  const lat = query.get('lat');
  const lng = query.get('lng');
  if (!lat || !lng) return errorResponse(res, 400, 'Missing lat/lng');
  try {
    const result = await reverseGeocode(parseFloat(lat), parseFloat(lng));
    jsonResponse(res, 200, result);
  } catch (e) {
    errorResponse(res, 502, `Reverse geocode failed: ${e.message}`);
  }
}

async function handlePlaces(req, res, query) {
  const lat = query.get('lat');
  const lng = query.get('lng');
  const radius = query.get('radius') || '3000';
  if (!lat || !lng) return errorResponse(res, 400, 'Missing lat/lng');
  try {
    const places = await getPlaces(parseFloat(lat), parseFloat(lng), parseInt(radius));
    jsonResponse(res, 200, { places });
  } catch (e) {
    errorResponse(res, 502, `Places failed: ${e.message}`);
  }
}

async function handleRestaurants(req, res, query) {
  const lat = query.get('lat');
  const lng = query.get('lng');
  const radius = query.get('radius') || '2000';
  if (!lat || !lng) return errorResponse(res, 400, 'Missing lat/lng');
  try {
    const restaurants = await getRestaurants(parseFloat(lat), parseFloat(lng), parseInt(radius));
    jsonResponse(res, 200, { restaurants });
  } catch (e) {
    errorResponse(res, 502, `Restaurants failed: ${e.message}`);
  }
}

async function handleTransport(req, res, query) {
  const lat = query.get('lat');
  const lng = query.get('lng');
  const radius = query.get('radius') || '5000';
  if (!lat || !lng) return errorResponse(res, 400, 'Missing lat/lng');
  try {
    const transport = await getTransport(parseFloat(lat), parseFloat(lng), parseInt(radius));
    jsonResponse(res, 200, transport);
  } catch (e) {
    errorResponse(res, 502, `Transport failed: ${e.message}`);
  }
}

async function handleWeather(req, res, query) {
  const lat = query.get('lat');
  const lng = query.get('lng');
  const startDate = query.get('startDate');
  const endDate = query.get('endDate');
  if (!lat || !lng || !startDate || !endDate) {
    return errorResponse(res, 400, 'Missing lat, lng, startDate, or endDate');
  }
  try {
    const weather = await getWeather(parseFloat(lat), parseFloat(lng), startDate, endDate);
    jsonResponse(res, 200, { weather });
  } catch (e) {
    errorResponse(res, 502, `Weather failed: ${e.message}`);
  }
}

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders());
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  // Cache check for GET
  if (req.method === 'GET') {
    const key = cacheKey(req);
    const cached = getCached(key);
    if (cached) {
      res.writeHead(200, { ...corsHeaders(), 'Content-Type': 'application/json', 'X-Cache': 'HIT' });
      return res.end(JSON.stringify(cached));
    }
  }

  // Wrap response to capture body for caching
  const originalWrite = res.write;
  const originalWriteHead = res.writeHead;
  const originalEnd = res.end;
  const chunks = [];
  let statusCode = 200;

  res.write = (chunk, ...args) => {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return originalWrite.apply(res, [chunk, ...args]);
  };

  res.writeHead = (code, ...args) => {
    statusCode = code;
    return originalWriteHead.apply(res, [code, ...args]);
  };

  res.end = (chunk, ...args) => {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return originalEnd.apply(res, [chunk, ...args]);
  };

  try {
    switch (path) {
      case '/api/geocode':
        await handleGeocode(req, res, url.searchParams);
        break;
      case '/api/reverse-geocode':
        await handleReverseGeocode(req, res, url.searchParams);
        break;
      case '/api/places':
        await handlePlaces(req, res, url.searchParams);
        break;
      case '/api/restaurants':
        await handleRestaurants(req, res, url.searchParams);
        break;
      case '/api/transport':
        await handleTransport(req, res, url.searchParams);
        break;
      case '/api/weather':
        await handleWeather(req, res, url.searchParams);
        break;
      case '/health':
        jsonResponse(res, 200, { status: 'ok', uptime: process.uptime() });
        break;
      default:
        errorResponse(res, 404, 'Not found');
    }
  } catch (e) {
    console.error('Server error:', e);
    errorResponse(res, 500, 'Internal server error');
  }

  // Cache successful GET responses
  if (req.method === 'GET' && statusCode === 200) {
    const key = cacheKey(req);
    try {
      const body = Buffer.concat(chunks).toString('utf-8');
      const data = JSON.parse(body);
      setCache(key, data);
    } catch {
      // ignore parse errors
    }
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Norte Travel Proxy running on http://0.0.0.0:${PORT}`);
  console.log(`   Endpoints:`);
  console.log(`   GET  /api/geocode?q=Porto`);
  console.log(`   GET  /api/reverse-geocode?lat=41.15&lng=-8.61`);
  console.log(`   GET  /api/places?lat=41.15&lng=-8.61`);
  console.log(`   GET  /api/restaurants?lat=41.15&lng=-8.61`);
  console.log(`   GET  /api/transport?lat=41.15&lng=-8.61`);
  console.log(`   GET  /api/weather?lat=41.15&lng=-8.61&startDate=2026-09-01&endDate=2026-09-05`);
  console.log(`   GET  /health`);
});