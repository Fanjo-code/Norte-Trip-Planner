import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';

const { buildItinerary, buildItineraryFromSelection } = loadTs('lib/itinerary.ts');
const { daysBetween, localISO, parseDate, addDays } = loadTs('lib/format.ts');
const { mapsUrl, placeKey, validCoords } = loadTs('lib/places.ts');
const preferences = { interests: [], pace: 'balanced', budget: 'standard' };
const place = (id, lat = 41, lng = -8, durationMinutes = 60) => ({
  id,
  name: id,
  lat,
  lng,
  category: 'Museum',
  description: 'A verified museum.',
  timeToSpend: `Allow ~${durationMinutes} minutes`,
  durationMinutes,
  price: null,
  rating: null,
  icon: 'library-outline',
});

test('calendar dates survive local storage and daylight-saving boundaries', () => {
  const start = parseDate('2026-03-28');
  const end = parseDate('2026-03-30');
  assert.equal(daysBetween(start, end), 3);
  assert.equal(localISO(start), '2026-03-28');
  assert.equal(localISO(addDays(start, 2)), '2026-03-30');
  assert.equal(daysBetween(start, start), 1);
});

test('place matching supports accents and non-Latin names', () => {
  assert.equal(placeKey('Église Saint-Paul'), placeKey('Eglise Saint Paul'));
  assert.notEqual(placeKey('東京タワー'), placeKey('浅草寺'));
  assert.equal(validCoords({ lat: 0, lng: 10 }), true);
  assert.equal(validCoords({ lat: 0, lng: 0 }), false);
});

test('walking directions preserve the first and last stop', () => {
  const url = new URL(
    mapsUrl([
      { lat: 41, lng: -8 },
      { lat: 42, lng: -7 },
      { lat: 43, lng: -6 },
    ]),
  );
  assert.equal(url.searchParams.get('origin'), '41,-8');
  assert.equal(url.searchParams.get('destination'), '43,-6');
  assert.equal(url.searchParams.get('waypoints'), '42,-7');
});

test('pace keeps the requested 2/3/5 verified sights without duplication', () => {
  const places = Array.from({ length: 20 }, (_, index) => place('p' + index, 41 + index / 100));
  for (const [pace, count] of [
    ['relaxed', 2],
    ['balanced', 3],
    ['packed', 5],
  ]) {
    const plan = buildItinerary(2, places, [], 'Porto', { ...preferences, pace });
    assert.equal(plan[0].activities.length, count);
    assert.equal(
      new Set(plan.flatMap((day) => day.activities.map((activity) => activity.id))).size,
      count * 2,
    );
  }
  assert.equal(places.length, 20);
});

test('neighbouring sights are grouped and activity IDs remain stable', () => {
  const plan = buildItinerary(
    1,
    [place('start'), place('far', 45), place('near', 41.001)],
    [],
    'Porto',
    {
      ...preferences,
      pace: 'relaxed',
    },
  );
  assert.deepEqual(
    plan[0].activities.map((activity) => activity.title),
    ['start', 'near'],
  );
  assert.deepEqual(
    plan[0].activities.map((activity) => activity.id),
    ['place-start', 'place-near'],
  );
  assert.deepEqual(
    buildItinerary(1, [place('start')], [], 'Porto', preferences)[0].activities[0].id,
    'place-start',
  );
});

test('duration-aware scheduling includes travel buffers and a midday break', () => {
  const plan = buildItineraryFromSelection([
    [
      place('morning', 41, -8, 120),
      place('lunch-edge', 41.01, -8, 120),
      place('afternoon', 41.02, -8, 60),
    ],
  ]);
  assert.deepEqual(
    plan[0].activities.map((activity) => activity.time),
    ['09:30', '14:00', '16:15'],
  );
  assert.deepEqual(
    plan[0].activities.map((activity) => activity.durationMinutes),
    [120, 120, 60],
  );
});

test('insufficient verified places produce flexible empty days without fake records', () => {
  const plan = buildItinerary(4, [place('only')], [], 'Porto', preferences);
  assert.equal(plan.length, 4);
  assert.equal(plan.flatMap((day) => day.activities).length, 1);
  assert.deepEqual(
    plan.slice(1).map((day) => day.title),
    ['A flexible day', 'A flexible day', 'A flexible day'],
  );
});

test('landmark success creates a usable core trip without optional stages', async () => {
  const { generateTrip } = loadTs('services/travel.ts');
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const path = new URL(url).pathname;
    const payload =
      path === '/api/geocode'
        ? {
            data: {
              results: [
                {
                  id: 'porto',
                  name: 'Porto',
                  displayName: 'Porto, Portugal',
                  region: null,
                  country: 'Portugal',
                  countryCode: 'PT',
                  lat: 41,
                  lng: -8,
                  boundingBox: null,
                },
              ],
            },
            meta: { cache: 'miss' },
          }
        : {
            data: {
              places: [
                {
                  id: 'p1',
                  name: 'Verified museum',
                  lat: 41,
                  lng: -8,
                  tags: { tourism: 'museum' },
                  rating: null,
                },
              ],
            },
            meta: { cache: 'miss', fetchedAt: '2026-09-24T00:00:00.000Z' },
          };
    return Response.json(payload);
  };
  try {
    const trip = await generateTrip(
      'Porto',
      parseDate('2026-10-01'),
      parseDate('2026-10-05'),
      preferences,
    );
    assert.equal(trip.itinerary.length, 5);
    assert.equal(trip.places[0].rating, null);
    assert.equal(trip.places[0].price, null);
    assert.equal(trip.restaurants.length, 0);
    assert.equal(trip.currency, null);
    assert.equal(trip.dailyBudget, null);
    assert.equal(trip.planning.stages.restaurants.state, 'idle');
  } finally {
    globalThis.fetch = original;
  }
});

test('structured landmark errors survive the client boundary', async () => {
  const { createCoreTrip, ProxyError } = loadTs('services/travel.ts');
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    Response.json(
      {
        error: {
          code: 'UPSTREAM_TIMEOUT',
          stage: 'landmarks',
          message: 'Landmarks timed out.',
          retryable: true,
          requestId: 'req-1',
        },
      },
      { status: 504 },
    );
  try {
    await assert.rejects(
      createCoreTrip(
        {
          id: 'porto',
          name: 'Porto',
          displayName: 'Porto',
          region: null,
          country: 'Portugal',
          countryCode: 'PT',
          lat: 41,
          lng: -8,
          boundingBox: null,
        },
        new Date(),
        new Date(),
        preferences,
      ),
      (error) =>
        error instanceof ProxyError &&
        error.code === 'UPSTREAM_TIMEOUT' &&
        error.stage === 'landmarks' &&
        error.requestId === 'req-1',
    );
  } finally {
    globalThis.fetch = original;
  }
});

test('planning stops when cancelled', async () => {
  const { generateTrip } = loadTs('services/travel.ts');
  const original = globalThis.fetch;
  globalThis.fetch = async (_, options) => {
    if (options.signal.aborted) throw new DOMException('Aborted', 'AbortError');
    throw new Error('Unexpected request');
  };
  const controller = new AbortController();
  controller.abort();
  try {
    await assert.rejects(
      () => generateTrip('Porto', new Date(), new Date(), preferences, controller.signal),
      { name: 'AbortError' },
    );
  } finally {
    globalThis.fetch = original;
  }
});

test('late enrichment merges into the latest revision without overwriting itinerary or progress data', () => {
  const { mergePlanningStage, interruptRunningStages } = loadTs('lib/planning-state.ts');
  const stages = Object.fromEntries(
    ['landmarks', 'restaurants', 'transport', 'ai'].map((name) => [
      name,
      { state: name === 'restaurants' ? 'running' : 'succeeded', updatedAt: 'old' },
    ]),
  );
  const latest = {
    destination: 'Porto',
    places: [place('p1')],
    restaurants: [],
    transport: [],
    itinerary: [{ day: 1, title: 'User order', activities: [{ id: 'place-p1', completed: true }] }],
    planning: { version: 2, revision: 7, stages },
  };
  const merged = mergePlanningStage(
    latest,
    'restaurants',
    { state: 'succeeded', updatedAt: 'new' },
    { restaurants: [{ id: 'r1' }] },
  );
  assert.strictEqual(merged.itinerary, latest.itinerary);
  assert.deepEqual(merged.restaurants, [{ id: 'r1' }]);
  assert.equal(merged.planning.revision, 8);

  const interrupted = interruptRunningStages(latest, 'reload');
  assert.equal(interrupted.planning.stages.restaurants.state, 'interrupted');
  assert.equal(interrupted.planning.stages.restaurants.retryable, true);
  assert.equal(interrupted.planning.stages.ai.state, 'succeeded');
});
