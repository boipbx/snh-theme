# SNH Elite: what the theme does now, and what it needs next

Round 8, 29 Oct 2026. The theme reads loyalty data and writes only a few small things, through the storefront's own
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
| Avatar | localStorage `snh_vector_avatar` (same key as V8; cosmetic, this device only) | `assets/snh-app.js` |

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

## 3. The custom app for the SNH 360 back office (future)
- **Admin dashboard**: members by tier, growth, points issued/redeemed, liability (points × Rs value).
- **Points ledger**: every earn / redeem / refund reversal / manual adjustment with reason and staff user; becomes the
  source of truth that writes `loyalty_points`, `loyalty_tier`, `annual_spend` back to the customer.
- **Manual adjustments** with approval and audit trail; redeem requests queue (replaces the tag + Flow round trip).
- **Campaign targeting** by goal / sport / frequency / tier / last order (segments or Klaviyo lists).
- **App proxy** (`/apps/snh/...`) so the storefront can write goals, birthday and preferences straight to metafields,
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
| tag `goal:<value>` | build-muscle · lose-fat · endurance · hydration-recovery · daily-health · sport-specific | theme (quiz) | app (goal card, picks, prompt) | Values come from the Quiz/Goal blocks. |
| tag `freq:<value>` | 1-2x · 3x · 4x · 5x | theme (quiz) | app | |
| tag `sport:<value>` | cricket · padel · running · gym · cycling · swimming · other | theme (quiz) | app | |
| tag `bday:YYYY-MM-DD` | tag | theme (quiz / sign-up copy) | app | Move to `facts.birth_date` via Flow. |
| tag `mobile:+94XXXXXXXXX` | tag | theme (quiz / sign-up copy) | app | Move to the customer phone via Flow. |
| tag `joined:YYYY-MM-DD` | tag | optional, backend | app | Alternative to `custom.joined_at`. |
| tag `newsletter` | tag | theme (popup, Profile subscribe) | Klaviyo sync | With `accepts_marketing`. |
| customer note `Phone: / Address: / City: / Birthday:` | text, one per line | theme (register) | Flow / staff | Phone is +94XXXXXXXXX from Round 8. |
| localStorage `snh_app_view` | overview … profile | theme | theme | Last view. |
| localStorage `snh_goals` | JSON {goal,freq,sport,bday,mobile,email,at} | theme | theme | Instant UI; tags are the record. |
| localStorage `snh_onboard_pending` | — | — | — | Retired in Round 10 (the app deletes any leftover). |
| sessionStorage `snh_posting` | redeem · goals · news | theme (on submit) | theme (banner) | Which form just posted. |
| localStorage `snh_vector_avatar` | initials · bolt · barbell · shield · flame · trophy · heart · dumbbell | theme | theme | Same key as V8. |
| localStorage `snh_goal_prompt_off` | "1" | theme | theme | Dismissed personalise prompt. |
| Theme settings → SNH Elite | rates, thresholds, welcome points, redeem from, Rs per point, perks | client | everything Elite | Never hard-coded in the app. |
