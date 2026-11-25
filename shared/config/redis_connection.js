// Redis connections. Sessions and queues use separate connections
// (queue Redis must be configured with maxmemory-policy noeviction).
import Redis from 'ioredis';
import { mask_connection_uri } from './logger.js';

export function create_redis({ url, name, logger, for_queue = false }) {
  if (!url) {
    logger.warn({ connection: name }, 'redis url not configured; skipping (allowed in development only)');
    return null;
  }
  const client = new Redis(url, {
    connectionName: `origin:${name}`,
    lazyConnect: true,
    // BullMQ requires maxRetriesPerRequest null on queue connections.
    maxRetriesPerRequest: for_queue ? null : 3,
  });
  client.on('error', (error) => logger.error({ connection: name, err: error.message }, 'redis error'));
  client.on('ready', () => logger.info({ connection: name, url: mask_connection_uri(url) }, 'redis ready'));
  return client;
}

export async function connect_redis(client) {
  if (client) await client.connect();
}

export function make_redis_check(client) {
  return async () => {
    if (!client) return { ok: true, detail: 'not_configured' };
    try {
      await client.ping();
      return { ok: true };
    } catch {
      return { ok: false, detail: 'ping_failed' };
    }
  };
}

export async function close_redis(client) {
  if (client) await client.quit().catch(() => client.disconnect());
}
