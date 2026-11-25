// Loads and validates environment configuration once at boot.
// Any invalid or missing value stops the process with a clear message
// (secret values are never printed).
import 'dotenv/config';
import { z } from 'zod';

const port_schema = z.coerce.number().int().min(1).max(65535);

const env_schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

    BIND_HOST: z.string().min(1).default('127.0.0.1'),
    ADMIN_PORT: port_schema.default(3001),
    API_PORT: port_schema.default(3002),

    MONGO_URI: z
      .string()
      .regex(/^mongodb(\+srv)?:\/\//, 'must start with mongodb:// or mongodb+srv://'),

    // Required outside development/test. Admin sessions start on Day 02,
    // so local development can boot without it today.
    SESSION_REDIS_URL: z.string().regex(/^rediss?:\/\//, 'must start with redis:// or rediss://').optional(),

    SESSION_SECRET: z.string().min(32, 'must be at least 32 characters'),
    APP_TIMEZONE: z.string().default('Africa/Mogadishu'),
  })
  .superRefine((env, ctx) => {
    const strict = env.NODE_ENV === 'staging' || env.NODE_ENV === 'production';
    if (strict && !env.SESSION_REDIS_URL) {
      ctx.addIssue({ code: 'custom', path: ['SESSION_REDIS_URL'], message: `required when NODE_ENV=${env.NODE_ENV}` });
    }
    if (env.ADMIN_PORT === env.API_PORT) {
      ctx.addIssue({ code: 'custom', path: ['API_PORT'], message: 'must differ from ADMIN_PORT' });
    }
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: env.APP_TIMEZONE });
    } catch {
      ctx.addIssue({ code: 'custom', path: ['APP_TIMEZONE'], message: 'unknown IANA time zone' });
    }
  });

// Empty strings in .env mean "not set".
function strip_empty(source) {
  return Object.fromEntries(Object.entries(source).filter(([, value]) => value !== ''));
}

export function parse_env(source) {
  const result = env_schema.safeParse(strip_empty(source));
  if (!result.success) {
    const lines = result.error.issues.map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`);
    const error = new Error(`Invalid environment configuration:\n${lines.join('\n')}`);
    error.code = 'CONFIG_INVALID';
    throw error;
  }
  return Object.freeze(result.data);
}

let cached_config;

export function get_config() {
  if (!cached_config) {
    try {
      cached_config = parse_env(process.env);
    } catch (error) {
      if (error.code === 'CONFIG_INVALID') {
        console.error(error.message);
        process.exit(1);
      }
      throw error;
    }
  }
  return cached_config;
}
