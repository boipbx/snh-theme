# SNH recommendations: one engine (Round 13–14)

**Brain:** `assets/snh-cart-reco.js` (`SNHReco.decide` for the basket, `SNHReco.browse` for everything else).
**Data:** `snippets/snh-cart-reco.liquid` (complement map + category → collection map from Theme settings → SNH cart
suggestions, the bestsellers collection, and for members their last 10 orders + goal tag).
**Pool / rendering:** `assets/snh-cart.js` (drawer + cart page suggestions; the `[data-snh-reco]` widget).

| Where | Seeds | Mode | Heading |
|---|---|---|---|
| Cart drawer + cart page | the basket | `decide` (free-delivery gap logic, round caps) | Close the gap / Goes with your order / Free delivery is on |
| Empty basket (drawer + page) | recently viewed, else member goal / bestsellers | `browse` | Picked for you |
| PDP "Goes well with" | the product | `browse` (`pdp`) | Goes well with |
| Account Overview | basket + recently viewed + order history + goal | `browse` | Goes with your orders (the diet/budget-aware "Picked for you" grid stays under it) |
| Search, no results | basket + recently viewed | `browse` | You might be looking for |
| 404 | basket + recently viewed | `browse` | Popular right now |

**Signals and weights** (both modes): complement of a seed / basket category +50 · bundle with a basket item +40 (shown
as the bundle card, drawer only) · member bought this category before +30 · restock due (consumable, 25–75 days)
+20 · goal tag +20 · recently viewed +20 · bestseller (store-wide sales signal: the bestsellers collection) +10 ·
≤ Rs 2,000 +15. Candidates: the complement categories' collections, the bars collections, Shopify's Recommendations
API (complementary + related, store-wide co-purchase signal), bestsellers, recently viewed. Excluded: in the basket,
sold out, bundle products, non-consumables bought in the last 30 days, and (basket only) anything priced ≥ the
subtotal. One item per category; always one bar / snack ≤ Rs 1,500 when one is in stock.
**Labels** (the most personal reason wins): Unlocks free delivery · Time to restock · You looked at this · From your
usual stack · For your goal · Goes with your <category> / Goes well with this · Try a protein bar · Popular with
members / Bestseller.

## 12-scenario test (guest / member × 6 baskets)

`prototype/tools/r14-reco.js` (drawer, mocked basket, target theme asserted; the member scenarios inject the order
history whey 40 days ago, creatine 60 days ago, shaker 10 days ago and goal "build muscle" into the page's cart JSON).
Results: see the table below (written by the test).
