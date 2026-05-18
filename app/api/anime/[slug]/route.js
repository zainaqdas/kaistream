import { scrapeAnimeDetail } from '@/scraper/scraper.js';

export const revalidate = 600; // cache for 10 minutes

export async function GET(request, { params }) {
  const { slug } = params;

  try {
    const data = await scrapeAnimeDetail(slug);
    if (!data.title) {
      return Response.json({ success: false, error: 'Anime not found' }, { status: 404 });
    }
    return Response.json({ success: true, data });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
