# ORIGIN

*Quality begins at the source.*

ORIGIN sources fruits and vegetables from farmers, stores them, and delivers to households, hotels and restaurants in
Mogadishu. This repository holds the admin panel, the customer/driver API, and the background worker.

## Requirements

- Node.js 22 or newer
- A MongoDB Atlas database (dev: `organic`)
- Redis (required from Day 02 for admin sessions; optional today)

## Setup

```powershell
npm install
copy .env.example .env   # then fill in MONGO_URI and SESSION_SECRET
```

Generate a session secret:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## Run

Each process starts independently:

```powershell
npm run dev:admin    # http://127.0.0.1:3001  (dashboard at /dashboard)
npm run dev:api      # http://127.0.0.1:3002
npm run dev:worker
```

Health checks on both servers: `/health/live` (process up) and `/health/ready` (database/Redis reachable, 503 if not).

## Test

```powershell
npm test
npm run lint
```

## Docs

- [docs/01-master-spec.md](docs/01-master-spec.md) — business and software specification
- [docs/02-daily-plan.md](docs/02-daily-plan.md) — day-by-day plan to 31 Dec 2026
- [docs/03-progress.md](docs/03-progress.md) — progress reports
- [docs/04-decision-log.md](docs/04-decision-log.md) — decisions
