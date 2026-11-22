# 360 dossier, section 18: appendix

This is the companion to `docs/360.md`. Paths are relative to the repo root on branch `feat/theme-v2` unless marked "emails branch". Sources are named in *[brackets]*.

## A. Key file paths

**Storefront**

| Area | Files |
|---|---|
| Shared styles and behaviour | `assets/snh-v2.css`, `assets/snh-v2.js` *[THEME-V2.md]* |
| Header and footer | `sections/snh-header.liquid`, `sections/snh-footer.liquid` *[THEME-V2.md]* |
| Product card | `snippets/snh-v2-card.liquid`; image lookup `snippets/snh-clean-img.liquid` (now returns nothing) *[THEME-V2.md, CARD-AUDIT.md]* |
| Product page | `sections/snh-product.liquid`, `assets/snh-zoom.js` (viewer), `snippets/snh-info-media.liquid` (info slides), `snippets/snh-restock.liquid`, `snippets/snh-v2-bundles.liquid` *[THEME-V2.md, QA-ROUND-REPORT.md, IMAGE-AUDIT.md, SEARCH-RESTORE.md, BUNDLES-CC-REPORT.md]* |
| Search | `assets/snh-search.js` (engine), `sections/main-search.liquid` *[SEARCH-RESTORE.md]* |
| Filters | `snippets/facets-vertical` *[QA-ROUND-REPORT.md]* |
| Cart | `sections/cart-drawer`, `sections/snh-cart-page`, `assets/snh-cart.js`, `assets/snh-cart.css`, `snippets/snh-cart-cfg` *[THEME-V2.md]* |
| Recommendations | `assets/snh-cart-reco.js`, `snippets/snh-cart-reco.liquid` *[RECO.md]* |
| Pickup outlets | `snippets/snh-pickup-outlets.liquid` *[CLICK-COLLECT-ADMIN.md]* |
| Account / Elite | `sections/snh-account-app`, `snippets/snh-app*`, `snippets/snh-elite-calc`, `sections/snh-elite-page` *[ELITE-ROADMAP.md, LOYALTY-NOTES.md, THEME-V2.md]* |
| Quiz and plans | `sections/snh-quiz-band.liquid`, `snippets/snh-workout-plans.liquid`, `assets/snh-app.js` *[WORKOUT-PLANS.md]* |
| Popups and campaigns | `sections/snh-email-capture`, `assets/snh-capture.js`; campaigns in the header group *[THEME-V2.md, CAMPAIGNS.md]* |
| Koko | `snippets/koko-checkout-modal.liquid`, `snippets/snh-koko-logo`; Worker source `docs/koko-worker/worker.js` *[docs/koko-worker/README.md, git 0e75b31]* |
| Reference only (never a section) | `docs/reference/old-header-v6.liquid` *[SEARCH-RESTORE.md]* |

**Services, apps, emails and logs**

| Area | Files |
|---|---|
| SNH Ops app | `apps/snh-ops/` (`src/worker.mjs`, `sync.mjs`, `redeem.mjs`, `metrics.mjs`, `shopify.mjs`, `klaviyo.mjs`, `auth.mjs`; `ui/app.html`; `schema.sql`; `wrangler.toml`; `config/example-store.json`) *[apps/snh-ops/README.md]* |
| Click & collect service | `scripts/click-collect/` (`src/logic.mjs`, `src/run.mjs`, `src/worker.mjs`, `cli.mjs`) *[CLICK-COLLECT-DEPLOY.md]* |
| SMS service | `scripts/sms/` *[SMS-PLAN.md]* |
| Emails (emails branch) | `emails/` (MJML source, `dist/shopify/*.html`, `dist/klaviyo/*.html`, `INDEX.md`, `SETUP-KLAVIYO.md`, `SETUP-SHOPIFY.md`, `SHOPIFY-PASTE-GUIDE.md`, `FLOWS-MANUAL.md`, `CHECK.md`, `SETUP-LOG.md`) *[git]* |
| Go-live docs and logs | `docs/golive/` (every write: `WRITE-LOG.md`; earlier old values: `BACKUP.md`) |
| Case study | `docs/case-study/pairs/` (32 PNG pairs + `BEFORE-AFTER.md`) |

## B. Scripts and how to run them

Every store script reads `SHOPIFY_STORE`, `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET` from the environment, gets a token by client credentials and never prints it. Always run `--dry-run` first.

| Script | What it does | Run |
|---|---|---|
| `scripts/activate-bundles.mjs` | Activates `bundles-nov26` drafts that have an image, stocked components and compare-at above price; then syncs bundle links | `node scripts/activate-bundles.mjs --dry-run`, then without the flag |
| `scripts/sync-bundle-links.mjs` | Writes `custom.in_bundles` on every component of an active bundle (biggest saving first); backs up to `docs/golive/backup-bundle-links/` and logs to `WRITE-LOG.md` | `node scripts/sync-bundle-links.mjs --dry-run` |
| `scripts/create-sunday-codes.mjs` | Creates the next SUN15-DDMON codes (15% SiS, Sundays) | `node scripts/create-sunday-codes.mjs --dry-run`, then `node scripts/create-sunday-codes.mjs 12` |
| `scripts/create-saturday-codes.mjs` | Old Saturday codes. **Refuses to run** (the deal is in-store only) | do not use *[POLISH-REPORT.md]* |
| `scripts/click-collect/` | 48-hour pickup service | tests: `node --test scripts/click-collect/test/logic.test.mjs`; local run: `node scripts/click-collect/cli.mjs`; deploy: `CLICK-COLLECT-DEPLOY.md` |
| `scripts/sms/` | Order SMS (dry run by default) | tests: `node --test scripts/sms/test/sms.test.mjs`; local: `node scripts/sms/cli.mjs`; deploy: `SMS-PLAN.md` |
| `apps/snh-ops/` | Dashboard, sync and redeem service | tests: `node --experimental-sqlite --test test/*.test.mjs` (50 pass on 22 Nov); local sync: `node --experimental-sqlite local.mjs sync`; local UI: `node --experimental-sqlite local.mjs serve`; deploy: `npx wrangler deploy` in `apps/snh-ops` *[apps/snh-ops/README.md, OPS-APP-INSTALL.md]* |

## C. Theme settings added (Theme settings → …)

Read from `config/settings_schema.json` on 22 Nov.

| Group | Settings |
|---|---|
| SNH Elite | Tier rates (Bronze / Silver / Gold), Silver and Gold thresholds, welcome points, Klaviyo company and workout list, **Pause redemption** (`loyalty_redeem_paused`), redeem from, point value, perks per tier |
| SNH bundle offers | Bundle collections, bundle map, cart bundle offer, confetti, offers 1–12 (products, title, saving) |
| SNH cart suggestions | "Close the gap" minimum and percentage, add-on limits, complement pairs, recommendation collections, bestsellers collection |
| SNH contact and reviews | Hero image to preload, **SNH WhatsApp**, **Restock WhatsApp number**, WhatsApp community link (empty), exclusive brands, rating value/count/source, global FAQ, Instagram token |
| SNH product images | Use cleaned product images, cleaned image list, frame keywords |

Not in these groups: the social link `social_whatsapp` and the Amose app embed (switched off 14 Nov) *[WHATSAPP-NUMBERS.md, AMOSE-CHECK.md]*.

## D. Metafields and tags

**Customer metafields** *[SHOPIFY-FLOWS.md, REDEEM-GO-LIVE.md, theme code]*

| Metafield | Meaning |
|---|---|
| `custom.loyalty_points` | points balance |
| `custom.loyalty_tier` | Bronze / Silver / Gold / MAXED OUT |
| `custom.annual_spend` | rupees this year |
| `custom.last_reward_code`, `custom.reward_codes` | reward codes |
| `custom.redeem_status` | redeem status |

Also read by the theme: `custom.birthday`, `custom.joined_at`, `custom.avatar`.

**Product metafields** *[BUNDLE-REFERENCE.md, IMAGE-AUDIT.md, SATURDAY-SIS-LOG.md, theme code]*

| Metafield | Meaning |
|---|---|
| `custom.in_bundles` | the "Save with a bundle" row |
| `custom.clean_images` | which gallery slides use a cleaned copy |
| `custom.bundle_contents`, `custom.summery_brief`, `custom.key_benefits`, `custom.how_to_use` | bundle content |

Also used: `custom.faqs`, `custom.ingredients`, `custom.servings`, `custom.retail_price`, `custom.badges`, `custom.subtitle`, `custom.stats`.

**Customer tags**

| Tag | Meaning | Source |
|---|---|---|
| `Trigger_Redeem_2500` | redeem request | LOYALTY-NOTES.md |
| `welcome_awarded` | welcome points given by the Worker | REDEEM-GO-LIVE.md |
| `qa-test` | QA customers only | LOYALTY-FLOW-TEST.md |
| `notify:referrals` | wants the referral launch | BACKEND-AUDIT.md |
| `Welcome_Free_Shipping` | written by the old welcome Flow | LOYALTY-FLOW-TEST.md |
| `goal:*`, `plan:<id>` | quiz and plan | WORKOUT-PLANS.md, emails: SETUP-KLAVIYO.md |

**Order tags** *[CLICK-COLLECT-DEPLOY.md, LOG.md]*

| Tag | Meaning |
|---|---|
| `pickup-reminded-24h` | first pickup reminder sent |
| `pickup-overdue` | paid order past 48 hours |
| `auto-cancelled-pickup` | unpaid order cancelled at 48 hours |
| `pickup-hold` | staff gave more time; the service skips it |
| `check-payment` | delivery order paid "at the store" |
| `points_awarded` | planned; nothing writes it yet |

**Product tags**

| Tag | Meaning | Source |
|---|---|---|
| `bundles-nov26` | the 28 new bundles | BUNDLES-CC-REPORT.md |
| `orig-images` | forces the original photos | IMAGE-AUDIT.md |
| `bundle`, plus the bundle-collection and goal tags | bundle grouping | BUNDLE-REFERENCE.md |

**Discount code patterns**

| Pattern | Meaning | Source |
|---|---|---|
| `ELITE-…` | Rs 2,500 rewards | REDEEM-GO-LIVE.md |
| `SUN15-DDMON` | Sunday SiS deal | SUNDAY-CODES.md |
| `SIS15-DDMON` | Saturday deal; all expired | SATURDAY-SIS-LOG.md |

## E. Rollback and backups

| What | How to roll back | Source |
|---|---|---|
| Whole theme | Re-publish the old theme "New store Menu launch" (154272432382); or revert commits on `feat/theme-v2` (each push goes live) | PARITY.md |
| Redemption | Tick "Pause redemption"; set `REDEEM_MODE = "qa"` and deploy. One redemption: deactivate the code, add 2,500 points back (old values in D1 `redeem_requests.backup`) | REDEEM-GO-LIVE.md |
| Welcome points | `WELCOME_MODE = "qa"`, deploy, turn the old Flow back on | REDEEM-GO-LIVE.md |
| Card thumbnails | Restore files from `docs/golive/backup-cards-2026-11-18/` | CARD-AUDIT.md |
| Product galleries | `docs/golive/backup-images-2026-11-18/<handle>.json` (220 products) and `/theme/`; or the setting "Use cleaned product images" | IMAGE-AUDIT.md |
| Bundle thumbnails | `docs/golive/backup-thumbnails-2026-11-17/` (`<handle>-old-hero.jpg`) | THUMBNAIL-LOG.md |
| Bundle links | `docs/golive/backup-bundle-links/` | sync-bundle-links.mjs |
| Bundle activation | `docs/golive/backup-2026-11-14/bundles-before-activation.json` | WRITE-LOG.md |
| Bundle components (old bundles) | `bundle-components-backup-2026-11-11.json`, `bundle-fix-plan-2026-11-11.json` (plan not applied) | BACKUP.md |
| Shipping rates | `shipping-backup-2026-11-11.json`, `general-profile-products-backup-2026-11-11.json` | BACKUP.md |
| Klaviyo suppression | Unsuppress the list "Backup · never-subscribed, suppressed 10 Nov 2026"; IDs in `klaviyo-suppression-backup.csv` | BACKUP.md |
| Points back-fill | `points-backup.csv`, `welcome-points-backup.csv`; review list `points-review.csv` | LOG.md |
| Saturday deal removal | `backup-sat-off-2026-11-14/`, `backup-sis-2026-11-14/` | SATURDAY-SIS-LOG.md |
| Amose embed | `backup-2026-11-14/settings_data.before-amose.json` | AMOSE-CHECK.md |
| Redemption pause / My rewards | `backup-2026-11-16/`, `backup-2026-11-16b/` | LOYALTY-AUDIT.md, REDEEM-GO-LIVE.md |
| Search restore | `backup-2026-11-16c/` | SEARCH-RESTORE.md |
| QA round, bundles, click & collect | `backup-qa-2026-11-14/`, `backup-2026-11-13/` | QA-ROUND-REPORT.md, BUNDLES-CC-REPORT.md |
| Bundle Offers collection rule | Admin → Collections → BUNDLE OFFERS → condition "Title ends with Bundle" | BACKUP.md |
| Koko worker | Cloudflare → koko-fee-snh → Deployments → previous version → Rollback | docs/koko-worker/README.md |
| Every Admin API write | `docs/golive/WRITE-LOG.md` (time, mutation, object, before, after) | — |

**Live identifiers** (no secrets)

| Identifier | Value |
|---|---|
| Live theme | 189832462590 |
| Old theme | 154272432382 |
| Dev theme | 189336944894 |
| D1 database | `snh-ops` (ID in `apps/snh-ops/wrangler.toml`) |
| SNH Ops Worker | https://snh-ops.raspy-wind-fe2d.workers.dev |
| SiS collection | 453152768254 |
| Klaviyo "Reward ready" flow | YeK7UL |

*[PARITY.md, THEME-V2.md, OPS-APP-INSTALL.md, SUNDAY-CODES.md, WRITE-LOG.md]*
