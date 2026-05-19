import { isRedisAvailable, getCacheStats } from '@/lib/cache';

export const revalidate = 0;

export async function GET(): Promise<Response> {
  const redisAvailable = isRedisAvailable();
  const stats = getCacheStats();

  return Response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cache: redisAvailable ? 'redis' : 'memory',
    cacheStats: stats,
  });
}
