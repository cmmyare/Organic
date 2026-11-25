# ORIGIN — Master Specification (v1.0, 25 Nov 2026)

Markdown copy of *ORIGIN Development Master Plan* (PDF). The PDF is the source document;
if they differ, ask the founder. Target: functional MVP by 31 Dec 2026.

## Implementation contract

Read this file and `docs/02-daily-plan.md` before coding. Work on exactly one daily task at a time.
Inspect existing code and tests first; propose the smallest change; implement, test, and update
`docs/03-progress.md`. Never claim tests passed without running them. Do not introduce a new framework or
change agreed business rules without approval. Stop on unresolved financial, authentication or inventory
decisions; use explicitly labelled sandbox adapters, never fake successful production payments.

## Non-negotiables

- Node.js / Express, JavaScript ES modules, MongoDB Atlas / Mongoose, EJS / Bootstrap 5 / jQuery AJAX.
- Single repository, two Express processes and one background worker. Admin `:3001`; customer + provider API `:3002` (configurable).
- Admin type 0 = full business access; type 1 = role menu grants + explicit individual overrides.
- Database-driven sidebar; every route enforces authorization independently. Redis session idle expiry 900 s, secure HTTP-only cookie, CSRF, session revocation on permission change. Never trust client permissions.
- Shared services own stock, prices, orders, payments; controllers are thin. **No floating-point money**: integer cents, integer grams/pieces; convert at boundaries. Mongo transactions for atomic inventory/order changes; durable idempotency keys and unique indexes.
- Single warehouse initially, one selling unit per SKU; batch tracking, quality review, expiry/wastage, FEFO picking. Do not reserve months of stock for recurring schedules.
- Phone OTP for customers; separate driver app, same API host. Somali and English. Never expose secrets, OTPs, tokens or payment credentials in logs.
- OpenAPI and Postman must match implementation. No endpoint complete without authorization, validation, error and success tests. Synthetic fixtures only.
- New filenames and DB fields `snake_case`; JS functions `snake_case`; ESM imports; UTC timestamps, `Africa/Mogadishu` for business schedules. Explicit enums, validation, structured errors, pagination. Small business modules.
- Before each commit: run tests, check diff, document migrations/indexes and open decisions. Never modify unrelated modules, deploy, or run destructive scripts without explicit approval.

## 01. Purpose and scope

ORIGIN sources vegetables and fruits from farmers, receives and stores them, and supplies households, hotels and
restaurants in Mogadishu. Customers shop once or set recurring deliveries. Commercial customers may have negotiated
prices and approved credit. Fish is future scope (separate cold chain). Founder owns admin, API and Figma; a colleague
owns the React Native CLI customer and driver apps after API + Figma handoff.

Stack: Express/ESM; MongoDB Atlas; Redis sessions + BullMQ; EJS/Bootstrap 5/jQuery AJAX; React Native CLI;
S3-compatible media; FCM + in-app notifications; Ubuntu/Nginx/PM2; Swagger/OpenAPI + Postman. English and Somali.
Single warehouse with warehouse IDs for expansion. Mobile money and COD; B2B prepaid and approved credit; zone fees;
current recurring prices with advance notification.

**MVP:** roles/menus, catalog, suppliers, receiving, inventory batches and waste, pricing, customers, zones, orders,
recurring schedules, basic contracts/credit, dispatch, payments and reconciliation, dashboard, mobile endpoints,
minimal two-app flow.
**Deferred:** route optimization, live map tracking, demand ML, multi-warehouse transfers, advanced accounting,
promotions, loyalty, supplier portal, fish. No live payment/OTP provider until credentials and specs exist; sandbox
adapters must be conspicuous.

## 02. Brand and interface system

Name ORIGIN; tagline *Quality begins at the source.*

| Token | Hex | Use |
|---|---|---|
| Forest | `#14532D` | primary; white on Forest for primary actions |
| Leaf | `#65A30D` | secondary accent |
| Harvest | `#F59E0B` | accent (not body text) |
| Cream | `#F8F7F2` | background |
| Charcoal | `#1F2937` | text |
| White | `#FFFFFF` | surface |
| Error | `#B91C1C` | |
| Info | `#1D4ED8` | |

System sans-serif (Inter if available); 14 px admin body, 16 px mobile; 8 px grid; 8 px radius; 44 px min touch target.
Logo: two leaves meeting at a stem above wordmark (provisional). Same tokens in EJS CSS and RN theme. Unit shown beside
price; no color-only statuses; keyboard-friendly forms; visible errors. Strings keyed by locale; USD with two decimals.

## 03. System architecture and repository

Admin browser → HTTPS → Nginx → Express admin :3001 → shared services → MongoDB Atlas / Redis / S3.
Apps → HTTPS → Nginx → Express API :3002 → same services. Worker consumes BullMQ jobs through shared services.
Only Nginx is public; Express binds localhost in production. Separate admin session auth and mobile bearer auth.
Queue Redis separate from session Redis, `noeviction`. No in-memory stock authority.

```
origin/
  CLAUDE.md  package.json  .env.example  ecosystem.config.cjs
  admin/   index.js  routes/ controllers/ middleware/  views/{layouts,partials,pages}/  public/{css,js,images}/
  app/     index.js  routes/v1/{customer,provider}/  controllers/ middleware/ validators/
  shared/  config/ models/ services/ repositories/ validators/ constants/ utils/ integrations/
  worker/index.js
  scripts/{seed,migrations}/
  tests/{unit,integration,e2e}/
  docs/ assets/ openapi/ postman/
```

> Founder decision (2026-11-25): this layout is the target shape. Folders and scripts are created progressively,
> only when a daily task needs them (see `CLAUDE.md`).

Scripts: `dev:admin`, `dev:api`, `dev:worker`, `seed`, `test`, `lint`, `start:admin`, `start:api`, `start:worker`.
Never import another server's entrypoint. Validate config on boot. Env keys: `ADMIN_PORT`, `API_PORT`, `MONGO_URI`,
`SESSION_REDIS_URL`, `QUEUE_REDIS_URL`, `SESSION_SECRET`, JWT keys, S3, FCM, OTP/payment adapter settings,
`APP_TIMEZONE`. Separate dev/staging/prod DBs, Redis prefixes, buckets. Pin versions with lockfile. Middleware:
helmet, express-session/connect-redis, express-rate-limit, a validation library, structured logging.

## 04. Administration, authentication and dynamic menus

Type 0 sees all active menus and may perform all authorized actions (no bypass of invariants or audit). Type 1 sees
only active pages from roles or direct grants.

Collections: `admins`, `roles`, `menus`, `permissions`, `admin_sessions`, `audit_logs`.
- **admins**: `email_normalized` unique, `password_hash`, `type` 0/1, `role_ids`, `url_array`, `additional_url_array`, `denied_menu_ids`, `permission_overrides {key: boolean}`, `is_active`, `auth_version`, `permission_version`, `last_login_at`.
- **roles**: `name` unique, `menu_ids`, `permission_keys`, `status`, `version`.
- **menus**: `key` unique, `title_en`, `title_so`, `parent_menu` nullable, `url` nullable, `icon` (allowlisted), `sort_order`, `status` 0/1; groups vs leaf routes; reject cycles and unsafe URLs.
- **permissions**: `key` unique, `description`, `module`, `status`.

Effective menu = active union of role grants + `url_array` + `additional_url_array` − `denied_menu_ids`. Ancestors
included for navigation; an inactive ancestor hides descendants and blocks access. Effective permissions = active role
grants with individual boolean overrides; default deny. General admin bypasses only these permission checks.
Session stores userid, type, role_ids, session generation, permission_version, menu_array, additional_urls, effective
permission keys. Never accept a URL or ID from a request as authorization. Map route constants → stable menu keys and
operation permission keys; GET and mutations both protected; hidden/AJAX routes inherit a documented module
permission. Type 1 cannot change own grants or elevate. Protect the last active general admin. Bootstrap first admin
by one-time CLI seed with securely supplied secret; no default password.

Login: validate normalized email; rate limit by IP/account; Argon2id or bcrypt; generic invalid-credentials message;
regenerate session ID; load grants; redirect to allowed dashboard. `RedisStore({client, ttl: 900})`; cookie
`maxAge 900000`, `rolling: true`, `resave: false`, `saveUninitialized: false`, `httpOnly`, `secure` in production,
`sameSite: 'lax'`, trust proxy for the real Nginx hop. Test idle expiry. Distinct cookie name. Logout destroys
session and clears cookie; Redis outage fails closed. CSRF on all state changes incl. AJAX and login. Escaped EJS
output; allowlisted redirects/menu paths; no GET mutation; rate-limit privileged endpoints.

Every protected request: verify active admin and current auth/permission version; reject revoked sessions.
Role changes, menu disable and password reset revoke affected sessions. Middleware order:
authenticate → authorize route → authorize action → validate → controller → service → audit. Menu tree from
`res.locals`, never client-supplied. Audit: actor, action, target, timestamp, request ID, sanitized before/after,
outcome; never passwords, tokens, OTP, payment secrets. Append-only.

Pages: Login, Dashboard, Administration / Admins / Roles / Menus / Permission Registry / Audit Logs. Tests:
general/restricted access, direct URL, AJAX, role revocation, disabled account, CSRF, session fixation, idle timeout.
**Gate before business modules.**

## 05. Product catalog, units and pricing

Categories Fruits, Vegetables (Fish inactive). Units PCS, KG, BUNCH, BOX, BAG, PACK; category never implies unit.
One selling unit per product; inventory base unit = grams for KG, integer count otherwise. Product: `name_en`,
`name_so`, `sku` (unique), category, photo, description, `selling_unit_id`, `minimum_qty_base`,
`increment_qty_base`, active, retail/recurring/B2B eligibility, `low_stock_threshold_base`, storage guidance.
Don't change base unit after history without migration. Deactivate, never delete.
Examples (not market prices): mango $0.50/piece step 1; potato $1/kg step 500 g.
Prices: retail/wholesale/contract, `effective_from`, USD, author, reason; history kept. Precedence
contract > approved wholesale > retail; no overlapping active intervals per scope. Server re-quotes; integer cents per
selling unit; KG line = cents × grams / 1000, round once (half-up proposed). Snapshot price, unit, name, qty, fees on
orders; never mutate history.
Pages: Categories, Units, Products, Prices (list/history/change). Image upload with MIME/size validation, S3 object
key (not arbitrary URL). Permissions: `can_create_product`, `can_edit_product`, `can_change_product_price`,
`can_manage_category`, `can_manage_unit`, `can_upload_product_image`.
**Acceptance:** 3 mangoes = $1.50; 1.5 kg potatoes = $1.50; reject fractional pieces/invalid increments; inactive hidden.

## 06. Procurement and warehouse

Supplier: name, contact, phone, location, type, farmer status, products, notes. PO: supplier, warehouse, expected
date, lines (product, purchase unit, qty, agreed cost), notes; statuses DRAFT, ORDERED, PARTIALLY_RECEIVED,
RECEIVED, CANCELLED. No stock change on PO creation. Receipt: batch number, actual count/weight, rejected qty +
reason, actual cost, transport allocation, received_at, quality grade, review/use-by date, storage zone.
accepted = received − rejected; never negative; zero accepted is not a stock addition. Partial receipts can't exceed
PO without supervisor override. Receipts immutable; corrections via new transactions.
Batches: product, supplier, warehouse, receipt line, received/accepted/on_hand/reserved, cost basis, dates, status
AVAILABLE/HOLD/EXPIRED/DEPLETED, zone. FEFO by earliest validated expiry; unknown dates need review. Available =
usable on hand − reserved. Reserve at confirmation, release on cancel, deduct on dispatch; never twice. Returns go to
quarantine. Adjustments need reason + permission. Never waste reserved stock without resolving orders.
Ledger types RESERVE, RELEASE, RECEIVE, DISPATCH, WASTE, ADJUST, RETURN_HOLD — unique source reference, delta,
before/after, actor, timestamps.
Pages: Suppliers, Purchase Orders, Receive Stock, Receipts, Inventory Overview, Batches, Stock Adjustments, Wastage,
Warehouse/Zones, Demand Plan. Permissions `can_create_purchase`, `can_receive_stock`, `can_adjust_inventory`,
`can_record_wastage`, `can_view_inventory_cost`.
**Acceptance:** 250 pcs − 10 rejected = 240; concurrent reservations cannot oversell; cancel releases once;
expired/held batches not allocated.

## 07. Customers, delivery zones and contracts

Customers: E.164 phone unique, name, locale, type INDIVIDUAL/BUSINESS, active, optional business profile.
Addresses: label, district, zone_id, text, confirmed lat/lon, contact, default; ownership enforced. Zone: name,
`fee_cents`, active, optional windows/capacity, service area. Server validates serviceability.
Contract: business customer, start/end, status, products, price rules, payment terms, approved credit limit, billing
cycle, delivery instructions; optional schedule link. Contract price overrides retail during validity. Credit needs
explicit approval and exposure check. Invoices per delivery or grouped (billing cycle TBD); no double invoicing.

## 08. Order workflow

Sources ADMIN / CUSTOMER / SCHEDULE. Lines snapshot product, unit, base qty, price, line total, allocated batches.
Header: unique `order_number`, customer, address snapshot, zone fee snapshot, subtotal, total, currency, window,
source, optional occurrence/contract, payment + fulfillment status.
Flow: quote → confirm → validate → reserve (transaction) → CONFIRMED → FEFO pick → pack → assign → dispatch → delivered.
Statuses PENDING, CONFIRMED, PREPARING, READY, ASSIGNED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED, FAILED;
valid transitions only, history recorded. Pre-dispatch cancel releases stock (+ refund); after dispatch use
failed/return flow. Weight deviations need approved revised quote/refund. No automatic substitutes.
Admin lists: All, Today, Pending, Preparing, Dispatch, Completed, Exceptions.

## 09. Recurring schedules and pricing

Schedule is a template, not an order: `schedule_number`, customer, address, items {product_id, qty_base},
recurrence DAILY/WEEKLY/MONTHLY, weekdays or month_day (1–28), window, timezone Africa/Mogadishu, start/end,
`next_occurrence_at` (UTC), status ACTIVE/PAUSED/CANCELLED/COMPLETED, optional contract, version, notice policy.
Edits affect future unconfirmed occurrences only. `schedule_occurrences` unique (schedule_id, occurrence_key);
states PLANNED, NOTIFIED, CONFIRMED, SKIPPED, FAILED, GENERATED. Worker sends price quote before delivery, waits for
explicit confirmation (or approved consent policy), generates order exactly once. No unattended price increases or
charges. Proposed notice 24 h, cutoff 12 h (owner to approve); no response → skip/hold. Don't reserve future stock.
BullMQ deterministic job IDs, retries/backoff, reconciliation; Redis not source of truth; restarts never duplicate.

## 10. Drivers, dispatch and payments

Drivers: unique phone, name, active, vehicle, availability; admin-provisioned; phone OTP (provider audience).
Delivery: order_id, driver_id, status ASSIGNED/ACCEPTED/PICKED_UP/DELIVERED/FAILED, timestamps, proof, failure reason.
Driver sees only own assignments. Admin assigns/reassigns (audited); no auto-routing. Proof via customer
confirmation code (hashed, rate-limited). COD recorded by driver, reconciled by admin.
Payments: order/invoice, method MOBILE_MONEY/COD/CREDIT, `amount_cents`, currency, status
PENDING/PAID/FAILED/REFUND_PENDING/REFUNDED, unique external reference, idempotency key, redacted provider response.
Mobile money adapter: initiate/status/webhook; verify signature, merchant, amount, currency, order; replay protection;
never trust client success. Refunds explicit and audited.
Pages: Drivers, Dispatch Board, Deliveries, Payments, COD Reconciliation, Invoices, Receivables, Expenses; reports
revenue net refunds, COGS (batch basis), waste, delivery expenses, receivables.

## 11. Mobile API contract

Prefixes `/api/v1/customer`, `/api/v1/provider`. JSON, ISO-8601 UTC, string IDs, integer base quantities, cents,
locale en/so.
- Success `{success:true, data, meta}`; error `{success:false, error:{code,message,fields}, request_id}`.
- 400 validation, 401 token, 403 audience/role, 404 inaccessible, 409 conflict, 429 throttled, 503 unavailable.
- Pagination capped at 100; whitelisted filters/sort. Never accept customer_id/driver_id as authorization.
- Access token ~15 min; rotating hashed refresh tokens; separate audiences. OTP: random, hashed, 5 min expiry, 5
  attempts, resend cooldown, phone/IP quotas, generic responses, sandbox only in non-prod; never in responses/logs.
- `Idempotency-Key` on order creation, payment initiation, occurrence confirmation, driver state changes.

**Customer:** `POST /auth/otp/request`, `POST /auth/otp/verify`, `POST /auth/refresh`, `POST /auth/logout`,
`GET|PATCH /profile`, `GET /categories`, `GET /products`, `GET /products/:id`, `GET /zones`,
`GET|POST /addresses`, `PATCH|DELETE /addresses/:id`, `POST /cart/quote`, `POST|GET /orders`, `GET /orders/:id`,
`POST /orders/:id/cancel`, `POST|GET /orders/:id/payment`, `GET|POST /schedules`, `GET|PATCH /schedules/:id`,
`POST /schedules/:id/{pause,resume,cancel}`, `POST /schedules/:id/occurrences/:key/{skip,confirm}`,
`GET /notifications`, `POST /notifications/:id/read`, `PUT /devices/:id`.

**Provider:** `POST /auth/otp/{request,verify}`, `POST /auth/{refresh,logout}`, `GET /profile`,
`PATCH /availability`, `GET /deliveries`, `GET /deliveries/:id`,
`POST /deliveries/:id/{accept,reject,pickup,complete,fail}`, `GET /notifications`,
`POST /notifications/:id/read`, `PUT /devices/:id`.

Webhook `POST /api/v1/webhooks/mobile-money/:provider` (signature + replay protection). Health `/health/live`,
`/health/ready` on each server, no secret output.

**Admin routes:** `/login`, `/logout`, `/dashboard`, `/administration/{admins,roles,menus,permissions,audit}`,
`/products`, `/categories`, `/units`, `/prices`, `/suppliers`, `/purchase-orders`, `/stock-receipts`, `/inventory`,
`/batches`, `/wastage`, `/warehouses`, `/customers`, `/zones`, `/orders`, `/schedules`, `/contracts`, `/drivers`,
`/dispatch`, `/payments`, `/invoices`, `/expenses`, `/reports`. Each: GET list, GET `/new`, POST create, GET `/:id`,
GET `/:id/edit`, PATCH update; state changes `POST /:id/action`.

Quote example: 3 mangoes (50¢) + 1500 g potato (100¢/kg) = subtotal 300, fee 100, total 400 cents.
Quotes stored server-side, tied to principal, expire, revalidated at submission.

## 12. Database inventory and indexes

Every business document: `created_at`, `updated_at`, actor IDs; schema validation; soft-deactivate master data;
immutable stock/payment history; index FKs per real queries; event collections instead of unbounded arrays.

| Collection | Key constraints |
|---|---|
| admins | `email_normalized` unique |
| roles | `name` unique |
| menus | `key` unique |
| permissions | `key` unique |
| audit_logs | index target + date |
| categories / units | `code` unique |
| products | `sku` unique |
| product_prices | overlap guard per scope |
| warehouses / storage_zones | `code` unique |
| purchase_orders, stock_receipts, contracts, order_schedules, orders, invoices | `number` unique |
| inventory_batches | batch number unique; FEFO index |
| inventory_transactions | unique movement source key |
| customers | `phone_normalized` unique |
| customer_addresses | ownership index |
| delivery_zones | `code` unique |
| cart_quotes | TTL on expiry (transient only) |
| schedule_occurrences | unique schedule_id + occurrence_key |
| orders | partial unique on schedule occurrence |
| order_events | order_id |
| drivers | normalized phone unique |
| deliveries | one active delivery per order |
| payments | `provider_ref` unique partial |
| payment_events | unique provider + event_id |
| notifications | unique event key per recipient |
| devices | unique principal + device |
| auth_challenges | TTL; enforce expiry in code |
| refresh_sessions | token hash unique |
| idempotency_records | unique principal + action + key |
| outbox_events | unique event key |

Transactions for multi-document stock/credit/order/payment; no network calls inside transactions; outbox written in
the transaction, delivered by worker. Never auto-expire financial or audit history.

## 13. Figma handoff

Founder creates the Figma file. Pages: Foundations, Components, Customer flows, Provider flows, Prototype, Handoff.
Frame 390×844. Customer nav Home/Shop/Schedules/Orders/Account; Provider nav Today/History/Account.
Screens C01–C18 (splash, phone, OTP, home, shop, product, cart, address, checkout, schedule builder, confirmation,
orders, order detail, schedules, schedule detail, price notice, notifications, account) and P01–P08 (driver login,
today, assignment, pickup, delivery, history, profile, notices). Mobile app never computes authoritative price or stock.

## 14. Testing, operations and deployment

Unit tests: quantity, money, recurrence, state machine, permission resolver. Integration: replica-set Mongo + Redis,
supertest. Critical cases listed in PDF §14 (menu direct URL, deny override, stale session, last admin, CSRF, OTP
replay, cross-tenant access, overselling, duplicate jobs, price consent, FEFO hold, duplicate webhook, partial
payment, cancel release, credit race, COD reconciliation, invalid transitions, upload checks, backup restore).
Seed synthetic data only (mango/potato, farmer, warehouse, zone, admin type 0 + type 1, two customers, two drivers).
Deploy: Ubuntu, firewall, non-root user, Node LTS, PM2 (origin-admin, origin-api, origin-worker), Nginx HTTPS
proxies, Atlas allowlist + least-privilege user, graceful shutdown, structured logs with redaction, monitoring,
Atlas snapshots with tested restore.

## 15. Acceptance gates

- **Gate A** admin foundation: login/logout/idle expiry, type 0/1, dynamic menus, overrides, direct-route checks, audit.
- **Gate B** operations: piece/weight products, batch receiving, FEFO reserve, cancel/release, waste, cost reports.
- **Gate C** orders: one-time + recurring, price notice, contract/credit, dispatch, COD/mobile-money sandbox.
- **Gate D** API/Figma: tested OpenAPI + Postman, mobile auth, critical flows, Figma mapping, handoff.
- **Gate E** MVP: end-to-end journeys, reconciliation, error states, staging deploy, defect triage.

**Open owner decisions:** SMS/OTP and mobile-money providers, merchant credentials/webhook format, domains, driver
verification, zone boundaries/charges, delivery windows/capacity, notice/cutoff times, consent and substitutions,
refund policy, credit terms, wholesale thresholds, unit increments/rounding, shelf-life/storage rules, legal/food
safety, audit retention, app store accounts, colleague availability.

## 16. Feasibility

37 days, Friday rest, 64–96 founder hours — aggressive. Prioritize admin, inventory, orders, minimal recurring and
dispatch. If behind: deliver tested admin/API + Figma + partial mobile; never drop security, stock or payment safeguards.
