import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse_env } from '../../shared/config/env.js';
import { mask_connection_uri } from '../../shared/config/logger.js';

const valid = {
  MONGO_URI: 'mongodb+srv://user:secret@cluster.example.invalid/organic_test',
  SESSION_SECRET: 'x'.repeat(48),
};

test('valid minimal env applies defaults', () => {
  const config = parse_env(valid);
  assert.equal(config.NODE_ENV, 'development');
  assert.equal(config.ADMIN_PORT, 3001);
  assert.equal(config.API_PORT, 3002);
  assert.equal(config.BIND_HOST, '127.0.0.1');
  assert.equal(config.APP_TIMEZONE, 'Africa/Mogadishu');
  assert.ok(Object.isFrozen(config));
});

test('ports are coerced from strings', () => {
  const config = parse_env({ ...valid, ADMIN_PORT: '4001', API_PORT: '4002' });
  assert.equal(config.ADMIN_PORT, 4001);
  assert.equal(config.API_PORT, 4002);
});

test('missing MONGO_URI is rejected', () => {
  const { MONGO_URI: _omit, ...rest } = valid;
  assert.throws(() => parse_env(rest), /MONGO_URI/);
});

test('non-mongo URI is rejected', () => {
  assert.throws(() => parse_env({ ...valid, MONGO_URI: 'http://example.invalid' }), /MONGO_URI/);
});

test('short SESSION_SECRET is rejected', () => {
  assert.throws(() => parse_env({ ...valid, SESSION_SECRET: 'short' }), /SESSION_SECRET/);
});

test('same admin and api port is rejected', () => {
  assert.throws(() => parse_env({ ...valid, ADMIN_PORT: '3001', API_PORT: '3001' }), /API_PORT/);
});

test('unknown time zone is rejected', () => {
  assert.throws(() => parse_env({ ...valid, APP_TIMEZONE: 'Mars/Olympus' }), /APP_TIMEZONE/);
});

test('production requires both redis urls', () => {
  assert.throws(() => parse_env({ ...valid, NODE_ENV: 'production' }), /SESSION_REDIS_URL[\s\S]*QUEUE_REDIS_URL/);
  const config = parse_env({
    ...valid,
    NODE_ENV: 'production',
    SESSION_REDIS_URL: 'rediss://redis.example.invalid:6380',
    QUEUE_REDIS_URL: 'rediss://queue.example.invalid:6380',
  });
  assert.equal(config.NODE_ENV, 'production');
});

test('empty strings are treated as unset', () => {
  const config = parse_env({ ...valid, SESSION_REDIS_URL: '', ADMIN_PORT: '' });
  assert.equal(config.SESSION_REDIS_URL, undefined);
  assert.equal(config.ADMIN_PORT, 3001);
});

test('error message never contains the secret value', () => {
  try {
    parse_env({ ...valid, SESSION_SECRET: 'tooshort-secret' });
    assert.fail('expected throw');
  } catch (error) {
    assert.ok(!error.message.includes('tooshort-secret'));
  }
});

test('mask_connection_uri hides credentials', () => {
  assert.equal(
    mask_connection_uri('mongodb+srv://user:p**ss@cluster.example.invalid/organic'),
    'mongodb+srv://***:***@cluster.example.invalid/organic',
  );
});
