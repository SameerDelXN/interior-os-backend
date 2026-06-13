// =============================================================================
// InteriorOS Backend — Redis Connection
// =============================================================================

import { env } from '@/config/env';

// Dynamic import to avoid build errors when redis is not available
let Redis: typeof import('ioredis').default;

interface RedisCache {
  client: InstanceType<typeof Redis> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var redisCache: RedisCache | undefined;
}

const cached: RedisCache = global.redisCache ?? { client: null };

if (!global.redisCache) {
  global.redisCache = cached;
}

export async function getRedisClient() {
  if (cached.client) {
    return cached.client;
  }

  try {
    const IORedis = (await import('ioredis')).default;
    Redis = IORedis;

    cached.client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy(times: number) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    cached.client.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    cached.client.on('error', (error: Error) => {
      console.error('❌ Redis connection error:', error.message);
    });

    return cached.client;
  } catch {
    console.warn('⚠️ Redis not available, running without cache');
    return null;
  }
}

export async function disconnectRedis(): Promise<void> {
  if (cached.client) {
    await cached.client.quit();
    cached.client = null;
    console.log('Redis disconnected');
  }
}
