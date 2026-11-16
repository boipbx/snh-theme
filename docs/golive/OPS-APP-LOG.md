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

## 16 Nov 2026: v2 (definitions, redesign, exports, write budget)

Deployed 16 Nov 04:41 UTC (10:11 Colombo); redeployed shortly after with database reads batched (the free plan allows 50 database calls per Worker run). Tests: 36 pass (`node --experimental-sqlite --test test/*.test.mjs`).

**Decisions (made without asking, as instructed)**
- **Member = customer with an ENABLED account.** Everything else is a "customer record". Points are shown for members and for all records. Anything worked out from rules, not read from Shopify, carries an "Estimate" label (points issued, member growth).
- **Sync writes only what changed.** Each row from Shopify is compared with the stored row; equal rows are skipped. This does the job of a stored hash without an extra column or an extra write.
- **Incremental by default.** "Refresh now" and the nightly run ask Shopify only for customers and orders updated since the last successful sync (cursor = that sync's start time, minus 5 minutes of overlap). "Full resync" re-reads everything and still writes only changed rows.
- **Write budget 80,000 rows a day** (`dailyWriteBudget` in the store config; 0 turns it off on a paid plan). A sync that would pass it is skipped or stopped before the batch is written, with a message. Nothing is half-written. No retry loop: one catch-up try in the first 10 minutes after 00:00 UTC, only for a store that has never finished a v2 sync.
- **All three secondary indexes dropped** (`customers_tier`, `orders_created`, `lines_order`): no query used them and each cost one extra row write per row.
- **"Admin only" for Full resync:** the session token carries the staff user ID but not their role. If the store config lists `admins` (user IDs), only they see and can run it. The list is empty for now, so every staff member who can open the app can run it, after a confirmation. Your user ID is shown at the bottom of the Operations tab; send it to lock this down.
- **Promotions tab removed.** SUN15 usage per Sunday is the "Campaigns" card on Overview.
- **Klaviyo:** numbers are saved during each sync (D1 only at page load). Default view = live flows whose name starts "SNH ·"; a toggle shows drafts and old flows. Revenue per flow is included (Klaviyo's own attribution of Shopify "Placed Order").
- **Charts:** Chart.js 4.4.1 from cdnjs. Excel export: SheetJS 0.18.5 from cdnjs, loaded on first use. Series colours were checked for colour-blind separation in light and dark.
- **Store-specific values** (brand name, logo URL, "New" tag, flow prefix) are config, not code: `SHOP_CONFIG` in `wrangler.toml` (deploy-time defaults) and `shops.config` in D1 (wins).
- **Screenshots carry no customer names** (replaced with "Customer 1…" before saving).

**State at deploy**
- D1 had already passed the free daily write limit (three full syncs earlier today), so nothing could be written, not even the schema change. The new version runs on the existing cache: all revenue, bundle and record numbers work; member numbers show "–" with a notice until account states are synced.
- The first v2 sync starts by itself in the first minutes after 00:00 UTC on 17 Nov (05:30 Colombo). Expected writes for that first load: about 20,300 rows (the account state of every customer). Measured on a local copy of the same data.
- **Typical incremental sync: 8 rows written when nothing changed** (measured). On a normal day expect a few hundred (changed customers and orders, about 3 rows per new order).

**Cross-checks against Shopify (16 Nov, on the same code with a local sync)**

| Number | Dashboard | Shopify |
|---|---|---|
| Members (ENABLED accounts) | 1,578 | 1,578 |
| Gold, members | 5 | 5 |
| Gold, all records | 22 | 22 |
| Customer records | 20,160 | 20,160 |
| Bundle revenue, 18 Oct to 16 Nov (30 days) | Rs 1,035,320, 78 orders, 80 bundles | Rs 1,035,320, 78 orders, 80 bundles |

The earlier figure of Rs 1,087,818 covered 31 calendar days (it included 17 Oct, Rs 52,498, 2 orders).

**Screenshots** (`docs/golive/ops-app/v2/`)
- Full data, every tab, 1440 and 390, light and dark: `overview-1440.png`, `loyalty-1440.png`, `bundles-1440.png`, `operations-1440.png`, the `-390` versions and the `-dark` versions.
- Production right after deploy (member numbers pending the first sync): `prod-interim/`.
- Time to data on screen: 0.3 to 0.5 s locally; 0.5 to 2.1 s from production through a proxy. The skeleton paints at once.

## 16 Nov 2026: first production sync, redeem service, welcome points

- **First v2 sync in production:** 20,274 rows written (first load of account states). Members 1,579; tiers for members Bronze 1,564 / Silver 10 / Gold 5; all records 20,062 / 78 / 22. Screenshot: `ops-app/v2/prod/overview-1440.png`.
- **Paid plan:** `dailyWriteBudget` raised to 2,000,000.
- **Redeem service + welcome points** added (`src/redeem.mjs`), both in QA mode. Details, test results and go-live steps: `REDEEM-GO-LIVE.md`. Latest deploy 16 Nov 09:30 UTC.

**Decisions**
- Modes are Worker variables `REDEEM_MODE` and `WELCOME_MODE` (`off`, `qa`, `live`); anything else counts as off. QA customer IDs are store config.
- No enabled account → status `no_account` (kept apart from `not_enough_points`); the tag is removed either way.
- One open reward at a time: a member holding an unused active code is not issued another. That code is added to My rewards if missing.
- The code applies to all products, bundles included: neither the theme nor a policy page excludes bundles from rewards.
- Rolling back a code uses "deactivate" on the code the service just created; it never deletes and never touches other discounts.
- Welcome in live mode looks at customers updated in the last few minutes; one with a balance already is only tagged `welcome_awarded`, never changed.
- The Redeem form is behind Shopify's captcha, so the automated test added the tag directly.
