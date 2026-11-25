// Builds the customer/provider JSON API Express app.
// Response envelope (master spec §11):
//   success: { success: true, data, meta }
//   error:   { success: false, error: { code, message, fields }, request_id }
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { request_id_middleware } from '../shared/utils/request_id.js';
import { create_health_router } from '../shared/utils/health_router.js';

export function create_api_app({ logger, checks = {}, trust_proxy = false }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', trust_proxy);

  app.use(request_id_middleware);
  app.use(pinoHttp({ logger, genReqId: (req) => req.id, autoLogging: { ignore: (req) => req.url.startsWith('/health') } }));
  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));

  app.use(create_health_router({ service: 'origin-api', checks }));
  // /api/v1/customer and /api/v1/provider routes are added from Day 17.

  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Resource not found', fields: {} },
      request_id: req.id,
    });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => {
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON', fields: {} },
        request_id: req.id,
      });
    }
    if (error.type === 'entity.too.large') {
      return res.status(413).json({
        success: false,
        error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large', fields: {} },
        request_id: req.id,
      });
    }
    req.log.error({ err: error }, 'unhandled api error');
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong', fields: {} },
      request_id: req.id,
    });
  });

  return app;
}
