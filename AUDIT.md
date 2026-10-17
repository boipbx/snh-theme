# SNH Theme Audit — 17 Oct 2026

Theme: Impact 6.4.1 (heavily customised) · Repo snapshot `f206ce8` · Live header `sections/ss-header-4.liquid`

No theme files were changed during this audit. Everything below is diagnosis + proposed fix.

---

## How this audit was done (read first)

1. **The dev server cannot render any page.** `http://127.0.0.1:9292` returns HTTP 500 "Failed to Upload Theme Files" on every route because 9 template files fail Shopify validation (see **C-1**). Until those are fixed, nothing can be previewed or pushed from this repo.
2. Because of that, screenshots were produced by **rendering the live storefront's public HTML offline**: each page's HTML was fetched once (plain GET), then rendered in Playwright/Chromium with every theme asset served from **this repo's `assets/` folder**. All POSTs, all fetch/XHR calls and all third-party app scripts were blocked. The repo is a snapshot of the live theme, so the layout is the same as live.
   - Side effects you'll see in screenshots, which are **not real bugs**: Instagram/TikTok feeds show skeletons, "More for you" (related products) is empty, Judge.me stars show as boxes, and the cart drawer has no recommendations.
3. **Cart screenshots:** adding to the live cart was (correctly) blocked, so the filled cart drawer and header basket were rendered with a **locally mocked `/cart.js`** built from the two real products (Critical Whey ×1, SiS Hydro ×2). No request ever reached the store. The **`/cart` page with items could not be rendered** (it's server-rendered), so it's audited from code only, plus the empty state.
4. Screenshots: `audit-screenshots/` — `<page>-<mobile|tablet|desktop>-<fold|full>.png`, plus `cart-drawer-filled-*`, `header-mini-basket-filled-*`, `coll-whey-protein-mobile-scrolled-sticky.png`. Measured overflow and drawer geometry are in `audit-screenshots/_measurements.json`.

---

## Summary

| Priority | Count | Theme |
|---|---|---|
| Critical | 6 | Filters missing/hidden, cart drawer clipped on mobile, three competing cart UIs, cart "empty" on error, product JS crash, deploy blocked |
| High | 8 | Horizontal page scroll, 400–600 KB duplicated CSS on collections, broken stock sections, sidebar filters invisible, Koko router side-effects |
| Medium | 12 | Page weight, header height vars, sticky filter bar eats 25% of phone, flavour pills, layout shift, fonts |
| Low | 11 | Cosmetic + description hygiene |
| Cleanup | ~45 files | Duplicate templates, dead sections/snippets/blocks |

**The three root causes behind most of what looks "broken":**

1. **Custom code hides or overrides stock Impact instead of replacing it cleanly.** Examples: `facets-vertical.liquid` hides all native filters with `display:none !important`; `cart-drawer.liquid` forces geometry onto Impact's drawer with 40 `!important` rules; `main-product.liquid` has 518 `!important`s; `main-cart.liquid` has 363.
2. **Stock sections were overwritten in place.** The custom Shop-by-Goal accordion was pasted into `collection-list.liquid` *and* `multi-column.liquid` (and also exists as `shopbygoal.liquid`). `text-with-icons` and the customer login/register sections had their block types changed. Every template that used the original schema now fails upload or renders a broken section.
3. **Three separate cart UIs and two filter systems are running at once**, each with its own JS listening to the same theme events.

---

## CRITICAL — customer-facing, breaks buying

### C-1 · Nine templates fail validation → dev server 500 and theme cannot be pushed
- **Files:** `templates/product.with-gift-note.json`, `templates/customers/login.json`, `templates/customers/register.json`, `templates/collection.snh-health-template.json`, `templates/page.snhealth.json`, `templates/page.work-with-us.json`, `templates/page.accessories-page.json`, `templates/page.informed-sports.json`, `templates/page.endurance-athletes-page.json`
- **What's wrong:** each one contains blocks whose `type` no longer exists in the section schema:
  - `collection-list` blocks of type `collection` → `sections/collection-list.liquid` now only accepts `goal` (line 503)
  - `text-with-icons` blocks of type `item` → the schema now only accepts `feature`
  - `main-customers-login` / `main-customers-register` blocks of type `fields` → those sections now have no blocks at all
- Live still renders these pages (Shopify ignores the unknown blocks at render time), but **CLI upload rejects them**, so the whole dev preview is down and nothing can be deployed from git.
- **Fix:** remove the stale blocks from those JSON files (and the dead `fields` block from the two customer templates). For the collection-list instances, see **H-3**: restore the stock section first, then those blocks become valid again. This is step zero, because nothing else can be verified on the dev server until it's done.

### C-2 · Filters: stock filter UI force-hidden; the replacement only appears via JS and is missing on 23 templates below 1000px
- **Files:** `snippets/facets-vertical.liquid` (whole file, 1,173 lines: a drop-in "SNH Collection Filter Bar"), especially lines **337–345** (CSS), **931** `dock()`, **965** `purgeThemeFilters()`, **991** `alignToGrid()`, **1125** `boot()`
- **What's wrong:**
  - Line 337–345 ships a **global** rule: `[is="facet-drawer-opener"], [class*="facets-drawer"], [class*="filter-and-sort"], [class*="mobile-filter"], [class*="filters-toggle"], facets-horizontal, .facets-horizontal, .facets-vertical { display:none !important }`. That hides Impact's horizontal filter row **and** the `<facet-drawer class="facets-drawer">` that contains the new SNH bar.
  - `purgeThemeFilters()` then sets `display:none !important` inline on **every element whose class contains "facet"**, plus any button labelled "Filters"/"Filter and sort". It hid 40 elements on `/collections/whey-protein`, including stock sort-by, active filters and the floating filter button.
  - The only thing that makes filters visible is `dock()`, which moves the bar out of the hidden drawer to above the grid **after `DOMContentLoaded`**. If that JS errors or is slow, or a tool reads the server HTML, there are no filters at all.
  - **Sidebar layout (23 templates):** the bar renders twice, once in the drawer and once in `.collection__facets`. Below 1000px Impact hides `.collection__facets`, `dock()` refuses to move the drawer copy because "an in-page copy already exists", and the floating button is purged. **Result: zero filters, zero sort, no filter button on phones and tablets.** Verified offline on `/collections/myprotein` at 390px. On desktop the bar is crammed into a 300px sidebar, and `alignToGrid()` pads it 348px to the right, so it renders as **blank white bands** (`audit-screenshots/coll-myprotein-sidebar-desktop-*.png`). Sort is missing on desktop too.
  - The bar shows a list filter only if it has more than one value with products (`pickable > 1`), and takes the first filter labelled "brand"/"vendor" out of the dropdowns into a logo rail. So Search & Discovery filters can silently disappear.
- **Fix (recommended):** stop fighting Impact. Either
  - (a) **Restore stock `facets-vertical.liquid`** from Impact 6.4.1 and re-add the SNH goal chips / brand rail as an *extra* block above the grid (new snippet `snh-collection-rail.liquid`, rendered from `main-collection.liquid` before `collection-top-bar`), or
  - (b) keep the SNH bar but render it **server-side in its final position**: render it from `main-collection.liquid` above the grid instead of inside `<facet-drawer>`. Then delete the global `display:none` block, `dock()` and `purgeThemeFilters()`; delete `alignToGrid()` or skip it in sidebar mode; and switch all 23 sidebar templates to `horizontal`.
  - Either way, see the full template-by-template table in **"Step 2 — Filter status by template"** below.

### C-3 · Cart drawer (opened after Add to Cart) is clipped on mobile: prices, Checkout and Close are off-screen
- **File:** `sections/cart-drawer.liquid` (custom "SNH Elite Cart Drawer V2"), lines 48–140 (geometry), 547–638 (markup)
- **What's wrong:** the custom markup is placed inside Impact's `<cart-drawer>` without `slot` attributes, so everything lands in the shadow DOM's `part="body"`. That part is `display:grid` with an auto-sized column and its own 20/24px padding (theme.css 1264). With real items, the `white-space:nowrap` variant line (`.snh-cdx-item__meta`, line 310; e.g. "61 Servings / Chocolate Milkshake - Informed-Sport Tested") widens the grid track to **433px in a 390px sheet**:
  - prices read "LKR 31,9…", the **Checkout button is cut off at x=434**, and the custom ✕ is off-screen, so **there is no visible way to close the drawer on mobile** (`audit-screenshots/cart-drawer-filled-mobile.png`).
  - padding is doubled (Impact 20–40px plus custom 22px), and there are two nested scroll containers (Impact `part=body` `overflow-y:auto` plus `.snh-cdx-body`).
  - desktop is usable but asymmetric: 40px left vs 7px right (`cart-drawer-filled-desktop.png`).
- **Fix:** minimum: `#cart-drawer::part(body){padding:0;display:block;overflow:hidden}` and `#cart-drawer .snh-cdx-main{min-width:0;width:100%}`. Better: fold this into **C-4**, i.e. use one cart UI and rebuild it on Impact's slots (`slot="header"`, default slot, `slot="footer"`) so the theme's own close button and sticky footer work.

### C-4 · Three different cart UIs compete
- **Files:** `sections/ss-header-4.liquid` (own `snh-cart-drawer`, line 4546; opened by the basket icon, line 6198), `sections/cart-drawer.liquid` (opened on `variant:add`, line 1136), `config/settings_data.json` → `"cart_type": "popover"` (Impact's `variant-added` popover, `layout/theme.liquid:87`)
- **What's wrong:**
  - tapping the **header basket icon** opens the header's own mini-basket. That one renders correctly (`header-mini-basket-filled-mobile.png`).
  - pressing **Add to Cart** triggers Impact's "added to cart" popover (because `cart_type` = popover) **and**, 120ms later, the custom `cart-drawer.liquid` sheet on top of it.
  - the two baskets look different, show different free-delivery copy, run separate recommendation engines, and each fetch the 2.36 MB `products.json?limit=250` catalogue.
  - Impact's `CartDrawer._onCartChanged` (theme.js 1700) still runs on every `cart:change`. It can't find `.cart-drawer__inner`, so it replaces the drawer's children with server HTML at the same time as the custom `loadCart()` re-renders client-side. Recommendations flicker in and get wiped.
- **Fix:** pick **one**. The header's mini-basket already works, so the least-risk path is:
  - set `cart_type` to `drawer`,
  - have the header listen for `variant:add`/`cart:change` and open its own basket,
  - remove `sections/cart-drawer.liquid` from `overlay-group.json`, or replace it with stock Impact,
  - remove the `variant:add` → `openDrawer()` listener.

  Alternatively keep `cart-drawer.liquid`, fix it per C-3, and set the header's `enable_cart_drawer: false` so the icon opens it via `document.getElementById('cart-drawer').show()`.

### C-5 · Cart drawer shows "Your basket is empty" (and NaN subtotal) when a quantity change fails
- **File:** `sections/cart-drawer.liquid:1029–1048` (`changeLine`)
- **What's wrong:** `r.ok` is never checked. When `/cart/change.js` returns 422 (customer taps **+** beyond available stock), the error JSON `{status, message, description}` is passed straight to `renderCart()`. It sets the count to `undefined`, the subtotal to `NaN`, and renders the **empty-basket state while the items are still in the cart**. A customer will likely abandon.
- **Fix:** `if (!r.ok) { const err = await r.json().catch(()=>({})); showLineError(err.description || err.message); return loadCart(); }`. Do the same in the header basket if it shares this code path.

### C-6 · Product page JS crashes on load (`fixGallery is not defined`)
- **File:** `sections/main-product.liquid:3758` and `:3770` (the function was deleted; line 3226 even says "fixGallery() removed")
- **What's wrong:** `init()` throws at `fixGallery()`. Everything after it in `init()` never runs on first load: `injectPointsBanner`, `enhanceWhatsApp`, **`watchVariant`**, **`snhFixSwatchBorders`**, `fixVendorLink`, `restructureInfo`. The 600ms `snhLate()` re-runs some of them, but **`watchVariant` is never registered**. So when a customer picks another flavour or size, the points banner, bundle box, info rows and swatch borders are **not refreshed for the new variant**. The gallery itself still follows the variant via the separate `syncToVariant` handler (line 2913). The resize listener also throws on every resize. Reproduced offline on both audited products.
- **Fix:** delete the two `fixGallery` calls. Also delete the **first** `var SNH_VARIANT_MEDIA` (line 2826, position-index map), which the second declaration (line 2839, media-ID map) silently overwrites. `watchVariant` → `snhGoToSlide(idx)` then works with the wrong map, so either drop that gallery call from `watchVariant` or make it use `data-media-id` like `syncToVariant` does.

---

## HIGH

### H-1 · Collection pages scroll sideways (page up to 1,956px wide)
- **File:** `snippets/facets-vertical.liquid:409–411`
- **What's wrong:** `.snh-brand__input` is `position:absolute`, but its parent `.snh-brand` isn't positioned. The 40+ hidden brand checkboxes therefore position against `.snh-brands`, escape the rail's `overflow-x:auto`, and stretch the document. Measured: `/collections/everything` 1706px wide at 768px and 1956px wide at 1440px; `/collections/whey-protein` 679px wide at 390px (`coll-whey-protein-mobile-00.png` shows the blank grey strip). It's only partly masked on phones by `html, body { overflow-x: clip }` in `product-card.liquid:207` (see H-2).
- **Fix:** `.snh-brand { position: relative; }`. Then remove the `html,body` overflow band-aids (H-2, L-7).

### H-2 · 12.5 KB of product-card CSS + a font stylesheet is emitted once per card
- **File:** `snippets/product-card.liquid:107` (`<style data-snh-card-css>`); callers `sections/main-collection.liquid:220`, `main-search.liquid:138`, `related-products.liquid:51,80`, `recently-viewed-products.liquid:56`, `shop-the-look.liquid:195`, `snippets/navigation-promo-block.liquid:212`
- **What's wrong:** the snippet supports `with_css: false`, but only `featured-collection` passes it. Measured: **34 copies (424 KB) on whey-protein, 50 copies (624 KB) on everything**, plus 36 identical `<link>`s to the Satoshi font on whey-protein. That explains why collection HTML is 1.4–1.8 MB. The block also carries global side effects: `html, body {overflow-x: clip}` below 700px, `.product-list` grid overrides, `.overlay` blur, and it disables Impact's reveal animations.
- **Fix:** move the CSS to `assets/snh-product-card.css`, loaded once from `layout/theme.liquid`, or pass `with_css: forloop.first` at every call site. Move the font `<link>` to `<head>` once.

### H-3 · Stock `collection-list`, `multi-column` and `text-with-icons` were overwritten
- **Files:** `sections/collection-list.liquid` and `sections/multi-column.liquid` both now contain the SNH "Shop by Goal" accordion (the same design also exists as unused `sections/shopbygoal.liquid`); `sections/text-with-icons.liquid` (block type changed `item`→`feature`)
- **What's wrong:** 10 `collection-list` instances across `page.informed-sports`, `page.accessories-page`, `page.endurance-athletes-page`, `page.work-with-us`, `page.snhealth`, `collection.snh-health-template` and `product.with-gift-note` were collection grids. They now render a generic "SHOP BY GOAL" heading and two banners that open onto empty panels, because their `collection` blocks are dropped. This is also the cause of C-1.
- **Fix:** move the Shop-by-Goal code into **one** new file (`sections/snh-shop-by-goal.liquid`) and point `index.json`'s `multi_column_xzrBTh` at it. Restore stock Impact 6.4.1 `collection-list.liquid`, `multi-column.liquid` and `text-with-icons.liquid` (or re-add the `item` block type). Delete `shopbygoal.liquid`.

### H-4 · Koko checkout router intercepts more than checkout
- **File:** `snippets/koko-checkout-modal.liquid` (script 583–989; `classifyControl` ~645, `interceptSubmit` 748), rendered on every page from `layout/theme.liquid:107`
- **What's wrong:**
  - every Checkout / Buy-it-now click is caught in the capture phase and replaced by a modal (an extra step on 100% of checkouts).
  - `interceptSubmit` treats **any form submit whose action is `/cart`** as checkout, whatever the submitter. Any non-checkout submit of a cart form (an app's "update cart" button, a discount/gift-note field submitted with Enter, a future quantity form) will open the Koko modal instead of updating the cart.
  - buttons are matched by **visible text** ("checkout", "buy now", "buy it now"), so any app button with that label gets hijacked.
  - Koko checkout depends on an external Cloudflare worker (`koko-fee-snh.raspy-wind-fe2d.workers.dev`). If it's down, the Koko option errors, but regular checkout still works via "resumeNativeCheckout".
- **Fix:** only intercept explicit markers (`[data-snh-checkout-trigger]`, `button[name="checkout"]` whose form is the cart form, and `.shopify-payment-button__button`). Drop the text matching and the generic `/cart` submit rule. Consider showing Koko as a second button next to Checkout instead of a modal gate.

### H-5 · Sidebar filter layout is unusable (23 templates)
Covered in C-2, listed separately because the fix is a settings change. In all 23 `collection.snh-*` / `surge-collection` templates, set `main-collection` → `filter_layout: "horizontal"`. That removes the "zero filters on mobile" and "blank sidebar on desktop" states immediately, even before the code fix.

### H-6 · Two stale `SNH_VARIANT_MEDIA` maps + dead variant watcher
Part of C-6 (`main-product.liquid:2826` vs `:2839`). Listed so it isn't lost when C-6 is "fixed" by only deleting `fixGallery`: re-enabling `watchVariant` with the current maps makes `snhGoToSlide()` receive a media **ID** as a slide **index**.

### H-7 · Filter data itself is weak (Search & Discovery config)
- **Evidence:** on whey-protein, creatine-1 and everything, Shopify returns only **Availability, Price, Vendor, Tag** (`filter.v.availability`, `filter.v.price`, `filter.p.vendor`, `filter.p.tag`). The Tag filter (shown as "TYPE") contains raw tags: `132g`, `4-servings`, `applied-nutrition`, `CASEIN`, `CLEAR WHEY`, `Clear Whey`…
- **Fix (admin, not code):** in Search & Discovery → Filters, add **Flavour** and **Size** (variant options), **Product type**, and goal/format metafields. Replace the Tag filter, or clean the tags (one casing, no sizes or servings as tags). If you already added more filters there, they aren't being published to the storefront, so check their status.

### H-8 · Header basket says "Free delivery on orders Rs. 17,000+" on a Rs 39,997 basket
- **File:** `sections/ss-header-4.liquid` (mini-basket, ~4546 onwards)
- **What's wrong:** with the threshold already met, the header basket keeps the generic message while the bar shows full. The other drawer says "Free delivery unlocked". Mixed messages on the same cart (`header-mini-basket-filled-mobile.png`).
- **Fix:** reuse one free-shipping function for both, or delete one basket (C-4).

---

## MEDIUM

| ID | File | What's wrong | Proposed fix |
|---|---|---|---|
| M-1 | `layout/theme.liquid` + global sections | **~630 KB of HTML before any page content** on every page: `ss-header-4` 238 KB (125 KB inline CSS, 70 KB inline JS), `ss-footer-16` 124 KB, Koko modal + tail 116 KB, `<head>` 110 KB, cart drawer 42 KB. The blog index is 696 KB and a product page 1.1 MB. | Move section `<style>`/`<script>` into `assets/*.css`/`*.js` (cached across pages). Lazy-load the Koko modal markup on first checkout click. |
| M-2 | `sections/ss-header-4.liquid` / `header-group.json` | Impact's own header is disabled, so **`--header-height` is never set** (it was set in `sections/header.liquid:355`), and `--sticky-area-height` = 0. Every stock sticky element (product-info column, collection sidebar, anchor `scroll-padding`) pins at `top:0`, under the custom header. | In ss-header-4 JS, set `--header-height` (and `--sticky-header-enabled: 1`) on `documentElement` from the header's height, on load and resize. |
| M-3 | `snippets/facets-vertical.liquid` (`.snh-bar-form { position: sticky }`) | On phones the filter bar stays pinned at the top and covers **215px = 25% of the screen** permanently. The comment says it condenses on scroll, but that code was removed. See `coll-whey-protein-mobile-scrolled-sticky.png`. | Not sticky below 1000px, or collapse to a single "Filter & sort" pill once scrolled. |
| M-4 | `snippets/facets-vertical.liquid` (quick-find) | "Narrow whey protein…" hides cards **client-side on the current page only**, so with pagination, "0 matches" appears while matches sit on page 2. | Fall back to `/search?q=…&filter.p.product_type=…`, or label it "on this page". |
| M-5 | `sections/main-product.liquid` (518 `!important`, 4,981 lines) | The product page is restyled almost entirely with `!important` overrides on stock classes (`.product-info`, `.product-gallery`, `.block-swatch`…), so any theme update or new block breaks it. `restructureInfo()` **re-orders the DOM ~600ms after load** (layout shift). The two audited products render their info rows in different orders (`prod-critical-whey-desktop-fold.png` vs `prod-sis-go-hydro-desktop-00.png`). | Render the final order in Liquid, via block order in the template, instead of moving nodes in JS. Long term, extract the SNH product layout into its own section rather than overriding `main-product`. |
| M-6 | Product templates / variant picker | Critical Whey has 15+ flavour pills. On mobile **Add to Cart sits ~1,650px down**; on desktop it's below the fold. | Use a dropdown (`variant_picker` → "dropdown") when an option has more than 6 values, or add a sticky add-to-cart bar on mobile. |
| M-7 | `sections/main-product.liquid` (gallery CSS) | On mobile the vertical thumbnail column **overlaps the left edge of the main image frame** (`prod-critical-whey-mobile-fold.png`). | Put the thumbnails below the image under 700px, or give the image `margin-inline-start` equal to the thumb column width. |
| M-8 | `sections/main-product.liquid` | Mobile Add to Cart is half-width (177px) while "Order on WhatsApp" is full-width, so the primary action looks secondary. | `buy-buttons` full width under 700px. |
| M-9 | `assets/theme.js:2098` (+ `ss-footer-16`) | `FacetFloatingFilter` observes `.shopify-section--footer`, which the Section Store footer doesn't have, so an **uncaught TypeError fires on every collection page**. | Add the class `shopify-section--footer` to the footer section wrapper (via `"class"` in its schema), or guard the observer. |
| M-10 | Many sections | **Up to 5 Google Fonts stylesheets + 36 Satoshi links on one page**, with Archivo and Inter loaded in 4–5 different weight sets, on top of the theme's own fonts. | Choose 2 families. Load them once in `<head>`, ideally via Shopify's font picker or self-hosted assets. |
| M-11 | `sections/cart-drawer.liquid:820`, `ss-header-4.liquid:4992,5819`, `main-cart.liquid` addons script | `products.json?limit=250` is **2.36 MB**, and it's fetched by the drawer on open, by the header search (up to 6 pages), and twice by the `/cart` page "smart picks" on every cart view. | One shared, cached, slimmed catalogue (or the Predictive Search / Recommendations APIs). Never fetch it on `/cart` load. |
| M-12 | `sections/cart-drawer.liquid` (toast, ~1050–1090) | After closing the drawer, a **permanent "In your basket" bar** docks at the bottom of every page with no close button. It overlaps the floating filter button, the WhatsApp widget and mobile CTAs. | Auto-hide after ~6s, or add a close button. |

---

## LOW

| ID | File | What's wrong | Proposed fix |
|---|---|---|---|
| L-1 | `sections/main-cart.liquid` (empty state) | "YOUR CART IS EMPTY" is left-aligned while the icon and button are centred (`cart-page-empty-mobile-00.png`). | `text-align:center` on the empty-state heading. |
| L-2 | `sections/timeline.liquid` (about-us) | Mobile: ~350px blank gap between the text and the year dots; the year rail overflows to the right (2024 cut off). | Let the slide height follow content; make the year rail scrollable with padding. |
| L-3 | `templates/page.locations-info.json` | Only Dehiwala has a photo; Wattala and Nugegoda leave an empty right column on desktop. | Add images, or use a 3-column card layout. |
| L-4 | `sections/main-product.liquid` (breadcrumb) | Mobile breadcrumb starts at x=0 (no gutter). | Add container padding. |
| L-5 | Product card (`snippets/product-card.liquid`) | Desktop: the "OR 3 × Rs 499.…" Koko line is clipped at the card's right edge (`sidebar-1440`, collection desktop). | Allow wrapping, or shorten to "3 × Rs 500 with Koko". |
| L-6 | `sections/main-product.liquid:2819-2823` | Leftover config: `whatsappNumber: '94XXXXXXXXX'` (unused). Trust links go to `/pages/delivery`, `/pages/payment` and `/pages/authenticity`, which all **404** (they open a JS modal first, but are dead without JS or with a modifier-click). | Delete the unused key; create the pages or point the links at real ones. |
| L-7 | `sections/main-customers-login/register/account.liquid` (lines 11/16/18), `templates/index.json` | `html, body { overflow-x: hidden }` on account pages breaks `position: sticky`. `index.json` has `html,body{overflow-x:clip}` as **section custom CSS on 6 sections**; Shopify scopes custom CSS to the section, so it does nothing. | Remove both once H-1 fixes the real overflow. |
| L-8 | 22 product descriptions | Pasted `<meta charset>` tags (8 products, e.g. `isolate-training-stack`, `raw-protein-bar`), chat-UI classes (`font-claude-response-body`, `text-text-100`), and a pasted tooltip wrapper `left:50%; top:50px; transform:…` (14 products). Harmless today because there's no `position` and no `<style>`/`<script>`, and all 242 descriptions are tag-balanced, with no tables or fixed widths. Fragile, though. | Clean in admin (paste as plain text). Optionally add `.product-info__description :is(table){display:block;overflow-x:auto}` and `img{max-width:100%;height:auto}` as a guard for future pastes. |
| L-9 | `templates/page.contact.json` | The Contact page carries a "JOIN THE TEAM — Build your career with SNH" Custom HTML block. | Confirm intended; it probably belongs on `page.work-with-us`. |
| L-10 | `templates/index.json` | Two `_blocks` sections with the "Magnesium FAQ" AI block (`ai_gen_block_860b125`) and one empty `_blocks` section. They render nothing on the home page (the block only outputs on product `revive-magnesium-glycinate`), and the block's own notes say it was meant to stay unpublished pending compliance review. `templates/product.json` also has an empty `_blocks` "Magnesium FAQ". | Delete from index/product.json; add it to the Revive product's template only after review. |
| L-11 | `sections/newsletter-popup.liquid` | The popup covers the entire first screen on mobile within seconds of landing (`home-mobile-fold.png`). | Delay to an exit-intent or 2nd-pageview trigger on mobile. |

---

## Step 2 — Filter status by template

Settings check: **all 65 collection templates use `main-collection` with `show_filters: true` and `show_sort_by: true`.** Settings are not the problem. **No collection template uses `snh-collection-deck-clean-new`**: that snippet is an empty 0-byte file referenced nowhere. No template bypasses `main-collection`. All filter markup (66 `filter.*` inputs on whey-protein) **is present in the server HTML**; it's hidden by CSS/JS in `facets-vertical.liquid`.

| Layout | Templates | Mobile/tablet (<1000px) | Desktop (≥1000px) | Why |
|---|---|---|---|---|
| **horizontal** (42) | `collection` (default), `beauty-hair-skin`, `beauty-skin-care`, `creatine`, `daily-health-wellness-b`, `daily-wellness`, `endurance-bundles`, `endurance-energy`, `energy-endurance`, `fat-loss`, `fish-oil-omega`, `greens`, `gut-health`, `herbs-natural-solutions`, `hydration-recovery`, `informed-sports-certified`, `joint-mobility`, `joint-support`, `letter-vitamins`, `minerals`, `multivitamins`, `muscle-and-strength`, `muscle-and-strength-2`, `muscle-strength`, `pre-workout`, `probiotics`, `protein-snacks`, `recovery`, `sale`, `sexbomb`, `sexual-health`, `sleep`, `snh-osteocare`, `snh-revive`, `snh-wellman`, `snh-wellwoman`, `testosterone-supplements`, `the-sulek-stack-raw-snh`, `training-strength`, `weight-management`, `whey-proteins`, `women-s-health` | ⚠️ **SNH bar only, after JS runs.** No stock filters. Sticky, covers 25% of screen. | ⚠️ **SNH bar only, after JS runs.** Stock horizontal filters hidden. | Bar lives in hidden `<facet-drawer>`; `dock()` moves it into the page. Stock `.facets-horizontal` hidden by CSS. |
| **sidebar** (23) | `snh-collagen`, `snh-creatine`, `snh-ehplabs`, `snh-fat-burner`, `snh-grenade`, `snh-health-template`, `snh-mass-gainer`, `snh-muscletech`, `snh-myprotein`, `snh-perfectil`, `snh-pre`, `snh-protein-snacks`, `snh-raw`, `snh-redcon1`, `snh-revivemd`, `snh-ryse`, `snh-sis`, `snh-thorne`, `snh-thorne-2`, `snh-vitabiotics`, `snh-vitamins`, `snh-whey-protein`, `surge-collection` | ❌ **No filters, no sort, no filter button.** | ❌ **Sidebar renders blank** (content pushed 348px off-panel), no sort. | `.collection__facets` hidden <1000px; `dock()` won't move the drawer copy; `purgeThemeFilters()` removes the button. On desktop `alignToGrid()` mis-pads. |

Verified offline on: `/collections/whey-protein`, `/collections/creatine-1`, `/collections/everything` (horizontal) and `/collections/myprotein` (sidebar; `muscletech` and `sis` are also sidebar). Which collection uses which template is stored in admin, not the theme. Check under *Products → Collections → Theme template*.

Filters S&D currently returns on the audited collections: **Availability, Price, Vendor (shown as brand-logo rail), Tag (shown as "TYPE")**. See H-7.

---

## Step 6 — Cleanup list

Assignment of templates to products/collections/pages lives in admin. **Before deleting any template, confirm in admin that nothing is assigned to it** (Shopify falls back to the default template if it is).

### Collection templates (65 → can be ~5)
The only real difference between almost all of them is the **slideshow banner image** (+ FAQ copy).
- **Byte-identical (including images):** `snh-collagen` = `snh-creatine` = `snh-fat-burner` = `snh-mass-gainer` = `snh-pre` = `snh-protein-snacks` = `snh-whey-protein`; `snh-revivemd` = `snh-ryse`.
- **Differ only by banner image:** `muscle-and-strength` / `muscle-and-strength-2` / `muscle-strength`; `snh-thorne` / `snh-thorne-2`; `daily-wellness` / `daily-health-wellness-b`; `snh-revive` / `snh-revivemd` (plus layout).
- **Near duplicates (image + FAQ colours):** `joint-mobility` / `joint-support`; `endurance-energy` / `energy-endurance`; `beauty-hair-skin` / `beauty-skin-care`; `creatine` / `snh-creatine`; `whey-proteins` / `snh-whey-protein`; `protein-snacks` / `snh-protein-snacks`.
- **Proposal:** one `collection.json` (category) and one `collection.brand.json`, with the banner from `collection.image` or a `custom.banner_desktop` / `custom.banner_mobile` metafield, and FAQ from a metaobject. Retire the other 60+.

### Product templates (16 → 3)
- The 14 brand templates (`applied-nutrition`, `centrum`, `dymatize`, `ehp-labs`, `healthspan-elite`, `muscletech`, `myprotein`, `raw-nutrition`, `ryse`, `science-in-sport`, `seven-seas`, `trace`, `vitabiotics`, + default) have **identical block structure**. They differ only in one "About the brand" collapsible text and a re-IDed copy of the same 4,270-char WhatsApp Custom Liquid block (which also injects a `<style>`).
- **Proposal:** keep `product.json`, plus `product.pre-order` and `product.with-gift-note` if used. Put "About the brand" in a vendor metaobject. Move the WhatsApp block into a real snippet.
- `product.with-gift-note` currently fails validation (C-1) and uses the broken collection-list (H-3).

### Sections
- **Overwritten stock (restore from Impact 6.4.1):** `collection-list.liquid`, `multi-column.liquid`, `text-with-icons.liquid` (H-3).
- **Unused custom (safe to delete after a grep in admin):** `shopbygoal.liquid` (3rd copy of Shop-by-Goal), `snh-header-standalone.liquid`, `snh-promise-proof.liquid`, `ss-instafeed-3.liquid` (`instafeed-modern` is the live one).
- **Disabled, still shipped:** `header.liquid` (stock header), `ss-header-13.liquid` (3,448 lines), `footer.liquid`, `announcement-bar.liquid`, `snh-envelope-popup.liquid` (overlay-group, disabled), `snh-performance-quiz.liquid` (disabled in `page.wholesale`). Disabled sections **don't render or load CSS**, so they don't break anything. Remove the custom ones (`ss-header-13`, `snh-envelope-popup`, `snh-performance-quiz`) once you're sure; keep stock `header`/`footer`/`announcement-bar` as fallbacks.
- **Stock Impact sections with 0 uses** (`accordion-content`, `before-after-image`, `blog-posts`, `comparison-table`, `feature-chart`, `featured-product`, `media-grid`, `multiple-images-with-text`, `newsletter`, `press`, `recently-viewed-products`, `revealed-image-on-scroll`, `specification-table`, `tabs`, `testimonials`): keep. They're editor options and cost nothing. **Do not delete `variant-added.liquid`, `main-gift-card.liquid` or `account-banner.liquid`**; they're used without appearing in templates.
- `Shobybrand.liquid`: typo in the filename, used by `page.shop-by-brand`. Rename to `snh-shop-by-brand.liquid` when convenient.

### Snippets
- `snh-collection-deck-clean-new.liquid`: **0 bytes**, referenced nowhere. Delete.
- `booster-seo.liquid`: 850 lines, referenced nowhere (remnant of the Booster SEO app). Delete.
- `free-shipping-bar.liquid`: referenced nowhere (both baskets have their own). Delete, or make it the single shared implementation (H-8).
- `whatsapp-share-widget.liquid`: 6 lines, unused. Delete.
- `facets-vertical.liquid`: replace (C-2). Note its own header comment says to also paste it into `facets-horizontal.liquid`; that file doesn't exist in Impact 6.4.1, so don't create it.

### Blocks (AI-generated)
- `ai_gen_block_5b9680c` "Brand logo slider": unused (`brand-logo-slider-custom` section is live). Delete.
- `ai_gen_block_71e87ed` "Magnesium FAQ": unused duplicate. Delete.
- `ai_gen_block_860b125` "Magnesium FAQ": only placed on `index.json` (twice), where it renders nothing (L-10). Move or delete.

---

## Suggested fix order

1. **C-1**: remove the stale blocks so the dev server works again (everything else needs it to verify).
2. **H-5 + H-1**: switch the 23 sidebar templates to horizontal; add `.snh-brand{position:relative}`. These are tiny changes that unblock filters on phones and stop the sideways scroll.
3. **C-6**: delete the `fixGallery()` calls.
4. **C-4 → C-3 → C-5**: choose one cart UI, then fix its layout and error handling.
5. **C-2**: rebuild filters properly (server-rendered, no global hiding); **H-7**: improve S&D config.
6. **H-2, H-3, H-4**, then the Medium list, then the cleanup.
