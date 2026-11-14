# Saturday SiS deal + bundle links + SiS images + logos: decisions log (14 Nov 2026)

## Step 0: Saturday copy
- **Found:**
  - The store had **no automatic discount at all** (no SiS 15%, no sitewide 15%).
  - The Saturday popup, ticker, homepage banner and cart note all promised "15% off everything, applied automatically, no code needed".
  - Every product card showed a "−15% today" label.
- **Decision:**
  - Created today's real code **SIS15-14NOV** first, at 19:30 UTC, which was 01:00 Saturday in Sri Lanka.
  - Then rewrote all the Saturday copy to "15% off all SiS products" with the code.
  - Removed the sitewide card label.
- **Timing:** pushed in df1dc11; live at 19:31 UTC (01:01 Sri Lanka time).

## Step 1: codes
- **Created:** 12 codes, SIS15-14NOV to SIS15-30JAN.
- **List:** docs/golive/SATURDAY-CODES.md.
- **Script for more:** scripts/create-saturday-codes.mjs.

## Step 2: wheel
- **Popup:** the sat_popup block was removed (backup in docs/golive/backup-sis-2026-11-14/).
- **Other Saturday messages:** they now point to the chip instead of carrying a fixed date.
- **Wheel size:** 6.0 KB gzipped (JS 4.4 + CSS 1.6).
  - It loads only on Saturdays, after the page is idle.
  - It never loads on cart, checkout or account pages.
- **Tests (Chromium):** 7 runs, all passed (375 ×3, 1440 ×3, plus one with reduced motion). Each run covered:
  - spin, apply, then /cart.js shows SIS15-14NOV with Rs 599.85 off the SiS Hydro line
  - focus trap, Esc, no chip on /cart, reopening goes straight to the code
- **Weekday:** a Wednesday clock loads nothing.
- **QA override:** ?snh-sat=1 forced the wheel on for testing; removed in 1b4739f.
- **Not tested:** WebKit (Safari) isn't installed in this environment.
- **Lighthouse:** docs/golive/qa-2026-11-14/lighthouse/LIGHTHOUSE.md. The mean is 42.3 before and 42.3 after; the median is 45 before, 43 after.

## Bundle links
- **Data:** scripts/sync-bundle-links.mjs set custom.in_bundles on 33 component products, with a backup in docs/golive/backup-bundle-links/. activate-bundles.mjs now calls it at the end.
- **Theme:** the "Save with a bundle" row is on product pages.
- **Shopify sync note:** the sync sometimes skips a commit's section file. It was re-pushed in bbde578, and every push was checked live.
- **RAW Premium Creatine:** it is only in draft bundles, so its row stays hidden until RYSE x RAW is activated.

## Step 3: SiS images
- **Gallery:**
  - A photo whose own background isn't white is now shown edge to edge on its edge colour (14 SiS slides).
  - Clean cut-outs fill about 85%.
- **SiS cards:** about 86%.
- **Result:** 0 bands across all 24 SiS products (128 slides), at 375 and 1440.
- **Screenshots:** before/after in qa-2026-11-14/sis/ and compare-sis-5-products-375.jpg.

## Step 4: logos
- **Logo files:** all 17 brands with products use transparent, trimmed theme logos (assets/brand-*.png). They were checked and needed no cleaning.
- **Cause of the box:** the box came from the chip's CSS (white plate, shadow, blur). It has been removed.
- **Dark photos:** the logo is hidden on dark full-bleed photos and on info images.
- **Ronnie Coleman:** has no logo, so no chip shows.
- **Check:** 10 brands at 375 and 1440 all pass (qa-2026-11-14/logos/).

## 14 Nov 05:30 UTC: deal removed from the website (in-store only)
- **Theme (1c8a8e5):** live at 05:30–05:32 UTC (11:00 Sri Lanka time). Removed:
  - the Saturday campaign blocks: announcement, homepage banner, cart banner and Friday teaser (the popup and the "−15% today" card label were already removed)
  - the deal wheel: its loader and the snh-satdeal JS/CSS files
- **Old browser data:** a one-line script clears the wheel's saved keys (snh_sat_*) from visitors' browsers.
- **Backups:** docs/golive/backup-sat-off-2026-11-14/.
- **Live check:** home, SiS collection, SiS product and cart drawer at 375 and 1440 (qa-2026-11-14/sat-off/). No Saturday text, code, 15% badge, chip, popup or offer attribute anywhere.
- **Discounts:** the 12 SIS15- codes were deactivated (discountCodeDeactivate, now EXPIRED); nothing was deleted. HYROX (15% SiS, expired 12 Sep) was left as it was. No other Saturday/SiS discounts exist.
- **Orders:** 55 orders since Sat 00:00 Sri Lanka time; **0** used a Saturday SiS code or discount.
