// Builds the admin Express app (EJS + Bootstrap 5 + jQuery).
// Kept separate from admin/index.js so tests can import it without
// opening ports or database connections.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { request_id_middleware } from '../shared/utils/request_id.js';
import { create_health_router } from '../shared/utils/health_router.js';
import { brand } from '../shared/constants/brand.js';
import { create_page_router } from './routes/page_routes.js';

const admin_dir = path.dirname(fileURLToPath(import.meta.url));
const node_modules_dir = path.join(admin_dir, '..', 'node_modules');

export function create_admin_app({ logger, checks = {}, trust_proxy = false }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', trust_proxy);
  app.set('view engine', 'ejs');
  app.set('views', path.join(admin_dir, 'views'));

  app.use(request_id_middleware);
  app.use(pinoHttp({ logger, genReqId: (req) => req.id, autoLogging: { ignore: (req) => req.url.startsWith('/health') } }));
  app.use(helmet());

  app.use(create_health_router({ service: 'origin-admin', checks }));

  // Static assets: own files plus pinned vendor builds (no CDN).
  app.use('/public', express.static(path.join(admin_dir, 'public'), { maxAge: '1h' }));
  app.use('/vendor/bootstrap', express.static(path.join(node_modules_dir, 'bootstrap', 'dist'), { maxAge: '7d' }));
  app.use('/vendor/jquery', express.static(path.join(node_modules_dir, 'jquery', 'dist'), { maxAge: '7d' }));

  app.use((req, res, next) => {
    res.locals.brand = brand;
    res.locals.request_id = req.id;
    res.locals.current_path = req.path;
    next();
  });

  app.use(create_page_router());

  app.use((req, res) => {
    res.status(404).render('pages/error', { title: 'Not found', status: 404, message: 'The page you requested does not exist.' });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => {
    req.log.error({ err: error }, 'unhandled admin error');
    res.status(500).render('pages/error', { title: 'Error', status: 500, message: 'Something went wrong. Please try again.' });
  });

  return app;
}
