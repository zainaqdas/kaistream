import { getHomeData } from '@/lib/anilist';
import type { HomeData } from '@/types';

export const revalidate = 300;

export async function GET(): Promise<Response> {
  try {
    const data = await getHomeData();
    return new Response(JSON.stringify({ success: true, data } as { success: true; data: HomeData }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    return Response.json(
      { success: false, error: (error as Error).message } as { success: false; error: string },
      { status: 500 }
    );
  }
}
