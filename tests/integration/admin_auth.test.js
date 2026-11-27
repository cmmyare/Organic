// Admin authentication, session, CSRF and menu-access tests.
// Uses a separate test database (TEST_MONGO_URI, or MONGO_URI with the database renamed to organic_test)
// and an in-memory session store, so no Redis is needed. Only the admins/menus collections of the
// test database are cleared.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as wait } from 'node:timers/promises';
import request from 'supertest';
import mongoose from 'mongoose';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import { get_config } from '../../shared/config/env.js';
import { create_logger } from '../../shared/config/logger.js';
import { Admin } from '../../shared/models/admin.js';
import { Menu } from '../../shared/models/menu.js';
import { create_admin_app } from '../../admin/create_admin_app.js';

const logger = create_logger({ name: 'test', level: 'silent' });
const password = 'correct-horse-battery-staple';
const general_email = 'general@origin.test';
const restricted_email = 'restricted@origin.test';

const test_uri = process.env.TEST_MONGO_URI || (() => {
  const url = new URL(get_config().MONGO_URI);
  url.pathname = '/organic_test';
  return url.toString();
})();

function build_app(options = {}) {
  return create_admin_app({ logger, session_store: new session.MemoryStore(), session_secret: 'x'.repeat(40), ...options });
}

function csrf_from(html) {
  return html.match(/name="_csrf" value="([a-f0-9]+)"/)[1];
}

async function login(agent, email, login_password = password) {
  const page = await agent.get('/login');
  return agent.post('/login').type('form').send({ _csrf: csrf_from(page.text), email, password: login_password });
}

before(async () => {
  assert.match(new URL(test_uri).pathname, /_test$/, 'tests must run against a *_test database');
  await mongoose.connect(test_uri, { serverSelectionTimeoutMS: 15_000, autoIndex: false });
  await Promise.all([Admin.deleteMany({}), Menu.deleteMany({})]);
  await Admin.createIndexes();

  const [catalog, finance] = await Menu.create([
    { title: 'Catalog', type: 'parent', sort_order: 1 },
    { title: 'Finance', type: 'parent', status: 0, sort_order: 2 },
  ]);
  const [products, , payments, reports] = await Menu.create([
    { title: 'Products', type: 'child', parent_menu: catalog._id, url: '/products', sort_order: 1 },
    { title: 'Categories', type: 'child', parent_menu: catalog._id, url: '/categories', sort_order: 2 },
    { title: 'Payments', type: 'child', parent_menu: finance._id, url: '/payments' },
    { title: 'Reports', type: 'child', parent_menu: catalog._id, url: '/reports', is_hidden: true },
  ]);

  const password_hash = await bcrypt.hash(password, 12);
  await Admin.create([
    { name: 'General Admin', email_normalized: general_email, password_hash, type: 0 },
    { name: 'Restricted Admin', email_normalized: restricted_email, password_hash, type: 1, url_array: [products._id, payments._id, reports._id] },
  ]);
});

after(async () => {
  await Promise.all([Admin.deleteMany({}), Menu.deleteMany({})]);
  await mongoose.disconnect();
});

test('protected pages redirect to /login without a session', async () => {
  const app = build_app();
  for (const url of ['/', '/dashboard', '/products', '/anything']) {
    const res = await request(app).get(url);
    assert.equal(res.status, 302, url);
    assert.equal(res.headers.location, '/login');
  }
});

test('AJAX request without a session gets 401 JSON', async () => {
  const res = await request(build_app()).get('/dashboard').set('X-Requested-With', 'XMLHttpRequest');
  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, 'SESSION_EXPIRED');
});

test('login page renders with CSRF token and secure cookie flags', async () => {
  const res = await request(build_app()).get('/login');
  assert.equal(res.status, 200);
  assert.ok(csrf_from(res.text));
  const cookie = res.headers['set-cookie'].join(';');
  assert.match(cookie, /origin_admin_sid=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
});

test('login without CSRF token is rejected', async () => {
  const res = await request(build_app()).post('/login').type('form').send({ email: general_email, password });
  assert.equal(res.status, 403);
});

test('wrong password and unknown email give the same generic error', async () => {
  const app = build_app();
  const wrong = await login(request.agent(app), general_email, 'wrong-password');
  const unknown = await login(request.agent(app), 'nobody@origin.test');
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.match(wrong.text, /Invalid email or password\./);
  assert.match(unknown.text, /Invalid email or password\./);
  assert.ok(!wrong.text.includes('wrong-password'));
});

test('successful login regenerates the session ID (no session fixation)', async () => {
  const app = build_app();
  const agent = request.agent(app);
  const page = await agent.get('/login');
  const pre_login_cookie = page.headers['set-cookie'][0].split(';')[0];

  const res = await agent.post('/login').type('form').send({ _csrf: csrf_from(page.text), email: general_email, password });
  assert.equal(res.status, 302);
  assert.equal(res.headers.location, '/dashboard');
  const post_login_cookie = res.headers['set-cookie'][0].split(';')[0];
  assert.notEqual(post_login_cookie, pre_login_cookie);

  assert.equal((await agent.get('/dashboard')).status, 200);
  const attacker = await request(app).get('/dashboard').set('Cookie', pre_login_cookie);
  assert.equal(attacker.status, 302);
  assert.equal(attacker.headers.location, '/login');
});

test('email is matched case-insensitively and last_login_at is recorded', async () => {
  const agent = request.agent(build_app());
  const res = await login(agent, '  GENERAL@Origin.TEST ');
  assert.equal(res.status, 302);
  const admin = await Admin.findOne({ email_normalized: general_email }).lean();
  assert.ok(admin.last_login_at instanceof Date);
});

test('general admin (type 0) sees all active, visible menus', async () => {
  const agent = request.agent(build_app());
  await login(agent, general_email);
  const res = await agent.get('/dashboard');
  assert.equal(res.status, 200);
  assert.match(res.text, /General Admin/);
  assert.match(res.text, /href="\/products"/);
  assert.match(res.text, /href="\/categories"/);
  assert.doesNotMatch(res.text, /href="\/payments"/, 'child of inactive parent is hidden');
  assert.doesNotMatch(res.text, /href="\/reports"/, 'hidden menu is not in sidebar');
  assert.equal((await agent.get('/categories')).status, 404, 'type 0 passes the menu check');
});

test('restricted admin (type 1) sees and opens only granted menus', async () => {
  const agent = request.agent(build_app());
  await login(agent, restricted_email);
  const res = await agent.get('/dashboard');
  assert.equal(res.status, 200);
  assert.match(res.text, /href="\/products"/);
  assert.doesNotMatch(res.text, /href="\/categories"/);
  assert.doesNotMatch(res.text, /href="\/payments"/);

  assert.equal((await agent.get('/categories')).status, 403, 'direct URL to a menu not granted');
  assert.equal((await agent.get('/payments')).status, 403, 'granted menu under an inactive parent');
  assert.equal((await agent.get('/products')).status, 404, 'granted: passes guard (page arrives later)');
  assert.equal((await agent.get('/products/123')).status, 404, 'sub-path of granted menu passes guard');
  assert.equal((await agent.get('/reports')).status, 404, 'hidden but granted menu is accessible');
  assert.equal((await agent.get('/productsx')).status, 403, 'prefix match needs a path boundary');
});

test('logout requires CSRF, destroys the session and clears the cookie', async () => {
  const agent = request.agent(build_app());
  await login(agent, general_email);
  const page = await agent.get('/dashboard');

  assert.equal((await agent.post('/logout').type('form').send({ _csrf: 'bad' })).status, 403);

  const res = await agent.post('/logout').type('form').send({ _csrf: csrf_from(page.text) });
  assert.equal(res.status, 302);
  assert.equal(res.headers.location, '/login');
  assert.match(res.headers['set-cookie'].join(';'), /origin_admin_sid=;/);
  assert.equal((await agent.get('/dashboard')).headers.location, '/login');
});

test('session expires after the idle timeout and activity keeps it alive', async () => {
  const agent = request.agent(build_app({ session_idle_ms: 3000 }));
  await login(agent, general_email);
  await wait(2000);
  assert.equal((await agent.get('/dashboard')).status, 200, 'activity within the idle window');
  await wait(2000);
  assert.equal((await agent.get('/dashboard')).status, 200, 'rolling: 4 s after login, 2 s idle');
  await wait(3500);
  const res = await agent.get('/dashboard');
  assert.equal(res.status, 302, 'idle longer than the timeout');
  assert.equal(res.headers.location, '/login');
});

test('raising auth_version or deactivating the admin revokes existing sessions', async () => {
  const app = build_app();
  const agent = request.agent(app);
  await login(agent, restricted_email);
  assert.equal((await agent.get('/dashboard')).status, 200);

  await Admin.updateOne({ email_normalized: restricted_email }, { $inc: { auth_version: 1 } });
  assert.equal((await agent.get('/dashboard')).headers.location, '/login');

  const agent2 = request.agent(app);
  await login(agent2, restricted_email);
  assert.equal((await agent2.get('/dashboard')).status, 200);
  await Admin.updateOne({ email_normalized: restricted_email }, { $set: { is_active: false } });
  assert.equal((await agent2.get('/dashboard')).headers.location, '/login');
  assert.equal((await login(request.agent(app), restricted_email)).status, 401, 'inactive admin cannot log in');
});
