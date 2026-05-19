import { getCached, setCached } from '@/lib/cache';
import { getAnimeDetailGQL } from '@/lib/anilist';
import { getCachedSlug, resolveSlug } from '@/lib/slug-resolver';
import { scrapeEpisodeSources } from '@/scraper/scraper';
import type { EpisodeSources } from '@/types';

export const revalidate = 300;

export async function GET(
  _request: Request,
  { params }: { params: { slug: string; episode: string } }
): Promise<Response> {
  const { slug, episode } = params;

  try {
    let anikotoSlug: string | null = slug;

    // If slug is numeric, it's an AniList ID — resolve to anikoto slug
    if (/^\d+$/.test(slug)) {
      // 1. Try the cache first — no AniList call needed if already resolved
      const cachedSlug = await getCachedSlug(slug);
      if (cachedSlug) {
        anikotoSlug = cachedSlug;
      } else {
        // 2. Cache miss — get the title from AniList to search anikoto
        const anilistId = parseInt(slug);
        try {
          const animeData = await getAnimeDetailGQL(anilistId);
          if (animeData) {
            anikotoSlug = await resolveSlug(slug, animeData.title);
          }
        } catch (e) {
          // AniList lookup failed, try using the numeric slug directly as anikoto slug
          anikotoSlug = slug;
        }
      }
    }

    // Scrape episode sources using the resolved anikoto slug
    if (!anikotoSlug) {
      return Response.json(
        { success: false, error: 'Could not find this anime on the streaming site' } as { success: false; error: string },
        { status: 404 }
      );
    }

    // Check Redis cache first, then scrape if not found
    const cachedSources = await getCached<EpisodeSources>('scraper.sources', { slug: anikotoSlug, episode }, 6 * 60 * 60 * 1000);
    const data = cachedSources.found
      ? cachedSources.data
      : await scrapeEpisodeSources(anikotoSlug, episode);
    if (!cachedSources.found) {
      await setCached('scraper.sources', { slug: anikotoSlug, episode }, data, 6 * 60 * 60 * 1000);
    }
    if (!data.title && data.servers.length === 0) {
      return Response.json(
        { success: false, error: 'Episode not found' } as { success: false; error: string },
        { status: 404 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data } as { success: true; data: EpisodeSources }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    return Response.json(
      { success: false, error: (error as Error).message } as { success: false; error: string },
      { status: 500 }
    );
  }
}
