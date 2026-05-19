import type { CacheEntry, CacheStats } from '@/types';

/**
 * Simple in-memory TTL cache for scraper HTTP requests.
 *
 * Default TTLs:
 *   - HTML pages (home, browse, anime detail): 30 minutes
 *   - Filters (genre list): 60 minutes (rarely changes)
 *   - Episode server data: 5 minutes (needs to be freshest)
 *   - Episode list (AJAX): 15 minutes
 *   - Search results: 10 minutes
 *   - External APIs (mapper): 60 minutes
 */

const DEFAULT_TTLS: Record<string, Record<string, number>> = {
  html: {
    home: 30 * 60 * 1000,
    browse: 30 * 60 * 1000,
    anime: 30 * 60 * 1000,
    episode: 5 * 60 * 1000,
    filter: 60 * 60 * 1000,
    search: 10 * 60 * 1000,
    default: 30 * 60 * 1000,
  },
  json: {
    'ajax/episode/list': 15 * 60 * 1000,
    'ajax/server/list': 5 * 60 * 1000,
    'ajax/server': 5 * 60 * 1000,
    default: 30 * 60 * 1000,
  },
  external: {
    'mapper.mewcdn': 60 * 60 * 1000,
    default: 60 * 60 * 1000,
  },
};

class MemoryCache {
  private _store: Map<string, CacheEntry> = new Map();
  private _hits: number = 0;
  private _misses: number = 0;

  /**
   * Generate a cache key from the request parameters.
   */
  private _makeKey(type: string, path: string, params: Record<string, string | number> = {}): string {
    const paramStr = Object.keys(params).length > 0
      ? '?' + new URLSearchParams(params as Record<string, string>).toString()
      : '';
    return `${type}::${path}${paramStr}`;
  }

  /**
   * Determine the TTL for a given request type and path.
   */
  private _getTTL(type: string, path: string): number {
    const config = DEFAULT_TTLS[type];
    if (!config) return 30 * 60 * 1000;

    for (const [key, ttl] of Object.entries(config)) {
      if (path.includes(key)) return ttl;
    }
    return config.default;
  }

  /**
   * Get a cached value. Returns null if not found or expired.
   */
  get(type: string, path: string, params: Record<string, string | number> = {}): unknown | null {
    const key = this._makeKey(type, path, params);
    const entry = this._store.get(key);
    if (!entry) {
      this._misses++;
      return null;
    }
    if (Date.now() - entry.timestamp > this._getTTL(type, path)) {
      this._store.delete(key);
      this._misses++;
      return null;
    }
    this._hits++;
    return entry.data;
  }

  /**
   * Set a value in the cache.
   */
  set(type: string, path: string, params: Record<string, string | number> = {}, data: unknown): unknown {
    const key = this._makeKey(type, path, params);
    this._store.set(key, { data, timestamp: Date.now() });
    return data;
  }

  /**
   * Get or fetch — the main convenience method.
   * If cached and not expired, return cached.
   * Otherwise call fetcher, cache the result, return it.
   */
  async getOrFetch<T>(
    type: string,
    path: string,
    params: Record<string, string | number>,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const cached = this.get(type, path, params);
    if (cached !== null) return cached as T;

    const data = await fetcher();
    this.set(type, path, params, data);
    return data;
  }

  /**
   * Invalidate all entries matching a path prefix.
   */
  invalidate(type: string, pathPrefix: string): void {
    const prefix = `${type}::${pathPrefix}`;
    for (const key of this._store.keys()) {
      if (key.startsWith(prefix)) {
        this._store.delete(key);
      }
    }
  }

  /**
   * Clear the entire cache.
   */
  clear(): void {
    this._store.clear();
    this._hits = 0;
    this._misses = 0;
  }

  /**
   * Get cache stats for monitoring.
   */
  getStats(): CacheStats {
    const total = this._hits + this._misses;
    return {
      size: this._store.size,
      hits: this._hits,
      misses: this._misses,
      hitRate: total > 0 ? Math.round((this._hits / total) * 100) : 0,
    };
  }
}

// Singleton instance
export const scraperCache = new MemoryCache();
export default MemoryCache;
