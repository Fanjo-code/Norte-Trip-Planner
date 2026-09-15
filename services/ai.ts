import type { Trip, UserPreferences } from '@/types/trip';
import { daysBetween } from '@/lib/format';
import { DEFAULT_PREFS, INTEREST_LABELS } from '@/contexts/preferences-context';

// ── AI proxy (OmniRoute / Groq) ──────────────────────────────────────────────
/** Resolve proxy URL: prefer LAN IP for device, localhost for simulator. */
function getAiProxyBaseUrl(): string | null {
  return process.env.EXPO_PUBLIC_OMNIROUTE_BASE_URL ?? null;
}

const API_KEY = process.env.EXPO_PUBLIC_OMNIROUTE_API_KEY ?? '';
const MODEL = process.env.EXPO_PUBLIC_OMNIROUTE_MODEL ?? 'auto/best-free';

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '';
const GROQ_MODEL = process.env.EXPO_PUBLIC_GROQ_MODEL ?? 'llama-3.3-70b-versatile';

// ── Travel data proxy (real restaurants, places) ──────────────────────────────
const TRAVEL_PROXY_URL = process.env.EXPO_PUBLIC_PROXY_URL ?? 'http://localhost:8787';

interface OsmElement {
  id: string;
  name: string;
  category: string;
  lat: number | undefined;
  lng: number | undefined;
  tags: Record<string, string>;
  rating: number | null;
  url: string | undefined;
  wikipedia: string | null;
}

interface RealData {
  restaurants: OsmElement[];
  places: OsmElement[];
}

/** Google Maps link with coordinates — shows the exact spot on a map. */
function googleMapsLink(name: string, lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${encodeURIComponent(name)}`;
}

/** Fetch JSON from the travel proxy with timeout. */
async function proxyFetch<T = any>(path: string, params: Record<string, string>): Promise<T | null> {
  const qs = new URLSearchParams(params).toString();
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${TRAVEL_PROXY_URL}${path}?${qs}`, { signal: ctrl.signal });
    clearTimeout(tid);
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

/**
 * Pre-fetch real data from the travel proxy (Overpass/OSM) to include in the AI
 * prompt. This gives the AI real restaurant names and real places with GPS
 * coordinates — instead of making them up. Flights and hotels are gone.
 */
async function prefetchRealData(destination: string): Promise<RealData> {
  // Geocode destination to get lat/lng for Overpass queries
  let lat = 0;
  let lng = 0;
  try {
    const geo = await proxyFetch<{ lat: number; lng: number }>(
      '/api/geocode',
      { q: destination },
    );
    if (geo) { lat = geo.lat; lng = geo.lng; }
  } catch { /* ignore */ }

  // Fetch real data in parallel (all fail gracefully to empty arrays)
  const [restaurantsRes, placesRes] = await Promise.all([
    lat ? proxyFetch<{ restaurants: OsmElement[] }>('/api/restaurants', { lat: String(lat), lng: String(lng), radius: '2000' }) : null,
    lat ? proxyFetch<{ places: OsmElement[] }>('/api/places', { lat: String(lat), lng: String(lng), radius: '8000' }) : null,
  ]);

  return {
    restaurants: restaurantsRes?.restaurants ?? [],
    places: placesRes?.places ?? [],
  };
}

let idCounter = 0;
function uid(): string {
  return `ai-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;
}

export interface AiError extends Error {
  code?: string;
  status?: number;
  isNetworkError?: boolean;
}

/** Extract JSON from any response — handles markdown fences, SSE streaming, and plain text wrapping. */
function extractJson(raw: string): string {
  // Handle SSE streaming format: "data: {...}\ndata: [DONE]"
  const lines = raw.split('\n');
  const sseDataLines = lines
    .filter((l) => l.startsWith('data: ') && l !== 'data: [DONE]')
    .map((l) => l.slice(6));

  if (sseDataLines.length >= 2 && sseDataLines[0].trimStart().startsWith('{')) {
    try {
      const chunks = sseDataLines.map((l) => JSON.parse(l));
      const content = chunks
        .map((c) => c.choices?.[0]?.delta?.content ?? '')
        .join('');
      if (content) return content;
    } catch {
      // Fall through
    }
  } else if (sseDataLines.length === 1 && sseDataLines[0].trimStart().startsWith('{')) {
    return sseDataLines[0];
  }

  // Strip markdown code fences.
  let cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  // Try parsing as-is.
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch {
    // not valid JSON — continue
  }

  // Find the first { and last } to extract the JSON object.
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end > start) {
    const candidate = cleaned.substring(start, end + 1);
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      // not valid JSON — continue
    }
  }

  // Last resort: scan for the outermost { … } using brace counting.
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace !== -1) {
    let depth = 0;
    let lastClose = -1;
    for (let i = firstBrace; i < cleaned.length; i++) {
      if (cleaned[i] === '{') depth++;
      else if (cleaned[i] === '}') {
        depth--;
        if (depth === 0) { lastClose = i; break; }
      }
    }
    if (lastClose > firstBrace) {
      return cleaned.substring(firstBrace, lastClose + 1);
    }
  }

  return cleaned;
}

const SYSTEM_PROMPT = `You are a travel planner AI. You output ONLY valid JSON. No markdown, no explanation, no extra text.

CRITICAL RULES:
- When REAL DATA is provided in the prompt (restaurants, places), use those EXACT names, coordinates, and details as your foundation. You MAY additionally add well-known REAL landmarks of the destination that are missing from the list (e.g. Eiffel Tower, Louvre) from your own travel knowledge — but ONLY real, famous places, with real approximate lat/lng coordinates. Never fabricate a place that does not exist.
- All prices must be realistic for the specific destination and currency.
- EVERY entry MUST include a "url" field with a REAL, SPECIFIC working link:
  - Restaurants: Google Maps with REAL coordinates: "https://www.google.com/maps/search/?api=1&query=LAT,LNG"
  - Places: Google Maps with REAL coordinates: "https://www.google.com/maps/search/?api=1&query=LAT,LNG"
  - Transport: "https://www.google.com/search?q=DESTINATION+transportation+tickets"
- EVERY activity in the itinerary and EVERY place entry MUST include "lat" and "lng" with REAL GPS coordinates.
- EVERY activity, restaurant, place, and transport MUST include an "icon" field with a valid Ionicons name.
- Transport: mark ONE option with "isRecommended": true.
- Generate exactly the number of itinerary days requested, with activities per day matching the traveler's pace instructions in the user prompt.
- The "dailyBudget" field should be estimated daily spending on meals + local transport in EUR.
- Include a "heroImage" field with a real Unsplash URL of the destination.
- Include 2-3 restaurants per meal type (Breakfast, Lunch, Dinner, Drinks) = 8-12 total.
- Include a COMPREHENSIVE place list covering the whole city: ~15-20 places for a 5-day trip, scaling up for longer trips. Include EVERY major must-see landmark (iconic monuments, museums, viewpoints, historic sites) of the destination — never omit the city's famous attractions, even if they don't match the traveler's interests. The Places tab is the city's definitive list.
- Organize each itinerary day's activities by geographic area/neighborhood so nearby top attractions are visited together — never fill a day with obscure filler.`;

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function buildPrompt(
  destination: string,
  days: number,
  nights: number,
  prefs: UserPreferences = DEFAULT_PREFS,
  realData?: RealData,
  flexible?: FlexibleConstraint,
): string {
  const budget = prefs.budget;
  const budgetInstructions = {
    budget: 'BUDGET EATER: street food & casual dining (€3-15/meal), free or cheap attractions prioritized, daily spend €25-40.',
    standard: 'BALANCED EATER: good local restaurants (€10-30/meal), a mix of paid and free attractions, daily spend €40-70.',
    premium: 'COMFORT EATER: highly-rated restaurants (€25-60/meal), premium experiences, daily spend €70-120.',
  };

  const paceInstructions = prefs.pace === 'relaxed'
    ? 'The traveler prefers a RELAXED pace: 2-3 activities per day with breathing room.'
    : prefs.pace === 'packed'
    ? 'The traveler prefers a PACKED pace: 5-6 activities per day — see as much as possible.'
    : 'The traveler prefers a BALANCED pace: 3-4 activities per day.';

  const interestInstruction = prefs.interests.length
    ? `The traveler is most interested in: ${prefs.interests.map((i) => INTEREST_LABELS[i] ?? i).join(', ')}.
In the ITINERARY, prefer activities and experiences matching these interests.
IMPORTANT: the COMPREHENSIVE PLACES section must STAY COMPLETE — never drop a famous landmark just to match interests.`
    : '';

  const dateInstructions = flexible
    ? `CHOOSE THE BEST DATES YOURSELF: The traveler is flexible. Decide the single best ${flexible.durationDays}-day window within ${MONTH_NAMES[flexible.month]} ${flexible.year}, optimizing for: ${
        flexible.priority === 'best-price'
          ? 'the LOWEST-priced week'
          : flexible.priority === 'low-crowds'
          ? 'the LEAST crowded, most pleasant week'
          : 'a BALANCED week: decent weather, fair prices, moderate crowds'
      }. Include "startDate" and "endDate" in the JSON as ISO dates.`
    : `Use the EXACT travel dates provided — do not change them.`;

  // ── Build real data sections ──────────────────────────────────────────────
  // Real restaurants section — from Overpass/OSM
  let restaurantsJson: string;
  if (realData?.restaurants && realData.restaurants.length >= 4) {
    const meals: Array<{ meal: string; icon: string; count: number }> = [
      { meal: 'Breakfast', icon: 'cafe-outline', count: 2 },
      { meal: 'Lunch', icon: 'restaurant-outline', count: 3 },
      { meal: 'Dinner', icon: 'wine-outline', count: 3 },
      { meal: 'Drinks', icon: 'beer-outline', count: 2 },
    ];
    const rLines: string[] = [];
    let rIdx = 0;
    for (const m of meals) {
      for (let i = 0; i < m.count; i++) {
        const r = realData.restaurants[rIdx % realData.restaurants.length];
        rIdx++;
        const rLat = r.lat ?? 0;
        const rLng = r.lng ?? 0;
        const cuisine = r.tags?.cuisine || m.meal.toLowerCase();
        const priceLevel = r.tags?.amenity === 'cafe' ? 1 : r.tags?.amenity === 'bar' || r.tags?.amenity === 'pub' ? 2 : 2;
        rLines.push(`    {"name":"${r.name}","cuisine":"${cuisine}","meal":"${m.meal}","rating":4.3,"priceLevel":${priceLevel},"neighborhood":"${r.tags?.['addr:suburb'] || 'Central'}","description":"${r.name} in ${destination}.","icon":"${m.icon}","url":"${googleMapsLink(r.name, rLat, rLng)}","isMustTry":${i === 0}}`);
      }
    }
    restaurantsJson = rLines.join(',\n');
  } else {
    // Fallback
    restaurantsJson = `    {"name":"Local Café","cuisine":"Pastries","meal":"Breakfast","rating":4.5,"priceLevel":1,"neighborhood":"Central","description":"Popular local café.","icon":"cafe-outline","url":"https://www.google.com/maps/search/cafe+in+${encodeURIComponent(destination)}","isMustTry":true},
    {"name":"Traditional Restaurant","cuisine":"Local","meal":"Lunch","rating":4.4,"priceLevel":2,"neighborhood":"Central","description":"Authentic local dishes.","icon":"restaurant-outline","url":"https://www.google.com/maps/search/restaurant+in+${encodeURIComponent(destination)}","isMustTry":true},
    {"name":"Fine Dining","cuisine":"Modern","meal":"Dinner","rating":4.7,"priceLevel":3,"neighborhood":"Central","description":"Elegant dinner experience.","icon":"wine-outline","url":"https://www.google.com/maps/search/restaurant+in+${encodeURIComponent(destination)}","isMustTry":true}`;
  }

  // Real places section — from Overpass/OSM
  let placesJson: string;
  if (realData?.places && realData.places.length >= 4) {
    const pLines = realData.places.slice(0, 100).map((p, i) => {
      const pLat = p.lat ?? 0;
      const pLng = p.lng ?? 0;
      const cat = p.tags?.tourism || p.tags?.historic || 'Attraction';
      const icon = cat === 'museum' ? 'library-outline' : cat === 'viewpoint' ? 'eye-outline' : cat === 'artwork' ? 'camera-outline' : 'landmark';
      return `    {"name":"${p.name}","category":"${cat.charAt(0).toUpperCase() + cat.slice(1)}","rating":4.5,"timeToSpend":"1.5 h","description":"${p.name} in ${destination}.","price":0,"lat":${pLat},"lng":${pLng},"icon":"${icon}","url":"${googleMapsLink(p.name, pLat, pLng)}"}`;
    });
    placesJson = pLines.join(',\n');
  } else {
    placesJson = `    {"name":"Historic Centre","category":"Neighbourhood","rating":4.7,"timeToSpend":"2 h","description":"Explore the heart of ${destination}.","price":0,"lat":0,"lng":0,"icon":"location-outline","url":"https://www.google.com/maps/search/historic+centre+${encodeURIComponent(destination)}"}`;
  }

  return `Plan a ${days}-day trip to ${destination} (${nights} nights). Budget tier: ${budget.toUpperCase()}.

${budgetInstructions[budget]}

ABOUT THE TRAVELER:
${paceInstructions}
${interestInstruction || 'No special interests declared — plan a well-rounded trip.'}

${dateInstructions}

REAL RESTAURANTS IN ${destination.toUpperCase()} (from OpenStreetMap — use these EXACT names):
${realData?.restaurants?.slice(0, 10).map(r => `- ${r.name} (${r.tags?.cuisine || r.tags?.amenity || 'restaurant'}), coordinates: ${r.lat},${r.lng}`).join('\n') || '(No live restaurant data — generate realistic options)'}

REAL PLACES IN ${destination.toUpperCase()} (from OpenStreetMap — use these EXACT names):
${realData?.places?.slice(0, 100).map(p => `- ${p.name} (${p.tags?.tourism || 'attraction'}), coordinates: ${p.lat},${p.lng}`).join('\n') || '(No live place data — generate realistic options)'}

Return ONLY this JSON:
{
  "destination": "${destination}",
  "currency": "EUR",
  "dailyBudget": 45,
  "heroImage": "https://images.unsplash.com/photo-REAL-DESTINATION-IMAGE-URL",
  "itinerary": [
    {"day":1,"title":"Arrival & first look","activities":[
      {"time":"12:00","title":"Lunch","place":"Restaurant Name","description":"Try the local cuisine.","price":20,"lat":0.0,"lng":0.0,"icon":"restaurant-outline"},
      {"time":"15:00","title":"Explore","place":"Place Name","description":"Discover the area.","price":0,"lat":0.0,"lng":0.0,"icon":"walk-outline"},
      {"time":"18:00","title":"Landmark","place":"Landmark Name","description":"Visit the must-see.","price":0,"lat":0.0,"lng":0.0,"icon":"landmark-outline"}
    ]}
  ],
  "restaurants": [
${restaurantsJson}
  ],
  "places": [
${placesJson}
  ],
  "transport": [
    {"name":"Public Transport","icon":"train-outline","description":"Fast and affordable.","bestFor":"Daily travel","cost":"€2–3 / ride","isRecommended":true,"url":"https://www.google.com/search?q=${encodeURIComponent(destination)}+public+transport"},
    {"name":"Walking","icon":"walk-outline","description":"Best way to explore the centre.","bestFor":"Central sightseeing","cost":"Free","isRecommended":false,"url":"https://www.google.com/search?q=${encodeURIComponent(destination)}+walking+tour"}
  ]
}

IMPORTANT:
- Include "startDate" and "endDate" as ISO dates (YYYY-MM-DD). ${flexible ? 'Pick the best dates within the given month.' : 'Use exactly the provided travel dates.'}
- Use the real restaurant and place names listed above as your foundation; you may add famous REAL landmarks of the destination that are missing from the list (they must be real places with real approximate coordinates).
- Use the REAL lat/lng coordinates provided for each restaurant and place.
- Restaurants and places: use the Google Maps URLs provided — these show exact locations.
- All prices in EUR, realistic for ${destination} and the traveler's ${budget} budget tier.
- Generate exactly ${days} itinerary days with the paced number of activities per day described above, using real places from the list.
- Include 2-3 restaurants per meal type (Breakfast, Lunch, Dinner, Drinks) = 8-12 total.
- Include a comprehensive number of places (~15-20 for a 5-day trip, more for longer trips) covering the whole city, using the real places list above plus any iconic landmarks that are missing. Never omit the city's famous attractions.
- heroImage: Use a REAL Unsplash URL of ${destination}.`;
}

function addIds(data: any): Trip {
  const transport = (data.transport ?? []).map((t: any, i: number) => ({
    icon: 'bus-outline' as const,
    ...t,
    id: uid(),
    isRecommended: i === 0 && !(data.transport ?? []).some((t: any) => t.isRecommended) ? true : t.isRecommended,
  }));

  return {
    destination: data.destination ?? '',
    currency: 'EUR',
    dailyBudget: Number(data.dailyBudget) || 45,
    itinerary: (data.itinerary ?? []).map((day: any) => ({
      ...day,
      activities: (day.activities ?? []).map((a: any) => ({
        icon: 'ellipse-outline' as const,
        ...a,
        id: uid(),
      })),
    })),
    restaurants: (data.restaurants ?? []).map((r: any) => ({
      icon: 'restaurant-outline' as const,
      ...r,
      id: uid(),
    })),
    places: (data.places ?? []).map((p: any) => ({
      icon: 'location-outline' as const,
      ...p,
      id: uid(),
    })),
    transport,
    source: 'ai',
  };
}

/**
 * Generate a trip plan via the OmniRoute proxy.
 * Returns null on failure — app falls back to live data.
 * Throws AiError with details for UI to surface.
 */
export interface GeneratedTrip {
  trip: Trip;
  /** AI-chosen start/end dates (flexible mode only). */
  startDate?: Date;
  endDate?: Date;
}

export type FlexibleConstraint = {
  month: number; // 0-indexed
  year: number;
  durationDays: number;
  priority: 'best-price' | 'low-crowds' | 'recommended';
};

interface CompletionOptions {
  baseUrl: string;
  headers: Record<string, string>;
  model: string;
  messages: { role: string; content: string }[];
  timeoutMs: number;
  /** Reasoning effort for reasoning models (e.g. gpt-oss). Reduces CoT token waste. */
  reasoningEffort?: 'low' | 'medium' | 'high';
}

/**
 * Make one chat-completions call to any OpenAI-compatible endpoint (Groq or OmniRoute)
 * and return the parsed trip, or 'retryable' if the backend was busy/bad output.
 * Throws AiError for non-retryable (hard) failures so the caller can surface them.
 */
async function attemptCompletion(opts: CompletionOptions): Promise<GeneratedTrip | 'retryable'> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), opts.timeoutMs);
  const started = Date.now();
  try {
    const res = await fetch(`${opts.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...opts.headers },
      body: JSON.stringify({
        model: opts.model,
        stream: false,
        messages: opts.messages,
        temperature: 0.7,
        max_tokens: 12000,
        ...(opts.reasoningEffort ? { reasoning_effort: opts.reasoningEffort } : {}),
      }),
      signal: controller.signal,
    });

    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`[AI] ${opts.model} → HTTP ${res.status} in ${elapsed}s`);

    if (!res.ok) {
      // Rate-limited or overloaded — retryable.
      if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
        console.warn(`[AI] ${opts.model} retryable (HTTP ${res.status})`);
        return 'retryable';
      }
      const errText = await res.text().catch(() => '');
      const err = new Error(`AI provider error ${res.status} (${opts.model}): ${errText.slice(0, 200)}`) as AiError;
      err.code = 'PROXY_ERROR';
      err.status = res.status;
      throw err;
    }

    const json = await res.json();
    const content: string = json.choices?.[0]?.message?.content ?? '';

    if (!content) {
      console.warn(`[AI] ${opts.model} empty content`);
      return 'retryable';
    }

    console.log('[AI] Raw content length:', content.length, '| preview:', content.slice(0, 100));

    const jsonString = extractJson(content);

    // Validate it's parseable JSON before proceeding.
    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      console.warn(`[AI] ${opts.model} parse error`);
      return 'retryable';
    }

    // Validate required structure.
    if (!parsed.destination || !Array.isArray(parsed.itinerary)) {
      console.warn(`[AI] ${opts.model} invalid structure, keys:`, Object.keys(parsed));
      return 'retryable';
    }

    console.log('[AI] Parsed OK:', {
      model: opts.model,
      destination: parsed.destination,
      days: parsed.itinerary?.length,
      restaurants: parsed.restaurants?.length,
      places: parsed.places?.length,
      transport: parsed.transport?.length,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
    });

    const trip = addIds(parsed);
    return {
      trip,
      startDate: parsed.startDate ? new Date(parsed.startDate) : undefined,
      endDate: parsed.endDate ? new Date(parsed.endDate) : undefined,
    };
  } catch (err) {
    const timedOut = err instanceof Error && err.name === 'AbortError';
    const isNetworkErr = err instanceof TypeError && err.message.includes('fetch');
    if (timedOut || isNetworkErr) {
      console.warn(`[AI] ${opts.model} ${timedOut ? 'timed out' : 'network error'}`);
      return 'retryable';
    }
    throw err; // hard errors (e.g. a 4xx) propagate
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function generateTrip(
  destination: string,
  startDate: Date | null,
  endDate: Date | null,
  prefs: UserPreferences = DEFAULT_PREFS,
  flexible?: FlexibleConstraint
): Promise<GeneratedTrip | null> {
  const AI_BASE_URL = getAiProxyBaseUrl();

  if (!GROQ_API_KEY && !AI_BASE_URL) {
    const err = new Error('No AI backend configured. Set EXPO_PUBLIC_GROQ_API_KEY or EXPO_PUBLIC_OMNIROUTE_BASE_URL in .env') as AiError;
    err.code = 'NO_PROXY_URL';
    console.error('[AI] Configuration error:', err.message);
    throw err;
  }

  const days = flexible ? flexible.durationDays : daysBetween(startDate!, endDate!);
  const nights = days - 1;

  // ── Step 1: Pre-fetch real data from the travel proxy (Overpass/OSM) ──────
  // This gives us real restaurant names and real places with GPS coordinates —
  // so the AI works with actual entities instead of inventing them.
  console.log('[AI] Pre-fetching real data from travel proxy...');
  let realData: RealData | undefined;
  try {
    realData = await prefetchRealData(destination);
    console.log('[AI] Real data:', {
      restaurants: realData.restaurants.length,
      places: realData.places.length,
    });
  } catch (err) {
    console.warn('[AI] Pre-fetch failed, proceeding without live data:', err);
  }

  // ── Step 2: Build prompt with real data ───────────────────────────────────
  const candidates = Array.from(
    new Set(
      [MODEL, 'auto/best-free', 'opencode/nemotron-3-ultra-free', 'opencode/mimo-v2.5-free'].filter(Boolean)
    )
  );
  const PER_ATTEMPT_MS = 110_000;
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildPrompt(destination, days, nights, prefs, realData, flexible) },
  ];

  console.log('[AI] Starting generation', {
    destination,
    days,
    nights,
    prefs,
    flexible,
    realDataFetched: Boolean(realData),
    groqConfigured: Boolean(GROQ_API_KEY),
    groqModel: GROQ_API_KEY ? GROQ_MODEL : null,
    candidates,
  });

  // Build an ordered list of backends: Groq first (reliable), then free OmniRoute models.
  const backends: { label: string; attempt: () => Promise<GeneratedTrip | 'retryable'> }[] = [];
  if (GROQ_API_KEY) {
    backends.push({
      label: `groq:${GROQ_MODEL}`,
      attempt: () => attemptCompletion({
        baseUrl: GROQ_BASE_URL,
        headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
        model: GROQ_MODEL,
        messages,
        timeoutMs: PER_ATTEMPT_MS,
        reasoningEffort: 'low',
      }),
    });
  }
  if (AI_BASE_URL) {
    for (const model of candidates) {
      backends.push({
        label: `omniroute:${model}`,
        attempt: () => attemptCompletion({
          baseUrl: AI_BASE_URL,
          headers: API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {},
          model,
          messages,
          timeoutMs: PER_ATTEMPT_MS,
        }),
      });
    }
  }

  // Retry the whole set a couple of times if every backend is momentarily busy.
  const MAX_ROUNDS = 2;
  const ROUND_DELAY_MS = 10_000;
  const failures: string[] = [];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    let roundRetryable = false;

    for (const backend of backends) {
      try {
        const result = await backend.attempt();
        if (result !== 'retryable') return result; // success
        failures.push(backend.label);
        roundRetryable = true;
      } catch (err) {
        // Hard (non-retryable) error — surface it immediately.
        if (err instanceof Error && 'code' in err) throw err;
        failures.push(`${backend.label} (${err instanceof Error ? err.message : 'error'})`);
        roundRetryable = true;
      }
    }

    // If nothing retryable happened, there's no point retrying.
    if (!roundRetryable) break;

    // Every backend was busy — brief backoff, then try the whole set again.
    if (round < MAX_ROUNDS - 1) {
      console.warn(`[AI] Round ${round + 1} all busy, retrying in ${ROUND_DELAY_MS / 1000}s…`);
      await new Promise((r) => setTimeout(r, ROUND_DELAY_MS));
    }
  }

  const failure = new Error(
    `AI generation failed after ${backends.length} backend(s) × ${MAX_ROUNDS} rounds (${failures.join('; ') || 'unknown'}). ` +
    `The AI backends are busy right now — tap "Try again" in a moment, or the app will use live data.`
  ) as AiError;
  failure.code = 'ALL_MODELS_FAILED';
  failure.isNetworkError = true;
  console.error('[AI] All backends failed:', failures.join('; '));
  throw failure;
}