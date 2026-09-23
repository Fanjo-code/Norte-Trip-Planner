import type { Trip, UserPreferences } from '@/types/trip';
const BASE = process.env.EXPO_PUBLIC_GROQ_URL ?? 'https://api.groq.com/openai/v1';
export async function isAiAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      const response = await fetch(BASE + '/health', { signal: controller.signal });
      return response.ok && Boolean((await response.json()).aiConfigured);
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return false;
  }
}
export async function enrichTrip(
  trip: Trip,
  prefs: UserPreferences,
  signal?: AbortSignal,
): Promise<Trip> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 60000);
  try {
    const response = await fetch(BASE + '/api/ai-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trip, prefs }),
      signal: controller.signal,
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? 'AI enrichment is unavailable.');
    return body.trip;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    if (
      (e as Error).name === 'FetchRequestCanceledException' ||
      (e as Error).message?.startsWith('Fetch request has been canceled')
    ) {
      throw new DOMException('Cancelled', 'AbortError');
    }
    throw e;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
