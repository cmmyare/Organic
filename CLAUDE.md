# ORIGIN — instructions for Claude

Read `docs/01-master-spec.md` and `docs/02-daily-plan.md` before coding. Work on exactly one daily task at a time.

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
- Controllers thin; business logic in `shared/services`.

## Layout

- `admin/` — admin server (:3001). `create_admin_app.js` builds the app (testable); `index.js` connects and listens.
- `app/` — customer + provider API (:3002). Same split: `create_api_app.js` / `index.js`.
- `worker/` — background worker (BullMQ from Day 11).
- `shared/` — config, models, services, repositories, validators, constants, utils, integrations.
- `tests/unit`, `tests/integration`, `tests/e2e` — `node:test` + supertest.
- Never import one server's `index.js` from another; share code through `shared/`.

## Commands

- `npm run dev:admin` / `npm run dev:api` / `npm run dev:worker`
- `npm test` · `npm run lint`
