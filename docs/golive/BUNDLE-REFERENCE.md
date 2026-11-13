# Bundle reference (read 13 Nov 2026, Admin API 2026-10, read-only)

Built with Shopify native fixed bundles (Bundles app): `hasVariantsThatRequiresComponents: true` on all four.

## Common pattern
- productType **Bundle**, vendor **Sports Nutrition Hub (SNH)**, templateSuffix **none** (default product template).
- Tags: `bundle` + the bundle-collection tag (`Training & Strength Bundles` / `Daily Health & Wellness Bundles` / `Endurance Bundles`) + goal tags from the store vocabulary + brand tag (`RAW-nutrition`, `REVIVE`).
- Options: one per component with a choice, named `<component product title> (Flavor)`; bundles without choices have the single `Title` option.
- SKU pattern: `SNH-<ABBR>[-<option codes>]` e.g. SNH-PTS-SSWC-UNFL, SNH-CSP-BLAC, SNH-DAILY, SNH-MGB.
- Variants: inventory tracked (component-driven), policy DENY. compareAtPrice set on most (null on raw-training-stack; the theme then uses snippets/snh-v2-retail).
- Publications: Online Store, Google & YouTube, Facebook & Instagram, Point of Sale, Inbox (all published).
- Metafields: `global.title_tag`, `global.description_tag` (SEO), `custom.bundle_contents` (list.product_reference), `custom.summery_brief` (single line), `custom.key_benefits` (multi-line: one benefit per line), `custom.how_to_use` (multi-line), `custom.caution` (multi-line: used as **About the brand** tab). judgeme/booster are app-managed (not copied).
- descriptionHtml: plain paragraphs `<p class="_p_1x4zg_107"><span>…</span></p>`: intro, one paragraph per product, a closing line, then **"Normally LKR X. Bundle price LKR Y. You save LKR Z."**
- Product page tabs (sections/snh-product-details): Description · How to use (custom.how_to_use) · Delivery & returns · Key Benefits (custom.key_benefits) · About the brand (custom.caution). FAQ = the theme-wide "Questions, answered" section (no per-product FAQ in the reference).

## RAW Premium Training Stack (`raw-training-stack`)
- status ACTIVE, tags: bundle, Creatine, Muscle & Strength, Pre-Workout, RAW-nutrition, Strength, Train & Perform, training, Training & Strength Bundles
- SEO: RAW Training Stack Bundle | RAW Essential Pre-Workout + Creatine 30 Servings | SNH Sri Lanka / Start your RAW Nutrition stack with RAW Essential Pre-Workout and RAW Creatine Monohydrate 30 servings. Save LKR 1,499 at Sports Nutrition Hub Sri Lanka.
- options: ['RAW NUTRITION Essential Pre-Workout (Flavor)', 'RAW NUTRITION Creatine Monohydrate 30 Servings (Flavor)']
- variants: 40; first SKU SNH-PTS-SSWC-UNFL, price 16999.00, compare-at None
- components: 1 x RAW NUTRITION Essential Pre-Workout [Size->fixed: 30 Servings, Flavor->RAW NUTRITION Essential Pre-Workout (Flavor): Sam Sulek White Cherry (Limited Edition)/Grape/Blue Raspberry/Peach Mango/Citrus Grapefruit/Sour Watermelon/Raspberry Creamthickle/Orange/Guava Passionfruit/Watermelon Grape]; 1 x RAW NUTRITION Creatine Monohydrate 30 Servings [Flavor->RAW NUTRITION Creatine Monohydrate 30 Servings (Flavor): Unflavored/Blue Raspberry/Fruit Punch/Sam Sulek White Cherry (Limited Edition), Size->fixed: 30 Servings]

## Creatine Starter Pack (`creatine-starter`)
- status ACTIVE, tags: beginner, bundle, Creatine, Muscle & Strength, shaker, Strength, Train & Perform, Training & Strength Bundles
- SEO: Creatine Starter Bundle | AN Creatine Monohydrate + SNH Shaker Bottle | SNH Sri Lanka / Start creatine the right way with AN Creatine Monohydrate 50 servings and the SNH 2.0 Shaker Bottle 750ml. Save LKR 2000 at Sports Nutrition Hub Sri Lanka.
- options: ['SNH 2.0 Shaker Bottle 750ml (Colors)']
- variants: 6; first SKU SNH-CSP-BLAC, price 8999.00, compare-at 10998.00
- components: 1 x APPLIED NUTRITION Creatine Monohydrate 50 Servings [Size->fixed: 50 Servings, Flavor->fixed: Unflavored]; 1 x SNH 2.0 Shaker Bottle 750ml [Colors->SNH 2.0 Shaker Bottle 750ml (Colors): Black/White/Harbor Grey/Magenta/Teal Blue]

## REVIVE Daily (`revive-daily`)
- status ACTIVE, tags: bundle, Daily Health & Wellness Bundles, daily-wellness, Health & Wellness, health-foundation, magnesium, REVIVE, vitamin-D3
- SEO: REVIVE DailyREVIVE Daily Bundle | REVIVE Magnesium Glycinate + Vitamin D3 K2 5000 IU | SNH Sri Lanka / Build your daily health foundation with REVIVE Magnesium Glycinate and REVIVE Vitamin D3 & K2 5000 IU. Save LKR 2,299 at Sports Nutrition Hub Sri Lanka.
- options: ['Title']
- variants: 1; first SKU SNH-DAILY, price 14999.00, compare-at 17298.00
- components: 1 x REVIVE Magnesium Glycinate [Size->fixed: 60 Servings]; 1 x REVIVE Vitamin K2 & D3 (5000 IU) [Size->fixed: ]

## REVIVE Magnesium Glycinate - Bundle of 2 (`revive-magnesium-glycinate-1`)
- status ACTIVE, tags: bundle, Daily Health & Wellness Bundles, Health & Wellness, Informed Sports, Magnesium, Minerals, RECOVERY, REVIVE, sleep, Sleep Health
- SEO: REVIVE Magnesium Glycinate Bundle of 2 | Stock Up & Save | SNH Sri Lanka / Buy 2 x REVIVE Magnesium Glycinate at SNH Sri Lanka. Supports sleep, recovery & stress. Highly bioavailable glycinate form. Informed-Sport certified. Save more when you bundle.
- options: ['Title']
- variants: 1; first SKU SNH-MGB, price 13999.00, compare-at 16598.00
- components: 2 x REVIVE Magnesium Glycinate [Size->fixed: 60 Servings]

