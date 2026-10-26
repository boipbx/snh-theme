# SNH theme v2

The approved prototype (`prototype/`) built as Shopify sections on top of Impact, on branch `feat/theme-v2`.
Everything new is editable in **Online Store → Themes → Customize**. Nothing here was pushed or published; the
`shopify theme dev` server synced it to the unpublished **SNH Dev** theme (`189336944894`).

Preview: https://sports-nutrition-hub.myshopify.com/?preview_theme_id=189336944894

## How it is put together

| Piece | Where |
|---|---|
| Shared styles (ported prototype CSS + theme layer) | `assets/snh-v2.css` |
| Shared behaviour (header, carousels, tabs, Shop the Look, marquee, cart add) | `assets/snh-v2.js` (vanilla, deferred, re-runs in the editor) |
| Fonts | Inter from the theme font settings; Instrument Serif italic self-hosted (`assets/instrument-serif-italic-latin.woff2`) |
| Shared snippets | `snh-v2-card` (product card), `snh-v2-head`, `snh-v2-heading`, `snh-v2-icon`, `snh-v2-img`, `snh-v2-links`, `snh-v2-minis`, `snh-v2-title`, `snh-v2-brand-tile`, `snh-v2-stl-add`, `snh-v2-bundles`, `snh-v2-post`, `snh-v2-purchase-options` |
| Seeding scripts (one-off, already run) | `prototype/theme_tools/` |
| Checks | `prototype/tools/build-*.js` (Playwright, against `127.0.0.1:9292`) |

**Headings with a serif word:** in any heading field, wrap the word in asterisks: `Shop *your* way` shows "your" in the
serif italic.

**Links lists:** menu and footer zones take a **Navigation menu** (pick it in the zone's *Menu* field). Until a menu is
picked, the zone shows its **Fallback links**: one per line, `Label | /collections/handle`.

## Header and footer (every page)

### SNH header (`sections/snh-header.liquid`, header group)
- **Settings:** logo (+ optional light logo for the transparent state), logo width, *Transparent over the homepage hero*,
  ticker messages (one per line) and loop time, announcement rotation time, all-brands page link, search placeholder,
  popular searches (comma separated), *Trending now* collection, signed-out account note.
- **Blocks** (the nav shows them in block order):
  - *Announcement*: tag, text, link. One shows at a time in the orange bar.
  - *Mega menu*: label (text after " & " is hidden between 1024 and 1199px), then four zones:
    1. *Shop by need*: heading, menu or fallback links, *View all* link.
    2. *Shop by type*: the same fields.
    3. *Top brands*: brand names, comma separated, matching the Brand blocks.
    4. *Promo cards*: two cards (image, eyebrow, label, link) and a *Bestsellers* collection (its first 3 products).
  - *Brands A–Z panel* and *Offers panel* (four offer collections with optional images, perks `icon | text`, deals
    collection).
  - *Menu link*: a plain nav link, e.g. SNH Elite.
  - *Brand*: name, logo, *Fill the tile* or *Padded*, link. These feed the A–Z panel and the *Top brands* zones.
  - *Mobile menu promo*: up to 2, shown under the phone menu.

**To change a menu promo card:** Customize → Header → open the mega menu block (e.g. *Supplements*) → *Zone 4 · promo
cards* → change Card 1/Card 2 image, eyebrow, label, link.

### SNH footer (`sections/snh-footer.liquid`, footer group)
- **Settings:** stores heading, hours line, payments line, WhatsApp number, legal line, store policy links on/off,
  bleeding logo image, orange dot on/off.
- **Blocks:** *Store* (name, address, phone); *Menu column* (heading, menu or fallback links).
- Instagram, TikTok and Facebook links come from **Theme settings → Social media**.

## Homepage sections (in order)

| Section | What you edit |
|---|---|
| **SNH hero slider** | Time per slide. *Slide* blocks (up to 8): type (*Photo + our text* or *Banner*), desktop + mobile image, focal points (`x% y%`), eyebrow, heading, sub line, two buttons. |
| **SNH goal strip** | Label; *Goal* blocks (label, link). |
| **SNH brand marquee** | Label, speed (px per second), direction, logo size; *Logo* blocks. |
| **SNH shop your way** | Eyebrow, heading, link; *Tile* blocks (image, title, link). |
| **SNH why choose us** | Eyebrow, heading, lead; *Stat* blocks (a ★ turns orange) and *Benefit* blocks (icon, title, text). |
| **SNH shop the look** | Heading, button, campaign image, zoom, quick card on/off, points-strip rates and thresholds; *Product* blocks with position sliders. |
| **SNH shop by goal** | Two tab names; *Goal tile* blocks (tab, image, title, link). Anchor `#goals`. |
| **SNH bestsellers** | Heading, button, products per tab; *Tab* blocks (label, hand-picked products or a collection). Anchor `#shop`. |
| **SNH SiS slider** | Logo, badge text (`[...]` hidden on phones), product strip; *Video*, *Tile row* and *Trusted by athletes* slides. Anchor `#sis`. |
| **SNH bundle & save** | Heading, lead, link; *Offer* blocks (image, badge, title, link). |
| **SNH Elite band** | Copy, chips (one per line), two buttons, Silver/Gold thresholds (they place the ladder marks), cutout/gift/coins images, card text; *Tier* blocks (colour, name, rate, threshold line, perk). Anchor `#elite`. |
| **SNH reviews** | Rating line, heading, link; any review **app block** (Google Reviews is in it) or *Review quote* blocks for real quotes. |
| **SNH buying guides** | Blog, number of articles, card label, heading, link. Shows the latest articles that have an image. |
| **SNH FAQ** | Eyebrow, heading, lead; *Question* blocks (question, answer). |
| **SNH stores** | Heading, link; *Store* blocks (photo, name, address, phone, hours, map link). Anchor `#stores`. |
| **SNH newsletter** | Heading, lead, placeholder, button, thank-you text, customer tags. |

### Update the hero slides
Customize → Home page → **SNH hero slider** → click a *Slide*. The editor jumps to that slide and holds it.
- **Photo + our text:** use a clean photo; our heading and buttons sit on it.
- **Banner:** use artwork with the text already in it; the whole slide links to *Button link*.
- Always upload a portrait **mobile image**.
- Use the focal point to keep faces or products in view (`50% 30%` = centre, upper third).

### Update Brand of the month (Shop the Look hotspots)
Customize → Home page → **SNH shop the look**:
1. Change the **campaign image** (square, 2000 × 2000).
2. For each *Product* block, pick the product and drag **Horizontal / Vertical position** until its dot sits on that
   product in the preview. The selected block's dot lights up while you edit.
3. Change the heading (`Shop the *look*: BRAND`) and the button link to the brand collection.

Up to 6 products. The dots are numbered in block order, and the list on the right follows the same order.

### Update the brand marquee
Customize → Home page → **SNH brand marquee** → add, remove or drag *Logo* blocks.
- Use a transparent PNG/SVG where you can. For a logo drawn on a black or coloured square, tick **Logo on a dark
  background** so it sits on the white tile like the others.
- Use **Logo scale** to even out logos with lots of empty space around them.
- **Speed** is in pixels per second, so the speed stays the same as logos are added.

## Product page

`sections/main-product.liquid` keeps all its existing logic and blocks, laid out to the prototype:
- 12-column grid: gallery 7 columns, buy box 5, both sticky.
- Buy box order: title, brand/stock, subtitle, price + per serving, Koko + points, flavour then size, purchase options,
  quantity, *Add to cart* + *Buy now*, WhatsApp, bundle box, why-athletes ticks, SNH Elite strip, description.
- The accordions move to a full-width **The details** band.

New settings under **SNH v2 layout**:
- bundle box on/off;
- the bundle collections it searches;
- the details band text.

| Part | How it works |
|---|---|
| **Purchase options** | Shown when the product has **selling plans** (Appstle Subscriptions creates them): one-time vs subscribe & save with a frequency picker. Nothing shows for products without plans. If Appstle's own widget is on the page, the theme version hides itself. |
| **Bundle box** | Finds the store's bundle products whose **description names this product** (e.g. "Critical Whey Protein"), up to 3. *Separately* uses the bundle's compare-at price, else SNH's bundle sheet (same figures as the product cards). To add a bundle, put it in one of the bundle collections and name the product in its description. |
| **SNH related articles** | Section after the main section on every product template. Scores the blog's latest 50 articles on product type, tags, title words and vendor; tops up from the fallback blog. Settings: blog, fallback blog, count, heading, link. |
| **Key benefits** | Product metafield `custom.key_benefits`: a list, or multi-line text (one point per line). The first point also appears on product cards. |

## Notes for whoever edits code next
- Impact's own sticky add-to-cart bar and floating filter button look for `.footer` and `.shopify-section--footer`.
  The SNH footer carries both classes; keep them.
- In `main-product.liquid`, `v2Layout()` runs after every `restructureInfo()` pass. Keep its writes conditional:
  `snhTrimCaptions()` and the theme re-renders have their own MutationObservers, and an unconditional write loops
  forever.
- New section settings do **not** take their schema default in existing JSON templates; write the values into the
  templates (see `prototype/theme_tools/seed_product_templates.py`).
- Old sections are still in the repo (`ss-header-4`, `ss-footer-16`, the old homepage sections) but on no template or group.
