import { z } from 'zod';
import { AppError } from './errors.mjs';

const ActivitySchema = z.object({
  placeId: z.string().min(1),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  durationMinutes: z.number().int().min(15).max(480),
  activityType: z.enum(['visit', 'meal', 'drink', 'rest', 'transit']),
  reason: z.string().max(500).optional(),
});

const DaySchema = z.object({
  dayNumber: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().max(120),
  summary: z.string().max(500).optional(),
  activities: z.array(ActivitySchema).min(1),
});

const ItinerarySchema = z.object({
  tripTitle: z.string().max(150),
  destination: z.string().max(200),
  overview: z.string().max(1000).optional(),
  days: z.array(DaySchema).min(1),
});

const MIN_REPAIR_MS = 300;
function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

function isTransient(error) {
  if (error instanceof AppError) {
    return error.status === 429 || error.status === 502 || error.status === 503 || error.status === 504;
  }
  return true;
}

export function createGeminiPlanner({ apiKey, model = 'gemini-2.5-flash', maxRepairAttempts = 2, timeoutMs = 60000 } = {}) {
  if (!apiKey) throw new AppError('AI_UNAVAILABLE', 'ai', 'Gemini API key is not configured.', { status: 503, retryable: false });

  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  async function callGemini({ systemPrompt, userPayload }) {
    const body = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: JSON.stringify(userPayload) }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: ItinerarySchema,
        temperature: 0.2,
        maxOutputTokens: 8192,
      },
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new AppError(
          res.status === 429 ? 'AI_GENERATION_FAILED' : 'AI_INVALID_RESPONSE',
          'ai',
          errText || `Gemini returned ${res.status}`,
          { status: res.status, retryable: res.status === 429 || res.status >= 500 },
        );
      }
      const json = await res.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? JSON.stringify(json);
      let parsed = typeof text === 'string' ? JSON.parse(text) : text;
      // If SDK structured-output wrapping exists
      if (parsed?.candidates) parsed = parsed.candidates[0]?.content?.parts?.[0]?.text ?? parsed;
      if (typeof parsed === 'string') parsed = JSON.parse(parsed);
      return ItinerarySchema.parse(parsed);
    } catch (error) {
      if (error.name === 'AbortError') throw new AppError('AI_GENERATION_FAILED', 'ai', 'Gemini generation timed out.', { status: 504, retryable: true });
      if (error instanceof AppError) throw error;
      throw new AppError('AI_GENERATION_FAILED', 'ai', 'Gemini call failed.', { status: 502, cause: error, retryable: isTransient(error) });
    }
  }

  async function generate({ tripRequest, destination, candidates, planningRules }) {
    const candidateIds = candidates.map(c => c.id);
    const systemPrompt = (planningRules || '') + `\nYou may ONLY schedule places from the supplied candidate IDs: [${candidateIds.join(', ')}]. Never invent place IDs, names, addresses, coordinates, ratings, opening hours, or factual place data. Use only verified metadata. Prefer geographically coherent days. Avoid unnecessary backtracking. Do not overschedule. Respect pace. Create realistic meal breaks. Restaurants at plausible meal times. Balance major sights with lower-intensity activities. Avoid repeating a place unless justified. Account for trip length. Keep nearby attractions together where practical. Do not schedule overlapping times. Use verified metadata rather than making factual claims. If unknown, omit.`;

    const userPayload = {
      tripRequest,
      destination,
      candidateCount: candidates.length,
      candidateCategories: [...new Set(candidates.map(c => c.category))],
      candidates: candidates.map(c => ({ id: c.id, name: c.name, category: c.category, lat: c.latitude, lng: c.longitude })),
    };

    const startTime = Date.now();
    const validated = await callGemini({ systemPrompt, userPayload });
    const duration = Date.now() - startTime;

    if (typeof globalThis.__DEV__ !== 'undefined' && globalThis.__DEV__) {
      console.log(JSON.stringify({ scope: 'gemini-generation', destination: destination?.name ?? destination, candidateCount: candidates.length, dayCount: validated.days.length, durationMs: duration }));
    }
    return validated;
  }

  async function repair({ tripRequest, destination, candidates, planningRules, failedPlan, validationErrors }, attempt = 1) {
    const maxAttempts = maxRepairAttempts || 2;
    if (attempt > maxAttempts) {
      throw new AppError('ITINERARY_REPAIR_FAILED', 'ai', 'Itinerary repair limit reached.', { status: 502, retryable: false });
    }
    await delay(Math.max(MIN_REPAIR_MS, Math.pow(2, attempt) * 100));

    const systemPrompt = (planningRules || '') + `\nRepair only the invalid parts. Candidate IDs: [${candidates.map(c => c.id).join(', ')}]. Never invent new IDs.`;
    const userPayload = {
      tripRequest,
      destination,
      failedPlan,
      validationErrors,
      attempt,
      maxAttempts,
    };

    try {
      return await callGemini({ systemPrompt, userPayload });
    } catch (error) {
      if (error instanceof AppError && error.code === 'ITINERARY_REPAIR_FAILED') throw error;
      throw new AppError('AI_GENERATION_FAILED', 'ai', 'AI repair failed.', { status: 502, cause: error, retryable: isTransient(error) });
    }
  }

  return { generate, repair, schema: ItinerarySchema };
}
