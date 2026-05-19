import { isRedisAvailable, getCacheStats, resetCacheStats, type CacheStats } from '@/lib/cache';

export const revalidate = 0;

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const reset = searchParams.get('reset') === 'true';

  const stats = getCacheStats();

  if (reset) {
    resetCacheStats();
    stats.hits = 0;
    stats.misses = 0;
    stats.staleHits = 0;
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        ...stats,
        reset,
        timestamp: new Date().toISOString(),
      },
    } as { success: true; data: CacheStats & { reset: boolean; timestamp: string } }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
