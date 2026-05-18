import { scrapeHome } from '@/scraper/scraper.js';

export const revalidate = 300; // cache for 5 minutes

export async function GET() {
  try {
    const data = await scrapeHome();
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
