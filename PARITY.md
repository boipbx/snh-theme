# Old site vs SNH v2: parity (Round 14)

Old = https://www.sportsnutritionhub.lk (live theme "New store Menu launch", id 154272432382). New = theme 189832462590
(snh-theme/feat/theme-v2), preview. Both fetched on 31 Oct 2026, the same 23 URLs (HTML diff + feature probes:
`prototype/shots/r14/tmp/par/`), then behaviour checked in the browser (filters, cart, menus).

| area | feature | old | new | status |
|---|---|---|---|---|
| Header | Mega menu sub-collections | ~84 collection links (A–Z vitamins, creatine forms, protein types, caffeine / no caffeine, shakers, `/collections`) | 56 curated links | **Fixed**: 28 missing destinations added to the mega-menu columns (header-group.json), long columns flow into two |
| Header | Search, account, cart count, announcement | yes | yes (+ account panel, campaigns) | OK |
| Footer | Newsletter signup (customer form) | yes | yes (+ welcome popup) | OK |
| Footer | Policy / info links | yes | yes | OK |
| Home | Hero, bestsellers, brands, Shop the Look, reviews (Reputon), Instagram, TikTok | yes | yes | OK |
| Collections ×5 (whey, creatine, applied-nutrition, sis, vitamins-minerals) | Filter groups + options | vendor / availability / tag (e.g. whey 9 / 1 / 34) | identical groups and option counts on all 5 | OK |
| Collections | Price range filter (`filter.v.price`) | yes | yes | OK |
| Collections | Sort (8 options) | yes | yes, same 8 | OK |
| Collections | Product count per page, pagination (`page=2`) | 34 / 24 / 50 + page 2 | same | OK |
| Collections | Filter behaviour (multi-select, URL, back/forward, clear all, chips, no results) | — | see "Filters in depth" | see below |
| Products ×5 | Flavour/size selector, add to cart, Koko, Judge.me reviews, Amose bundles, Appstle (no selling plans exist) | yes | yes | OK |
| Products | Related / "Goes well with" | Shopify recommendations | recommendations + the SNH engine (Round 14) | Improved |
| Cart | Lines, qty, remove, checkout, Koko router | yes | yes (+ smart suggestions, bundle card, fixed footer) | OK |
| Search | Results, filters, sort | yes | yes (+ helpful no-results with recommendations) | OK |
| Account | Login, register, dashboard | Impact + app | SNH Elite member app (Overview, Rewards, Orders, Goals, Profile) | OK |
| Elite | /pages/snh-elite | yes | rebuilt (Round 12) | OK |
| Blog / article | List, article, tags | yes | yes (tag filter as links, Round 13) | OK |
| Contact | /pages/contact | **404 on both** | 404 | Admin task (LAUNCH.md #6): create the page with template page.contact |
| Franchise / wholesale / shop by brand | yes | yes (rebuilt Round 9) | OK |
| Policies | /policies/* | yes | yes (Shopify) | OK |
| Apps | Judge.me, Klaviyo, Koko, Amose, Appstle, Reputon | present | present (app embeds unchanged) | OK |

## Filters in depth

`prototype/tools/r14-filters.js` (browser, target theme asserted; product count compared with the old site for the same URL). The combinations are URL-driven: the matching inputs must be checked, chips shown and the sort kept. Note: Shopify's *preview* redirect keeps only the last of repeated keys (two brands); the test sets the preview cookie first. Live customers never pass through that redirect.

**10 / 10 combinations identical to the old site.**

| width | URL | result | note |
|---|---|---|---|
| 1440 | `whey-protein?filter.p.vendor=Applied+Nutrition` | PASS | new 15 / old 15 products · inputs 1/1 checked · chips 1 |
| 1440 | `whey-protein?filter.p.vendor=Applied+Nutrition&filter.p.vendor=MYPROTEIN` | PASS | new 17 / old 17 products · inputs 2/2 checked · chips 2 |
| 1440 | `whey-protein?filter.v.availability=1` | PASS | new 24 / old 24 products · inputs 1/1 checked · chips 1 |
| 1440 | `whey-protein?filter.v.price.gte=10000&filter.v.price.lte=20000` | PASS | new 11 / old 11 products · inputs 0/0 checked · chips 0 |
| 1440 | `whey-protein?filter.p.vendor=Applied+Nutrition&filter.v.availability=1&sort_by=price-ascending` | PASS | new 10 / old 10 products · inputs 2/2 checked · chips 2 · sort price-ascending |
| 1440 | `creatine?filter.p.vendor=RAW` | PASS | new 4 / old 4 products · inputs 1/1 checked · chips 1 |
| 1440 | `creatine?filter.v.price.lte=9000` | PASS | new 9 / old 9 products · inputs 0/0 checked · chips 0 |
| 1440 | `creatine?filter.p.vendor=Applied+Nutrition&filter.v.availability=1` | PASS | new 8 / old 8 products · inputs 2/2 checked · chips 2 |
| 1440 | `applied-nutrition?filter.v.availability=1` | PASS | new 50 / old 50 products · inputs 1/1 checked · chips 1 |
| 1440 | `applied-nutrition?filter.v.price.gte=5000&filter.v.price.lte=15000&sort_by=title-ascending` | PASS | new 50 / old 50 products · inputs 0/0 checked · chips 0 · sort title-ascending |

### Interactive checks (390 + 1440)

See `prototype/shots/r14/p1/filters-ui.md`.
