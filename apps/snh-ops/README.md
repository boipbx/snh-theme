# SNH Ops dashboard

An embedded Shopify admin app on Cloudflare Workers + D1. Read-only against Shopify and Klaviyo.
Install and deploy steps: `docs/golive/OPS-APP-INSTALL.md`.

- `src/worker.mjs`: routes, session-token check on every `/api/*` request, cron.
- `src/auth.mjs`: Shopify session token (JWT, HS256) verification.
- `src/sync.mjs`: sync state machine. Incremental by default (only records updated since the last sync), writes a row only if it changed, counts rows written, stops before the daily write budget.
- `src/shopify.mjs`, `src/klaviyo.mjs`: read-only API calls.
- `src/metrics.mjs`: all the numbers, as pure functions (tested).
- `ui/app.html`: the page (App Bridge, Chart.js and SheetJS from CDNs). `node build-ui.mjs` turns it into `src/ui.mjs`; a test fails if they differ.
- `schema.sql`: D1 tables, every one keyed by shop domain.
- `config/example-store.json`: per-store settings, stored in D1 (`shops.config`).
- `local.mjs`: run the same code on Node with SQLite, no Cloudflare needed.

```bash
node --experimental-sqlite --test test/*.test.mjs
```

```bash
node --experimental-sqlite local.mjs sync
```

```bash
node --experimental-sqlite local.mjs serve
```

Definitions: a **member** is a customer with an ENABLED account. Every other customer is a **customer record**.

Sync kinds: `Refresh now` and the nightly run are incremental. `Full resync` (`local.mjs sync full`) re-reads everything but still writes only changed rows.
