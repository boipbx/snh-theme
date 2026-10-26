# SNH content inventory (live site + theme on `main`)

Captured 18 Oct 2026 from https://www.sportsnutritionhub.lk (home, 3 collections, 3 product pages, about, locations, register/loyalty) and `templates/index.json`, `sections/ss-header-4.liquid`, `shop-the-look.liquid`, `hot-spots.liquid`, `ss-slider-2-pro.liquid` on `main`.
`shopify://shop_images/<file>` is written as its CDN URL. Structured copies used by the prototype: `data/live-mega-menu.json`, `data/live-home.json`.

## 1. Homepage sections (live order)

| # | Section (type) | Status | Content |
|---|---|---|---|
| 1 | Hero slideshow (`slideshow`) | live |  · 5 blocks |
| 2 | Brand logo tiles (`image-link-blocks`) | hidden |  · 16 blocks |
| 3 | Brand rail (`brand-logo-slider-custom`) | live | Authorized Distributors Of Leading Brands · 12 blocks |
| 4 | Why choose us (`whyus`) | live | WHY CHOOSE US? · 4 blocks |
| 5 | Why choose us (old) (`text-with-icons`) | hidden | WHY CHOOSE US? · 0 blocks |
| 6 | App/AI blocks (`_blocks`) | live |  · 0 blocks |
| 7 | Collection deck ("Our Collection") (`ss-slider-2-pro`) | live | Our Collection · 10 blocks |
| 8 | Shop by goal (old) (`collection-list`) | hidden | TOP COLLECTION · 0 blocks |
| 9 | Impact text (`impact-text`) | hidden |  · 1 blocks |
| 10 | Brand of the month (shop the look) (`shop-the-look`) | live | BRAND OF THE MONTH · 4 blocks |
| 11 | Shop by goal (`multi-column`) | live | Shop by Goal · 10 blocks |
| 12 | What's new at SNH (`featured-collection`) | live | WHAT’S NEW AT SNH? · 0 blocks |
| 13 | SNH Health story (`images-with-text-scrolling`) | hidden |  · 1 blocks |
| 14 | Bundle & Save (`custom-liquid`) | live | Bundle & Save · 3 blocks |
| 15 | Google Reviews (app) (`apps`) | live |  · 1 blocks |
| 16 | FAQ (`faq`) | live | FAQ’S · 7 blocks |
| 17 | Instagram feed (`instafeed-modern`) | live | Follow us on Instagram · 0 blocks |
| 18 | App/AI blocks (`_blocks`) | live |  · 1 blocks |
| 19 | App/AI blocks (`_blocks`) | live |  · 1 blocks |

## 2. Hero slides (live order, autoplay 4s)

| # | Desktop image | Mobile image | Title (baked/overlay) | Button → link |
|---|---|---|---|---|
| 1 | [2fd50e25-5d19-4f08-9e36-f8992b6e917c.jpg](https://cdn.shopify.com/s/files/1/0258/9625/5550/files/2fd50e25-5d19-4f08-9e36-f8992b6e917c.jpg) | [d15b04ae-74cb-46b8-ab36-d6e467b4ddce.jpg](https://cdn.shopify.com/s/files/1/0258/9625/5550/files/d15b04ae-74cb-46b8-ab36-d6e467b4ddce.jpg) | (text baked into the image: FUELING ATHLETES · ELEVATING WELLNESS) | — → — |
| 2 | [ryse-desk-banner.jpg](https://cdn.shopify.com/s/files/1/0258/9625/5550/files/ryse-desk-banner.jpg) | [ryse_mobile_banner.jpg](https://cdn.shopify.com/s/files/1/0258/9625/5550/files/ryse_mobile_banner.jpg) | DISCOVER OUR ALL NEW ARRIVALS FROM RYSE | SHOP RYZE → /collections/ryse |
| 3 | [revive.jpg](https://cdn.shopify.com/s/files/1/0258/9625/5550/files/revive.jpg) | [revive_mobile.jpg](https://cdn.shopify.com/s/files/1/0258/9625/5550/files/revive_mobile.jpg) | THE GOLD STANDARD FOR WELLNESS | SHOP REVIVE → /collections/revive |
| 4 | [the-sulek-stack.jpg](https://cdn.shopify.com/s/files/1/0258/9625/5550/files/the-sulek-stack.jpg) | [the-sulek-stack_mobike.jpg](https://cdn.shopify.com/s/files/1/0258/9625/5550/files/the-sulek-stack_mobike.jpg) | THE SULEK STACK HAS LANDED | SHOP SULEK STACK → /collections/the-sulek-stack |
| 5 | [nootropics-web-cover.jpg](https://cdn.shopify.com/s/files/1/0258/9625/5550/files/nootropics-web-cover.jpg) | [nootropics-web-cover_mobile.jpg](https://cdn.shopify.com/s/files/1/0258/9625/5550/files/nootropics-web-cover_mobile.jpg) | THE NEXT LEVEL OF ATHLETE NUTRITION | SHOP NOOTROPICS → /products/sis-beta-fuel-energy-nootropics-gel |

## 3. Brand of the month (shop-the-look hotspots)

Image: [brand_of_the_month_-_ryse.jpg](https://cdn.shopify.com/s/files/1/0258/9625/5550/files/brand_of_the_month_-_ryse.jpg) · Title: BRAND OF THE MONTH · Points shown on cards: Bronze 3% / Silver 7% / Gold 10%

| Dot | x % | y % | Product | Price |
|---|---|---|---|---|
| 1 | 48 | 67 | RYSE Loaded Protein 2LB (`ryse-loaded-protein-2lb`) | Rs 24,999 |
| 2 | 28 | 62 | RYSE Loaded Pump (`ryse-loaded-pump-25-servings`) | Rs 14,999 |
| 3 | 83 | 66 | RYSE Loaded Pre-Workout (`ryse-loaded-pre-workout`) | Rs 14,999 |
| 4 | 15 | 57 | RYSE Loaded Pre MAX (`ryse-loaded-pre-max`) | Rs 15,999 |

Other hotspot sections: `page.accessories-page` has a `hot-spots` section (3 dots) and a `shop-the-look` (3 dots) but both still hold **Impact demo placeholders** (no products, "Feature name" text). Not real content.

## 4. Collection deck ("Our Collection", 10 slides)

| Title | Badge | Image | Link |
|---|---|---|---|
| WHEY PROTEIN | 💪Premium Muscle Fuel | [website_cover_-_whey.jpg](https://cdn.shopify.com/s/files/1/0258/9625/5550/files/website_cover_-_whey.jpg) | /collections/whey-protein |
| CREATINE | ⚡Pure Strength | [IMG_4441.jpg](https://cdn.shopify.com/s/files/1/0258/9625/5550/files/IMG_4441.jpg) | /collections/creatine |
| HERBS & NATURAL SOLUTION | Live better | [IMG_4440.jpg](https://cdn.shopify.com/s/files/1/0258/9625/5550/files/IMG_4440.jpg) | /collections/herbs-natural-solution |
| VITAMINS & WELL-BEING | 🛡️Daily Wellness Essentials | [IMG_4447.jpg](https://cdn.shopify.com/s/files/1/0258/9625/5550/files/IMG_4447.jpg) | /collections/vitamins-minerals |
| COLLAGEN | 🌸Glow from Within | [website_covers_-_collagen.jpg](https://cdn.shopify.com/s/files/1/0258/9625/5550/files/website_covers_-_collagen.jpg) | /collections/collagen |
| PROTEIN SNACKS | 🍫Healthy On-the-Go Bites | [IMG_4446.jpg](https://cdn.shopify.com/s/files/1/0258/9625/5550/files/IMG_4446.jpg) | /collections/protein-bars-snacks |
| PRE WORKOUT | 🔥Level up every session. | [IMG_4445.jpg](https://cdn.shopify.com/s/files/1/0258/9625/5550/files/IMG_4445.jpg) | /collections/pre-workout-1 |
| MASS GAINERS | 🏋️Big Gains, Bigger Nutrition | [IMG_4444.jpg](https://cdn.shopify.com/s/files/1/0258/9625/5550/files/IMG_4444.jpg) | /collections/mass-gainers |
| FAT BURNERS | 🎯Burn Smart, Burn Fast | [IMG_4442.jpg](https://cdn.shopify.com/s/files/1/0258/9625/5550/files/IMG_4442.jpg) | /collections/fat-burners-1 |
| SHAKERS | 🥤Perfect Mix Every Time | [imgi_29_1f9f6567-6e04-4fd9-8b8d-2cf6428d6199.jpg](https://cdn.shopify.com/s/files/1/0258/9625/5550/files/imgi_29_1f9f6567-6e04-4fd9-8b8d-2cf6428d6199.jpg) | /collections/shakers |

## 5. Shop by goal (10 goals, AI-generated imagery)

| Group | Goal | Collection |
|---|---|---|
| train | Muscle & Strength | /collections/muscle-and-strength |
| train | Fat Loss | /collections/fat-loss |
| train | Energy & Endurance | /collections/energy-and-endurance |
| train | Recovery | /collections/recovery |
| wellness | Daily Wellness | /collections/daily-wellness |
| wellness | Gut Health | /collections/gut-health |
| wellness | Women's Health | /collections/womens-health |
| wellness | Beauty, Hair & Skin | /collections/beauty-hair-and-skin |
| wellness | Joint & Mobility | /collections/joint-and-mobility |
| wellness | Sleep | /collections/sleep |

## 6. Why choose us
WHY CHOOSE US?: Shop trusted brands backed by our expert guidance, secure checkout, and fast delivery across Sri Lanka. Stats: 50,000+ orders delivered · 4.9★ from 2,000+ reviews.

- **100% AUTHENTIC**: Direct from brand and authorized distributors.
- **FAIR PRICING**: Transparent prices with frequent bundles and member only deals.
- **EXPERT SUPPORT**: Fast guidance from our team via chat, phone, or WhatsApp.
- **SECURE PAYMENTS**: SSL checkout with cards, bank transfer & KOKO

## 7. Offers

- **Bundle & Save** (Curated stacks built for better value, faster shopping and stronger daily routines.): button "View bundles", plus "Earn loyalty points"
  - Endurance Bundles · Save more · /collections/endurance-bundles · image bundle_off.png
  - Daily Health & Wellness Bundles · Save more · /collections/daily-health-wellness-bundles · image wellness.png
  - Training & Strength Bundles · Save more · /collections/training-strength-bundles · image protines.png
- **Free delivery** over Rs 17,000 (header bar + cart). Colombo same day, outside Colombo 2–3 working days.
- **What's new at SNH**: auto-sourced newest products and deals (45 days, 26 products).
- **Koko**: pay in 3 on every product card and PDP; checkout router with Koko option.
- Header announcement rail: "50,000+ orders delivered · 4.9★ from 2,000+ reviews" / free-delivery progress / "SNH Elite: Earn 3–10% back in points".

## 8. Loyalty: SNH Elite (copy from /account/register; there is no standalone Elite page)

- Kicker: "Sri Lanka's 1st Premium VIP Club" · Headline: "Fuel your goals. Earn your rewards."
- "Create your free account, claim 500 welcome points, and earn 3% to 10% back in points on every single order."
- Proof chips: 500 welcome points · Up to 10% in cashbacks · Redeemable at 2500 points
- Tiers ("3 tiers, one climb"): **Bronze 3%**, free to join + 500 welcome points · **Silver 7%**, at Rs 198k spend, birthday reward + vouchers · **Gold 10%**, at Rs 300k spend, free shipping + 15% birthday
- ⚠️ Threshold mismatch in the theme: register page says 198k/300k, Brand-of-the-month settings 200k/500k, product-card code 50k/150k. Needs one source of truth.

## 9. FAQ (homepage)

- **How long will it take to get my orders?** It depends on your delivery address. Colombo Orders: Same Day Out of Colombo Orders: 2-3 Working Days
- **Where can I come visit physically?** We have three stores: DEHIWALA, WATTALA, NUGEGODA Simply type ‘Sports Nutrition Hub’ on Google Maps and the options will appear.
- **I want to know more** The fastest way to get an answer would be to call us or WhatsApp us on +94 76 486 3359
- **Are your supplements genuine?** Yes. We stock only genuine products sourced directly from authorized distributors and trusted international brands. Your health and safety are our highest priority.
- **How do I know which supplement is right for me?** Tell us about your fitness goals, diet, training experience, and any medical conditions or dietary restrictions. Our team will recommend products that best suit your needs—without pushing unnecessary supplements.
- **What payment methods do you accept?** We accept card payments, bank transfers, cash on delivery, & Koko.
- **Can I return or exchange a product?** Returns and exchanges are accepted only for products that are unopened, unused, and in their original sealed condition, subject to our return policy. If your order arrives damaged or incorrect, contact us within 24 hours and we’ll resolve it promptly.

## 10. Mega menu (ss-header-4, rendered live; no promo cards configured today)

- **ACCESSORIES**
  - ALL ACCESSORIES → /collections/accessories-1: Lifting Straps, Wrist Wraps
- **SUPPLEMENTS**
  - SHOP ALL SUPPLEMENTS → /collections/everything
  - TRAIN & PERFORM → /collections/train-perform: MUSCLE & STRENGHT, FAT LOSS, ENERGY & ENDURANCE, INFORMED SPORTS COLLECTION, ELECTROLYTES, Amino's & BCAA
  - WHEY PROTEINS → /collections/whey-protein: Isolate Protein, Hydrolyzed Protein, Vegan Protein, Casein Protein, Clear Protein, Concentrate, Whey Blend
  - PRE-WORKOUT → /collections/pre-workout-1: Shop All Pre-Workout, With Caffeine, No Caffeine
  - CREATINE → /collections/creatine-1
  - WEIGHT MANAGEMENT → /collections/weight-management: Shop All Weight Management, Fat Burners
  - TESTOSTERONE SUPPLEMENTS → /collections/testosterone-supplements
- **VITAMINS**
  - SHOP ALL VITAMINS & WELLNESS → /collections/everything
  - HEALTH & WELLNESS → /collections/health-wellness: DAILY WELLNESS, GUT HEALTH, WOMEN’s HEALTH, BEAUTY, HAIR & SKIN, JOINT & MOBILITY, SLEEP HEALTH, SEXUAL HEALTH, GREENS
  - FISH OIL & OMEGA → /collections/fish-oil-omega
  - MULTIVITAMINS → /collections/multivitamins: Shop All Multivitamin, Women’s Multivitamins, Men's Multivitamins
  - MINERALS → /collections/minerals: Shop All Minerals, Calcium, Magnesium, Iron, Zinc
  - LETTER VITAMINS → /collections/letter-vitamins: Shop All Letter Vitamins, Vitamin B, Vitamin C, Vitamin D, Vitamin K
  - HERBS & NATURAL SOLUTIONS → /collections/herbs-natural-solution: Shop All Herbs & Natural Solutions, Shilajit, Ashwagandha, SEA MOSS
- **ABOUT**
  - ABOUT US → /pages/about-us
  - READ OUR BLOGS → /blogs/news
  - WORK WITH US → /pages/careers
  - LOCATIONS → /pages/location
  - FRANCHISE PARTNER → /pages/franchise-partner
  - WHOLESALE → /pages/wholesale-1
  - CONTACT US → /pages/delivery-and-shipping
  - SHIPPING POLICY → /pages/shipping-policy
  - Shop by brand → /pages/shop-by-brand (top-level link)

Mega side panel today: per-menu title + subtitle ("Explore our full range") and a "Bundle & save" list (Endurance / Training & strength / Daily health & wellness).

## 11. Brands stocked (from all 242 live products)

| Brand | Products |
|---|---|
| Applied Nutrition | 102 |
| Sports Nutrition Hub (SNH) | 28 |
| SCIENCE IN SPORT | 22 |
| RAW | 15 |
| MYPROTEIN | 14 |
| REVIVE | 13 |
| Trace Minerals | 9 |
| MuscleTech | 9 |
| RYSE | 6 |
| EHPlabs | 6 |
| SURGE | 6 |
| HEALTHSPAN ELITE | 5 |
| VITABIOTICS | 2 |
| Ronnie Coleman | 1 |
| Dymatize | 1 |
| BSN | 1 |
| CENTRUM | 1 |
| REDCON1 | 1 |

Logo files in the theme: brand rail (`brand_logos_*.png`, 150×40, low-res) and the hidden image-link tiles (`Untitled_design.zip_-_*.png`, 2813px). See IMAGE-SOURCES.md.

## 12. Footer (ss-footer-16)

- **Supplements**: Shop all supplements, Train & perform, Whey proteins, Pre-workout, Creatine, Weight management, Testosterone supplements
- **Vitamins & wellness**: Shop all, Health & wellness, Fish oil & omega, Multivitamins, Minerals, Letter vitamins, Herbs & natural solutions
- **Info**: About us, Read our blogs, Work with us, Locations, Franchise partner, Wholesale, Contact us, Shipping policy
- **Support & policies**: Privacy policy, Return policy, Terms of service
- Payments: "How would you like to pay?" Card, COD & other methods · Koko pay in 3
- Newsletter "SUBSCRIBE! NO SPAM. ONLY DISCOUNT CODES & PRODUCT INFO!", stores "DEHIWALA | WATTALA | NUGEGODA", socials

## 13. Stores and phones

| Store | Address | Phone | Map |
|---|---|---|---|
| Dehiwala | 133A Kawdana Road, Dehiwala | +94 77 977 3359 | https://maps.app.goo.gl/yv7NfU8qodJD58uV9 |
| Wattala | 880 Negombo Road, Wattala | +94 76 846 3359 | https://maps.app.goo.gl/HE2zcgj85Dxr9cux7 |
| Nugegoda | 555 High Level Road, Nugegoda | +94 76 486 3359 | https://maps.app.goo.gl/EpBtzAunKUbUkb3q9?g_st=ic |

Hotline used in the FAQ and header: +94 76 486 3359 (= Nugegoda).

## 14. About (timeline)

2020 Inception of SNH (website from the co-founder's bedroom) · 2022 Moves to a bigger space · Mar 2023 First store, Dehiwala · Jan 2024 Second store, Wattala · Sep 2025 Third store, Nugegoda. Images: IMG_2486.png, IMG_2485.png, IMG_2488.png, IMG_2487.png, IMG_3570.jpg.

## 15. Collections and product pages (live)

- Collections (whey-protein, creatine-1, pre-workout-1): banner slideshow (desktop + mobile pair with baked-in title) → SNH filter bar (quick find, goal chips, brand logo rail, filters, sort) → 4-up grid (2-up mobile) of SNH cards (badge, options, price pill, Koko line, Add/Choose, points) → FAQ.
- Product pages: see Phase 4 notes in the round 3 summary (main-product.liquid structure: title first, brand logo + Judge.me + stock pill, subtitle, price + You save, Koko + points row, variant pills with sold-out tags, quantity, Add to cart + Buy now, WhatsApp, Bundle & Save, Why athletes pick this, SNH Elite strip with modals, Read more, swipe gallery with progress bar + thumb rail, sticky add-to-cart).
