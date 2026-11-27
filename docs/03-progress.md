# Progress

Status values: NOT STARTED · IN PROGRESS · BLOCKED · DONE (DONE requires acceptance evidence).

| Date | Task | Status | Commit / tests | Blockers / next step |
|---|---|---|---|---|
| 2026-11-25 | 01 Foundation | DONE | 6db1399 + simplification; 29/29 tests, lint clean, live Atlas `organic` ready on both servers | — |
| 2026-11-27 | 02 Auth | DONE | 40/40 tests, lint clean; founder signed in live (hosted Redis, `seed:admin`), dashboard shows mongo ✓ session_redis ✓ | Nov 28 · Part 03 RBAC |

---

## 2026-11-27 · Part 02 Auth · DONE

**Live check (founder):** hosted Redis in `SESSION_REDIS_URL`, first general admin created with `seed:admin`,
signed in at http://127.0.0.1:3001 → dashboard with "General Admin" + Sign out; system status mongo ✓, session_redis ✓.

**Scope:** admin model, seed type 0, login/logout, password hash, Redis session 900 s rolling, CSRF, auth
middleware; tests for fixation and idle expiry. Plus (founder request) menu model and DB-driven sidebar.
Menu list/add/edit pages stay on Day 03.

**Changed / new files**
- `shared/models/admin.js` — name, `email_normalized` (unique), `password_hash` (not selected by default), `type` 0/1, `url_array` (menu IDs), `is_active`, `auth_version`, `last_login_at`
- `shared/models/menu.js` — title, status, is_setting, is_hidden, type parent/child, parent_menu, url, icon, sort_order; index `{status, sort_order}`
- `scripts/seed/seed_admin.js` + `npm run seed:admin` — one-time first type 0 admin, creates admins/menus indexes
- `admin/routes/admin.js` (replaces `page_routes.js`), `admin/controllers/admin_controller.js`, `admin/middleware/auth.js`
- `admin/create_admin_app.js` — body parsing, `express-session` (cookie `origin_admin_sid`, httpOnly, sameSite lax, secure when deployed, 900 s, rolling, saveUninitialized false), CSRF, routes
- `admin/index.js` — requires `SESSION_REDIS_URL`; `RedisStore` (prefix `origin:<env>:admin_sess:`, ttl 900)
- `shared/config/redis_connection.js` — node-redis client, offline queue disabled (fails closed)
- Views: new `pages/login.ejs`; `head` CSRF meta; `topbar` admin name + sign-out form; `sidebar` from `menu_tree`; `admin.js` AJAX CSRF header + 401 redirect; CSS for login and menu groups
- Tests: new `tests/integration/admin_auth.test.js`; `health.test.js` updated for login-first admin
- Dependencies added (pinned): express-session 1.19.0, connect-redis 11.0.0, redis 6.4.0, bcryptjs 3.0.3, express-rate-limit 8.7.5. Removed: ioredis.

**Routes (admin :3001)**
- Public: `GET /login`, `POST /login` (rate limit 10 failed attempts / 15 min / IP)
- Protected: `GET /` → `/dashboard`, `GET /dashboard`, `POST /logout`; every other path needs a session and, for type 1, a granted active menu whose url matches (exact or sub-path)

**Commands run and results**
- `npm test` → 40 tests, 40 pass, 0 fail (first run 39/40: the idle-expiry test's 1.5 s window was shorter than Atlas round-trips; widened to 3 s)
- `npm run lint` → no problems
- `node admin/index.js` without `SESSION_REDIS_URL` → exits with fatal "admin sessions require Redis" (fails closed)
- `seed:admin` input checks: bad email / missing / short password → usage error, exit 1, no DB write

**Acceptance (automated, `admin_auth.test.js`)**
- Unauthenticated pages → 302 `/login`; AJAX → 401 JSON
- Login without CSRF → 403; wrong password and unknown email → same generic 401; email case-insensitive
- Session fixation: session ID changes on login; pre-login cookie cannot open `/dashboard`
- Type 0 sees all active visible menus; inactive parent hides children; hidden menus not in sidebar
- Type 1 sees only granted menus; direct URL to ungranted menu → 403; granted under inactive parent → 403; hidden granted → allowed; `/productsx` does not match `/products`
- Logout needs CSRF, destroys session, clears cookie
- Idle expiry: activity keeps the session alive (rolling); idle longer than the timeout → login
- `auth_version` bump or deactivation revokes live sessions; inactive admin cannot log in

**Not verified yet:** real 900 s timeout in a browser, and the login rate limiter (not covered by an automated test).

**Migrations / indexes:** `admins.email_normalized` unique, `menus {status, sort_order}`, both created by `seed:admin`
(Mongoose `autoIndex` stays off).

**Security checks:** passwords bcrypt cost 12, never logged or selected by default; generic login errors with a
dummy-hash compare for unknown emails; session regenerated on login; Redis-only sessions, admin will not start
without Redis and fails closed when Redis is down; CSRF on every state change incl. login/logout and AJAX; grants
re-read from DB each request; health/static never create sessions.

**Next:** founder adds Redis URL → `seed:admin` → sign in. Then Nov 28 · Part 03 RBAC.

---

## 2026-11-25 · Part 01 Foundation · DONE

**Scope:** repo init (ESM), env validation, admin :3001 and API :3002 as independent processes,
Mongo/Redis connectors, health endpoints, Bootstrap layout.

**Files (current)**
- `package.json`, `package-lock.json` — ESM, pinned deps; scripts `dev:admin`, `dev:api`, `start:admin`, `start:api`, `test`, `test:unit`, `test:integration`, `lint`
- `.env.example`, `.gitignore`, `.gitattributes`, `eslint.config.js`, `README.md`, `CLAUDE.md`
- `shared/config/env.js` — zod validation, fails fast; `SESSION_REDIS_URL` required in staging/production only
- `shared/config/logger.js` — pino with redaction; `mask_connection_uri`
- `shared/config/mongo_connection.js`, `shared/config/redis_connection.js` — connectors + readiness checks
- `shared/utils/health_router.js`, `request_id.js`, `run_server.js` (graceful shutdown); `shared/constants/brand.js`
- `admin/` — `create_admin_app.js`, `index.js`, `routes/page_routes.js`, EJS partials/pages, `public/{css,js,images}`
- `app/` — `create_api_app.js` (JSON envelope, 404/400/413/500), `index.js`
- `tests/unit/env.test.js`, `tests/integration/health.test.js`
- `docs/01-master-spec.md`, `02-daily-plan.md`, `03-progress.md`, `04-decision-log.md`

**Routes**
- Admin :3001 — `GET /` → `/dashboard`, `GET /dashboard`, `GET /health/live`, `GET /health/ready`, static `/public/*`, `/vendor/bootstrap/*`, `/vendor/jquery/*`
- API :3002 — `GET /health/live`, `GET /health/ready`; any other path → JSON 404 envelope

**Simplification (same day, founder request)** — removed with no loss of working functionality:
- 15 `.gitkeep` files / empty folders (controllers, middleware, validators, models, services, repositories, integrations, scripts/seed, scripts/migrations, tests/e2e, openapi, postman)
- Empty `app/routes/v1/{customer,provider}` routers (404 handler already covers `/api/v1/*`)
- `worker/index.js`, `dev:worker`/`start:worker` scripts, `QUEUE_REDIS_URL`, queue Redis option → return Day 11
- Placeholder `seed` script → real seed Day 02; `ecosystem.config.cjs` → staging deploy Dec 30
- Duplicate `assets/logo.svg`; `admin/views/layouts/README.md` (note moved into `CLAUDE.md`)
- Fixed: log redaction hid every `code` field (error codes showed `[REDACTED]`); now only `req.body.code`
- Added the progressive-architecture principle to `CLAUDE.md` and the decision log

**Commands run and results**
- `npm test` → 29 tests, 29 pass, 0 fail
- `npm run lint` → no problems
- Live run against Atlas (`db: organic`) on spare ports 4001/4002: admin `/health/live` 200, `/health/ready` 200 (mongo ok, session_redis not_configured), `/dashboard` 200; API `/health/live` 200, `/health/ready` 200, unknown route 404 JSON
- Independence: stopped the API process → API port refused, admin `/health/ready` still 200

**Migrations / indexes:** none. Mongoose `autoIndex` disabled.

**Security checks:** `.env` git-ignored; config errors show key names only; Mongo URI masked in logs; pino redacts
password/token/otp/cookie/authorization; helmet headers; `x-powered-by` off; request IDs validated; servers bind
`127.0.0.1`; health output has no hostnames or secrets.

**Open decisions / blockers**
1. Redis for Day 02 sessions: local Redis (Docker/Memurai) or a hosted Redis URL.

**Next task:** Nov 26 · Part 02 Auth.
