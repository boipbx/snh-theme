# Bundle thumbnails replaced with Khizer's designs (17 Nov 2026)

25 of the 28 new bundles now open with the designer image. Nothing else on any product was touched: prices, variants, components, descriptions and status are unchanged. No product was created.

## Source

- The three Drive folders are link-shared, so they were read through the public folder view; the connected Drive account itself has no access to them.
- 39 images: folder 1 "ryse" (5), folder 2 "revive pt" (20), folder 3 "RAW" (14). Full list with size and dimensions: `THUMBNAIL-MAP.csv`.
- Every image is a 2000 × 2000 JPG between 0.16 and 0.49 MB, sharp, on white. **None was padded, cropped or re-saved.** Each was uploaded exactly as designed.

## Decisions

- The fixed mapping in the brief was used for its 8 files; the other 17 matched a bundle title exactly after normalising ("&" = "and", hyphens, "month(s)"). No ambiguous match, no bundle with two candidate images.
- Only bundles tagged `bundles-nov26` were changed. The 26 older bundles were not touched.
- Folder 3 (RAW/CBUM) was listed only. Nothing from it was uploaded.
- New hero: uploaded, moved to position 1, alt text = the bundle title, file name `<handle>-hero.jpg`.
- Old hero (the composite made in the bundles-nov26 work, `<handle>-0.jpg`): removed from the product after the new one was in place. The single-product images after it keep their order.
- `scripts/sync-bundle-links.mjs` stores no images (the "Save with a bundle" rows read each bundle's live featured image), so it did not need a run.

## Updated (25)

| Bundle | File |
|---|---|
| Unwind | unwind.jpg |
| Godzilla Beast Mode | godzilla beast mode.jpg |
| Loaded Pre + Pre MAX Duo | loaded pre + max duo.jpg |
| Loaded Pre Flavour Duo | loaded pre flavor duo.jpg |
| RYSE Loaded Stack | loaded stack.jpg |
| RYSE x RAW | raw + ryse.jpg |
| 24-Hour Pack | 24 hour pack.jpg |
| 3-Month Magnesium | 3 month magnesium.jpg |
| 3-Month Daily | 3 months couple daily.jpg |
| Athlete Recovery | athlete recovery.jpg |
| Build & Recover | build and recover.jpg |
| Calm & Focus | calm & focus.jpg |
| Couples Daily | couples daily.jpg |
| Revive Daily Plus | daily+.jpg |
| Revive Deep Sleep Stack | deep sleep.jpg |
| Executive Stack | executive stack.jpg |
| Full Reset | full reset.jpg |
| Gut & Liver Reset | Gut and liver reset.jpg |
| Gut Reset | gut reset.jpg |
| Her Wellness+ | her wellness+.jpg |
| Her Wellness | her wellness.jpg |
| Longevity Duo | longevity duo.jpg |
| Longevity Premium | longevity premium.jpg |
| Revive Strength | revive strength.jpg |
| Sleep Starter | sleep starter.jpg |

## Not uploaded: folder 3, RAW/CBUM set (no such bundles in Shopify)

- body builders kitchen.jpg
- cbum complete charged.jpg
- cbum complete.jpg
- charged + creatine.jpg
- charged day & nite.jpg
- clean cut.jpg
- creatine 30 duo.jpg
- creatine 50 duo.jpg
- day and night pre.jpg
- essentials pre trio.jpg
- flavor trio.jpg
- gym buddy pack.jpg
- max pump.jpg
- thavge + creatine.jpg

These look like a planned RAW range (CBUM Complete, Gym Buddy Pack, Clean Cut, creatine and pre-workout duos and trios). None matches an existing bundle. The existing "RAW Full Loaded Stack" and "RAW Premium Training Stack" are older bundles with their own thumbnails.

## Still on the earlier thumbnails (no designer image yet)

- Bar Box 6
- Bar Box 12
- Stim + Pump Stack

## Backup and restore

- `docs/golive/backup-thumbnails-2026-11-17/<handle>.json`: the media list before the change (IDs, URLs, alt, order).
- `docs/golive/backup-thumbnails-2026-11-17/<handle>-old-hero.jpg`: the old hero file.
- To restore one bundle: upload its `-old-hero.jpg`, move it to position 1, remove `<handle>-hero.jpg`.

## Checked live (375 and 1440)

- Bundle Offers collection: 25 cards show the designer image; none cropped or stretched in the 1:1 frame; no sideways scroll.
- Product pages Godzilla Beast Mode, Revive Deep Sleep Stack, 3-Month Daily: gallery opens on the new image, no duplicates, same number of images as before.
- Search for "bundle": 54 rows, 25 with the designer image.
- No page errors.

Screenshots: `docs/golive/thumbnails-2026-11-17/` (`collection-`, `pdp-<handle>-`, `search-bundle-`, each at `-1440.jpg` and `-375.jpg`).
