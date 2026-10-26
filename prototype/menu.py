"""Round 4 header: Holland & Barrett-level mega menu, predictive search overlay, mobile drill-down.
Every link is a live collection/product handle (data/live-collections.json) or a live /search query.
Bestsellers are the first products of each live collection (collection sort order, data/mega-bestsellers.json).
Imported lazily by build.header()."""
import json

from build import BRANDS, DATA, ICON, LOGO, R, brand_tile, e, img, promo_card, rs

C = "/collections/"
BEST = json.loads((DATA / "mega-bestsellers.json").read_text())
CHEV = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 9 6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
NEXT = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 6 6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
BACK = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m15 6-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
CLOSE = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
LOGOS = {n: (l, h) for n, l, h in BRANDS}
# live titles start with an all-caps vendor ("APPLIED NUTRITION Diet Whey"); show it in the brand's own casing
VENDOR_CASE = ["Applied Nutrition", "MuscleTech", "Dymatize", "Myprotein", "Revive", "Centrum", "Vitabiotics", "Healthspan Elite", "Surge", "Trace Minerals", "Redcon1"]


def tidy(t):
    for v in VENDOR_CASE:
        if t.upper().startswith(v.upper() + " ") and t[:len(v)].isupper():
            return v + t[len(v):]
    return t

# key, label, need (title, [(label, href)], view all), type (title, [...], view all), brands, promos, bestsellers collection
MENU = [
    ("supplements", "Supplements",
     ("Shop by goal", [("Build muscle & strength", C + "muscle-and-strength"), ("Lose fat", C + "fat-loss"), ("Energy & endurance", C + "energy-and-endurance"),
                       ("Gain weight", C + "mass-gainer"), ("Weight management", C + "weight-management"), ("Testosterone support", C + "testosterone-supplements"),
                       ("Informed Sport tested", C + "informed-sports")], C + "train-perform"),
     ("Shop by type", [("Whey protein", C + "whey-protein"), ("Isolate protein", C + "isolate-protein"), ("Clear protein", C + "clear-protein"),
                       ("Vegan protein", C + "vegan-protein"), ("Pre-workout", C + "pre-workout-1"), ("Creatine", C + "creatine-1"),
                       ("Aminos & BCAA", C + "amino-bcaa"), ("Fat burners", C + "fat-burners-1"), ("Protein bars & snacks", C + "protein-bars-snacks")], C + "supplements"),
     ["Applied Nutrition", "RAW Nutrition", "Myprotein", "Dymatize", "MuscleTech", "RYSE"],
     [("ryse_mobile_banner.jpg", "New launch", "The all-new RYSE range", C + "ryse"),
      ("the-sulek-stack_mobike.jpg", "Just landed", "The Sulek Stack by RAW", C + "the-sulek-stack")], "whey-protein"),
    ("vitamins", "Vitamins & Wellness",
     ("Shop by need", [("Daily wellness", C + "daily-wellness"), ("Gut health", C + "gut-health"), ("Women's health", C + "womens-health"),
                       ("Beauty, hair & skin", C + "beauty-hair-and-skin"), ("Joint & mobility", C + "joint-and-mobility"), ("Sleep", C + "sleep"),
                       ("Sexual health", C + "sexual-health"), ("Greens", C + "greens-1")], C + "health-wellness"),
     ("Shop by type", [("Multivitamins", C + "multivitamins"), ("Fish oil & omega", C + "fish-oil-omega"), ("Minerals", C + "minerals"),
                       ("Magnesium", C + "magnesium"), ("Letter vitamins", C + "letter-vitamins"), ("Collagen", C + "collagen"),
                       ("Probiotics", C + "probiotics"), ("Ashwagandha", C + "ashwagandha"), ("Herbs & natural", C + "herbs-natural-solution")], C + "vitamins-minerals"),
     ["Revive", "Vitabiotics", "Healthspan Elite", "Applied Nutrition", "Trace Minerals", "Centrum"],
     [("revive_mobile.jpg", "Brand in focus", "Revive daily wellness", C + "revive"),
      ("IMG_4447.jpg", "Daily essentials", "Vitamins & well-being", C + "vitamins-minerals")], "vitamins-minerals"),
    ("sports", "Sports & Performance",
     ("Shop by need", [("Energy", C + "energy-and-endurance"), ("Hydration", C + "hydration-recovery"), ("Recovery", "/search?q=recovery"),
                       ("BETA Fuel", "/search?q=beta+fuel"), ("Supplements", C + "informed-sports"), ("Packs & bundles", C + "endurance-bundles")], C + "train-perform"),
     ("Shop by type", [("Energy gels", C + "energy-gels"), ("Electrolytes", C + "hydration-recovery"), ("Carb powders & snacks", C + "carb-powders-snacks"),
                       ("Protein bars", C + "protein-snacks-bars"), ("BCAA & EAA", C + "bcaa-eaa"), ("Glutamine", C + "glutamine")], C + "sis"),
     ["Science in Sport", "Applied Nutrition", "Surge", "EHP Labs", "Revive", "Myprotein"],
     [("the-sulek-stack_mobike.jpg", "Just landed", "The Sulek Stack by RAW", C + "the-sulek-stack"),
      ("ryse_mobile_banner.jpg", "New launch", "The all-new RYSE range", C + "ryse")], "energy-and-endurance"),
    ("accessories", "Accessories",
     ("Shop by use", [("Lifting straps", C + "lifting-straps"), ("Wrist wraps", C + "wrist-wraps"), ("Shakers", C + "accessories")], C + "accessories-1"),
     ("Shop by type", [("Shaker bottles", C + "accessories"), ("Gym accessories", C + "accessories-1"), ("New arrivals", C + "new-arrivals")], C + "accessories-1"),
     ["SNH", "Applied Nutrition", "RAW Nutrition"],
     [("imgi_29_1f9f6567-6e04-4fd9-8b8d-2cf6428d6199.jpg", "Accessories", "SNH shakers", C + "accessories"),
      ("revive_mobile.jpg", "Brand in focus", "Revive daily wellness", C + "revive")], "accessories-1"),
]
# Offers: the live bundle collections (real compare-at prices, nothing invented) + standing store perks
OFFERS = [("All bundle offers", C + "bundle-offers", "https://cdn.shopify.com/s/files/1/0258/9625/5550/collections/impact_builder.jpg", "10 bundles"),
          ("Daily health & wellness bundles", C + "daily-health-wellness-bundles", "https://cdn.shopify.com/s/files/1/0258/9625/5550/collections/wellness.png", "12 bundles"),
          ("Training & strength bundles", C + "training-strength-bundles", "https://cdn.shopify.com/s/files/1/0258/9625/5550/files/rawtrainingstack.jpg", "5 bundles"),
          ("Endurance bundles", C + "endurance-bundles", "https://cdn.shopify.com/s/files/1/0258/9625/5550/files/racedaypack1.0.jpg", "3 bundles")]
PERKS = [("truck", "Free delivery over Rs 17,000"), ("card", "Pay in 3 with Koko"), ("badge", "3–10% back with SNH Elite")]
POPULAR = ["Whey protein", "Creatine", "Pre-workout", "Magnesium glycinate", "Electrolytes", "SiS gels", "Multivitamin", "Ashwagandha"]


def links(items, cls=""):
    return "".join(f'<li><a{cls} href="{h}">{e(t)}</a></li>' for t, h in items)


def logo_chip(name, where):
    logo, href = LOGOS[name]
    return brand_tile(name, logo, href, where, 120)


def minis(handle, where, n=3):
    out = []
    for p in BEST[handle][:n]:
        save = f'<s>{rs(p["c"])}</s>' if p["c"] > p["p"] else ""
        out.append(f'<li><a class="mini" href="/products/{p["h"]}"><img src="{e(img(p["i"], 160))}" alt="" width="64" height="64" loading="lazy">'
                   f'<span class="mini__t">{e(tidy(p["t"]))}</span><span class="mini__p">{rs(p["p"])} {save}</span></a></li>')
    R.IMAGES.setdefault("mega-thumbs", (BEST[handle][0]["i"], 800, 800, False, "Live product images (products.json)", "Mega-menu bestseller thumbnails, one per product"))
    R.use("mega-thumbs", where)
    return "".join(out)


def panel(key, label, need, typ, brands, promos, best):
    W = f"Mega menu · {label}"
    zone = lambda t, items, va: (f'<div class="mz"><p class="mz__h">{e(t)}</p><ul class="mz__list">{links(items)}</ul>'
                                 f'<a class="mz__all" href="{va}">View all</a></div>')
    logos = "".join(logo_chip(b, W) for b in brands)
    promo = "".join(promo_card(*p, W) for p in promos)
    return (f'<div class="mega__grid">{zone(*need)}{zone(*typ)}'
            f'<div class="mz"><p class="mz__h">Top brands</p><div class="mz__logos">{logos}</div><a class="mz__all" href="/pages/shop-by-brand">All brands</a></div>'
            f'<div class="mz mz--promo"><div class="mz__promos">{promo}</div><p class="mz__h">Bestsellers</p><ul class="minis">{minis(best, W)}</ul></div></div>')


def offer_card(t, h, src, n, where):
    if src:
        R.IMAGES.setdefault("offer-" + h.split("/")[-1], (src, 1200, 1200, True, "SNH live collection cover, or first bundle product image when the collection has none", "Collection cover"))
        R.use("offer-" + h.split("/")[-1], where)
        pic = f'<img src="{e(img(src, 600))}" alt="" width="600" height="600" loading="lazy">'
    else:
        pic = '<span class="offer__ph">Bundle</span>'
    return f'<a class="offer" href="{h}">{pic}<span class="offer__b"><span class="offer__t">{e(t)}</span><span class="offer__n">{e(n)}</span></span></a>'


def offers_panel():
    W = "Mega menu · Offers"
    cards = "".join(offer_card(*o, W) for o in OFFERS)
    perks = "".join(f'<li>{ICON[i]}<span>{e(t)}</span></li>' for i, t in PERKS)
    return (f'<div class="mega__grid mega__grid--offers"><div class="mz mz--wide"><p class="mz__h">Bundles &amp; deals</p><div class="offers">{cards}</div>'
            f'<ul class="perks">{perks}</ul></div>'
            f'<div class="mz"><p class="mz__h">Top bundle deals</p><ul class="minis minis--list">{minis("bundle-offers", W, 4)}</ul><a class="mz__all" href="{C}bundle-offers">View all offers</a></div></div>')


def brands_az(where, size=120, cls=""):
    rows = sorted(BRANDS, key=lambda b: b[0].lower())
    letters = sorted({n[0].upper() for n, _, _ in rows})
    bar = "".join(f'<a href="#az-{cls}{L}">{L}</a>' if L in letters else f'<span>{L}</span>' for L in "ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    groups = []
    for L in letters:
        tiles = "".join(f'<li data-name="{e(n.lower())}">{brand_tile(n, l, h, where, size)}<span>{e(n)}</span></li>' for n, l, h in rows if n[0].upper() == L)
        groups.append(f'<div class="az__g" id="az-{cls}{L}"><span class="az__L">{L}</span><ul class="az__tiles">{tiles}</ul></div>')
    return (f'<div class="az" data-az><div class="az__top"><label class="az__search">{ICON["search"]}<input type="search" placeholder="Find a brand" aria-label="Filter brands" data-az-filter></label>'
            f'<nav class="az__bar" aria-label="Brands A to Z">{bar}</nav></div><div class="az__groups">{"".join(groups)}</div>'
            f'<p class="az__none" hidden>No brand matches that name.</p></div>')


def search_overlay():
    chips = "".join(f'<li><button type="button" class="chip" data-q="{e(q)}">{e(q)}</button></li>' for q in POPULAR)
    trend = minis("whey-protein", "Search overlay · trending", 4)
    return f'''
<div class="srch" id="srch" role="dialog" aria-modal="true" aria-label="Search" hidden data-edit="Search overlay · predictive results (products, collections, articles) + popular search chips">
  <div class="srch__bar"><div class="wrap srch__barin">
    <label class="srch__field">{ICON["search"]}<input type="search" id="srch-q" placeholder="Search products, brands and guides" autocomplete="off" aria-label="Search" aria-controls="srch-results"></label>
    <button class="icon-btn srch__close" type="button" aria-label="Close search">{CLOSE}</button>
  </div></div>
  <div class="srch__body"><div class="wrap" id="srch-results" aria-live="polite">
    <div class="srch__empty"><p class="mz__h">Popular searches</p><ul class="chips">{chips}</ul>
      <p class="mz__h">Trending now</p><ul class="minis minis--row">{trend}</ul></div>
    <div class="srch__res" hidden>
      <div class="srch__col"><p class="mz__h">Products</p><ul class="srch__list" data-r="p"></ul></div>
      <div class="srch__col"><p class="mz__h">Collections</p><ul class="srch__list srch__list--plain" data-r="c"></ul><p class="mz__h">Articles</p><ul class="srch__list" data-r="a"></ul></div>
      <a class="btn btn--ink srch__all" href="/search"><span>View all results</span></a>
    </div>
  </div></div>
</div>
<div class="srch-scrim" hidden></div>'''


def mobile(where="Mobile menu"):
    top, levels = [], []
    for key, label, need, typ, brands, promos, best in MENU:
        top.append(f'<li><button class="mm__go" type="button" data-level="mm-{key}">{e(label)}{NEXT}</button></li>')
        logos = "".join(logo_chip(b, where) for b in brands)
        levels.append(f'''<div class="mm__level" id="mm-{key}" aria-label="{e(label)}" inert>
  <div class="mm__head"><button class="mm__back" type="button">{BACK}<span>Back</span></button><p>{e(label)}</p></div>
  <div class="mm__scroll">
    <div class="mm__tabs" role="tablist"><button role="tab" aria-selected="true" data-tab="0">{e(need[0])}</button><button role="tab" aria-selected="false" data-tab="1">{e(typ[0])}</button></div>
    <ul class="mm__list" data-pane="0">{links(need[1])}<li><a class="mm__all" href="{need[2]}">View all</a></li></ul>
    <ul class="mm__list" data-pane="1" hidden>{links(typ[1])}<li><a class="mm__all" href="{typ[2]}">View all</a></li></ul>
    <p class="mz__h">Top brands</p><div class="mz__logos mz__logos--m">{logos}</div>
    <p class="mz__h">Bestsellers</p><ul class="minis minis--list">{minis(best, where)}</ul>
    <div class="mmenu__promos">{"".join(promo_card(*p, where) for p in promos)}</div>
  </div></div>''')
    top.append('<li><button class="mm__go" type="button" data-level="mm-brands">Brands' + NEXT + '</button></li>')
    levels.append(f'''<div class="mm__level" id="mm-brands" aria-label="Brands" inert>
  <div class="mm__head"><button class="mm__back" type="button">{BACK}<span>Back</span></button><p>Brands A–Z</p></div>
  <div class="mm__scroll">{brands_az(where, 96, "m")}</div></div>''')
    top.append('<li><button class="mm__go" type="button" data-level="mm-offers">Offers' + NEXT + '</button></li>')
    perks = "".join(f'<li>{ICON[i]}<span>{e(t)}</span></li>' for i, t in PERKS)
    levels.append(f'''<div class="mm__level" id="mm-offers" aria-label="Offers" inert>
  <div class="mm__head"><button class="mm__back" type="button">{BACK}<span>Back</span></button><p>Offers</p></div>
  <div class="mm__scroll"><div class="offers offers--m">{"".join(offer_card(*o, where) for o in OFFERS)}</div><ul class="perks">{perks}</ul>
    <p class="mz__h">Top bundle deals</p><ul class="minis minis--list">{minis("bundle-offers", where, 4)}</ul></div></div>''')
    top.append('<li><a class="mm__go" href="index.html#elite">SNH Elite</a></li><li><a class="mm__go" href="index.html#stores">Stores</a></li>')
    mpromos = "".join(promo_card(*p, where) for p in (MENU[0][5][0], ("cricket.jpg", "SNH Elite", "Earn 3–10% back", "/account/register")))
    return f'''
<div class="mmenu" id="mmenu" role="dialog" aria-modal="true" aria-label="Menu" hidden data-edit="Mobile menu · drill-down levels from the same menu data, need/type tabs, promos at the bottom">
  <div class="mmenu__top"><img src="{img(LOGO, 300)}" alt="SNH" width="82" height="24"><button class="icon-btn mmenu__close" type="button" aria-label="Close menu">{CLOSE}</button></div>
  <button class="mmenu__search" type="button" data-open-search>{ICON["search"]}<span>Search products, brands and guides</span></button>
  <div class="mmenu__levels">
    <div class="mm__level is-on" id="mm-root" aria-label="Menu"><div class="mm__scroll"><ul class="mm__root">{"".join(top)}</ul><div class="mmenu__promos">{mpromos}</div></div></div>
    {"".join(levels)}
  </div>
</div>'''


def header(page):
    overlay = page == "home"
    items, panels = [], []
    for key, label, *rest in MENU:
        items.append((key, label))
        panels.append((key, label, panel(key, label, *rest)))
    items[4:4] = [("brands", "Brands"), ("offers", "Offers")]
    panels += [("brands", "Brands", f'<div class="mega__brands"><div class="mega__head"><p class="mz__h">{len(BRANDS)} brands, all authentic</p><a class="mz__all" href="/pages/shop-by-brand">Shop by brand page</a></div>{brands_az("Mega menu · Brands")}</div>'),
               ("offers", "Offers", offers_panel())]
    short = lambda l: e(l).replace(" &amp; ", '<span class="nav__x"> &amp; ', 1) + "</span>" if " & " in l else e(l)   # "Vitamins & Wellness" -> "Vitamins" below 1200px
    nav = "".join(f'<li><button class="nav__btn" type="button" aria-expanded="false" aria-controls="mega-{k}" data-mega="mega-{k}" aria-label="{e(l)}">{short(l)}{CHEV}</button></li>' for k, l in items)
    mega = "".join(f'<div class="mega" id="mega-{k}" role="region" aria-label="{e(l)}" hidden data-edit="Mega menu · {e(l)} · need, type, brands, promo cards + bestsellers"><div class="wrap mega__in">{b}</div></div>' for k, l, b in panels)
    return f'''
<header class="hdr{" hdr--overlay is-overlay" if overlay else ""}" data-chrome data-edit="Header · logo, menu (Navigation), mega menu promos, icons">
  <div class="wrap hdr__in">
    <button class="icon-btn hdr__menu" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mmenu">{ICON["menu"]}</button>
    <a class="hdr__logo" href="index.html" aria-label="Sports Nutrition Hub home"><img src="{img(LOGO, 300)}" alt="SNH" width="82" height="24"></a>
    <nav class="nav" aria-label="Main"><ul class="nav__list">{nav}<li><a class="nav__link" href="index.html#elite">SNH Elite</a></li></ul></nav>
    <div class="hdr__icons">
      <button class="icon-btn" type="button" aria-label="Search" aria-controls="srch" data-open-search>{ICON["search"]}</button>
      <a class="icon-btn hide-s" href="#" aria-label="Account">{ICON["user"]}</a>
      <a class="icon-btn" href="#" aria-label="Basket">{ICON["bag"]}<span class="icon-btn__count">0</span></a>
    </div>
  </div>
  {mega}
</header>
<div class="mega-scrim" hidden></div>{search_overlay()}{mobile()}'''
