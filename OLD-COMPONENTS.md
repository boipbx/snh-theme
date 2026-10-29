# Your components in the old theme (Round 11, Step 0)

Source: `main` (`git show main:<path>`) and the live site on 29 Oct 2026. Screenshots of the live versions at 390 and
1440: `prototype/shots/r11/old/`. Values are the old theme's own CSS. The v2 rebuild keeps each component's structure,
elements, order and behaviour; v2 only changes type (Inter + Instrument Serif, the 12–96 scale), spacing (4px grid)
and polish (clean pack shots, alignment).

---

## 1. Product card (`snippets/product-card.liquid`, class `.snh-pc`)
Used by every grid: home bestsellers, collections, search, related, featured collections, desktop Shop the Look.

**DOM, in order**
```
.snh-pc (container-type: inline-size; flex column)
  .snh-pc__frame (padding 8px 8px 0)
    a.snh-pc__shot → .snh-pc__media (1:1, radius 14, bg #f2eee7, img cover, 1.055 zoom on hover over 1.5s)
      .snh-pc__badges (top-right stack: theme badges, e.g. BUNDLE / Sold out; the theme's red "Save" badge hidden)
      .snh-pc__badge (top-left pill: "SAVE Rs X" red · else "New in" (< 45 days) / "Best seller" (tag) ink)
    button.snh-pc__peek (eye icon, 38px circle, bottom-right, opens Impact's quick-buy drawer)
  .snh-pc__body (padding 18 18 16)
    a > h3.snh-pc__title (2-line clamp)
    p.snh-pc__sub ("N options" when multi-variant, else product type / vendor)
    .snh-pc__foot (flex, space-between, wraps)
      .snh-pc__price (pill: now 16/900 · was 11/500 struck; sale = red text on a red-tint pill)
      .snh-pc__koko ("OR 3 × Rs X" + Koko logo, full-width row under price)
      button.snh-pc__add ("Add" / "Choose" + a white arrow dot) or .snh-pc__soldout pill
    .snh-pc__earn (hairline above; member: "Earn Rs X back", guest: link "Sign in — earn Rs X back")
```
**Styles:** border 1px #ece6dd, radius 10, white; hover: border rgba(23,19,15,.16), lift 3px, shadow
0 16px 38px rgba(23,19,15,.08). Satoshi; title 19/900/1.22, −.02em; sub 14/500 #a09484; price pill bg #f2eee7, radius
18, padding 8×16; add pill ink #17130f, 46px, radius 99, 14/700, hover orange #e0521c, "Adding / Added / Try again"
states; dot 30px white with an arrow. Badge 12/700 red rgba(192,42,27,.92) with blur; note badge ink.
**Mobile (<700px):** 2 columns, 8px gaps; no hover motion or blur; padding 11×10; title 14px (min 2 lines); price and
add stacked full width (38px); Koko 10.5px; peek 30px; badges 10px.
**Behaviour:** Add = `/cart/add.js` with one unit, then `variant:add` so the drawer opens; multi-variant "Choose" goes
to the product page; the peek opens the quick-buy drawer. Saving: compare-at (variant, product, then max), else SNH's
bundle retail sheet, else `custom.retail_price`. Sold-out cards fade (.68) and sort last (CSS `order`). Points rate in
the card came from `customer.total_spent` (3/7/10 % at 50k/150k), not the tier metafield (a known inconsistency).
**Not in the card:** brand line, star rating, flavour count. Round 11 adds brand + rating + review count (asked for).

## 2. Collection filtering (`snippets/facets-vertical.liquid`, "SNH collection filter bar")
One `<form id="facet-form" is="facet-form" update-on-change>` (Impact's facet form, re-renders the grid by section).
Sticky under the header on every device (`top` from the real header height), white background, z 12.

**Bands, in order**
1. **Quick find** (search icon + "Narrow whey protein — brand, goal or product"): live-filters the goal and brand
   rails and the visible cards as you type; after 3 letters it also asks `/search/suggest.json` (with a synonym map:
   fat loss → fat/lean/diet/burner/shred…, bulking → mass/gainer…, sleep → magnesium/zma…), merges the hits, shows
   "N matches", a clear button, "Search all products →" (full search on Enter), and an "SNH recommends" rail of store
   products when nothing on the page matches; "No brand or goal matches that" otherwise.
2. **Goals / Refine** chips: a per-collection map (`whey-protein>isolate-protein|Isolate,…`; ~22 collections + a
   default of 9 shop-by-goal collections). Real collection links (work without JS); a missing/empty collection is
   skipped; the current one is ink. Label "REFINE" (10.5/800, .14em, uppercase).
3. **Brand logo rail**: every value of the brand/vendor filter as a logo plate (`<brand>-logo.webp` → `.png` → the
   brand collection image → the name as text), greyscale until picked; picked = orange underline + colour; scroll
   arrows on desktop; a checkbox per brand (multi-select).
4. **Controls row**: "In stock" switch (availability filter), one dropdown pill per useful filter group (≥ 2 values
   with products; label + an orange count of active values; panel with checkboxes, a search box when > 10 values,
   scroll when > 8; swatches for colour; Impact's price-range for price), and Sort (right-aligned select).
   Mobile: the row scrolls sideways; panels become fixed sheets under the pill (58vh).
5. **Active filters**: removable chips + "Clear all".
Busy state while the grid reloads (.55 opacity). Hides Impact's own filter drawer/buttons. Grid below: Impact's
`product-list` with promo-tile blocks, pagination (`section.settings.products_per_page`).

## 3. Shop the Look (`sections/shop-the-look.liquid`, "Brand of the month")
Image left (rounded) with **hotspot dots** (`--top/--left` per block); products right.
- **Desktop:** an `effect-carousel` showing **one product at a time** (on the live site that's the full SNH product
  card), prev/next circle buttons under it; the dots and the carousel are linked (`page-dots aria-controls`): hovering
  /clicking a dot shows its product, changing the product moves the active dot.
- **Mobile:** image, then a swipe rail (or stacked list, setting) of **horizontal product tiles**: 64–80px pack shot,
  bold title, price + "or 3 × Rs X with Koko ⓘ", "+ Add" button (single variant = product form; multi = quick buy).
- **SNH Elite strip** under each product: dark gradient bar (#17130f → #241209, border rgba(255,122,50,.22), radius
  6), tag "● SNH ELITE" (9px, .22em) left, right "You'll earn **Rs X** back in points" (member, tier rate) or link
  "Sign in to earn **Rs X** back in points" (guest, 3 %). Rates from section settings 3/7/10.
- Heading "SHOP THE LOOK: RYSE"-style (Archivo 900 uppercase).

## 4. Cart drawer (`sections/cart-drawer.liquid`, `cart-drawer[data-snh-elite]`)
Right drawer (desktop), bottom sheet with a grab handle (mobile); blurred page behind.
- **Head:** "YOUR BASKET" + count badge, close ×.
- **Free delivery card:** message + threshold ("Free delivery over Rs. 17,000" / "Add Rs. X more for free
  delivery" / "Free delivery unlocked on this order") and a progress bar. **Tolerance:** within Rs 100 of the threshold
  the card hides (setting `free_delivery_tolerance`).
- **Lines:** image (164w), title, variant, qty stepper (− n +, quantity 0 removes), line price. Re-rendered from
  `/cart.js` in JS on every change; the header count updates; a toast confirms.
- **Smart picks** (below the lines):
  - "Complete free delivery · Rs X to go · N smart picks": from `/collections/all/products.json` (best-selling, 250),
    cheapest available variant, price between the gap and max(1.9 × gap, gap + Rs 6,000), not in the cart, cheapest
    first, 2 shown, rotated per gap through sessionStorage. "Unlocks free delivery". Hidden when the gap ≤ tolerance.
  - "Selected for this basket · Frequently bought together": for creatine in the cart a hand-made pair list (shaker,
    ISO-XP, caffeine, zinc…); otherwise `recommendations/products.json` complementary → related for the last line,
    near-duplicates skipped, 2 rotated. Each pick: image, name, price, helper text, round "+" add.
- **Foot:** SNH Elite points line (bolt icon; member: "You'll earn N points on this order as a Gold member (10 %
  back)" from the tier metafield; guest: "Log in or join SNH Elite to earn 3 % back"), Subtotal, tax note, **View
  basket** (outline) + **Checkout** (orange, lock icon).
- **Empty:** "YOUR BASKET IS EMPTY" · "Add your favourites and they'll appear here instantly." · Start shopping.
- **Koko:** `snippets/koko-checkout-modal.liquid` (global) intercepts Checkout and offers Regular vs Pay with Koko via
  the Cloudflare worker. **Kept untouched.**

## 5. Instagram feed (`sections/instafeed-modern.liquid`; `ss-instafeed-3` was an unused Section Store copy)
- **API:** Instagram API with Instagram Login, `GET https://graph.instagram.com/me/media?fields=id,media_type,
  media_url,thumbnail_url,permalink,caption,timestamp&limit=<count>&access_token=<token>`, called **from the browser**.
- **Token:** a section setting `token`, printed into the HTML as `data-token` (public) and stored in
  `templates/index.json` on `main` (in git). Masked here: `IGAAQf…` (183 chars). **Read-only test on 29 Oct 2026:
  HTTP 200, 6 posts, newest 29 Oct 2026, so the token is live and exposed. Rotate it.**
- **Caching:** localStorage `ig_cache_<section id>`, `{t, data}`, for `cache_mins` (60). No pagination (one page).
- **Errors:** missing token or non-OK response throws; the grid shows a short message linking to the profile.
- **Look:** eyebrow "@sportsnutritionhub.lk" (orange, spaced caps), heading "FOLLOW US ON INSTAGRAM" (heavy caps),
  a follow pill right; cards on a #f0f0f0 band: 3 columns desktop / 1 mobile, radius 18, gap 16, shadow; each card =
  square media (video → `thumbnail_url`), a media-type tag top-right (IMAGE / CAROUSEL_ALBUM / VIDEO), then a dark
  (#151515) caption block: 2-line caption + date (spaced caps). New tab links to the permalink.

## Not mine (removed in Round 11 unless listed above)
Impact/Section Store looks: dark "FAQ'S" section with the AI image (`snh-faq-dark` custom liquid), slideshow, "Why
choose us", brand logo slider, `ss-slider-2-pro`, the video newsletter popup. See THEME-V2.md Round 11 for the list.
