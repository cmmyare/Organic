# ORIGIN — Daily Work Plan (25 Nov – 31 Dec 2026)

Founder 2–3 h/night, six days/week, Friday rest. Each night: 10 min review · 15 min task brief · 75–120 min
implementation · 20–30 min tests/fixes · 10 min progress + commit. One branch per part; no production secrets.
Each task ends with an acceptance test and documented blockers. Estimates, not promises.

| Date | Part / Owner | Task |
|---|---|---|
| Nov 25 Wed | 01 Foundation / Founder | Init repo ESM, env validation, folder layout, admin :3001 and API :3002, Mongo/Redis connectors, health, Bootstrap layout. Run both ports independently. |
| Nov 26 Thu | 02 Auth / Founder | Admin model, seed type 0, login/logout, password hash, Redis session 900 s rolling, CSRF, auth middleware. Test fixation and idle expiry. |
| Nov 27 Fri | Rest | Optional review only. |
| Nov 28 Sat | 03 RBAC / Founder | Roles, permission registry, menu schemas + seed; role/admin grant resolver and deny overrides; route guard. Test restricted direct URL. |
| Nov 29 Sun | 03 Admin pages / Founder | Admin, role, menu list/forms; dynamic sidebar tree; role assignment; feature permissions; revoke sessions on change; audit before/after. **Gate A.** |
| Nov 30 Mon | 04 Master data / Founder | Categories, units, warehouse/storage zones CRUD; validation, deactivate; seed Fruits/Vegetables/PCS/KG. |
| Dec 01 Tue | 05 Products / Founder | Product list/create/edit, selling unit min/step, photo adapter, bilingual name, availability flags; test mango vs potato. |
| Dec 02 Wed | 06 Pricing / Founder | Price history, retail/wholesale/contract precedence, integer-cents quote calc; test snapshots and fractional quantities. |
| Dec 03 Thu | 07 Suppliers / Founder | Farmer/supplier CRUD, PO lines and statuses, purchase history; no stock before receipt. |
| Dec 04 Fri | Rest | |
| Dec 05 Sat | 08 Receiving / Founder | Receipt form (actual count/weight, rejected units, batch cost, quality review); atomic receipt + ledger. |
| Dec 06 Sun | 08 Inventory / Founder | Overview, batches, FEFO reserve/release, adjustments/waste, transaction history. Test oversell race and hold. **Gate B.** |
| Dec 07 Mon | 09 Customers / Founder | Individual/business records, addresses with pin, zones and fees, serviceability; ownership and validation. |
| Dec 08 Tue | 10 Orders / Founder | Admin manual order, server quote, line snapshots, transactional reserve; list and details. |
| Dec 09 Wed | 10 Fulfillment / Founder | Confirm/prepare/ready/cancel state machine, picking list, release/dispatch rules, exception timeline. |
| Dec 10 Thu | 11 Schedules / Founder | Recurrence model, daily/weekly/monthly calculator, CRUD, pause/skip/cancel, upcoming list, timezone tests. |
| Dec 11 Fri | Rest | |
| Dec 12 Sat | 11 Worker / Founder | BullMQ worker, durable occurrences, price notice/confirm, idempotent order generation, retry/reconciliation, demand planning. Test duplicate job. |
| Dec 13 Sun | 12 B2B / Founder | Contract forms, agreed price, credit limits, prepaid/credit rules, basic invoices; test expired contract and credit race. |
| Dec 14 Mon | 13 Delivery / Founder | Driver CRUD, assignment board, pickup/delivery/failed states, proof/COD recording, ownership checks. |
| Dec 15 Tue | 14 Payments / Founder | COD reconciliation, mobile-money sandbox adapter, webhook verification, idempotency, refund states. Live provider blocked until details. |
| Dec 16 Wed | 15 Finance / Founder | Expenses, invoice/payment views, receivables, basic sales/COGS/waste reports, dashboard counts. |
| Dec 17 Thu | 16 Admin QA / Founder | Full admin workflow, permissions, audit, concurrency, payment and recurring checks; fix critical bugs. **Gate C.** |
| Dec 18 Fri | Rest | |
| Dec 19 Sat | 17 App API / Founder | Customer/provider OTP adapter, token/refresh/logout, profile, audience guards, rate limits, device tokens. |
| Dec 20 Sun | 17 Customer API / Founder | Catalog, categories, product detail, addresses/zones, cart quote, create/list/detail/cancel order. |
| Dec 21 Mon | 17 Schedules API / Founder | Schedule routes, confirm/skip, payment status, notifications, FCM adapter; customer isolation and retries. |
| Dec 22 Tue | 18 Provider API / Founder | Driver availability, own assignments, accept/reject/pickup/complete/fail, notices; integration tests; OpenAPI/Postman draft. |
| Dec 23 Wed | 19 API + Figma / Founder | Freeze API v1, validate OpenAPI/Postman; finish core Figma flows; export assets and test accounts. **Gate D** only if complete. |
| Dec 24 Thu | 20 Mobile / Colleague | RN CLI two apps setup, navigation, theme/i18n, secure tokens, login. Founder fixes API defects only. |
| Dec 25 Fri | Rest | Colleague schedule by agreement. |
| Dec 26 Sat | 20 Mobile / Colleague | Customer home/shop/detail/cart/address, unit stepper, backend quote. Founder staging prep. |
| Dec 27 Sun | 20 Mobile / Colleague | Checkout once/recurring, orders list/detail, payment state, error states. Founder integration tests. |
| Dec 28 Mon | 20 Mobile / Colleague | Schedules list/detail/edit/pause/skip/confirm, notifications/account. Founder worker regression. |
| Dec 29 Tue | 21 Driver / Colleague | Driver today, accept/reject, pickup/delivery/fail, COD/proof, history, language. Founder E2E tests. |
| Dec 30 Wed | 22 Integration / Both | Staging two domains + PM2 worker, smoke tests, authorization, duplicate orders, backup restore, device testing. |
| Dec 31 Thu | 22 MVP signoff / Both | Critical fixes, release tag, demo, handoff guide, backlog, go/no-go. **Gate E.** |

## Milestones

- **Nov 29** secure admin framework, dynamic roles and menus.
- **Dec 06** catalog and stock lifecycle complete.
- **Dec 17** administrative end-to-end MVP complete.
- **Dec 23** API + Figma handoff (high risk; slips rather than claiming completion).
- **Dec 31** staging MVP. If delayed, defer advanced reports, credit automation, nonessential screens, live adapters.

## Daily Claude command

> Read CLAUDE.md and the master specification. Implement only <date> Part <NN>. First inspect the current repo,
> confirm dependencies and tests, then implement <scope>. Test <acceptance cases>. Update progress with actual test
> output and blockers. Do not build tomorrow's pages or change agreed architecture.
