# Progress

Status values: NOT STARTED · IN PROGRESS · BLOCKED · DONE (DONE requires acceptance evidence).

| Date | Task | Status | Commit / tests | Blockers / next step |
|---|---|---|---|---|
| 2026-11-25 | 01 Foundation | DONE | 6db1399 + simplification; 29/29 tests, lint clean, live Atlas `organic` ready on both servers | Redis URL needed for Day 02 sessions |

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
