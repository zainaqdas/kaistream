import { scrapeEpisodeSources } from '@/scraper/scraper.js';

export const revalidate = 300; // cache for 5 minutes

export async function GET(request, { params }) {
  const { slug, episode } = params;

  try {
    const data = await scrapeEpisodeSources(slug, episode);
    if (!data.title && data.servers.length === 0) {
      return Response.json({ success: false, error: 'Episode not found' }, { status: 404 });
    }
    return Response.json({ success: true, data });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
