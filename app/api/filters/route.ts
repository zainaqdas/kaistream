import { getFiltersGQL } from '@/lib/anilist';
import type { Filters } from '@/types';

export const revalidate = 3600;

export async function GET(): Promise<Response> {
  try {
    const data = await getFiltersGQL();
    return new Response(
      JSON.stringify({
        success: true,
        data,
      } as { success: true; data: Filters }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    return Response.json(
      { success: false, error: (error as Error).message } as { success: false; error: string },
      { status: 500 }
    );
  }
}
