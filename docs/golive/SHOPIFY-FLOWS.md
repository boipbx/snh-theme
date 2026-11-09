# Shopify Flows that keep SNH Elite points automatic

Build these three in **Shopify admin → Apps → Flow → Create workflow**. Each takes about 10 minutes.
Rules (Theme settings → SNH Elite): Bronze 3 %, Silver 7 % (from Rs 198,000 a year), Gold 10 % (from Rs 300,000),
500 welcome points, reward = 2,500 points → Rs 2,500 code.
Customer metafields: `custom.loyalty_points` (integer), `custom.loyalty_tier` (text), `custom.annual_spend` (decimal),
`custom.last_reward_code` (text).

The points for everyone's paid orders up to 9 November 2026 were already added (see LOG.md). These Flows take over
from the next order on, so they only fire on **new** events and nothing is counted twice.

> Tip on a phone: Flow works in the Shopify app's browser view. Each "paste" block below is copied exactly.

---

## Flow 1 — Welcome points

1. **Create workflow** → name it `SNH Elite · Welcome points`.
2. **Select a trigger** → search **Customer created** → select it.
3. **+ (Then)** → **Condition** → *Add criteria* → **Customer → Metafields → Loyalty points** → **is empty**
   (no "Loyalty points" in the list? use **Run code** below instead).
4. Under **True** → **+ Action** → **Update customer metafield**:
   - Metafield: **Loyalty points** (`custom.loyalty_points`), Value: `500`
5. **+ Action** → **Update customer metafield**: **Loyalty tier** (`custom.loyalty_tier`), Value: `Bronze`
6. **Turn on workflow**.

---

## Flow 2 — Earn on paid orders

1. **Create workflow** → `SNH Elite · Earn on paid orders`.
2. Trigger: **Order paid**.
3. **Condition** → *Add criteria*: **Order → Tags → does not include** `points_awarded`
   **AND** **Order → Customer → ID → is not empty**.
4. Under **True** → **+ Action** → **Run code**. Paste:

   **Define inputs:**
   ```graphql
   query {
     order {
       currentSubtotalPriceSet { shopMoney { amount } }
       customer {
         points: metafield(namespace: "custom", key: "loyalty_points") { value }
         tier: metafield(namespace: "custom", key: "loyalty_tier") { value }
         spend: metafield(namespace: "custom", key: "annual_spend") { value }
       }
     }
   }
   ```
   **Define outputs:**
   ```graphql
   type Output {
     points: Int!
     tier: String!
     spend: String!
   }
   ```
   **Write code:**
   ```js
   export default function main(input) {
     const o = input.order;
     const c = o.customer || {};
     const sub = parseFloat((o.currentSubtotalPriceSet && o.currentSubtotalPriceSet.shopMoney.amount) || '0');
     const pts = parseInt((c.points && c.points.value) || '0', 10);
     const spend = parseFloat((c.spend && c.spend.value) || '0') + sub;
     const rank = { Bronze: 1, Silver: 2, Gold: 3, 'MAXED OUT': 3 };
     let tier = spend >= 300000 ? 'Gold' : spend >= 198000 ? 'Silver' : 'Bronze';
     const stored = (c.tier && c.tier.value) || '';
     if ((rank[stored] || 0) > (rank[tier] || 0)) tier = stored === 'MAXED OUT' ? 'Gold' : stored; // never downgrade here
     const rate = { Bronze: 0.03, Silver: 0.07, Gold: 0.10 }[tier] || 0.03;
     const welcome = (c.points && c.points.value) ? 0 : 500; // first order without a balance also gets the welcome points
     return { points: pts + welcome + Math.floor(sub * rate), tier, spend: spend.toFixed(2) };
   }
   ```
5. **+ Action** → **Update customer metafield**: **Loyalty points** = `{{ runCode.points }}`
6. **+ Action** → **Update customer metafield**: **Loyalty tier** = `{{ runCode.tier }}`
7. **+ Action** → **Update customer metafield**: **Annual spend** = `{{ runCode.spend }}`
8. **+ Action** → **Add order tags** → `points_awarded`
9. **Turn on workflow**. Test: mark a small draft order paid for a staff customer, then check the customer's metafields.

Refunds: add a 4th Flow later on **Refund created** that subtracts `refund amount × rate` the same way (optional).
Annual spend resets once a year: a **Scheduled time** Flow on 1 January that sets `annual_spend` to `0` for everyone
(optional, only if tiers are meant to be per calendar year).

---

## Flow 3 — Redeem (2,500 points → Rs 2,500 code)

1. **Create workflow** → `SNH Elite · Redeem`.
2. Trigger: **Customer tags added**.
3. **Condition**: **Tags added → includes** `Trigger_Redeem_2500`.
4. Under **True** → **+ Action** → **Run code**:

   **Define inputs:**
   ```graphql
   query {
     customer {
       id
       legacyResourceId
       points: metafield(namespace: "custom", key: "loyalty_points") { value }
     }
   }
   ```
   **Define outputs:**
   ```graphql
   type Output {
     ok: Boolean!
     newPoints: Int!
     code: String!
     startsAt: String!
     endsAt: String!
   }
   ```
   **Write code:**
   ```js
   export default function main(input) {
     const c = input.customer;
     const pts = parseInt((c.points && c.points.value) || '0', 10);
     const now = new Date();
     const end = new Date(now.getTime() + 90 * 864e5);
     const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
     return {
       ok: pts >= 2500,
       newPoints: pts >= 2500 ? pts - 2500 : pts,
       code: 'ELITE-' + String(c.legacyResourceId).slice(-5) + '-' + rand,
       startsAt: now.toISOString(),
       endsAt: end.toISOString()
     };
   }
   ```
5. **+ (Then)** → **Condition**: **Run code → ok → is true**.
6. Under **True** → **+ Action** → **Send Admin API request** → mutation **discountCodeBasicCreate** → paste into
   *Mutation inputs*:
   ```json
   {
     "basicCodeDiscount": {
       "title": "SNH Elite reward Rs 2,500 ({{ customer.legacyResourceId }})",
       "code": "{{ runCode.code }}",
       "startsAt": "{{ runCode.startsAt }}",
       "endsAt": "{{ runCode.endsAt }}",
       "usageLimit": 1,
       "appliesOncePerCustomer": true,
       "customerSelection": { "customers": { "add": ["{{ customer.id }}"] } },
       "customerGets": {
         "value": { "discountAmount": { "amount": "2500", "appliesOnEachItem": false } },
         "items": { "all": true }
       },
       "combinesWith": { "orderDiscounts": false, "productDiscounts": true, "shippingDiscounts": true }
     }
   }
   ```
7. **+ Action** → **Update customer metafield**: **Loyalty points** = `{{ runCode.newPoints }}`
8. **+ Action** → **Update customer metafield**: **Last reward code** (`custom.last_reward_code`, single line text) =
   `{{ runCode.code }}` (create the definition first in Settings → Custom data → Customers if it's not listed).
9. **+ Action** → **Remove customer tags** → `Trigger_Redeem_2500`.
10. Tell the customer the code: **+ Action** → **Klaviyo → Track event** (Klaviyo app for Flow) → event name
    `Elite Reward Issued`, properties `code = {{ runCode.code }}`, `value = 2500`, `expires = {{ runCode.endsAt }}`;
    then a Klaviyo flow on that event sends the email. (Until then, staff can WhatsApp the code.)
11. Under the **False** branch of step 5 (not enough points) → **Remove customer tags** → `Trigger_Redeem_2500`.
12. **Turn on workflow**.

The theme already shows "Request pending" while the tag is on the customer, and the new balance once it's removed.
