import { fetchJson } from './http.mjs';
import { AppError } from './errors.mjs';

export function aiConfigured() {
  return Boolean(process.env.GROQ_API_KEY || process.env.OMNIROUTE_BASE_URL);
}

const paceCount = (prefs) => (prefs?.pace === 'relaxed' ? 2 : prefs?.pace === 'packed' ? 5 : 3);
const distance = (a, b) =>
  Math.hypot((a.lat - b.lat) * 111, (a.lng - b.lng) * 111 * Math.cos((a.lat * Math.PI) / 180));

export function validateSuggestion(trip, proposed, prefs) {
  if (
    !proposed ||
    Object.keys(proposed).some((key) => key !== 'days') ||
    !Array.isArray(proposed.days)
  )
    throw new AppError('INVALID_AI_RESPONSE', 'ai', 'AI returned an invalid plan.', {
      status: 502,
    });
  if (proposed.days.length !== trip.itinerary.length)
    throw new AppError('INVALID_AI_RESPONSE', 'ai', 'AI did not return every trip day.', {
      status: 502,
    });
  const places = new Map(trip.places.map((place) => [place.id, place]));
  const seen = new Set();
  const limit = paceCount(prefs);
  const days = proposed.days.map((day, index) => {
    if (
      !day ||
      Object.keys(day).some((key) => !['day', 'placeIds'].includes(key)) ||
      day.day !== index + 1 ||
      !Array.isArray(day.placeIds) ||
      day.placeIds.length > limit
    )
      throw new AppError('INVALID_AI_RESPONSE', 'ai', 'AI returned an invalid day structure.', {
        status: 502,
      });
    for (const id of day.placeIds) {
      if (typeof id !== 'string' || !places.has(id) || seen.has(id))
        throw new AppError(
          'INVALID_AI_RESPONSE',
          'ai',
          'AI changed or duplicated a verified place.',
          {
            status: 502,
          },
        );
      seen.add(id);
    }
    for (let i = 1; i < day.placeIds.length; i++) {
      const previous = places.get(day.placeIds[i - 1]);
      const current = places.get(day.placeIds[i]);
      if (distance(previous, current) > 25)
        throw new AppError(
          'INVALID_AI_RESPONSE',
          'ai',
          'AI grouped places that are too far apart.',
          {
            status: 502,
          },
        );
    }
    return { day: day.day, placeIds: [...day.placeIds] };
  });
  const expected = Math.min(trip.places.length, trip.itinerary.length * limit);
  if (seen.size !== expected)
    throw new AppError('INVALID_AI_RESPONSE', 'ai', 'AI returned too few verified places.', {
      status: 502,
    });
  return { days };
}

export async function enrichTrip(trip, prefs) {
  if (!aiConfigured())
    throw new AppError('AI_UNAVAILABLE', 'ai', 'AI planning is not configured.', { status: 503 });
  if (
    !trip ||
    !Array.isArray(trip.places) ||
    !Array.isArray(trip.itinerary) ||
    trip.itinerary.length < 1 ||
    trip.itinerary.length > 30
  )
    throw new AppError('INVALID_REQUEST', 'ai', 'A valid verified trip is required.', {
      status: 400,
      retryable: false,
    });

  const groq = Boolean(process.env.GROQ_API_KEY);
  const configuredBase = (process.env.OMNIROUTE_BASE_URL || '').replace(/\/+$/, '');
  const base = groq
    ? 'https://api.groq.com/openai/v1'
    : configuredBase.endsWith('/v1')
      ? configuredBase
      : configuredBase + '/v1';
  const key = groq ? process.env.GROQ_API_KEY : process.env.OMNIROUTE_API_KEY;
  const model = groq
    ? process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
    : process.env.OMNIROUTE_MODEL || 'auto/best-free';
  const payload = {
    model,
    temperature: 0.2,
    max_tokens: 2000,
    messages: [
      {
        role: 'system',
        content:
          'Arrange only the supplied verified place IDs into the requested number of days. Respect pace, interests and geography. Never create an ID or return names, descriptions, ratings, prices, coordinates, prose, or extra keys. Return only JSON: {"days":[{"day":1,"placeIds":["verified-id"]}]}. Include every day in order and never repeat an ID.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          days: trip.itinerary.length,
          pace: prefs?.pace,
          maxPlacesPerDay: paceCount(prefs),
          requiredTotalPlaces: Math.min(trip.places.length, trip.itinerary.length * paceCount(prefs)),
          selectionRules: 'Use exactly requiredTotalPlaces distinct candidate IDs across all days. Never exceed maxPlacesPerDay on any day. Return each day as {day: number, placeIds: string[]} with no other fields.',
          interests: prefs?.interests ?? [],
          candidates: trip.places.map(({ id, name, category, lat, lng }) => ({
            id,
            name,
            category,
            lat,
            lng,
          })),
        }),
      },
    ],
  };
  let response;
  try {
    response = await fetchJson(
      base + '/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(key ? { Authorization: 'Bearer ' + key } : {}),
        },
        body: JSON.stringify(payload),
      },
      60000,
    );
  } catch (error) {
    throw new AppError(
      error.code === 'UPSTREAM_TIMEOUT' ? 'UPSTREAM_TIMEOUT' : 'AI_UNAVAILABLE',
      'ai',
      'AI planning is temporarily unavailable. Your verified itinerary is unchanged.',
      { status: error.status === 429 ? 429 : 502, cause: error },
    );
  }
  const text = response.choices?.[0]?.message?.content;
  if (typeof text !== 'string')
    throw new AppError('INVALID_AI_RESPONSE', 'ai', 'AI returned an empty plan.', { status: 502 });
  let proposed;
  try {
    proposed = JSON.parse(text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, ''));
  } catch (error) {
    throw new AppError('INVALID_AI_RESPONSE', 'ai', 'AI returned invalid JSON.', {
      status: 502,
      cause: error,
    });
  }
  return {
    suggestion: {
      ...validateSuggestion(trip, proposed, prefs),
      createdAt: new Date().toISOString(),
    },
  };
}

// Kept for old saved-data regression tests; the live endpoint no longer accepts editorial prose.
export function applyEditorialPlan(trip, editorial) {
  if (!Array.isArray(editorial?.days) || editorial.days.length !== trip.itinerary.length)
    throw new Error('The AI response did not include every day.');
  const itinerary = trip.itinerary.map((day) => {
    const proposed = editorial.days.find((item) => item.day === day.day);
    const expected = new Set(day.activities.map((activity) => activity.id));
    if (
      !proposed ||
      !Array.isArray(proposed.activities) ||
      proposed.activities.length !== expected.size ||
      proposed.activities.some((activity) => !expected.has(activity.id))
    )
      throw new Error('The AI attempted to change the verified places.');
    return day;
  });
  return { ...trip, itinerary, source: 'ai' };
}
