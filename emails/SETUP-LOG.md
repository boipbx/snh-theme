# Klaviyo setup log

Run on 6 Nov 2026 through the Klaviyo REST API (revision 2025-07-15), account **Sports Nutrition Hub** (LKR). The API key was used from the environment only (never printed, saved or committed). Scripts: `emails/klaviyo/` (`inventory.js`, `templates.js`, `audiences.js`, `flows.js`; re-runnable: they skip anything that already exists). IDs: `emails/klaviyo/state.json`.

> Security: the private key was pasted in chat. Revoke it in Klaviyo → Settings → API keys and create a new one.

## 0. WhatsApp number

Every email now uses **+94 77 977 3359** (wa.me/94779773359); `lib/modules.js`, rebuilt, 59/59 checks pass.

## 1. Read-only check

- Flows: 4 existing, all live: Post-Purchase Followup - Order Count Split (`SHNKdu`), Customer Thank You - New vs. Returning (`VsX7Lg`), Customer Winback - Standard (`X8B5Ft`), Abandoned Cart (`XienEv`). Not touched.
- Lists: Newsletter, SMS Subscribers. Segments: none. Templates: 8 (Klaviyo's sample newsletters).
- Shopify metrics: Placed Order ✔ (Shopify), Ordered Product ✔, Fulfilled Order ✔, Added to Cart ✔ (Shopify), Viewed Product ✔ (onsite / API), Active on Site ✔ (onsite / API). **Started Checkout is named "Checkout Started"** in this account (the new Shopify integration): the checkout flow uses it. Also present: Cancelled Order, Refunded Order, Delivered Shipment, Subscribed to Back in Stock.
- Custom metrics the Elite / quiz emails need are **not there yet**: `Workout Plan Unlocked`, `Elite Near Reward`, `Elite Running Low`, `Elite Reward Redeemed`, `Elite Points Expiring`. They appear once the theme (quiz) and the SNH Elite app send them.
- Profile properties (600 profiles sampled): only Shopify defaults (`Accepts Marketing`, `Shopify Tags`, `Expected Date Of Next Order`, consent fields). **No `loyalty_tier`, `loyalty_points`, `annual_spend`**, and no `goal:` tags yet (the new theme's quiz isn't live).

### How to sync the Elite properties (not changed here)

1. **Shopify Flow → Klaviyo** (recommended now): Shopify admin → Apps → Flow → Create workflow → trigger **Customer metafield updated** (or **Order paid**) → action **Klaviyo: Update profile** (install the Klaviyo connector for Flow) → map `loyalty_tier` ← `customer.metafields.custom.loyalty_tier`, `loyalty_points` ← `custom.loyalty_points`, `annual_spend` ← `custom.annual_spend`, `points_value_rs` (= points), `next_tier`, `rs_to_next_tier`, `next_tier_progress`, `earn_rate` (3 / 7 / 10). Turn on.
2. **Or a nightly CSV**: export customers with those metafields → Klaviyo → Audience → Profiles → Import → map the columns to the property names → "update existing profiles".
3. **Later:** the SNH Elite app writes them through the Profiles API and sends the Elite events.
4. Goal / quiz: nothing to do. The new theme sends `snh_goal`, `snh_days`, `snh_level`, `snh_sport`, `snh_plan_id` and the `Workout Plan Unlocked` event once live (KLAVIYO-WORKOUT.md). Klaviyo's Shopify integration already syncs customer tags as `Shopify Tags` (Integrations → Shopify → Settings: keep "Sync customer tags" on).

## 2. Templates: 44 created, all verified by GET

Code-editor templates named `SNH · <flow> · <email>` (HTML + plain text):

| email | template id | name |
|---|---|---|
| welcome-1 | `XUUiye` | SNH · Welcome series · welcome + 500 Elite points |
| welcome-2 | `USsjNv` | SNH · Welcome series · how SNH Elite works |
| welcome-3 | `TCqezf` | SNH · Welcome series · best sellers + quiz |
| quiz-plan | `UaN2Qu` | SNH · Quiz + workout plan · your stack + free workout plan |
| quiz-checkin | `X8CKeP` | SNH · Quiz + workout plan · day-3 check-in |
| quiz-save-plan | `REHQmY` | SNH · Quiz + workout plan · save your plan (guest → account) |
| popup-code | `X3ZuTr` | SNH · Email popup game · Popup 1: your discount code |
| popup-expiring | `VMXpEb` | SNH · Email popup game · Popup 2: code expiring |
| cart-1 | `TUUfNi` | SNH · Abandoned cart · Cart 1: reminder |
| cart-2 | `ThTdbF` | SNH · Abandoned cart · Cart 2: social proof + Koko |
| cart-3 | `RqQ5jN` | SNH · Abandoned cart · Cart 3: last call (+ bundle) |
| checkout-1 | `TKDK7w` | SNH · Abandoned checkout · Checkout 1: finish your order |
| checkout-2 | `Udqh3m` | SNH · Abandoned checkout · Checkout 2: questions? we can help |
| browse-1 | `YkDQjy` | SNH · Browse abandonment · still interested? |
| browse-2 | `X6BK6i` | SNH · Browse abandonment · goes well with |
| back-in-stock | `RCGQdt` | SNH · Back in stock · Back in stock |
| price-drop | `WikbLT` | SNH · Price drop · Price drop |
| post-thanks | `TNfZip` | SNH · Post-purchase · Thank you + points earned |
| howto-protein | `THCJWZ` | SNH · Post-purchase · How to use: protein |
| howto-creatine | `UT3zQR` | SNH · Post-purchase · How to use: creatine |
| howto-preworkout | `RQzB78` | SNH · Post-purchase · How to use: pre-workout |
| howto-hydration | `UbpgSQ` | SNH · Post-purchase · How to use: hydration (SiS) |
| review-request | `SVmbDA` | SNH · Post-purchase · Review request (Judge.me) |
| replenishment | `XFBMyq` | SNH · Post-purchase · Replenishment: running low |
| cross-sell | `UD9NNF` | SNH · Post-purchase · Cross-sell bundle |
| elite-statement | `QXEMsj` | SNH · SNH Elite · Monthly points statement |
| elite-upgrade-silver | `Rw4zHy` | SNH · SNH Elite · Tier upgrade: Silver |
| elite-upgrade-gold | `TQSfvg` | SNH · SNH Elite · Tier upgrade: Gold |
| elite-close-tier | `QNqgKx` | SNH · SNH Elite · Close to next tier |
| elite-reward-ready | `Xm6LaQ` | SNH · SNH Elite · Reward ready (2,500 points) |
| elite-redeemed | `SwcTUC` | SNH · SNH Elite · Redeem confirmation |
| elite-expiring | `TFBJNu` | SNH · SNH Elite · Points expiring |
| elite-birthday | `WDstcP` | SNH · SNH Elite · Birthday reward (Silver 10% / Gold 15%) |
| winback-1 | `RNyAWB` | SNH · Win-back · we miss you |
| winback-2 | `WyPcRr` | SNH · Win-back · a reason to come back |
| sunset | `RHVkBd` | SNH · Win-back · Sunset: still want our emails? |
| wholesale-autoreply | `Sgj8Ss` | SNH · Business · Wholesale enquiry auto-reply |
| franchise-autoreply | `X2zJMg` | SNH · Business · Franchise enquiry auto-reply |
| referral-notify | `YbYzF8` | SNH · Business · Referral “coming soon” confirmation |
| campaign-launch | `XyXx4v` | SNH · Campaign · New launch |
| campaign-brand | `VFUpcC` | SNH · Campaign · Brand of the month |
| campaign-sale | `S2rmQg` | SNH · Campaign · Sale / offer |
| campaign-newsletter | `Yz7Rfz` | SNH · Campaign · Newsletter (3 article cards) |
| campaign-store | `XRtyhy` | SNH · Campaign · Store event / news |

## 3. Lists and segments

| name | type | result |
|---|---|---|
| Newsletter | list | exists (kept) |
| Quiz takers | list | created `Sn8Tiy` |
| Wholesale leads | list | created `XEMhuB` |
| Franchise leads | list | created `VMJ9CJ` |
| SNH Elite · Bronze | segment | **not created**: 400 invalid Invalid input.: Profile property properties['loyalty_tier'] does not exist for this company. |
| SNH Elite · Silver | segment | **not created**: 400 invalid Invalid input.: Profile property properties['loyalty_tier'] does not exist for this company. |
| SNH Elite · Gold | segment | **not created**: 400 invalid Invalid input.: Profile property properties['loyalty_tier'] does not exist for this company. |
| SNH · Engaged 90d | segment | created `TEMeJF` |
| SNH · Unengaged 180d | segment | created `U8xLEw` |

The three **SNH Elite · Bronze / Silver / Gold** segments are refused until at least one profile has `loyalty_tier` (Klaviyo only segments on known properties). After the first sync, re-run `node emails/klaviyo/audiences.js` (it creates only what is missing), or build them in Klaviyo: Segments → Create → "Properties about someone" → `loyalty_tier` equals `Silver`.

Engaged 90d = opened or clicked an email in the last 90 days. Unengaged 180d = received an email in the last 180 days and opened none and clicked none.

## 4. Flows: 12 created as **Draft**, 12 manual

Every flow and every email in it is Draft (verified by GET). Sender: support@sportsnutritionhub.lk / "Sports Nutrition Hub - SNH". Smart sending on for marketing emails, off for the two enquiry replies. UTM tracking on.

| flow | id | trigger | filter | steps |
|---|---|---|---|---|
| SNH · Welcome series | `XBVMgh` | list Newsletter | no Placed Order since start | welcome-1 · 2 d · welcome-2 · 2 d · welcome-3 |
| SNH · Abandoned cart | `UqNxS8` | Added to Cart | no Checkout Started, no Placed Order since start | 2 h · cart-1 · 1 d · cart-2 · 2 d · cart-3 |
| SNH · Abandoned checkout | `VqWS5c` | Checkout Started | no Placed Order since start | 1 h · checkout-1 · 1 d · checkout-2 |
| SNH · Browse abandonment | `VfGmnq` | Viewed Product | no Added to Cart, no Placed Order since start | 4 h · browse-1 · 2 d · browse-2 |
| SNH · Post-purchase | `QSz343` | Placed Order | — | 1 h · post-thanks · 14 d · cross-sell |
| SNH · Review request | `YrpQEq` | Fulfilled Order | — | 7 d · review-request |
| SNH · How to use | `U4gwk3` | Fulfilled Order | — | 3 d · howto-protein (add the category split: FLOWS-MANUAL.md) |
| SNH · Replenishment | `TSZZDf` | Placed Order | no Placed Order since start | 25 d · replenishment |
| SNH · Win-back | `X9kKgD` | Placed Order | no Placed Order since start | 90 d · winback-1 · 14 d · winback-2 |
| SNH · Sunset | `TiBddv` | segment Unengaged 180d | — | sunset |
| SNH · Wholesale enquiry reply | `VyMCDP` | list Wholesale leads | — | wholesale-autoreply |
| SNH · Franchise enquiry reply | `TB7esy` | list Franchise leads | — | franchise-autoreply |

Manual (the trigger does not exist in the account yet, or needs Klaviyo's special trigger): Quiz plan, Popup code, Back in stock, Price drop, Elite statement, Tier upgrade, Close to next tier, Reward ready, Redeem confirmation, Points expiring, Birthday, Referral notify, plus the How-to-use category split. Steps + Composer prompts: `FLOWS-MANUAL.md`.

## 5. Shopify notifications

No API: `SHOPIFY-PASTE-GUIDE.md`.

