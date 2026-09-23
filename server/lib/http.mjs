import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const inflight = new Map();
export class ProviderError extends Error {
  constructor(message, { status, code = 'UPSTREAM_UNAVAILABLE', cause } = {}) {
    super(message, { cause });
    this.name = 'ProviderError';
    this.status = status;
    this.code = code;
  }
}

const cachePath = (key) => '.cache/v3-' + createHash('sha256').update(key).digest('hex') + '.json';

export async function cachedWithMeta(key, { freshMs, staleMs = 0, validate = () => true }, fn) {
  if (inflight.has(key)) return inflight.get(key);
  const job = (async () => {
    const path = cachePath(key);
    let old;
    try {
      old = JSON.parse(await readFile(path, 'utf8'));
      if (!validate(old.data)) old = undefined;
      if (old && Date.now() - old.at < freshMs)
        return { data: old.data, meta: { cache: 'fresh', fetchedAt: old.at } };
    } catch {}
    try {
      const data = await fn();
      if (!validate(data)) throw new ProviderError('Provider returned unusable data.');
      const at = Date.now();
      try {
        await mkdir('.cache', { recursive: true });
        await writeFile(path + '.tmp', JSON.stringify({ at, data }));
        await rename(path + '.tmp', path);
      } catch {}
      return { data, meta: { cache: 'miss', fetchedAt: at } };
    } catch (error) {
      if (old && Date.now() - old.at < freshMs + staleMs)
        return { data: old.data, meta: { cache: 'stale', fetchedAt: old.at } };
      throw error;
    }
  })();
  inflight.set(key, job);
  try {
    return await job;
  } finally {
    inflight.delete(key);
  }
}

export async function cached(key, ttl, fn) {
  return (await cachedWithMeta(key, { freshMs: ttl }, fn)).data;
}
export async function fetchJson(url, options = {}, ms = 15000) {
  try {
    const response = await fetch(url, { ...options, signal: AbortSignal.timeout(ms) });
    if (!response.ok)
      throw new ProviderError('Data provider returned ' + response.status, {
        status: response.status,
      });
    return await response.json();
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    const timeout = error?.name === 'TimeoutError' || error?.name === 'AbortError';
    throw new ProviderError(
      timeout ? 'Data provider timed out.' : 'Data provider is unavailable.',
      {
        code: timeout ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE',
        cause: error,
      },
    );
  }
}
