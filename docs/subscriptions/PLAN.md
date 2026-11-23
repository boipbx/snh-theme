# Subscribe & save: feasibility and build plan (23 Nov 2026)

**Goal:** subscribe-and-save with automatic recurring card charges, run by SNH's own services (Cloudflare Workers + D1) and the local gateway's card-on-file API. This route is needed because Shopify Subscriptions doesn't support SNH's gateways.

**Status:** scaffold only.
- Code: `apps/snh-ops/src/subs.mjs`, tables in `apps/snh-ops/schema.sql`, tests in `apps/snh-ops/test/subs.test.mjs` (10 tests; 60 of 60 in the app pass).
- Flag: `SUBS_MODE = "off"` in `apps/snh-ops/wrangler.toml`. The code accepts only "off" or "sandbox"; **"live" counts as off**.
- Not deployed. No D1 tables created in production. No Onepay credentials. Nothing can charge a real card.

## 1. Which gateway SNH has

Payment gateways on orders from the last 30 days (Shopify Admin API, read-only, 1,701 orders):

| Gateway | Orders | Channel |
|---|---|---|
| Card Payment (in-store terminal) | 588 | POS |
| Cash on Delivery (COD) | 201 | web |
| **Onepay Payment Gateway (Sri Lanka)** | **180** | web |
| Koko: Buy Now Pay Later | 159 | Koko draft orders |
| cash / Koko in-store / bank deposit | rest | POS |

**The online card gateway is Onepay** (onepay.lk). Koko (pay in 3) and COD can't do recurring charges, so subscriptions are **Onepay cards only** (Visa and Mastercard).

## 2. Onepay "Card on File" API (from docs.onepay.lk, read 23 Nov 2026)

| Step | Endpoint | Notes |
|---|---|---|
| Create customer + get card page | `POST /v3/customers/` with app_id, first_name, last_name, email, phone_number, address, redirect_url | Returns `customer_id` (cus_…) and `token_url`. The customer enters the card on Onepay's hosted page, **with 3-D Secure**, and agrees to future charges there |
| Get the token | `GET /v3/customers/{customer_id}/cards/?app_id=` | `token_id` (tok_…), card type, masked number, expiry, is_deleted |
| Charge the token (merchant-initiated, no OTP) | `POST /v3/customers/{customer_id}/payments/` with app_id, token_id, amount ("1000.00"), currency (LKR) | Returns transaction_id, status (true/false) |
| Remove a card | `DELETE /v3/customers/{customer_id}/cards/{token_id}/?app_id=` | Soft delete, can't be undone |
| Customer's charges | `GET /v3/customers/{customer_id}/transactions/?app_id=` | for reconciliation |

- **Base URL:** `https://api.onepay.lk` (the docs show no separate sandbox host; sandbox and live use different credentials).
- **Auth:** header `Authorization: <App Token>` (dashboard → API Keys).
- **Test cards for card-on-file:** in the docs; not copied here.

**Gaps in Onepay's docs:** ask Onepay to confirm each of these in writing.
1. **Webhooks:** whether a webhook fires for tokenisation or for token charges, and how a webhook is signed (no signature is documented).
2. **Idempotency:** no idempotency key and no merchant reference on the charge call. We prevent double charges on our side (section 4) and reconcile with the transactions endpoint.
3. **Transaction type:** the blog mentions a `transaction_type` field for merchant-initiated charges; the API reference doesn't list it.
4. **Expired or replaced cards:** how a token behaves when the card expires or is reissued.
5. **Sandbox:** whether a separate sandbox host exists.

## 3. What we need from Onepay / the bank (owner: Khizer)

1. **Card-on-file / merchant-initiated charges enabled on SNH's merchant account.** Onepay says MIT "requires specific enablement… contact your OnePay Relationship Officer… before building". Their price list puts "Automated Charging – Card On File" in the Essential plan (LKR 799/month, 3.25%) and above, not in Standard. Plan and fee are **unverified**: confirm SNH's current plan.
2. **Sandbox credentials:** App ID and App Token (sandbox), later the live ones. They go into Cloudflare as secrets `ONEPAY_APP_ID` / `ONEPAY_APP_TOKEN`, never in the repo or chat.
3. **Redirect URL** for after the card page: `https://snh-ops.raspy-wind-fe2d.workers.dev/subs/card-saved` (to build).
4. **Webhook URL**, if Onepay offers one for token charges: `https://snh-ops.raspy-wind-fe2d.workers.dev/subs/onepay-webhook` (to build), plus how to verify it.
5. Written answers to the gaps in section 2.

## 4. Design

**Data model** (D1, keyed by shop; card numbers are never stored, only Onepay's ids)

| Table | Key fields |
|---|---|
| `subscriptions` | id, customer_id (Shopify), onepay_customer_id, token_id, card_last4, card_expiry, variant_id, product_title, quantity, unit_price, discount_pct (capped at 20%), interval_days, anchor_day, next_charge_at, status, failures, retry_at, skip_next, paused_reason, tier_rate, consent_text, consent_at, last_charged_at, cancelled_at |
| `subscription_charges` | id = `<sub id>:<due at>`, sub_id, due_at, amount, status (started / paid / failed), transaction_id, message, plan (planned order and points), shopify_order_id |

Statuses: `pending_card` → `active` ⇄ `paused`, `active` → `past_due` → `active` or `paused`, any → `cancelled`.

**Charge job** (every 5 minutes on the existing cron, at most 20 subscriptions a run)
1. Pick active or past-due subscriptions whose date has come.
2. Insert the charge row first. Its id is the subscription plus the due date, so a second run, a retry or a parallel run **can't charge the same due date twice** (the insert fails and the run moves on).
3. Charge the token for unit price × quantity − discount.
4. Paid: record the transaction, move `next_charge_at` on by the interval (monthly plans keep the chosen day of the month, 28 at most).
5. Failed: retry on day +1, +3 and +5. After the third failed retry, pause the subscription (`payment_failed`) and email the customer to update the card.

**After a successful charge** (built in the live phase; in sandbox it is only planned and logged)
- **Create the Shopify order:** `orderCreate` with the customer, the variant, the discounted price, a transaction (gateway "Onepay", the Onepay transaction id, status SUCCESS), tag `subscription`, and the subscription id in a note attribute. Stock comes off normally and fulfilment runs as for any web order. This needs the app's `write_orders` scope, which it has.
- **Points:** the order is paid, so the existing "order paid" automation awards points. As a fallback, the service adds `amount × tier rate` (Bronze 3%, Silver 7%, Gold 10%) once per charge, recording which charge earned them so it never doubles. Pick one route before go-live.
- **Email:** Klaviyo events `Subscription Charged`, `Subscription Payment Failed`, `Subscription Paused`, plus a reminder 3 days before each charge.

**Customer controls** (account page, "My subscriptions"): skip next delivery, pause, resume, change date (1–90 days ahead), cancel, change card (a new token page). The logic is built and tested in `control()`; the account page part comes later. The storefront calls go through a Shopify app proxy, so the customer is verified by Shopify's signature.

**Staff view in SNH Ops:** a "Subscriptions" tab lists every subscription (status, next charge, card last 4 digits, failures) and every charge, with skip, pause and cancel buttons. The API (`/api/subs`) is scaffolded behind the flag; the tab comes later.

**Limits for launch:** LKR only; one product per subscription; Onepay Visa and Mastercard only; Sri Lanka delivery only; discount set per product by the owner (suggested 5–10%).

## 5. Consent wording (PDPA, Sri Lanka Personal Data Protection Act No. 9 of 2022). **Needs the owner's legal review**

Shown above the "Save card" button and stored with the subscription (`consent_text`, `consent_at`):

> **Subscribe & save: your agreement**
> I authorise Sports Nutrition Hub (SNH) to charge my saved card **Rs [amount] every [interval]** for [product] until I cancel. My card is saved by Onepay, our payment provider; SNH never sees or stores my full card number. I'll get an email 3 days before each charge, and I can skip, pause, change the date or cancel at any time in my account, up to 24 hours before a charge. If a payment fails we'll retry up to 3 times over 5 days, then pause my subscription. SNH uses my name, contact details and order history to run this subscription, as described in the [Privacy Policy]. I can ask SNH to access, correct or delete my data at [contact].

Also needed:
- an unticked checkbox
- a link to the subscription terms
- a record of the 3-D Secure card-save transaction (Onepay asks merchants to keep it)

## 6. Build order (each phase needs the owner's OK)

| Phase | What | Gate |
|---|---|---|
| 0 (done) | Plan, D1 tables in schema, logic, Onepay adapter, staff API behind `SUBS_MODE`, 10 tests | — |
| 1 | Onepay sandbox: credentials in Cloudflare, create the tables in D1, card-save redirect route, one end-to-end sandbox subscription with test cards | Onepay sandbox credentials + card-on-file enabled |
| 2 | Shopify order creation and points (into a test order, then cancel), Klaviyo emails, SNH Ops tab | Phase 1 passes |
| 3 | Account page controls via app proxy, consent screen, product page "Subscribe & save" option | Legal OK on wording |
| 4 | Live: code change to allow "live", live credentials, a staff-only pilot (one real card, refunded), then customers | Owner OK |

## 7. Risks
- **Card expiry:** subscriptions need a "card expiring" email a month ahead.
- **Stock-outs on the charge date:** skip the charge if the variant is out of stock, and tell the customer.
- **Price changes:** we charge the stored price. A price rise needs notice and a new consent.
- **Duplicate charges if Onepay times out** after charging: the charge row stays "started". The next run sees the row and doesn't recharge; staff reconcile against `/transactions/`.
