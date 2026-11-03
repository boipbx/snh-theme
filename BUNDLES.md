# Bundle offers: how to fill them (Round 12)

## Round 19: bundle products are found automatically

The cart (drawer + /cart page) now finds every **bundle product** by itself, no setup needed:

1. **Which products are bundles:** every available product in the *Bundle collections*
   (Theme settings → SNH bundle offers → Bundle collections; default `training-strength-bundles,
   daily-health-wellness-bundles, endurance-bundles, bundle-offers`). Today that's 25 products (type "Bundle").
2. **What each bundle contains:** read from its description: a sentence that **starts with the brand and the
   product's full name**, e.g. "AN Creatine Monohydrate (50 Servings) is …", "SiS GO Isotonic Energy Gels deliver …",
   "SNH 2.0 Shaker Bottle 750ml is …". Brand short forms understood: AN / Applied Nutrition, RAW, SiS / Science in
   Sport, REVIVE, MyProtein / MP, TRACE, SNH, Healthspan, EHP, MuscleTech, PhD. A size in brackets must match the
   product's size (so a 50-serving creatine bundle doesn't claim the 200-serving tub).
3. **Overrides:** Theme settings → SNH bundle offers → *Bundle contents: overrides*, one line per bundle, by handle:
   `race-day-pack-1-0 + sis-go-hydro-tablets` (add), `deep-sleep - applied-nutrition-zma` (remove),
   `my-new-stack = handle-a, handle-b` (set exactly). Two lines ship by default (Hydro tablets in Race Day Pack 1.0,
   Omega 3 in Everyday Essentials: their descriptions name them in a form the reader can't match).

**What the shopper sees.** Under a basket line that a bundle contains: *Make it a bundle · save Rs X*, the bundle's
picture and name, "Swaps your <item> for the bundle · Rs P", and **Swap** (adds the bundle, takes one of each covered
item out). The bundle offered is the closest fit: the one covering most basket items, then the cheapest (fewest
extras). When a bundle product is in the basket (or a settings offer below is complete): **🎉 Bundle unlocked:
you're saving Rs X** at the top of the drawer and cart page, with a short confetti burst once per bundle (off for
reduced motion, or with *Confetti on Bundle unlocked*). The saving = compare-at price (else SNH's price sheet) − price.

The full product → bundle table the cart computes: `prototype/shots/r19/07-bundles/bundles.md`
(`node prototype/tools/r19-bundles.js <products.json>` regenerates it).


The cart drawer and cart page show a collapsed **Bundle offer** row when a product in the basket belongs to an offer
("Make it a pair" for a one-product offer, "Complete the bundle · Rs X" for a multi-product one). Right now every
offer is empty, so the row never appears. Two places feed it; the theme reads **both** (metaobject entries first).

> The offer only *advertises* the deal. The price drop must come from a real discount in **Discounts** (e.g. an
> automatic "Buy X get Y" or "Amount off products" that targets the same products). Set that up first, with the same
> products, then fill the offer.

## Option A (now, no setup): Theme settings → SNH bundle offers

*Online Store → Themes → SNH Dev → Customize → ⚙ Theme settings → SNH bundle offers → Offer 1 … 12*

| Field | What to enter |
|---|---|
| **Products in this bundle** | The products that make the deal. **One product = twin pack** ("buy 2"). Two or more = a stack. |
| **Offer name** | What the shopper reads, e.g. "Whey + Creatine stack" |
| **Saving label** | The saving in words, e.g. "Save Rs 1,500" or "2nd one 20% off". Must match the discount you created. |

Each offer shows on the cart (and the product pages that use these settings) for every product it contains.

### Suggested first offers (match them to discounts you create)

| # | Offer name | Products | Saving label (example) | Discount to create |
|---|---|---|---|---|
| 1 | Whey + creatine stack | Applied Nutrition Critical Whey 2kg + Applied Nutrition Creatine Monohydrate | Save Rs 1,500 | Amount off products, both in cart, Rs 1,500 off |
| 2 | Creatine twin pack | Applied Nutrition Creatine Monohydrate (one product) | 2nd one 15% off | Buy X get Y: buy 1 get 1 at 15% off |
| 3 | Hydration stack | SiS GO Hydro tablets + SiS GO Isotonic Energy gels | Save Rs 500 | Amount off products |
| 4 | Pre + protein | RAW Thavage pre-workout + RAW CBUM Itholate protein | Save Rs 2,000 | Amount off products |
| 5 | Bars by the box | a protein bar (one product) | Buy 2 boxes, save 10% | Buy X get Y |
| 6 | Race day | SiS GO Isotonic gels + SiS GO Electrolyte | Save Rs 600 | Amount off products |

The store already sells **bundle products** too (handles in the cart page's price sheet: `creatine-starter`,
`whey-pre-stack`, `whey-training-stack`, `isolate-pre-stack`, `isolate-training-stack`, `raw-loaded-stack`,
`raw-training-stack`, `strength-foundation`, `endurance-trial-pack`, `race-day-pack-1-0`, `race-day-pack-2-0`,
`daily-foundation`, `immunity-daily`, …). Those are handled separately: the product page's *Bundle & save* box and the
cart page's *Swap to a bundle* find them when the bundle's **description names the product** (e.g. "Critical Whey
Protein"). Keep those descriptions accurate; you don't need to list them here.

## Option B (recommended later): an "SNH bundle" metaobject

Better when the team manages many offers or wants dates and drafts. *Settings → Custom data → Metaobjects → Add
definition*:

- Name **SNH bundle**, type handle **`snh_bundle`**, Storefronts access **Read**, Active/draft status **on**
- Fields: **Title** `title` (single line text) · **Products** `products` (product, **list**) · **Saving label**
  `save_label` (single line text) · optional **Discount code** `discount_code` (single line text, for your records)

Then *Content → Metaobjects → SNH bundle → Add entry* per offer. The cart reads entries before the Theme settings
offers (`snippets/snh-cart-cfg.liquid`), so you can move offers over one by one and clear the old setting.

## Check it

Add one product of an offer to the basket: the drawer shows **Bundle offer · <saving label>** under the suggestions;
open it to see "<product> is in the <offer name>" and the button. Adding the rest of the bundle should trigger your
discount in the summary ("applied automatically").
