// Structured JSON logger with redaction of secrets and credentials.
import pino from 'pino';

const redact_paths = [
  'password',
  '*.password',
  'password_hash',
  '*.password_hash',
  'otp',
  '*.otp',
  'code',
  '*.code',
  'token',
  '*.token',
  'access_token',
  '*.access_token',
  'refresh_token',
  '*.refresh_token',
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
];

export function create_logger({ name, level = 'info' }) {
  return pino({
    name,
    level,
    base: { service: name },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: { paths: redact_paths, censor: '[REDACTED]' },
  });
}

// Removes credentials from a connection string so it can be logged safely.
export function mask_connection_uri(uri) {
  if (!uri) return uri;
  return uri.replace(/\/\/([^@/]+)@/, '//***:***@');
}
