import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

export const redisSub = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

redis.on('connect', () => console.log('[Redis] Connected (pub)'));
redis.on('error', (err) => console.error('[Redis] Error (pub):', err.message));

redisSub.on('connect', () => console.log('[Redis] Connected (sub)'));
redisSub.on('error', (err) => console.error('[Redis] Error (sub):', err.message));
