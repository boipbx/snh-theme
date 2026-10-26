"""Product page (round 3), rebuilt from scratch.

Keeps the live SNH mobile PDP structure (sections/main-product.liquid on main) and puts it on a strict
12-column grid on desktop: gallery 7 columns, buy box 5, both sticky and top-aligned.
Data: data/applied-nutrition-critical-whey-2kg.json (+ .js.json for live per-variant availability)."""
import json
import re

from build import (DATA, FOOTER, ICON, PREFIX, R, STARS, TICKER, ANNOUNCE_HTML, card, e, head, header, img, load, rs)

AN = "https://cdn.shopify.com/s/files/1/0454/0871/4919/files/"
HANDLE = "applied-nutrition-critical-whey-2kg"
SERVINGS = 61
# Applied Nutrition's official per-flavour renders (appliednutrition.uk). Keyed by the start of the SNH flavour name.
FLAVOUR_IMG = {
    "Chocolate Milkshake": "Critical_Whey_Professional_2kg_Chocolate_Milkshake.webp",
    "Strawberry Milkshake": "Critical_Whey_Professional_2kg_-_Strawberry_Milkshake.webp",
    "Vanilla Ice Cream": "Critical_Whey_Professional_2kg_-_Vanilla_Ice_Cream.webp",
    "White Choc Pistachio": "Critical_Whey_Professional_2kg_-_White_Choc_Pistachio.webp",
    "White Choco Hazelnut": "Critical_Whey_Professional_2kg_-_White_Choco_Hazelnut.webp",
    "Choco Hazelnut (Bueno)": "Critical_Whey_Professional_2kg_-_Choco_Hazelnut.webp",
    "Vanilla Matcha": "Critical_Whey_Professional_2kg_-_Vanilla_Matcha.webp",
    "Salted Caramel": "Critical_Whey_Professional_2kg_-_Salted_Caramel.webp",
    "Frappuccino": "Critical_Whey_Professional_2kg_-_Frappe.webp",
    "Cookies": "Critical_Whey_Professional_2kg_-_Cookies_N_Cream.webp",
    "Caramel Latte": "Critical_Whey_Professional_2kg_-_Caramel_Latte.webp",
    "Banana Milkshake": "Critical_Whey_Professional_2kg_-_Banana_Milkshake.webp",
    "Chiquita Banana": "Critical_Whey_Professional_2kg_-_Chiquita_Banana_Strawberry_Smoothie_abfd9f7c-d979-48ab-a7a7-37a2b066a9aa.webp",
}
INFORMED = ("Chocolate Milkshake", "Strawberry Milkshake", "Vanilla Ice Cream")  # named as Informed-Sport certified in the description
MODALS = {  # copy from the live SNH_MODALS in main-product.liquid
    "delivery": ("Delivery", "Fast, tracked, island-wide", ["Free delivery on every order over Rs 17,000.", "Orders placed before 2 PM are dispatched the same day.", "Delivered in 1 to 3 working days anywhere in Sri Lanka, fully tracked."]),
    "payment": ("Payments", "Pay the way you want", ["Visa and Mastercard, direct bank transfer, or cash on delivery.", "Split any order into 3 interest-free instalments with Koko.", "Every checkout is SSL-encrypted and fully secure."]),
    "authentic": ("Authenticity", "100% authentic, always", ["Every product is sourced directly from certified brand distributors.", "Batch codes are verifiable with the manufacturer.", "Informed-Sport certified ranges available for tested athletes."]),
}
HOW_TO = ("Add one scoop (around 30g) to 250–300ml of cold water or milk in a shaker, seal, and shake vigorously for 10–15 seconds. "
          "Use cold water for a leaner profile and faster mixing, or milk for additional calories and creaminess. Take any time of day to support "
          "your daily protein target, particularly within 30–60 minutes post-workout, between meals, or as a high-protein snack on the go.")
BENEFITS = ["24g protein per serving, just 120 calories", "Four-source grass-fed dairy protein blend", "Informed Sport tested flavours available"]
W = "Product page"
SEARCH = {x["h"]: x for x in json.loads((DATA / "search-index.json").read_text())}
# Real bundle products on the live store that contain this product (bundle-offers collection). "Separately" is the sum of
# the component products' live prices; nothing is invented. Components: (search-index handle, label shown in the bundle).
BUNDLES = [("whey-training-stack", "Athlete Essential Stack", [("applied-nutrition-critical-whey-25-servings", "Critical Whey Protein · 25 servings"),
                                                                ("applied-nutrition-creatine-monohydrate", "Creatine Monohydrate · 50 servings"),
                                                                ("snh-2-0-shaker-bottle-750ml-teal-blue", "SNH 2.0 Shaker Bottle 750ml")]),
           ("whey-pre-stack", "Whey + Pre Stack", [("applied-nutrition-critical-whey-25-servings", "Critical Whey Protein · 25 servings"),
                                                   ("applied-nutrition-abe-all-black-everything", "ABE All Black Everything · 30 servings")])]


def related_posts(product, n=3):
    """Learn more: score every live blog post against the product.
    +3 per product keyword in the post title, +2 per post tag that shares a keyword, +1 if the vendor is named,
    keywords = product type + tags + title words (minus brand, sizes and filler); ties go to the newest post."""
    stop = {"applied", "nutrition", "2kg", "kg", "the", "and", "with", "for", "of", "-"}
    words = set()
    for s in [product["product_type"], product["tags"] if isinstance(product["tags"], str) else " ".join(product["tags"]), PREFIX.sub("", product["title"])]:
        words |= {w for w in re.findall(r"[a-z0-9+]+", s.lower()) if w not in stop and len(w) > 2}
    posts = json.loads((DATA / "live-blog-all.json").read_text())
    scored = []
    for a in posts:
        t = a["title"].lower()
        s = 3 * sum(1 for w in words if re.search(r"\b" + re.escape(w) + r"\b", t))
        s += 2 * sum(1 for tag in a["tags"] if words & set(tag.split("-")))
        s += 1 if product["vendor"].lower() in (t + " " + a["summary"].lower()) else 0
        if s:
            scored.append((s, a["date"], a))
    scored.sort(key=lambda x: (x[0], x[1]), reverse=True)
    return [a for _, _, a in scored[:n]], sorted(words)


def flavour_key(name):
    for k in FLAVOUR_IMG:
        if name.startswith(k):
            return k
    return None


def an(fn, where, note=""):
    key = "an:" + fn
    if key not in R.IMAGES:
        R.IMAGES[key] = (AN + fn, 1200, 1200, False, "appliednutrition.uk · Critical Whey 2kg", note or "Official render, #CDCDCD backdrop")
    return R.use(key, where)


def product():
    p = load(HANDLE)
    live = json.loads((DATA / f"{HANDLE}.js.json").read_text())
    avail = {v["id"]: v["available"] for v in live["variants"]}
    name = PREFIX.sub("", p["title"])
    price = float(p["variants"][0]["price"])
    paras = [re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", x)).strip() for x in re.findall(r"<p[^>]*>(.*?)</p>", p["body_html"], re.S)]
    paras = [x.replace("&amp;", "&").replace("&nbsp;", " ") for x in paras if len(x) > 140]

    media = live["media"]
    pos = {m["id"]: i for i, m in enumerate(media)}
    variants = []
    for v in live["variants"]:
        flav = v["option2"].replace(" - Informed-Sport Tested", "")
        fm = (v.get("featured_media") or {}).get("id")
        variants.append({"id": v["id"], "flavour": flav, "price": v["price"] / 100, "compare": (v["compare_at_price"] or 0) / 100,
                         "available": v["available"], "informed": flav.startswith(INFORMED), "media": pos.get(fm, 0),
                         "img": media[pos.get(fm, 0)]["src"]})
    first = next(v for v in variants if v["available"])
    R.IMAGES.setdefault("pdp-live-gallery", (media[0]["src"], 1080, 1080, False, "SNH live product media (products/<handle>.js), all 17 in live order",
                                             "Gallery slides + thumbs; each flavour jumps to its own live image"))
    R.use("pdp-live-gallery", W + " · gallery")
    label = R.theme("Nutritional_PanelWCP.webp", W + " · ingredients & nutrition", baked=True, note="Nutrition panel (live gallery image 2)")
    gallery = [(m["src"], m.get("alt") or name) for m in media]
    brand_logo = R.theme("Untitled_design.zip_-_1.png", W + " · brand logo", baked=True, note="logo")

    slides = "".join(f'<div class="pg__slide"><img src="{e(img(s, 1080))}" srcset="{e(img(s, 700))} 700w, {e(img(s, 1080))} 1080w" sizes="(max-width: 1023px) 100vw, 55vw" '
                     f'width="1080" height="1080" alt="{e(name)}, image {i + 1} of {len(gallery)}" {"fetchpriority=\"high\"" if i == 0 else "loading=\"lazy\""} decoding="async"></div>' for i, (s, a) in enumerate(gallery))
    thumbs = "".join(f'<button class="pg__thumb" type="button" aria-label="Image {i + 1} of {len(gallery)}" aria-current="{str(i == 0).lower()}"><img src="{e(img(s, 200))}" alt="" width="100" height="100" loading="lazy"></button>' for i, (s, a) in enumerate(gallery))

    pills = "".join(
        f'<button class="vpill{" is-out" if not v["available"] else ""}" type="button" role="radio" aria-checked="{str(v is first).lower()}" '
        f'data-variant=\'{e(json.dumps({"id": v["id"], "flavour": v["flavour"], "price": v["price"], "compare": v["compare"], "available": v["available"], "img": v["img"], "media": v["media"]}))}\'>'
        f'{e(v["flavour"])}{"<span class=\"vpill__is\" title=\"Informed Sport certified\">IS</span>" if v["informed"] else ""}{"<span class=\"vpill__out\">Sold out</span>" if not v["available"] else ""}</button>'
        for v in variants)
    in_stock = sum(v["available"] for v in variants)

    modal_html = "".join(f'''<div class="emodal" id="m-{k}" role="dialog" aria-modal="true" aria-labelledby="m-{k}-t" hidden><div class="emodal__card">
      <button class="emodal__x" type="button" aria-label="Close">×</button><p class="eyebrow">{e(kick)}</p><h2 class="h2" id="m-{k}-t">{e(title)}</h2>
      <ul class="ticks">{"".join(f"<li>{e(x)}</li>" for x in body)}</ul><a class="btn btn--accent btn--block" href="/account/register"><span>Join SNH Elite, it's free</span></a></div></div>''' for k, (kick, title, body) in MODALS.items())

    bpanels, bpills = [], []
    for i, (h, title, parts) in enumerate(BUNDLES):
        bp = json.loads((DATA / f"bundle-{h}.json").read_text())["product"]
        bprice = float(bp["variants"][0]["price"])
        banner = bp["images"][0]["src"]
        R.IMAGES.setdefault("bundle-" + h, (banner, 2000, 2000, True, f"SNH live bundle product /products/{h} (image 1)", "Bundle banner"))
        R.use("bundle-" + h, W + " · bundle module")
        sep = sum(SEARCH[c]["p"] for c, _ in parts)
        rows = "".join(f'<li><img src="{e(img(SEARCH[c]["i"], 120))}" alt="" width="48" height="48" loading="lazy"><span>{e(lbl)}</span><b>{rs(SEARCH[c]["p"])}</b></li>' for c, lbl in parts)
        bpills.append(f'<button type="button" role="tab" aria-selected="{str(i == 0).lower()}" aria-controls="bx-{i}" id="bxp-{i}">{e(title)}<span>Save {rs(sep - bprice)}</span></button>')
        bpanels.append(f'''<div class="bx__panel" id="bx-{i}" role="tabpanel" aria-labelledby="bxp-{i}"{" hidden" if i else ""}>
          <div class="bx__hero"><img src="{e(img(banner, 400))}" alt="{e(title)} bundle" width="112" height="112" loading="lazy"><div><strong>{e(title)}</strong><span>{len(parts)} products · pick flavours at the next step</span></div></div>
          <ul class="bx__items">{rows}</ul>
          <div class="bx__total"><span>Separately <s>{rs(sep)}</s></span><span class="bx__price">{rs(bprice)}</span><span class="save">Save {rs(sep - bprice)}</span></div>
          <a class="btn btn--accent btn--block" href="/products/{h}" data-bundle-add><span>Add bundle · {rs(bprice)}</span></a>
        </div>''')
    bundle_html = f'''<div class="bx" data-edit="Bundle & save · the live bundle products that contain this item (bundle-offers): banner, contents, separate total, saving, one Add bundle button">
        <p class="bx__head"><span class="eyebrow eyebrow--accent">Bundle &amp; save</span><span class="meta">{len(BUNDLES)} bundles include this protein</span></p>
        <div class="bx__pills" role="tablist" aria-label="Bundles">{"".join(bpills)}</div>
        {"".join(bpanels)}
      </div>'''
    plan = f'''<fieldset class="opt popt" data-edit="Purchase options · Appstle Subscriptions selling plans (none configured on this product yet)">
        <legend>Purchase option</legend>
        <label class="popt__card"><input type="radio" name="popt" value="once" checked><span class="popt__dot"></span><span class="popt__t">One-time purchase</span><span class="popt__p" data-price>{rs(first["price"])}</span></label>
        <label class="popt__card"><input type="radio" name="popt" value="sub"><span class="popt__dot"></span><span class="popt__t">Subscribe &amp; save <em class="ph-tag">X% · plan from Appstle</em></span><span class="popt__p">—</span>
          <span class="popt__more"><span>Deliver every</span><select aria-label="Delivery frequency (plan from Appstle)"><option>Plan from Appstle</option><option>Plan from Appstle</option></select></span></label>
      </fieldset>'''
    posts, kw = related_posts(p)
    def tag_label(a):
        return (a["tags"][0].replace("-", " ").capitalize() if a["tags"] else "Guide")
    for a in posts:
        R.IMAGES.setdefault("blog-" + a["url"].rsplit("/", 1)[-1], (a["image"], 1200, 1200, True, "SNH live blog article image", "Learn more card"))
        R.use("blog-" + a["url"].rsplit("/", 1)[-1], W + " · Learn more")
    learn = "".join(f'''<a class="post" href="{e(a["url"])}"><span class="post__img"><img src="{e(img(a["image"], 700))}" alt="" width="700" height="438" loading="lazy"></span>
        <span class="post__cat">{e(tag_label(a))}</span><span class="post__t">{e(a["title"])}</span><span class="post__m">{max(1, round(a["words"] / 220))} min read</span></a>''' for a in posts)

    creatine, hydro = load("applied-nutrition-creatine-monohydrate"), load("sis-go-hydro-tablets")
    c_price, h_price = float(creatine["variants"][0]["price"]), float(hydro["variants"][0]["price"])
    fbt_items = [(first["img"], name, price, True), (R.use(R.PACKSHOT["applied-nutrition-creatine-monohydrate"][0], W + " · bought together"), "Creatine Monohydrate 50 Servings", c_price, False),
                 (R.use(R.PACKSHOT["sis-go-hydro-tablets"][0], W + " · bought together"), "SiS Hydro Tablets", h_price, False)]
    fbt = "".join(f'<label class="fbt__item"><input type="checkbox" checked data-price="{pr}"{" disabled" if this else ""}><span class="fbt__img"><img src="{e(img(src, 300))}" alt="" width="150" height="150" loading="lazy"></span>'
                  f'<span class="fbt__name">{"This item: " if this else ""}{e(n)}</span><span class="fbt__price">{rs(pr)}</span></label>' for src, n, pr, this in fbt_items)
    fbt_total = sum(x[2] for x in fbt_items)

    faqs = [("How long will delivery take?", "Colombo orders arrive the same day. Outside Colombo, 2–3 working days, fully tracked."),
            ("Is this product genuine?", "Yes. SNH stocks only genuine products sourced directly from authorised distributors, with verifiable batch codes."),
            ("Which flavours are Informed Sport certified?", "Chocolate Milkshake, Strawberry Milkshake and Vanilla Ice Cream are named as Informed-Sport certified."),
            ("Can I pay in instalments?", f"Yes. Split this order into 3 interest-free payments of {rs(price / 3)} with Koko at checkout.")]

    return head(f"{name} — prototype", "Product page prototype") + TICKER + ANNOUNCE_HTML + header("product") + f'''
<main class="pdp-page">
  <div class="wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><span aria-hidden="true">/</span><a href="#">Supplements</a><span aria-hidden="true">/</span><a href="#">Whey protein</a><span aria-hidden="true">/</span><span aria-current="page">{e(name)}</span></nav></div>

  <div class="wrap pdp">
    <div class="pg" aria-label="Product images" data-edit="Gallery · every live product image in live order; choosing a flavour jumps to its image">
      <div class="pg__thumbs" role="group" aria-label="Thumbnails">{thumbs}</div>
      <div class="pg__main">
        <div class="pg__track">{slides}</div>
        <div class="pg__bar" aria-hidden="true"><span></span></div>
        <span class="badge pg__badge">Informed Sport flavours</span>
      </div>
    </div>

    <div class="buy" data-edit="Buy box · blocks: title, topline, subtitle, price, Koko + points, variants, quantity, buttons, WhatsApp, bundle, benefits, Elite strip, description">
      <h1 class="buy__title">{e(name)}</h1>
      <div class="buy__top">
        <img class="buy__brand" src="{e(img(brand_logo, 240))}" alt="Applied Nutrition" width="120" height="120">
        <a class="buy__rating" href="#reviews">{STARS}<span>Be the first to review</span></a>
        <span class="stock{"" if first["available"] else " stock--out"}" data-stock><i></i><span>{"In stock" if first["available"] else "Sold out"}</span></span>
      </div>
      <p class="buy__sub">Whey protein · {SERVINGS} servings · <span data-flavour>{e(first["flavour"])}</span></p>
      <div class="buy__price"><span class="buy__now" data-price>{rs(first["price"])}</span><span class="buy__per" data-per>{rs(first["price"] / SERVINGS)} per serving</span><span class="save" data-save hidden></span></div>
      <div class="buy__perks">
        <span class="perk"><b class="koko">Koko</b>or 3 × <strong data-koko>{rs(first["price"] / 3)}</strong></span>
        <button class="perk perk--pts" type="button" data-modal="elite">{ICON["bolt"]}Earn <strong data-pts>{round(first["price"] * .03):,}–{round(first["price"] * .10):,}</strong><span class="perk__long"> SNH</span> points</button>
      </div>

      <fieldset class="opt"><legend>Flavour <span>· {in_stock} of {len(variants)} in stock</span></legend><div class="vpills" role="radiogroup" aria-label="Flavour" data-variants>{pills}</div></fieldset>
      <fieldset class="opt"><legend>Size</legend><div class="vpills" role="radiogroup" aria-label="Size"><button class="vpill" type="button" role="radio" aria-checked="true">2kg · {SERVINGS} servings</button></div></fieldset>
      {plan}

      <div class="buy__qty"><span class="buy__label">Quantity</span><div class="qty" aria-label="Quantity"><button type="button" data-step="-1" aria-label="Decrease">−</button><output>1</output><button type="button" data-step="1" aria-label="Increase">+</button></div></div>
      <div class="buy__ctas">
        <button class="btn btn--ink btn--block" type="button" data-atc="{e(name)}" data-atc-main><span>Add to cart</span></button>
        <button class="btn btn--accent btn--block" type="button" data-buy-now><span>Buy now</span></button>
      </div>
      <a class="btn btn--wa btn--block" href="https://wa.me/94764863359?text={e("Hello, I want to buy: " + name)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.8s.7-2 .9-2.3c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.3.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.8-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.1.1.6-.1 1.1Z"/></svg><span>Order on WhatsApp</span></a>

      {bundle_html}

      <div class="why">
        <p class="eyebrow eyebrow--accent">Why athletes pick this</p>
        <ul class="ticks">{"".join(f"<li>{e(b)}</li>" for b in BENEFITS)}</ul>
      </div>

      <div class="estrip" data-edit="SNH Elite strip · copy + 3 info modals">
        <button class="estrip__top" type="button" data-modal="elite"><span class="estrip__icon">{ICON["bolt"]}</span><span><strong>Earn up to 10% back in points</strong><small>SNH Elite · free to join</small></span><span aria-hidden="true">›</span></button>
        <div class="estrip__links"><button type="button" data-modal="delivery">{ICON["truck"]}Delivery</button><button type="button" data-modal="payment">{ICON["card"]}Payment</button><button type="button" data-modal="authentic">{ICON["shield"]}Authentic</button></div>
      </div>

      <div class="buy__desc clamp" data-clamp><p>{e(paras[0] if paras else "")}</p></div>
      <button class="link buy__more" type="button" data-more>Read more</button>
    </div>
  </div>

  <section class="pstats" aria-label="Key stats" data-edit="Stats band · up to 4 metafields">
    <div class="wrap pstats__in">
      <div class="pstat"><strong>24g</strong><span>protein per serving</span></div>
      <div class="pstat"><strong>120</strong><span>kcal per serving</span></div>
      <div class="pstat"><strong>{SERVINGS}</strong><span>servings per 2kg tub</span></div>
      <div class="pstat"><strong data-per-stat>{rs(price / SERVINGS)}</strong><span>per serving</span></div>
    </div>
  </section>

  <section class="section" aria-labelledby="det-title">
    <div class="wrap split">
      <div class="head__text"><p class="eyebrow">The details</p><h2 class="h1" id="det-title">Everything <span class="serif">inside</span></h2><p class="lead">What it does, how to use it and exactly what goes in.</p></div>
      <div class="acc">
        <details open><summary>Description</summary><div class="acc__body prose">{"".join(f"<p>{e(x)}</p>" for x in paras[:3])}</div></details>
        <details><summary>How to use</summary><div class="acc__body prose"><p>{e(HOW_TO)}</p></div></details>
        <details><summary>Ingredients &amp; nutrition</summary><div class="acc__body prose"><div class="label-img"><img src="{e(img(label, 900))}" alt="Critical Whey nutrition and ingredients label" width="900" height="900" loading="lazy"></div><p class="meta">Label image from the product listing. A typed ingredient list is still needed for accessibility and search.</p></div></details>
        <details><summary>FAQs</summary><div class="acc__body prose">{"".join(f"<p><strong>{e(q)}</strong><br>{e(a)}</p>" for q, a in faqs)}</div></details>
        <details><summary>Delivery &amp; returns</summary><div class="acc__body prose"><p>Free delivery over Rs 17,000. Colombo same day, island-wide in 2–3 working days. Orders before 2 PM dispatch the same day.</p><p>Returns and exchanges are accepted for unopened, unused products in their original sealed condition. If your order arrives damaged or incorrect, contact us within 24 hours.</p></div></details>
      </div>
    </div>
  </section>

  <section class="section section--cream" aria-labelledby="learn-title" data-edit="Learn more · 3 live blog posts matched on product type, tags, title keywords and vendor">
    <div class="wrap">
      <div class="head"><div class="head__text"><p class="eyebrow">Learn more</p><h2 class="h1" id="learn-title">Know what you're <span class="serif">taking</span></h2></div><a class="link" href="/blogs/news">All guides</a></div>
      <div class="posts">{learn}</div>
    </div>
  </section>

  <section class="section" aria-labelledby="reviews" id="reviews" data-edit="Reviews · Judge.me review widget">
    <div class="wrap">
      <div class="head"><div class="head__text"><div class="rating">{STARS}<span class="meta">Judge.me reviews</span></div><h2 class="h1" id="rev-t">What <span class="serif">lifters</span> say</h2></div><a class="btn btn--ink" href="#"><span>Write a review</span></a></div>
      <div class="quotes">{"".join('<figure class="quote">' + STARS + '<blockquote class="quote__text">“Real Judge.me review for this product goes here.”</blockquote><figcaption class="quote__who">Reviewer name<span>Verified buyer · placeholder</span></figcaption></figure>' for _ in range(4))}</div>
    </div>
  </section>

  <section class="section section--cream" aria-labelledby="fbt-title" data-edit="Frequently bought together · up to 3 products">
    <div class="wrap">
      <div class="head"><div class="head__text"><p class="eyebrow">Bundle</p><h2 class="h1" id="fbt-title">Frequently bought <span class="serif">together</span></h2></div></div>
      <div class="fbt"><div class="fbt__items">{fbt}</div>
        <div class="fbt__sum"><span class="meta">Total for selected</span><strong data-fbt-total>{rs(fbt_total)}</strong><span class="meta" data-fbt-koko>or 3 × {rs(fbt_total / 3)} with Koko</span><button class="btn btn--accent btn--block" type="button" data-atc="Bundle"><span>Add selected to basket</span></button></div></div>
    </div>
  </section>

  <section class="section section--cream" aria-labelledby="rel-title">
    <div class="wrap">
      <div class="head"><h2 class="h1" id="rel-title">You may also <span class="serif">like</span></h2><a class="link" href="#">Shop whey protein</a></div>
      <div class="grid grid--rail">{"".join(card(h) for h in ["raw-cbum-itholate-protein", "ryse-loaded-protein-2lb", "applied-nutrition-creatine-monohydrate", "raw-thavage-pre-workout"])}</div>
    </div>
  </section>

  <section class="section" aria-labelledby="rv-title" data-edit="Recently viewed · from the shopper's browsing (localStorage)">
    <div class="wrap">
      <div class="head"><h2 class="h1" id="rv-title">Recently <span class="serif">viewed</span></h2></div>
      <div class="grid grid--rail">{"".join(card(h) for h in ["sis-go-hydro-tablets", "sis-beta-fuel-gel", "ryse-loaded-pre-workout", "applied-nutrition-multi-vitamin-complex"])}</div>
    </div>
  </section>
</main>
{modal_html}
<div class="emodal" id="m-elite" role="dialog" aria-modal="true" aria-labelledby="m-elite-t" hidden><div class="emodal__card"><button class="emodal__x" type="button" aria-label="Close">×</button><p class="eyebrow">SNH Elite</p><h2 class="h2" id="m-elite-t">Earn on every single order</h2>
  <ul class="ticks"><li>Members earn points back on every eligible order: Bronze 3%, Silver 7%, Gold 10%.</li><li>Free to join, with 500 welcome points.</li><li>Redeem from 2,500 points.</li></ul><a class="btn btn--accent btn--block" href="/account/register"><span>Join SNH Elite, it's free</span></a></div></div>
<div class="sticky-atc"><img src="{e(img(first["img"], 120))}" alt="" width="48" height="48" data-sticky-img><div class="sticky-atc__info"><strong>{e(name)}</strong><span><span data-sticky-price>{rs(price)}</span> · <span data-sticky-flavour>{e(first["flavour"])}</span></span></div><button class="btn btn--accent" type="button" data-atc="{e(name)}" data-sticky-btn><span>Add to cart</span></button></div>''' + FOOTER + "\n</body>\n</html>\n"
