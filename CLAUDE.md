# ORIGIN — instructions for Claude

Read `docs/01-master-spec.md` and `docs/02-daily-plan.md` before coding. Work on exactly one daily task at a time.

## Core principle

**Keep the architecture simple. Do not create folders, files, services, utilities or abstractions before they are
required. Develop progressively according to the approved daily work plan.**

- No empty folders, `.gitkeep` files or placeholder modules.
- The repository layout in the master spec (§03) is the target shape, not a checklist to create up front. Add a
  folder (e.g. `shared/models/`, `scripts/seed/`, `worker/`, `openapi/`) on the day a real file needs it.
- No new layer (repository, service, validator, adapter) until a task has real logic for it.
- No npm script that points at a file that doesn't exist.

## Working rules

- Inspect existing code and tests first; propose the smallest change; implement, test, update `docs/03-progress.md`.
- Never claim tests passed without running them (`npm test`, `npm run lint`).
- No new framework, and no change to agreed business rules, without founder approval (record in `docs/04-decision-log.md`).
- Stop and ask on unresolved financial, authentication or inventory decisions. Sandbox adapters must be clearly labelled.
- Never modify unrelated modules, deploy, or run destructive scripts without explicit approval.
- Never commit `.env` or any credential. Never log secrets, OTPs, tokens or payment credentials.

## Stack and conventions

- Node.js ≥ 22, Express 5, JavaScript ES modules (`"type": "module"`), MongoDB Atlas via Mongoose, Redis (ioredis),
  EJS + Bootstrap 5 + jQuery AJAX for admin. Pinned versions (`npm i -E`) with `package-lock.json`.
- New filenames, DB fields and JS functions use `snake_case`.
- Money in integer cents; quantities in integer base units (grams or pieces). Never floats for money.
- UTC timestamps; business schedules in `APP_TIMEZONE` (Africa/Mogadishu).
- API envelope: `{success:true,data,meta}` / `{success:false,error:{code,message,fields},request_id}`.
- Controllers thin; business logic in shared services once there is business logic.

## Current layout

- `admin/` — admin server (:3001). `create_admin_app.js` builds the app (testable); `index.js` connects and listens.
  Pages in `views/pages/` include `views/partials/{head,topbar,sidebar,foot}.ejs`.
- `app/` — customer + provider API (:3002). Same split: `create_api_app.js` / `index.js`.
- `shared/config/` — env validation, logger, Mongo and Redis connections.
- `shared/utils/` — health router, request ID, server start/shutdown. `shared/constants/brand.js` — brand tokens.
- `tests/unit`, `tests/integration` — `node:test` + supertest.
- Never import one server's `index.js` from another; share code through `shared/`.

## Commands

- `npm run dev:admin` / `npm run dev:api`
- `npm test` · `npm run lint`
