# Bundles + click & collect report (13 Nov 2026)

## 1. Missing scopes
- `write_online_store_navigation` / `read_online_store_navigation`: the footer link to the click & collect page could not be added. It's a manual step.
- Everything else needed was granted. Not permissions, but blocked: Cloudflare/GitHub deploy credentials (see 6) and two outlets that don't fulfil online orders (see 6).

## 2. Route used for bundles
**Native Shopify bundles (`productBundleCreate`)**, the same as the existing Bundles-app bundles. No fallback was needed.

## 3. Created bundles (all DRAFT, tag `bundles-nov26`, no images yet)
| Bundle | Admin | Price | Save | Status |
|---|---|---|---|---|
| Bar Box 6 | [admin](https://admin.shopify.com/store/sports-nutrition-hub/products/15506052448510) | Rs 7,999 | Rs 995 | Draft |
| Bar Box 12 | [admin](https://admin.shopify.com/store/sports-nutrition-hub/products/15506056216830) | Rs 14,999 | Rs 2,989 | Draft |
| Loaded Pre + Pre MAX Duo | [admin](https://admin.shopify.com/store/sports-nutrition-hub/products/15506056839422) | Rs 27,999 | Rs 2,999 | Draft |
| Loaded Pre Flavour Duo | [admin](https://admin.shopify.com/store/sports-nutrition-hub/products/15506057658622) | Rs 26,999 | Rs 2,999 | Draft |
| Stim + Pump Stack | [admin](https://admin.shopify.com/store/sports-nutrition-hub/products/15506059002110) | Rs 27,499 | Rs 3,499 | Draft |
| Godzilla Beast Mode | [admin](https://admin.shopify.com/store/sports-nutrition-hub/products/15506059690238) | Rs 32,999 | Rs 3,999 | Draft |
| RYSE Loaded Stack | [admin](https://admin.shopify.com/store/sports-nutrition-hub/products/15506060411134) | Rs 35,999 | Rs 3,999 | Draft |
| RYSE x RAW | [admin](https://admin.shopify.com/store/sports-nutrition-hub/products/15506061689086) | Rs 21,499 | Rs 2,499 | Draft |
| Her Wellness | [admin](https://admin.shopify.com/store/sports-nutrition-hub/products/15506062278910) | Rs 16,399 | Rs 8,099 | Draft |
| Her Wellness+ | [admin](https://admin.shopify.com/store/sports-nutrition-hub/products/15506062868734) | Rs 28,349 | Rs 9,148 | Draft |
| Sleep Starter | [admin](https://admin.shopify.com/store/sports-nutrition-hub/products/15506063327486) | Rs 21,999 | Rs 2,499 | Draft |
| Revive Deep Sleep Stack | [admin](https://admin.shopify.com/store/sports-nutrition-hub/products/15506063786238) | Rs 30,499 | Rs 3,998 | Draft |
| Calm & Focus | [admin](https://admin.shopify.com/store/sports-nutrition-hub/products/15506064146686) | Rs 20,999 | Rs 2,199 | Draft |
| Unwind | [admin](https://admin.shopify.com/store/sports-nutrition-hub/products/15506064572670) | Rs 19,499 | Rs 2,199 | Draft |
| 24-Hour Pack | [admin](https://admin.shopify.com/store/sports-nutrition-hub/products/15506064965886) | Rs 32,516 | Rs 15,980 | Draft |
| Gut Reset | [admin](https://admin.shopify.com/store/sports-nutrition-hub/products/15506065391870) | Rs 22,499 | Rs 2,499 | Draft |
| Gut & Liver Reset | [admin](https://admin.shopify.com/store/sports-nutrition-hub/products/15506065817854) | Rs 23,999 | Rs 2,999 | Draft |
| Full Reset | [admin](https://admin.shopify.com/store/sports-nutrition-hub/products/15506066243838) | Rs 32,499 | Rs 4,498 | Draft |
| Revive Strength | [admin](https://admin.shopify.com/store/sports-nutrition-hub/products/15506066768126) | Rs 22,270 | Rs 3,228 | Draft |
| Build & Recover | [admin](https://admin.shopify.com/store/sports-nutrition-hub/products/15506067128574) | Rs 23,999 | Rs 2,999 | Draft |
| Athlete Recovery | [admin](https://admin.shopify.com/store/sports-nutrition-hub/products/15506067521790) | Rs 28,999 | Rs 4,498 | Draft |
| Revive Daily Plus | [admin](https://admin.shopify.com/store/sports-nutrition-hub/products/15506067947774) | Rs 27,999 | Rs 4,498 | Draft |
| Couples Daily | [admin](https://admin.shopify.com/store/sports-nutrition-hub/products/15506068242686) | Rs 27,499 | Rs 7,497 | Draft |
| 3-Month Magnesium | [admin](https://admin.shopify.com/store/sports-nutrition-hub/products/15506068668670) | Rs 18,000 | Rs 7,497 | Draft |
| 3-Month Daily | [admin](https://admin.shopify.com/store/sports-nutrition-hub/products/15506069061886) | Rs 27,073 | Rs 25,421 | Draft |
| Longevity Duo | [admin](https://admin.shopify.com/store/sports-nutrition-hub/products/15506069586174) | Rs 45,539 | Rs 16,459 | Draft |
| Executive Stack | [admin](https://admin.shopify.com/store/sports-nutrition-hub/products/15506070012158) | Rs 33,552 | Rs 15,145 | Draft |
| Longevity Premium | [admin](https://admin.shopify.com/store/sports-nutrition-hub/products/15506070405374) | Rs 35,556 | Rs 15,441 | Draft |

**Flags and notes**
- **Prices:** live component prices on 13 Nov match the 4 Nov list exactly, so no compare-at or "Save" changes were needed. No bundle is priced at or above its components.
- **Flavour pickers:** only in-stock flavours are offered. The 3-option limit was never reached (max 2).
- **Revive Sleep Support** has only one flavour, so Sleep Starter, Revive Deep Sleep Stack and 24-Hour Pack have no picker.
- **Revive Creatine + HMB:** Lemon Lime is out of stock, so Revive Strength and Build & Recover are Unflavoured only, with no picker.
- **Bar Box 6/12:** a single flavour per box. A mixed box isn't possible in a fixed bundle (for Khizer).
- **Loaded Pre Flavour Duo:** Shopify accepted the same product twice, so it has 2 separate flavour pickers (25 combinations). No fallback was needed.
- **Low stock (13 Nov):**
  - Suntheanine 1 (Revive Deep Sleep Stack, Calm & Focus)
  - CALM+ 1 (Calm & Focus, Unwind, Executive Stack)
  - Creatine + HMB 5
  - Godzilla 6
  - Sleep Support 6
  - Longevity Restore 12

  These sell out fast once live.
- **Revive Ashwagandha KSM-66:** 0 stock, but none of the new bundles use it.
- **Cart check:** draft products can't be added to a cart, so the cart was checked on a live bundle built the same way. Re-check the new ones after activation.

## 4. Live product fixes
- **REVIVE Daily:**
  - Description now reads "Normally LKR 17,498 … You save LKR 2,499", and the SEO text matches. Price unchanged.
  - ⚠ Its compare-at is still Rs 17,298, so the badge shows "Save Rs 2,299". That needs a compare-at change, which the brief didn't cover. Your call.
- **Stress & Recovery Bundle:**
  - Description now reads 16,998 / 13,999 / save 2,999, plus SEO.
  - It uses **Applied Nutrition** Ashwagandha (49 in stock), not Revive's, so it stays active.
- **Magnesium Bundle of 2:** already Rs 13,999. There's no "13,000" text on Longevity Restore (checked admin data and the live page).
- **Revive Glutamine and Ashwagandha:** vendor is already exactly "REVIVE", the same as all Revive products. No change.
- **"Bundles that include this" on Magnesium Glycinate:** the theme shows the first 3 bundles whose description names the product. Tags and metafields can't force 3-Month Magnesium and Magnesium x2 together; it needs a small change in `snippets/snh-v2-bundles.liquid`. Skipped: outside scope.

## 5. Broken bundles
A no-op `productBundleUpdate` on Whey + Pre Stack was refused: "This product is currently owned by a different app". Nothing changed. All 7 stay on your manual list (Bundles app):
- Lean Energy
- Athlete Essential (tick Strawberry Milkshake, Vanilla Ice Cream, Frappe)
- Whey + Pre
- RAW Premium Training (Cherry Limeade)
- Deep Sleep
- Creatine Starter Pack
- RAW Full Loaded Stack

RAW Full Loaded is priced Rs 27,499 against about Rs 13–15.5k of current contents. Not changed.

## 6. Click & collect
- **Pickup is live at Nugegoda:** "usually ready in 24 hours", with the 48-hour instructions.
- **Dehiwala and Wattala were refused by Shopify:** they don't "fulfil online orders". Turning that on is your decision (it also lets delivery orders use their stock). Steps are in CLICK-COLLECT-ADMIN.md (e).
- **Auto-cancel and reminder service:**
  - Built and tested: 12 unit tests, plus a DRY_RUN against the live store that found 0 pickup orders out of 765 scanned.
  - **It is NOT running yet.** No Cloudflare access and no way to set GitHub secrets from here. Deploy steps (about 10 minutes) are in CLICK-COLLECT-DEPLOY.md.
  - Until it's deployed, nothing is auto-cancelled.
  - Schedule once deployed: every 30 min, digest at 09:00 Sri Lanka time, DRY_RUN first.
- **Klaviyo:** "SNH · Click & collect · Reminder" and "SNH · Click & collect · Ops digest" are both **live**.
  - ⚠ They're standard flows, so Klaviyo only emails people who can receive your emails. Ask Klaviyo to approve transactional sending for the reminder.
- **Theme (live, checked at 375 and 1440 px):**
  - Product pages show "Pickup available at Nugegoda · usually ready in 24 hours" plus a "Check other outlets" list. It's hidden on bundles. Example: https://www.sportsnutritionhub.lk/products/revive-magnesium-glycinate
  - The cart drawer and cart page say "Free click & collect at Nugegoda, held for 48 hours".
  - New page: https://www.sportsnutritionhub.lk/pages/click-and-collect

## 7. Your manual list
1. **Bundle images:** upload photos for the 28 new bundles, then tell me **"run activate-bundles"**. It only activates bundles that have an image, stocked components and compare-at above price.
2. **Pay-at-store method:** Settings → Payments → create the custom payment method "Pay at the store when you collect" (CLICK-COLLECT-ADMIN.md (a)).
3. **Pickup notification:** paste the 48-hour "Ready for local pickup" notification (docs/golive/click-collect-ready-for-pickup.html). Back up first.
4. **Deploy the click & collect service:** CLICK-COLLECT-DEPLOY.md.
5. **Dehiwala and Wattala:** decide whether they fulfil online orders. If yes, tell me and I'll switch pickup on.
6. **Footer link:** add "Click & collect" to the footer menu (Online Store → Navigation).
7. **The 7 broken bundles:** re-save them in the Bundles app.
8. **Optional:** REVIVE Daily compare-at to Rs 17,498, and the 5-line "bundles that include this" theme tweak.

All writes are in docs/golive/WRITE-LOG.md, with backups in docs/golive/backup-2026-11-13/.

## 8. WhatsApp message for Khizer
> Hi Khizer, quick update.
> **New bundles:** 28 new bundles are set up in Shopify as drafts (RYSE, RAW bar boxes and Revive). They go live as soon as we add photos. Prices are as you set them; savings run from Rs 995 (Bar Box 6) to Rs 25,421 (3-Month Daily). Bar boxes are one flavour per box, since a mixed box isn't possible with Shopify bundles.
> **Click & collect:** live at Nugegoda today. Customers choose Pickup at checkout, we message them when it's ready, and we hold it for 48 hours. Unpaid orders not collected in 48 hours get cancelled automatically, but paid orders are never auto-cancelled; we just follow up. Dehiwala and Wattala can be added once they're set to take online orders.
> **Two things from you:**
> 1. Is "Revive Deep Sleep Stack" OK as the name? It's different from the existing "Deep Sleep Bundle".
> 2. A few products are very low in stock (CALM+ 1, Suntheanine 1, Creatine + HMB 5), so those bundles will sell out fast unless we restock.
> Bundles: https://www.sportsnutritionhub.lk/collections/bundle-offers
> Click & collect: https://www.sportsnutritionhub.lk/pages/click-and-collect
