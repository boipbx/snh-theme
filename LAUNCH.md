# SNH v2: go-live checklist (Round 13)

Theme: **snh-theme/feat/theme-v2** (preview `?preview_theme_id=189832462590`). Everything below the line "Admin tasks"
is for you in Shopify admin; the theme side is done and checked on the preview (see "What was checked").

## Admin tasks before publishing

| # | Task | Where | Why |
|---|---|---|---|
| 1 | **Discount codes for the welcome game**: create the real 5 % / 7 % / 10 % codes (one use per customer), then put them in the popup's prize settings | Discounts → Create · Customize → Overlays → SNH email capture | The game still hands out the placeholders TEST-5 / TEST-7 / TEST-10 |
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

## Lighthouse mobile (slow 4G, 4× CPU, median of 3; `prototype/tools/r13-lighthouse.sh`)

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
