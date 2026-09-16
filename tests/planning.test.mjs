import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';
import { applyEditorialPlan } from '../server/lib/ai.mjs';
const { buildItinerary } = loadTs('lib/itinerary.ts');
const { daysBetween, localISO, parseDate, addDays } = loadTs('lib/format.ts');
const { mapsUrl, placeKey, validCoords } = loadTs('lib/places.ts');
const preferences = { interests: [], pace: 'balanced', budget: 'standard' };
const place = (id, lat = 41, lng = -8) => ({
  id,
  name: id,
  lat,
  lng,
  category: 'Museum',
  description: 'A verified museum.',
  timeToSpend: 'Allow ~2 hours',
  price: null,
  icon: 'library-outline',
});
const restaurant = (id) => ({
  id,
  name: id,
  lat: 41,
  lng: -8,
  meal: 'Dinner',
  cuisine: 'Local',
  neighborhood: 'Centre',
  description: 'A verified restaurant.',
  priceLevel: null,
  rating: null,
  icon: 'restaurant-outline',
});
test('calendar dates survive local storage and daylight-saving boundaries', () => {
  const start = parseDate('2026-03-28'),
    end = parseDate('2026-03-30');
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
test('pace changes the daily number of sights without mutating the collection', () => {
  const places = Array.from({ length: 20 }, (_, i) => place('p' + i, 41 + i / 100));
  for (const [pace, count] of [
    ['relaxed', 2],
    ['balanced', 3],
    ['packed', 5],
  ]) {
    const plan = buildItinerary(2, places, [], 'Porto', { ...preferences, pace });
    assert.equal(plan[0].activities.length, count);
    assert.equal(new Set(plan.flatMap((d) => d.activities.map((a) => a.id))).size, count * 2);
  }
  assert.equal(places.length, 20);
});
test('neighbouring sights are grouped together', () => {
  const plan = buildItinerary(
    1,
    [place('start'), place('far', 45), place('near', 41.001)],
    [],
    'Porto',
    { ...preferences, pace: 'relaxed' },
  );
  assert.deepEqual(
    plan[0].activities.map((a) => a.title),
    ['start', 'near'],
  );
});
test('long trips retain dining options and chronological activities', () => {
  const plan = buildItinerary(
    14,
    [place('museum')],
    [restaurant('a'), restaurant('b')],
    'Porto',
    preferences,
  );
  assert.equal(plan.length, 14);
  for (const day of plan) {
    assert.equal(day.activities.filter((a) => a.icon === 'restaurant-outline').length, 2);
    assert.deepEqual(
      day.activities.map((a) => a.time),
      day.activities.map((a) => a.time).sort(),
    );
  }
});
test('AI editing cannot introduce a new place or change verified coordinates', () => {
  const trip = { itinerary: buildItinerary(1, [place('museum')], [], 'Porto', preferences) };
  const editorial = {
    days: [
      {
        day: 1,
        title: 'Artful beginnings',
        activities: [
          {
            id: trip.itinerary[0].activities[0].id,
            description: 'Explore the museum at your own pace.',
          },
        ],
      },
    ],
  };
  const enriched = applyEditorialPlan(trip, editorial);
  assert.equal(enriched.source, 'ai');
  assert.equal(enriched.itinerary[0].activities[0].lat, 41);
  assert.equal(trip.itinerary[0].title, 'First impressions');
  editorial.days[0].activities[0].id = 'invented';
  assert.throws(() => applyEditorialPlan(trip, editorial), /verified places/);
});
test('partial upstream outages still produce a usable live itinerary', async () => {
  const { generateTrip } = loadTs('services/travel.ts');
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const path = new URL(url).pathname;
    const payload =
      path === '/api/geocode'
        ? { lat: 41, lng: -8, name: 'Porto' }
        : path === '/api/places'
          ? {
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
            }
          : { error: 'Temporarily unavailable' };
    return new Response(JSON.stringify(payload), {
      status: path === '/api/geocode' || path === '/api/places' ? 200 : 502,
      headers: { 'Content-Type': 'application/json' },
    });
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
    assert.equal(trip.notes.length, 2);
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
  const ctrl = new AbortController();
  ctrl.abort();
  try {
    await assert.rejects(
      () => generateTrip('Porto', new Date(), new Date(), preferences, ctrl.signal),
      { name: 'AbortError' },
    );
  } finally {
    globalThis.fetch = original;
  }
});
