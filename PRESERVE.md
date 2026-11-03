# What must be preserved — SNH theme → fresh Impact

Inventory of every app embed, app block and custom integration in the current theme (branch `fix/c1-stale-template-blocks`, based on live snapshot `f206ce8`), and what it takes to keep each one on a fresh Impact install.

No files were changed to produce this.

---

## How a theme swap behaves (read first)

**Carries over automatically, because it's store data and not theme data:**
- installed apps and their back-ends
- products, collections, variants, metafields
- customers and their metafields
- navigation menus
- pages' body content, blog articles, Shopify policies
- discounts, Search & Discovery filters, markets/payment settings

**Does NOT carry over, because it lives in the theme:**
- everything in `config/settings_data.json`: colours, fonts, `cart_type`, social links, **app embed on/off switches**
- every **app block placement** in templates
- all **section content** stored in `templates/*.json` and `sections/*-group.json`: banners, FAQ copy, policy text, store addresses, WhatsApp numbers, links
- every custom `.liquid` file: sections, snippets, blocks

"Port" below means copy, adapt and test in the new theme. "Re-enable" means flip it on in *Theme editor → App embeds*, or re-add the block in the editor.

---

## 1. App embeds (`config/settings_data.json → current.blocks`)

All 7 are currently **enabled**. A fresh theme starts with **every embed off**.

| # | App / embed | What it does on SNH | Where it renders | Carries over? | Action |
|---|---|---|---|---|---|
| 1 | **Klaviyo** — `klaviyo-onsite-embed` | Klaviyo onsite tracking, forms and identify. Note: the SNH newsletter popup does **not** post to Klaviyo; it uses Shopify's customer form (see 3.9). | All pages (head) | ❌ off by default | Re-enable. Check that Klaviyo forms/flows still trigger. |
| 2 | **Judge.me** — `judgeme_core` | Core reviews script that powers the badge and widget blocks (section 2). `main-product.liquid` also restyles Judge.me output via `enhanceJudgeMe()`. | All pages | ❌ | Re-enable *before* re-adding the Judge.me blocks. |
| 3 | **Trafficly** — visitors counter | "X people viewing" social-proof counter | Product pages (app-controlled) | ❌ | Re-enable if still wanted. |
| 4 | **Amose Bundle** — `quantity_options` | Quantity-break / bundle options on the product form | Product pages, attached to the buy box | ❌ | Re-enable, then **test against the new product form**. It injects into the form, and its selectors may differ. |
| 5 | **Appstle Subscriptions** — `appstle-subscription-helper` | Subscribe & save widget, selling plans | Product pages, cart | ❌ | Re-enable. Check the widget's position in the buy box. Note the Koko router refuses subscription items (3.1). |
| 6 | **Microsoft Clarity** — `clarity_js` | Session recording / heatmaps | All pages | ❌ | Re-enable. |
| 7 | **Microsoft Clarity** — `brandAgents_js` | Clarity "brand agents" script | All pages | ❌ | Re-enable if in use. |

## 2. App blocks placed in templates

| App block | Placed in | Carries over? | Action |
|---|---|---|---|
| **Judge.me — preview badge** (star rating under the title) | `main-product` in **14 product templates** (all except `product.pre-order`, `product.with-gift-note`) | ❌ | Re-add to the new product template(s), under the title. |
| **Judge.me — review widget** (full reviews list) | `apps` section in **14 product templates** | ❌ | Re-add as an Apps section below the product. |
| **Hoppy Trust Badges** — `trust_badges_block` | `main-product` in **13 brand product templates** (not in default `product.json`) | ❌ | Re-add under the buy buttons. Decide whether the default template should get it too. |
| **Google Reviews** — `carousel-widget-block` | Home page, `apps` section | ❌ | Re-add to the home page. |

Judge.me star *metafield* reading (`product-rating.liquid`) is stock Impact and supports Judge.me plus ~15 other review apps. It carries over automatically.

## 3. Custom integrations in theme code (all need porting)

### 3.1 Koko "buy now, pay later" — 3 separate pieces, all theme code

| Piece | Source | Where it renders | Notes |
|---|---|---|---|
| **Koko checkout router** (modal choosing "Regular checkout" vs "Pay with Koko") | `snippets/koko-checkout-modal.liquid`, rendered from `layout/theme.liquid:107` | Every page. Intercepts Checkout buttons (cart page + both baskets) and the unbranded "Buy it now" button. | Posts the cart to an **external Cloudflare worker** `https://koko-fee-snh.raspy-wind-fe2d.workers.dev/`, which builds a draft-order checkout that adds the Koko fee (needs a **"Koko fee" product/variant** in the store; error codes `fee_variant_not_found`, `duplicate_fee_variant`). The worker also checks the **storefront origin**, so a preview/dev domain may get `origin_not_allowed`. Subscriptions are refused. **Port the snippet + the one-line render in `theme.liquid`; keep the worker and the fee product.** See audit H-4 for interception bugs to fix while porting. |
| **"or pay in 3 × Rs … with Koko"** price message | `snippets/price-list.liquid:79–120` (`.koko-pdp-message`, links to `paykoko.com/customer-education`, logo from `paykoko.com` + Koko's Aliyun CDN) | Product page under the price, quick-buy drawer | Port into the new `price-list` snippet. |
| **Koko line on product cards / quick buy / Shop by Brand** | `snippets/product-card.liquid`, `snippets/product-quick-buy.liquid`, `sections/Shobybrand.liquid` | Collection grids, search, related products, quick buy, Shop by Brand page | Port with the product card. |

### 3.2 SNH Elite loyalty (tiers + points), display-only in the theme

- **Data:** `customer.metafields.custom.loyalty_tier` (Bronze / Silver / Gold / MAXED OUT), `custom.loyalty_points`, `custom.annual_spend`. These carry over (store data). **The theme only reads them. Nothing in the theme writes them, and no loyalty app embed is installed**, so a Flow, custom app or manual process maintains them. Confirm what it is before the redesign.
- **Earn-rate logic is hard-coded in theme code:** Bronze 3%, Silver 7%, Gold/MAXED OUT 10%. It's duplicated in `cart-drawer.liquid`, `ss-header-4.liquid`, `main-cart.liquid` and `main-customers-account.liquid`, and the product page shows "Earn 960 to 3,200 points" (3–10%).
- **Where it renders:**
  - product page "Earn up to 10% back in points" banner (`main-product.liquid`, `injectPointsBanner`)
  - product cards "Sign in — earn Rs X back" (`product-card.liquid`)
  - both baskets and the cart page ("You'll earn N points…")
  - header account popover ("Bronze member", sign-in / join rewards)
  - **full loyalty account dashboard**: tier "metal card", points, annual spend, progress (`main-customers-account.liquid`, 1,889 lines)
  - SNH Elite-branded login (`main-customers-login.liquid`) and register (`main-customers-register.liquid`, "Fuel your goals. Earn your rewards.")
- **Action:** port all of the above. **Put the tier→rate table in one place** (theme setting or shop metafield) instead of four copies.

### 3.3 WhatsApp ordering & contact

| Where | Source | Number used |
|---|---|---|
| "Order on WhatsApp" button on product pages (pre-filled "Hello, I want to buy: <product> <url>") | **Custom Liquid block pasted into each product template** (4,270 chars, also injects a `<style>`) + `enhanceWhatsApp()` in `main-product.liquid` | `94779773359` in the 13 brand templates; `94764863359` in `product.json` |
| Header, FAQ section, Franchise page, Wholesale page | `ss-header-4.liquid`, `faq.liquid`, `franchisesection.liquid`, `wholesale.liquid`, `page.franchise.json`, `page.wholesale.json` | `94764863359` |
| Footer social icon | `ss-footer-16` / theme setting `social_whatsapp` | settings |

- **Two different numbers are in use.** `077 977 3359` is the Dehiwala store line on the Locations page; `076 486 3359` is the "urgent enquiries" line. Decide which one product-page orders should go to.
- **Action:** port as **one snippet** (`snh-whatsapp-button.liquid`) with the number in a theme setting, instead of 14 pasted copies.

### 3.4 Instagram feed (homepage)
- **Source:** `sections/instafeed-modern.liquid` (custom, live on the home page). Calls `graph.instagram.com/me/media` **from the browser** with a long-lived token stored in the section setting `token`, and caches in localStorage.
- **⚠️ Security:** the access token (183 chars, `IGAA…`) is **committed in `templates/index.json` and printed in the public homepage HTML** (`data-token`), so anyone can read it. **Rotate it**, and when porting, fetch server-side (an app, or a small proxy like the Koko worker) so no token reaches the page.
- `sections/ss-instafeed-3.liquid` is an older, unused Section Store Instagram section, and isn't needed.
- **Carry over:** ❌. Port the section, or replace it with an Instagram app.

### 3.5 TikTok feed
- **Source:** `sections/tiktok-profile.liquid` (custom). Uses TikTok's public **Creator Profile embed** (`tiktok.com/embed.js`, `blockquote.tiktok-embed` with `data-embed-type="creator"`); no token needed.
- **Renders:** "Seen on TikTok" on product pages (**14 product templates**; not on the home page).
- **Carry over:** ❌. Port the section (it's small and self-contained).

### 3.6 Section Store app sections (licensed third-party code)
| File | Status | Notes |
|---|---|---|
| `sections/ss-footer-16.liquid` (3,619 lines) | **Live footer** (`footer-group.json`) | "© Section Store. Unauthorized copying… prohibited". Re-install through the **Section Store app** onto the new theme (licence permitting), then re-enter the content: menus, newsletter, store list "Dehiwala \| Wattala \| Nugegoda", social links, brand logo strip. **Do not copy the file by hand.** |
| `sections/ss-header-13.liquid` | Disabled | Not needed. |
| `sections/ss-instafeed-3.liquid` | Unused | Not needed. |
| `sections/ss-header-4.liquid` (6,813 lines) | **Live header** | Despite the `ss-` name this is **SNH's own code** ("SNH Premium Ecommerce Header V6"). Port it: see 3.7. |
| `sections/ss-slider-2-pro.liquid` | Live on the home page ("Our Collection" deck) | Also SNH code ("SNH Collection Deck v4"). Port it. |

### 3.7 Header (`ss-header-4.liquid`), the features inside it
- announcement rail (Trusted 50,000+ orders · Free delivery over Rs 17,000 · SNH Elite points)
- mega menu (Accessories / Supplements / Vitamins / About / Shop by Brand)
- **predictive search** with popular terms, "live trends", new arrivals and a client-side catalogue (cached in `sessionStorage` key `snh-catalogue-v1`)
- account popover with loyalty tier
- **its own mini-basket** with free-delivery bar, qty steppers, recommendations and points line (audit C-4: this is one of three cart UIs)

Impact's own `header.liquid` is disabled. **Action:** port. When porting, also set `--header-height` for Impact (audit M-2) and pick one basket (audit C-4).

### 3.8 Cart experience
| Feature | Source | Port? |
|---|---|---|
| Free-delivery progress bar (threshold **Rs 17,000**, waive gap < Rs 100) | `cart-drawer.liquid` settings, `ss-header-4.liquid`, `main-cart.liquid` | Yes, as one shared implementation (`free-shipping-bar.liquid` exists but is unused). |
| "Smart picks" that unlock free delivery + "Frequently bought together" | `cart-drawer.liquid`, `ss-header-4.liquid`, `main-cart.liquid` (uses `/recommendations/products.json` + a catalogue fetch; creatine pairing list hard-coded in `cart-drawer.liquid`) | Yes, but don't fetch the 2.4 MB catalogue (audit M-11). |
| "In your basket" recent-item bar after closing the drawer | `cart-drawer.liquid` | Optional (audit M-12). |
| Cart page styling (363 `!important`) | `main-cart.liquid` | Rebuild rather than port. |

### 3.9 Popups
| Popup | Source | Status | Integration |
|---|---|---|---|
| **Newsletter popup** "Welcome to SNH / Subscribe…" | `sections/newsletter-popup.liquid` (SNH rewrite) in `overlay-group.json` | **Live** | Shopify `{% form 'customer' %}` with tags `newsletter,welcome-offer` → the customer gets marketing consent; **Klaviyo picks it up via its Shopify sync**, not via the popup. Optional discount code setting (`code`). Port it, or switch to a Klaviyo form. |
| **Envelope voucher popup** | `sections/snh-envelope-popup.liquid` | Disabled | Port only if you plan to use it. |
| Privacy/cookie banner | stock `privacy-banner` | Live | Stock Impact. Re-add in the new overlay group. |

### 3.10 Product page enhancements (`main-product.liquid`, 4,981 lines)
All SNH JS/CSS on top of stock blocks. **Port the features, not the file:**
- **Key benefits** ("Why athletes pick this" checklist) from `product.metafields.custom.key_benefits`, also used in a collapsible tab in every product template
- **Subtitle line** from `product.metafields.custom.subtitle`
- **Stock pill** ("In stock" / sold-out truth per variant: `snhStockState`, `snhApplyStockPill`)
- **Points banner** (3.2) and **trust row** (Free delivery Rs 17,000+ · Card · bank · COD · 100% authentic) with info modals; the linked pages `/pages/delivery`, `/payment` and `/authenticity` don't exist
- **Vendor logo / "By SCIENCE IN SPORT" link**, Judge.me restyling, WhatsApp button
- **Custom gallery** (thumb rail, variant→image sync via `SNH_VARIANT_MEDIA`)
- **Bundle & Save box**: buys up to 4 products in one add, "discount applies at checkout" (relies on a **Shopify automatic discount** in admin). **Currently inactive**: no offer has products set, globally (`settings_schema.json` "SNH bundle offers") or per template.
- **SNH FAQ support section** (`sections/snh-faq-support.liquid`, on `product.json`) and the shared FAQ section (`faq.liquid`, 80 placements)

### 3.11 Product card + quick buy
`snippets/product-card.liquid` (SNH card) and `snippets/product-quick-buy.liquid` (SNH quick buy):
- SNH frame
- "N options", price pill, **compare-at from `product.metafields.custom.retail_price`**
- Koko line, "Sign in — earn Rs X back"
- sold-out ordering (pushed to the end of grids)
- "Choose" CTA and quick-view eye

Port both. **Keep the CSS in an asset file** (audit H-2).

### 3.12 Collection filter bar
`snippets/facets-vertical.liquid` (SNH filter bar):
- quick-find box with synonym search
- "Refine" goal chips from a hard-coded **goal map**, i.e. which collections count as sub-goals of which
- brand logo rail: logos resolved from files named `<brand-handle>-logo.webp/png` in *Content → Files*
- sort / in-stock switch / active chips

**Preserve the goal map and the brand-logo file naming.** Rebuild the mechanics without hiding stock filters (audit C-2).

### 3.13 Custom page sections (port, or they disappear)
| Section | Page / template |
|---|---|
| `Shobybrand.liquid` (Shop by Brand, products rendered in Liquid) | `page.shop-by-brand` |
| `franchisesection.liquid` (Franchise Partner) | `page.franchise` |
| `wholesale.liquid` (Wholesale Hub) | `page.wholesale` |
| `snh-performance-quiz.liquid` (product quiz) | `page.wholesale` (**disabled**) |
| `timeline.liquid` content (Inception of SNH 2020 → 2024) | `page.about-us` |
| `whyus.liquid` (Why Choose Us proof grid, 50,000+ orders / 4.9★) | Home |
| `brand-logo-slider-custom.liquid` (brand rail) | Home |
| `multi-column.liquid` = **Shop by Goal** accordion (9 goal collections, Train & Perform / Health & Wellness) | Home (also pasted into `collection-list.liquid` and `shopbygoal.liquid`, audit H-3) |
| `custom-liquid.liquid` = **Bundle & Save** carousel | Home |
| `featured-collection.liquid` = "What's new at SNH" (self-sourcing newest/deals) | Home, `page.snhealth`, `collection.snh-health-template` |
| `shop-the-look.liquid` = **Brand of the Month** | Home, `page.accessories-page` |
| `text-with-icons.liquid` (SNH proof grid, 15 placements) | Collections/products |
| `scrolling-text.liquid` (SNH marquee, 18 placements) | Many templates |

### 3.14 Other theme-level behaviour worth keeping
- **Custom product badges** from `product.metafields.custom.badges` (`snippets/product-badges.liquid`). This is a native Impact feature, so it carries over as long as the metafield keeps that name.
- **Article banner colours** from `article.metafields.banner.text_color` / `background_color` (`main-article.liquid`). Check it exists in stock Impact; port it if not.
- **Brand logos by filename** (3.12) and **SNH frame overlay on product images** (card + gallery CSS).
- **Fonts:** Archivo (display), Inter, Satoshi (Fontshare), on top of the theme fonts. Choose and port deliberately (audit M-10).

## 4. Content stored in theme JSON (export before switching)

None of this is in Shopify admin; it only exists in this theme's templates:
- **Policy text**: `page.privacy-policy` (~5.5 KB), `page.return-policy` (~4.3 KB), `page.shipping-policy`, `page.term-of-service` are written in **rich-text sections**, not in *Settings → Policies*.
- **Store locations**: Dehiwala (133A Kawdana Rd, +94 77 977 3359), Wattala (880 Negombo Rd, +94 76 846 3359), Nugegoda (555 High Level Rd, +94 76 486 3359), with Google Maps links (`page.locations-info`).
- **Homepage**: slideshow banners, brand rail, Why Choose Us, Collection deck slides, Brand of the Month, Bundle & Save, Shop by Goal (9 goals + images), FAQ copy.
- **65 collection banners** (slideshow images, desktop/mobile) and **per-collection FAQ copy**.
- **14 "About the brand" texts** (one per brand product template).
- **Landing pages**: Informed Sport, Endurance Athletes, SNHealth, Accessories, Work with us, Franchise, Wholesale, About (timeline), Contact (includes a careers block).
- **Informed Sport / Endurance grids** removed in commit `b2cdd31` (titles, images, collection links): recoverable from `f206ce8`.
- Free-delivery threshold **Rs 17,000** and waive tolerance **Rs 100** (cart-drawer section settings and header).

## 5. Decisions to make before the redesign
1. **Rotate the Instagram token** and stop exposing it (3.4).
2. **One WhatsApp number** for product orders (3.3).
3. **One cart UI**: header basket vs `cart-drawer.liquid` vs Impact drawer (audit C-4).
4. **What writes the loyalty metafields?** (3.2)
5. **Section Store footer**: keep (re-install through the app) or rebuild natively in Impact's footer.
6. **Bundle & Save on product pages**: activate it or drop it (3.10).
7. **Koko worker**: add the new theme's preview domain to the worker's allowed origins before testing checkout (3.1).
8. Move policy text into *Settings → Policies* (4).

## 6. Safe to leave behind
`snippets/booster-seo.liquid` (old Booster SEO app, unreferenced), `snippets/snh-collection-deck-clean-new.liquid` (empty), `snippets/whatsapp-share-widget.liquid`, `snippets/free-shipping-bar.liquid` (unused), `sections/ss-header-13.liquid`, `sections/ss-instafeed-3.liquid`, `sections/snh-header-standalone.liquid`, `sections/snh-promise-proof.liquid`, `sections/shopbygoal.liquid` (duplicate), `blocks/ai_gen_block_5b9680c` / `71e87ed`. `ai_gen_block_860b125` (Magnesium FAQ) is pending compliance review, so carry it over only if it gets approved.
