import { scrapeAnimeDetail } from '@/scraper/scraper.js';

export const revalidate = 600; // cache for 10 minutes

export async function GET(request, { params }) {
  const { slug } = params;

  try {
    const data = await scrapeAnimeDetail(slug);
    if (!data.title) {
      return Response.json({ success: false, error: 'Anime not found' }, { status: 404 });
    }
    return new Response(JSON.stringify({ success: true, data }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
