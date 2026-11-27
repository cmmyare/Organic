// Admin server entrypoint (default port 3001). Run: npm run dev:admin
import { RedisStore } from 'connect-redis';
import { get_config } from '../shared/config/env.js';
import { create_logger } from '../shared/config/logger.js';
import { connect_mongo, check_mongo, close_mongo } from '../shared/config/mongo_connection.js';
import { create_redis, connect_redis, make_redis_check, close_redis } from '../shared/config/redis_connection.js';
import { run_server } from '../shared/utils/run_server.js';
import { create_admin_app } from './create_admin_app.js';

const config = get_config();
const logger = create_logger({ name: 'origin-admin', level: config.LOG_LEVEL });
const is_deployed = config.NODE_ENV === 'production' || config.NODE_ENV === 'staging';

// Admin sessions live only in Redis; without it the admin does not start (fails closed).
if (!config.SESSION_REDIS_URL) {
  logger.fatal('SESSION_REDIS_URL is not set; admin sessions require Redis');
  process.exit(1);
}

try {
  await connect_mongo({ uri: config.MONGO_URI, logger });
} catch (error) {
  logger.fatal({ err: error.message }, 'cannot connect to mongo; admin not started');
  process.exit(1);
}

const session_redis = create_redis({ url: config.SESSION_REDIS_URL, name: 'admin-session', logger });
try {
  await connect_redis(session_redis);
} catch (error) {
  logger.fatal({ err: error.message }, 'cannot connect to session redis; admin not started');
  process.exit(1);
}

const app = create_admin_app({
  logger,
  trust_proxy: is_deployed ? 1 : false,
  session_store: new RedisStore({ client: session_redis, prefix: `origin:${config.NODE_ENV}:admin_sess:`, ttl: 15 * 60 }),
  session_secret: config.SESSION_SECRET,
  secure_cookie: is_deployed,
  checks: { mongo: check_mongo, session_redis: make_redis_check(session_redis) },
});

run_server({
  app,
  host: config.BIND_HOST,
  port: config.ADMIN_PORT,
  logger,
  on_shutdown: async () => {
    await close_redis(session_redis);
    await close_mongo();
  },
});
