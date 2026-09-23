import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { aiConfigured, enrichTrip, validateSuggestion } from '../server/lib/ai.mjs';
import { cached, cachedWithMeta, fetchJson, ProviderError } from '../server/lib/http.mjs';
import { loadTs } from './load-ts.mjs';

const place = (id, lat = 41, lng = -8) => ({
  id,
  name: 'Verified ' + id,
  category: 'Museum',
  lat,
  lng,
});
const trip = {
  destination: 'Test fixture',
  places: [place('p1'), place('p2', 41.001), place('p3', 41.002)],
  itinerary: [{ day: 1, title: 'Original', activities: [] }],
};
const suggestion = { days: [{ day: 1, placeIds: ['p1', 'p2', 'p3'] }] };
const prefs = { pace: 'balanced', interests: [] };

test('client health is short and AI uses the ID-only POST envelope', async (t) => {
  const client = loadTs('services/ai.ts');
  t.mock.method(globalThis, 'fetch', async (url, options = {}) => {
    assert.equal(
      new URL(url).origin,
      new URL(process.env.EXPO_PUBLIC_PROXY_URL || 'http://localhost:8787').origin,
    );
    if (new URL(url).pathname === '/health') {
      assert.ok(options.signal);
      return Response.json({ aiConfigured: true });
    }
    assert.equal(new URL(url).pathname, '/api/ai-plan');
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), { trip, prefs });
    return Response.json({ data: { suggestion: { ...suggestion, createdAt: 'now' } }, meta: {} });
  });
  assert.equal(await client.isAiAvailable(), true);
  assert.deepEqual(await client.requestAiSuggestion(trip, prefs), {
    ...suggestion,
    createdAt: 'now',
  });
});

test('Groq and OmniRoute receive verified candidates and return only selected IDs', async (t) => {
  const keys = [
    'GROQ_API_KEY',
    'GROQ_MODEL',
    'OMNIROUTE_BASE_URL',
    'OMNIROUTE_API_KEY',
    'OMNIROUTE_MODEL',
  ];
  const old = keys.map((key) => process.env[key]);
  t.after(() =>
    keys.forEach((key, index) =>
      old[index] === undefined ? delete process.env[key] : (process.env[key] = old[index]),
    ),
  );
  keys.forEach((key) => delete process.env[key]);
  assert.equal(aiConfigured(), false);
  await assert.rejects(enrichTrip(trip, prefs), { code: 'AI_UNAVAILABLE' });

  let expected;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, expected);
    assert.equal(options.headers.Authorization, 'Bearer test-only');
    assert.ok(JSON.parse(options.body).messages[1].content.includes('p1'));
    assert.ok(options.signal);
    return Response.json({ choices: [{ message: { content: JSON.stringify(suggestion) } }] });
  });
  for (const base of ['http://localhost:20128', 'http://localhost:20128/v1/']) {
    process.env.OMNIROUTE_BASE_URL = base;
    process.env.OMNIROUTE_API_KEY = 'test-only';
    expected = 'http://localhost:20128/v1/chat/completions';
    assert.deepEqual((await enrichTrip(trip, prefs)).suggestion.days, suggestion.days);
  }
  process.env.GROQ_API_KEY = 'test-only';
  expected = 'https://api.groq.com/openai/v1/chat/completions';
  assert.deepEqual((await enrichTrip(trip, prefs)).suggestion.days, suggestion.days);
});

test('AI validation rejects altered facts, unknown IDs, duplicates, missing days and pace overflow', () => {
  assert.deepEqual(validateSuggestion(trip, suggestion, prefs), suggestion);
  for (const invalid of [
    { days: [{ day: 1, placeIds: ['unknown', 'p2', 'p3'] }] },
    { days: [{ day: 1, placeIds: ['p1', 'p1', 'p2'] }] },
    { days: [] },
    { days: [{ day: 1, placeIds: ['p1', 'p2', 'p3'], title: 'Invented prose' }] },
    { days: [{ day: 1, placeIds: ['p1'] }] },
  ])
    assert.throws(() => validateSuggestion(trip, invalid, prefs), { code: 'INVALID_AI_RESPONSE' });
  const packedPlaces = { ...trip, places: [...trip.places, place('p4'), place('p5'), place('p6')] };
  assert.throws(
    () =>
      validateSuggestion(
        packedPlaces,
        { days: [{ day: 1, placeIds: ['p1', 'p2', 'p3', 'p4'] }] },
        prefs,
      ),
    { code: 'INVALID_AI_RESPONSE' },
  );
});

test('bounded fetch maps a stalled body to a timeout error', async (t) => {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.write('{');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  await assert.rejects(
    fetchJson(`http://127.0.0.1:${server.address().port}`, {}, 50),
    (error) => error instanceof ProviderError && error.code === 'UPSTREAM_TIMEOUT',
  );
});

test('cache deduplicates, rejects invalid data and serves verified stale data on error', async () => {
  const key = 'test:' + randomUUID();
  let calls = 0;
  const fn = async () => ({ count: ++calls });
  assert.deepEqual(await Promise.all([cached(key, 10000, fn), cached(key, 10000, fn)]), [
    { count: 1 },
    { count: 1 },
  ]);
  assert.equal(calls, 1);

  const staleKey = key + ':stale';
  await cachedWithMeta(staleKey, { freshMs: -1, staleMs: 10000 }, async () => ({ items: [1] }));
  const stale = await cachedWithMeta(
    staleKey,
    { freshMs: -1, staleMs: 10000, validate: (value) => value.items.length > 0 },
    async () => {
      throw new Error('provider outage');
    },
  );
  assert.equal(stale.meta.cache, 'stale');
  assert.deepEqual(stale.data.items, [1]);
  await assert.rejects(
    cachedWithMeta(
      key + ':invalid',
      { freshMs: 1000, validate: (value) => value.items.length > 0 },
      async () => ({ items: [] }),
    ),
    ProviderError,
  );
});
