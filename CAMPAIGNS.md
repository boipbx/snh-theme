# SNH campaigns: run an offer without code (Round 12)

One campaign layer drives four placements. Each campaign switches itself **on at its start and off at its end**
(checked in the shopper's browser, so even a cached page changes on time).

| Type | Where it shows | Notes |
|---|---|---|
| **Announcement bar** | The orange bar above the header, rotating with the other messages | Colour (orange / black / cream / green): the bar takes the colour of the top live item (highest-priority campaign, else the first live header block) and keeps it while the messages rotate. Tag, link, optional code shown after the text |
| **Promo popup** | A centred card (bottom sheet on phones) after a few seconds | Frequency: once per visitor / once a day / once per visit / every page view. Never on the same page view as the welcome (email) popup |
| **Homepage banner** | Under the homepage hero | Top-priority live one only |
| **Cart banner** | Top of the cart drawer and the cart page | Top-priority live one only |

Targeting on every campaign: **pages** (all, homepage, collections, products, cart), **audience** (everyone, guests,
members, Bronze / Silver / Gold members), **priority** (higher first).

The code: `sections/snh-campaigns.liquid` (in the new **Campaigns** section group, `sections/campaigns-group.json`,
rendered on every page), `assets/snh-campaigns.js` (decides and renders), `assets/snh-campaigns.css` (loaded only
when a popup or banner is live). Header **Announcement** blocks also got start / end / colour / audience.

---

## 1. Create the "Site campaign" metaobject (once, in admin)

*Settings → Custom data → Metaobjects → Add definition*

- **Name:** Site campaign · **Type (handle):** `site_campaign` (the theme reads this handle; it's a setting on the
  Campaigns section if you choose another)
- **Access:** Storefronts → **Read** (required, or the theme can't see the entries)
- **Options:** Active/draft status on (so drafts never show)

| Field name | Key | Type | Validation / notes |
|---|---|---|---|
| Name | `name` | Single line text | Internal, also the display name |
| Type | `type` | Single line text | **Choices:** `announcement`, `popup`, `home_banner`, `cart_banner` |
| Heading | `heading` | Single line text | Popup and banners |
| Message | `message` | Single line text (or multi-line) | Announcement text / popup and banner body |
| Tag | `tag` | Single line text | Small pill in the announcement, e.g. "Ends Sunday" |
| Image (desktop) | `image_desktop` | File (images) | Popup 16:9, home banner 16:9 |
| Image (mobile) | `image_mobile` | File (images) | Optional |
| Button text | `cta_text` | Single line text | |
| Button link | `cta_link` | URL | |
| Discount code | `discount_code` | Single line text | Must already exist in Discounts; shown with Copy + Apply |
| Starts | `start_at` | Date and time | Empty = live now |
| Ends | `end_at` | Date and time | Empty = no end |
| Pages | `target_pages` | Single line text | **Choices:** `all`, `home`, `collections`, `products`, `cart` |
| Audience | `audience` | Single line text | **Choices:** `all`, `guests`, `members`, `bronze`, `silver`, `gold` |
| Priority | `priority` | Integer | Higher shows first |
| Colour | `tone` | Single line text | **Choices:** `orange`, `ink`, `cream`, `green` |
| Popup frequency | `frequency` | Single line text | **Choices:** `once`, `day`, `session`, `always` |

Until the metaobject exists, use the **same fields as blocks**: *Customize → (any page) → Campaigns → Add block →
Campaign*. Both sources are merged; you can mix them.

## 2. Schedule an offer, end to end

Example: "Weekend stack: Rs 2,000 off whey + creatine, Fri 6pm to Sun midnight".

1. **Create the code** (*Discounts → Create discount → Amount off order*): code `STACK2000`, Rs 2,000, minimum
   purchase if you want one, start **Fri 18:00**, end **Sun 23:59**. Discounts are the only thing that really decides
   whether the price drops; the campaign only advertises it, so give both the same dates.
2. **Create the campaign entry** (*Content → Metaobjects → Site campaign → Add entry*), or a Campaign block:
   - Type `popup`, Heading "Weekend stack deal", Message "Whey + creatine, Rs 2,000 off until Sunday.",
     Discount code `STACK2000`, Button "Shop the deal" → `/collections/whey-protein`
   - Starts Fri 18:00, Ends Sun 23:59, Pages `all`, Audience `all`, Priority 3, Frequency `day`, Colour `ink`
   - Status **Active**, Save.
3. Optional companions with the same dates: a `announcement` ("Weekend stack: Rs 2,000 off · STACK2000"), a
   `home_banner`, a `cart_banner`.
4. **Check before it starts**: put a copy with a start in the past on a draft theme, or temporarily set the start to
   now, open the store, then set it back. (The welcome popup has `?popup=test`; campaigns need a live date.)
5. Nothing to do at the end: on Sunday 23:59 every placement disappears by itself. Archive or delete the entry later.

## 3. Rules the theme applies

- Live = start ≤ now < end (shop time when typed in a block, e.g. `2026-11-01 08:00`; metaobject date-times carry their zone).
- Wrong page or audience = not shown. Members' tier comes from `custom.loyalty_tier`.
- One promo popup per page view, the highest priority; skipped if the cart drawer, the checkout modal or the welcome
  popup is open, and the welcome popup won't open on a page view where the promo popup already did.
- Frequency is remembered in the shopper's browser (`snh_cmp_<id>`): `once` forever, `day` 24h, `session` until the
  tab closes, `always` every page view.
- QA: `prototype/tools/r12-campaigns-qa.js` (past / active / future mocks) → `prototype/shots/r12/p8/campaigns.md`.


## Round 19: relevant promos only

- **Account + cart "Picked for you" promos** (Member promotion blocks / metaobject) now show only when they match the
  visitor's preferences: goals / sports / diets / bought words you set on the promo, matched against the member's quiz
  tags and the brands + product types of their last 10 orders, or a guest's quiz answers saved on their device.
  Every field you set must match, and at least one must be set. A promo with no targeting matches the brand in its
  link (`/collections/ryse` → shown to people who bought RYSE). Nobody sees untargeted "random" promos any more.
- **No preference data at all** (no quiz answers, no goal tags, no orders): a "Personalise your SNH" quiz card instead
  (on the account the existing goal prompt; elsewhere the promo slot's quiz card). The cart page shows nothing.
- **Site campaigns** (popup, homepage banner, cart banner) get the same optional fields: *Who it's relevant to* →
  Goals, Sports, Diets, Bought, and *Only show to matching visitors* (for launches: uses the link's brand when no
  targeting is set). Announcements stay site-wide. Campaigns without targeting behave as before.
- **Onboarding:** Customize → Overlay group → *SNH onboarding prompt*: a slide-in for visitors with no goal yet,
  once per 7 days (setting), never on cart / checkout / account pages, never on the same page view as the email or a
  campaign popup. Its button opens the homepage quiz (`/?snh-quiz=open`).

## Round 20: Saturday sale (15% off everything, every Saturday)

**What the website does by itself, every Saturday 00:00–23:59 Sri Lanka time** (Customize → Campaigns, the five
"Saturday sale" blocks):

| Where | What shoppers see |
|---|---|
| Announcement bar (first item, orange) | **Saturday sale** 15% off everything today · applied at checkout |
| Popup (once a day, after 6 s) | It's Saturday: 15% off everything, with a Shop the sale button |
| Homepage banner (under the hero) | Saturday sale: 15% off everything |
| Cart drawer and cart page | Saturday sale: 15% off · applied automatically at checkout |
| Every product card | an orange **−15% today** label on the image |
| Product pages | a line under the price: **Saturday sale** 15% off everything today · applied at checkout |
| Fridays (announcement bar only) | **Tomorrow** 15% off everything, all day Saturday |

The website only **shows** the offer. The price comes off at checkout through a Shopify discount, which you set up in
admin. Without it, shoppers would see the offer but not get it.

**The discount (Shopify admin → Discounts → Create discount → Amount off products)**

1. Method: **Automatic discount**. Title: `Saturday sale 15%` (shoppers see this in the cart and at checkout).
2. Value: **15%**. Applies to: **All products** (or a collection, if some products are excluded).
3. Combinations: decide whether it combines with other product discounts and with order discounts.
4. Active dates: start **Saturday 00:00**, end **Saturday 23:59**.
5. Shopify discounts don't repeat weekly by themselves. Either
   - create the next 8 Saturdays at once (Duplicate the discount, change the dates; about 10 minutes for 2 months), or
   - in **Shopify Flow**: a weekly *Scheduled time* trigger on Saturday 00:00 that activates the discount, and one on
     Sunday 00:00 that deactivates it.

**To change the wording, pause or stop it:** Customize → Campaigns → the "Saturday sale" blocks. Set an *Ends* date to
stop on a given day, change *Repeat on days* to move it, or clear *Highlight on products* to drop the product labels.
If the discount is paused in admin, pause these blocks too (or set an end date), so the website doesn't advertise it.
