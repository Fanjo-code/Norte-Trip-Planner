import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const inflight = new Map();
export async function cached(key, ttl, fn) {
  if (inflight.has(key)) return inflight.get(key);
  const job = (async () => {
    const path = '.cache/v2-' + createHash('sha256').update(key).digest('hex') + '.json';
    try {
      const old = JSON.parse(await readFile(path, 'utf8'));
      if (Date.now() - old.at < ttl) return old.data;
    } catch {}
    const data = await fn();
    try {
      await mkdir('.cache', { recursive: true });
      await writeFile(path + '.tmp', JSON.stringify({ at: Date.now(), data }));
      await rename(path + '.tmp', path);
    } catch {}
    return data;
  })();
  inflight.set(key, job);
  try {
    return await job;
  } finally {
    inflight.delete(key);
  }
}
export async function fetchJson(url, options = {}, ms = 120000) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(ms) });
  if (!response.ok) throw new Error('Data provider returned ' + response.status);
  return response.json();
}
