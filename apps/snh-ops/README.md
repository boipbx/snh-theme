# SNH Ops dashboard

An embedded Shopify admin app on Cloudflare Workers + D1. Read-only against Shopify and Klaviyo.
Install and deploy steps: `docs/golive/OPS-APP-INSTALL.md`.

- `src/worker.mjs`: routes, session-token check on every `/api/*` request, cron.
- `src/auth.mjs`: Shopify session token (JWT, HS256) verification.
- `src/sync.mjs`: sync state machine: bulk export of customers and 12 months of orders → D1 → metric snapshots.
- `src/shopify.mjs`, `src/klaviyo.mjs`: read-only API calls.
- `src/metrics.mjs`: all the numbers, as pure functions (tested).
- `src/ui.mjs`: the page (App Bridge + Polaris web components from Shopify's CDN).
- `schema.sql`: D1 tables, every one keyed by shop domain.
- `config/example-store.json`: per-store settings, stored in D1 (`shops.config`).
- `local.mjs`: run the same code on Node with SQLite, no Cloudflare needed.

```bash
node --test test/*.test.mjs
```

```bash
node --experimental-sqlite local.mjs sync
```

```bash
node --experimental-sqlite local.mjs serve
```
