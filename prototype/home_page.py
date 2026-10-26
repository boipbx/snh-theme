"""Homepage body (round 3): the live homepage's structure and content, restyled.
Section order follows CONTENT-INVENTORY.md §1. Imported by build.py."""
import json

from build import (BRANDS, DATA, FOOTER, ICON, LIVE, PREFIX, R, STARS, TICKER, ANNOUNCE_HTML,
                   card, e, head, header, hero, img, load, nice, photo, rs)

W = "Homepage"
STORES = [("Dehiwala", "snh-store-dehiwala", "133A Kawdana Road, Dehiwala", "+94 77 977 3359", "https://maps.app.goo.gl/yv7NfU8qodJD58uV9"),
          ("Wattala", "snh-store-wattala", "880 Negombo Road, Wattala", "+94 76 846 3359", "https://maps.app.goo.gl/HE2zcgj85Dxr9cux7"),
          ("Nugegoda", "snh-store-nugegoda", "555 High Level Road, Nugegoda", "+94 76 486 3359", "https://maps.app.goo.gl/EpBtzAunKUbUkb3q9?g_st=ic")]
BEST = ["applied-nutrition-creatine-monohydrate", "sis-go-hydro-tablets", "applied-nutrition-critical-whey-2kg", "sis-go-isotonic-energy-gel",
        "raw-cbum-itholate-protein", "raw-thavage-pre-workout", "ryse-loaded-protein-2lb", "ryse-loaded-pre-workout"]


def theme_img(url_or_fn, where, **kw):
    fn = url_or_fn.split("/files/")[-1].split("/")[-1].split("?")[0]
    return R.theme(fn, where, **kw)


def brand_rail():
    logos = "".join(f'<a class="logo" href="{h}" title="{e(n)}"><img src="{e(img(theme_img(l, W + " · brand rail", baked=True, note="logo"), 320))}" '
                    f'alt="{e(n)}" width="160" height="160" loading="lazy"></a>' for n, l, h in BRANDS if l)
    return f'''
  <section class="logos" aria-label="Authorised distributors of leading brands" data-edit="Brand rail · logos + links (live: brand-logo-slider-custom)">
    <div class="wrap logos__in"><p class="eyebrow">Authorised distributors of leading brands</p>
      <div class="logos__track"><div class="logos__run">{logos}</div><div class="logos__run" aria-hidden="true">{logos}</div></div></div>
  </section>'''


def shop_your_way():
    tiles = "".join(
        f'<a class="tile" href="{d["link"]}"><img src="{e(img(theme_img(d["image"], W + " · shop your way", note="collection deck"), 700))}" alt="" width="1080" height="1350" loading="lazy">'
        f'<span class="tile__body"><span class="tile__title">{e(nice(d["title"]))}</span><span class="arrow">{ICON["arrow"]}</span></span></a>' for d in LIVE["deck"])
    return f'''
  <section class="section" aria-labelledby="ways-title" data-edit="Shop your way · collection tiles (live: Our Collection deck)">
    <div class="wrap">
      <div class="head"><div class="head__text"><p class="eyebrow">Our collection</p><h2 class="h1" id="ways-title">Shop <span class="serif">your</span> way</h2></div><a class="link" href="/collections/everything">Shop everything</a></div>
      <div class="tiles">{tiles}</div>
    </div>
  </section>'''


def why_choose_us():
    wy = LIVE["whyus"]
    icons = ["shield", "card", "chat", "badge"]
    feats = "".join(f'<li class="benefit">{ICON[icons[i]]}<p class="benefit__title">{e(nice(t))}</p><p class="benefit__text">{e(x)}</p></li>' for i, (t, x) in enumerate(wy["features"]))
    feats += f'<li class="benefit">{ICON["truck"]}<p class="benefit__title">Same-day Colombo</p><p class="benefit__text">Colombo orders same day, island-wide in 2–3 working days.</p></li>'
    feats += f'<li class="benefit">{ICON["bolt"]}<p class="benefit__title">Earn points</p><p class="benefit__text">3–10% back on every order as an SNH Elite member.</p></li>'
    return f'''
  <section class="section section--dark" aria-labelledby="ben-title" data-edit="Why choose us · 2 stats + 6 benefits (live: whyus)">
    <div class="wrap">
      <div class="why-head"><div class="head__text"><p class="eyebrow">Why choose us</p><h2 class="h1" id="ben-title">The SNH <span class="serif">standard</span></h2><p class="lead">{e(wy["sub"])}</p></div>
        <div class="stats-inline"><div><strong>50,000+</strong><span>orders delivered</span></div><div><strong>4.9<span class="star">★</span></strong><span>from 2,000+ reviews</span></div></div></div>
      <ul class="benefits">{feats}</ul>
    </div>
  </section>'''


def brand_of_the_month():
    bm = LIVE["botm"]
    bm_img = theme_img(bm["image"], W + " · brand of the month (hotspots)", baked=True, note="Brand of the month campaign")
    dots, items, sheets = [], [], []
    for i, sp in enumerate(bm["spots"]):
        p = load(sp["handle"])
        name = PREFIX.sub("", p["title"])
        price = float(p["variants"][0]["price"])
        key, _ = R.PACKSHOT[sp["handle"]]
        src = R.use(key, W + " · brand of the month product")
        dots.append(f'<button class="hs__dot" type="button" style="left:{sp["x"]}%;top:{sp["y"]}%" data-spot="{i}" aria-label="{i + 1}: {e(name)}" aria-expanded="false"><span>{i + 1}</span></button>')
        items.append(f'''<li class="hs__item" data-spot="{i}"><span class="hs__n">{i + 1}</span>
          <a class="hs__img" href="product.html"><img src="{e(img(src, 240))}" alt="" width="120" height="120" loading="lazy"></a>
          <span class="hs__info"><span class="eyebrow">RYSE</span><a class="hs__name" href="product.html">{e(name)}</a><span class="hs__price">{rs(price)}</span></span>
          <button class="btn btn--ink btn--sm hs__add" type="button" data-atc="{e(name)}"><span>Add</span></button></li>''')
        sheets.append(f'''<div class="hs__pop" data-pop="{i}" hidden role="dialog" aria-label="{e(name)}">
          <button class="hs__close" type="button" aria-label="Close">×</button>
          <img src="{e(img(src, 320))}" alt="" width="160" height="160" loading="lazy">
          <div class="hs__popbody"><span class="eyebrow">RYSE</span><a class="hs__name" href="product.html">{e(name)}</a><span class="hs__price">{rs(price)}</span>
          <div class="hs__popcta"><button class="btn btn--accent btn--sm" type="button" data-atc="{e(name)}"><span>Add to basket</span></button><a class="link" href="product.html">View</a></div></div></div>''')
    return f'''
  <section class="section section--cream hs" aria-labelledby="bm-title" data-edit="Brand of the month · campaign image, hotspots (x/y %), products (live: shop-the-look)">
    <div class="wrap">
      <div class="head"><div class="head__text"><p class="eyebrow">Brand of the month</p><h2 class="h1" id="bm-title">Shop the <span class="serif">look</span>: RYSE</h2></div><a class="btn btn--ink" href="/collections/ryse"><span>Shop all RYSE</span></a></div>
      <div class="hs__grid">
        <div class="hs__media"><img src="{e(img(bm_img, 1400))}" alt="RYSE brand of the month: Loaded Protein, Pump, Pre and Pre MAX" width="2000" height="2000" loading="lazy">{"".join(dots)}{"".join(sheets)}</div>
        <ol class="hs__list">{"".join(items)}</ol>
      </div>
    </div>
  </section>'''


def shop_by_goal():
    def tiles(group):
        return "".join(f'<a class="gtile" href="{g["link"]}"><img src="{e(img(theme_img(g["image"], W + " · shop by goal"), 600))}" alt="" width="1086" height="1448" loading="lazy">'
                       f'<span>{e(g["title"])}</span></a>' for g in LIVE["goals"] if g["group"] == group)
    return f'''
  <section class="section" aria-labelledby="goal-title" id="goals" data-edit="Shop by goal · 2 groups × goal tiles (live: multi-column)">
    <div class="wrap">
      <div class="head"><div class="head__text"><p class="eyebrow">Shop by goal</p><h2 class="h1" id="goal-title">What are you <span class="serif">training</span> for?</h2></div>
        <div class="tabs" role="tablist"><button class="tab" role="tab" aria-selected="true" data-goal="train">Train &amp; perform</button><button class="tab" role="tab" aria-selected="false" data-goal="wellness">Health &amp; wellness</button></div></div>
      <div class="gtiles" data-goal-panel="train">{tiles("train")}</div><div class="gtiles" data-goal-panel="wellness" hidden>{tiles("wellness")}</div>
    </div>
  </section>'''


def bestsellers():
    return f'''
  <section class="section section--cream" aria-labelledby="best-title" id="shop" data-edit="Product carousel · collection or hand-picked products, tabs (live: What's new at SNH)">
    <div class="wrap">
      <div class="head"><div class="head__text"><p class="eyebrow">What's new at SNH</p><h2 class="h1" id="best-title">Shop our <span class="serif">bestsellers</span></h2></div><a class="btn btn--ink" href="/collections/everything"><span>Shop all</span></a></div>
      <div class="tabs" role="tablist" aria-controls="best-grid">
        <button class="tab" role="tab" aria-selected="true" data-filter="all">All</button><button class="tab" role="tab" aria-selected="false" data-filter="protein">Protein</button>
        <button class="tab" role="tab" aria-selected="false" data-filter="endurance">Endurance</button><button class="tab" role="tab" aria-selected="false" data-filter="strength">Strength</button>
        <button class="tab" role="tab" aria-selected="false" data-filter="health">Health</button>
      </div>
      <div class="grid grid--rail" id="best-grid">{"".join(card(h) for h in BEST)}</div>
    </div>
  </section>'''


SISM = "https://www.scienceinsport.com/media/wysiwyg/"
SIS_TILES = [  # (label, file, SNH link) — official SiS 540x880 category art
    ("Energy", "Phoenix_-_Homepage_Product_Category_-_540_x_880_-_ENERGY.jpg", "/collections/energy-gels?filter.p.vendor=SCIENCE+IN+SPORT"),
    ("Hydration", "Phoenix_-_Homepage_Product_Category_-_540_x_880_-_HYDRATION.jpg", "/products/sis-go-hydro-tablets"),
    ("Recovery", "Phoenix_-_Homepage_Product_Category_-_540_x_880_-_RECOVERY.jpg", "/products/sis-rego-rapid-recovery-powder-1-5kg"),
    ("BETA Fuel", "Phoenix_-_Homepage_Product_Category_-_540_x_880_-_BETA.jpg", "/products/sis-beta-fuel-gel"),
    ("Vitamins", "Phoenix_-_Homepage_Product_Category_-_540_x_880_-_VMS.jpg", "/collections/vitamins-minerals?filter.p.vendor=SCIENCE+IN+SPORT"),
]


def ext(key, url, w, h, source, where, note="", baked=False):
    if key not in R.IMAGES:
        R.IMAGES[key] = (url, w, h, baked, source, note)
    return R.use(key, where)


def sis_band():
    WS = W + " · SiS slider"
    logo = ext("sis-logo-svg", "https://www.scienceinsport.com/static/version1792401833/frontend/SIS/theme-frontend-sis-pnx/en_GB/images/logo.svg", 4096, 2556, "scienceinsport.com header logo (SVG, white)", WS, "Vector, white fill", True)
    poster_d = ext("sis-poster-wide", SISM + "BF-Electrolyte-VideoFrame1.jpg", 1920, 1080, "scienceinsport.com homepage video poster frame", WS + " (video poster, desktop)")
    poster_m = ext("sis-campaign-energy", SISM + "Phoenix_-_Homepage_Product_Category_-_540_x_880_-_ENERGY.jpg", 540, 880, "scienceinsport.com category tile", WS + " (video poster, mobile)", "LOW-RES (540px wide)")
    video = ext("sis-video", SISM + "Q2_Running_Homepage_Video.mp4", 1920, 1080, "scienceinsport.com homepage hero video (16 MB, H.264)", WS + " (video)", "Video; plays in Chrome/Safari, poster in browsers without H.264")
    mc = ext("sis-mccolgan", "https://www.scienceinsport.com/media/.renditions/wysiwyg/Phoenix_-_Homepage_-_Trusted_by_Athletes_-_Desktop_-_McCOLGAN.jpg", 353, 460, "scienceinsport.com 'Trusted by athletes' (desktop rendition; original is the same size)", WS + " (trusted by athletes)", "LOW-RES (353x460): shown at native size, never upscaled")
    tiles = ""
    for i, (label, fn, href) in enumerate(SIS_TILES):
        src = ext("sis-tile-" + label.lower().replace(" ", "-"), SISM + fn, 540, 880, "scienceinsport.com category tile", WS + " (shop by need tile)", "540px; shown at ≤ native size")
        tiles += f'<a class="stile{" stile--x" if i == 4 else ""}" href="{href}"><img src="{e(src)}" alt="" width="540" height="880" loading="lazy"><span class="stile__l">{e(label)}<span class="arrow">{ICON["arrow"]}</span></span></a>'
    slides = [
        f'''<div class="hero__slide hero__slide--overlay hero__slide--video is-on" data-i="0" role="group" aria-roledescription="slide" aria-label="1 of 3: What fuels you?">
        <video class="sisv" muted loop playsinline preload="none" poster="{e(img(poster_d, 1920))}" data-poster-m="{e(img(poster_m, 1080))}" aria-hidden="true"><source src="{e(video)}" type="video/mp4"></video>
        <div class="hero__shade"></div>
        <div class="hero__copy wrap"><p class="eyebrow">Science in Sport · as seen on the start line</p><h2 class="display">What <span class="serif">fuels</span> you?</h2>
          <p class="hero__sub">Gels, hydration and recovery from the brand behind the world's best endurance athletes.</p>
          <div class="hero__cta"><a class="btn btn--accent" href="/collections/sis"><span>Shop Science in Sport</span></a></div></div></div>''',
        f'''<div class="hero__slide hero__slide--tiles" data-i="1" role="group" aria-roledescription="slide" aria-label="2 of 3: Shop by need" aria-hidden="true" inert>
        <div class="stiles__wrap wrap"><div class="stiles__head"><p class="eyebrow">Shop SiS by need</p><h2 class="h1">Fuel every <span class="serif">session</span>.</h2></div><div class="stiles">{tiles}</div></div></div>''',
        f'''<div class="hero__slide hero__slide--trust" data-i="2" role="group" aria-roledescription="slide" aria-label="3 of 3: Trusted by athletes" aria-hidden="true" inert>
        <img class="trust__bg" src="{e(poster_d)}" alt="" width="1920" height="1080" loading="lazy">
        <div class="trust__wrap wrap"><figure class="trust__img"><img src="{e(mc)}" alt="Eilish McColgan, Science in Sport athlete" width="353" height="460" loading="lazy"></figure>
          <div class="trust__copy"><p class="eyebrow">Trusted by athletes</p><h2 class="h1">Tested. <span class="serif">Trusted</span>. Informed Sport.</h2>
          <p class="hero__sub">Science in Sport fuel is batch-tested under Informed Sport, so tested athletes like Eilish McColgan can use it with confidence.</p>
          <div class="hero__cta"><a class="btn btn--accent" href="/collections/informed-sports"><span>Shop Informed Sport</span></a></div></div>
          <ul class="trust__proof"><li><strong>Informed Sport</strong><span>Batch-tested for banned substances</span></li><li><strong>Official distributor</strong><span>Sourced direct by SNH in Sri Lanka</span></li><li><strong>Stored right</strong><span>Climate-controlled stock in our three stores</span></li></ul></div></div>''',
    ]
    segs = "".join(f'<button class="seg{" is-on" if i == 0 else ""}" type="button" aria-label="Go to slide {i + 1}"{" aria-current=\"true\"" if i == 0 else ""}><span></span></button>' for i in range(len(slides)))
    arrows = "".join(f'<button class="hero__arrow" type="button" data-dir="{d}" aria-label="{t} slide">{ICON["arrow"]}</button>' for d, t in ((-1, "Previous"), (1, "Next")))
    cards = "".join(card(h) for h in ["sis-go-hydro-tablets", "sis-beta-fuel-gel", "sis-go-isotonic-energy-gel", "sis-beta-fuel-energy-nootropics-gel"])
    return f'''
  <section class="sisx" aria-label="Science in Sport, official distributor" id="sis" data-edit="SiS slider · full screen · slides: video / tile row / image + quote; logo, trust line, product strip">
    <div class="hero hero--sis" data-carousel aria-roledescription="carousel" aria-label="Science in Sport">
      <div class="sisx__badge wrap"><img src="{e(logo)}" alt="Science in Sport" width="96" height="60"><span>Official distributor<span class="hide-s"> in Sri Lanka</span><span class="sep">·</span>100% Informed Sport<span class="hide-s"> approved</span></span></div>
      <div class="hero__stage">{"".join(slides)}</div>
      <div class="hero__controls wrap"><div class="hero__progress" role="group" aria-label="Choose slide">{segs}</div><div class="hero__arrows">{arrows}</div></div>
    </div>
    <div class="sisx__strip"><div class="wrap"><div class="sisx__head"><p class="eyebrow">Bestselling SiS</p><a class="link" href="/collections/sis">Shop all Science in Sport</a></div><div class="grid sis__cards">{cards}</div></div></div>
  </section>'''


def bundles():
    tiles = "".join(f'<a class="promo" href="{x["link"]}"><div class="promo__media"><img src="{e(img(theme_img(x["image"], W + " · bundle & save"), 900))}" alt="" width="1672" height="941" loading="lazy"></div><div class="promo__shade"></div>'
                    f'<div class="promo__body"><span class="badge badge--accent promo__badge">{e(x["badge"])}</span><p class="promo__title">{e(x["title"])}</p></div></a>' for x in LIVE["bundles"])
    return f'''
  <section class="section" aria-labelledby="bundle-title" data-edit="Bundle & Save · offer tiles (live: custom-liquid)">
    <div class="wrap">
      <div class="head"><div class="head__text"><p class="eyebrow">Offers</p><h2 class="h1" id="bundle-title">Bundle &amp; <span class="serif">save</span></h2><p class="lead">Curated stacks built for better value, faster shopping and stronger daily routines.</p></div><a class="link" href="/collections/bundle-offers">All bundles</a></div>
      <div class="promos promos--wide">{tiles}</div>
    </div>
  </section>'''


def elite():
    WE = W + " · SNH Elite band"
    C = R.SNH
    girl = ext("elite-girl", C + "girl.png", 1131, 1688, "SNH theme · register page hero (live)", WE, "Transparent cutout; suspected AI-generated (live today)")
    gift = ext("elite-gift", C + "1_57b712a6-c53e-4f6b-bcc0-6fea0e096b6e.png", 1080, 1080, "SNH theme · register page accent (live)", WE, "3D gift render, transparent")
    coins = ext("elite-coins", C + "2_37969279-4a78-43c8-8fdf-5256e55c6030.png", 1080, 1080, "SNH theme · register page accent (live)", WE, "3D coins render, transparent")
    logo = R.use("snh-logo", WE + " (membership card)")
    tiers = [("bronze", "3%", "Bronze", "Free to join", "500 welcome points"), ("silver", "7%", "Silver", "From Rs 198k a year", "Birthday reward + vouchers"),
             ("gold", "10%", "Gold", "From Rs 300k a year", "Free shipping + 15% birthday")]
    tier_html = "".join(f'<li class="tcard tcard--{k}"><span class="tcard__name">{n}</span><strong>{p}</strong><span class="tcard__th">{th}</span><span class="tcard__perk">{pk}</span></li>' for k, p, n, th, pk in tiers)
    return f'''
  <section class="elite section" aria-labelledby="elite-title" id="elite" data-edit="SNH Elite · animated background layer, glass card (copy, chips, buttons), tier cards, visual">
    <div id="elite-bg" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="wrap elite__grid">
      <div class="glass elite__card">
       <div class="elite__copy">
        <p class="eyebrow">SNH Elite · Sri Lanka's 1st premium VIP club</p>
        <h2 class="h2" id="elite-title">Fuel your goals. Earn your <span class="serif">rewards</span>.</h2>
        <p class="lead">Create your free account, claim 500 welcome points, and earn 3% to 10% back in points on every order.</p>
        <ul class="chips-row"><li>500 welcome points</li><li>Up to 10% back</li><li>Redeem from 2,500 points</li></ul>
        <div class="band__cta"><a class="btn btn--ink" href="/account/register"><span>Join SNH Elite, it's free</span></a><a class="btn btn--line btn--on-dark" href="/account/login"><span>Sign in</span></a></div>
       </div>
       <div class="elite__tiers">
        <div class="ladder" aria-label="Tier ladder by annual spend">
          <div class="ladder__bar"><span class="ladder__fill"></span><i style="left:0%"></i><i style="left:66%"></i><i style="left:100%"></i></div>
          <div class="ladder__labels"><span>Rs 0</span><span style="left:66%">Rs 198k</span><span>Rs 300k</span></div>
        </div>
        <ul class="tcards">{tier_html}</ul>
       </div>
      </div>
      <div class="elite__visual" aria-hidden="true">
        <img class="elite__girl" src="{e(img(girl, 900))}" alt="" width="1131" height="1688" loading="lazy">
        <div class="mcard glass"><div class="mcard__top"><img src="{e(img(logo, 300))}" alt="" width="80" height="23"><span>ELITE</span></div>
          <div class="mcard__mid"><span class="mcard__label">Points balance</span><strong>2,860</strong></div>
          <div class="mcard__bot"><span>Gold member</span><span>10% back</span></div></div>
        <img class="elite__gift" src="{e(img(gift, 360))}" alt="" width="180" height="180" loading="lazy">
        <img class="elite__coins" src="{e(img(coins, 360))}" alt="" width="180" height="180" loading="lazy">
      </div>
    </div>
  </section>'''


def reviews():
    quotes = "".join(f'<figure class="quote">{STARS}<blockquote class="quote__text">“Short quote from a real Google review goes here. Pull it from the review widget.”</blockquote>'
                     f'<figcaption class="quote__who">Customer name<span>Google review · placeholder</span></figcaption></figure>' for _ in range(4))
    return f'''
  <section class="section section--cream" aria-labelledby="rev-title" data-edit="Reviews · rating line + Google Reviews app block">
    <div class="wrap">
      <div class="head"><div class="head__text"><div class="rating">{STARS}<span class="meta">4.9 from 2,000+ Google reviews</span></div><h2 class="h1" id="rev-title">Rated 4.9 by <span class="serif">real</span> customers</h2></div><a class="link" href="#">Read all reviews</a></div>
      <div class="quotes">{quotes}</div>
    </div>
  </section>'''


def guides():
    posts = [p for p in json.loads((DATA / "live-blog.json").read_text()) if p["image"]][:3]
    html_ = "".join(f'<a class="post" href="{p["url"]}"><div class="post__img"><img src="{e(img(theme_img(p["image"], W + " · buying guides"), 800))}" alt="" width="800" height="600" loading="lazy"></div>'
                    f'<p class="eyebrow">Buying guide</p><h3 class="h2 post__title">{e(p["title"])}</h3></a>' for p in posts)
    return f'''
  <section class="section" aria-labelledby="blog-title" data-edit="Buying guides · latest 3 blog posts">
    <div class="wrap">
      <div class="head"><div class="head__text"><p class="eyebrow">Read our blog</p><h2 class="h1" id="blog-title">Buying <span class="serif">guides</span></h2></div><a class="link" href="/blogs/news">All articles</a></div>
      <div class="posts">{html_}</div>
    </div>
  </section>'''


def faq():
    qs = "".join(f'<details><summary>{e(q)}</summary><div class="acc__body prose"><p>{e(a)}</p></div></details>' for q, a in LIVE["faq"])
    return f'''
  <section class="section section--dark" aria-labelledby="faq-title" data-edit="FAQ · questions + answers, support hours (live: faq)">
    <div class="wrap split">
      <div class="head__text"><p class="eyebrow">Support · every day, 10am–7pm</p><h2 class="h1" id="faq-title">Questions, <span class="serif">answered</span></h2><p class="lead">Call or WhatsApp +94 76 486 3359 for anything not covered here.</p></div>
      <div class="acc acc--dark">{qs}</div>
    </div>
  </section>'''


def stores():
    cards = "".join(f'<article class="store"><div class="store__img">{photo(f, "Visit us · " + n, "SNH " + n + " store", 900)}</div><div class="store__body"><h3 class="h2">{n}</h3>'
                    f'<p class="meta">{a}<br>{t} · Open every day</p><a class="link" href="{u}" target="_blank" rel="noopener">Get directions</a></div></article>' for n, f, a, t, u in STORES)
    return f'''
  <section class="section" aria-labelledby="stores-title" id="stores" data-edit="Stores · photo, name, address, phone, map link">
    <div class="wrap">
      <div class="head"><div class="head__text"><p class="eyebrow">Visit us</p><h2 class="h1" id="stores-title">Three stores, open every <span class="serif">day</span></h2></div><a class="link" href="/pages/location">All locations</a></div>
      <div class="stores">{cards}</div>
    </div>
  </section>'''


def newsletter():
    return '''
  <section class="section section--cream" aria-labelledby="news-title" data-edit="Newsletter · headline, text, form">
    <div class="wrap news">
      <div class="head__text"><h2 class="h1" id="news-title">First to <span class="serif">know</span></h2><p class="lead">New drops, restocks and member offers. No spam, only discount codes and product news.</p></div>
      <form class="news__form" onsubmit="event.preventDefault()"><label for="em" hidden>Email</label><input class="input" id="em" type="email" placeholder="Email address" autocomplete="email"><button class="btn btn--accent" type="submit"><span>Subscribe</span></button></form>
    </div>
  </section>'''


def index():
    body = "".join([hero(), brand_rail(), shop_your_way(), why_choose_us(), brand_of_the_month(), shop_by_goal(), bestsellers(),
                    sis_band(), bundles(), elite(), reviews(), guides(), faq(), stores(), newsletter()])
    return (head("Sports Nutrition Hub — prototype", "Homepage prototype") + TICKER + ANNOUNCE_HTML + header("home")
            + f'\n<main>{body}\n</main>\n<button class="edit-toggle" type="button" aria-pressed="false">Show editable areas</button>' + FOOTER + "\n</body>\n</html>\n")
