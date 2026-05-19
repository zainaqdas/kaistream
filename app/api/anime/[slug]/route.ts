import { getCached, setCached } from '@/lib/cache';
import { getAnimeDetailGQL } from '@/lib/anilist';
import { resolveSlug } from '@/lib/slug-resolver';
import { scrapeAnimeDetail } from '@/scraper/scraper';
import type { AnimeDetail } from '@/types';

export const revalidate = 600;

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
): Promise<Response> {
  const { slug } = params;

  try {
    // If slug is numeric, it's an AniList ID — get data from AniList + scrape for episodes
    if (/^\d+$/.test(slug)) {
      const anilistId = parseInt(slug);

      // 1. Get metadata from AniList (fast, reliable)
      const animeData = await getAnimeDetailGQL(anilistId);
      if (!animeData) {
        return Response.json(
          { success: false, error: 'Anime not found' } as { success: false; error: string },
          { status: 404 }
        );
      }

      // 2. Resolve the anikoto slug from the title (searches anikoto, cached)
      const anikotoSlug = await resolveSlug(slug, animeData.title);

      // 3. If we found the anikoto slug, scrape the episode list (cached in Redis)
      if (anikotoSlug) {
        try {
          const cachedScrape = await getCached<AnimeDetail>('scraper.detail', { slug: anikotoSlug }, 60 * 60 * 1000);
          const scraped = cachedScrape.found
            ? cachedScrape.data
            : await scrapeAnimeDetail(anikotoSlug);
          if (!cachedScrape.found) {
            await setCached('scraper.detail', { slug: anikotoSlug }, scraped, 60 * 60 * 1000);
          }
          if (scraped && scraped.episodes) {
            animeData.episodes = scraped.episodes;
            animeData.totalEpisodes = scraped.episodes.length;
            // Use the anikoto poster if available (usually higher quality for streaming)
            if (scraped.poster) {
              animeData.poster = scraped.poster;
            }
            // Preserve sub/dub info from scraped data
            if (scraped.icons?.sub || scraped.icons?.dub) {
              animeData.icons = {
                ...animeData.icons,
                ...scraped.icons,
              };
            }
          }
        } catch (e) {
          // Episode list scraping failed — return AniList data without episodes
          // The watch page will still work by searching anikoto when navigating to an episode
        }
      }

      return new Response(JSON.stringify({ success: true, data: animeData } as { success: true; data: AnimeDetail }), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=86400',
        },
      });
    }

    // Legacy: if slug is not numeric, treat as anikoto slug directly (fallback)
    const data = await scrapeAnimeDetail(slug);
    if (!data.title) {
      return Response.json(
        { success: false, error: 'Anime not found' } as { success: false; error: string },
        { status: 404 }
      );
    }
    return new Response(JSON.stringify({ success: true, data } as { success: true; data: AnimeDetail }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    return Response.json(
      { success: false, error: (error as Error).message } as { success: false; error: string },
      { status: 500 }
    );
  }
}
