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
 *
 * Supports stale-while-revalidate: each entry stores a `storedAt` timestamp
 * so callers can serve stale data while asynchronously refreshing it.
 *
 * Note: `@vercel/kv` is imported lazily (not at module level) to ensure
 * the client is initialized at runtime when env vars are available.
 */

// Types for @vercel/kv (used only for the lazy import return type)
type VercelKv = {
  get: <T>(key: string) => Promise<T | null>;
  set: (key: string, value: unknown, opts?: { ex?: number }) => Promise<string>;
  del: (key: string) => Promise<number>;
  keys: (pattern: string) => Promise<string[]>;
};

// In-memory fallback store
interface MemoryEntry {
  data: unknown;
  storedAt: number;
}
const memoryStore = new Map<string, MemoryEntry>();

// Cache stats for monitoring
let cacheHits = 0;
let cacheMisses = 0;
let staleHits = 0;

let kvClient: VercelKv | null = null;

/**
 * Lazily get the @vercel/kv client.
 * Only initialized when Redis is first used, which happens at runtime
 * when env vars are available.
 */
async function getKvClient(): Promise<VercelKv> {
  if (!kvClient) {
    const { kv } = await import('@vercel/kv');
    kvClient = kv as VercelKv;
  }
  return kvClient;
}

/**
 * Check if Vercel KV (Redis) env vars are available.
 * Called at runtime (not module init time) so build-time bundling
 * doesn't bake in a stale value.
 */
export function isRedisAvailable(): boolean {
  return !!(process.env.KV_URL || process.env.KV_REST_API_URL);
}

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
 * Generate a pattern to match all keys under a namespace.
 */
function makeNamespacePattern(namespace: string): string {
  return `kai:${namespace}:*`;
}

// ===== Stored entry shape =====
// Each value is stored wrapped in an object with a `storedAt` timestamp
// so we can compute staleness client-side without extra Redis calls.
interface StoredEntry<T> {
  data: T;
  storedAt: number;
}

// ===== Result types =====

/**
 * Cache result — either found with data, or not found.
 */
export type CacheResult<T> =
  | { found: true; data: T }
  | { found: false };

/**
 * Stale-while-revalidate result — includes freshness info.
 * - `found: true; fresh: true` — data is within the fresh TTL
 * - `found: true; fresh: false` — data is stale but within the revalidate window
 * - `found: false` — data not found or fully expired
 */
export type SwrResult<T> =
  | { found: true; data: T; fresh: boolean }
  | { found: false };

// ===== Cache stats =====
export interface CacheStats {
  backend: 'redis' | 'memory';
  hits: number;
  misses: number;
  staleHits: number;
  total: number;
  hitRate: number;
  memorySize: number;
}

export function getCacheStats(): CacheStats {
  const total = cacheHits + cacheMisses + staleHits;
  return {
    backend: isRedisAvailable() ? 'redis' : 'memory',
    hits: cacheHits,
    misses: cacheMisses,
    staleHits,
    total,
    hitRate: total > 0 ? Math.round(((cacheHits + staleHits) / total) * 100) : 0,
    memorySize: memoryStore.size,
  };
}

export function resetCacheStats(): void {
  cacheHits = 0;
  cacheMisses = 0;
  staleHits = 0;
}

// ===== Internal helpers =====

/**
 * Get a raw stored entry from Redis or in-memory store.
 */
async function getEntry<T>(key: string): Promise<StoredEntry<T> | null> {
  if (isRedisAvailable()) {
    try {
      const vercelKv = await getKvClient();
      const raw = await vercelKv.get<StoredEntry<T>>(key);
      if (raw === null || raw === undefined) return null;
      // Backward compatibility: old entries stored { data: T } without storedAt
      if (typeof raw.storedAt !== 'number') return null;
      return raw;
    } catch {
      // Redis error — fall through to in-memory fallback
    }
  }

  const memEntry = memoryStore.get(key);
  if (!memEntry) return null;
  return { data: memEntry.data as T, storedAt: memEntry.storedAt };
}

/**
 * Store an entry in Redis or in-memory store.
 */
async function putEntry<T>(
  key: string,
  data: T,
  ttlSec: number,
): Promise<void> {
  const entry: StoredEntry<T> = { data, storedAt: Date.now() };

  if (isRedisAvailable()) {
    try {
      const vercelKv = await getKvClient();
      await vercelKv.set(key, entry, { ex: ttlSec });
      return;
    } catch {
      // Redis error — fall through to in-memory fallback
    }
  }

  // Store raw data directly (not wrapped in StoredEntry — MemoryEntry handles that)
  memoryStore.set(key, { data, storedAt: Date.now() });
}

/**
 * Delete an entry from Redis or in-memory store.
 */
async function deleteEntry(key: string): Promise<void> {
  if (isRedisAvailable()) {
    try {
      const vercelKv = await getKvClient();
      await vercelKv.del(key);
      return;
    } catch {
      // Redis error — fall through
    }
  }

  memoryStore.delete(key);
}

// ===== Public API =====

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
  const entry = await getEntry<T>(key);

  if (!entry) {
    cacheMisses++;
    return { found: false };
  }

  const age = Date.now() - entry.storedAt;
  if (age > ttlMs) {
    // Entry expired — delete and return not found
    await deleteEntry(key);
    cacheMisses++;
    return { found: false };
  }

  cacheHits++;
  return { found: true, data: entry.data };
}

/**
 * Get a value from the cache with stale-while-revalidate support.
 *
 * Returns the data along with a `fresh` flag. When `fresh` is `false`,
 * the caller should consider triggering a background refresh.
 *
 * The total Redis TTL is `freshTtlMs + staleTtlMs` so stale data is
 * retrievable during the revalidate window without a cache miss.
 *
 * @param namespace - Cache namespace (e.g. 'anilist', 'slug')
 * @param vars - Parameters that form the cache key
 * @param freshTtlMs - Time-to-live for "fresh" data in milliseconds
 * @param staleTtlMs - Additional time stale data is considered usable
 * @returns SwrResult — check `.found`; `.fresh` indicates freshness
 */
export async function getCachedSwr<T>(
  namespace: string,
  vars: Record<string, unknown>,
  freshTtlMs: number,
  staleTtlMs: number,
): Promise<SwrResult<T>> {
  const key = makeKey(namespace, vars);
  const entry = await getEntry<T>(key);

  if (!entry) {
    cacheMisses++;
    return { found: false };
  }

  const age = Date.now() - entry.storedAt;
  const totalTtlMs = freshTtlMs + staleTtlMs;

  if (age > totalTtlMs) {
    // Fully expired — delete and return not found
    await deleteEntry(key);
    cacheMisses++;
    return { found: false };
  }

  if (age <= freshTtlMs) {
    // Fresh
    cacheHits++;
    return { found: true, data: entry.data, fresh: true };
  }

  // Stale but within revalidate window
  staleHits++;
  return { found: true, data: entry.data, fresh: false };
}

/**
 * Set a value in the cache.
 *
 * @param namespace - Cache namespace (e.g. 'anilist', 'slug')
 * @param vars - Parameters that form the cache key
 * @param data - Data to cache
 * @param ttlMs - Time-to-live in milliseconds (includes both fresh + stale windows if using SWR)
 * @returns The data that was cached (for chaining)
 */
export async function setCached<T>(
  namespace: string,
  vars: Record<string, unknown>,
  data: T,
  ttlMs: number,
): Promise<T> {
  const key = makeKey(namespace, vars);
  await putEntry(key, data, Math.ceil(ttlMs / 1000));
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
  await deleteEntry(key);
}

/**
 * Delete all entries under a cache namespace.
 *
 * Example: `flushNamespace('scraper.sources')` clears all episode source caches.
 * Only works with Redis — in-memory store is cleared entirely.
 *
 * @param namespace - Cache namespace prefix (e.g. 'scraper.sources')
 */
export async function flushNamespace(namespace: string): Promise<number> {
  const pattern = makeNamespacePattern(namespace);
  let deleted = 0;

  if (isRedisAvailable()) {
    try {
      const vercelKv = await getKvClient();
      const keys = await vercelKv.keys(pattern);
      if (keys.length > 0) {
        // Delete in batches of 100
        const batchSize = 100;
        for (let i = 0; i < keys.length; i += batchSize) {
          const batch = keys.slice(i, i + batchSize);
          await Promise.all(batch.map((k: string) => vercelKv.del(k)));
        }
        deleted = keys.length;
      }
    } catch {
      // Redis error
    }
  }

  // In-memory: delete matching keys
  for (const key of memoryStore.keys()) {
    if (key.startsWith(`kai:${namespace}:`)) {
      memoryStore.delete(key);
      deleted++;
    }
  }

  return deleted;
}

/**
 * Clear the entire in-memory cache.
 * Note: Does NOT clear Redis — only the local fallback store.
 */
export function clearMemoryCache(): void {
  memoryStore.clear();
}
