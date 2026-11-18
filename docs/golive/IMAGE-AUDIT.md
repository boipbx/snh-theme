# Product image audit (18 Nov 2026)

Every active product checked by script; the original wins wherever the cleaned copy is not provably as good. No image was generated, redrawn, upscaled or deleted. Contact sheets were checked by eye only for flagged products.

## Numbers

- **Products audited:** 278 active (276 have a storefront page; `applied-nutrition-iso-xp-2kg` and `platform-processing-fee` are active but not published to the Online Store, so nothing renders).
- **Images checked:** 1,516 originals; 717 clean copies that the live pages showed, plus 39 newer copies the metafield pointed to.
- **FAIL:** 651 of 717 clean copies. Reasons (one copy can have several):
  - upscaled from a source under 800 px: 329
  - altered patch (the painted-out SNH logo, smears): 288
  - label warped or smeared (SSIM under 0.85 after alignment): 205
  - halo or jagged cut-out edge: 157
  - frame-cropped lifestyle, banner or info graphic: 130 (frame-cropped product shots: 53)
  - text lost: 69; text cropped at the edge: 32
  - alignment uncertain (counted as FAIL): 60
  - colour shift: 42; missing part: 11
- **Fixed:** all 651. The live pages now show the original for each of them. Re-check on the live site: 1,503 slides, **0 FAIL**. Every clean copy still showing is one that passed.
- **Now on originals:** 241 products show only originals. **35 products** still show at least one clean copy (66 images in total), each a product cut-out that passed every check (list below).
- **Gallery order changed:** 88 products. Only one first image changed: Applied Nutrition Crunch Protein Bar, where a banner was first. Image counts are unchanged on every product.

## How the check works (`image-audit/scripts/`)

- **Inventory:** Admin API, per active product: media (order, URL, size, alt), the `custom.clean_images` entries, the variant images. Live: the server-rendered gallery of every product page.
- **Clean copy vs original:**
  - Locate it: multi-scale template matching on grey levels and gradients.
  - Composite the cut-out back over its own original; a perfect cut-out reproduces the original. SSIM inside the product and on the edge band, size of locally changed patches, colour difference (Lab).
  - Missing parts, aspect ratio (non-uniform scale fits better), product touching the canvas edge.
  - OCR word count on the clean copy vs the same area of the original.
  - Upscale factor against the product's size in the source file.
- **Thresholds:** match under 0.90, SSIM inside under 0.85, edge SSIM under 0.75, changed patches over 5 percent, colour ΔE over 3, missing part over 0.5 percent, any aspect change, any edge contact, text down 15 percent or more, upscale over 1.15× from under 800 px. Any of these means FAIL; uncertain also means FAIL.
- **Type:** info = OCR (normal and inverted) with label keywords, or the earlier classification. Five dark info panels (three certificates of analysis, two Trace Supplement Facts) were missed by OCR and added by hand. Lifestyle = a busy backdrop inside the SNH frame. Everything else is a product photo.

## Rules applied

- A clean copy stays only if it is a **cut-out of a product photo** and passes every check. Info images, lifestyle images and frame-cropped graphics always show the original.
- **Order:** front product photo first (the existing first image unless it is info or a busy banner), then other product photos and flavours, then lifestyle, then info. Order inside each group is unchanged. Variant images keep their media IDs, so picking a flavour still switches the photo.
- **Bundles are not reordered.** The designer hero stays first; the classifier read some bundle heroes as text.
- The classifier is not perfect: a few marketing banners whose backdrop reads as plain stay among the product shots. They are never ahead of the first product photo.
- `clean_images` was never emptied. A failed entry now points at the product's own original media, so a product with no passing copy has a list made only of originals, which works the same as cleared.

## Theme

- `custom.clean_images` entries now decide each slide. An entry that is a `pdp-…` file shows the clean copy; the product's own media shows the original. Before, the theme looked files up by name and ignored the entries; 39 entries pointed to newer copies than the ones shown.
- Theme settings → SNH product images → **Use cleaned product images** (on): turns every clean copy off at once, in the gallery and on cards.
- Product tag **`orig-images`**: forces the originals for that product (gallery and card). No product needed it: zero FAILs after the fix.
- **Frame-crop:** the gallery has none. Every slide is `object-fit: contain` with transform and clip off; this was checked in the browser on 10 products at 375 and 1440 px, with nothing cropped or transformed. The product-card "lift" (trim to the pack inside the SNH frame) is kept: cards show the first image, which is now a product photo on every product.
- Info slides: 12 more media IDs were added to `snippets/snh-info-media.liquid`. They show in full on white with the smallest padding, and open in the full-screen viewer: checked, the whole panel at 1080–1274 px fits the screen.

## Products whose original itself is poor (a new photo from SNH is needed)

Originals under 800 px. They are shown as they are, because they can't be improved without altering them.

- applied-nutrition-turk-x-turkesterone-plus-capsules: 1 image(s) (600x600)
- sis-beta-fuel-gel: 1 image(s) (680x680)
- applied-nutrition-beef-xp-clear-whey-hydrolysed-beef-protein-150g-5-servings: 1 image(s) (600x600)
- centrum-men-50-multivitamins-minerals: 1 image(s) (571x676)
- trace-magnesium-glycinate-stick-packs-copy: 1 image(s) (500x354)
- applied-nutrition-r-ala-r-alpha-lipoic-acid: 2 image(s) (569x569)
- sis-beta-fuel-energy-nootropics-gel: 4 image(s) (602x602), (624x624), (680x680)
- sis-go-energy-bar-mini-30-pack: 2 image(s) (680x680)
- endurance-trial-pack: 17 image(s) (577x577), (624x624), (680x680)
- race-day-pack-2-0: 1 image(s) (680x680)
- race-day-pack-1-0: 1 image(s) (577x577)
- sis-beta-fuel-energy-chew: 1 image(s) (680x680)
- phd-whey-protein-powder-1kg: 1 image(s) (582x582)

## Products still showing clean cut-outs (passed every check)

- applied-nutrition-beef-xp-clear-protein (1)
- applied-nutrition-beef-xp-sample-sachet (1)
- applied-nutrition-cream-of-rice (5)
- applied-nutrition-critical-oats-600g (4)
- applied-nutrition-critical-whey-2kg (1)
- applied-nutrition-micellar-casein-protein (3)
- applied-nutrition-protein-chips (4)
- applied-nutrition-tri-magnesium-powder (1)
- dymatize-iso100-hydrolyzed-whey (1)
- ehplabs-blessed-plant-protein (1)
- ehplabs-oxyshred-hardcore (1)
- ehplabs-oxywhey-lean-protein (1)
- muscletech-nitrotech-whey-protein-4lb (2)
- myprotein-gooey-filled-cookie (1)
- myprotein-impact-protein-bar (1)
- race-day-pack-1-0 (1)
- race-day-pack-2-0 (5)
- raw-acetyl-l-carnitine (1)
- raw-essential-charged-pre-workout (2)
- raw-essential-pre-workout (5)
- raw-thavage-pre-workout (1)
- redcon1-total-war-pre-workout (1)
- revive-sleep-support-30-servings (1)
- ryse-loaded-pre-max (1)
- ryse-loaded-protein-2lb (1)
- ryse-loaded-pump-25-servings (1)
- sis-beta-fuel-gel (1)
- sis-beta-recovery-1-5kg (3)
- sis-go-electrolyte-powder (2)
- sis-go-hydro-tablets (5)
- sis-rego-rapid-recovery-powder-1-5kg (2)
- sis-rego-whey-protein-1-35kg (1)
- sis-rego-whey-protein-450g (1)
- snh-shaker-bottle-750ml-orange (2)
- trace-concentrace-mineral-drops (1)

## Files

- `image-audit/checks.csv`: every image (product, position, media, type, what renders, verdict, reasons).
- `image-audit/sheet-01.jpg` … `sheet-12.jpg`: one row per product, before (top) vs live now (bottom). Green outline = clean copy, "i" = info slide.
- `image-audit/spot/`: 10 products at 375 and 1440 px, plus the full-screen viewer on an info slide.
- Backup: `backup-images-2026-11-18/<handle>.json` (media order and `clean_images` before the change, for all 220 products touched) and `backup-images-2026-11-18/theme/` (the theme files before the change).
- Spot-checked: SiS Hydro Tablets, PhD Diet Plant Protein 500g, RAW Essential Pre-Workout, Revive Magnesium Glycinate, Applied Nutrition ABE, Godzilla Beast Mode (bundle), AN Crunch Protein Bar, Trace Magnesium Glycinate, AN Beef-XP, REDCON1 Total War. Each opens on the right first image, nothing is cropped or transformed, files are served at 1600 px (enough for a 2× screen), and the info panel is complete in full screen.
