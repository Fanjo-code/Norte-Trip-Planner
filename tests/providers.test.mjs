import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getPlaces,
  getRestaurants,
  getTransport,
  resetEndpointHealth,
} from '../server/lib/overpass.mjs';

const element = (id, name = 'Verified place') => ({
  type: 'node',
  id,
  lat: 41,
  lon: -8,
  tags: { name, tourism: 'museum' },
});

test('Overpass uses POST and succeeds on the first endpoint', async (t) => {
  resetEndpointHealth();
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push(url);
    assert.equal(options.method, 'POST');
    assert.match(String(options.body), /^data=/);
    return Response.json({ elements: [element(1)] });
  });
  const rnd = Math.random();
  const result = await getPlaces(41.00001 + rnd, -8.00001 - rnd);
  assert.equal(result.places.length, 1);
  assert.equal(calls.length, 1);
  assert.match(calls[0], /overpass\.kumi\.systems/);
});

test('Overpass fails over and temporarily skips an endpoint after repeated failures', async (t) => {
  resetEndpointHealth();
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    calls.push(url);
    if (url.includes('kumi')) throw new Error('down');
    return Response.json({ elements: [element(calls.length, 'Verified ' + calls.length)] });
  });
  const rnd = Math.random() + 0.1;
  await getPlaces(41.10001 + rnd, -8.10001 - rnd);
  await getPlaces(41.20001 + rnd, -8.20001 - rnd);
  const before = calls.length;
  await getPlaces(41.30001 + rnd, -8.30001 - rnd);
  assert.equal(
    calls.slice(before).some((url) => url.includes('kumi')),
    false,
  );
  assert.equal(
    calls.slice(before).some((url) => url.includes('private.coffee')),
    true,
  );
});

test('complete provider outage returns a structured retryable landmark error', async (t) => {
  resetEndpointHealth();
  t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('offline');
  });
  const rnd = Math.random() + 0.2;
  await assert.rejects(
    getPlaces(42.40001 + rnd, -7.40001 - rnd),
    (error) =>
      error.code === 'UPSTREAM_UNAVAILABLE' && error.stage === 'landmarks' && error.retryable,
  );
});

test('optional Overpass stages are serialized', async (t) => {
  resetEndpointHealth();
  let active = 0;
  let maximum = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    active++;
    maximum = Math.max(maximum, active);
    await new Promise((resolve) => setTimeout(resolve, 15));
    active--;
    return Response.json({ elements: [] });
  });
  const rnd = Math.random() + 0.3;
  await Promise.all([
    getRestaurants(40.50001 + rnd, -7.50001 - rnd),
    getTransport(40.50002 + rnd, -7.50002 - rnd),
  ]);
  assert.equal(maximum, 1);
});
