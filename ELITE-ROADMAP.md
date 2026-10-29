# SNH Elite: what the theme does now, and what it needs next

Round 8 + Round 10, 29 Oct 2026. The theme reads loyalty data and writes only a few small things, through the storefront's own
forms. Balances, tiers and rewards are owned by the loyalty/POS integration. This file covers what the theme does
today, what needs a backend, and the data dictionary.

## 1. What the theme does now

### Member app (`customers/account` → `sections/snh-account-app` → `snippets/snh-app`)
| View (hash) | What it shows | Reads | Writes |
|---|---|---|---|
| Overview `#overview` | V8 metal card (tier surface, member no., spend, rate, Rs to next tier, rail), V8 reward card (athlete rotation, points, Rs value, redeem CTA), "Personalise your SNH" prompt, complete-your-profile ring, quick actions (reorder last, track latest, redeem, refer), recent activity (≤ 8), Running low?, Picked for you | metafields, orders, tags, addresses, settings | — |
| Rewards `#rewards` | balance + Rs value, redeem with confirm, how earning works, V8 tier ladder ("You are here", "Spend Rs X more"), points FAQ (section blocks) | metafields, tags, settings | **redeem request** |
| Orders `#orders` | 16 per page, search + status filter (current page), Details dropdown, Re-order, View order, est. points | orders | cart (re-order) |
| Goals `#goals` | onboarding quiz, goal card (tips), products for the goal, buying guides | tags, localStorage, Goal blocks | **goal tags**, localStorage |
| Profile `#profile` | profile + avatar, details, edit profile (2 steps), all addresses (add / edit / delete), marketing, sign out | customer, addresses | **address forms**, newsletter form, avatar (localStorage) |

Links into the views: header account panel, account nav (order + addresses pages), PDP / Elite band / Elite page
"See my points" → `#rewards`, cart drawer + cart page points line → `#rewards`. Emails can link to
`/account#rewards`, `/account#orders` etc.; signed-out visitors go to sign in and come back to `/account`.

### Every place the theme writes data
| What | How | Where in code |
|---|---|---|
| Redeem request | Liquid `{% form 'customer' %}` → `POST /contact`, `form_type=customer`, `contact[email]`, `contact[tags]=Trigger_Redeem_2500`, `return_to=/account?snh_posted=redeem#rewards`. Only shown at or above *Redeem from* points, after a confirm step. A normal page POST (see *CAPTCHA* below). | `snippets/snh-app-rewards` |
| Goals and onboarding | the same kind of customer form, `contact[tags]` = the quiz tags (§4), one POST when the member presses *Save my answers* on the last question, `return_to=/account?snh_posted=goals#goals`. Also kept in localStorage `snh_goals` so the UI updates at once. | `snippets/snh-onboarding-quiz`, `assets/snh-app.js` |
| Answers given at sign-up | `customer[tags]` on the `create_customer` form itself (quiz tags + `mobile:` + `bday:` from step 2), so they arrive with the new account in the same POST. The Round 8 "save on first dashboard load" is gone. | `sections/snh-account-register`, `assets/snh-app.js` (`registerQuiz`) |
| Register | `create_customer`: first/last name, email, password; `customer[note][Phone]` (**required, Sri Lankan mobile, saved as +94XXXXXXXXX**), `customer[note][Address]`, `customer[note][City]`, `customer[note][Birthday]` (YYYY-MM-DD). Same note keys as the old theme, so the birthday flow keeps working. `return_to=/account#overview`. | `sections/snh-account-register` |
| Edit profile | `customer_address` form on the default address (or a new one): first/last name, `address[phone]` (required, +94 normalised), address1, city, zip, country Sri Lanka, `address[default]=1`. Saved in the background, then back to `#profile` (V8 behaviour). | `snippets/snh-app-profile`, `snh-app-edit-fields` |
| Addresses | native `customer_address` add / edit, delete with `_method=delete` after an inline confirm | `snippets/snh-address-form`, `snh-app-profile` |
| Email marketing | customer form with `contact[accepts_marketing]=true`, tag `newsletter` (only shown when not subscribed) | `snh-app-profile` |
| Re-order | `/cart/add.js` with every line, falls back line by line and says what couldn't be added. **The V8 auto cart-clear (empty the cart if it was last touched 3+ days ago) is removed**: it emptied carts without asking. | `assets/snh-app.js` |
| Avatar | localStorage `snh_vector_avatar` (V8 key; V8 icons + Round 10 sporty presets `s-run`, `s-racket` …) and `snh_avatar_colour` (tier · orange · ink · teal · violet · green); cosmetic, this device only. Optional photo upload → app proxy `/apps/elite/avatar` (setting, off; contract in §5) | `snippets/snh-app-profile`, `assets/snh-app.js` |
| Birthday (Profile) | customer form, `contact[tags]=bday:YYYY-MM-DD`, `return_to=/account?snh_posted=bday#profile` (normal POST, hCaptcha) | `snippets/snh-app-profile` |
| Referral notify-me | customer form, `contact[tags]=notify:referrals`, back to `#overview` (only while referral rewards aren't live) | `snippets/snh-app-overview` |

The **customer note can't be read by Liquid**, so phone/birthday from registration are also sent as tags (`mobile:`,
`bday:`) with the new account, until a backend copies them somewhere readable (see §2).

### CAPTCHA (Round 10)
Shopify protects every storefront form that posts `form_type=customer` to `/contact` with hCaptcha. Its bootstrap
script (in `content_for_header`) binds a form on focus/change, or on page load when the form has
`data-shopify-captcha="true"`, and then runs an invisible check on the form's own **submit event**. Anything that
skips that event (`fetch()`, `form.submit()`) posts without a token and lands on Shopify's error page **"Missing
CAPTCHA token"**. Round 8's goal saving did exactly that (fetch, then `form.submit()` as the fallback).

Now every tag-writing form is a Liquid `{% form 'customer', data-shopify-captcha: 'true', return_to: … %}`, posted as
a normal full page POST by a real submit button; `assets/snh-app.js` also calls `Shopify.captcha.protect()` on any
that missed the load-time binding. Shopify redirects to `return_to` (`/account?snh_posted=<redeem|goals|news>#<view>`)
and the app shows a green banner, then cleans the URL. `?customer_posted=true` (Shopify's default) also counts.
QA checks the markup only; nothing was submitted.

**Old live theme (`main`, `sections/main-customers-account.liquid` line ~1350):** the redeem button is a raw HTML
`<form method="post" action="/contact">` with hand-written `form_type`/`utf8` inputs. Shopify's script still treats it
as protected, but nothing binds it before the click (no focus/change happens in a one-button form, and Safari doesn't
focus buttons on click), so the submit is either swallowed or posts without a token. **Same bug, static check only.**
The fix there is the same: the Liquid form tag + `data-shopify-captcha="true"`.

**Long-term fix:** the SNH Elite app proxy (§5). Writes go through `/apps/elite/*` with Shopify's proxy signature
proving who the customer is, straight to metafields, with no CAPTCHA and no tags.

### What the theme reads
`customer.metafields.custom.loyalty_tier / loyalty_points / annual_spend` (display only; empty → estimate from
`customer.total_spent`, labelled), `customer.tags`, `customer.phone` → default address phone → `mobile:` tag,
`customer.metafields.facts.birth_date` → `custom.birthday` → `bday:` tag, `custom.joined_at` → `joined:` tag (Liquid has no
account-created date), orders and line items, addresses, `accepts_marketing`. Product `custom.servings` for Running low.

### Estimates the theme makes (all labelled)
- Points per order = subtotal × the member's rate, shown as "est." (the integration credits the real points).
- Refund reversal = refunded amount × rate, "est.".
- Running low = servings (`custom.servings`, else "61 Servings" in the title/variant) × quantity − days since the
  order, at one serving a day. Shown under 10 days left (and not more than 30 days past empty). Hidden when nothing qualifies.

### "Build your SNH plan" quiz (Round 10)
13 questions (Quiz question blocks, else defaults), branching: the secondary goal hides the primary, *what you
already take* only when not new to supplements, *flavour* not for daily health. XP bar, level up at halfway, one-tap
tiles. Results: the *Shake your shaker* game (5 s, for fun only: **no points or discounts**; issuing them needs the
app), then *Your SNH stack*: 3–5 in-stock products from *Plan quiz → stack categories* (key | collection | words),
picked by goal → challenge → second goal → extras, skipping what they take, honouring diet (vegan/lactose-free → plant
protein, no whey or bars; vegetarian/vegan → no fish oil), flavour first, trimmed to the monthly budget; a bundle
from the bundle collections when it names 2+ of the stack; a tip card; a plan card drawn on canvas (1080×1350 PNG).
*Save my plan* posts the tags once. Rules: `assets/snh-app.js` (PLANS, CHALLENGE, TAKES, FLAV, BUDGET, TIPS).
App idea: award XP/points for completing the plan once the app can write points.

### Picked for you (client can edit)
1. Goal tag → that Goal block's collection (defaults: build-muscle → muscle-and-strength, lose-fat → fat-loss,
   endurance → energy-and-endurance, hydration-recovery → hydration-recovery, daily-health → health-wellness,
   sport-specific → train-perform).
2. Else order history → *Customize → Account page → SNH Elite member app → Order history → complementary collections*.
   One rule per line, `words => collection handles`, e.g. `whey, isolate => creatine, accessories-1`. Words are
   matched in the product type and title.
3. Bestsellers (setting, else `/collections/everything`) top up to 6. Bought and sold-out products are skipped.

## 2. What needs a backend

| Need | Why the theme can't | Suggested route |
|---|---|---|
| Mobile number as the real Shopify customer phone | classic `create_customer` has no reliable phone field (and a duplicate phone would block sign-up) | **Shopify Flow**: on *Customer created*, parse `Phone: …` from the note (already +94 normalised) and *Update customer phone*; or the POS sync / custom app sets it. Then also copy `mobile:` tags. |
| Birthday readable by the theme and by email tools | note isn't exposed to Liquid | Flow: note `Birthday:` (or tag `bday:`) → customer metafield `facts.birth_date` (date). The theme already reads it. |
| Goals as structured data | tags are flat, and the customer form **adds** tags, it never removes them, so changing a goal leaves the old `goal:` tag behind (the theme shows the newest pick on that device, else the first tag) | Flow on *Customer tags added*: for `goal:*`, `freq:*`, `sport:*` keep only the newest, write metafields `custom.goal`, `custom.train_freq`, `custom.sport`, remove the old tags. Long term: the app proxy below. |
| Redeem can be requested again | Flow only sees *new* tags; while `Trigger_Redeem_2500` stays on the customer a second request does nothing, so the theme shows "pending" | The redeem Flow should **remove `Trigger_Redeem_2500`** after issuing the code. |
| Joined date | Liquid has no account-created date | Flow: on *Customer created*, write `custom.joined_at` (date). |
| SMS points reminders | no SMS app | Klaviyo SMS (check sender ID / Sri Lanka (+94) support and per-message cost first) or a local gateway (Dialog / Mobitel / Notify.lk) through the custom app. The Profile view flips from "coming soon" automatically when Postscript / Attentive / Yotpo SMS is detected, or with the *SMS updates are live* setting. |
| Points-expiry and birthday emails | the theme can't send anything | Klaviyo flows on the synced profile properties: `loyalty_points`, `loyalty_tier`, `facts.birth_date` (date-property trigger), expiry date from the loyalty system. |
| OTP / mobile sign-in | not possible with classic accounts in a theme | New customer accounts (one-time code by **email**) or a passwordless app. The sign-in page has a hidden, disabled placeholder slot (*Mobile sign-in* setting). |

### Order tracking: what the POS / courier must write to Shopify (Round 10)
The Orders view turns Shopify's states into one status and a timeline (Ordered → Paid → Packed → Shipped →
Delivered). The theme can only read what's on the order:

| Timeline step | Read from | Who must write it |
|---|---|---|
| Ordered | `order.created_at` | Shopify (automatic) |
| Paid | `order.financial_status` (`paid`, `partially_refunded`…) | Checkout / POS when payment is captured; **COD orders must be marked paid on delivery** or they stay "Awaiting payment" |
| Packed | a fulfilment exists (`fulfillment.created_at`) | POS / staff **create the fulfilment when the parcel is packed and handed over** (not days later) |
| Shipped | the fulfilment has `tracking_number` and/or `tracking_url` (+ `tracking_company`) | POS / courier integration adds tracking to the fulfilment. Without a number the order shows **Packed** and "Tracking appears here once dispatched". With a URL a **Track parcel** button appears. Use the courier's public tracking URL with the number in it. |
| Delivered | **not available to Liquid.** The theme assumes delivery N days after dispatch (*Account page → Orders → Show an order as delivered after*, default 4) and says "around" | For a real delivered state: the courier integration (or Flow) should update the fulfilment's shipment status (`delivered`) through the Admin API. Liquid still can't read that, so the SNH Elite app proxy (§5) should serve `/apps/elite/orders` with the real shipment status, or write `order.metafields.custom.delivered_at` (date), which the theme can then read. |
| Cancelled / Refunded | `order.cancelled`, `financial_status` `refunded`/`voided` | Shopify (automatic) |

Status rules (`snippets/snh-app-order-data`): cancelled → Cancelled · refunded/voided → Refunded · no fulfilment →
Processing · fulfilment without tracking → Packed · with tracking → Shipped · fulfilled and dispatched N+ days ago →
Delivered. Partial fulfilments show Packed/Shipped until the rest is sent.

### "Now in a bundle" (Round 10)
For each product in the member's recent orders (first 6), the app looks for a bundle in **Theme settings → SNH bundle
offers** (product lists, the PDP bundle box) and then in the **bundle collections** (*Account page → Bundle
collections*, default the PDP *Bundle & save* handles): a bundle product whose description names the bought product's
base name. Saving = compare-at price, else the bundle price sheet already used on the PDP. Shown once under the
newest order with that product, and the first match on Overview. Single-variant bundles add straight to the basket;
others link to the bundle.


## 3. The custom app for the SNH 360 back office (future)
- **Admin dashboard**: members by tier, growth, points issued/redeemed, liability (points × Rs value).
- **Points ledger**: every earn / redeem / refund reversal / manual adjustment with reason and staff user; becomes the
  source of truth that writes `loyalty_points`, `loyalty_tier`, `annual_spend` back to the customer.
- **Manual adjustments** with approval and audit trail; redeem requests queue (replaces the tag + Flow round trip).
- **Campaign targeting** by goal / sport / frequency / tier / last order (segments or Klaviyo lists).
- **App proxy** (`/apps/elite/...`, spec in §5) so the storefront can write goals, birthday and preferences straight to metafields,
  with the logged-in customer id verified by the proxy signature (no tags, no bot challenges).
- POS (in-store) earn and redeem by mobile number.

## 4. Data dictionary
| Key | Type / format | Owner (writes) | Read by | Notes |
|---|---|---|---|---|
| `customer.metafields.custom.loyalty_tier` | single-line text: Bronze / Silver / Gold / MAXED OUT | loyalty/POS integration | header, panel, cart, PDP, app | MAXED OUT = Gold. Empty → estimated from spend. |
| `customer.metafields.custom.loyalty_points` | integer | loyalty/POS integration | app, panel | Empty → "—", never guessed. |
| `customer.metafields.custom.annual_spend` | number, rupees (not cents) | loyalty/POS integration | app, panel | Empty → `total_spent`, labelled estimated. |
| `customer.metafields.facts.birth_date` | date | Flow (from note / `bday:`) | app (profile ring, details) | Shopify standard definition. `custom.birthday` also accepted. |
| `customer.metafields.custom.joined_at` | date | Flow (customer created) | app (activity feed) | Optional. |
| `product.metafields.custom.servings` | integer | merchandising | app (Running low) | Optional, else parsed from "61 Servings". |
| tag `Trigger_Redeem_2500` | tag | theme (member's redeem request) | Flow (issue reward), app (pending) | Flow should remove it after issuing. |
| tag `goal:<value>` | build-muscle · lose-fat · endurance · hydration-recovery · daily-health · sport-specific | theme (plan quiz) | app (goal card, picks, promos, prompt) | Values match the Goal blocks. |
| tag `goal2:<value>` | same values as `goal:`, never the same as it | quiz | stack builder, promos | Optional second goal. |
| tag `lvl:<value>` | beginner · intermediate · advanced | quiz | stack, Klaviyo | Training experience. |
| tag `freq:<value>` | 1-2x · 3x · 4x · 5x · 6x | quiz | goal card, Klaviyo | Training days a week. |
| tag `sess:<value>` | strength · cardio · hiit · mixed · skill | quiz | Klaviyo | Usual session type. |
| tag `sport:<value>` | cricket · padel · running · gym · cycling · swimming · football · rugby · other | quiz | goal card, promos | |
| tag `diet:<value>` | none · vegetarian · vegan · lactose-free | quiz | stack, picks (vegan/lactose-free → no whey), promos | |
| tag `budget:<value>` | under-10k · 10-20k · 20-35k · 35k-plus | quiz | stack (trimmed to fit) | Per month, rupees. |
| tag `exp:<value>` | new · some · experienced | quiz | stack (no pre-workout for new), branching | Supplement experience. |
| tag `take:<value>` (one tag each) | protein · creatine · pre-workout · electrolytes · multivitamin · omega-3 · magnesium | quiz | stack (not suggested again), picks | Only asked when `exp` isn't new. |
| tag `challenge:<value>` | energy · recovery · cravings · consistency · sleep | quiz | stack, tip card, Klaviyo | |
| tag `flavour:<value>` | chocolate · vanilla · fruity · unflavoured · any | quiz | stack (flavour match first) | Not asked for daily health. |
| tag `age:<value>` | 18-24 · 25-34 · 35-44 · 45-plus | quiz | Klaviyo | |
| tag `bday:YYYY-MM-DD` | tag | theme (quiz, sign-up) | app | Move to `facts.birth_date` via Flow. |
| tag `mobile:+94XXXXXXXXX` | tag | theme (quiz, sign-up) | app | Move to the customer phone via Flow. |
| tag `joined:YYYY-MM-DD` | tag | optional, backend | app | Alternative to `custom.joined_at`. |
| tag `newsletter` | tag | theme (popup, Profile subscribe) | Klaviyo sync | With `accepts_marketing`. |
| customer note `Phone: / Address: / City: / Birthday:` | text, one per line | theme (register) | Flow / staff | Phone is +94XXXXXXXXX from Round 8. |
| localStorage `snh_app_view` | overview … profile | theme | theme | Last view. |
| localStorage `snh_goals` | JSON {goal,freq,sport,bday,mobile,email,at} | theme | theme | Instant UI after Save; tags are the record. |
| localStorage `snh_onboard_pending` | — | — | — | Retired in Round 10 (the app deletes any leftover). |
| sessionStorage `snh_posting` | redeem · goals · news | theme (on submit) | theme (banner) | Which form just posted. |
| localStorage `snh_vector_avatar` | initials · bolt · barbell · shield · flame · trophy · heart · dumbbell | theme | theme | Same key as V8. |
| localStorage `snh_goal_prompt_off` | "1" | theme | theme | Dismissed personalise prompt. |
| Theme settings → SNH Elite | rates, thresholds, welcome points, redeem from, Rs per point, perks | client | everything Elite | Never hard-coded in the app. |

## 5. SNH Elite app: spec for the backend (Round 10)
A custom Shopify app (one store, no App Store listing) that owns loyalty writes. The theme keeps working without it:
every endpoint below has a theme fallback today (tags + Flow, localStorage, "coming soon").

### 5.1 App proxy (storefront → app)
Proxy prefix **`/apps/elite`** (subpath `elite`, prefix `apps`). Shopify signs every proxied request (`signature`
query param, HMAC-SHA256 with the app secret) and adds `logged_in_customer_id`; the app **must verify the signature
and use that id**, never an id from the body. No CAPTCHA is involved, which ends the Phase 0 problem.

| Endpoint | Method | Body | Does | Returns | Theme today |
|---|---|---|---|---|---|
| `/apps/elite/goals` | POST (JSON) | the plan answers `{goal, goal2, lvl, freq, sess, sport, diet, budget, exp, take[], challenge, flavour, age, bday, mobile}` | validates against the §4 values, writes metafields `elite.plan` (JSON) + `facts.birth_date` + customer phone (if free), removes old plan tags, emits Klaviyo `Elite Plan Saved` | `{ok, plan}` | customer form → tags |
| `/apps/elite/redeem` | POST | `{points: 2500}` | checks balance and the redeem threshold, creates a single-use discount code (Rs value from settings), writes the ledger, lowers `loyalty_points`, emits `Elite Reward Issued` | `{ok, code, value, expires_at}` → the theme can show the code at once | tag `Trigger_Redeem_2500` + Flow |
| `/apps/elite/avatar` | POST multipart | `avatar` (jpg/png/webp, ≤ 5 MB) | resizes to 480×480, uploads with `fileCreate`, sets `customer.metafields.custom.avatar` (file_reference), deletes the previous file | `{url}` (CDN, square) — the theme swaps it in without a reload | setting off, presets |
| `/apps/elite/referral` | GET | — | returns (creates once) the member's code and share link | `{code, url, invited, joined, earned_points}` | "coming soon" |
| `/apps/elite/recommendations` | GET | `?context=overview\|goals&limit=6` | personalised picks + the promo to show (5.4) | `{products:[{handle, reason}], promo_id, tip}` | Liquid rules (§1) |
| `/apps/elite/orders` | GET | — | real shipment status per fulfilment (delivered, out for delivery) from the courier | `{orders:[{name, status, delivered_at, tracking_url}]}` | assumed delivery (§2) |

Errors: `401` not signed in, `422` invalid input (`{error, field}`), `429` rate limit (10/min per customer). All
JSON responses `Cache-Control: no-store`.

**Avatar contract (Phase 6):** the theme shows *Upload a photo* only with *Account page → Show "Upload a photo"* on.
It POSTs `FormData{avatar}` to `/apps/elite/avatar` with `Accept: application/json` and expects `200 {url}`; anything
else shows "Photo upload isn't available yet". On every page load the theme reads `customer.metafields.custom.avatar`
(definition: *file reference, image*; a plain URL string also works) and shows it instead of the presets everywhere
(sidebar, sheets, profile).

### 5.2 Data model
| Where | Key | Type | Notes |
|---|---|---|---|
| customer metafield | `custom.loyalty_points` / `loyalty_tier` / `annual_spend` | as today (§4) | the app becomes the writer |
| customer metafield | `elite.plan` | JSON | the quiz answers + `saved_at`; replaces the plan tags |
| customer metafield | `facts.birth_date` | date | from the plan / profile |
| customer metafield | `custom.avatar` | file reference (image) | 5.1 |
| customer metafield | `elite.referral_code` | single line text | |
| customer metafield | `custom.joined_at` | date | written on *customer created* |
| order metafield | `custom.delivered_at` | date_time | courier webhook → real "Delivered" |
| metaobject | `member_promotion` | §6 | promos |
| app database | ledger (`customer_id, delta, reason, order_id, staff, created_at`), referrals (`code, referrer, referee, status, rewarded_at`), redeem codes | | source of truth; metafields are the cache the theme reads |

### 5.3 Referral programme: what the app must do
- **Unique code per member** (e.g. `KASUN-7F3Q`), share link `https://www.sportsnutritionhub.lk/?ref=CODE` that
  stores the code in a cookie for 30 days and pre-fills it at sign-up.
- **Double-sided reward**, amounts in app settings (the old card promised *Give Rs 500, get Rs 500*; confirm before
  launch): the friend gets a welcome discount on their first order; the referrer gets the equivalent in **points**
  when that first order is paid and past the return window (14 days).
- **Tracking:** attribution by code/cookie, checked against the friend's email/phone (no self-referrals, one reward per
  new customer, block duplicate households by address if abused); status `invited → joined → ordered → rewarded`.
- **Payout as points** through the loyalty integration: a ledger entry with reason `referral`, then
  `loyalty_points` updated; Klaviyo events `Elite Referral Joined` / `Elite Referral Rewarded`.
- The theme then shows the code, share buttons (WhatsApp first) and progress through a referral app block or
  `/apps/elite/referral`; turn on *Referral rewards are live*. Members who asked to be told carry the tag
  `notify:referrals` (Klaviyo segment for the launch email).

### 5.4 Personalised picks and promo choice with Claude (server-side only)
- The app calls the Claude API **from the server** (never from the theme: no API key in the browser). Inputs: the
  plan (`elite.plan`), tier, last 12 months of order lines (titles, types, vendors, dates), what's in stock in the
  stack categories (handles, titles, prices), and the active `member_promotion` entries.
- Ask for structured output (tool use / JSON schema): `{products: [{handle, reason ≤ 90 chars}], promo_id, tip ≤ 160
  chars}`; validate that every handle is in the in-stock list and the promo id exists, else fall back to the Liquid
  rules.
- Model: **Claude Haiku 5.5** (`claude-haiku-5-5`) for the per-member picks (fast, cheap, high volume); **Claude
  Sonnet 5.5** (`claude-sonnet-5-5`) for writing promo and email copy in batches. Cache the catalogue part of the
  prompt (prompt caching) and the result per member for 24 h, refreshed on *order paid* or *plan saved*.
- Guardrails: no medical claims, never invent discounts, respect diet (no whey for vegan/lactose-free), keep the
  reasons short and factual. Log inputs/outputs for review; members can opt out via a profile toggle later.

### 5.5 Klaviyo events the app emits
`Elite Points Earned` (order paid: points, new balance, tier), `Elite Points Reversed` (refund), `Elite Tier Changed`
(old, new), `Elite Reward Issued` (code, value, expiry), `Elite Plan Saved` (plan fields), `Elite Near Reward`
(balance ≥ 80 % of the redeem threshold, once per crossing), `Elite Referral Joined` / `Rewarded`,
`Elite Running Low` (product, est. days left, from servings × qty, §1).

## 6. Member promotion metaobject (to create in admin)
Type handle **`member_promotion`**, storefront access **on** (the theme reads `metaobjects.member_promotion.values`).

| Field key | Type | Notes |
|---|---|---|
| `title` | single line text | `*word*` turns serif |
| `text` | multi-line text | one or two sentences |
| `cta_label` | single line text | default "Shop now" |
| `link` | URL | |
| `image` | file (image) | landscape works best for the hero |
| `start_date` / `end_date` | date | empty = always on |
| `target_tiers` | list of single line text | bronze, silver, gold |
| `target_goals` | list of single line text | goal values (§4) |
| `target_sports` | list of single line text | sport values |
| `target_diets` | list of single line text | none, vegetarian, vegan, lactose-free |
| `bought_triggers` | list of single line text | brand / type / product words, e.g. creatine, RYSE |
| `priority` | integer 0–9 | higher wins |

As soon as one entry exists, the theme uses the metaobject entries only (the account page blocks are ignored).

## 7. Klaviyo plan
Templates: `klaviyo-templates/` (HTML files only, nothing connected). Brand: Inter, SNH orange `#E0521C`, ink
`#0C0C0D`, cream `#F4EFE6`. Profile properties are synced from the customer metafields by the app (or a Flow → Klaviyo
action until then).

**Customer properties to sync:** `loyalty_points`, `loyalty_tier`, `annual_spend`, `points_value_rs`,
`next_tier`, `rs_to_next_tier`, `next_tier_progress` (0–100), `redeem_from`, `points_to_reward`, `birth_date`,
`plan_goal`, `plan_goal2`, `plan_sport`, `plan_diet`, `plan_budget`, `plan_challenge`, `last_order_date`,
`orders_count`, `referral_code`, `joined_at`, `notify_referrals` (bool), plus the settings the emails quote:
`welcome_points`, `earn_rate`, `next_tier_rate`, `reward_value_rs` (from *Theme settings → SNH Elite*, so no number is
hard-coded in an email). Event properties: `Elite Near Reward` → `points_to_reward`, `spend_to_reward`;
`Elite Running Low` → `product_title`, `product_image`, `product_url`, `days_left`.

| Flow | Trigger | Data it needs | Template |
|---|---|---|---|
| Welcome + 500 points | Added to list *SNH Elite members* (customer created / tag) | first_name, welcome points, redeem_from, tier rates | `welcome.html` |
| Month-end points statement | Date (1st of each month), segment: has points | loyalty_points, points_value_rs, points earned last month (event sum), tier, next_tier, rs_to_next_tier | `points-statement.html` |
| Tier progress nudge | `next_tier_progress` ≥ 75 and < 100 (segment, weekly check) | next_tier, rs_to_next_tier, next tier rate | `tier-progress.html` |
| Near-reward nudge | event `Elite Near Reward` | points_to_reward, redeem_from, reward value | `near-reward.html` |
| Replenishment reminder | event `Elite Running Low` (or 25 days after a consumable order) | product title, image, URL, est. days left | `replenishment.html` |
| Birthday | date property `birth_date` (7 days before) | first_name, tier, birthday reward % (Silver 10, Gold 15) | `birthday.html` |
| Win-back | no order for 90 days (last_order_date) | first_name, loyalty_points, points_value_rs, plan_goal | `win-back.html` |
| Post-purchase review | Fulfilled Order + 7 days | first item title/image, review link (Judge.me) | `review-request.html` |
