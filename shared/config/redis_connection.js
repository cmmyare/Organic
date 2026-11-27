// Redis connection for admin sessions (node-redis client, as required by connect-redis).
import { createClient } from 'redis';
import { mask_connection_uri } from './logger.js';

export function create_redis({ url, name, logger }) {
  if (!url) return null;
  const client = createClient({
    url,
    name: `origin:${name}`,
    disableOfflineQueue: true, // while Redis is down, commands fail at once (sessions fail closed)
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
  if (client?.isOpen) await client.close();
}
