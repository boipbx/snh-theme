# Reference findings: Huel × Elian Valen × Beast Nutrition

> **Structure & calm:** Huel (primary), Elian Valen. **Punch:** Beast Nutrition LK; Waking PH is pending (no working URL yet, see §5).

Captured 18 Oct 2026 with Playwright (Chromium) at **390×844** (iPhone UA) and **1440×900**, full page.
Cookie/consent overlays were hidden before measuring. Values come from computed styles (`extracted.json`, `extracted-targeted.json`), checked against the screenshots.

| Screenshots | 390 | 1440 |
|---|---|---|
| Huel (huel.com, US storefront) | `huel-390-full.png` (9,416px tall) | `huel-1440-full.png` (7,702px) |
| Elian Valen (Framer template) | `elianvalen-390-full.png` (13,141px) | `elianvalen-1440-full.png` (10,541px) |
| Beast Nutrition (beastnutrition.lk) | `beast-390-full.png` (6,488px) | `beast-1440-full.png` (5,393px) |

---

## 1. Side by side

| Property | **Huel** | **Elian Valen** |
|---|---|---|
| **Families** | Suisse Intl (sans, all UI + headings) · Suisse Works (serif **italic accent word** inside headings: "fuel", "your", "Bestsellers", "Benefits") · Suisse Intl Mono (ticker, badges) | Inter only |
| **Weights in use** | Sans 400 (body) + 500 (headings, buttons, names). Serif 400 italic. Mono 400. **No bold anywhere.** | 400 for everything incl. headings; 600 only for prices and the giant footer wordmark |
| **Headline (h1/h2 role)** | 54px desktop / 34px mobile · weight 500 · lh 1.12 · ls −0.02em · sentence case | 40px / 32px · weight 400 · lh 1.1 · ls −0.02em · sentence case |
| **Secondary heading** | 24px / 21px · 500 · lh 1.12 · ls −0.02em (card titles, promo titles) | 26px / 24px · 400 · lh 1.2 · ls −0.04em |
| **Body** | 16px · 400 · lh 1.4–1.5 · ls 0 | 16px · 400 · lh 1.4 · ls 0 |
| **Small / meta** | 14px 400 grey; 13px mono uppercase for ticker & badges (ls 0) | 14px 400 (names); 14px 600 (prices) |
| **Display (hero-only)** | none: the hero headline is the same 54px as other headings | Footer wordmark 258px Inter 600 · lh 0.8 · ls −0.08em |
| **Container** | **1152px** at 1440 (144px side margins) | **1280px** at 1440 (80px margins) |
| **Mobile gutter** | **24px** | **20px** |
| **Section rhythm** | Sections stack edge-to-edge; inner padding **64px desktop / 32px mobile** top+bottom → ~128 / 64px between content blocks. Heading → content: **64–80px desktop / 32–56px mobile** | Hero → content gaps **100–160px desktop**, 64–80 mobile; no section bands, one white canvas |
| **Grid gap** | **24px desktop / 12px mobile** | **20px desktop / 10px mobile** |
| **Card / tile radius** | **8px** everywhere (tiles, product images, athlete cards, promo tiles); 12px on the larger "Why Huel" cards. **Pills 9999px** | **0px** everywhere; one 4px input |
| **Aspect ratios** | Category tiles **1:1**; product image tile **1:1**; athlete cards **9:16** (276×491); promo tiles **4:5** (368×460) | Product tiles **≈2:3** (305×449); lifestyle crops 16:9 / 3:2; full-bleed bands |
| **Tile fill** | Warm cream **#F5F2EC** behind every product/category image | Cool grey **#F2F2F2** behind every product image |
| **Buttons** | **Black pill**, 40px h, 0 20px, 15px/500 (primary "Shop All"); 32px h, 13px/500 (in-card "View product"); **white pill 56px** on dark/photo tiles. Radius 9999px | Mostly **underlined text links** (16px 400, 1px underline, 6px offset); one 39px/4px input button |
| **Palette** | Ink **#0C0C0D**, white **#FFFFFF**, cream **#F5F2EC**, greys **#4B4B4B / #6E6E6E / #A5A5A6**, black bands **#0C0C0D** (Benefits, press, newsletter, footer), one mint pill **#E1F8E0** (quiz CTA) | White **#FFFFFF**, ink **#0E0E0E**, grey text **#666666**, tile greys **#F2F2F2 / #F4F4F2**, black footer **#0E0E0E** |
| **Shadows** | None (flat) | None (one hairline inset) |
| **Motion** | `cubic-bezier(.4,0,.2,1)` 150–300ms; marquee ticker; carousels with progress dots | Framer JS reveals (fade/slide on scroll); no CSS transitions |
| **Ticker / top bar** | Black, 13px mono uppercase, icon + message, continuous marquee | None |
| **Product card anatomy** | Cream 1:1 image tile with "🔥 BESTSELLER" mono badge → name 16/500 → sub-line 16/400 grey → hairline → 2 stat rows (icon + 14px grey: "40g protein", "400 cal per meal") → hairline → **"From $45" + "/ $2.65 per meal"** → small black pill | Grey 2:3 tile → name 14/400 → price 14/600. Nothing else |

---

## 2. Ten patterns that make **Huel** feel premium

1. **One sans, two weights.** Everything is Suisse Intl 400/500. No bold, no uppercase headings. Hierarchy comes from size, not weight.
2. **An italic serif accent word in every headline** ("Food to *fuel* your goals", "Shop *your* way", "Shop our *Bestsellers*"). This is the brand voice in one typographic device, used on every section heading and nowhere else.
3. **Headlines are short, sentence case, and the same size everywhere** (54/34). Since the hero isn't oversized, the page reads calm.
4. **One warm neutral does the heavy lifting.** Cream #F5F2EC sits behind every product and tile, so packshots look consistent and the page has warmth without colour.
5. **Black bands for rhythm.** Benefits, press, newsletter and footer flip to #0C0C0D. Light/dark alternation replaces decoration.
6. **Black pill buttons, white pills on photos.** Only two button looks, always the same height in context (40 / 56).
7. **8px radius on every image and card.** Small and consistent, it reads as precise rather than playful.
8. **Benefits are blunt, big and short** ("No Bullshit", "Save Time"): 3×2 grid on black, icon + 30–42px label + one line.
9. **Product cards sell with numbers.** Two stat rows (protein, calories) plus **price per meal** next to the headline price. Comparison shopping is done for you.
10. **Restraint in motion and chrome.** No shadows, no gradients except on photos. One marquee ticker and quiet carousels with dot progress. 150–300ms standard easing.

## 3. Ten patterns that make **Elian Valen** feel premium

1. **Whitespace as the primary material.** 100–160px between blocks on desktop. Content occupies maybe 40% of the screen.
2. **Regular-weight headlines** (Inter 400 at 32–40px). Confidence by not shouting.
3. **Asymmetric editorial grid.** Text column left (~25%), imagery right (~75%), alternating stacks instead of centred blocks.
4. **Product on a flat grey tile, nothing else.** #F2F2F2 at ≈2:3, product centred small with lots of air, **0 radius**.
5. **Minimal card copy.** Name + price only, 14px. The photo does the selling.
6. **Text links instead of buttons.** Underlined "Discover Products", "More informations". It reads like a magazine, not a shop.
7. **One typeface, one size step for meta** (16 body / 14 meta). Almost no typographic noise.
8. **Full-bleed lifestyle bands break the grid** (two-up and three-up editorial photos with a single centred caption).
9. **A giant wordmark footer** (258px, −0.08em tracking) as the closing brand moment.
10. **Monochrome palette.** White, ink, one grey. Colour only comes from the photography.

---

## 4. What this means for SNH (proposed for Phase B, Huel as primary)

Not applied yet; it's here so the prototype rules are agreed up front.

| Token | Proposal | Source |
|---|---|---|
| Sans (UI + headings) | **Inter** 400/500 as the free Suisse Intl stand-in (already loads in Shopify's font library) | Huel #1, EV #7 |
| Accent serif (one word per headline, italic) | **Instrument Serif** italic (free, Google Fonts / OFL), or no serif at all if you'd rather not borrow Huel's device | Huel #2 |
| Mono (ticker, badges) | **JetBrains Mono** 400, 12–13px uppercase | Huel ticker |
| Headline | 54 desktop / 34 mobile, 500, lh 1.12, −0.02em, sentence case | Huel |
| Secondary heading | 24 / 21, 500, lh 1.12, −0.02em | Huel |
| Body / meta | 16 / 14, 400, lh 1.45 | both |
| Container / gutter | 1152 (desktop) / 24 (mobile) | Huel |
| Section inner padding | 64 desktop / 32 mobile (→ 128 / 64 between blocks) | Huel |
| Grid gap | 24 / 12 | Huel |
| Radius | **8px** on every card, tile and image; pills 9999px | Huel |
| Tile fill | Warm cream **#F5F2EC** behind packshots | Huel |
| Ink / dark band | **#0C0C0D** | Huel |
| Accent | **SNH #E0521C**, only for the primary CTA, sale price and the SNH Elite band. Huel's black pill becomes the secondary button | brief |
| Buttons | Pill, 48px (desktop 44 in-section, 56 on photo/dark), 15px/500 | Huel |
| Aspect ratios | Category + product tiles 1:1, athlete cards 9:16, promo tiles 4:5 | Huel |
| Product card | Huel anatomy: badge → brand → name → 2 stat rows → price + **price per serving** → Koko line → quick add | Huel #9 + brief |
| Motion | `cubic-bezier(.4,0,.2,1)`, 200–300ms UI, 500ms fade-up reveal, marquee ticker, all off under `prefers-reduced-motion` | Huel #10 |
| Borrowed from Elian Valen | More air around the hero and the full-bleed SiS feature, minimal copy on promo tiles, text-link CTAs for tertiary actions | EV #1, #6, #8 |

**Decisions (confirmed 18 Oct):**
1. Italic serif accent word: **yes**, Instrument Serif italic, **at most one word per headline**.
2. Fonts: **Inter + Instrument Serif only**. The ticker uses Inter (no mono).
3. **Sentence case** for headlines and body; all-caps only for small eyebrows, badges and the logo.
4. Headlines in **Inter 600** (not Huel's 500) for more punch.

---

## 5. Punch references

### 5a. Beast Nutrition LK (https://beastnutrition.lk, confirmed Sri Lankan Shopify store, LKR pricing)

| Property | Beast Nutrition |
|---|---|
| Families | **Heading Pro ExtraBold** (condensed display, 800, uppercase: "SHOP BY CATEGORIES", tab titles) · **Plus Jakarta Sans** 400–800 for everything else (500 body, 700/800 names and buttons) |
| Headline / section title | 40px desktop / 25–35px mobile · 800 · **uppercase** · condensed · ls 0 |
| Body | 16px · 500 · lh 1.4–1.6 (heavier than Huel's 400) |
| Container | 1380px at 1440 (≈30px margins, near full-bleed); 15px mobile gutter |
| Radius | **0** on cards, buttons and banners; 50% on round category tiles only |
| Aspects | Product tiles **1:1** on #F5F5F5 / #F2F2F2; banners 3:2, 4:3 and full-width 3.3:1 |
| Buttons | **Square, black or white, 40–58px, 11–12px, weight 800, uppercase** ("SHOP NOW", "SUBSCRIBE"); a coral sale tab #DC5663 |
| Palette (interface) | **Pure black #000 + white + #F5F5F5**. 24% of background area is black, **0% is saturated**. Colour comes almost entirely from banner artwork (neon green, Hulk, saturated product art). Green #1B5E20 sale badges; logo lime #CCFF00 |
| Density | **24 images and 110 words per screen** on desktop (Huel ≈ 8 and 60); 4-up product grid with flavour chips + Koko line on every card |
| Motion | 1s `textclip` reveal on headings, hero slideshow with dots, video tiles (muted loop). No marquee |
| Mobile extras | Persistent bottom tab bar (Home / Shop / Account / Wishlist), floating chat button |

**Where Beast's punch comes from:**
1. **Weight.** 800 condensed uppercase display plus 500–800 UI. Nothing on the page is light.
2. **Maximum contrast.** Pure #000 on #FFF, black footer and newsletter, no greys in between for large areas.
3. **Saturated imagery doing the shouting.** Brand campaign art (Black Stak, Slush Puppie, Cream of Rice) fills big tiles; the interface stays neutral so the art pops.
4. **Square, heavy CTAs.** Uppercase 11–12px/800 in solid black or white. They read as commands.
5. **Density and urgency.** Discount badges (−4%, −25%) on every sale card, strike-through prices, tabs (On sale / Best sellers / Trending), many products per screen.
6. **Local-commerce proof inline.** Koko pay-in-3 on every card, phone number, WhatsApp, "Accepts KOKO" banner, real-customer review cards with faces.

**What not to copy:** mixed banner styles (each campaign tile has its own fonts and colours), Title Case Every Word in reviews, three type families, uneven spacing, a "Trial" (unlicensed demo) display font in production.

### 5b. Waking PH: pending

No URL was supplied (the brief had a placeholder). The search found no official site, and `waking.com.ph` is a **parked domain** ("This domain is available to be registered"). This section will be filled once the correct link is known.

---

## 6. Synthesis for Phase B (supersedes the §4 proposals where they differ)

**Huel gives the skeleton** (structure, consistency, restraint); **Beast gives the voltage** (weight, contrast, density, commerce proof). The SNH orange carries the punch that Beast gets from campaign art.

| Decision | Value | From |
|---|---|---|
| Headline | **Inter 600**, 54 desktop / 34 mobile, lh 1.08, ls −0.025em, sentence case, + ≤1 **Instrument Serif italic** word | Huel structure, Beast weight |
| Display (hero only) | Inter 600, 88 desktop / 48 mobile, lh 1.0, ls −0.035em | punch |
| Secondary heading / body / meta | 24/21 Inter 600 · 16 Inter 400 lh 1.5 · 14 Inter 500 | Huel |
| Eyebrows & badges | Inter 600, 12px, **uppercase**, ls .08em | Beast urgency, rule 3 |
| Ticker | Inter 500 13px uppercase, ls .06em, black band, marquee | Huel |
| Container / gutters | 1152 / 24 mobile | Huel |
| Section padding | 64 desktop / 40 mobile (inner), dark bands for rhythm | Huel (+ a little mobile air) |
| Radius | **8px** cards, tiles and images; pills 999 | Huel (consistency over Beast's 0) |
| Colours | Ink **#0C0C0D**, white, cream **#F5F2EC** tiles, greys #6E6E6E / #A5A5A6, **accent #E0521C** only | Huel + brief |
| Contrast moments | Black bands (benefits, SiS feature, footer) and **one orange band** (SNH Elite). The hero CTA, sale prices and badges are orange | Beast contrast, single accent |
| Buttons | One pill style: **48px**, 0 24px, Inter 600 15px. Primary = orange, secondary = ink, on-dark = white | Huel shape, Beast weight |
| Product card | Huel anatomy + Beast commerce proof: badge, brand, name, 2 stats, price + **per serving**, strike-through when on sale, **Koko line**, quick add | Huel #9 + Beast #5/#6 |
| Imagery | Real SNH packshots on cream tiles; lifestyle shots as **labelled grey placeholders** until real photos exist | brief |
| Motion | `cubic-bezier(.4,0,.2,1)`; 200ms UI; 500ms fade-up reveals; ticker marquee; headline clip-reveal on the hero only; everything off under reduced motion | Huel + Beast textclip |
| Density | Huel spacing between sections, Beast density **inside** commerce sections (4-up desktop, 2-up mobile product grid, stat rows, Koko line) | both |
