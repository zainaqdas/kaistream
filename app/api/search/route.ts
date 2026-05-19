import { searchAnimeGQL } from '@/lib/anilist';
import type { SearchData } from '@/types';

export const revalidate = 60;

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const page = parseInt(searchParams.get('page') || '1');

  if (!q) {
    return Response.json(
      { success: false, error: 'Query parameter "q" is required' } as { success: false; error: string },
      { status: 400 }
    );
  }

  try {
    const data = await searchAnimeGQL(q, page);
    return new Response(JSON.stringify({ success: true, data } as { success: true; data: SearchData }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    return Response.json(
      { success: false, error: (error as Error).message } as { success: false; error: string },
      { status: 500 }
    );
  }
}
