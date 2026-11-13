# QA round report: bundle images, product gallery, cart banner, filter bar (14 Nov 2026)

All writes, with before/after values, are in `docs/golive/WRITE-LOG.md` (section "14 Nov 2026 QA round"). Backups are in `docs/golive/backup-qa-2026-11-14/`. Screenshots are in `docs/golive/qa-2026-11-14/`.

## 1. Bundle images

**Done: all 28 draft bundles.**
- **What each bundle got:**
  - A 2000×2000 hero JPG, 206–486 KB.
  - One clean shot per product (2000×2000, product at about 80%).
  - 89 images in total, attached hero first, all READY.
- **How they were made:**
  - Composed with code (PIL) from the real product photos: background removed, SNH frame cropped off.
  - Labels are never redrawn or altered.
  - Font: Archivo, the theme's heading font.
- **Contact sheet** (all heroes at 300 px): `docs/golive/bundle-heroes-contact-sheet.png`.
- **Per-image QA log and redo list:** `docs/golive/bundle-heroes-QA.md`. Every image passed:
  - automated bounds checks
  - a visual check at 300 px (name and badge readable, nothing clipped or hidden)
  - a 2x halo check
- **Alt text:** "<Bundle> – <products>" for the hero, "<Bundle> – <product title>" for the product shots.
- **Lead product:** neither linked doc has a "Biggest in the hero" column, so the most expensive product leads, as the brief says.
- **Skipped:** none.
- **Limits:**
  - **Bar boxes:** the only single-bar source is the Peanut Butter Fudge bar, so it's repeated. The box is one flavour of the customer's choice.
  - **Loaded Pre Flavour Duo:** shows the Grape tub twice. It is the only front photo of Loaded Pre.
  - **Loaded Pump:** its only front photo has flavour art around the tub, which was trimmed to the tub.
  - **Revive bottles:** the sources are 1080 px, so they are slightly soft at full 2000 px zoom.
- **API note:** `productCreateMedia` no longer exists in Admin API 2026-10. I used its documented replacement, `productUpdate` with only the id and the `media` list. No other product field was touched, and all 28 are still **DRAFT**.

**activate-bundles (dry run only):** all **28** would activate. Each has images, stocked components, and compare-at above price. Nothing was activated. Output: `docs/golive/activate-bundles-dryrun-2026-11-14.txt`.

## 2. Product gallery QA

**Causes**
- **(a) SiS Hydro:** the 13 Nov CSS frame crop assumed square files. Hydro's are tall, so the slide grew to 375×479 and the photo was blown up.
- **(b) Diet Plant Protein:**
  - On phones the thumbnail column floated over the left of the photo, covering "Energy" and "of which saturates".
  - The "lift" script zoomed and clipped info images.

**Fixed (theme)**
- **Frame:** every slide is a fixed 1:1 frame with `object-fit: contain`. No zoom, no clip, no frame crop.
  - Main photo: 46% of a 375×812 screen.
  - Tablets are capped at 58% of the screen height.
- **Thumbnails:** on phones they are a row under the photo.
- **Info images:**
  - 573 of 1,438 gallery images were classified as info images (`docs/golive/gallery-classification.csv`), by OCR text density, keywords and file name/alt.
  - They are always shown whole and uncropped, at 2% padding.
  - The counter and brand badge step aside on those slides.
- **Full-screen viewer** for every gallery image (`assets/snh-zoom.js`, no library):
  - Phones: tap to open, pinch or double-tap to zoom.
  - Desktop: click or scroll-wheel to zoom.
  - Swipe or arrow keys for the next image; Esc closes.
- **Clean copies:**
  - 693 product-photo clean copies were uploaded to Files as `pdp-<media id>.webp`.
  - `custom.clean_images` (list of files in gallery order) is set on 221 products. Deleting it shows the originals again.
  - The product media itself is untouched.
  - The storefront can't resolve file references without a metafield definition, and creating one is outside this round's allowed writes. So the theme reads the clean files by file name, with the metafield as the on/off switch.
- **Product cards:** already compliant. Each uses its clean cut-out in a square tile at 80% scale, with no cover, crop or overflow.

**Audit:** all 253 active products, each at 375 px and 1440 px.
- 0 issues found by the automated checks: square frame, image inside frame, contain, no zoom/clip, main photo under 55%, no duplicates, thumbnails not over the photo.
- `platform-processing-fee` has no gallery (hidden fee product).
- Log: `docs/golive/gallery-audit.csv`. Phone contact sheets: `docs/golive/qa-2026-11-14/gallery-375-sheet-1…4.jpg`.

**Before/after**
- `docs/golive/qa-2026-11-14/compare-sis-hydro-375.jpg`
- `docs/golive/qa-2026-11-14/compare-diet-plant-protein-375.jpg`
- Viewer: `zoom-viewer-375-open.png`, `zoom-viewer-375-zoomed.png`, `zoom-viewer-1440-zoomed.png`

**Products that need a new photo** (low resolution; nothing to fix in the theme):
- **applied-nutrition-beef-xp-clear-protein**: image 2: text image only 800x800px, small print stays soft when zoomed
- **ryse-loaded-pre-workout**: image 2: text image only 800x800px, small print stays soft when zoomed; image 4: text image only 800x800px, small print stays soft when zoomed; image 5: text image only 800x800px, small print stays soft when zoomed
- **applied-nutrition-turk-x-turkesterone-plus-capsules**: image 2: text image only 600x600px, small print stays soft when zoomed
- **applied-nutrition-beef-xp-clear-whey-hydrolysed-beef-protein-150g-5-servings**: image 2: text image only 600x600px, small print stays soft when zoomed
- **centrum-men-50-multivitamins-minerals**: image 2: text image only 571x676px, small print stays soft when zoomed
- **trace-magnesium-glycinate-stick-packs-copy**: image 5: text image only 500x354px, small print stays soft when zoomed
- **applied-nutrition-r-ala-r-alpha-lipoic-acid**: image 2: text image only 569x569px, small print stays soft when zoomed; image 3: product photo only 569x569px
- **trace-minerals-ashwagandha-gummies-passion-fruit-orange-60**: image 2: text image only 800x800px, small print stays soft when zoomed
- **endurance-trial-pack**: image 5: product photo only 577x577px; image 8: product photo only 577x577px; image 9: product photo only 577x577px; image 10: product photo only 577x577px; image 20: text image only 680x680px, small print stays soft when zoomed
- **race-day-pack-1-0**: image 2: product photo only 577x577px
- **applied-nutrition-beef-xp-clear-beef-protein-isolate-30-servings**: image 2: text image only 800x800px, small print stays soft when zoomed
- **phd-whey-protein-powder-1kg**: image 1: product photo only 582x582px

## 3. Cart banner and filter button

**"Bundle unlocked"**
- **Shape:** a rounded card (14 px radius).
  - Padding: 12/14 px on phones, 16/18 px on desktop.
  - The 24 px tick is vertically centred, with 19 px above and below on phones and 25 px on desktop.
- **Text:** "Bundle unlocked" plus "You're saving Rs X" in green, contrast at least 4.5:1.
- **Animation:**
  - Slides in over 300 ms with a 1.2 s canvas confetti burst in orange, green and white.
  - Fires once per unlock, not on re-renders or reloads.
  - Reduced motion gets a plain fade.
- **Tested** at 375 and 1440, in the drawer and on /cart:
  - add a bundle, add a normal item, quantity 2, remove the bundle (the banner disappears)
  - the cart was emptied after each run
- **Bug found and fixed:** in the drawer the banner overlapped the first cart line. Fixed in 99bcf41.
- **Upsell heading:** once free delivery is unlocked it reads "Goes well with your order", with no price hint.
- **Screenshots:** `cart-banner-*.png`.

**"Filter & sort" (phones and tablets under 1000 px)**
- **One component** (`snippets/facets-vertical`) on collections, search and Bundle Offers.
- **Layout:** a slim 49 px sticky bar under the header with a solid white background and a hairline border.
  - Left: "Filter & sort" with an orange badge showing the number of active filters.
  - Right: the product count.
- **Scrolling:** hides on scroll down, returns on scroll up.
- **Checks** at 375, 390 and 768: never over the cards, and no floating filter elements. At 1440 the existing single bar is unchanged, and nothing floats over the grid.
- **Screenshots:** `filter-*.png`.

## 4. Theme commits (feat/theme-v2)
- ea60e02 bundle heroes + docs
- e332f60 gallery: square contain frame, info images, thumbnails under the photo, viewer
- 6fd388e upsell heading (plus a temporary debug attribute)
- 89af40a temporary debug attribute. This commit also carried the new cart banner + confetti JS/CSS.
- f9d9499 gallery: clean copies by file name, switched on by the metafield
- a07ba8e filter bar
- 03b5629 debug attribute removed
- 6a4b4a5 and 99bcf41 cart banner height fixes
- 286f958 info slides: counter and badge step aside
- 145eff6 filter bar count on search
- 993091a filter bar gutter
- 77ca99c gallery image box pinned inside the square

**Reverted:** nothing.
- The debug attribute was added and removed within the round.
- Each push was checked on the live site.

## 5. Skipped as outside scope
- **Metafield definition for `custom.clean_images`:** would let Liquid resolve the file list directly. Creating it is not an allowed write.
- **Stray `}` in `assets/snh-v2.css` (line 2304, since 1 Nov):** Shopify's minifier reports it and serves that file unminified. It isn't part of this round's fixes.
- **No other writes:** no prices, stock, orders, customers, discounts, shipping, payments, apps or settings were touched. Nothing was activated, deleted or replaced.
