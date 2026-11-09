# SNH Elite loyalty: how points are supposed to work (post-launch notes)

Written 9 November 2026 after a member (Dinithi Nimasha) reported no points. Based on the theme code, ELITE-INVENTORY.md,
ELITE-ROADMAP.md and the Klaviyo setup. No Shopify Admin access was available in this session, so store data
(orders, metafields, Flows) could not be read: section 4 lists exactly what to check in admin.

## 1. What the website does (and doesn't)

The theme **only reads** three customer metafields. Nothing in the theme, the old theme or any installed app embed
**writes** them:

| Metafield | Meaning | Read by |
|---|---|---|
| `custom.loyalty_points` | points balance (integer) | account Overview/Rewards, header account panel, Elite card |
| `custom.loyalty_tier` | `Bronze` / `Silver` / `Gold` / `MAXED OUT` | everywhere a rate or tier shows (cart points line too) |
| `custom.annual_spend` | rupees this year (not cents) | tier progress ("Spend Rs X more to reach Silver") |

Display rules (snippets/snh-elite-calc):
- Points missing → since today: **"Your points are being updated, check back soon"** (no "—", no fake 0).
- Tier/spend missing → **estimated** from the customer's lifetime orders and labelled *Estimated*.
- Each order shows an estimate ("+N pts est.") only when **paid**; unpaid / pending orders now say
  **"Points added when payment is confirmed"** (order card + order page).
- Rates and thresholds: Theme settings → SNH Elite (Bronze 3 %, Silver 7 %, Gold 10 %; Silver from Rs 198,000,
  Gold from Rs 300,000; 500 welcome points; rewards from 2,500 points; 1 point = Rs 1).

## 2. How points are supposed to be added for online orders

The design (ELITE-INVENTORY §2, ELITE-ROADMAP §5) assumes **the store's loyalty system** keeps the three metafields
up to date: "the store's loyalty/POS integration (Flow, custom app or manual) maintains them". In practice that is the
**Esoft POS loyalty system**, which already holds in-store members' points.

For an online order the intended path is:

1. Order is created on the website (Shopify), signed-in customer, any payment method.
2. When the order becomes **paid** (card at checkout = immediately; bank transfer / COD = when staff mark it paid),
   the loyalty system adds `subtotal × tier rate` points, adds the subtotal to the annual spend, recalculates the tier.
3. It writes the new values to the customer's `custom.loyalty_points / loyalty_tier / annual_spend` metafields.
4. Refunds reverse the points; cancelled / unpaid orders earn nothing.

**Nothing in Shopify does step 2–3 today** unless one of these exists (none is visible from the theme):
- an **Esoft → Shopify sync** that reads Shopify online orders and writes the metafields, or
- a **Shopify Flow** "Order paid → update customer metafields" (Flow can do the arithmetic with *Run code*), or
- a custom app (ELITE-ROADMAP §5 `/apps/elite/*`, not built yet).

The Klaviyo loyalty emails (points statement, tier upgrade, reward ready, expiry) wait on the same sync
(FLOWS-MANUAL.md, emails branch).

## 3. How redemption creates a discount code

1. At **2,500+ points** the account Rewards view shows *Redeem*; after a confirm step the member submits Shopify's
   customer form (`{% form 'customer' %}` → `POST /contact`, `contact[email]`, **`contact[tags]=Trigger_Redeem_2500`**,
   `return_to=/account?snh_posted=redeem#rewards`). This only **adds the tag** `Trigger_Redeem_2500` to the customer.
2. **A Shopify Flow must react to that tag.** Expected Flow (exact steps, to create in admin → Apps → Flow):
   - Trigger: **Customer tags added**.
   - Condition: added tags include `Trigger_Redeem_2500`.
   - Action 1: **Create discount code** (Flow action, or *Send Admin API request* `discountCodeBasicCreate`):
     fixed amount **Rs 2,500** off (2,500 points × Rs 1), single use, this customer only, expires in 60 days,
     code like `ELITE-{{customer.id}}-{{ "now" | date: "%y%m%d" }}`.
   - Action 2: **Update customer metafield** `custom.loyalty_points` = current − 2,500 (*Run code* or an
     Admin API request), unless Esoft owns the balance, in which case notify Esoft / staff instead.
   - Action 3: **Send the code**: Klaviyo event `Elite Reward Issued` (code, value, expiry) or a Shopify email.
   - Action 4: **Remove tag** `Trigger_Redeem_2500` (otherwise the member's next request is never "new" to Flow and
     the account keeps showing *Request pending*).
3. While the tag is on the customer the theme shows *Request pending* and hides the button.

If no such Flow exists, redemptions silently produce nothing: the tag just sits on the customer.

## 4. What to check in Shopify admin (5 minutes)

1. **Customers → Dinithi Nimasha → Metafields**: are `loyalty_points`, `loyalty_tier`, `annual_spend` empty?
   (Empty = nothing has ever written them for her.)
2. **Orders SNH40340, SNH37280, SNH34963**: payment status. SNH40340 is *payment pending*, so it correctly earns
   nothing until it's marked paid. The other two: if *Paid*, they should have earned points.
3. **Apps → Flow**: is there a Flow for *Order paid* (points) and one for *Customer tags added → Trigger_Redeem_2500*?
4. **Customers filtered by tag `Trigger_Redeem_2500`**: anyone listed has a redeem request that was never processed.
5. Ask Esoft: does their sync read **online** (Shopify) orders, or only POS sales?

## 5. Most likely cause for "no points" (until admin confirms)

Points are written only by the POS/Esoft side, and **online orders are not fed into it** (no Order-paid Flow, no
Esoft sync of Shopify orders). So a member who buys online, like Dinithi in July and September, never gets a balance:
her metafields are empty, and until today the account showed that as "—" / "0 · after your first order". Her
November order (SNH40340) is also still **payment pending**, which earns nothing until it's paid.

Fix options: (a) Esoft syncs Shopify paid orders into the member's balance and writes the metafields back
(preferred: one ledger); or (b) a Shopify Flow on *Order paid* adds the points to the metafields (online only, and
Esoft must then read them so in-store and online balances don't diverge). Then back-fill everyone with a paid
online order in the last 12 months: points = Σ paid subtotal × tier rate (refunds deducted, pending excluded) + 500
welcome, never lowering anyone's current balance; skip anyone with a pending `Trigger_Redeem_2500` tag.

## 6. Ready-to-send reply (Khizer → Dinithi)

> Hi Dinithi, thank you for letting us know, and sorry for the confusion. Your July and September orders qualify for
> SNH Elite points; they weren't added because online orders weren't yet syncing with our loyalty system. We're
> fixing that now and will add the points from both orders to your account manually, so you don't lose anything.
> Your latest order (SNH40340) is still showing payment pending: its points will be added as soon as the payment is
> confirmed. Your account page now shows "points being updated" while this happens. We'll message you once your
> balance is updated. Thank you for being an SNH Elite member!
