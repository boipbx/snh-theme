# SNH v2: go-live checklist (Round 13, updated Round 14)

Theme: **snh-theme/feat/theme-v2** (preview `?preview_theme_id=189832462590`). Everything below the line "Admin tasks"
is for you in Shopify admin; the theme side is done and checked on the preview (see "What was checked").

## Admin tasks before publishing

| # | Task | Where | Why |
|---|---|---|---|
| 1 | **Discount codes for the welcome game**: create the real 5 % / 7 % / 10 % codes (one use per customer), then put them in the popup's prize settings | Discounts → Create · Customize → Overlays → SNH email capture | Real visitors only see prizes that have a code (prizes without one show only in `?popup=` test mode, as TEST-5 / TEST-7 / TEST-10); with no codes set, the game has nothing to award |
| 2 | **Bundle offers**: fill the `snh_bundle` metaobject (or Theme settings → SNH bundle offers 1–12) and create the matching automatic discounts | BUNDLES.md | The cart's bundle mini-card only appears when an offer contains a basket item |
| 3 | **"Cart add-ons" collection** (handle `cart-add-ons`): bars, gels, shakers, sachets ≤ Rs 1,500 | Products → Collections | The recommendation engine works without it, but small baskets get better suggestions with it |
| 4 | **Bestsellers for the cart engine**: pick a collection | Theme settings → SNH cart suggestions → Bestsellers | Feeds the "Popular with members / Bestseller" signal (+10) |
| 5 | **Instagram token** | Customize → Home → Instagram section | The feed shows the follow card until a token is set |
| 6 | **Contact page**: create a page titled *Contact* with template **page.contact** (URL `/pages/contact`) | Online Store → Pages | `/pages/contact` returns 404 today |
| 7 | **SNH Elite page template**: confirm `/pages/snh-elite` uses the *snh-elite* template | Online Store → Pages → SNH Elite | |
| 8 | **Menus** from MENUS.md (main, mobile, footer) | Online Store → Navigation | |
| 9 | **Checkout branding** (colours, logo, fonts, the +94 phone field) | CHECKOUT-PLAN.md · Settings → Checkout → Customize | Checkout isn't part of the theme |
| 10 | **Site campaign metaobject** (only if you want to run offers from Content) | CAMPAIGNS.md §1 | Campaign blocks in Customize work without it |
| 11 | **Blog title**: the News blog is called "series 1" (it shows as the page title) | Online Store → Blog posts → Manage blogs | SEO / tab title |
| 12 | **Reviews widget colours** (Reputon Google reviews): grey #9F9F9F and yellow #FBB000 on #F3F6F9 fail contrast | Reputon app settings | The only accessibility failures left on the home page |
| 13 | **Remove unused apps / duplicate tags**: Nosto, Tagembed, the CloudFront `w.js`, Hextom, the duplicate Klaviyo ScriptTag (`VVMVg5`); check Google tags (4 are loaded) | Apps · Online Store → Preferences | Most of the remaining blocking time (see Lighthouse below) |
| 14 | **Brand colour**: the theme accent is now **#BF4512** (was #E0521C, which gives white text 3.89:1, under AA). If you'd rather keep #E0521C, it can be restricted to large text and decoration; buttons and small text need the darker shade | Theme settings / tell me | Accessibility |
| 15 | **Store plan question** (CHECKOUT-PLAN.md): checkout extensibility beyond branding needs Shopify Plus | | Decides how far the checkout can be customised |
| 16 | Publish: duplicate the live theme as a backup, then publish **snh-theme/feat/theme-v2** | Online Store → Themes | |

## Round 14 additions

| # | Task | Where | Why |
|---|---|---|---|
| 17 | **Default campaigns**: three are live out of the box (announcement "Free delivery", Koko cart banner, guest home banner to SNH Elite). Edit or switch them off | Customize → Campaigns (header group) | No discount codes are used by them |
| 18 | **Subscriptions**: no product has a selling plan, so the quick-buy sheet and PDP show one-time only | Appstle | The subscribe toggle appears by itself once plans exist |
| 20 | **Stalled file sync**: on 31 Oct `assets/snh-campaigns.css` stopped updating on the preview (GitHub sync kept the old version, every other file deployed in seconds). The theme works around it, but if the file still shows `15px/1.5` in Customize → Edit code, re-sync the theme (Themes → … → GitHub → Sync) | Online Store → Themes | Keeps the file in step with the repo |
| 21 | **Broken link in a product description**: Critical Whey 2KG links "protein and recovery range" to `/collections/protein-powder` (404) | Products → Applied Nutrition Critical Whey 2KG → Description | Point it at `/collections/whey-protein` or another live collection |
| 19 | **Cloudflare bot check** on www.sportsnutritionhub.lk challenges automated browsers often; only matters for QA tools, not customers | Cloudflare dashboard (optional) | |

Round 14 results per item: QA-LOG.md. Parity: PARITY.md. Recommendations: RECO.md.

## What was checked on the preview (Round 13)

- Templates at 390 / 768 / 1440 (`prototype/tools/r13-sweep.js`): home, collection, product (multi + single variant),
  cart, search (results / none), blog, article, page, Elite, login, register, 404 — one h1 each, no sideways scroll,
  no broken images, no images without alt, no unlabelled buttons or links, a meta description and canonical on every
  page, title in sentence case with the brand, product structured data once (ProductGroup + BreadcrumbList), Article
  on articles.
- Internal links from the home page incl. every menu and the footer (`r13-links.js`): 125 / 125 return 200.
- axe-core WCAG 2.1 A/AA (`r13-axe.js`): every theme page clean at 390 and 1440 after the fixes; only the Reputon
  widget remains (admin task 12).
- Type / spacing / alignment audit (`r11-audit.js`, ROUND=r13): 0 / 0 / 0 on home, collection, product, cart, search,
  blog; the login page's full-bleed split is the only padding note (by design).
- Console: no theme errors. What remains is from apps or Shopify (Amose Bundle on product pages, Shop's sign-in check
  "Provider's accounts list is empty", Cloudflare's challenge script, 429s from test traffic).

## Lighthouse, Round 14 (mobile + desktop, performance + accessibility; `prototype/tools/r14-lighthouse.sh`)
Median of the runs by LCP. Mobile = Lighthouse default (slow 4G, 4x CPU); desktop = desktop preset. Runs that hit the Cloudflare challenge are dropped.

| form | page | performance | accessibility | LCP | TBT | CLS | runs kept |
|---|---|---|---|---|---|---|---|
| mobile | home | 39 | 100 | 4.9s | 2236ms | 0.000 | 2 |
| mobile | collection | 41 | 100 | 5.5s | 1574ms | 0.000 | 2 |
| mobile | product | 38 | 100 | 4.9s | 1897ms | 0.000 | 2 |
| mobile | cart | 38 | 100 | 6.1s | 1905ms | 0.077 | 2 |
| desktop | home | 79 | 93 | 1.8s | 198ms | 0.010 | 2 |
| desktop | collection | 83 | 99 | 1.5s | 172ms | 0.000 | 2 |
| desktop | product | 86 | 100 | 1.4s | 115ms | 0.005 | 2 |
| desktop | cart | 81 | 100 | 1.9s | 170ms | 0.026 | 2 |

Targets: accessibility ≥ 90 **met everywhere** (93–100; the home 93 is the Reputon reviews widget plus a mid-fade
announcement frame); CLS < 0.1 **met everywhere**; mobile performance ≥ 70 **not met** (38–41, same band as Round 13).
Mobile blocking time is mostly code the theme doesn't load: Shopify's web-pixels manager (`/cdn/wpm`, ~1.4–1.5 s CPU),
Google tags (AW-11220377599, GT-T5MGH95 and others), the Facebook pixel, app extensions (Amose, Appstle, Judge.me,
Reputon). The theme's own scripts are 0.24–0.48 s. Admin task 13 (remove unused apps / duplicate tags) is the lever.

## Lighthouse mobile, Round 13 (slow 4G, 4× CPU, median of 3; `prototype/tools/r13-lighthouse.sh`)

| page | before score | after score | LCP before → after | blocking time before → after | weight before → after |
|---|---|---|---|---|---|
| home | 42 | 41 | 4.8s → 5.1s | 1,848 → 2,246 ms | 6.81 → 3.42 MB |
| collection | 42 | 42 | 5.2s → 5.6s | 1,621 → 1,438 ms | 4.10 → 4.07 MB |
| product | 40 | 37 | 5.0s → 5.5s | 1,866 → 2,250 ms | 3.73 → 3.95 MB |

"Before" = the preview at the start of the Round 13 sweep (items 1–5 already deployed); "after" = the end. The theme
change that moved anything is the SiS video (3 MB) no longer downloading during load: home halves in weight. Scores
and LCP sit within run-to-run noise. Blocking time is dominated by code the theme doesn't control: Shopify's web
pixels loader (~2.3–3.4 s CPU), Google tags (×4), the Facebook pixel, Reputon, Appstle (admin task 13).

## Known limitations

- Header on collection pages: the reported disappearing header did not reproduce in Chromium at any width; the
  header now falls back to `position: fixed` if sticky ever fails (Safari quirks), and the filter bar pins to the live
  header height. Please re-check on your iPhone / Safari.
- SiS collection uses a template without the filter bar (no filters on that page).
- Artwork collection banners (with their own lettering) show the title under the image; photo heroes overlay it.
- The cart engine's category collections are fetched in the shopper's browser (cached 10 min per visit); a store
  under heavy load may rate-limit bursts, in which case the drawer falls back to Shopify's recommendations.
- TikTok videos are manual (6 seeded). An installed TikTok feed app can replace them via the section's app block.
- Points shown on cards and in the cart use the rates in Theme settings → SNH Elite; confirm them before launch.
