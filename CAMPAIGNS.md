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
