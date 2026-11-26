# Storefront conversion polish (26 Nov 2026)

Principle: every surface shows only what helps someone buy: name → price → one key fact → action. No fake claims, discounts or urgency.

Before shots: `<component>/before-*-390.jpg` and `-1440.jpg`. Backups of every file touched: `docs/golive/backup-polish-2026-11-26/`.

## Status
| # | Component | Commit | Live? |
|---|---|---|---|
| 1 | Button system + copy | fc05105 | **Live** on `feat/theme-v2` (HTML check: 0 Liquid errors on product, collection, cart, home; new labels render) |
| 2 | Announcement pill | 38a6475 | Ready; not pushed live |
| 3 | Product page + bundle mapping | 7a19071 | Theme part ready; the bundle-link data sync is **live** (Admin API) |
| 4 | Product cards | 804ebf3 | Ready; not pushed live |
| 5 | Quick view | bb0d714 | Ready; not pushed live |
| 6 | Compare | 2850a16 | Ready; not pushed live |
| 7 | Basket (drawer + page) + rule suggestions | 4941ae7 | Ready; not pushed live; 12 rule checks pass (`scripts/tests/basket-rules.test.mjs`) |
| 8 | SNH list popup | 46b724e | Ready; not pushed live |

**Why 2–8 are not live:** the brief says to check each push live (390 + 1440 screenshots) and revert at once if broken. After commit 1, the store started answering this session's headless browser with a bot check / rate limit. The session's permission check then refused further automated browser loads of the live store. I did not try to get around either. Without a visual check I did not push the rest to the live theme. They are on branch `claude/gallant-lovelace-wtdgxt`, one commit per component, so they can be previewed and shipped in order.

## Critique notes (from the before shots) and what changed

**1. Buttons**
- *Critique:* the primary was a flat orange with a glow ring that read as a border, not a raised button. "Buy it now" was a heavy black outline competing with Add to cart. Secondary actions had 3 styles (outline, underline, ink). The quiz's "Next" was black.
- *Change:* one primary everywhere:
  - #C9481A base with a gradient that stays ≥ 4.49:1 for white text (4.75:1 at the text line), a soft drop shadow, an inset top light and an inset bottom shade.
  - Hover (mouse only): a 2px conic stroke (orange → amber → light) turns round the edge (`@property --snh-ring`, only the ring repaints) with an amber bloom.
  - Press: scale .98 with a tighter shadow.
  - Reduced motion: the stroke is still, with no lift or scale.
- *Secondary:* one bare text button (no outline, underline on hover, 48px tall).
- *Count:* 11 primary selectors cover every primary on the product page, sticky bar, quick view, cards' bundle CTAs, basket drawer + page (checkout), popups (email, campaign, the SNH list), Elite (`v-btn--accent`, 66 uses in the theme) and quiz (`.qzb__cta`, quiz Next). 7 secondary selectors: Buy it now, the sheets' Sign in / How it works, Full details, quiz Back, quiz Retake, No thanks, plus `.snh-text-btn`.
- **Copy changes:**
  - "Add to cart" → "Add to basket": product page, sticky bar and the 16 product templates.
  - "Add bundle · Rs X" → "Get the bundle · Save Rs X" (or "· Rs X" when there is no saving): product page bundles, basket bundle swap.
  - Popup "Subscribe" → "Get alerts →".
  - Sheet "Log in" → "Sign in".
  - Kept: "Secure checkout", "Add to basket · Rs X" (quick view).

**2. Announcement bar**
- *Critique:* the solid white "Shop now →" pill nearly filled the 28–30px bar, the 1.08 scale nudge made it look zoomed, and the bold arrow was heavy.
- *Change:* a 22px pill (20px on phones), 12px/600 text, see-through white with a hairline edge, and one soft shimmer per page load. No scaling.
- *Decision:* the brief said "about 26px", but the bar is 30px (28px on phones). 26px would touch its edges, so 22/20px keeps air above and below.

**3. Product page**
- *Critique:* there was a brand eyebrow above the title, then 4 separate rows (per serving, Koko, points, rating + stock), then a 4-line description, all before the options. The Koko sheet had a kicker, a 36px close floating off the grid and long paragraphs. Hydro Tablets had no bundle offer in the buy box.
- *Change:*
  - No brand line (all templates). The brand logo on the photo stays.
  - Title, then the price 8px under at 32/800, with the compare-at struck through and muted beside it, and "Save Rs X" in green.
  - One value line: "Rs 170 per serving · 50 servings". When a bigger size is cheaper per serving, a green link follows, e.g. "Save 29% per serving with 200 servings". It comes from live prices, either another size variant or the same product's own bigger pack.
  - One small Koko line, then one meta row: "● In stock · ★ 5.0 (5) · Earn 254 points".
  - The description paragraph is gone from the head.
  - Info sheets (delivery, payment/Koko, authenticity, Elite): title and a 44px close on one row, 3 short lines, actions. Esc and outside tap close them. They are a bottom sheet on phones.
- **Bundle mapping:**
  - The buy-box "Save with a bundle" now reads `custom.in_bundles` first, then description matches. Description matching alone missed Hydro Tablets, because the bundles say "SiS GO Hydro Tablets".
  - `scripts/sync-bundle-links.mjs` now reads components from the Shopify Bundles app, from every variant's components (SNH Ops / API bundles), and from a description / component-title fallback when a component variant is deleted.
  - Re-run live: 52 active bundles, 50 linked products, 4 writes (logged and backed up):
    - SNH 2.0 Shaker Bottle gets 3 bundles.
    - 3 RAW products were cleared, because their 2 bundles are drafts.
  - One "Save with a bundle" per page: the lower row only shows when the buy box has no bundle block.
- **10 products checked (Admin data):**
  - SiS Hydro Tablets → Race Day Pack 1.0, Race Day Pack 2.0.
  - Applied Nutrition Creatine (50 servings) → 5 bundles.
  - SiS GO Isotonic Gel → 2; SiS Beta Fuel Gel → 2; AN Vitamin D3 + K2 → 6; Revive Magnesium Glycinate → 16; RYSE Loaded Pre-Workout → 4; AN Critical Whey 25 → 2; Raw Protein Bar → 2; SNH 2.0 Shaker → 3.
- **BUNDLE tag:** the "Save Rs" pill no longer sits on bundle photos (it covered the green BUNDLE ribbon). The saving shows as green text under the price.

**4. Product cards**
- *Critique:* brand + rating row, options/per-serving line, Koko line and a hover points line made 6 text rows. Prices didn't line up. On phones the saving pill covered the photo.
- *Change:* image → name (2 lines) → price + small struck compare-at → green "Save Rs X". Removed: brand, rating, options/per-serving, Koko and points lines. There is one chip on the image corner ("3 flavours"), equal heights, and prices on one line. Phones: no saving pill on the photo.

**5. Quick view**
- *Critique:* brand + Koko lines, ragged pill wrapping, a "−" glyph sitting off-centre, a close button not on the content grid, and the add row scrolled away on phones.
- *Change:*
  - No brand or Koko line.
  - Options in an even grid (equal heights).
  - SVG − / + on a 48px stepper, next to "Add to basket · Rs X" on the same row.
  - 44px close aligned to the padding.
  - "Full details" is a bare text link.
  - Phones: about two option groups in view and the add row pinned.

**6. Compare**
- *Critique:* a 13px "Compare" heading, a 2-line lead, a bare checkbox, uppercase brand rows under every name, key specs as long paragraphs, and no sign of the best value.
- *Change:*
  - "Compare and save" (800) with one helper line.
  - An "Only differences" switch beside it (under it on phones).
  - No brand rows; chips show name, per serving and "Save X%" in green.
  - Label-left rows on desktop (label above on phones), clean dividers.
  - Best price / per serving / servings highlighted green with "Best value".
  - Key specs cut to their short names.

**7. Basket**
- *Critique:* bar + threshold label, a click & collect banner, item brand + tags, a "Bundle, save" row under each item, a "Bundle unlocked" banner, a bundle card, 3 suggestions, and "You save" in the footer. The cart page also had an offers strip, "Complete your stack", "Swap to a bundle", "Try something new", a large join box and the plan quiz.
- *Change:*
  - One free-delivery bar that fills smoothly on every add (ticks at 50% and 75%). Passing one pops a check and runs a sheen. Unlocking says "Free delivery unlocked 🎉" with a short confetti burst, once.
  - One small click & collect line under the bar.
  - Items: image, name, variant, stepper, price.
  - One "Make it a bundle" row.
  - 2 rule-based suggestions (`docs/golive/BASKET-SUGGESTIONS.md`, AOV Rs 18,600).
  - Savings as green lines in the totals ("Bundle saving −Rs 2,000").
  - Cart page: items left; one summary card right (savings, total, delivery line, checkout, payment icons) with "Sign in to earn N points" as one line under it. No offers strip, no extra rows, no quiz.

**8. SNH list popup**
- *Critique:* "Join the SNH list" with a vague subline and a "Welcome to SNH" kicker. The form side was a heading, a line and a field.
- *Change:*
  - "Be first to know about restocks and new drops".
  - 3 benefit lines with icons: restock alerts, new arrivals first, member-only offers.
  - Email, then "Get alerts →", then the consent line ("By signing up you agree to get emails from SNH. No spam; unsubscribe any time.").
  - A bare "No thanks", and "Already shopping? Join SNH Elite and earn 500 points" for guests.
  - The clip stays on the left on desktop and becomes a short strip on top on phones. The popup gate rules are unchanged.

**Sub-headings / filler lines removed:**
1. Product brand eyebrow.
2. Product short-description paragraph.
3. Info-sheet kickers ("Delivery", "Payment", "Authenticity", "SNH Elite").
4. "BUNDLE & SAVE" kicker and "N bundles include this" line.
5. The truncated bundle description in the bundle panel.
6. Compare lead "Tap a product below to compare it…" (replaced by one helper line).
7. Compare brand rows.
8. Card brand line, options/per-serving line and Koko line.
9. Quick-view brand line.
10. Basket item brand line and item tags.
11. Popup kicker "Welcome to SNH" and subline.
12. Cart page "Points and tier progress … are in the summary above".
13. Cart page plan-quiz prompt.

## Not done in this session
- After screenshots (390 / 1440), Lighthouse before/after and the in-browser basket flow (add creatine → shaker, pre-workout → snacks, free-delivery celebration). These need a browser on the live store, which this session can no longer drive.
- The before shots for the drawer at free delivery (1440) and the popup were blocked by the bot check; they were deleted rather than kept as error pages.
