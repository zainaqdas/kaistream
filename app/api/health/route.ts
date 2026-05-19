import { isRedisAvailable } from '@/lib/cache';

export async function GET(): Promise<Response> {
  const redisAvailable = isRedisAvailable();

  return Response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cache: redisAvailable ? 'redis' : 'memory',
  });
}
