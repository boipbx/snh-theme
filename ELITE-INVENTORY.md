# SNH Elite + customer accounts — inventory (Round 7, phase 0)

Read from `main` (old theme) and `feat/theme-v2` on 29 Oct 2026. Nothing in admin was changed.

## 1. Account mode: **classic customer accounts**

| Check | Result |
|---|---|
| `https://www.sportsnutritionhub.lk/account` | `302` → `/account/login?return_url=%2Faccount` (same domain, not `shopify.com/…/account`) |
| `/account/login` | `200`, rendered by the live theme (`Shopify.theme` = live #154272432382), contains `<form action="/account/login">` and `action="/account/recover"` |
| `/account/register` | `200`, theme-rendered |

So every `templates/customers/*.json` is rendered by the theme and can be rebuilt. Phase 2 follows the **classic** branch.

## 2. Customer metafields (source of truth, display only)

The theme only **reads** these. Nothing in either theme writes them; no loyalty app embed is installed, so the store's
loyalty/POS integration (Flow, custom app or manual) maintains them.

| Metafield | Type (as read) | Old theme reads it in | Empty → old theme shows |
|---|---|---|---|
| `customer.metafields.custom.loyalty_tier` | single-line text: `Bronze` / `Silver` / `Gold` / `MAXED OUT` | `main-customers-account` (card, rate, perks), `ss-header-4` (rate), `cart-drawer` (points line rate), `main-cart` (points line rate) | `Bronze` |
| `customer.metafields.custom.loyalty_points` | integer (`.value \| default: 0 \| plus: 0`) | `main-customers-account` only (reward card, "next reward" gap) | `0` |
| `customer.metafields.custom.annual_spend` | number, rupees, **not** cents (compared to 198000 / 300000) | `main-customers-account` only (card stat, progress bar, "to reach Silver") | `0` → "Rs 198,000 to reach Silver" |

Types are inferred from the Liquid (`plus: 0`, comparisons with rupee thresholds). I couldn't open *Settings → Custom
data → Customers* without signing in to admin, so **confirm the definitions there** (look for these three keys).

`MAXED OUT` is treated as Gold everywhere (rate 10%, top of the ladder).

Not read anywhere by the old theme, so v2 doesn't invent them: lifetime spend, a rewards/vouchers list, a points Rs
value. A **redeem request** exists: at ≥ 2,500 points the old dashboard posts Shopify's customer form to `/contact`
with the customer's email and tag `Trigger_Redeem_2500` (a Flow on that tag presumably issues the reward). v2 keeps
that exact form. It's the customer's own action; the theme still writes no balances.

### v2 rules
- Tier = `loyalty_tier`, else **estimated** from spend (below), labelled *Estimated*.
- Spend = `annual_spend`, else **estimated** from `customer.total_spent` (lifetime, cents → Rs), labelled *Estimated from your orders*.
- Points = `loyalty_points`, else shown as `—` with "Your balance appears after your first paid order syncs". No
  points estimate: a guessed balance is worse than none.
- Rs value of points = points × *Theme settings → SNH Elite → Rs per point* (new setting, default **1**: the Shop the
  Look strip and the cart already show points 1:1 with rupees). **Client to confirm.**
- Rates and thresholds from *Theme settings → SNH Elite* (3/7/10 %, Silver 198,000, Gold 300,000). Old account code
  hard-coded the same numbers.

## 3. What the old account + loyalty experience does (to replicate)

### `customers/account` → `main-customers-account.liquid` (1,889 lines)
- Three tabs (Dashboard · Orders · Account), last tab remembered in `localStorage`.
- **Metal membership card** (bg per tier): wordmark *SNH elite*, `TIER · No. {{ customer.id mod 900 + 100 }}`, "Welcome
  back, {first}", "{Tier} Member", pitch per tier, stats (annual spend, % back, Rs to next tier), progress bar to Gold
  with "Goal Rs X", count-up animation.
- **Reward card**: available points; ≥ 2,500 → "Trade 2,500 points" (form above), else "You're N points from your
  first cash-off reward" + *Shop to earn*.
- Action strip: earning X % today · birthday reward per tier · next unlock.
- Tier benefit cards (Bronze/Silver/Gold perks, "More perks" details) and a 4-question FAQ.
- **Orders**: search by order no./product, status filter (paid/pending/refunded), cards with first item image, "+N
  more", financial + fulfilment pills, total, *Details* dropdown with line items, **Re-order** (adds all variants to the
  cart via `/cart/add.js`), "Earns X % back", paginate by 16.
- **Account**: profile hero (initials or a chosen avatar icon, stored in `localStorage`), points + journey cards,
  email/phone/default address, referral card ("Give Rs 500, get Rs 500" → `/pages/contact`), quick actions (edit
  profile, orders, logout).
- **Edit profile modal**: 2 steps on `{% form 'customer_address', customer.default_address or new_address %}`
  (name, phone, then address1/city/zip, country fixed to Sri Lanka, `address[default]=1`).
- Tier perks copy: Bronze — 500 welcome points, 3 %, redeem from 2,500; Silver — 7 %, 10 % birthday reward, 5 % off
  gift vouchers; Gold — 10 %, free shipping, 15 % birthday reward, 10 % off gift vouchers, first access to drops.

### `customers/login` → `main-customers-login.liquid`
- Split screen: visual ("Welcome Back.", gift/coin art) + card. `customer_login` form with `return_to=/account`,
  errors via `default_errors`, *Forgot password?* swaps in the `recover_customer_password` form in place (opened
  automatically when that form posted or errored), "Create free account" link.

### `customers/register` → `main-customers-register.liquid`
- Visual: "Fuel your goals. Earn your rewards.", 500 welcome points copy, three tier mini-cards.
- **Two-step** `create_customer` form: step 1 first/last name, email, password + confirm (min 5, match check);
  step 2 **phone, street address, city, birthday** saved to `customer[note][Phone|Address|City|Birthday]` (birthday
  drives birthday rewards). "Free forever. Takes 30 seconds." · *Create VIP Account*.
- FAQ: Is SNH Elite really free? · How do I earn points? · How do I upgrade to Silver or Gold? · What happens when I
  refund an order?

### `customers/order`, `addresses`, `activate_account`, `reset_password`
- Stock Impact sections (lightly themed). Addresses uses Impact's address form web components and the native
  `customer_address` forms (add / edit / delete via `_method=delete`).

### `account-banner.liquid`
- Impact's banner section; on no customer template on `main`. Not carried over.

### Header (`ss-header-4.liquid` on main)
- Account button toggles a popover. Logged out: title + text (settings) + *Sign in* / *Join rewards*. Logged in:
  "Welcome back" + *My account* / *Log out*. Tier is read only for the earn rate.

### Points / tier shown elsewhere
| Place (v2 file) | Shows | Links |
|---|---|---|
| Elite band `snh-elite.liquid` | rates, ladder, demo card | CTA → `/account/register`, CTA 2 → `/account/login` (index.json) |
| Shop the Look `snh-shop-the-look.liquid` | points on the first product at the member's rate | logged out → `routes.account_login_url` |
| PDP points line + Elite strip + Elite modal `snh-product.liquid` | 3–10 % range | modal: *Join free* → register, *Log in* → login |
| Cart drawer `cart-drawer.liquid` | "You'll earn N points as a {tier} member" | logged out: *Log in* / *join SNH Elite* |
| Cart page `main-cart.liquid` | the same | the same |
| Header `snh-header.liquid` | hover pop: tier + points (logged in) | account / login / register |
| Header nav *SNH Elite* link (`header-group.json`) | — | `/#elite` |
| Newsletter popup | "Join SNH Elite" heading only | — |
| Footer | nothing Elite | — |

## 4. SNH Elite page
There is **no standalone Elite page** on the live store: the pages sitemap lists 15 pages, none Elite, and
`/pages/snh-elite`, `/pages/elite`, `/pages/rewards`, `/pages/loyalty`, `/pages/vip` all return 404. The
register page doubles as the pitch, and the nav link goes to the homepage band (`/#elite`).
→ v2 adds `templates/page.snh-elite.json`. Links use `pages['snh-elite']` when that page exists, else `/#elite`, so
they wire themselves up once the client creates the page.

## 5. Notes
- `CONTENT-INVENTORY.md` is at `prototype/CONTENT-INVENTORY.md` (§8 is the Elite copy), not in the repo root.
- `customer.orders` is available on classic accounts, so the dashboard can show recent orders directly.
