# Emails + points fix — log (9 November 2026)

Done from the cloud through the Klaviyo and Shopify Admin APIs (no browser). Old values: BACKUP.md. Nothing deleted.
Secrets were read from environment variables only; none are in this repo.

## Part 1 — why no emails

### 1. Test profile `nunyodude@gmail.com`
- Exists (created 9 Nov 16:35 UTC by the Shopify sync, tags `mobile:…`, `Welcome_Free_Shipping`, `bday:…`).
- Email consent **NEVER_SUBSCRIBED**, **no lists**, **no events**. So no flow could start: the Welcome series starts
  on joining Newsletter, which never happened, and there was no order/cart/checkout event either.
- Why it wasn't subscribed: the website's sign-up form didn't send `accepts_marketing` (fixed, step 4), and Klaviyo's
  Shopify integration isn't syncing consent (step 4b).

### 2. SNH flows
All 12 `SNH ·` flows **live**, all 20 email steps **live**. Triggers: Welcome = list Newsletter, Wholesale / Franchise
replies = their lists, Sunset = segment Unengaged 180d, the rest = Shopify metrics (Added to Cart, Checkout Started,
Placed Order, Fulfilled Order) and Viewed Product. Filters: "no order since flow start" on Welcome / cart / checkout /
browse / replenishment / win-back (intended). Nothing to fix in the flows themselves.

### 3. Lists: opt-in
Newsletter, Quiz takers, Wholesale leads, Franchise leads were **double opt-in** (members only join after clicking a
confirmation email, which also holds back the Welcome series and the enquiry auto-replies) → switched to
**single opt-in** (BACKUP.md). SMS Subscribers left as is.

### 4. Website sign-ups → Klaviyo
- (a) The register form had no marketing consent field → added **"Email me offers and points updates.
  Unsubscribe any time."** (ticked) sending `customer[accepts_marketing]`, step 3 of sign-up
  (`sections/snh-account-register.liquid`, commit 18182e4). Verified on the live /account/register.
- (b) 10 most recent Shopify customers with email marketing = subscribed: **9 are NEVER_SUBSCRIBED in Klaviyo and not
  in Newsletter**, 1 is. Klaviyo's Shopify integration isn't syncing consent → TODO-ADMIN #2.
  Not bulk-subscribed by API: 2,836 consented customers were created in the last 30 days and each would get the
  Welcome series at once; the integration setting is the right switch.

### 5. Account limits / sending
- Sender `support@sportsnutritionhub.lk`, account timezone `Indian/Reunion` (not Colombo; affects scheduled times).
- **Sending stopped account-wide on 8 Nov ~08:00 UTC**: flow recipients per day 5 Nov 65 · 6 Nov 75 · 7 Nov 75 ·
  8 Nov 42 · 9 Nov **0**, last "Received Email" 8 Nov 08:03 UTC. The old flows were still live for 20 hours after that
  (our go-live was 9 Nov 04:37 UTC) and sent nothing. Trigger events kept arriving (orders, checkouts, carts,
  fulfilments, 10 Newsletter joins). The API doesn't show the reason → TODO-ADMIN #1 (billing / plan / account review).
- "Viewed Product" has no events at all → Browse abandonment can't start → TODO-ADMIN #2.

### 6. Live test `pabasarawasava+snhtest1@gmail.com`
Subscribed via API 17:11 UTC → profile **SUBSCRIBED** (single opt-in, no confirmation needed), in **Newsletter**,
events "Subscribed to List" + "Subscribed to Email Marketing" logged → that is the Welcome series trigger. No email
received after 45+ minutes, consistent with the account-wide sending stop (5). It will send once the hold is cleared.

## Part 2 — points (Shopify Admin API: write_customers, read_orders, read_all_orders, write_discounts)

### 7. Dinithi Nimasha — two customer accounts
- Account 7621797544190 (created Jun 2024, tag `newsletter`, 9 orders): `annual_spend` 157,493 but **points and tier
  blank** — whatever system writes points never wrote hers. Paid in the last 12 months: SNH24450 33,999 · SNH26512
  36,998 (draft order) · SNH27491 33,999 · SNH28634 42,498 · SNH34963 38,498 · SNH37280 8,499 = **Rs 194,491**;
  SNH40340 40,498 is **payment pending** (correctly excluded until paid).
  → now **6,334 points** (500 + 3 % × 194,491), **Bronze** (Silver from Rs 198,000), annual spend 194,491.
- Account 9184943079678 (created May 2026, 2 paid orders): already **1,655** points, Bronze, spend 38,498 —
  exactly 500 + 3 %, untouched. Two accounts for one person: merge in admin if she uses both.

### 8. Back-fill (orders since 9 Nov 2025)
- 17,075 orders read; counted PAID + PARTIALLY_REFUNDED at their current subtotal (after discounts and refunds);
  pending, voided, refunded, cancelled excluded. 8,374 customers with paid orders.
- Existing balances: 4,707 customers already had points, but only **199** match the formula; the rest are much lower
  (e.g. a Gold member 17,170 vs 57,035) → the existing loyalty system keeps its own ledger (redemptions, expiry,
  in-store). Topping those up would re-grant spent points, so they were **not changed**: listed in
  `points-review.csv` (870 customers, gap 1.40 M points) for reconciliation with Esoft.
- **Updated: 3,667 customers whose points were blank**, batches of 25, re-read just before writing and verified after:
  **3,667 ok, 0 failed, 0 skipped**. Total 6.79 M points (avg 1,851 incl. 500 welcome); tiers 3,594 Bronze ·
  62 Silver · 11 Gold. Backup `points-backup.csv`.
- Orders **not tagged** `points_awarded`: the app has no `write_orders` scope (TODO-ADMIN #3). The Flow in
  SHOPIFY-FLOWS.md only fires on new "Order paid" events, so the back-filled orders can't be counted twice.
- Skipped (pending redeem tag): 3 customers — handled in step 10.

### 9. Welcome points
19,993 customers created since 10 Oct 2026; **9,927** had blank points → **500 + Bronze** (tier only when blank),
all verified. Backup `welcome-points-backup.csv`.

### 10. Redemptions (`Trigger_Redeem_2500`)
3 customers tagged, all ≥ 2,500 points, none had a reward code (21 code discounts scanned). For each: single-use
Rs 2,500 code for that customer only, 90 days, combines with product + shipping discounts; points −2,500; code saved
in `custom.last_reward_code`; tag removed; verified.

| Customer | Points | Code |
|---|---|---|
| 9142627664126 | 2,900 → 400 | ELITE-64126-6DD8E7 |
| 9259200315646 | 9,961 → 7,461 | ELITE-15646-D6F7C1 |
| 9334694183166 | 5,525 → 3,025 | ELITE-83166-F1669A |

The members haven't been told yet (no email can go out right now) → TODO-ADMIN #5.

## Part 3 — admin guides
- `SHOPIFY-NOTIFICATIONS.md`: the 15 notifications, most important first, admin path, GitHub link with Copy raw
  file, back-up-first steps.
- `SHOPIFY-FLOWS.md`: Welcome points, Earn on paid orders, Redeem — click by click with the Run code / Admin API
  inputs to paste.
