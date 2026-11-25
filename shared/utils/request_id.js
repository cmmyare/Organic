// Assigns a request ID to every request (used in logs and error bodies).
import { randomUUID } from 'node:crypto';

const safe_id = /^[A-Za-z0-9-]{8,64}$/;

export function request_id_middleware(req, res, next) {
  const incoming = req.get('x-request-id');
  req.id = incoming && safe_id.test(incoming) ? incoming : randomUUID();
  res.set('x-request-id', req.id);
  next();
}
