# Klaviyo flows to build by hand

These 12 flows (plus one split) could not be created by API: their trigger doesn't exist in the account yet, or they
need one of Klaviyo's special triggers. The templates are already in Klaviyo (*Content → Templates*, names start with
`SNH ·`). Build each as **Draft**; turn on only after the go-live checklist in SETUP-LOG.md.

For every email step: **Email → Use template → Saved templates → (template name)**, then paste the subject, preview text
and A/B subject from `INDEX.md`. Sender: support@sportsnutritionhub.lk · "Sports Nutrition Hub - SNH". Smart sending on,
UTM tracking on, unless the step says otherwise.

To use **Composer AI** (Flows → Create flow → "Create with AI"): paste the prompt in the box, then check the result
against the steps above it before saving.

---

## 1. Quiz plan (needs the `Workout Plan Unlocked` metric: appears after the first quiz on the new theme)

1. Flows → Create flow → Build your own → name `SNH · Quiz plan` → trigger **Metric: Workout Plan Unlocked**.
2. Email → template `SNH · Quiz + workout plan · your stack + free workout plan` (subject `Your plan: {{ event.plan_title }}`).
3. Time delay **3 days** → Email → `SNH · Quiz + workout plan · day-3 check-in`.
4. Time delay **1 day** → Conditional split **"Has placed order at least once over all time"** → **NO** branch → Email → `SNH · Quiz + workout plan · save your plan (guest → account)`.
5. Save as draft.

> Composer: *Create a flow called "SNH · Quiz plan" triggered by the metric "Workout Plan Unlocked". Send the saved template "SNH · Quiz + workout plan · your stack + free workout plan" immediately. Wait 3 days, send "SNH · Quiz + workout plan · day-3 check-in". Wait 1 day, then a conditional split on "has placed an order at least once over all time"; on the false branch send "SNH · Quiz + workout plan · save your plan (guest → account)". Keep everything in draft.*

## 2. Popup code (needs the popup form and a `Popup` list)

1. Audience → Lists → Create list `Popup`. Edit the SNH popup form: on submit, add to `Popup` and set hidden fields `popup_code` (WELCOME5 / WELCOME7 / WELCOME10) and `popup_prize` (5% / 7% / 10%).
2. Flows → Create → `SNH · Popup code` → trigger **List: Popup**.
3. Email → `SNH · Email popup game · Popup 1: your discount code` → **smart sending off** (it delivers the code).
4. Time delay **5 days** → Conditional split **"Placed Order zero times since starting this flow"** → **YES** → Email → `SNH · Email popup game · Popup 2: code expiring`.

> Composer: *Create "SNH · Popup code", triggered when someone joins the list "Popup". Send "SNH · Email popup game · Popup 1: your discount code" right away with smart sending off. Wait 5 days; if they have placed zero orders since starting the flow, send "SNH · Email popup game · Popup 2: code expiring". Draft only.*

## 3. Back in stock (Klaviyo's back-in-stock trigger)

1. Settings → Back in stock: turn on, add the button to product pages (theme app embed).
2. Flows → Create → `SNH · Back in stock` → trigger **Back in stock** (not the metric).
3. Email → `SNH · Back in stock · Back in stock`. Keep Klaviyo's default inventory threshold and delay.

> Composer: *Create a back-in-stock flow "SNH · Back in stock" using Klaviyo's back-in-stock trigger, sending the saved template "SNH · Back in stock · Back in stock". Draft.*

## 4. Price drop (Klaviyo's price-drop trigger)

1. Flows → Create → `SNH · Price drop` → trigger **Price drop** (catalog), minimum drop 5%, people who viewed or carted the item in the last 30 days.
2. Email → `SNH · Price drop · Price drop`.

> Composer: *Create "SNH · Price drop" using the price-drop trigger (drop of at least 5%, viewed or added to cart in the last 30 days) and send "SNH · Price drop · Price drop". Draft.*

## 5. How to use: the category split (flow `SNH · How to use` exists as draft with the protein email)

1. Open `SNH · How to use` → after the 3-day delay, add a **Trigger split** on `Fulfilled Order` property **Items** (or `ItemNames`) **contains** `Whey` / `Protein` → YES: keep the protein email.
2. On NO, another trigger split: Items contains `Creatine` → YES: Email `SNH · Post-purchase · How to use: creatine`.
3. NO → split: Items contains `Pre-workout` / `Pre Workout` → YES: `SNH · Post-purchase · How to use: pre-workout`.
4. NO → split: Items contains `SiS` / `Gel` / `Hydro` / `Electrolyte` → YES: `SNH · Post-purchase · How to use: hydration (SiS)`. NO: end.

> Composer: *In the flow "SNH · How to use", after the 3-day delay add trigger splits on the Fulfilled Order items: protein or whey → "How to use: protein"; creatine → "How to use: creatine"; pre-workout → "How to use: pre-workout"; SiS, gel, hydro or electrolyte → "How to use: hydration (SiS)". Use the saved SNH templates. Keep it draft.*

## 6. Elite monthly statement

Not a flow: **Campaigns → Create → Email** → template `SNH · SNH Elite · Monthly points statement` → audience segment
"loyalty_points greater than 0" (create it after the sync) → schedule the 1st of each month (duplicate monthly).

> Composer: *Create an email campaign on the 1st of the month to everyone whose loyalty_points is greater than 0, using the template "SNH · SNH Elite · Monthly points statement". Draft.*

## 7. Tier upgrade (needs `loyalty_tier` on profiles)

1. Flows → Create → `SNH · Tier upgrade` → trigger **Profile property changed: loyalty_tier**.
2. Conditional split `loyalty_tier` equals `Silver` → YES: `SNH · SNH Elite · Tier upgrade: Silver`. NO → split equals `Gold` → YES: `SNH · SNH Elite · Tier upgrade: Gold`.

> Composer: *Create "SNH · Tier upgrade" triggered when the profile property loyalty_tier changes. If it equals Silver send "SNH · SNH Elite · Tier upgrade: Silver"; if it equals Gold send "SNH · SNH Elite · Tier upgrade: Gold". Draft.*

## 8. Close to next tier (needs `next_tier_progress`)

1. Segments → Create `SNH Elite · Close to next tier`: `next_tier_progress` ≥ 75 AND < 100.
2. Flows → Create → `SNH · Close to next tier` → trigger **Added to segment** (that segment) → flow filter "has not been in this flow in the last 60 days" → Email `SNH · SNH Elite · Close to next tier`.

> Composer: *Create a segment where next_tier_progress is at least 75 and less than 100, and a flow "SNH · Close to next tier" triggered when someone joins it (not more than once every 60 days) sending "SNH · SNH Elite · Close to next tier". Draft.*

## 9. Reward ready (needs the `Elite Near Reward` metric, or `loyalty_points`)

1. Flows → Create → `SNH · Reward ready` → trigger **Metric: Elite Near Reward** with trigger filter `points_to_reward` equals 0 (or segment trigger: `loyalty_points` ≥ 2500).
2. Flow filter: not in this flow in the last 30 days → Email `SNH · SNH Elite · Reward ready (2,500 points)`.

> Composer: *Create "SNH · Reward ready" triggered by the metric "Elite Near Reward" when points_to_reward equals 0, at most once every 30 days, sending "SNH · SNH Elite · Reward ready (2,500 points)". Draft.*

## 10. Redeem confirmation (needs `Elite Reward Redeemed`)

Flows → Create → `SNH · Redeem confirmation` → trigger **Metric: Elite Reward Redeemed** → Email `SNH · SNH Elite · Redeem confirmation` → **smart sending off**.

> Composer: *Create "SNH · Redeem confirmation" triggered by the metric "Elite Reward Redeemed", sending "SNH · SNH Elite · Redeem confirmation" immediately with smart sending off. Draft.*

## 11. Points expiring (needs `Elite Points Expiring`)

Flows → Create → `SNH · Points expiring` → trigger **Metric: Elite Points Expiring** → Email `SNH · SNH Elite · Points expiring`.

> Composer: *Create "SNH · Points expiring" triggered by the metric "Elite Points Expiring", sending "SNH · SNH Elite · Points expiring". Draft.*

## 12. Birthday (needs `birth_date`, `birthday_pct`, `birthday_code`)

1. Coupons → Create → Shopify → `BIRTHDAY` unique codes (10% Silver, 15% Gold: make two coupons, or one per tier).
2. Flows → Create → `SNH · Birthday` → trigger **Date property: birth_date**, 7 days before, repeats yearly → flow filter `loyalty_tier` is Silver or Gold → Email `SNH · SNH Elite · Birthday reward (Silver 10% / Gold 15%)` (insert the coupon tag for `birthday_code`).

> Composer: *Create "SNH · Birthday", triggered 7 days before the date property birth_date every year, only for profiles whose loyalty_tier is Silver or Gold, sending "SNH · SNH Elite · Birthday reward (Silver 10% / Gold 15%)". Draft.*

## 13. Referral notify (needs `notify_referrals`)

Flows → Create → `SNH · Referral notify` → trigger **Profile property changed: notify_referrals** equals true → Email `SNH · Business · Referral “coming soon” confirmation`.

> Composer: *Create "SNH · Referral notify" triggered when the profile property notify_referrals becomes true, sending "SNH · Business · Referral “coming soon” confirmation". Draft.*
