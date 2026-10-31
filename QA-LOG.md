# QA log (Round 14)

Target theme 189832462590 (snh-theme/feat/theme-v2); every check asserts `Shopify.theme.id` first.
Baseline: commit `757e351` (tag `round14-baseline` exists locally; the GitHub proxy refuses tag pushes with 403).

| item | status | proof (prototype/shots/r14/…) | notes |
|---|---|---|---|
| P0.1 add to cart | DONE | p0-1/collection-single-drawer, collection-multi-sheet, sheet-soldout, home-card-add, search-card-add, pdp-atc-drawer, pdp-sticky-drawer, bundle-added, drawer-after-remove, cart-page, checkout-loaded (-390/-1440); p0-1/atc.md | Cause: multi-variant "+" opened Impact's quick-buy drawer, which crashes on our product template (`reading 'content'`), so nothing opened / users went to the PDP. New `assets/snh-quick.js` sheet (pills, struck sold-out combos, qty, subscribe when plans exist, Add → drawer). All 14 steps PASS at 390 + 1440 (real cart in the test browser; stopped at checkout page load). Subscriptions: no product has selling plans (N/A). Console errors left: Amose Bundle app. |
