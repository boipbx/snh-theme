# Basket suggestions (drawer + cart page), 26 Nov 2026

Code: `assets/snh-cart-reco.js` → `SNHReco.rules()`; data: `snippets/snh-cart-reco.liquid`; pool: `assets/snh-cart.js` → `Cart.prototype.pool`.
Test: `node scripts/tests/basket-rules.test.mjs` (12 checks, mocked catalogue).

## Always
- **2 items at most**, never one already in the basket, in stock only, real catalogue, real prices.
- Heading: "Goes well with your order" (or "Get to free delivery" / "Worth adding" in the order-value push).

## What goes with what (first match wins, in basket order)
| In the basket | Suggest |
|---|---|
| Creatine | a shaker / bottle |
| Pre-workout | protein bars, chips, snacks |
| Whey / isolate | a shaker, then creatine |
| Gels / electrolytes | more gels and electrolytes, energy bars |
| Vitamin D3 | K2 (and K2 → D3) |
| Magnesium | zinc (and zinc → magnesium) |
| Other vitamins | other vitamins |
| Anything else | bestsellers |

Categories come from the product type + title (`detect()` in the same file). Candidates come from the matching
collections (`collections` map in `snh-cart-reco.liquid`, e.g. accessories → `accessories-1`, vitamins →
`multivitamins, letter-vitamins, minerals`), Shopify's own recommendations, bestsellers and recently viewed.

## Order-value push (AOV)
- **AOV used: Rs 18,600.** SNH Ops data (D1 `orders`, not cancelled, QA orders excluded) on 26 Nov: last 30 days
  Rs 18,614 over 1,583 orders; last 90 days Rs 17,434 over 4,748 orders. Free delivery is from Rs 17,000.
- **When:** the basket is within **Rs 8,000** of free delivery, or (once delivery is free) within Rs 8,000 of the AOV.
- **What:** bigger, still relevant adds: sample / multi-pack sachets, bar boxes, and the **cheapest bundle** that
  matches the basket's categories (one bundle at most). Items that close the gap come first (smallest first), then the
  biggest that don't; nothing more than Rs 4,000 over the gap.
- Labels: "Unlocks free delivery", "Bigger pack, better value", "Bundle · better value".
- If nothing fits, the normal rules above apply.

## Tuning
- AOV and window: `"aov"` and `"aovWindow"` in `snippets/snh-cart-reco.liquid` (theme settings `snh_reco_aov` /
  `snh_reco_aov_window` override them if added to the settings schema). Re-check the AOV monthly:
  `SELECT ROUND(AVG(total)) FROM orders WHERE cancelled=0 AND total>0 AND created_at >= datetime('now','-30 days')`.
- Pairings: `RULES` and `PAIRS` at the top of `rules()` in `assets/snh-cart-reco.js`.
- What counts as a "bigger" add: the `BIG` pattern (sachet, sample, multi-pack, box, pack of, x 12 …) plus bundles.
- Which collections feed each category: `collections` in `snh-cart-reco.liquid` (or Theme settings → SNH cart suggestions).
- Debug: the drawer / cart root carries `data-cart-decision` (JSON: rule, gap, AOV, wanted pairs, what was picked).
