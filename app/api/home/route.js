import { scrapeHome } from '@/scraper/scraper.js';

export const revalidate = 300; // cache for 5 minutes

export async function GET() {
  try {
    const data = await scrapeHome();
    return Response.json({ success: true, data });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
