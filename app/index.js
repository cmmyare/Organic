// Customer/provider API entrypoint (default port 3002). Run: npm run dev:api
import { get_config } from '../shared/config/env.js';
import { create_logger } from '../shared/config/logger.js';
import { connect_mongo, check_mongo, close_mongo } from '../shared/config/mongo_connection.js';
import { run_server } from '../shared/utils/run_server.js';
import { create_api_app } from './create_api_app.js';

const config = get_config();
const logger = create_logger({ name: 'origin-api', level: config.LOG_LEVEL });

try {
  await connect_mongo({ uri: config.MONGO_URI, logger });
} catch (error) {
  logger.fatal({ err: error.message }, 'cannot connect to mongo; api not started');
  process.exit(1);
}

const app = create_api_app({
  logger,
  trust_proxy: config.NODE_ENV === 'production' || config.NODE_ENV === 'staging' ? 1 : false,
  checks: { mongo: check_mongo },
});

run_server({
  app,
  host: config.BIND_HOST,
  port: config.API_PORT,
  logger,
  on_shutdown: close_mongo,
});
