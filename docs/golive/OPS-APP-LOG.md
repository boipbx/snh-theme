# SNH Ops dashboard: decisions and test log (15 Nov 2026)

## Decisions
- **Repo:** `apps/snh-ops/` in the theme repo. Shopify's theme sync ignores folders outside the theme structure (the repo already has `docs/`, `scripts/` and `prototype/`). Checked after the push: the live theme was unchanged.
- **Deployed 16 Nov:** https://snh-ops.raspy-wind-fe2d.workers.dev (D1 database `snh-ops`, three secrets set, crons on).
- **UI:** one page, App Bridge for session tokens, Polaris web components for the shell, plain HTML tables and SVG charts inside. No build step, no dependencies.
- **Auth:** every `/api/*` call must carry a Shopify session token. It is verified for signature, expiry, app (audience) and a `*.myshopify.com` shop. The only open URLs are the empty page shell and `/health`.
- **Admin API token:** client-credentials grant per shop, as the other SNH Ops scripts use.
- **Bulk export:** `bulkOperationRunQuery` is technically a mutation, but it only starts a data export; nothing in the store changes. It is the only mutation the app sends.
- **Sync in small steps:** export → load in slices (byte ranges of the export file) → calculate. Each step fits Cloudflare's per-request limits; a 2-minute cron and the "Refresh now" poll move it forward.
- **Multi-store ready:** every table is keyed by shop; tiers, rates, point value, code prefixes, bundle type and service URLs come from `shops.config`, not code.
- **Privacy:** customer names are cached; emails, phones and addresses are not. Screenshots with member names were not committed.

## Definitions used
- **Elite member:** a customer with a loyalty tier or a points value. Today that is every customer, because the 9 Nov backfill gave everyone at least Bronze.
- **Revenue:** orders that are not cancelled, voided or fully refunded.
- **Bundle sale:** Shopify stores a bundle sale as its component lines grouped under the bundle. The app sums those lines for every product of type "Bundle". My first version looked for lines whose own product type was "Bundle" and found 0; fixed and tested.
- **Points issued (30 days):** an estimate from the rules (tier rate × paid order subtotal + welcome points). Shopify has no points ledger.
- **Points redeemed:** reward codes (prefix `ELITE-`) used on orders × 2,500.
- **Paid orders missing `points_awarded`:** shown, but nothing in the store writes that tag today, so expect it to equal all paid orders.

## Tests
- **Unit tests:** 16 pass (`node --test apps/snh-ops/test/*.test.mjs`): tier counts, new members, points value, next-tier list, redeemable list, data health, revenue split, points flow, bundle revenue (direct and grouped), promo usage, pickup, time zone, session-token checks.
- **Full local sync against the live store:** 20,155 customers, 17,086 orders, 30,372 order lines. About 4 minutes.
- **Pages:** all 5 render at 375 px and 1200 px with no sideways scroll. The one console message is App Bridge noting it isn't inside admin.

## Cross-checks against Shopify
Admin itself isn't reachable from here, so each number was checked against a separate, direct Admin API query (not the bulk export the dashboard uses).

| Number | Dashboard | Shopify | Difference |
|---|---|---|---|
| Total customers | 20,155 | 20,155 (exact count) | 0 |
| Gold members | 22 | 22 (customer segment `loyalty_tier = 'Gold'`) | 0 |
| Bundle revenue, 30 days | Rs 1,087,818 (80 orders, 82 bundles) | Rs 1,087,818 (80 orders, 82 bundles) | 0 |

Other figures at the time of the test: Silver 78, Bronze 20,055; 18,274,568 points outstanding; 54 bundle products; 12-month bundle revenue Rs 2,128,151.

## Deploy, 16 Nov 2026
- **Cloudflare variables:** both were saved with angle brackets around the value (`<…>`). I stripped them at run time; fix them in the environment settings so the next session doesn't trip on it.
- **Created:** D1 database `snh-ops` (tables + SNH settings), Worker `snh-ops`, secrets SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET and KLAVIYO_KEY. Click & collect and SMS were not deployed.
- **Checks:** `/health` returns `ok`; `/api/*` without a session token returns 401; the page sets `frame-ancestors` for the shop and admin.shopify.com.
- **Two bugs found on the first production sync, both fixed and now covered by tests (23 pass):**
  - The status response mis-read its own counts and returned an error while loading.
  - Bundle-product inserts bound more than D1's 100 values per statement.
- **First sync:** 20,158 customers, 17,100 orders, 30,388 lines; Bronze 20,058, Silver 78, Gold 22; 30-day bundle revenue Rs 1,087,818 (80 orders, 82 bundles, 54 bundle products).
- **Not yet seen inside Shopify admin:** that needs Part B of the install guide. The embedded page was tested locally and its API on production with a signed test token.

## Not done
- **Service logs:** the Operations page checks a health URL for click & collect and SMS. Neither is deployed, so both show "not deployed".
- **React Polaris:** not used; web components keep it to one small file.
