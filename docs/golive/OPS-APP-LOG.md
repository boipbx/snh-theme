# SNH Ops dashboard: decisions and test log (15 Nov 2026)

## Decisions
- **Repo:** `apps/snh-ops/` in the theme repo. Shopify's theme sync ignores folders outside the theme structure (the repo already has `docs/`, `scripts/` and `prototype/`). Checked after the push: the live theme was unchanged.
- **Not deployed:** the Cloudflare token and account ID were not in the environment. Everything else is done; deploy steps are in `OPS-APP-INSTALL.md`.
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

## Not done
- **Deploy to Cloudflare** and the first production sync.
- **Service logs:** the Operations page checks a health URL for click & collect and SMS. Neither is deployed, so both show "not deployed".
- **React Polaris:** not used; web components keep it to one small file.
