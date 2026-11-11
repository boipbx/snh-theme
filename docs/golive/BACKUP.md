# Go-live backup: old values before each change (9 Nov 2026)

Every setting changed during the emails + points fix, with its value before the change. Nothing was deleted.

## Klaviyo lists: opt-in process

| List | ID | Before | After |
|---|---|---|---|
| Newsletter | RSUrNe | double_opt_in | single_opt_in |
| Quiz takers | Sn8Tiy | double_opt_in | single_opt_in |
| Wholesale leads | XEMhuB | double_opt_in | single_opt_in |
| Franchise leads | VMJ9CJ | double_opt_in | single_opt_in |

## Redemptions (Trigger_Redeem_2500): values before

| Customer ID | Points before | Tag before | Code created | Points after |
|---|---|---|---|---|
| 9142627664126 | 2900 | Trigger_Redeem_2500 | ELITE-64126-6DD8E7 (Rs 2,500, single use, this customer, until 2027-02-07) | 400 |
| 9259200315646 | 9961 | Trigger_Redeem_2500 | ELITE-15646-D6F7C1 (Rs 2,500, single use, this customer, until 2027-02-07) | 7461 |
| 9334694183166 | 5525 | Trigger_Redeem_2500 | ELITE-83166-F1669A (Rs 2,500, single use, this customer, until 2027-02-07) | 3025 |

## Shopify customer metafields

- **Back-fill (step 8):** `docs/golive/points-backup.csv` holds every customer with a paid order in the last 12 months
  (8,374) with their `loyalty_points`, `loyalty_tier`, `annual_spend` **before** the change (blank = empty) and the
  expected values. Only rows whose current points were **blank** were written (3,667). Tier was only raised (never
  lowered) and annual spend only set when blank or lower. Each written customer also got
  `custom.points_backfill` = "2026-11-09 backfill: N paid orders, Rs X (12 months)".
- **Welcome points (step 9):** `docs/golive/welcome-points-backup.csv` lists the 9,927 customers created since
  10 Oct 2026 whose points were blank before (current tier shown where one existed); they got 500 + Bronze (tier only
  when blank).
- **Not changed, for review:** `docs/golive/points-review.csv` (870 customers whose existing balance is lower than
  the formula; their balance comes from the existing loyalty system and likely already reflects redemptions).

To undo a customer: set the three metafields back to the "current_*" values in the CSV (blank = delete the metafield).

## Theme settings (10 Nov 2026)

| Where | Setting | Before | After |
|---|---|---|---|
| Home → "The SNH standard" (snh_why) | Video URL (`bg_video_url`) | `https://cdn.shopify.com/s/files/1/0258/9625/5550/files/SNHMAINBRANDVIDEO1-ezgif.com-video-to-webp-converter.webp?v=1793769075` (37 MB animated WebP, phones only saw its first frame) | `asset:snh-brand-loop.mp4` (the same clip as a 1.3 MB MP4, plays on phones too) |

## Klaviyo: never-subscribed profiles suppressed (10 Nov 2026)

Why: Klaviyo bills on *active* profiles. 9,053 were active but only 584 were subscribed to email; the other 8,469
were Shopify customers synced in who never subscribed (email consent NEVER_SUBSCRIBED). The account was on the free
plan (250 profiles / 500 sends a month), which is what stopped all sending on 8 Nov; the cheapest plan that fit 9,053
profiles was USD 150/month.

- **Before:** 8,469 profiles with email, consent NEVER_SUBSCRIBED, not suppressed.
- **After:** the same profiles **suppressed** (85 bulk suppression jobs of 100). Nothing deleted: profiles, events and
  order history stay. Anyone who later subscribes (site form, popup, checkout opt-in) can be emailed again.
- **Backup:** Klaviyo list **"Backup · never-subscribed, suppressed 10 Nov 2026"** (id `R989Dd`) holds all 8,469
  (adding to a list doesn't subscribe or email anyone), and `docs/golive/klaviyo-suppression-backup.csv` lists their
  Klaviyo profile IDs (no emails in the repo).
- **Undo:** run a bulk *unsuppress* (`profile-suppression-bulk-delete-jobs`) for the list `R989Dd`, or in Klaviyo:
  Lists → that list → select all → Unsuppress.

## Careers page (11 Nov 2026)

Careers (/pages/careers, template page.contact): the "See open roles" button pointed to
`/pages/work-with-us` (404) → now `#open-roles`, and the **Rooster job board** (company id 152788, the list where
applicants open a role and send their CV) is back as section `open_roles`, restyled. It had been dropped in Round 11
together with the old custom-HTML careers block.
- Wholesale + Franchise pages: 3 links to `/pages/locations-info` (404, no such page) → `/#stores` (the store list on
  the home page). Site-wide link check, 290 internal pages: no other broken links.
  (Final form: Shopify's sync kept rejecting the template edit, so the template is back as it was and the job board is
  rendered by `snippets/snh-careers-roles.liquid` from `sections/snh-feature.liquid` on /pages/careers only; the
  button's old `/pages/work-with-us` link is swapped for `#open-roles` there.)

## Shipping rates (11 Nov 2026) — old values: docs/golive/shipping-backup-2026-11-11.json

Why: 41 orders over Rs 17,000 in 30 days paid 599 / 1,198 shipping. "Standard Delivery 599" had no price limit in
either profile, and the General profile (61 newer products) had no FREE SHIPPING rate at all.

| Profile | Rate | Before | After |
|---|---|---|---|
| SHIP 26 (500 variants) | Standard Delivery 599 | any order price | orders Rs 0 – 16,999.99 |
| SHIP 26 | FREE SHIPPING 0 | ≥ 17,000 | unchanged |
| General profile (185 variants) | Standard Delivery 599 | any order price | orders Rs 0 – 16,999.99 |
| General profile | FREE SHIPPING 0 | (didn't exist) | created, orders ≥ 17,000 |

Both verified by reading the profiles back after the change. Not done (needs approval): moving the 60 General-profile
products into SHIP 26 (list in docs/golive/general-profile-products-backup-2026-11-11.json), which would stop a cart
with products from both profiles paying 599 twice under Rs 17,000.

## Bundles (11 Nov 2026) — NOT changed
Backup + plan: docs/golive/bundle-components-backup-2026-11-11.json, bundle-fix-plan-2026-11-11.json. The API
refused the first test addition (bundles are owned by the Shopify Bundles app); nothing was modified.
