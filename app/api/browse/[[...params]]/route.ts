import { browseAnimeGQL } from '@/lib/anilist';
import type { BrowseResult } from '@/types';

export const revalidate = 600;

export async function GET(
  request: Request,
  { params }: { params: { params: string[] | undefined } }
): Promise<Response> {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  // Default to "popular" when no browse params provided
  const [category = 'popular', value] = params.params || [];

  const validCategories = ['genre', 'type', 'status', 'latest', 'new', 'popular'];
  if (!validCategories.includes(category)) {
    return Response.json(
      {
        success: false,
        error: `Invalid category. Valid: ${validCategories.join(', ')}`,
      } as { success: false; error: string },
      { status: 400 }
    );
  }

  if ((category === 'genre' || category === 'type' || category === 'status') && !value) {
    return Response.json(
      {
        success: false,
        error: `Value required for category "${category}"`,
      } as { success: false; error: string },
      { status: 400 }
    );
  }

  try {
    const data = await browseAnimeGQL(category, value || '', page);
    return new Response(JSON.stringify({ success: true, data } as { success: true; data: BrowseResult }), {
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
