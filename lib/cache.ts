/**
 * Unified cache abstraction.
 *
 * Uses Vercel KV (Redis) when the required environment variables are set
 * (`KV_URL` or `KV_REST_API_URL` + `KV_REST_API_TOKEN`).
 * Falls back to an in-memory Map for local development.
 *
 * On Vercel, the cache persists across serverless function invocations,
 * so one user's fetch benefits all users.
 * In local dev, the cache is per-process (resets on server restart).
 */

import { kv as vercelKv } from '@vercel/kv';

// In-memory fallback store
interface MemoryEntry {
  data: unknown;
  timestamp: number;
}
const memoryStore = new Map<string, MemoryEntry>();

// Whether Vercel KV (Redis) is available
const useRedis = !!(process.env.KV_URL || process.env.KV_REST_API_URL);

/**
 * Generate a namespaced cache key from a function name and its parameters.
 */
function makeKey(namespace: string, vars: Record<string, unknown>): string {
  const sorted = Object.keys(vars)
    .sort()
    .reduce((acc: Record<string, unknown>, k) => {
      acc[k] = vars[k];
      return acc;
    }, {});
  return `kai:${namespace}:${JSON.stringify(sorted)}`;
}

/**
 * Cache result — either found with data, or not found.
 */
export type CacheResult<T> =
  | { found: true; data: T }
  | { found: false };

/**
 * Get a value from the cache.
 *
 * @param namespace - Cache namespace (e.g. 'anilist', 'slug')
 * @param vars - Parameters that form the cache key
 * @param ttlMs - Time-to-live in milliseconds
 * @returns CacheResult — check `.found` before accessing `.data`
 */
export async function getCached<T>(
  namespace: string,
  vars: Record<string, unknown>,
  ttlMs: number,
): Promise<CacheResult<T>> {
  const key = makeKey(namespace, vars);

  if (useRedis) {
    try {
      // Data is stored wrapped in an object { data: T } so we can distinguish
      // a cached null from "key not found" (Redis returns null for both)
      const raw = await vercelKv.get<{ data: T }>(key);
      if (raw === null || raw === undefined) return { found: false };
      return { found: true, data: raw.data };
    } catch {
      // Redis error — silently fall through to in-memory fallback
    }
  }

  // In-memory fallback
  const entry = memoryStore.get(key);
  if (!entry) return { found: false };
  if (Date.now() - entry.timestamp > ttlMs) {
    memoryStore.delete(key);
    return { found: false };
  }
  return { found: true, data: entry.data as T };
}

/**
 * Set a value in the cache.
 *
 * @param namespace - Cache namespace (e.g. 'anilist', 'slug')
 * @param vars - Parameters that form the cache key
 * @param data - Data to cache (can be null)
 * @param ttlMs - Time-to-live in milliseconds
 * @returns The data that was cached (for chaining)
 */
export async function setCached<T>(
  namespace: string,
  vars: Record<string, unknown>,
  data: T,
  ttlMs: number,
): Promise<T> {
  const key = makeKey(namespace, vars);

  if (useRedis) {
    try {
      // Wrap data in an object so null values are distinguishable from "not found"
      await vercelKv.set(key, { data }, { ex: Math.ceil(ttlMs / 1000) });
      return data;
    } catch {
      // Redis error — fall through to in-memory fallback
    }
  }

  // In-memory fallback
  memoryStore.set(key, { data, timestamp: Date.now() });
  return data;
}

/**
 * Delete a value from the cache.
 */
export async function delCached(
  namespace: string,
  vars: Record<string, unknown>,
): Promise<void> {
  const key = makeKey(namespace, vars);

  if (useRedis) {
    try {
      await vercelKv.del(key);
      return;
    } catch {
      // Redis error — fall through
    }
  }

  memoryStore.delete(key);
}

/**
 * Clear the entire in-memory cache.
 * Note: Does NOT clear Redis — only the local fallback store.
 */
export function clearMemoryCache(): void {
  memoryStore.clear();
}
