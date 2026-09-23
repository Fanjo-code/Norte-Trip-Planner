import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { aiConfigured, enrichTrip, applyEditorialPlan } from '../server/lib/ai.mjs';
import { cached, fetchJson } from '../server/lib/http.mjs';
import { getFallbackRestaurants } from '../server/lib/fallback-restaurants.mjs';
import { loadTs } from './load-ts.mjs';

const trip = {
  destination: 'Test fixture',
  itinerary: [
    {
      day: 1,
      title: 'Original',
      activities: [
        {
          id: 'fixture',
          title: 'Verified name',
          lat: 41,
          lng: -8,
          rating: null,
          price: null,
          description: 'Museum',
        },
      ],
    },
  ],
};
const editorial = {
  days: [
    {
      day: 1,
      title: 'Museums',
      activities: [
        { id: 'fixture', description: 'Explore the museum.', title: 'Invented name', rating: 5 },
      ],
    },
  ],
};

test('client uses the proxy health and POST trip envelope', async (t) => {
  const client = loadTs('services/ai.ts');
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(
      new URL(url).origin,
      new URL(process.env.EXPO_PUBLIC_PROXY_URL || 'http://localhost:8787').origin,
    );
    if (new URL(url).pathname === '/health') return Response.json({ aiConfigured: true });
    assert.equal(new URL(url).pathname, '/api/ai-plan');
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), { trip, prefs: {} });
    return Response.json({ trip });
  });
  assert.equal(await client.isAiAvailable(), true);
  assert.deepEqual(await client.enrichTrip(trip, {}), trip);
});

test('Groq and OmniRoute use chat completions with server credentials', async (t) => {
  const keys = [
    'GROQ_API_KEY',
    'GROQ_MODEL',
    'OMNIROUTE_BASE_URL',
    'OMNIROUTE_API_KEY',
    'OMNIROUTE_MODEL',
  ];
  const old = keys.map((k) => process.env[k]);
  t.after(() =>
    keys.forEach((k, i) =>
      old[i] === undefined ? delete process.env[k] : (process.env[k] = old[i]),
    ),
  );
  keys.forEach((k) => delete process.env[k]);
  assert.equal(aiConfigured(), false);
  await assert.rejects(enrichTrip(trip, {}), { status: 503 });
  let expected;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, expected);
    assert.equal(options.headers.Authorization, 'Bearer test-only');
    assert.ok(JSON.parse(options.body).messages[1].content.includes('fixture'));
    assert.ok(options.signal);
    return Response.json({ choices: [{ message: { content: JSON.stringify(editorial) } }] });
  });
  for (const base of ['http://localhost:20128', 'http://localhost:20128/v1/']) {
    process.env.OMNIROUTE_BASE_URL = base;
    process.env.OMNIROUTE_API_KEY = 'test-only';
    expected = 'http://localhost:20128/v1/chat/completions';
    const result = await enrichTrip(trip, {});
    assert.equal(result.source, 'ai');
    assert.deepEqual(result.itinerary[0].activities[0], {
      ...trip.itinerary[0].activities[0],
      description: 'Explore the museum.',
    });
  }
  process.env.GROQ_API_KEY = 'test-only';
  expected = 'https://api.groq.com/openai/v1/chat/completions';
  await enrichTrip(trip, {});
  assert.throws(() => applyEditorialPlan(trip, { days: [] }));
  assert.throws(() =>
    applyEditorialPlan(trip, { days: [{ ...editorial.days[0], activities: [] }] }),
  );
});

test('bounded fetch aborts even while reading the response body', async (t) => {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.write('{');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  await assert.rejects(fetchJson(`http://127.0.0.1:${server.address().port}`, {}, 50), (e) =>
    /Abort|Timeout/.test(e.name),
  );
});

test('cache deduplicates, persists, expires and retries failures', async () => {
  const key = 'test:' + randomUUID();
  let calls = 0;
  const fn = async () => {
    calls++;
    return { count: calls };
  };
  assert.deepEqual(await Promise.all([cached(key, 10000, fn), cached(key, 10000, fn)]), [
    { count: 1 },
    { count: 1 },
  ]);
  assert.deepEqual(await cached(key, 10000, fn), { count: 1 });
  assert.deepEqual(await cached(key, -1, fn), { count: 2 });
  const failed = key + ':failed';
  await assert.rejects(
    cached(failed, 10000, async () => {
      throw Error('outage');
    }),
  );
  assert.deepEqual(await cached(failed, 10000, fn), { count: 3 });
});

test('Moscow never receives Munich fallback restaurants', () => {
  assert.deepEqual(getFallbackRestaurants('Moscow', 55.625578, 37.6063916), []);
  const local = getFallbackRestaurants('Munich', 48.137, 11.576);
  assert.ok(local.length > 0);
  assert.ok(local.every((r) => r.rating === null && Number.isFinite(r.lng)));
});
