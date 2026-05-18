import { scrapeEpisodeSources } from '@/scraper/scraper.js';

export const revalidate = 300; // cache for 5 minutes

export async function GET(request, { params }) {
  const { slug, episode } = params;

  try {
    const data = await scrapeEpisodeSources(slug, episode);
    if (!data.title && data.servers.length === 0) {
      return Response.json({ success: false, error: 'Episode not found' }, { status: 404 });
    }
    return new Response(JSON.stringify({ success: true, data }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
