# Smart search restored (16 Nov 2026)

The search engine from the old header (`docs/reference/old-header-v6.liquid`, kept as reference only, never a section) now runs inside the current header's search overlay. The header's look and mobile layout are unchanged.

## What changed

- **`assets/snh-search.js`** (new): the engine. Loaded only when search is opened, never on page load.
- **`assets/snh-v2.js`**: opens the engine on first search open; until it has loaded, the plain search still answers.
- **`sections/snh-header.liquid`**: passes the settings to the overlay; the search form keeps sold-out products.
- **`sections/main-search.liquid`**: the full search page keeps sold-out products, listed last.
- **`snippets/snh-restock.liquid` + `sections/snh-product.liquid`**: "Update me when restocked" under add to cart on sold-out products; follows the chosen variant.
- **Theme settings → SNH**: "Restock WhatsApp number" (94764863359), "WhatsApp community link" (empty), "Exclusive brands".
- Backups: `docs/golive/backup-2026-11-16c/`.

## Decisions

- **Ported as-is:** `normalise`, `wordsOf`, `withinEdits`, `tokenScore`, `scoreProduct`, `expandQuery`, the brand shorthand map, the relevance floor, the stale-request guard and the re-run when the catalogue finishes loading.
- **Stock before score.** Sold-out products always sit after every in-stock one, as asked; the old file ranked by score first.
- **Bundles are live data.** A bundle is any product of type "Bundle" in the catalogue. Saving = compare-at price minus price. Its word list = title + tags + description text. Component product titles are not in `/products.json`, so they are not read separately; the descriptions name the components.
- **Bundle lift.** Only a bundle whose own title has a typed word is lifted to position 2. Other matching bundles stay where their score puts them.
- **Three changes to the old logic**, each because a test failed without it:
  - "tablets", "capsules", "caps", "softgels", "pills" count as the same word ("caffeine tablets" finds Caffeine Capsules).
  - A two-word brand name must match as a whole ("an" no longer matches every "… Nutrition" brand).
  - When a form word is typed, bundles are not matched on their description (every description mentions capsules).
- **Closest matches.** If nothing matches every typed word but some titles match one, those show under "Closest matches" instead of a blank.
- **Catalogue cache:** sessionStorage key `snh-catalogue-v2`, 30-minute expiry, up to 6 × 250 products.
- **Second column** shows Suggested searches, Collections & pages, Guides & articles, each hidden when empty. The button always reads "See all results for …".
- **Community link:** no SNH WhatsApp community or channel URL exists in theme settings or docs, so the setting is empty and the link is hidden.

## Tests (live, 1440 and 375)

Top results before → after. Screenshots: `docs/golive/search-test/`.

| Query | Before | After |
|---|---|---|
| caffeine tablets | SiS Hydro Tablets, RYSE Loaded Pre-Workout, REDCON1 Total War, RYSE Godzilla, SiS GO Energy + Caffeine Gels | Applied Nutrition Endurance Caffeine Capsules 100mg (sold out, restock button). No pre-workouts. It is the only caffeine capsule product in the store. |
| sis go electrolyte | SiS GO Electrolyte Powder, SiS Hydro Tablets, SiS GO Energy + Electrolyte Gels, SiS GO Isotonic Energy Gels, SiS HYDRO+ | SiS GO Electrolyte Powder, SiS GO Energy + Electrolyte Gels, SiS Hydro Tablets, SiS Go Energy Bakes, SiS GO Isotonic Energy Gels |
| an creatine | AN Flavored Creatine 50, AN Creatine 50, AN Creatine 100, AN Creatine + Hydration, RAW Creatine | AN Creatine + Hydration, AN Creatine Monohydrate + Peptide, AN Creatine Gummies, AN Creatine 3000 Capsules, AN Flavored Creatine 50 (12 results, all Applied Nutrition first) |
| electroryte | SiS Hydro Tablets, SiS GO Electrolyte Powder, AN Hydration + Electrolyte, SiS HYDRO+, SiS GO Energy + Electrolyte Gels | SiS GO Electrolyte Powder, SiS GO Energy + Electrolyte Gels, SiS Hydro Tablets, TRACE ConcenTrace, AN Hydration + Electrolyte |
| ashwagandha | AN Ashwagandha, Trace Ashwagandha Gummies, AN ZMA, AN Sleep Support, AN TRT (6, no sold-out) | Trace Ashwagandha Gummies, AN Ashwagandha KSM-66, AN ZMA, Stress & Recovery Bundle, Testosterone Support Bundle … then REVIVE Ashwagandha KSM-66 and Strength Foundation Bundle last, both sold out, with one combined restock button (9) |
| magnesium | 7 products, no bundles | 27 results: REVIVE Magnesium Glycinate, 3-Month Magnesium (Save Rs 7,497, was Rs 25,497), TRACE Magnesium Effervescent, Healthspan Magnesium Plus … |
| raw pre | 5 RAW pre-workouts | RAW Premium Training Stack, then the RAW pre-workouts (14) |
| whey | 10 | 43, Whey + Pre Stack first |
| bundle | 10 | all 54 bundles |
| zzzz | Applied Nutrition Sleep Support (wrong) | "No products match “zzzz”. Try a brand, a goal or a supplement type." |

- **Sold-out last:** yes in the overlay (checked on every query). On the full search page the sold-out products are now included and Shopify sorts them last; that page's cards carry no "sold out" label.
- **Product page restock button:** on REVIVE Ashwagandha KSM-66 it opens `wa.me/94764863359` with "Hi SNH, I want updates on when this is restocked:" + title + URL. Not shown on in-stock products.
- **Console:** no errors from the theme. Two existing third-party messages (Clarity, Shop frame) are unchanged.
- **Sideways scroll:** none at 375 or 1440.
- **Speed:** the engine and the catalogue are not requested on page load (checked). Lighthouse mobile, home: 39, 40, 36 after; 40, 39, 41 on 14 Nov. Within run-to-run noise.

## 17 Nov 2026: partial typing (commit 51d5522)

Staff report: results only appeared once the full product name was typed. Only `assets/snh-search.js` changed.

- **The word being typed is a prefix from 2 letters** ("caff" = caffeine, "caffeine ca" = capsules). Earlier words keep the existing rule (exact, typo, or a prefix of 3+ letters); they were not made stricter.
- **A single trailing letter** ("caffeine t", "sis g") is too little to filter on: it no longer removes results, it only nudges the order.
- **A half-typed form word after another word** counts as tablets = capsules ("caffeine tab", "caffeine cap").
- **A product whose title or brand has every typed word is always shown**, also when Shopify's predictive search did not return it and whatever its score.
- **Why caffeine capsules looked missing:** the product is sold out, so it sat last, under a dozen pre-workout bundles that only mention caffeine in their description. New rule: when fewer than three in-stock products are named after the search, a sold-out product that is named after it goes right after them, ahead of those bundles. With three or more in-stock matches, sold-out stays last as before ("ashwa").

Live at 375px, expected product in the top 3. Screenshots: `docs/golive/search-test/prefix/`.

| Query | Result |
|---|---|
| caf, caff, caffeine, caffeine t | Pass: Applied Nutrition Endurance Caffeine Capsules is 2nd (sold out, restock button), after SiS GO Energy + Caffeine Gels |
| caffeine cap | Pass: 1st, the only result |
| dym | Pass: Dymatize ISO 100 (sold out, restock button) |
| crea | Pass: 32 creatine products |
| ashwa | Pass: ashwagandha products first; REVIVE Ashwagandha KSM-66 still last with the restock button |
| magn | Pass: magnesium products and the 3-Month Magnesium bundle |
| sis g | Pass: SiS GO products first |
| zzzz | Pass: "No products match" |
