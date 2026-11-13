# Bundle hero images: build + self-QA log (14 Nov 2026)

Built by code (PIL) from the real product photos on each product's first image: background removed (rembg isnet), SNH frame and logo cropped off, 1 px alpha erode and white de-fringe. Labels are never redrawn or edited. Font: Archivo 900/800 (the theme heading font). Contact sheet at 300 px: docs/golive/bundle-heroes-contact-sheet.png.

**Rules applied**
- **Lead:** no "Biggest in the hero" column was found in either linked doc, so the most expensive product leads (back/centre, about 60% of the height when width allows), with the others in front at 75%.
- **Equal size:** duos of the same line, 3-Month, Couples Daily and the bar boxes.
- **Style:** RYSE/RAW on a dark background with orange accents; Revive on white with soft blue.
- **Badge:** an orange circle "SAVE RS x" top right.
- **Name:** top left.
- **Price strip:** price plus the struck compare-at.
- **Extras:**
  - Daily / Heavy days (Loaded Pre + Pre MAX Duo)
  - Morning ☀ / Night ☾ (24-Hour Pack)
  - For two (Couples Daily)
  - 3 months (both 3-Month bundles)
- **Word count:** "Loaded Pre + Pre MAX Duo" plus its two labels is over six words, because the brief asks for those labels by name.

**Per-image checks**
- **Automated:**
  - every product box is inside the canvas and outside the name block
  - labels are inside the 6% margin
  - JPEG is under 500 KB
- **Visual:**
  - checked at 300 px: name and badge readable, no clipped product, no hidden product name
  - checked at 2x zoom: no halo

| bundle | hero KB | jpeg q | products shown | product shots | result |
|---|---|---|---|---|---|
| Bar Box 6 | 412 | 88 | 6 | 1 | pass |
| Godzilla Beast Mode | 446 | 88 | 2 | 2 | pass |
| Her Wellness+ | 272 | 88 | 3 | 3 | pass |
| 24-Hour Pack | 240 | 88 | 4 | 4 | pass |
| Bar Box 12 | 474 | 80 | 12 | 1 | pass |
| Loaded Pre + Pre MAX Duo | 445 | 88 | 2 | 2 | pass |
| Loaded Pre Flavour Duo | 438 | 88 | 2 | 1 | pass |
| Stim + Pump Stack | 380 | 88 | 2 | 2 | pass |
| RYSE Loaded Stack | 400 | 88 | 2 | 2 | pass |
| RYSE x RAW | 409 | 88 | 2 | 2 | pass |
| Her Wellness | 238 | 88 | 2 | 2 | pass |
| Sleep Starter | 234 | 88 | 2 | 2 | pass |
| Revive Deep Sleep Stack | 273 | 88 | 3 | 3 | pass |
| Calm & Focus | 216 | 88 | 2 | 2 | pass |
| Unwind | 204 | 88 | 2 | 2 | pass |
| Gut Reset | 222 | 88 | 2 | 2 | pass |
| Gut & Liver Reset | 220 | 88 | 2 | 2 | pass |
| Full Reset | 254 | 88 | 3 | 3 | pass |
| Revive Strength | 219 | 88 | 2 | 2 | pass |
| Build & Recover | 234 | 88 | 2 | 2 | pass |
| Athlete Recovery | 245 | 88 | 3 | 3 | pass |
| Revive Daily Plus | 253 | 88 | 3 | 3 | pass |
| Couples Daily | 275 | 88 | 4 | 2 | pass |
| 3-Month Magnesium | 249 | 88 | 3 | 1 | pass |
| 3-Month Daily | 291 | 88 | 6 | 2 | pass |
| Longevity Duo | 236 | 88 | 2 | 2 | pass |
| Executive Stack | 249 | 88 | 3 | 3 | pass |
| Longevity Premium | 266 | 88 | 3 | 3 | pass |

**Redone during QA**
- **Her Wellness+:** the support products covered the "THYROID SUPPORT" name. Overlap cut to 6% of the lead width.
- **Full Reset:** Glutamine clipped the "D" of DIGEST AID. Fixed by the same overlap change.
- **24-Hour Pack:** products were too small, and the "Morning" pill touched the Omega lid. Groups enlarged and the pills placed above the tallest product.
- **Bar Box 12:** the outer bars sat inside the 6% margin. Rows rescaled to fit.
- **All bundles:** label pills enlarged (84 px) and badge text kept off the white ring.
- **RYSE Loaded Pump:** the only front photo has blue raspberry art around the tub. The cut-out keeps the tub columns only, and green straw slivers at the edges were removed. Some label art printed on the tub itself remains.

**Known limits**
- **Bar boxes:** the only single-bar source is the Peanut Butter Fudge bar from the 4-flavour photo, so it is repeated. The box is one flavour of the customer's choice. The cut-out ends where the food pieces sit in the original photo.
- **Loaded Pre Flavour Duo:** shows the Grape tub twice. It is the only front photo of Loaded Pre.
- **Revive bottles:** the sources are 1080 px with the product about 600 px tall, so they are upscaled about 2x with light sharpening. Sharp at phone and card size, slightly soft at full 2000 px zoom.

**Uploaded:** 28 bundles, 89 images (hero first, then one clean shot per product). Alt text is "<Bundle> – <products>" and "<Bundle> – <product title>". All 28 are still DRAFT.
