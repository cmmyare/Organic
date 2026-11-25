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
| 2026-11-25 | Progressive architecture: no empty folders, placeholders or abstractions before a task needs them. Spec §03 layout is the target, built day by day. Worker, seeds, migrations, OpenAPI/Postman, PM2 file and `QUEUE_REDIS_URL` deferred to the days that use them. | Founder | Simple, maintainable codebase | whole repo, CLAUDE.md |
