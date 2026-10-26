"""Build the SNH prototype pages from real product JSON (prototype/data/*.json).

    python3 prototype/build.py   ->  prototype/index.html, prototype/product.html

Every price, image and product fact comes from the store data. The STATS table below is
hand-checked against each product's own description; nothing is invented. Lifestyle imagery
that does not exist yet is rendered as a labelled placeholder.
"""
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent
DATA = ROOT / "data"
sys.path.insert(0, str(ROOT / "images"))
import registry as R  # noqa: E402  (every image used lives in images/registry.py)

CDN = R.SNH
LOGO = R.IMAGES["snh-logo"][0]

# stats quoted from each product description; group drives the bestseller tabs
STATS = {
    "applied-nutrition-creatine-monohydrate": (["50 servings per tub", "Unflavoured, mixes into anything"], 50, "serving", "strength", "Bestseller"),
    "sis-go-isotonic-energy-gel": (["22g carbohydrate per gel", "8 flavours"], 1, "gel", "endurance", "Bestseller"),
    "sis-go-hydro-tablets": (["30mmol/L sodium per serving", "9 kcal per serving"], 20, "tablet", "endurance", "Bestseller"),
    "sis-beta-fuel-gel": (["40g carbohydrate per gel", "1:0.8 dual-source carbs"], 1, "gel", "endurance", None),
    "applied-nutrition-critical-whey-2kg": (["24g protein per serving", "120 kcal per serving"], 61, "serving", "protein", "Informed Sport"),
    "raw-cbum-itholate-protein": (["25g whey isolate per serving", "9 flavours"], 25, "serving", "protein", None),
    "raw-thavage-pre-workout": (["40 servings per tub", "6 flavours"], 40, "serving", "strength", None),
    "revive-magnesium-glycinate": (["200mg magnesium per serving", "60 servings"], 60, "serving", "health", None),
    "applied-nutrition-multi-vitamin-complex": (["30+ vitamins and minerals", "90 tablets"], 90, "tablet", "health", None),
    "sis-beta-fuel-energy-nootropics-gel": (["Beta Fuel dual-source carbs", "Plus a nootropic blend"], 1, "gel", "endurance", "New"),
    "ryse-loaded-protein-2lb": (["2lb tub", "9 flavours"], 1, "tub", "protein", None),
    "ryse-loaded-pump-25-servings": (["25 servings per tub", "2 flavours"], 25, "serving", "strength", None),
    "ryse-loaded-pre-workout": (["Loaded pre-workout", "8 flavours"], 1, "tub", "strength", None),
    "ryse-loaded-pre-max": (["Loaded Pre MAX", "3 flavours"], 1, "tub", "strength", None),
}
BRAND = {"Applied Nutrition": "Applied Nutrition", "RAW": "RAW Nutrition", "REVIVE": "Revive", "SCIENCE IN SPORT": "Science in Sport", "RYSE": "RYSE"}
PREFIX = re.compile(r"^(APPLIED NUTRITION|RAW NUTRITION|REVIVE|SCIENCE IN SPORT|RYSE)\s+", re.I)

e = lambda s: html.escape(str(s), quote=True)


def load(handle):
    return json.loads((DATA / f"{handle}.json").read_text())["product"]


def rs(amount):
    return "Rs " + f"{round(amount):,}"


def img(src, width):
    return f"{src}{'&' if '?' in src else '?'}width={width}"


def shot(src, alt, sizes="(max-width: 899px) 50vw, 25vw", eager=False):
    return (f'<div class="shot"><img src="{e(img(src, 600))}" srcset="{e(img(src, 400))} 400w, {e(img(src, 800))} 800w" '
            f'sizes="{sizes}" width="600" height="600" alt="{e(alt)}" loading="{"eager" if eager else "lazy"}" decoding="async"></div>')


def pack(handle, alt, where, sizes="(max-width: 899px) 50vw, 25vw"):
    """Official brand packshot shown as-is (contain) on its own backdrop colour; placeholder if none exists."""
    if handle not in R.PACKSHOT:
        return f'<div class="shot shot--pack">{ph("Packshot needed", "No official brand image available. Clean render on plain background.")}</div>'
    key, bg = R.PACKSHOT[handle]
    src = R.use(key, where)
    style = f' style="--tile:{bg}"' if bg else ""
    return (f'<div class="shot shot--pack"{style}><img src="{e(img(src, 600))}" srcset="{e(img(src, 400))} 400w, {e(img(src, 800))} 800w" '
            f'sizes="{sizes}" width="600" height="600" alt="{e(alt)}" loading="lazy" decoding="async"></div>')


def photo(key, where, alt, width=1200, eager=False, cls=""):
    url, w, h = R.IMAGES[key][:3]
    src = R.use(key, where)
    return (f'<img class="{cls}" src="{e(img(src, width))}" srcset="{e(img(src, width // 2))} {width // 2}w, {e(img(src, width))} {width}w" '
            f'sizes="(max-width: 899px) 100vw, 50vw" width="{w}" height="{h}" alt="{e(alt)}" loading="{"eager" if eager else "lazy"}"'
            f'{" fetchpriority=\"high\"" if eager else ""} decoding="async">')


def ph(title, text, cls=""):
    return f'<div class="ph {cls}" role="img" aria-label="{e(title + ": " + text)}"><p class="ph__label"><b>{e(title)}</b>{e(text)}</p></div>'


def card(handle):
    p = load(handle)
    stats, servings, unit, group, badge = STATS[handle]
    price = float(p["variants"][0]["price"])
    name = PREFIX.sub("", p["title"])
    brand = BRAND.get(p["vendor"], p["vendor"].title())
    per = f'{rs(price / servings)} per {unit}' if servings > 1 else f"per {unit}"
    badge_html = f'<span class="badge{" badge--accent" if badge == "Bestseller" else ""}">{e(badge)}</span>' if badge else ""
    return f'''
      <article class="card" data-group="{group}">
        <div class="card__media"><a href="product.html" aria-label="{e(name)}">{badge_html}{pack(handle, name, "Product card · " + name)}</a>
        <button class="quick" type="button" data-name="{e(name)}" aria-label="Quick add {e(name)}">{ICON["plus"]}</button></div>
        <div class="card__body">
          <p class="card__brand eyebrow">{e(brand)}</p>
          <a href="product.html" class="card__name">{e(name)}</a>
          <ul class="card__stats">{"".join(f"<li>{e(s)}</li>" for s in stats)}</ul>
          <p class="card__price"><span class="card__now">{rs(price)}</span><span class="card__per">{e(per) if servings > 1 else ""}</span></p>
          <p class="card__koko">or 3 × <b>{rs(price / 3)}</b> with Koko</p>
        </div>
      </article>'''


ICON = {
    "plus": '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    "arrow": '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    "search": '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.8"/><path d="m16 16 4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    "user": '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8.5" r="3.8" stroke="currentColor" stroke-width="1.8"/><path d="M4.5 20c1.4-3.6 4.2-5.4 7.5-5.4s6.1 1.8 7.5 5.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    "bag": '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5.5 8.5h13l-1 11.5h-11l-1-11.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 10V7a3 3 0 0 1 6 0v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    "menu": '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    "shield": '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3 5 6v5c0 4.4 3 8.3 7 9.5 4-1.2 7-5.1 7-9.5V6l-7-3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="m9 12 2 2 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    "badge": '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="9" r="5.5" stroke="currentColor" stroke-width="1.8"/><path d="m8.5 13.5-1.5 7 5-2.5 5 2.5-1.5-7" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    "truck": '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 6.5h11v10H3zM14 9.5h4l3 3v4h-7" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="7" cy="17.5" r="1.8" stroke="currentColor" stroke-width="1.8"/><circle cx="17" cy="17.5" r="1.8" stroke="currentColor" stroke-width="1.8"/></svg>',
    "chat": '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5h16v11H9l-5 4V5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 10h8M8 13h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    "card": '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M3 10h18M7 15h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    "star": '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/></svg>',
    "bolt": '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m13 2-9 12h8l-1 8 9-12h-8l1-8Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
}
STARS = '<span class="stars" aria-hidden="true">' + ICON["star"] * 5 + "</span>"


def head(title, desc):
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://cdn.shopify.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Instrument+Serif:ital@1&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/proto.css">
<script src="js/proto.js" defer></script>
</head>
<body>'''


TICKER_ITEMS = ["Free delivery over Rs 17,000", "Same-day Colombo delivery", "SNH Elite: earn 3–10% back", "Pay in 3 with Koko"]
TICKER = ('<div class="ticker" data-chrome role="region" aria-label="Store announcements"><div class="ticker__track">'
          + "".join(f'<ul class="ticker__list"{" aria-hidden=\"true\"" if i else ""}>' + "".join(f'<li class="ticker__item">{e(t)}</li>' for t in TICKER_ITEMS * 2) + "</ul>" for i in range(2))
          + "</div></div>")

MEGA = json.loads((DATA / "live-mega-menu.json").read_text())
FIX = {"MUSCLE & STRENGHT": "Muscle & strength", "Amino's & BCAA": "Aminos & BCAA", "WOMEN’s HEALTH": "Women's health", "SEA MOSS": "Sea moss"}
KEEP = {"bcaa": "BCAA", "snh": "SNH", "sis": "SiS"}


def nice(t):
    """Live menu titles are all-caps; the design system uses sentence case."""
    if t in FIX:
        return FIX[t]
    words = t.strip().lower().split()
    out = " ".join(KEEP.get(w, w) for w in words)
    return out[:1].upper() + out[1:]


# brand -> (logo file in the live theme or None, link). Order = product count on the live store.
BRANDS = [
    ("Applied Nutrition", "Untitled_design.zip_-_1.png", "/collections/applied-nutrition"),
    ("SNH", None, "/collections/everything?filter.p.vendor=Sports+Nutrition+Hub+%28SNH%29"),
    ("Science in Sport", "Untitled_design.zip_-_5_62bbd74a-3d19-426e-b1a6-f626a977e647.png", "/collections/sis"),
    ("RAW Nutrition", "IMG_0045.jpg", "/collections/raw"),
    ("Myprotein", "IMG_0049.png", "/collections/myprotein"),
    ("Revive", "2_90d87d3d-eff4-48a4-9fd4-ffd859764d6d.png", "/collections/revive"),
    ("Trace Minerals", None, "/collections/everything?filter.p.vendor=Trace+Minerals"),
    ("MuscleTech", "Untitled_design.zip_-_6_0f398417-0fda-4e10-bd17-258678a4e6a9.png", "/collections/muscletech"),
    ("RYSE", "IMG_0046.jpg", "/collections/ryse"),
    ("EHP Labs", "1_d8033eaa-aa49-49b4-a96f-d37b9316f7e1.png", "/collections/ehplabs"),
    ("Surge", "final_surge_logo-01.jpg", "/collections/surge"),
    ("Healthspan Elite", "5_bfc4fe07-8297-47ee-a5f3-2c1a53c86387.png", "/collections/healthspan-elite"),
    ("Vitabiotics", "3_e9de3e34-4221-415b-b928-c97558667165.png", "/collections/everything?filter.p.vendor=VITABIOTICS"),
    ("Ronnie Coleman", None, "/collections/everything?filter.p.vendor=Ronnie+Coleman"),
    ("Dymatize", "Untitled_240_x_240_px_fb5a6e2b-3128-4999-969b-033dfa142b0b.png", "/collections/dymatize"),
    ("BSN", None, "/collections/everything?filter.p.vendor=BSN"),
    ("Centrum", None, "/collections/everything?filter.p.vendor=CENTRUM"),
    ("Redcon1", "Untitled_design.zip_-_4.png", "/collections/redcon1"),
]

def brand_tile(name, logo, href, where, size=240):
    if logo:
        src = R.theme(logo, where, baked=True, note="logo")
        inner = f'<img src="{e(img(src, size * 2))}" alt="{e(name)}" width="{size}" height="{size}" loading="lazy">'
    elif name == "SNH":
        inner = f'<img class="brand__snh" src="{e(img(R.use("snh-logo", where), 400))}" alt="SNH" width="200" height="58" loading="lazy">'
    else:
        inner = f'<span class="brand__word">{e(name)}</span>'
    return f'<a class="brand" href="{href}" title="{e(name)}">{inner}</a>'


def promo_card(fn, eyebrow, label, href, where):
    src = R.theme(fn, where)
    return (f'<a class="mpromo" href="{href}"><img src="{e(img(src, 700))}" alt="" width="700" height="875" loading="lazy">'
            f'<span class="mpromo__body"><span class="eyebrow">{e(eyebrow)}</span><span class="mpromo__label">{e(label)}</span></span></a>')


def header(page):
    from menu import header as build_header   # round 4 mega menu, search overlay, mobile drill-down
    return build_header(page)


ANNOUNCE = [("New", "The all-new RYSE range has landed", "/collections/ryse"),
            ("Just in", "The Sulek Stack from RAW Nutrition", "/collections/the-sulek-stack"),
            ("New", "SiS Beta Fuel + Nootropics gel", "/products/sis-beta-fuel-energy-nootropics-gel")]
ANNOUNCE_HTML = ('<div class="announce" data-chrome data-edit="Announcement slot · rotating new-product messages · tag, text, link" aria-live="polite"><div class="wrap announce__in">'
                 + "".join(f'<a class="announce__item{" is-on" if i == 0 else ""}" href="{h}"><b>{e(t)}</b>{e(x)}<span aria-hidden="true">→</span></a>' for i, (t, x, h) in enumerate(ANNOUNCE))
                 + "</div></div>")


FOOTER = ('''
<footer class="ftr" data-edit="Footer · menus (live footer menus), stores, payments, logo">
  <div class="wrap">
    <div class="ftr__cols">
      <div class="ftr__col ftr__stores"><h3>Visit or call</h3>
        <p><strong>Dehiwala</strong>133A Kawdana Road · <a href="tel:+94779773359">+94 77 977 3359</a></p>
        <p><strong>Wattala</strong>880 Negombo Road · <a href="tel:+94768463359">+94 76 846 3359</a></p>
        <p><strong>Nugegoda</strong>555 High Level Road · <a href="tel:+94764863359">+94 76 486 3359</a></p>
        <p class="ftr__hours">Open every day · Support 10am–7pm</p></div>
      <div class="ftr__col"><h3>Supplements</h3><a href="/collections/everything">Shop all supplements</a><a href="/collections/train-perform">Train &amp; perform</a><a href="/collections/whey-protein">Whey proteins</a><a href="/collections/pre-workout-1">Pre-workout</a><a href="/collections/creatine-1">Creatine</a><a href="/collections/weight-management">Weight management</a></div>
      <div class="ftr__col"><h3>Vitamins &amp; wellness</h3><a href="/collections/health-wellness">Health &amp; wellness</a><a href="/collections/fish-oil-omega">Fish oil &amp; omega</a><a href="/collections/multivitamins">Multivitamins</a><a href="/collections/minerals">Minerals</a><a href="/collections/letter-vitamins">Letter vitamins</a><a href="/collections/herbs-natural-solution">Herbs &amp; natural</a></div>
      <div class="ftr__col"><h3>Info</h3><a href="/pages/about-us">About us</a><a href="/blogs/news">Read our blog</a><a href="/pages/careers">Work with us</a><a href="/pages/location">Locations</a><a href="/pages/franchise-partner">Franchise partner</a><a href="/pages/wholesale-1">Wholesale</a></div>
      <div class="ftr__col"><h3>Support &amp; policies</h3><a href="/pages/delivery-and-shipping">Contact us</a><a href="/pages/shipping-policy">Shipping policy</a><a href="/pages/return-policy">Return policy</a><a href="/pages/privacy-policy">Privacy policy</a><a href="/pages/terms-of-service">Terms of service</a></div>
    </div>
    <div class="ftr__pay"><span>Pay by card, bank transfer, cash on delivery or <b>Koko · pay in 3</b></span><span class="ftr__social"><a href="#">Instagram</a><a href="#">TikTok</a><a href="#">Facebook</a><a href="#">WhatsApp</a></span></div>
    <div class="ftr__legal"><span>© 2026 Sports Nutrition Hub (Pvt) Ltd.</span><span>Prototype — not the live store</span></div>
  </div>
  <div class="ftr__mark" aria-hidden="true"><span class="ftr__wipe"><img src="''' + img(LOGO, 2400) + '''" alt="" width="1283" height="374"></span><i class="ftr__dot"></i></div>
</footer>
<div class="toast" role="status" aria-live="polite"></div>''')


LIVE = json.loads((DATA / "live-home.json").read_text())

# Full-screen hero: our SNH athlete slide first, then the live slideshow in its live order.
# "overlay" = clean photo, our type over it; "banner" = artwork with baked-in text, shown full bleed with no overlay.
HERO_SLIDES = [
    {"kind": "overlay", "label": "SNH", "eyebrow": "Sports Nutrition Hub · Sri Lanka", "head": 'Serious fuel for <span class="serif">serious</span> training.',
     "sub": "Authentic supplements from the brands athletes trust, delivered same-day across Colombo.", "cta": "Shop bestsellers", "href": "#shop", "cta2": "Find your goal", "href2": "#goals",
     "desk": ("reg", "snh-athlete-running"), "mob": ("reg", "snh-athlete-running"), "pos": "62% 30%", "mpos": "50% 20%"},
    {"kind": "banner", "label": "Fueling athletes", "alt": "SNH: Fueling athletes, elevating wellness", "href": "/collections/everything",
     "desk": ("theme", "2fd50e25-5d19-4f08-9e36-f8992b6e917c.jpg"), "mob": ("theme", "d15b04ae-74cb-46b8-ab36-d6e467b4ddce.jpg"), "pos": "50% 50%", "mpos": "50% 50%"},
    {"kind": "overlay", "label": "RYSE", "eyebrow": "New arrivals · RYSE", "head": 'Discover the all-new <span class="serif">RYSE</span> range.',
     "sub": "Loaded Protein, Pump and Pre: just landed at SNH.", "cta": "Shop RYSE", "href": "/collections/ryse",
     "desk": ("theme", "ryse-desk-banner.jpg"), "mob": ("theme", "ryse_mobile_banner.jpg"), "pos": "30% 50%", "mpos": "50% 0%"},
    {"kind": "overlay", "label": "Revive", "eyebrow": "Revive MD", "head": 'The gold standard for <span class="serif">wellness</span>.',
     "sub": "Daily wellness essentials from Revive, now at SNH.", "cta": "Shop Revive", "href": "/collections/revive",
     "desk": ("theme", "revive.jpg"), "mob": ("theme", "revive_mobile.jpg"), "pos": "25% 50%", "mpos": "50% 0%"},
    {"kind": "overlay", "label": "RAW × Sam Sulek", "eyebrow": "New drop · RAW × Sam Sulek", "head": 'The Sulek Stack has <span class="serif">landed</span>.',
     "sub": "Sam Sulek's own stack from RAW Nutrition, now in Sri Lanka.", "cta": "Shop the Sulek Stack", "href": "/collections/the-sulek-stack",
     "desk": ("theme", "the-sulek-stack.jpg"), "mob": ("theme", "the-sulek-stack_mobike.jpg"), "pos": "45% 40%", "mpos": "50% 0%"},
    {"kind": "overlay", "label": "Nootropics", "eyebrow": "Science in Sport · Beta Fuel + Nootropics", "head": 'The next level of athlete <span class="serif">nutrition</span>.',
     "sub": "Science in Sport Beta Fuel energy gel with added nootropics.", "cta": "Shop nootropics", "href": "/products/sis-beta-fuel-energy-nootropics-gel",
     "desk": ("theme", "nootropics-web-cover.jpg"), "mob": ("theme", "nootropics-web-cover_mobile.jpg"), "pos": "70% 40%", "mpos": "50% 30%"},
]


def hero_src(ref, where, baked):
    kind, key = ref
    if kind == "reg":
        url, w, h = R.IMAGES[key][:3]
        R.use(key, where)
        return url, w, h
    url = R.theme(key, where, baked=baked)
    return url, R.IMAGES["theme:" + key][1], R.IMAGES["theme:" + key][2]


def hero():
    slides, segs = [], []
    n = len(HERO_SLIDES)
    for i, s in enumerate(HERO_SLIDES):
        on = i == 0
        banner = s["kind"] == "banner"
        where = f"Hero · slide {i + 1} ({s['label']})"
        d_url, dw, dh = hero_src(s["desk"], where + " desktop", banner)
        m_url, mw, mh = hero_src(s["mob"], where + " mobile", banner)
        pic = (f'<picture class="hero__pic"><source media="(max-width: 767px)" srcset="{e(img(m_url, 800))} 800w, {e(img(m_url, 1200))} 1200w" sizes="100vw" width="{mw}" height="{mh}">'
               f'<img src="{e(img(d_url, 1800))}" srcset="{e(img(d_url, 1200))} 1200w, {e(img(d_url, 1800))} 1800w, {e(img(d_url, 2800))} 2800w" sizes="100vw" width="{dw}" height="{dh}" '
               f'alt="{e(s.get("alt", s["label"]))}" style="--pos:{s["pos"]};--mpos:{s["mpos"]}" loading="{"eager" if on else "lazy"}"{" fetchpriority=\"high\"" if on else ""} decoding="async"></picture>')
        attrs = (f'class="hero__slide hero__slide--{s["kind"]}{" is-on" if on else ""}" data-i="{i}" role="group" aria-roledescription="slide" '
                 f'aria-label="{i + 1} of {n}: {e(s["label"])}"{"" if on else " aria-hidden=\"true\" inert"}')
        if banner:
            slides.append(f'<a {attrs} href="{s["href"]}">{pic}</a>')
        else:
            tag = "h1" if on else "h2"
            slides.append(f'''<div {attrs}>{pic}<div class="hero__shade"></div>
        <div class="hero__copy wrap">
          <p class="eyebrow">{e(s["eyebrow"])}</p>
          <{tag} class="display">{s["head"]}</{tag}>
          <p class="hero__sub">{e(s["sub"])}</p>
          <div class="hero__cta"><a class="btn btn--accent" href="{s["href"]}"><span>{e(s["cta"])}</span></a>{f'<a class="btn btn--line btn--on-dark" href="{s["href2"]}"><span>{e(s["cta2"])}</span></a>' if s.get("cta2") else ""}</div>
        </div>
      </div>''')
        segs.append(f'<button class="seg{" is-on" if on else ""}" type="button" aria-label="Go to slide {i + 1}: {e(s["label"])}"{" aria-current=\"true\"" if on else ""}><span></span></button>')
    arrows = "".join(f'<button class="hero__arrow" type="button" data-dir="{d}" aria-label="{t} slide">{ICON["arrow"]}</button>' for d, t in ((-1, "Previous"), (1, "Next")))
    return f'''  <section class="hero" data-carousel aria-roledescription="carousel" aria-label="Featured" data-edit="Hero · full screen · up to 8 slides · per slide: type (overlay/banner), desktop + mobile image, focal point, eyebrow, headline, serif word, sub line, button">
    <div class="hero__stage">{"".join(slides)}</div>
    <div class="hero__controls wrap">
      <div class="hero__progress" role="group" aria-label="Choose slide">{"".join(segs)}</div>
      <div class="hero__arrows">{arrows}</div>
    </div>
  </section>
  <nav class="goalbar" aria-label="Shop by goal" data-edit="Goal strip · fixed under the hero · label + links">
    <div class="wrap goalbar__in"><span class="eyebrow">Shop by goal</span>
      <div class="goals"><a class="goal" href="/collections/muscle-and-strength">Build muscle</a><a class="goal" href="/collections/fat-loss">Lose fat</a><a class="goal" href="/collections/energy-and-endurance">Endurance</a><a class="goal" href="/collections/hydration-recovery">Hydration</a><a class="goal" href="/collections/health-wellness">Daily health</a><a class="goal" href="/collections/recovery">Recovery</a></div>
    </div>
  </nav>'''


def product():
    handle = "applied-nutrition-critical-whey-2kg"
    p = load(handle)
    price = float(p["variants"][0]["price"])
    stats, servings, unit, _, _ = STATS[handle]
    name = PREFIX.sub("", p["title"])
    body = html.unescape(re.sub(r"<[^>]+>", "\n", p["body_html"]))
    paras = [re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", x))).strip() for x in re.findall(r"<p[^>]*>(.*?)</p>", p["body_html"], re.S)]
    paras = [x for x in paras if len(x) > 140]
    certified = re.search(r"Informed-Sport certified \(([^)]+)\)", re.sub(r"\s+", " ", body))
    cert_names = [c.strip().lower() for c in re.split(r",|\band\b", certified.group(1))] if certified else []

    label_img = p["images"][1]["src"]                       # the nutrition panel image
    gallery = [im for i, im in enumerate(p["images"]) if i != 1]  # every image, so each flavour swatch has its slide
    id_to_slide = {im["id"]: i for i, im in enumerate(gallery)}
    flavours = []
    for v in p["variants"]:
        flav = v["option2"]
        slide = id_to_slide.get(v.get("image_id"))
        src = next((im["src"] for im in p["images"] if im["id"] == v.get("image_id")), gallery[0]["src"])
        tag = any(flav.lower().startswith(c.split("(")[0].strip()[:10]) for c in cert_names) or "informed-sport" in flav.lower()
        flavours.append((flav.replace(" - Informed-Sport Tested", ""), slide, src, tag))

    slides = "".join(f'<div>{shot(im["src"], f"{name} image {i + 1}", "(max-width: 899px) 100vw, 55vw", eager=i == 0)}</div>' for i, im in enumerate(gallery))
    thumbs = "".join(f'<button type="button" aria-label="Image {i + 1}" aria-current="{str(i == 0).lower()}">{shot(im["src"], "", "80px")}</button>' for i, im in enumerate(gallery))
    dots = "".join(f'<span class="{"is-on" if i == 0 else ""}"></span>' for i in range(len(gallery)))
    sw = "".join(f'<button type="button" class="swatch" role="radio" aria-checked="{str(i == 0).lower()}" data-value="{e(f)}"' + (f' data-slide="{s}"' if s is not None else "")
                 + f'>{shot(src, "", "72px")}<span>{e(f)}</span>' + ('<span class="swatch__tag">Informed Sport</span>' if t else "") + "</button>" for i, (f, s, src, t) in enumerate(flavours))
    how_to = ("Add one scoop (around 30g) to 250–300ml of cold water or milk in a shaker, seal, and shake vigorously for 10–15 seconds. "
              "Use cold water for a leaner profile and faster mixing, or milk for additional calories and creaminess. Take any time of day to support your daily protein target — "
              "particularly within 30–60 minutes post-workout for recovery, between meals to manage appetite and satiety, or as a high-protein snack on the go.")
    brand_txt = ("Applied Nutrition is a UK-based sports nutrition and wellness brand recognised globally for its scientifically-formulated supplements across protein, pre-workout, fat-loss, "
                 "vitamins, and beauty-and-wellness categories. All Applied Nutrition products are manufactured in the UK to GMP standards with rigorous quality control.")
    benefits = ["24g protein per serving, just 120 calories", "Four-source grass-fed dairy protein blend", "Informed Sport tested flavours available"]

    return head(f"{name} — prototype", "Product page prototype") + TICKER + ANNOUNCE_HTML + header('product') + f'''
<main>
  <div class="wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><span>/</span><a href="#">Whey protein</a><span>/</span><span>{e(name)}</span></nav></div>
  <div class="wrap pdp">
    <div class="gallery" aria-label="Product images">
      <div class="gallery__main"><span class="badge">Informed Sport flavours</span><div class="gallery__track">{slides}</div></div>
      <div class="gallery__thumbs">{thumbs}</div>
      <div class="gallery__dots" aria-hidden="true">{dots}</div>
    </div>

    <div class="buy">
      <div><p class="eyebrow">Applied Nutrition</p><h1 class="h1 buy__title">{e(name)}</h1></div>
      <p class="buy__rating">{STARS}<span>Reviews load from Judge.me (no data in prototype)</span></p>
      <p class="buy__price"><span class="buy__now">{rs(price)}</span><span class="buy__per">{rs(price / servings)} per serving · {servings} servings</span></p>
      <fieldset class="opt"><legend>Flavour: <span data-selected="flav">{e(flavours[0][0])}</span></legend><div class="swatches" role="radiogroup" id="flav" aria-label="Flavour">{sw}</div></fieldset>
      <fieldset class="opt"><legend>Size</legend><div class="chips" role="radiogroup" id="size" aria-label="Size"><button type="button" class="chip" role="radio" aria-checked="true" data-value="2kg">2kg · {servings} servings</button></div></fieldset>
      <div class="buy__row">
        <div class="qty" aria-label="Quantity"><button type="button" data-step="-1" aria-label="Decrease">−</button><output>1</output><button type="button" data-step="1" aria-label="Increase">+</button></div>
        <button class="btn btn--accent btn--block" type="button" data-atc="{e(name)}"><span>Add to basket · {rs(price)}</span></button>
      </div>
      <p class="koko"><span class="koko__mark">Koko</span>or 3 interest-free payments of <b>{rs(price / 3)}</b></p>
      <ul class="trust"><li>{ICON["badge"]}Official distributor</li><li>{ICON["shield"]}100% authentic</li><li>{ICON["truck"]}Same-day Colombo</li></ul>
    </div>
  </div>

  <section class="stats" aria-label="Key stats">
    <div class="stat"><strong>24g</strong><span>protein per serving</span></div>
    <div class="stat"><strong>120</strong><span>kcal per serving</span></div>
    <div class="stat"><strong>{servings}</strong><span>servings per 2kg tub</span></div>
    <div class="stat"><strong>4</strong><span>protein sources, grass-fed dairy</span></div>
  </section>

  <section class="section" aria-labelledby="does-title">
    <div class="wrap split">
      <div class="head__text"><p class="eyebrow">What it does</p><h2 class="h1" id="does-title">Protein that <span class="serif">works</span> harder</h2></div>
      <div class="prose"><p>{e(paras[0] if paras else "")}</p><ul class="ticks">{"".join(f"<li>{e(b)}</li>" for b in benefits)}</ul></div>
    </div>
  </section>

  <section class="section section--cream" aria-label="Details">
    <div class="wrap split">
      <div class="head__text"><p class="eyebrow">The details</p><h2 class="h1">Use it <span class="serif">right</span></h2></div>
      <div class="acc">
        <details open><summary>How to use</summary><div class="acc__body prose"><p>{e(how_to)}</p></div></details>
        <details><summary>Ingredients & nutrition</summary><div class="acc__body prose"><div class="gallery__label"><img src="{e(img(label_img, 900))}" alt="Critical Whey nutrition and ingredients panel" loading="lazy" width="900" height="900"></div><p class="meta">Label image from the product listing. Typing the ingredients as text is still needed for accessibility and search.</p></div></details>
        <details><summary>About Applied Nutrition</summary><div class="acc__body prose"><p>{e(brand_txt)}</p></div></details>
      </div>
    </div>
  </section>

  <section class="section" aria-labelledby="pr-title">
    <div class="wrap">
      <div class="head"><div class="head__text"><div class="rating">{STARS}<span class="meta">Judge.me reviews</span></div><h2 class="h1" id="pr-title">What <span class="serif">lifters</span> say</h2></div><a class="btn btn--ink" href="#"><span>Write a review</span></a></div>
      <div class="quotes reveal">{"".join('<figure class="quote">' + STARS + '<blockquote class="quote__text">“Real Judge.me review for this product goes here.”</blockquote><figcaption class="quote__who">Reviewer name<span>Verified buyer · placeholder</span></figcaption></figure>' for _ in range(4))}</div>
    </div>
  </section>

  <section class="section section--cream" aria-labelledby="pair-title">
    <div class="wrap">
      <div class="head"><h2 class="h1" id="pair-title">Goes well <span class="serif">with</span></h2></div>
      <div class="grid grid--rail reveal">{"".join(card(h) for h in ["applied-nutrition-creatine-monohydrate", "raw-thavage-pre-workout", "revive-magnesium-glycinate", "sis-go-hydro-tablets"])}</div>
    </div>
  </section>
</main>
<div class="sticky-atc" aria-hidden="false"><div class="sticky-atc__info"><strong>{e(name)}</strong><span>{rs(price)} · {rs(price / servings)}/serving</span></div><button class="btn btn--accent" type="button" data-atc="{e(name)}"><span>Add to basket</span></button></div>''' + FOOTER + "\n</body>\n</html>\n"


if __name__ == "__main__":
    sys.modules["build"] = sys.modules[__name__]   # home_page imports helpers from this module
    from home_page import index
    from product_page import product as product_page
    (ROOT / "index.html").write_text(index())
    (ROOT / "product.html").write_text(product_page())
    import sources_md
    used, audited = sources_md.write()
    print("built", ROOT / "index.html", ROOT / "product.html", f"| IMAGE-SOURCES.md: {used} used, {audited} audited")
