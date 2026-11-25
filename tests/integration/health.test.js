// HTTP tests for both apps using stubbed dependency checks
// (no real Mongo/Redis needed; real connectivity is checked by running the servers).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { create_logger } from '../../shared/config/logger.js';
import { create_admin_app } from '../../admin/create_admin_app.js';
import { create_api_app } from '../../app/create_api_app.js';

const logger = create_logger({ name: 'test', level: 'silent' });
const ok = async () => ({ ok: true });
const down = async () => ({ ok: false, detail: 'not_connected' });
const throws = async () => { throw new Error('boom secret=abc'); };

for (const [label, build, service] of [
  ['admin', create_admin_app, 'origin-admin'],
  ['api', create_api_app, 'origin-api'],
]) {
  test(`${label}: /health/live returns 200`, async () => {
    const res = await request(build({ logger, checks: { mongo: down } })).get('/health/live');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { success: true, data: { service, status: 'ok' } });
    assert.ok(res.headers['x-request-id']);
  });

  test(`${label}: /health/ready is 200 when all checks pass`, async () => {
    const res = await request(build({ logger, checks: { mongo: ok, other: ok } })).get('/health/ready');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'ready');
  });

  test(`${label}: /health/ready is 503 when a dependency is down`, async () => {
    const res = await request(build({ logger, checks: { mongo: down } })).get('/health/ready');
    assert.equal(res.status, 503);
    assert.equal(res.body.success, false);
    assert.deepEqual(res.body.data.checks.mongo, { ok: false, detail: 'not_connected' });
  });

  test(`${label}: a throwing check reports check_failed without leaking the error`, async () => {
    const res = await request(build({ logger, checks: { mongo: throws } })).get('/health/ready');
    assert.equal(res.status, 503);
    assert.deepEqual(res.body.data.checks.mongo, { ok: false, detail: 'check_failed' });
    assert.ok(!JSON.stringify(res.body).includes('secret'));
  });

  test(`${label}: security headers set and x-powered-by hidden`, async () => {
    const res = await request(build({ logger })).get('/health/live');
    assert.equal(res.headers['x-powered-by'], undefined);
    assert.ok(res.headers['content-security-policy']);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
  });

  test(`${label}: safe incoming x-request-id is echoed, unsafe one replaced`, async () => {
    const app = build({ logger });
    const good = await request(app).get('/health/live').set('x-request-id', 'abc12345-test');
    assert.equal(good.headers['x-request-id'], 'abc12345-test');
    const bad = await request(app).get('/health/live').set('x-request-id', '<script>');
    assert.notEqual(bad.headers['x-request-id'], '<script>');
  });
}

test('admin: dashboard renders Bootstrap layout with brand', async () => {
  const res = await request(create_admin_app({ logger })).get('/dashboard');
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /text\/html/);
  assert.match(res.text, /\/vendor\/bootstrap\/css\/bootstrap\.min\.css/);
  assert.match(res.text, /\/vendor\/jquery\/jquery\.min\.js/);
  assert.match(res.text, /ORIGIN/);
});

test('admin: root redirects to dashboard', async () => {
  const res = await request(create_admin_app({ logger })).get('/');
  assert.equal(res.status, 302);
  assert.equal(res.headers.location, '/dashboard');
});

test('admin: vendor and own static assets are served', async () => {
  const app = create_admin_app({ logger });
  for (const url of [
    '/vendor/bootstrap/css/bootstrap.min.css',
    '/vendor/bootstrap/js/bootstrap.bundle.min.js',
    '/vendor/jquery/jquery.min.js',
    '/public/css/origin.css',
    '/public/js/admin.js',
    '/public/images/logo.svg',
  ]) {
    const res = await request(app).get(url);
    assert.equal(res.status, 200, url);
  }
});

test('admin: unknown page renders 404 HTML', async () => {
  const res = await request(create_admin_app({ logger })).get('/nope');
  assert.equal(res.status, 404);
  assert.match(res.text, /404/);
});

test('api: unknown route returns JSON error envelope', async () => {
  const res = await request(create_api_app({ logger })).get('/api/v1/customer/nope');
  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'NOT_FOUND');
  assert.ok(res.body.request_id);
});

test('api: malformed JSON returns 400 envelope', async () => {
  const res = await request(create_api_app({ logger }))
    .post('/api/v1/customer/anything')
    .set('content-type', 'application/json')
    .send('{bad json');
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'INVALID_JSON');
});
