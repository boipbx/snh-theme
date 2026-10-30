# SNH checkout plan (Round 12)

What the theme now does before checkout, what you can change in Shopify's checkout yourself, and what needs an app.
Nothing here was changed in the admin.

## 0. Plan capability: what I could check

| Check | Result |
|---|---|
| `layout/checkout.liquid` in this theme or on `main` | **Absent.** It only ever existed on Shopify Plus, and Shopify retired it for the information/shipping/payment steps in Aug 2024 and for Thank you / Order status in Aug 2025. Nothing to port. |
| Admin → Settings → Plan (look-only) | **Not checked.** The admin session in Chrome asked to choose an account / sign in again, and I don't sign in for you. Open *Settings → Plan* and look for "Shopify Plus". |
| Storefront | No Plus-only markers; market LK. |

**Working assumption: not Plus** (Basic / Shopify / Advanced). Everything in §1 and §2 works on any plan. If *Settings
→ Plan* says Plus, §3's "Plus only" column opens up too.

## 1. Branding spec: Settings → Checkout → Customize (checkout editor → ⚙ / brush icon)

Replace the dated banner collage with a clean SNH banner. Values match the v2 theme (`assets/snh-v2.css :root`).

| Setting (checkout editor) | Value |
|---|---|
| **Logo** | SNH wordmark, orange `#E0521C`, PNG/SVG, transparent, ≥ 600 px wide. Size: *Medium*. Position: *Left*. |
| **Banner (Header → Background image)** | **Remove the collage.** Either no image (cleanest), or one 2400 × 400 px photo: an SNH athlete or the store front, dark, no text on it; *Header background: Image*, *Blur* off. |
| **Main area background** | `#FFFFFF` |
| **Order summary background** | `#F5F2EC` (the v2 cream) |
| **Accent / links** | `#E0521C` |
| **Buttons** | Background `#E0521C`, text `#FFFFFF`. Corner radius: **Large** (closest to the theme's pill buttons). |
| **Errors** | `#A3271D` |
| **Form fields** | Background *Transparent* (white), border *Full*, corner radius **Base** (the theme's 12 px inputs) |
| **Typography** | Headings: **Inter** (Shopify font picker). Body: **Inter**. Size: *Base*. (Instrument Serif isn't in the checkout font list; leave it out.) |
| **Sections → corner radius** | *Base* |
| **Favicon** | the SNH "S" mark used by the theme |
| **Checkout language → "Pay now" button** | leave the default |
| **Phone (Settings → Checkout → Customer contact)** | Shipping address phone: **Required**. Country default comes from the market (LK). See §4 for the saved "+1" numbers. |

Check it on a phone at 390 px after saving: logo left, no banner text clipped, orange button.

## 2. Possible on our plan (checkout extensibility, no Plus)

| Where | What | How |
|---|---|---|
| **Thank you page** | "You earned N SNH points" + tier progress; "Join SNH Elite" for guests | App block from an app (or the SNH Elite app, §3) placed in *Checkout editor → Thank you* |
| **Order status page** | Points earned, tier, "reorder in 30 days" reminder, Join SNH Elite | Same app block on *Order status* |
| **Post-purchase page** (between payment and Thank you) | One-click upsell (add a bar/shaker to the paid order) | Post-purchase extension from an app; available on all plans for card payments (not for COD / Koko / manual methods: those skip it) |
| **Checkout branding** | §1 | Checkout editor, no code |
| **Discount / delivery logic** | Shopify Functions from apps (e.g. tiered member discounts) | Works on all plans when the app ships the function |

## 3. Plus only

- App blocks **inside** the information / shipping / payment steps (in-checkout upsells, "add a shaker for Rs 999",
  points preview next to the total, custom fields).
- `checkout.liquid` (retired anyway), checkout scripts, custom checkout UI extensions written by us for those steps.
- Until then, the theme's **pre-checkout modal** (Round 12, Phase 3) does this job just before checkout: summary,
  points, one last add-on, delivery date, then Card/COD vs Koko.

## 4. Fixing the phones already saved as "+1 0704209195"

The theme now saves every phone as `+94XXXXXXXXX` with the country set to Sri Lanka (`assets/snh-phone.js`: register,
edit profile, address forms, plan quiz). Existing records still carry the bad values. Admin options (do these
yourself; I didn't touch customers):

1. **Bulk export/import (no app):** Customers → Export (CSV, all customers). In the sheet, fix `Phone` and
   `Default Address Phone`: strip spaces, drop a leading `+1`, drop a leading `0`, prefix `+94` (only for 9-digit
   numbers that then start with 7, or 1–9 for landlines). Set `Default Address Country Code` to `LK`. Re-import with
   *Overwrite existing customers*. Test with 5 rows first.
2. **Shopify Flow (ongoing):** trigger *Customer created* and *Customer account updated* → condition `phone` does
   not start with `+94` → *Run code* (normalise as above) → *Update customer phone*. Addresses: an app or the Admin
   API (`customerAddressUpdate`) is needed, Flow can't edit address phones directly.
3. **SNH Elite app** (ELITE-ROADMAP): a one-off job over `customers(query:"phone:+1*")` that rewrites `phone` and each
   address `phone` + `countryCode: LK` through the Admin API, plus a webhook that normalises new ones.

## 5. Recommended apps / extensions

| Need | Option | Notes |
|---|---|---|
| Points earned on Thank you / Order status | **SNH Elite app** (preferred): a checkout UI extension targeting `purchase.thank-you.block.render` and `customer-account.order-status.block.render`, reading the order total and the customer's `custom.loyalty_tier` → "You earned N points" | Same rates as Theme settings → SNH Elite (store them in a shop metafield so theme and app share one source). Guests: "Create your SNH Elite account to keep these N points". |
| (off-the-shelf, if the app isn't ready) | Smile.io, Rivo or BON Loyalty all ship Thank-you / Order-status blocks | Only if you move loyalty to them; otherwise points would disagree with the theme. |
| Post-purchase upsell | **SNH Elite app** post-purchase extension (`purchase.post.render`) offering the cheapest add-on under Rs 2,000 (same rule as the cart, §Phase 1) | Or ReConvert / AfterSell / Zipify OCU. Card payments only. |
| Join SNH Elite after purchase | Thank-you block: "Join free, keep N points", links to `/account/register?checkout_email=…` | SNH Elite app or ReConvert's custom block |

Order of work: branding (§1, 20 minutes) → phone clean-up (§4) → SNH Elite app Thank-you block → post-purchase upsell.
