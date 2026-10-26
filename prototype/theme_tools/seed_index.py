"""Seed templates/index.json with the prototype homepage, one SNH v2 section at a time (round 5 theme build).

    python3 prototype/theme_tools/seed_index.py hero goalbar ...   -> those new sections, in prototype order

Each new section lists the old Impact/SNH sections it replaces; those are dropped from the template as the new one
goes in. Old sections nobody has replaced yet stay below the new ones in their old order. Content comes from the
prototype's own data (prototype/build.py, home_page.py, data/live-home.json); images are Shopify Files
(shopify://shop_images/<file>), collections/products/blogs are handles.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "prototype"))
sys.path.insert(0, str(ROOT / "prototype/images"))
import build  # noqa: E402
sys.modules["build"] = build
import home_page as H  # noqa: E402
import registry as R  # noqa: E402

TPL = ROOT / "templates/index.json"


def img(url_or_fn):
    """Shopify Files reference for a cdn.shopify.com/.../files/<name> URL or a bare filename."""
    return "shopify://shop_images/" + url_or_fn.split("/files/")[-1].split("/")[-1].split("?")[0]


def serif(html):
    """Prototype headings mark the serif word with <span class="serif">; the theme setting uses *word*."""
    return re.sub(r'<span class="serif">(.*?)</span>', r"*\1*", html).replace("&amp;", "&")


def blocks(items):
    b, order = {}, []
    for i, (typ, settings) in enumerate(items, 1):
        bid = f"{typ}_{i}"
        b[bid] = {"type": typ, "settings": settings}
        order.append(bid)
    return b, order


def section(typ, settings, items=()):
    b, order = blocks(items)
    out = {"type": typ, "settings": settings}
    if b:
        out["blocks"], out["block_order"] = b, order
    return out


# ---------------------------------------------------------------- sections, prototype order
def hero():
    slides = []
    for s in build.HERO_SLIDES:
        d = R.IMAGES[s["desk"][1]][0] if s["desk"][0] == "reg" else s["desk"][1]
        m = R.IMAGES[s["mob"][1]][0] if s["mob"][0] == "reg" else s["mob"][1]
        st = {"kind": s["kind"], "label": s["label"], "image_desktop": img(d), "image_mobile": img(m), "pos": s["pos"], "mpos": s["mpos"]}
        if s["kind"] == "banner":
            st.update({"alt": s.get("alt", ""), "link": s["href"]})
        else:
            st.update({"eyebrow": s["eyebrow"], "heading": serif(s["head"]), "sub": s["sub"], "cta": s["cta"], "link": s["href"]})
            if s.get("cta2"):
                st.update({"cta2": s["cta2"], "link2": s["href2"]})
        slides.append(("slide", st))
    return section("snh-hero-slider", {"label": "Featured", "interval": 6}, slides)


def goalbar():
    html = build.hero()
    goals = re.findall(r'<a class="goal" href="([^"]+)">([^<]+)</a>', html)
    return section("snh-goal-strip", {"label": "Shop by goal"}, [("goal", {"title": t, "link": h}) for h, t in goals])


def logos():
    return section("snh-brand-marquee", {"label": "Authorised distributors of leading brands", "speed": 48},
                   [("logo", {"name": n, "image": img(l), "link": h}) for n, l, h in build.BRANDS if l])


def ways():
    return section("snh-shop-your-way", {"eyebrow": "Our collection", "heading": "Shop *your* way", "link_label": "Shop everything", "link_url": "/collections/everything", "link_style": "link"},
                   [("tile", {"image": img(d["image"]), "title": build.nice(d["title"]), "link": d["link"]}) for d in build.LIVE["deck"]])


def why():
    wy = build.LIVE["whyus"]
    icons = ["shield", "card", "chat", "badge"]
    items = [("stat", {"value": "50,000+", "label": "orders delivered"}), ("stat", {"value": "4.9★", "label": "from 2,000+ reviews"})]
    items += [("benefit", {"icon": icons[i], "title": build.nice(t), "text": x}) for i, (t, x) in enumerate(wy["features"])]
    items += [("benefit", {"icon": "truck", "title": "Same-day Colombo", "text": "Colombo orders same day, island-wide in 2–3 working days."}),
              ("benefit", {"icon": "bolt", "title": "Earn points", "text": "3–10% back on every order as an SNH Elite member."})]
    return section("snh-why-us", {"eyebrow": "Why choose us", "heading": "The SNH *standard*", "lead": wy["sub"]}, items)


def look():
    bm = build.LIVE["botm"]
    return section("snh-shop-the-look", {
        "eyebrow": "Brand of the month", "heading": "Shop the *look*: RYSE", "link_label": "Shop all RYSE", "link_url": "/collections/ryse", "link_style": "button",
        "image": img(bm["image"]), "image_alt": "RYSE brand of the month: Loaded Protein, Pump, Pre and Pre MAX", "show_points": True, "zoom": 112, "popover": True,
        "rate_bronze": 3, "rate_silver": 7, "rate_gold": 10, "silver_threshold": 200000, "gold_threshold": 500000},
        [("product", {"product": sp["handle"], "horizontal_position": sp["x"], "vertical_position": sp["y"]}) for sp in bm["spots"]])


def goals():
    return section("snh-shop-by-goal", {"eyebrow": "Shop by goal", "heading": "What are you *training* for?", "tab_1": "Train & perform", "tab_2": "Health & wellness", "anchor": "goals"},
                   [("goal", {"group": g["group"], "image": img(g["image"]), "title": g["title"], "link": g["link"]}) for g in build.LIVE["goals"]])


def best():
    groups = [("All", "all"), ("Protein", "protein"), ("Endurance", "endurance"), ("Strength", "strength"), ("Health", "health")]
    tabs = []
    for label, g in groups:
        if g == "all":
            hs = H.BEST
        elif g == "health":   # the prototype's 8 had none; use its health products so the tab is not empty
            hs = [h for h, st in build.STATS.items() if st[3] == "health"]
        else:
            hs = [h for h in H.BEST if build.STATS[h][3] == g]
        tabs.append(("tab", {"label": label, "products": hs}))
    return section("snh-bestsellers", {"eyebrow": "What's new at SNH", "heading": "Shop our *bestsellers*", "link_label": "Shop all", "link_url": "/collections/everything",
                                       "link_style": "button", "limit": 8, "anchor": "shop"}, tabs)


def sis():
    M = H.SISM
    tiles = {"label": "Shop by need", "eyebrow": "Shop SiS by need", "heading": "Fuel every *session*."}
    for i, (label, fn, href) in enumerate(H.SIS_TILES, 1):
        tiles.update({f"tile_{i}_image_url": M + fn, f"tile_{i}_label": label, f"tile_{i}_link": href})
    return section("snh-sis-slider", {
        "label": "Science in Sport, official distributor", "anchor": "sis", "interval": 6,
        "logo_url": "https://www.scienceinsport.com/static/version1792401833/frontend/SIS/theme-frontend-sis-pnx/en_GB/images/logo.svg",
        "badge": "Official distributor[ in Sri Lanka] · 100% Informed Sport[ approved]",
        "strip_title": "Bestselling SiS", "strip_link_label": "Shop all Science in Sport", "strip_link": "/collections/sis",
        "products": ["sis-go-hydro-tablets", "sis-beta-fuel-gel", "sis-go-isotonic-energy-gel", "sis-beta-fuel-energy-nootropics-gel"]},
        [("video", {"label": "What fuels you?", "video_url": M + "Q2_Running_Homepage_Video.mp4",
                    "poster_url": M + "BF-Electrolyte-VideoFrame1.jpg?width=1920",
                    "poster_mobile_url": M + "Phoenix_-_Homepage_Product_Category_-_540_x_880_-_ENERGY.jpg?width=1080",
                    "eyebrow": "Science in Sport · as seen on the start line", "heading": "What *fuels* you?",
                    "sub": "Gels, hydration and recovery from the brand behind the world's best endurance athletes.", "cta": "Shop Science in Sport", "link": "/collections/sis"}),
         ("tiles", tiles),
         ("trust", {"label": "Trusted by athletes", "bg_url": M + "BF-Electrolyte-VideoFrame1.jpg",
                    "image_url": "https://www.scienceinsport.com/media/.renditions/wysiwyg/Phoenix_-_Homepage_-_Trusted_by_Athletes_-_Desktop_-_McCOLGAN.jpg",
                    "image_alt": "Eilish McColgan, Science in Sport athlete", "eyebrow": "Trusted by athletes", "heading": "Tested. *Trusted*. Informed Sport.",
                    "sub": "Science in Sport fuel is batch-tested under Informed Sport, so tested athletes like Eilish McColgan can use it with confidence.",
                    "cta": "Shop Informed Sport", "link": "/collections/informed-sports",
                    "proof": "Informed Sport | Batch-tested for banned substances\nOfficial distributor | Sourced direct by SNH in Sri Lanka\nStored right | Climate-controlled stock in our three stores"})])


def bundles():
    return section("snh-bundles", {"eyebrow": "Offers", "heading": "Bundle & *save*", "lead": "Curated stacks built for better value, faster shopping and stronger daily routines.",
                                   "link_label": "All bundles", "link_url": "/collections/bundle-offers", "link_style": "link"},
                   [("offer", {"image": img(x["image"]), "badge": x["badge"], "title": x["title"], "link": x["link"]}) for x in build.LIVE["bundles"]])


def elite():
    tiers = [("bronze", "3%", "Bronze", "Free to join", "500 welcome points"), ("silver", "7%", "Silver", "From Rs 198k a year", "Birthday reward + vouchers"),
             ("gold", "10%", "Gold", "From Rs 300k a year", "Free shipping + 15% birthday")]
    return section("snh-elite", {
        "anchor": "elite", "eyebrow": "SNH Elite · Sri Lanka's 1st premium VIP club", "heading": "Fuel your goals. Earn your *rewards*.",
        "lead": "Create your free account, claim 500 welcome points, and earn 3% to 10% back in points on every order.",
        "chips": "500 welcome points\nUp to 10% back\nRedeem from 2,500 points",
        "cta": "Join SNH Elite, it's free", "cta_link": "/account/register", "cta2": "Sign in", "cta2_link": "/account/login",
        "silver_threshold": 198000, "gold_threshold": 300000,
        "person": img("girl.png"), "gift": img("1_57b712a6-c53e-4f6b-bcc0-6fea0e096b6e.png"), "coins": img("2_37969279-4a78-43c8-8fdf-5256e55c6030.png"),
        "card_logo": img("sn_o.png"), "card_points": "2,860", "card_tier": "Gold member", "card_rate": "10% back"},
        [("tier", {"metal": k, "rate": p, "name": n, "threshold": th, "perk": pk}) for k, p, n, th, pk in tiers])


def reviews():
    """Keeps the live Google Reviews app block exactly as configured; no invented quotes."""
    cur = json.loads(TPL.read_text()[TPL.read_text().index("{"):])
    old = cur["sections"].get("17249238673e5621c3") or cur["sections"].get("snh_reviews") or {}
    apps = [(k, b) for k, b in old.get("blocks", {}).items() if b["type"].startswith("shopify://apps/")]
    out = section("snh-reviews", {"rating_text": "4.9 from 2,000+ Google reviews", "heading": "Rated 4.9 by *real* customers", "link_label": "", "link_url": ""})
    for _, b in apps:   # the prototype's four-quote row: the widget's carousel layout, white cards on the cream band
        b["settings"].update({"variant": "carousel", "cardColor": "#ffffff"})
    if apps:
        out["blocks"] = {k: b for k, b in apps}
        out["block_order"] = [k for k, _ in apps]
    return out


def guides():
    return section("snh-guides", {"blog": "news", "limit": 3, "label": "Buying guide", "eyebrow": "Read our blog", "heading": "Buying *guides*",
                                  "link_label": "All articles", "link_url": "/blogs/news", "link_style": "link"})


def faq():
    import html as _h
    return section("snh-faq", {"eyebrow": "Support · every day, 10am–7pm", "heading": "Questions, *answered*",
                               "lead": "Call or WhatsApp +94 76 486 3359 for anything not covered here."},
                   [("question", {"question": q, "answer": "<p>" + _h.escape(a) + "</p>"}) for q, a in build.LIVE["faq"]])


def stores():
    return section("snh-stores", {"anchor": "stores", "eyebrow": "Visit us", "heading": "Three stores, open every *day*", "link_label": "All locations",
                                  "link_url": "/pages/location", "link_style": "link"},
                   [("store", {"image": img(R.IMAGES[f][0]), "image_alt": "SNH " + n + " store", "name": n, "address": a, "phone": t,
                               "hours": "Open every day", "map": u}) for n, f, a, t, u in H.STORES])


def news():
    return section("snh-newsletter", {"heading": "First to *know*", "lead": "New drops, restocks and member offers. No spam, only discount codes and product news.",
                                      "placeholder": "Email address", "button": "Subscribe", "success": "Thanks, you're on the list.", "tags": "newsletter,homepage"})


NEW = [  # key, builder, old sections it replaces
    ("hero", hero, ["slideshow"]),
    ("goalbar", goalbar, ["image-link-blocks"]),
    ("logos", logos, ["brand_logo_slider_custom_PqgAUt"]),
    ("ways", ways, ["ss_slider_2_pro_MXbNFa"]),
    ("why", why, ["whyus_R6HG6b", "text_with_icons_x8kUc3", "17580258643e53a213"]),
    ("look", look, ["shop_the_look_Cptwwq"]),
    ("goals", goals, ["multi_column_xzrBTh", "collection-list"]),
    ("best", best, ["featured-collection"]),
    ("sis", sis, ["images_with_text_scrolling_ypwaAR", "impact-text"]),
    ("bundles", bundles, ["custom_liquid_kcmbYY"]),
    ("elite", elite, []),
    ("reviews", reviews, ["17249238673e5621c3"]),
    ("guides", guides, ["instafeed_modern_GYXn3r"]),
    ("faq", faq, ["faq_pXHLeA"]),
    ("stores", stores, []),
    ("news", news, ["17908414235dd8d175", "1790841648d613425f"]),
]


def main(keys):
    s = TPL.read_text()
    head, d = s[: s.index("{")], json.loads(s[s.index("{"):])
    order_new, replaced = [], set()
    for key, fn, old in NEW:
        if key in keys:
            d["sections"]["snh_" + key] = fn()
            order_new.append("snh_" + key)
            replaced.update(old)
    for k in replaced:
        d["sections"].pop(k, None)
    rest = [k for k in d["order"] if k in d["sections"] and k not in order_new and not k.startswith("snh_")]
    stale = [k for k in d["sections"] if k.startswith("snh_") and k not in order_new]
    for k in stale:
        d["sections"].pop(k)
    d["order"] = order_new + rest
    TPL.write_text(head + json.dumps(d, indent=2, ensure_ascii=False) + "\n")
    print("index.json:", " → ".join(d["order"]))


if __name__ == "__main__":
    main(sys.argv[1:] or [k for k, _, _ in NEW])
