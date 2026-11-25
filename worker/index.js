// Background worker entrypoint. Run: npm run dev:worker
// Day 01: boots config, connects Mongo and queue Redis, then idles.
// BullMQ queues and processors are added on Day 11 (recurring schedules).
import { get_config } from '../shared/config/env.js';
import { create_logger } from '../shared/config/logger.js';
import { connect_mongo, close_mongo } from '../shared/config/mongo_connection.js';
import { create_redis, connect_redis, close_redis } from '../shared/config/redis_connection.js';

const config = get_config();
const logger = create_logger({ name: 'origin-worker', level: config.LOG_LEVEL });

try {
  await connect_mongo({ uri: config.MONGO_URI, logger });
} catch (error) {
  logger.fatal({ err: error.message }, 'cannot connect to mongo; worker not started');
  process.exit(1);
}

const queue_redis = create_redis({ url: config.QUEUE_REDIS_URL, name: 'queue', logger, for_queue: true });
try {
  await connect_redis(queue_redis);
} catch (error) {
  logger.fatal({ err: error.message }, 'cannot connect to queue redis; worker not started');
  process.exit(1);
}

logger.info('worker started; no queues registered yet');
const keep_alive = setInterval(() => {}, 60_000);

let shutting_down = false;
async function shutdown(signal) {
  if (shutting_down) return;
  shutting_down = true;
  logger.info({ signal }, 'worker shutting down');
  clearInterval(keep_alive);
  await close_redis(queue_redis);
  await close_mongo();
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
