import { fetchHTML } from '@/scraper/client.js';
import * as cheerio from 'cheerio';

export const revalidate = 3600; // cache for 1 hour

export async function GET() {
  try {
    const html = await fetchHTML('/home');
    const $ = cheerio.load(html);

    const genres = [];
    const types = [];
    const statuses = [];

    $('#menu ul li ul.c4 li a').each((i, el) => {
      const $el = $(el);
      genres.push({
        name: $el.find('h3').text().trim(),
        slug: $el.attr('href').replace('/genre/', ''),
      });
    });

    $('#menu ul li ul.c1 li a').each((i, el) => {
      const $el = $(el);
      types.push({
        name: $el.find('h3').text().trim(),
        slug: $el.attr('href').replace('/type/', ''),
      });
    });

    $('header #menu ul li:not(.mb) > a').each((i, el) => {
      const $el = $(el);
      const href = $el.attr('href') || '';
      const match = href.match(/\/status\/(.+)/);
      if (match) {
        statuses.push({
          name: $el.text().trim(),
          slug: match[1],
        });
      }
    });

    return new Response(JSON.stringify({
      success: true,
      data: { genres, types, statuses },
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
