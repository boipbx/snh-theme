# QA log (Round 14)

Target theme 189832462590 (snh-theme/feat/theme-v2); every check asserts `Shopify.theme.id` first.
Baseline: commit `757e351` (tag `round14-baseline` exists locally; the GitHub proxy refuses tag pushes with 403).

| item | status | proof (prototype/shots/r14/…) | notes |
|---|---|---|---|
| P0.1 add to cart | DONE | p0-1/collection-single-drawer, collection-multi-sheet, sheet-soldout, home-card-add, search-card-add, pdp-atc-drawer, pdp-sticky-drawer, bundle-added, drawer-after-remove, cart-page, checkout-loaded (-390/-1440); p0-1/atc.md | Cause: multi-variant "+" opened Impact's quick-buy drawer, which crashes on our product template (`reading 'content'`), so nothing opened / users went to the PDP. New `assets/snh-quick.js` sheet (pills, struck sold-out combos, qty, subscribe when plans exist, Add → drawer). All 14 steps PASS at 390 + 1440 (real cart in the test browser; stopped at checkout page load). Subscriptions: no product has selling plans (N/A). Console errors left: Amose Bundle app. |
| P0.2 mini cart (R13 work) | **DONE** (bundle card: BLOCKED, needs a bundle offer) | prototype/shots/r14/p0-2/ (drawer-*-390/1440.png), minicart.md | Creatine, whey, gels and near-free-delivery baskets PASS at 390 + 1440: proportional free delivery (near basket Rs 15,494 → rule `close`, window Rs 1,506–3,006, "Unlocks free delivery"), one bar ≤ Rs 1,500, fixed footer. The first near-threshold fixture was wrong (gel stock 4 capped it at Rs 12,495 → gap 4,505 → add-ons, correct). Bundle basket: cart API blocked by Cloudflare on every attempt; the bundle card also needs a bundle offer configured (LAUNCH.md #2). |
| P0.3 offers + popups | **DONE** | prototype/shots/r14/p0-3/ (popup natural/a/b, campaign home/drawer/cart/account, 390 + 1440), offers.md | 14/14 PASS. Popup by itself (phone scroll / desktop timer) and via ?popup=a/b; spin reveal shows only prizes that have a code (code-less prizes only in test mode). Default campaigns live: announcement "Free delivery", guest home banner, Koko cart banner in drawer, /cart and the member account page. |
| P0.4 one Elite card | **DONE** | prototype/shots/r14/p0-4/ (front + back per placement, 390 + 1440), card.md | One snippet in header panel, Overview, Rewards, sidebar (desktop only by design), Elite page, home band (guest sample). Click + keyboard flip PASS everywhere; tier contrast 5.09–12.31:1. |
| P1 parity + filters | **DONE** | PARITY.md · prototype/shots/r14/p1/ (filters-*-390/1440.png, filters-ui.md) | 23-page comparison: 28 missing menu destinations added. Filters: 10/10 URL combinations on whey, creatine, applied-nutrition give the same product count as the old site; 18/18 interactive checks at 390 + 1440. Fixed while testing: second brand pick (phones: brand rail moves into the Filter & sort sheet; desktop: Brand toggle in the condensed bar) and the bar condensing too early before the hero image loaded (empty gap above the grid). |
| P2 reco + type + responsive | **DONE** | RECO.md · prototype/shots/r14/p2/ (reco-*.png, responsive-*-<w>.png, responsive.md) | Reco: 12 scenarios × 390 + 1440 (vitamins-only gets 1 suggestion: thin, by the Rs 1,500 cap). Responsive 360/390/430/768/1024/1280/1440/1920 × home/collection/product/cart: no sideways scroll anywhere; body sentences raised to 16 px (hero sub, benefits, campaign banners, PDP sub/benefits, cart ETA, empty basket); tap targets raised to ≥ 24 px (crumbs, footer + social links, PDP trust/eyebrow/stars, slider segments, logo 44 px). Left: Koko line 14 px (meta), Reputon widget targets (third-party). |
| P3 final regression | **DONE** (mobile performance target NOT met) | prototype/shots/r14/p3/ (links.md, lighthouse.md, lighthouse/*.json) · p0-1/atc.md (re-run) | Add-to-cart suite re-run after all changes: 28/28 flow checks PASS at 390 + 1440 (page errors are third-party: Clarity tag, Amose). Link crawl: 320 internal links, 2 dead mega-menu links fixed, 1 dead link in a product description (admin, LAUNCH #21), 0 theme console errors. Lighthouse (median of 2): accessibility 93–100, CLS ≤ 0.077 everywhere; desktop performance 79–86; mobile performance 38–41 (target 70: blocked by third-party tags / web pixels, theme JS 0.24–0.48 s, LAUNCH #13). |

## Round 15 (1 Nov 2026)

Baseline: commit `1b07c57` (the tag push `round15-baseline` is refused by the remote, as in Round 14; the tag exists locally).

| item | status | proof (prototype/shots/r15/) | notes |
|---|---|---|---|
| 5a snh-campaigns.css not updating | **DONE** | — (DOM: new `?v=`, computed 16 px) | Root cause: `snh-campaigns.js` built the CSS URL from its own `src`, so the CSS carried the JS file's `?v=`; CSS-only edits kept the same URL and the CDN served the cached copy (the GitHub sync was fine). Now the section passes the CSS's own `asset_url` (`data-css`); the snh-v2.css workaround is removed. |
| 4 Koko logo everywhere | **DONE** | koko/ (card, quickbuy, footer, pdp, drawer, banner-drawer, cartpage × 390/1440), koko.md | `snippets/snh-koko-logo.liquid` + `SNH.kokoImg()` (layout); the official logo moved into `assets/snh-koko.png` (was hotlinked from paykoko.com). 18/18: product cards, quick-buy sheet, footer payments, PDP, cart drawer, campaign banner heading, cart page, checkout payment router, Shop the Look. Also Shop by brand + price-list (Impact) now use the asset. |
| 3 product card contrast | **DONE** | cards/ (cards-white-390/1440, cards-cream-390/1440), cards.md | Warm #F5F2EC tile edge to edge (deeper #ECE5D9 on cream sections), white body, hairline #E3DCD0 + soft hover shadow, price #0E0E0E 700 18 px phone / 20 px desktop, brand + ★ on one row, name 2 lines, meta line, Koko logo, black quick-add. Compare-at struck grey + "Save Rs X" in #BF4512 (markup in place; no product is on sale right now, so no live screenshot). |
| 1 SNH Elite card (static, one design) | **DONE** (login/register placement: see item 2) | card/ — `{bronze,silver,gold}-{front,back}-full-1440.png`, `{bronze,silver,gold}-{front,back}-phone-390.png`, `overview-{tier}-{390,768,1440}.png`, `sidebar-small-1440.png`, `header-panel-compact-{390,1440}.png`, `elite-page-hero-*`, `home-band-sample-*`, `rewards-1440.png`; card.md | Rebuilt from the approved header-panel credit card (`snippets/snh-elite-card.liquid`, class `elc`: the old dashboard's `.ecard` rules collided). Front 1.586:1 r16: theme logo recoloured per tier (CSS mask of `assets/snh-logo-mark.png`) + serif italic "Elite", tier caps, EMV chip, "0000 0427", MEMBER + name, POINTS + Rs, progress line. Back: magnetic stripe + label/value rows (earn rate, spend this year, next tier + Rs X to go + bar, redeem at 2,500, points value) + View rewards. Static: tilt JS and 3D flip removed; hover sheen only on fine pointers; reduced motion none. Measured: transform none on every card (also hovered), no text < 12 px, no overflow, min contrast bronze 4.92 / silver 7.39 / gold 6.10. Overview: front + back side by side (equal 440 × 277 at 1440, 356 at 768), points panel below; phone: one card + "Show back" (crossfade). 26/26 + 3/3 (768). |
| 2 sign in / register / recover / activate / reset | **DONE** (activate / reset: same section, not opened — needs a real token link) | auth/ (login, register, recover × 390/1440), auth.md | `snippets/snh-auth-bg.liquid`: full-bleed crossfade of 3 Files photos (cricket, running, hero slide 2; set per template, editable: Photo 1–3) under an orange → black tint, optional background video; reduced motion = photo 1 static (checked). Foreground: white form card (left on desktop) + the sample Elite card, 3 perks (500 welcome points · 3–10% back · redeem from 2,500) and a social-proof line (right); phones: photo header → form → card. All forms unchanged (native Shopify forms, mobile +94 required, quiz step 3, errors); added password Show / Hide and invalid-field states. 19/19 (no form submitted). |
| 5b regression after Round 15 | **DONE** (bundle basket BLOCKED, as Round 14) | p0-1/ (ATC 390 + 1440), p0-2/ (mini cart), p0-3/ (popups + campaigns) | Add to cart 14/14 flows at 390 and 14/14 at 1440 (collection single + multi sheet, home, search, PDP + sticky, sold-out pills, bundle, drawer ± / remove, /cart qty, checkout loads; page errors are third-party: Clarity, Amose). The sticky step failed twice on test timing (Escape pressed before the drawer finished opening); the test now confirms the drawer closed. Mini cart: creatine, whey, gels, near-free-delivery PASS at 390 + 1440; bundle basket blocked by Cloudflare on the cart API and needs a bundle offer. Popups + campaigns 14/14 (the Koko banner heading shows the logo). |

## Round 16 (1 Nov 2026): account dashboard + card fixes

| item | status | proof (prototype/shots/r16/) | notes |
|---|---|---|---|
| 1 Koko logo size | **DONE** | koko/ (card, quickbuy, footer, pdp, drawer, banner-drawer, cartpage × 390/1440), koko.md | Dashboard payment banner removed (no `data-campaign-slot` on the account app). `snh-koko-logo` caps h at 20 and sets an inline height + max-height; `SNH.kokoImg` caps at 20; CSS `img.snh-koko` max 20 px (16 px in card / drawer / cart / quick-buy lines), on the text baseline. Measured: cards 14, quick-buy 14, drawer 15, cart page 15, Shop the Look 13, PDP 18, banner heading 18, footer 14 (+2 px white chip = 18), payment chooser ≤ 20 (was 22). No Koko image over 20 px on collection, PDP, cart, home. 28/28. |
| 2 Elite card flip | **DONE** | card/ (`{bronze,silver,gold}-{front,midflip,back}-{1440,390}.png`), card.md | One flip card (side both): click / tap / Enter / Space → 3D rotateY (700 ms), second click back, "Tap to flip" → "Tap to flip back"; no pointer tilt / parallax (pointer moves change no transform); reduced motion = instant crossfade (checked). Shadow on the faces (turns with the card). Front: name one line bottom-left, "2,180 POINTS · Rs 2,180" one line bottom-right (compact / small: front only, same one-line points; the sidebar drops the Rs value to fit). Back unchanged, fits at 390 / 768 / 1024 / 1440. Flip card on Overview, Rewards, Elite page, home band, login, register; header panel + sidebar front only. |
| 3 Sidebar | **DONE** | sidebar/ (sidebar-1024, sidebar-1440) | Old avatar + name pill removed; compact card then the nav; name and points one line at 1024–1440 (heights 16 / 18 px). |
| 4 Overview spacing | **DONE** | overview/ (overview-390, -768, -1024, -1440) | Eyebrow top = sidebar card top (245 px) at 1024 + 1440; ONE flip card; points panel beside it at ≥ 1200 px with the same height (277 = 277; the panel takes the card's 1.586 ratio), below it under 1200 px (at 1024 two columns would make the card 336 px wide and the panel too short for its content). 33/33. |
| regression | **DONE** (bundle basket BLOCKED, as before) | p0-1/ (ATC), p0-2/ (mini cart) | Add to cart 14/14 flows at 390 and at 1440 (page-error rows are third-party: Clarity, a transient 503). Mini cart: creatine, whey, gels, near-free-delivery PASS at 390 + 1440 (needed slow retries: the store rate-limited the cart API with 429); the bundle basket's cart call is blocked (Failed to fetch) and needs a bundle offer (LAUNCH.md #2). |

## Round 17 (2 Nov 2026): wholesale + franchise pages, footer, final polish

| item | status | proof (prototype/shots/r17/) | notes |
|---|---|---|---|
| 1 Wholesale page `/pages/wholesale-1` | **DONE** | pages/wholesale-{390,1440}.png (full length), -768 (viewport); forms/wholesale-form-*, wholesale-success-*; biz.md | New `snh-biz-*` sections: hero (full-bleed store photo, orange → black tint, H1, CTA to the form + WhatsApp, Organization schema), trust strip, who it's for (5 cards), what you can stock (9 category tiles → collections), bestselling wholesale lines (v2 cards, "Wholesale price on request" toggle; default collection whey protein: there is no bestsellers collection), brand wall (marquee, count hidden: its 13 logos would contradict "18+ brands"), 4 steps, 6 benefits (no numbers), copy blocks, native form (all fields, hidden Subject / form / tags, +94 mobile, 11 product checkboxes as separate fields), success state, FAQ (6) + FAQPage. ~1,050 words. |
| 2 Franchise page `/pages/franchise-partner` | **DONE** | pages/franchise-*, forms/franchise-form-*, franchise-success-* | Hero, trust, intro copy, why SNH (6), store gallery (Dehiwala, Wattala, Nugegoda), what we look for (4), what you get (6), 5 steps, investment overview ("Investment details shared after the first call"), native form + success, FAQ (6) + FAQPage. ~940 words. Both pages: one H1, Organization + BreadcrumbList (layout) + FAQPage, alt text on content photos, lazy images below the hero (the brand marquee now starts near the viewport), CLS ≤ 0.002, no sideways scroll. |
| 3 Discoverability | **DONE** | placements/ (mega-offers-1440, mobile-menu-offers-390/768, home-grow-*) | "For business" column in the Offers mega menu + the mobile Offers panel (editable: Offers panel → Business links); footer Business column (Wholesale, Franchise partner, Work with us; moved out of Info); home "Grow with SNH" band after the stores (2 cards, `snh-grow`); the same band on locations + about pages. SEO.md written. |
| 4 Footer rework | **DONE** | footer/footer-before-*, footer-after-* (390/768/1440), footer.md | Mark reveal: clip-path wipe 1,200 ms → opacity + translate3d fade/slide 360 ms (measured 283–383 ms), reduced motion static. No layout shift; long tasks +0 except one intermittent third-party task at 768 (a CSS transition can't create one). The "empty orange circle" was `.ftr__dot`, a decorative dot after the logo: removed (setting off + CSS). Koko: the official file is already transparent (corners alpha 0, no white pixels); the white chip was CSS from Round 15, now removed: the original transparent logo on the dark footer, 16 px. Payment logos row (Visa, Mastercard, Amex, Koko Pay in 3, Cash on delivery), socials, copyright; columns 2 / 3 / 6 at 390 / 768 / 1440. |
| bug found + fixed | **FIXED** | — | The wholesale "price on request" card option was first named `request`, a global Liquid object, so every product card on the preview hid its price + quick-add (from the business-pages push until the fix). Renamed to `price_note`; verified: collection 34 cards with prices + 24 quick-adds, home 22 + 22, wholesale 8 notes. Never on the live theme. |
| regression | **DONE** (bundle basket BLOCKED, as before) | p0-1/ (ATC 390 + 1440), p0-2/ | Add to cart 14/14 flows at 390 and 1440 after the fix (page-error rows: Amose, Clarity, third-party). Mini cart creatine / whey / gels / near-free-delivery PASS at 390 + 1440 (slow pacing, no 429); bundle basket cart call blocked as in earlier rounds. Business test 39/39 (biz.md; the wholesale +94 check rechecked with the phone welcome popup closed). |

## Round 18 (3 Nov 2026): homepage + mobile fixes, quiz band + free workout plans

| item | status | proof (prototype/shots/r18/) | notes |
|---|---|---|---|
| 1 Shop the Look static | **DONE** | 01-stl-390/1440 | Zoom/pan removed (JS `setZoom`, CSS transforms, the section's zoom setting). Hover/focus on a dot or row only highlights its partner (orange dot ring, orange row edge, filled number). Measured: image transform `none` after hover. |
| 2 eyebrow letter-spacing | **DONE** | 01-stl-*, 04-grow-*, 06-standard-* | Every `.06–.2em` letter-spacing in the v2 CSS/sections/snippets → `.04em` (82 rules, 17 files). Computed 0.48 px on 12 px eyebrows. Old unused sections (ss-*, wholesale.liquid …) untouched. |
| 3 card images crisp | **DONE** | 03-cards-home/collection/search-390/1440 | Removed the packshot brightness lift (`filter: brightness(--lift)`, up to 1.36×) and the edge-fade mask. Grey studio backdrops now tint their tile to the sampled backdrop colour instead (no filter on the image). Measured: 0 filtered / 0 masked images on home, collection, search. |
| 4 Grow with SNH | **DONE** | 04-grow-390/1440 | The arrow SVG was unsized (~400 px). Pill CTA bottom-left, arrow nudges 4 px on hover, image 1.03 zoom inside the card, darker 3-stop gradient, clamp padding. |
| 5 mobile menu toggle | **DONE** | 05-after-root/level-360/390/430 | Rebuilt: 2 equal segments (156/171/191 px), labels centred (offset 0), sliding white pill inset 4 px, left edge 20 = list edge. Also the search placeholder stays on one line at 360. |
| 6 The SNH standard | **DONE** | 06-standard-390/1440 | No motionsite references in the repo (searched prototype/, *.md, all text files): built the bento fallback. Large tile with the 50,000+ counter (counts up once on scroll), lead and rating; 6 benefit tiles (all copy kept); orange glow, hover lift, staggered reveal; phones swipe the benefit cards. |
| 7 mobile homepage pass (390) | **DONE** | home390-before/, home390-after/, 07-mobile-after-sheet.png | Shop the Look rail cards stand alone (the shared white stack made the next card's number look like part of this one), and the grid column is pinned to `minmax(0,1fr)`. Elite band copy readable over the photo on phones. Stores swipe instead of stacking (1451 → 614 px). No duplicate "First to know" signup in the footer right under the newsletter band. Footer phone without a dangling "·". No horizontal overflow, no text < 11.5 px. |
| 8 quiz band + workout plans | **DONE** (Klaviyo flow: set up in Klaviyo, KLAVIYO-WORKOUT.md) | 08-band-*, 08-quiz-q1-*, 08-plan-*, 08-gate-* (390/1440); r18-quiz.js 17/17 × 2 | `sections/snh-quiz-band` replaces the goal chips. The quiz (in a `<template>`, app JS/CSS loaded on first click) opens full screen. Guests: stack + matched plan (day 1 open, rest locked) + sign-up gate (first name, mobile, email, password, offers opt-in) → `customer[tags]` = answers + `plan:<id>` + `quiz:home` + `mobile:`; Klaviyo profile props + "Workout Plan Unlocked" event (with the plan days); list subscription when a list ID is set. Sign-in path: answers kept on the device, the Goals tab offers "Save to my account". Members: full plan + Save my plan. 12 plans in `snippets/snh-workout-plans` (WORKOUT-PLANS.md: metaobject for later). Tested without posting (Klaviyo routed, synthetic submit). |

## Round 19 (4 Nov 2026): feedback fixes

Target theme 189832462590 (feat/theme-v2); every check asserts `Shopify.theme.id`. Real test-browser carts only (cleared after), no orders, no form posts (Klaviyo routed, gate submit synthetic). Videos checked in Google Chrome (`CHROME=1`): Playwright's Chromium has no H.264. Tools: `prototype/tools/r19-*.js`.

| item | status | proof (prototype/shots/r19/…) | notes |
|---|---|---|---|
| 1 card images | **DONE** | 01-cards-{home,collection,search}-{390,1440} | Cause: the warm #F5F2EC / #ECE5D9 tile + `mix-blend-mode: multiply` turned white backdrops and the packs' own whites cream/yellow; on hover the card crossfaded to a second photo with a different backdrop ("flips to white"). Now one neutral #F7F7F7 tile (multiply on neutral grey darkens ~3 %, no cast), no second image, no zoom/filter; hover = 3 px lift + soft shadow only. Grey studio shots keep a tile in their own grey (6 of 34 cards on the whey collection, 5 of 24 on the creatine search); the mid/dark unframed ones (L < 215) show edge to edge instead of a seamed tile (`data-v2-greyshot`). Those packshots are worth replacing with white-background files. Measured: 0 filtered images, hover changes no tile colour / image src / opacity (home, collection, search). Cart suggestions + lines use the same neutral tile and the card pixel crop. |
| 2 cart CSS audit | **DONE** | 02-cart/{drawer,drawer-line,cartpage}-{before,after}-{360,390,768,1440} | See the fix list below. Stepper measured at all four widths: pill 106 × 36 (98 × 34 under 400 px), − and + 36 × 34 each, qty cell 32; −, qty, +, trash and price share one centre line on every line (drawer + /cart). No page overflow; no visible text < 12 px. |
| 3 quiz: no budget | **DONE** | 04-plan/muscle-*; r19-quiz.js | Budget question, its tags (`budget:`), the stack's price sort + trimming, the account picks' price cap and the schema option are gone. Results always ≥ 3: the goal's complementary categories (FILL) then any category in stock. 360/390/1440 PASS: 3 picks, no budget step. |
| 4 plan + results layout | **DONE** | 04-plan/muscle-plan-{360,390,1440}, 09-goals-plan-* | Desktop ≥ 900: one weekly table (a column per day, scrolls in its frame for 5–6 days, edge padding restored); phones: day cards, one exercise per row (pictogram · name · sets × reps · rest · Watch how), no 3-column table. Locked preview: blurred columns/cards + one "Days 2–4 are locked" line. The quiz overlay widens to 1120 for the table (stack stays 760). 0 overflow, 0 text < 12 px at 360/390/1440. |
| 5 relevant promos only | **DONE** | 05-cart-guest-noprefs-*, 05-account-{new,bronze,vegan}-* | Promos matched in the browser (`SNH.prefsMatch`) against member tags + bought brands/types (last 10 orders) or a guest's saved quiz answers; every set field must match, at least one set; untargeted promos match their link's brand (RYSE → RYSE buyers). Guest cart: RYSE hidden. Personas: new (no data) → no promos + Personalise your SNH; bronze (bought RYSE + creatine) → Stack your creatine + RYSE; vegan → Plant protein only. Site campaigns get the same targeting fields. 22/22 PASS. |
| 6 onboarding | **DONE** | 06-onb-{home,collection}-{390,1440} | `sections/snh-onboarding-prompt` (overlay group, all copy/image/timing editable). Fresh guest: slides in after 10 s / 30 % scroll, the email popup does not open on that page view (shared `SNHPopups.claim`); seen < 7 days → none; 8 days → again; /cart → never; guest with quiz answers → none; button opens the quiz full screen (`/?snh-quiz=open` elsewhere). Quiz results save `snh_prefs` (used by promos + prompt). Also fixed: the email popup could open over the open cart drawer. |
| 7 bundles in the cart | **DONE** | 07-bundles/{creatine,pre-workout,collagen,magnesium,gels}-{offer,drawer}-{390,1440}, creatine-unlocked-*, cartpage-unlocked-390, banner-*; 07-bundles/bundles.md | 25 bundle products auto-detected (bundle collections) with their contents from the descriptions (brand + full name sentence, size-checked, product codes) + overrides textarea; table below. Creatine → Creatine Starter Pack (save Rs 1,999) → Swap → basket = the bundle, "🎉 Bundle unlocked: you're saving Rs 1,999", confetti once (not on re-render, none for reduced motion), cart page too. Pre-workout → RAW Premium Training Stack, collagen → Scar Tissue Recovery, magnesium → REVIVE Bundle of 2, gels → Race Day Pack 1.0 (390 + 1440). Whey: Critical Whey 25 servings (the whey stacks' whey) is sold out, so no whey basket could be built; the stacks are mapped. |
| 8 background video slot | **DONE** | 08-video-{stats,tile,register,account-hero}-{390,1440} | `snippets/snh-bg-video` + `assets/snh-bgv.js`: Shopify video or URL (`asset:` allowed), poster, darkness; source attached only near the viewport, plays in view, pauses off-screen / hidden tab, reduced motion = no download. On the SNH standard band (whole band or the big tile), the register page and the account Elite hero (separate settings each). No video set → unchanged (checked). QA page `?view=r19-video` + the silver persona carry a test video; real templates have none set. |
| 9 workouts + tracker | **DONE** | 09-overview-plan-card-*, 09-goals-plan-*, 09-tracker-* | Goals tab: saved plan or the one the quiz tags match, with Mark done ticks, This week x/n, streak (weeks with every session), XP (50 a session, level per 500) as the filling shaker; Overview card with the next session. Pictograms for every exercise (20 movement drawings) + Watch how (YouTube search) unless an Exercise demo block / `snh_exercise` metaobject gives media. Ticks persist across reloads (localStorage); cross-device sync needs a backend (WORKOUT-PLANS.md). |
| 10 shaker level | **DONE** | 10-shaker-{level-card,header-panel}-{390,1440}, 09-tracker-* | SVG SNH shaker (flip-top lid, tinted transparent body, ticks, highlights), liquid in the tier colour fills to the progress with a wave + bubbles, animates in on view; reduced motion = static. Overview level card (tier progress, silver 42 % → fill 0.42), header account panel (bronze 0 / silver 0.42 / gold 1), tracker XP, and the quiz shake game. |

**Item 2 fix list (cart drawer + /cart):**
1. Quantity stepper rebuilt: one 1 px pill, three equal cells (36 px; 34 px under 400 px), qty cell ≥ 32 px with tabular figures, − / + drawn as 12 px bars on the optical centre (the text glyphs sat on different baselines, so the number looked pushed toward +).
2. Trash button the same 36 px hit area as the stepper cells; row gap 8 px; the row no longer wraps.
3. −, qty, +, trash and the line price share one centre line (measured equal at 360/390/768/1440, drawer and /cart).
4. Line price 16 px / 1.25 (15 px under 400 px), centred on the row; title 15 / 1.35 (2 lines), variant 13 / 1.4.
5. Thumbnails: neutral #F7F7F7 tile + 1 px #EDEDED edge (was cream + multiply, yellowing packs).
6. SNH framed packshots (orange frame + logo) cropped inside the frame in lines, suggestions and minis (pixel crop shared with the cards; image URLs made same-origin so the canvas can read them).
7. The email popup no longer opens over an open cart drawer (seen at 1440).
8. /cart at ≥ 768: suggestions fill the column (auto-fit ≥ 150 px; four fixed 168 px cards left an empty fifth slot at 1440).
9. /cart at ≥ 1024: 104 px line thumbnails.
10. "Swap to a bundle" page list replaced by the per-line bundle offer (item 7), so the same offer isn't shown twice.
11. Our JSON fetches throw a clear error on non-OK responses (rate-limited 429 HTML pages were being parsed as JSON).
Checked, no change needed: no horizontal overflow at any width; no visible text < 12 px; free-delivery bar, footer (total, points, checkout, Koko line, payment row) unchanged.

## Post-launch round (9 Nov 2026): live theme, small verified commits

Theme 189832462590 is live, so every change was a small commit, checked on www.sportsnutritionhub.lk at 360 / 390 /
768 / 1440. From this environment the store's Cloudflare check challenged the headless browser and rate-limited its
cart calls (HTTP 429); live checks therefore load the real pages through Playwright's server-side fetch, and the
mini-cart/cart-page states use simulated carts built from real product JSON (only `/cart.js` is simulated; the live
theme code renders them). Screenshots: `docs/qa/post-launch/`.

**A1 Mini cart** (`assets/snh-cart.css`, `snh-cart.js`, `sections/campaigns-group.json`)
- Big "Pay in 3 with Koko" box removed (it was the `default_koko` cart campaign); Koko stays as the one-line
  "or 3 × Rs X" in the footer. Campaign banners in the drawer/cart are now one compact line (e.g. Saturday sale).
- 48px header, one-line free-delivery bar (36px), lines with 64px image and 32px stepper.
- "Bundle unlocked · you're saving Rs X": one fully visible pill at the top of the items, pop animation (none with
  reduced motion; confetti dropped). "Make it a bundle, save Rs X · Add": one row under the matching item
  ("Bundle, save Rs X" under 420px so the saving never truncates).
- "Goes with your order": one row of max 3 small cards.
- Verified live, 390 + 1440, simulated carts: 1 item, 3 items, bundle unlocked, bundle offer, near free delivery,
  free delivery unlocked → first line starts at 96px (fully visible above the footer), footer 21–23% of the screen.
  Guest only (members need a real login; the member points line uses the same footer).
- Fix found on the way: the line's text column grew to 286px inside 244px at 360 (price and Add cut off) →
  `.sline__b { grid-template-columns: minmax(0,1fr) }`.

**A2 Cart page** (`assets/snh-cart.css`, `snh-cart.js`)
- Phones/tablets: title → items → offers → recommendations → summary; compact lines; the fixed summary bar reserves
  its real height (ResizeObserver → `--scp-foot-h`) instead of a hard 260px. Koko box gone (same campaign).
- Verified live: first item fully visible above the summary at 360×740 and 390×844, summary 26–33% of the screen, no
  horizontal overflow, last content never under the bar.

**A3 "Too zoomed in"** (`assets/snh-v2.css`, `snh-product.css`)
- Fluid type re-anchored: display 38→66, h1 32→52, h2 25→40, h3 21→33, h4 18→26, h5 16→22 (≈ −12% phones, −8%
  desktop); body 15px on phones (16 from 768); buttons 44px; sections 40/56; PDP title 23/33.
- Header stack on phones: ticker 29 + announcement 30 + header 57 = **116px** (was 135). Verified live at 360/390.

**A4 Homepage speed** (Lighthouse mobile, local CLI against the live site)
- Before: score 47–56 · LCP 3.9–4.9 s · TBT 740–780 ms · CLS 0 · **20.7 MB**.
- After: score 49–63 · LCP **3.3 s** (2 of 3 runs; 4.8 s in a noisy run) · TBT 1.1–1.6 s · CLS ≤ 0.021 · **3.5 MB**.
- Changes: the SNH standard band's 8.7 MB animated WebP (fetched twice: `<img>` + `<video poster>`) now shows a
  ~40 KB static first frame; the animation loads on desktop only when on screen; the closed cart drawer builds on idle /
  first open (no cart + 60-product fetch at load); the hero image preloads from the head (setting *Homepage hero image
  to preload*, set to running.jpg). First slide was already eager + fetchpriority=high with srcset; other slides
  already deferred; background videos already preload="none" + in-view only; no image > 1600px reaches phones.
- TBT is third-party: theme code ≈ 146 ms of blocking; Google Tag Manager ≈ 650 ms (3 tags: G-XH211LVY25,
  AW-11220377599, GT-T5MGH95), Facebook pixel ≈ 400 ms, Shopify web pixels / checkout preloads ≈ 270 ms.
- Admin actions (not theme): see the summary list below.

**Third-party apps slowing the site (admin action each)**
| App / script | Cost | Action |
|---|---|---|
| Google Tag Manager (3 tag IDs) | ~650 ms blocking, ~650 KB | Keep one GA4 + one Ads tag; remove the duplicate GT/G tags in Online Store → Preferences / Google & YouTube app |
| Facebook pixel | ~400 ms | Keep only via the Facebook & Instagram app (not also a custom pixel) |
| Nosto | 402 Payment Required on every page | Uninstall (subscription lapsed) or renew |
| Amose Bundle | JS error on product pages | Customize → App embeds → turn off if unused |
| Reputon Google reviews | ~560 ms script, loads jQuery + Mustache + DOMPurify | Show the widget only on the homepage, or replace with the theme's own reviews strip |
| Appstle subscriptions | 88 KB, 77 KB unused | Disable the embed if subscriptions aren't sold |
| Microsoft Clarity | fails to start | Reconnect in the Clarity app or remove |
| Checkout branding | 2.4 MB `autumn_mood_2000x.png` preloaded on every page by Shopify's checkout preloader | Settings → Checkout → Customize: replace the background with a compressed image (< 200 KB) or remove it |

**Klaviyo go-live** (emails branch, `emails/SETUP-LOG.md`)
- 12 SNH flows **live** (all 20 email steps live), the 4 old flows they replace set to **draft** the same minute.
- Fixed first: Replenishment used fields Placed Order doesn't have ("Running low on ?") → rebuilt on `Items.0`
  (flow re-created as X3m4yg because the API can't edit a flow email's subject); Review request button now falls back
  to the product's review section instead of /account.

**B Loyalty** (`snippets/snh-elite-card`, `snh-app-rewards`, `snh-app-reward`, `snh-acct-panel`, `snh-elite-reward`,
`snh-app-order-card`, `sections/snh-account-order`, `LOYALTY-NOTES.md`)
- Missing balance → "Your points are being updated, check back soon" (card: "updating soon"); never "—" or a fake 0.
- Unpaid / pending orders → "Points added when payment is confirmed" (partially paid no longer shows "+N pts est.").
- Verified on the live Elite mock views (empty-metafield persona).
- No Shopify Admin credentials in this environment → store data not audited; LOYALTY-NOTES.md explains the most likely
  cause (online orders never reach the loyalty system that writes the metafields), the exact redeem Flow, the admin
  checks, and a reply for the member.

**Regression after the round** (15 key pages × 360 / 390 / 768 / 1440 = 60 live loads): no horizontal overflow, every
stylesheet loads, no broken images, exactly one H1 per page, no clipped text, nothing under 11px except Google's
reCAPTCHA badge links. Remaining script errors are third-party: Amose Bundle (`map` on product pages) and an
intermittent `marketingAllowed` read from a consent/pixel script (not in the theme, not reproducible on reload).
