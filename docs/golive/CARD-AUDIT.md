# Card thumbnails: original images everywhere (18 Nov 2026)

Product card thumbnails used the cleaned theme copies (`assets/pc-<handle>.webp`, AI background removal) and a JS "lift" that trimmed, zoomed and clipped each image to the pack inside the SNH frame. Live damage: the MuscleTech Nitrotech 5LB tub cut and smeared, the SiS Rego Whey label erased, the Healthspan Sports Essentials box text wiped. Now every card shows the product's **original featured image** from Shopify, whole.

## What changed (commit `0ad1378`)

- **`snippets/snh-clean-img.liquid`** returns nothing, so no surface uses the cleaned copies. It fed:
  - product cards everywhere (collections, home sections, rails, Save with a bundle, mega menu)
  - mini lists (trending, bestsellers, search empty state)
  - compare
  
  This applies whatever the "Use cleaned product images" setting says.
- **`layout/theme.liquid`**: `window.SNHClean` is no longer printed, so the search overlay and its fallback search use the original image.
- **`assets/snh-v2.js`**: the trim/zoom/clip (`lift`) and its catch-all (`autoLift`) are switched off. That covers:
  - cards, mini lists, the cart drawer and cart page lines and suggestions
  - shop-the-look, account promos, the product page sticky bar, compare, quiz and plan results
  
  The code is still in the file but never runs.
- **`assets/snh-v2.css`**: card images are `object-fit: contain` at 85 % of the 1:1 tile, centred, with no transform and no clip. The old `.is-framed` zoom (×1.12 to ×1.34) and the cleaned-copy rules are overridden on cards, cart lines, suggestions, minis and compare.
- The card already used `image_url` with a srcset (300–800 w); nothing changed there. Bundles show their first image, the designer hero.
- The tile colour is unchanged. Originals are never cropped or erased, whatever their backdrop.
- **Left in place, so this can be reversed:** the 248 `assets/pc-*.webp` files (listed in `pc-files-unused.txt`) and `snippets/snh-clean-list.liquid`. To undo: restore the files in `docs/golive/backup-cards-2026-11-18/`.

## Checked (live)

- **Every card:** all 276 storefront products, as rendered on /collections/all at 375 px. The card image is the product's Shopify featured image (or the bundle hero) in **276 of 276**, every one `object-fit: contain`, 85 % fill, no transform, no clip. `applied-nutrition-iso-xp-2kg` and `platform-processing-fee` are active but not on the storefront.
- **No `pc-*.webp` in the rendered page, and no transformed or clipped thumbnail,** on:
  - home
  - /collections/whey-protein, /collections/bundle-offers and /collections/sis
  - the /search page for "whey"
  - the search overlay for "whey"
  - the cart drawer with 2 items
- **Contact sheet:** `cards-1.jpg` to `cards-3.jpg` (every card as it renders at 375 px; single tiles in `tiles/`). Looked through by eye: no cut-off packs, no erased text, no smears.
- **Spot check at 375 and 1440 (`spot/`):** Nitrotech 100% Whey Gold 5LB, SiS Rego Whey 1.35KG, Healthspan Sports Essentials, RAW Essential Pre-Workout, Revive Magnesium Glycinate, EHPlabs OxyWhey, Dymatize ISO100, Trace Magnesium Glycinate 180, Godzilla Beast Mode (bundle), AN Critical Whey 2kg. All show the original, whole.
- **Lighthouse mobile, /collections/whey-protein (3 runs each):** before 35 / 45 / 44, after 44 / 45 / 50. Not worse; the pixel-reading script no longer runs.

## Still looking wrong

- **Bundle cards:** the red "Save Rs …" badge (top left) covers the start of the green BUNDLE label printed in the designer hero (top right on the image), so it reads "NDLE". This comes from the card layout, not the image. Not changed here; the options are to move the badge or to ask the designer for heroes with more space at the top.

## Original photos that look poor on a card (replace when possible)

119 products have a grey or dark studio backdrop, most of them inside the SNH orange frame, which shows as a grey box in the light tile. Shown as they are, never cropped. By brand prefix: applied 73, sis 13, myprotein 8, muscletech 7, raw 3, snh 3, ehplabs 2, centrum 1, dymatize 1, joint 1, perfectil 1, phd 1, platform 1, ronnie 1, ryse 1, sport 1, trace 1. Full list: `poor-background.txt`.
