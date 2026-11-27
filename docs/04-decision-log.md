# Decision log

Record date, decision, owner, reason and affected modules. Never silently change confirmed architecture or
unresolved business rules.

| Date | Decision | Owner | Reason | Modules |
|---|---|---|---|---|
| 2026-11-25 | Dev database is the Atlas `organic` database (cluster0). Staging/prod get separate databases later. | Founder | Requested by founder | shared/config |
| 2026-11-25 | Redis URLs optional in `development`/`test`, required in `staging`/`production`. | Claude (proposed) | No local Redis yet; sessions start Day 02 | shared/config/env.js |
| 2026-11-25 | Test runner: built-in `node:test` + supertest (no Jest/Mocha). | Claude (proposed) | Avoids an extra framework; spec names supertest | tests/ |
| 2026-11-25 | Env validation with zod; logging with pino (+ redaction). | Claude (proposed) | Spec asks for a validation library and structured logging | shared/config |
| 2026-11-25 | Bootstrap and jQuery served from pinned npm packages under `/vendor`, no CDN. | Claude (proposed) | Pinned versions, works offline, simpler CSP | admin |
| 2026-11-25 | Mongoose `autoIndex: false`; indexes created deliberately when models arrive (migration scripts only once needed). | Claude (proposed) | Spec: document migrations/indexes deliberately | shared/config/mongo_connection.js |
| 2026-11-27 | Admin types confirmed: 0 = general admin (all active menus), 1 = only menus in `url_array` (menu ObjectIds). | Founder | Matches master spec §04 | admin auth |
| 2026-11-27 | Admin code style: single `routes/admin.js` + `controllers/admin_controller.js`, GET render / POST per page, no extra helpers. | Founder | Simple, readable admin | admin |
| 2026-11-27 | Menu fields follow the founder's Add Menu form: `title`, `status`, `is_setting`, `is_hidden` (additional menu), `type` parent/child, `parent_menu`, `url` (must start with `/`), `icon`, `sort_order`. Spec's `key`/`title_so` deferred to Day 03. | Founder / Claude | Form already in use | shared/models/menu.js |
| 2026-11-27 | Password hashing: bcryptjs, cost 12 (spec allows bcrypt). Pure JS, no native build on Windows. | Claude (proposed) | Spec §04 | admin auth, seed |
| 2026-11-27 | Redis client changed from ioredis to `redis` (node-redis): `connect-redis` v11 only supports node-redis (with ioredis the session TTL is not set). ioredis may return with BullMQ on Day 11. | Claude | Correct 900 s session expiry | shared/config/redis_connection.js |
| 2026-11-27 | CSRF: synchronizer token stored in the session, checked on every POST/PUT/PATCH/DELETE (form `_csrf` or `X-CSRF-Token`). No extra package (`csurf` is deprecated). | Claude (proposed) | Spec §04 | admin/middleware/auth.js |
| 2026-11-27 | Grants and active status are re-read from Mongo on every admin request (2 lean queries) instead of cached in the session; `auth_version` bump revokes sessions. | Claude (proposed) | Spec: verify against authoritative data, no stale grants | admin/middleware/auth.js |
| 2026-11-27 | DB tests run against `organic_test` (or `TEST_MONGO_URI`) and clear only its admins/menus. | Claude (proposed) | Real Mongo behaviour without touching dev data | tests |
| 2026-11-25 | Progressive architecture: no empty folders, placeholders or abstractions before a task needs them. Spec §03 layout is the target, built day by day. Worker, seeds, migrations, OpenAPI/Postman, PM2 file and `QUEUE_REDIS_URL` deferred to the days that use them. | Founder | Simple, maintainable codebase | whole repo, CLAUDE.md |
