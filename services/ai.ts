import type { AiSuggestion, Trip, UserPreferences } from '@/types/trip';
import { ProxyError } from '@/services/travel';

const BASE = (process.env.EXPO_PUBLIC_PROXY_URL ?? 'http://localhost:8787').replace(/\/$/, '');

export async function isAiAvailable(): Promise<boolean> {
  try {
    const response = await fetch(BASE + '/health', { signal: AbortSignal.timeout(4000) });
    return response.ok && Boolean((await response.json()).aiConfigured);
  } catch {
    return false;
  }
}

export async function requestAiSuggestion(
  trip: Trip,
  prefs: UserPreferences,
  signal?: AbortSignal,
): Promise<AiSuggestion> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 65000);
  try {
    const response = await fetch(BASE + '/api/ai-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trip, prefs }),
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = body.error;
      throw new ProxyError(
        error?.message ?? 'AI planning is temporarily unavailable.',
        '/api/ai-plan',
        response.status,
        error?.code ?? 'AI_UNAVAILABLE',
        'ai',
        error?.retryable ?? true,
        error?.requestId,
      );
    }
    const suggestion = body.data?.suggestion;
    if (!suggestion || !Array.isArray(suggestion.days))
      throw new ProxyError(
        'AI returned an invalid plan.',
        '/api/ai-plan',
        502,
        'INVALID_AI_RESPONSE',
        'ai',
      );
    return suggestion;
  } catch (error) {
    if (error instanceof ProxyError) throw error;
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    if (
      (error as Error).name === 'AbortError' ||
      (error as Error).name === 'TimeoutError' ||
      (error as Error).name === 'FetchRequestCanceledException'
    )
      throw new ProxyError(
        'AI planning timed out. Your verified itinerary is unchanged.',
        '/api/ai-plan',
        504,
        'UPSTREAM_TIMEOUT',
        'ai',
      );
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
