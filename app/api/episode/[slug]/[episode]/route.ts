import { getCachedSwr, setCached } from '@/lib/cache';
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

    // Use stale-while-revalidate: 1h fresh, 5h stale window (6h total Redis TTL)
    // When stale, we return the cached data and trigger a background refresh
    const swrResult = await getCachedSwr<EpisodeSources>(
      'scraper.sources',
      { slug: anikotoSlug, episode },
      60 * 60 * 1000,     // fresh TTL: 1 hour
      5 * 60 * 60 * 1000,  // stale TTL: 5 hours
    );

    let data = swrResult.found ? swrResult.data : null;
    let didRefresh = false;

    if (!swrResult.found) {
      // Cache miss — scrape fresh
      data = await scrapeEpisodeSources(anikotoSlug, episode);
      await setCached('scraper.sources', { slug: anikotoSlug, episode }, data, 6 * 60 * 60 * 1000);
      didRefresh = true;
    } else if (!swrResult.fresh) {
      // Stale hit — return stale data but fire-and-forget a background refresh
      scrapeEpisodeSources(anikotoSlug, episode)
        .then((freshData) => {
          setCached('scraper.sources', { slug: anikotoSlug, episode }, freshData, 6 * 60 * 60 * 1000)
            .catch(() => {});
        })
        .catch(() => {});
    }

    if (!data || (!data.title && data.servers.length === 0)) {
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
          'Cache-Control': didRefresh
            ? 'public, s-maxage=300, stale-while-revalidate=86400'
            : 'public, s-maxage=60, stale-while-revalidate=86400',
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
