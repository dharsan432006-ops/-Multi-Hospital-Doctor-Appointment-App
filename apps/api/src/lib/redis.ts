import IORedis from 'ioredis';
import { getConfig } from '../config/config.js';

let client: IORedis | null = null;
let warned = false;

export function getRedis(): IORedis | null {
  if (client) return client;
  try {
    const cfg = getConfig();
    client = new IORedis(cfg.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      lazyConnect: true,
    });
    client.on('error', () => {
      if (!warned) {
        warned = true;
        // eslint-disable-next-line no-console
        console.warn('Redis unavailable — queues will run inline.');
      }
    });
    // Fire-and-forget connect; failures fall back to inline execution.
    client.connect().catch(() => undefined);
    return client;
  } catch {
    return null;
  }
}

export async function isRedisReady(): Promise<boolean> {
  const r = getRedis();
  if (!r) return false;
  try {
    const pong = await r.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}
