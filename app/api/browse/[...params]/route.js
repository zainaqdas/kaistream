import { browseAnime } from '@/scraper/scraper.js';

export const revalidate = 600; // cache for 10 minutes

export async function GET(request, { params }) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const { params: pathParams } = params;

  const [category, value] = pathParams;

  const validCategories = ['genre', 'type', 'status', 'latest', 'new', 'popular'];
  if (!validCategories.includes(category)) {
    return Response.json(
      {
        success: false,
        error: `Invalid category. Valid: ${validCategories.join(', ')}`,
      },
      { status: 400 }
    );
  }

  if ((category === 'genre' || category === 'type' || category === 'status') && !value) {
    return Response.json(
      {
        success: false,
        error: `Value required for category "${category}"`,
      },
      { status: 400 }
    );
  }

  try {
    const data = await browseAnime(category, value, page);
    return Response.json({ success: true, data });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
