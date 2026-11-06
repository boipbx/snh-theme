# Klaviyo: set up the SNH flows

Every template is in `emails/dist/klaviyo/<id>.html` (subject, preheader and A/B subject in `INDEX.md` / `manifest.json`).

## 0. Once

1. **Integrations → Shopify**: connected, "Sync data" on, "Onsite tracking" on (gives Viewed Product, Added to Cart,
   Started Checkout, Placed Order, Fulfilled Order, Cancelled / Refunded Order). Turn on **Back in stock** in
   Klaviyo (Settings → Back in stock) and add the button to product pages if you want that flow.
2. **Templates**: for each file, *Content → Templates → Create template → Import → HTML*, paste the file, name it
   `SNH · <name>` (e.g. `SNH · Cart 1: reminder`). Klaviyo keeps the HTML as-is; edit text in the code editor.
3. **Lists**: `Newsletter` (footer + popup sign-ups), `SNH Elite members` (account sign-ups), `Popup` (the welcome game).
4. **Sender**: From name `SNH · Sports Nutrition Hub`, from address on your domain (set up the sending domain in
   Settings → Domains so mail is DKIM-signed).
5. **Unsubscribe / preferences**: every template uses `{% unsubscribe %}` and `{% manage_preferences %}`; keep them.

## 1. Profile properties to sync

The templates read these with `{{ person|lookup:'…' }}`. Keep them current on every profile:

| property | example | source |
|---|---|---|
| `loyalty_tier` | `Silver` | customer metafield `custom.loyalty_tier` |
| `loyalty_points` | `2180` | metafield `custom.loyalty_points` |
| `points_value_rs` | `2180` | points × point value (1 point = Rs 1) |
| `annual_spend` | `241500` | metafield `custom.annual_spend` (Rs this year) |
| `next_tier` · `rs_to_next_tier` · `next_tier_progress` · `next_tier_rate` | `Gold` · `58500` · `81` · `10` | from annual_spend vs Silver Rs 198,000 / Gold Rs 300,000 |
| `earn_rate` | `7` | the tier's rate (3 / 7 / 10) |
| `redeem_from` · `points_to_reward` · `reward_value_rs` | `2500` · `320` · `2500` | Theme settings → SNH Elite |
| `welcome_points` | `500` | Theme settings → SNH Elite |
| `birth_date` (date) · `birthday_pct` · `birthday_code` | `1994-03-18` · `15` · `BDAY-…` | customer note / metafield; % by tier (Silver 10, Gold 15); a unique code |
| `last_order_date` (date) · `orders_count` | | Shopify sync already provides `Placed Order`; set these for segments |
| `snh_goal` · `snh_days` · `snh_level` · `snh_sport` · `snh_plan_id` · `snh_plan_title` | `build-muscle` · `4x` · … | sent by the theme's quiz (KLAVIYO-WORKOUT.md) |
| `popup_code` · `popup_prize` | `WELCOME7` · `7%` | set by the popup form (hidden fields) |
| `bundle_title` · `bundle_url` · `bundle_price` (optional) | | the bundle that matches the cart / last order (BUNDLES.md) |
| `business_name`, `franchise_city` | | Klaviyo form fields on the wholesale / franchise forms |
| `notify_referrals` (bool), `referral_code` | | the referral "notify me" button |

**How to sync the Elite properties**

- **Best:** the SNH Elite app (ELITE-ROADMAP.md) writes them to Klaviyo with the Profiles API whenever points change.
- **Until then:** Shopify Flow → trigger "Customer metafield updated" / "Order paid" → action "Klaviyo: update profile
  properties" (the Klaviyo Flow connector) with the values above. Or a nightly CSV import (Audience → Profiles → Import,
  map the columns to these property names, "update existing").
- Goal tags: the theme already sends `snh_goal` etc. on the quiz. Customer tags like `goal:build-muscle` also sync as
  Shopify tags; use either in segments.

**Events the Elite app sends** (custom metrics): `Elite Near Reward`, `Elite Running Low` (product_title,
product_image, product_url, days_left), `Elite Reward Redeemed` (code, value_rs, points, expires_at), `Elite Points
Expiring` (points, value_rs, expires_on), `Workout Plan Unlocked` (from the theme, KLAVIYO-WORKOUT.md).

## 2. Flows

Smart sending on for marketing flows, off for transactional ones (codes, redeem confirmations, enquiry replies). UTM
tracking on. Each email: paste the subject, preheader and A/B subject from INDEX.md (A/B: Flow email → Create A/B test
→ subject line, 50/50, winner by open or click rate after 4 hours of data).

| flow | trigger | flow filters | steps (delay → email template) |
|---|---|---|---|
| **Welcome series** | List: `Newsletter` or `SNH Elite members` | Has not placed an order since starting this flow | 0 → `welcome-1` · 2 days → `welcome-2` · 2 days → `welcome-3` |
| **Quiz plan** | Metric: `Workout Plan Unlocked` | — | 0 → `quiz-plan` · 3 days → `quiz-checkin` · 1 day → split "Has a Shopify account?" (Properties about someone → `$source` / or segment Customers): **No** → `quiz-save-plan` |
| **Popup code** | List: `Popup` | — | 0 → `popup-code` (transactional) · 5 days → split "Placed Order zero times since starting" → **Yes** → `popup-expiring` |
| **Abandoned cart** | Metric: `Added to Cart` | Started Checkout zero times since starting · Placed Order zero times since starting · not in flow in the last 7 days | 2 hours → `cart-1` · 1 day → `cart-2` · 2 days → `cart-3` |
| **Abandoned checkout** | Metric: `Started Checkout` | Placed Order zero times since starting · not in flow in the last 7 days | 1 hour → `checkout-1` · 1 day → `checkout-2` |
| **Browse abandonment** | Metric: `Viewed Product` | Added to Cart zero times since starting · Placed Order zero times since starting · not in flow in the last 14 days | 4 hours → `browse-1` · 2 days → `browse-2` |
| **Back in stock** | Metric: `Subscribed to Back in Stock` (Klaviyo) | — | Back-in-stock delay → `back-in-stock` |
| **Price drop** | Price drop trigger (catalog) | Viewed / carted the item in the last 30 days | 0 → `price-drop` |
| **Post-purchase** | Metric: `Placed Order` | — | 1 hour → `post-thanks` · 14 days → `cross-sell` |
| **How to use** | Metric: `Fulfilled Order` | — | 3 days → split by `Items` contains (trigger split): protein → `howto-protein` · creatine → `howto-creatine` · pre-workout → `howto-preworkout` · SiS / gels / electrolytes → `howto-hydration` |
| **Review request** | Metric: `Fulfilled Order` | — | 7 days → `review-request` (Judge.me: use its Klaviyo integration so `event.extra.judgeme_review_url` exists, or link the product page) |
| **Replenishment** | Metric: `Elite Running Low` (or `Placed Order` with a delay per product: e.g. 1 kg protein ≈ 30 servings → 25 days) | Placed Order zero times since starting | 0 → `replenishment` |
| **Elite statement** | Date: 1st of the month (or a recurring campaign) | Segment: `loyalty_points` > 0 | 0 → `elite-statement` |
| **Tier upgrade** | Metric / property change: `loyalty_tier` changed | — | split `loyalty_tier` = Silver → `elite-upgrade-silver` · = Gold → `elite-upgrade-gold` |
| **Close to next tier** | Segment trigger: `next_tier_progress` ≥ 75 and < 100 | Not received this flow in the last 60 days | 0 → `elite-close-tier` |
| **Reward ready** | Metric: `Elite Near Reward` where `points_to_reward` = 0 (or segment `loyalty_points` ≥ 2,500) | Not in flow in the last 30 days | 0 → `elite-reward-ready` |
| **Redeem confirmation** | Metric: `Elite Reward Redeemed` | — (transactional) | 0 → `elite-redeemed` |
| **Points expiring** | Metric: `Elite Points Expiring` | — | 0 → `elite-expiring` |
| **Birthday** | Date property: `birth_date`, 7 days before | `loyalty_tier` is Silver or Gold | 0 → `elite-birthday` (Klaviyo can generate a unique coupon: Coupons → Shopify → `birthday_code` with the tier %) |
| **Win-back** | Segment: last Placed Order > 90 days ago (or Placed Order + 90 days) | Placed Order zero times since starting | 0 → `winback-1` · 14 days → `winback-2` |
| **Sunset** | Segment: not opened or clicked email in 120 days, received ≥ 5 | — | 0 → `sunset` · 7 days → if no click: suppress (Update profile → remove from lists) |
| **Wholesale reply** | Form submitted: `Wholesale enquiry` (Klaviyo form) or tag `wholesale-lead` | — (transactional) | 0 → `wholesale-autoreply` |
| **Franchise reply** | Form submitted: `Franchise enquiry` or tag `franchise-lead` | — (transactional) | 0 → `franchise-autoreply` |
| **Referral notify** | Property `notify_referrals` = true | — | 0 → `referral-notify` |

## 3. Campaign templates (manual sends)

`campaign-launch`, `campaign-brand`, `campaign-sale`, `campaign-newsletter`, `campaign-store`: import once as
templates, then Campaigns → Create → Email → pick the template, change the hero image, headline, products and links.
Send to `Newsletter` + `SNH Elite members`, exclude `Unengaged (120 days)`.

## 4. Codes and links you need to create

- **Welcome game codes** `WELCOME5`, `WELCOME7`, `WELCOME10` (Shopify discounts, one use per customer, 7 days), or
  Klaviyo unique coupons named the same; the popup writes `popup_code` / `popup_prize` to the profile.
- **Birthday codes** (unique, 10% Silver / 15% Gold): Klaviyo → Coupons → Shopify → `birthday_code`.
- **Reward codes**: created by the SNH Elite app when a member redeems (sent in the `Elite Reward Redeemed` event).
- **Judge.me review link**: Judge.me → Integrations → Klaviyo (adds `judgeme_review_url`), otherwise the email links
  to the account page.
- **Bundles**: set `bundle_title` / `bundle_url` / `bundle_price` per profile or edit the cart-3 / cross-sell blocks
  to a fixed bundle from BUNDLES.md.
