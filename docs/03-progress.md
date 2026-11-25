# Progress

Status values: NOT STARTED · IN PROGRESS · BLOCKED · DONE (DONE requires acceptance evidence).

| Date | Task | Status | Commit / tests | Blockers / next step |
|---|---|---|---|---|
| 2026-11-25 | 01 Foundation | IN PROGRESS (code done; live DB check blocked) | 29/29 tests pass, lint clean | Atlas login fails (`bad auth`): update password in `.env`, then rerun `npm run dev:admin` / `dev:api` and confirm `/health/ready` = 200. Redis URL needed for Day 02. |

---

## 2026-11-25 · Part 01 Foundation · IN PROGRESS

**Scope:** repo init (ESM), env validation, folder layout, admin :3001 and API :3002 as independent processes,
Mongo/Redis connectors, health endpoints, Bootstrap layout.

**Changed files**
- `package.json`, `package-lock.json` — ESM, pinned deps, scripts `dev:*`, `start:*`, `test`, `lint`, `seed` (placeholder)
- `.env.example`, `.gitignore`, `eslint.config.js`, `ecosystem.config.cjs`, `README.md`, `CLAUDE.md`
- `shared/config/env.js` — zod validation, fails fast; Redis required in staging/production only
- `shared/config/logger.js` — pino with redaction; `mask_connection_uri`
- `shared/config/mongo_connection.js`, `shared/config/redis_connection.js` — connectors + readiness checks
- `shared/utils/health_router.js`, `request_id.js`, `run_server.js` (graceful shutdown)
- `shared/constants/brand.js` — brand tokens
- `admin/` — `create_admin_app.js`, `index.js`, `routes/page_routes.js`, EJS partials/pages, `public/css/origin.css`, `public/js/admin.js`, `public/images/logo.svg`
- `app/` — `create_api_app.js` (JSON envelope, 404/400/413/500), `index.js`, `routes/v1/{customer,provider}`
- `worker/index.js` — boots, connects, idles (queues on Day 11)
- `tests/unit/env.test.js`, `tests/integration/health.test.js`
- `docs/01-master-spec.md`, `docs/02-daily-plan.md`, `docs/03-progress.md`, `docs/04-decision-log.md`

**Routes**
- Admin :3001 — `GET /` → `/dashboard`, `GET /dashboard`, `GET /health/live`, `GET /health/ready`, static `/public/*`, `/vendor/bootstrap/*`, `/vendor/jquery/*`
- API :3002 — `GET /health/live`, `GET /health/ready`, `/api/v1/customer/*`, `/api/v1/provider/*` (empty routers; JSON 404)

**Commands run and results**
- `npm test` → 29 tests, 29 pass, 0 fail
- `npm run lint` → no problems
- Port smoke test with DB check stubbed: 3001 `/health/live` 200, `/health/ready` 503 (mongo not_connected), `/dashboard` 200; 3002 `/health/live` 200, `/health/ready` 503, unknown route 404 JSON envelope
- `npm run start:admin` / `start:api` against Atlas → **fails: `bad auth : authentication failed`** (process exits with code 1 as designed; URL-encoded password also rejected)

**Migrations / indexes:** none. Mongoose `autoIndex` disabled; indexes will be created by `scripts/migrations`.

**Security checks:** `.env` git-ignored; secrets never printed (config errors show key names only; Mongo URI masked in
logs; pino redacts password/token/otp/cookie/authorization); helmet headers; `x-powered-by` off; request IDs
validated; servers bind `127.0.0.1`; health output has no hostnames or secrets.

**Open decisions / blockers**
1. Atlas credentials in `.env` are rejected. Founder to set the new password (and confirm the user has readWrite on `organic`).
2. Redis for Day 02 sessions: local Redis (Docker/Memurai) or a hosted Redis URL.
3. The Atlas password was shared in chat — rotate it.

**Next task:** Nov 26 · Part 02 Auth.
