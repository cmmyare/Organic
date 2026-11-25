// /health/live and /health/ready for every Express process.
// Responses never contain secrets, hostnames or connection strings.
import express from 'express';

export function create_health_router({ service, checks = {} }) {
  const router = express.Router();

  router.get('/health/live', (req, res) => {
    res.json({ success: true, data: { service, status: 'ok' } });
  });

  router.get('/health/ready', async (req, res) => {
    const results = {};
    for (const [name, check] of Object.entries(checks)) {
      try {
        results[name] = await check();
      } catch {
        results[name] = { ok: false, detail: 'check_failed' };
      }
    }
    const ready = Object.values(results).every((result) => result.ok);
    const body = {
      success: ready,
      data: { service, status: ready ? 'ready' : 'not_ready', checks: results },
    };
    res.status(ready ? 200 : 503).json(body);
  });

  return router;
}
