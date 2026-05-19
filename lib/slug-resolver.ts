import { searchAnime } from '@/scraper/scraper';
import { getCached, setCached } from './cache';

const SLUG_TTL = 24 * 60 * 60 * 1000; // 24 hours (anime slugs rarely change)

/**
 * Check if a slug is cached for the given AniList ID, without requiring a title.
 * Returns the cached slug or null if not found/expired.
 * Use this to avoid calling AniList just to get a title for slug resolution.
 */
export async function getCachedSlug(anilistId: string): Promise<string | null> {
  const cached = await getCached<string>('slug', { id: anilistId }, SLUG_TTL);
  return cached.found ? cached.data : null;
}

/**
 * Search anikoto by title with retry logic for transient failures.
 * Retries up to 3 times with exponential backoff (500ms, 1000ms).
 */
async function searchAnimeWithRetry(title: string): Promise<{ results?: { slug?: string }[] } | null> {
  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await searchAnime(title, 1);
    } catch (error) {
      lastError = error as Error;
      if (attempt < MAX_RETRIES) {
        const delay = 500 * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  return null;
}

/**
 * Resolve an AniList ID to an anikototv.to slug by searching the title.
 *
 * This only runs when visiting the anime detail or watch page, so it adds
 * at most 1 extra scrape per anime per 24 hours — much better than scraping
 * the homepage, search, and browse pages on every request.
 */
export async function resolveSlug(anilistId: string, title: string): Promise<string | null> {
  // Check cache first
  const cached = await getCachedSlug(anilistId);
  if (cached) return cached;

  // Search anikoto using the English or Romaji title (with retry)
  const searchResult = await searchAnimeWithRetry(title);
  if (searchResult && searchResult.results && searchResult.results.length > 0) {
    const first = searchResult.results[0];
    if (first.slug) {
      await setCached('slug', { id: anilistId }, first.slug, SLUG_TTL);
      return first.slug;
    }
  }

  // Try with just the first 3 words of the title (sometimes more specific titles fail)
  const shortTitle = title.split(' ').slice(0, 3).join(' ');
  if (shortTitle !== title) {
    const shortResult = await searchAnimeWithRetry(shortTitle);
    if (shortResult && shortResult.results && shortResult.results.length > 0) {
      const first = shortResult.results[0];
      if (first.slug) {
        await setCached('slug', { id: anilistId }, first.slug, SLUG_TTL);
        return first.slug;
      }
    }
  }

  return null;
}

/**
 * Get the anikoto slug for a known anime by ID.
 * The ID could be an AniList ID (our new default) or an anikoto slug (legacy).
 * This function tries to detect which one it is.
 */
export async function getAnikotoSlug(idOrSlug: string, title?: string): Promise<string | null> {
  // If it looks like a positive integer, treat it as an AniList ID
  if (/^\d+$/.test(idOrSlug) && title) {
    return resolveSlug(idOrSlug, title);
  }

  // Otherwise treat it as an existing anikoto slug (legacy support)
  return idOrSlug;
}
