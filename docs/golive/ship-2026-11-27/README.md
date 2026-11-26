# Storefront ship-and-fix round (27 Nov 2026)

Theme-only. No Admin writes at all this round (the only allowed one, attaching a Winter Berry image, did not apply: no real image exists). Every change is logged in `docs/golive/WRITE-LOG.md` with its revert command; backups are in `docs/golive/backup-ship-2026-11-27/`.

## Verification method
1. **Pre-merge:** the changed CSS/JS is served into the live page in Playwright (`LOCAL_ASSETS`), then screenshotted, critiqued, fixed and screenshotted again. Liquid can't be previewed this way, so it is linted with Shopify Theme Check (0 errors in changed files).
2. **After each push:**
   - the live theme asset is polled until the new code is in it;
   - each page is fetched once with a plain GET: status 200, no "Liquid error", new markup present, removed markup gone;
   - then rendered screenshots are taken.
3. **Screenshots:**
   - The headless browser loaded the myshopify domain at first (it redirects to the .lk domain). After about 20 loads the store answered with a bot check / rate limit, and the tool stops on that rather than retrying.
   - From then on, fallback (a) was used: the page and store requests are fetched outside the browser (like curl), rendered in Playwright, and assets come from the CDN. Requests are spaced out.
   - When even that got 429, the run waited it out.

## Per component
See `WRITE-LOG.md` for commits and reverts. Critique notes:
- **Buttons:**
  - 390/1440 before/after in `buttons/`.
  - Critique: label centred, Add to basket matches the 52px stepper, Buy it now a quiet text link. Hover is a lighter orange with a 4px halo, no rotating stroke. Clean.
- **Quick view:**
  - `quickview/preview-*` were taken before the merge.
  - Critique round 1: a shadow line over the add row, "Full details" indented 12px, the "Flavor" spelling. All fixed, then re-shot clean.
- **Product page:**
  - `product/after-*`: 6 products × 2 widths.
  - Critique: brand line gone, price 8px under the title, value line, one Koko line, one meta row, CTA higher. Fix: double word gaps in "Earn up to N points" (ship 3b).
- **Images:**
  - `images/`: every Essential Pre-Workout flavour, main view + thumbnails, at 390 and 1440. All whole (object-fit contain, no transform or clip), including Peach Mango and Orange.
  - Watermelon Grape and Winter Berry have no photo of their own. They used to keep showing the previous flavour's photo; they now show the first image with a "Photo shows another flavour" note.
- **Basket:**
  - `basketp/preview-*` were taken before the merge; `basket-test/` holds the flow test.
  - Critique round 1: the item name wrapped to 3 lines ("750ml" dropped), "Rs" split from the amount (no-wrap), the suggestion repeated a shaker that the upsell already offered (now hidden), and a single sachet was called "Bigger pack" (now "Try a sample").

## Needs a photo (no real image in Files or the product's media; none generated)
- raw-essential-pre-workout: Watermelon Grape; Winter Berry (Sam Sulek Edition)
- applied-nutrition-amino-fuel-eaa: Fruit Burst
- raw-cbum-itholate-protein: Fudge Brownie
- raw-creatine-monohydrate-30-servings: Cherry Limeade
- applied-nutrition-beef-xp-clear-beef-protein-isolate-30-servings: Mixed Berry (sold out)
- applied-nutrition-critical-whey-sample: 6 flavours (all sold out)

## Data findings (not changed: product data is out of scope this round)
- **Creatine Starter Pack, Aqua Marine variant:** its components list only the creatine (the shaker component is missing). The upsell skips incomplete bundle variants like this.
- **Race Day Pack 1.0 / 2.0:** no compare-at price, so no basket upsell (the saving must be compare-at minus price). The product page shows a saving from the theme's retail-price list instead.
- **`assets/snh-v2.css`:** already had one unbalanced `}` before this round (stripped line ~2280, present in older live versions too). Browsers recover from it; left as is.

## Live commits (feat/theme-v2, in order)
| # | component | commit |
|---|---|---|
| 1 | primary button | 016b3c8 |
| 2 | quick view | 6fc67f0 |
| 3 | product page + bundle block + no-photo note | e34fd04, 13e9fa4 (word spacing) |
| 4 | basket tracker + bundle upsell + totals + cart page | 25e4c15, d78402b (eager thumbnail) |
| 5 | product cards | 5f33061 (did not sync: snh-v2.css > 256 KiB), dc236f9 (CSS split into snh-v2-ship.css; live) |
| 6 | compare | ca2d7d9, ba1a08f (24px heading on phones) |
| 7 | announcement pill | d59c927 |
| 8 | SNH list popup | 9c5a9c4 |
No revert was needed: nothing broke live. The one failed sync (5f33061) left the previous files in place.

## Basket test (cart only, never checkout; `basket-test/`)
1. Creatine 50 → "Add SNH 2.0 Shaker Bottle (Black) and save Rs 1,999 · Switches you to Creatine Starter Pack". Add → basket = Creatine Starter Pack ×1 at Rs 8,999 (compare-at Rs 10,998; saving Rs 1,999 = compare-at − price), creatine line gone. **PASS**
2. Pre-workout → suggestion "Popped Protein Crisps" (snack). **PASS**
3. Pre-workout + whey (Rs 34,998) → "Free delivery unlocked", green, check at the tip, fill 100%. **PASS**
4. Whey removed → tracker animates back (358px → 315px, 88%), "Rs 2,001 away from free delivery". **PASS**
Offline: `scripts/tests/bundle-upsell.test.mjs` (live prices) and `scripts/tests/basket-rules.test.mjs` (12 checks) pass.

## Lighthouse mobile (`lighthouse/`, 3 runs each, after all merges)
- **Home:** 31 / 51 / 50, median **50**. Baseline: 25 Nov runs (`storefront-2026-11-25/lighthouse/home-mobile-after-*`) 33 / 37 / 36, median **36**. Not worse (+14).
- **Product (Applied Nutrition Creatine 50):** 55 / 36 / 31, median **36**. Two runs had an 18 s LCP while the store was rate-limiting this machine. There is no earlier product-page baseline to compare with.
- **CLS:** 0–0.039 on all runs.

## QA gate
- No sideways scroll at 390 on any captured page.
- Console: no errors from changed code. Remaining errors come from Shopify's consent / pixel scripts (`marketingAllowed`, a sandboxed iframe) and `theme.js` (`childElementCount`, unchanged since Round 5, also in the before runs).
