# Collections, tags & menus to review

**Sports Nutrition Hub · new website launch** · prepared 7 November 2026

This is a checklist of the shop data the new website relies on: collections, product tags, product details and menus. Everything was checked against the live store today. Most of it is already in good shape. The items marked **Must before launch** are the ones shoppers would notice.

## 1. Collections the new website uses

The new website links to **99 collections** from the menus, homepage, cart suggestions, quiz results, member account and the wholesale and brand pages. **90 exist and have products. 9 do not exist yet**, plus two collections that the cart suggestions look for.

### Missing collections (need creating or the link changing)

| Collection | Handle | Where it is used | Suggested set-up |
|---|---|---|---|
| Energy & Endurance | `energy-and-endurance` | Homepage, Main menu | **Most important.** Create a collection with this exact handle, with the same conditions as "Energy Gels & Endurance" (57 products), or ask us to point the links at that collection instead. |
| Bestsellers | `bestsellers` | Wholesale page, cart suggestions ("Popular with members") | Manual collection of your top 12–20 sellers. Then select it in Theme settings → SNH cart suggestions → Bestsellers. |
| Cart add-ons | `cart-add-ons` | Cart suggestions (small extras that top up a basket) | Automated: price is under Rs 1,500 AND product type is Protein Snacks, Energy Gels, Electrolytes or Accessories. |
| Centrum | `centrum-1` | Shop by brand page | Automated: Vendor = CENTRUM (1 product today). |
| Vitabiotics | `vitabiotics-1 · vitabiotics` | Shop by brand page, SNH Health page | Automated: Vendor = VITABIOTICS (1 product today). |
| Seven Seas | `seven-seas-1` | Shop by brand page | No Seven Seas products in the store: remove the tile, or create it when stock arrives. |
| Perfectil | `perfectil` | SNH Health page | Automated: Title contains "Perfectil", or remove the link. |
| Wellwoman | `wellwoman` | SNH Health page | Automated: Title contains "Wellwoman", or remove the link. |
| Padel | `padel` | Informed Sport page | Create if you sell padel products, otherwise we remove the link. |

### Main collections (exist with products)

| Collection | Handle | Products | Where it is used |
|---|---|---|---|
| Whey Protein | `whey-protein` | 45 | 404 page, Footer, Franchise page, Homepage, Main menu, Wholesale page, Member account |
| Vegan Protein | `vegan-protein` | 8 | Main menu, Member account |
| Creatine | `creatine` | 28 | 404 page, Footer, Franchise page, Homepage, Main menu, Wholesale page |
| Pre-Workout | `pre-workout-1` | 30 | 404 page, Footer, Homepage, Main menu, Wholesale page |
| Mass Gainers | `mass-gainer` | 9 | Homepage, Main menu, Wholesale page |
| BCAA & EAA | `bcaa-eaa` | 4 | Main menu, Wholesale page |
| Protein Snacks | `protein-snacks` | 14 | Homepage, Main menu |
| Energy Gels & Endurance | `energy-gels-and-endurance` | 57 | Main menu |
| Electrolytes | `hydration-recovery` | 22 | Main menu, Member account |
| Science in Sport (SiS) | `sis` | 26 | Franchise page, Homepage, Main menu, Shop by brand page, Wholesale page |
| Vitamins & Wellness | `vitamins-minerals` | 94 | Homepage, Main menu, Wholesale page |
| Health & Wellness | `health-wellness` | 103 | Footer, Main menu |
| Muscle & Strength | `muscle-and-strength` | 106 | Homepage, Main menu |
| Fat Loss | `fat-loss` | 25 | Homepage, Main menu |
| Informed Sports | `informed-sports` | 64 | Homepage, Main menu |
| New Arrivals | `new-arrivals` | 143 | Main menu, Member account |
| Accessories | `accessories-1` | 12 | Homepage, Main menu, Wholesale page |
| Bundle Offers | `bundle-offers` | 10 | Homepage, Main menu |

Small collections to keep an eye on: **BCAA & EAA (4 products)** and **Vegan Protein (8)**. They work, but shoppers see a short page. The other 73 collections (vitamin A–Z, creatine forms, brand pages and so on) all exist with products.

## 2. Product tags the website reads

The new website shows a few things based on simple product tags. None of these tags are on any product today, so these features are switched off until the tags are added.

| Tag | What it does on the site | Products with it now | Products that probably should have it (best guess) |
|---|---|---|---|
| `bestseller` | Shows a **Bestseller** badge on the product card | 0 | Your top 10–20 sellers (only you know these). |
| `informed-sport` | Shows an **Informed Sport** badge | 0 by tag. Some products already show the badge through the product's Badges field. | The 55 products in the Informed Sport collection, e.g. REVIVE CollaPURE - 100% Grass-Fed Collagen, SiS HYDRO+ Electrolyte Drink Mix, SiS Beta Fuel Energy Chew, RAW NUTRITION Essential Performance Pre-Workout. Add the tag or the Badges value to each. |
| `vegan` | Used by the quiz for vegan shoppers | 0 | The 8 products in Vegan Protein, plus HEALTHSPAN ELITE Vegan-Omega® 3 1000mg. |

Not tags, so nothing to do: the **New** badge appears automatically for 45 days after a product is added, the **Sale** badge whenever a compare-at price is set, and **goal** tags (build muscle, lose fat …) are written onto customers by the quiz, not onto products.

## 3. Product details that power features

**Product fields (metafields).** Product pages read these optional fields and simply hide a block when a field is empty: *Servings* (also used for "Rs per serving" and the "running low" reminders), *Stats*, *Key benefits*, *Ingredients*, *How to use*, *FAQs*, *Subtitle*, *Badges*, *Retail price*. We can't see these from outside the admin. Please spot-check your top 20 products in Shopify admin → Products → (product) → Metafields.

**Bundles with no saving shown.** The cart shows "save Rs X" on a bundle using its **compare-at price**. These 11 bundles have none, so no saving appears:

- Deep Sleep Bundle (Rs 19,999)
- Strength & Skin Duo Bundle (Rs 15,999)
- Lean Muscle Building Stack (Rs 32,499)
- Lean Energy Stack (Rs 35,499)
- RAW Premium Training Stack (Rs 16,999)
- RAW Full Loaded Stack (Rs 27,499)
- Athlete Essential Stack (Rs 27,999)
- Whey + Pre Stack (Rs 29,999)
- Race Day Pack 1.0 (Rs 7,899)
- Race Day Pack 2.0 (Rs 8,699)
- Endurance Athlete Trial Pack (Rs 3,999)

Add a compare-at price (the total of the items bought separately) to each. **No bundle is sold out today.** If a product inside a bundle sells out, the bundle can still be bought, so check bundles when you restock.

**Images.** Every product has an image. **94 products** lead with a plain studio photo instead of the SNH-framed image used on most of the range, e.g. Deep Sleep Bundle, RAW Premium Training Stack, RAW Full Loaded Stack, Lean Muscle Building Stack, Lean Energy Stack, Athlete Essential Stack. They work, but look less consistent in grids. Optional: replace their first image with the framed version.

## 4. Menus to create (optional, after launch)

The new header and footer already show the right links without any menus. Creating these menus in **Online Store → Navigation** only means you can edit the links yourself later. Create each one, then pick it in Customize where shown.

| Menu name | Items | Where it appears |
|---|---|---|
| Supplements · Shop by goal | Build muscle, Lose fat, Energy & endurance, Gain weight, Weight management, Testosterone, Informed Sport | Supplements mega menu, left column |
| Supplements · Shop by type | Whey, Isolate, Clear, Vegan protein, Pre-workout, Creatine, Aminos, Fat burners, Bars & snacks | Supplements mega menu, middle |
| Vitamins & Wellness · Shop by need | Daily wellness, Gut, Women's health, Beauty, Joints, Sleep, Sexual health, Greens | Vitamins mega menu, left |
| Vitamins & Wellness · Shop by type | Multivitamins, Fish oil & omega, Minerals, Magnesium, Letter vitamins, Collagen, Probiotics, Ashwagandha, Herbs & natural | Vitamins mega menu, middle |
| Sports & Performance · Shop by need | Energy, Hydration, Recovery, BETA Fuel, Supplements, Packs & bundles | Sports mega menu, left |
| Sports & Performance · Shop by type | Energy gels, Electrolytes, Carb bars, Protein bars, BCAA & EAA, Glutamine | Sports mega menu, middle |
| Accessories · Shop by use / by type | Lifting straps, Wrist wraps, Shakers / Shaker bottles, Gym accessories, New arrivals | Accessories mega menu |
| Footer · Supplements, Vitamins & wellness, Info, Business, Support & policies | The links in the new footer (Business: Wholesale, Franchise partner, Work with us) | Footer columns |

The exact links for each menu are in the file *MENUS.md* (we can enter them for you).

<div style="page-break-before: always"></div>

## 5. Action list for Khizer

| # | Action | When | Done |
|---|---|---|---|
| 1 | Create the **Energy & Endurance** collection (`energy-and-endurance`), or tell us to point its links at "Energy Gels & Endurance" | Must before launch | ☐ |
| 2 | Add **compare-at prices** to the 11 bundles listed in section 3 so the saving shows | Must before launch | ☐ |
| 3 | Create **Bestsellers** (manual, your top sellers) and select it in Theme settings | Must before launch | ☐ |
| 4 | Create **Cart add-ons** (small items under Rs 1,500) | Must before launch | ☐ |
| 5 | Shop by brand page: create Centrum and Vitabiotics, and remove the Seven Seas tile | Must before launch | ☐ |
| 6 | Add the `informed-sport` tag (or Badges value) to the products in the Informed Sport collection | Can do after launch | ☐ |
| 7 | Add the `bestseller` tag to your top sellers | Can do after launch | ☐ |
| 8 | Add the `vegan` tag to vegan products | Can do after launch | ☐ |
| 9 | SNH Health page: create Perfectil and Wellwoman, or remove those links; decide on Padel | Can do after launch | ☐ |
| 10 | Spot-check product fields (servings, benefits, FAQs) on your top 20 products | Can do after launch | ☐ |
| 11 | Replace plain studio first images with the SNH-framed version where you have it | Can do after launch | ☐ |
| 12 | Create the navigation menus (section 4) so you can edit links yourself | Can do after launch | ☐ |

*Checked against the live store (www.sportsnutritionhub.lk) on 7 November 2026: 100 collections, 252 products.*
