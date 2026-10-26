"""Seed sections/header-group.json and footer-group.json with the prototype's content (round 5 theme build).
Swaps ss-header-4 out of the header group (the file stays in the repo) and ss-footer-16 out of the footer group.
Images are Shopify Files (shopify://shop_images/<file>); collections are handles. Run once; the editor owns it after."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "prototype"))
sys.path.insert(0, str(ROOT / "prototype/images"))
import build  # noqa: E402
sys.modules["build"] = build
import menu as M  # noqa: E402

IMG = lambda fn: "shopify://shop_images/" + fn.split("/")[-1].split("?")[0]
H = lambda href: href.split("/collections/")[-1] if href.startswith("/collections/") else None


def load(p):
    s = (ROOT / p).read_text()
    i = s.index("{")
    return s[:i], json.loads(s[i:])


def save(p, head, d):
    (ROOT / p).write_text(head + json.dumps(d, indent=2, ensure_ascii=False) + "\n")


def lines(items):
    return "\n".join(f"{t} | {h}" for t, h in items)


def header_section():
    blocks, order = {}, []

    def add(bid, typ, settings):
        blocks[bid] = {"type": typ, "settings": settings}
        order.append(bid)

    for i, (tag, text, href) in enumerate(build.ANNOUNCE):
        add(f"announce_{i + 1}", "announcement", {"tag": tag, "text": text, "link": href})
    for key, label, need, typ, brands, promos, best in M.MENU:
        s = {"label": label,
             "need_title": need[0], "need_links": lines(need[1]), "need_all": need[2],
             "type_title": typ[0], "type_links": lines(typ[1]), "type_all": typ[2],
             "brands": ", ".join(brands), "best_collection": best}
        for n, (fn, eyebrow, lab, href) in enumerate(promos, 1):
            s.update({f"promo_{n}_image": IMG(fn), f"promo_{n}_eyebrow": eyebrow, f"promo_{n}_label": lab, f"promo_{n}_link": href})
        add(f"mega_{key}", "mega", s)
    add("brands_az", "brands", {"label": "Brands", "all_label": "Shop by brand page"})
    off = {"label": "Offers", "title": "Bundles & deals", "deals_title": "Top bundle deals", "deals_collection": "bundle-offers",
           "perks": "truck | Free delivery over Rs 17,000\ncard | Pay in 3 with Koko\nbadge | 3–10% back with SNH Elite"}
    for n, (t, href, src, cnt) in enumerate(M.OFFERS, 1):
        off[f"collection_{n}"] = H(href)
        if src and "/files/" in src:
            off[f"image_{n}"] = IMG(src)
    add("offers", "offers", off)
    add("link_elite", "link", {"label": "SNH Elite", "url": "/#elite"})
    for name, logo, href in build.BRANDS:
        s = {"name": name, "url": href, "fit": "cover"}
        if logo:
            s["logo"] = IMG(logo)
        elif name == "SNH":
            s.update({"logo": "shopify://shop_images/sn_o.png", "fit": "contain"})
        add("brand_" + re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_"), "brand", s)
    add("mpromo_1", "mobile_promo", {"image": IMG("ryse_mobile_banner.jpg"), "eyebrow": "New launch", "label": "The all-new RYSE range", "link": "/collections/ryse"})
    add("mpromo_2", "mobile_promo", {"image": IMG("cricket.jpg"), "eyebrow": "SNH Elite", "label": "Earn 3–10% back", "link": "/account/register"})
    return {
        "type": "snh-header",
        "blocks": blocks,
        "block_order": order,
        "settings": {
            "logo": "shopify://shop_images/sn_o.png", "logo_width": 82, "overlay_home": True,
            "ticker": "\n".join(build.TICKER_ITEMS), "ticker_speed": 32, "announce_interval": 4,
            "brands_url": "/pages/shop-by-brand", "search_placeholder": "Search products, brands and guides",
            "popular": ", ".join(M.POPULAR), "trending": "whey-protein",
            "account_note": "Earn 3–10% back in points on every order.",
        },
    }


FOOTER_COLS = [
    ("Supplements", [("Shop all supplements", "/collections/everything"), ("Train & perform", "/collections/train-perform"), ("Whey proteins", "/collections/whey-protein"),
                     ("Pre-workout", "/collections/pre-workout-1"), ("Creatine", "/collections/creatine-1"), ("Weight management", "/collections/weight-management")]),
    ("Vitamins & wellness", [("Health & wellness", "/collections/health-wellness"), ("Fish oil & omega", "/collections/fish-oil-omega"), ("Multivitamins", "/collections/multivitamins"),
                             ("Minerals", "/collections/minerals"), ("Letter vitamins", "/collections/letter-vitamins"), ("Herbs & natural", "/collections/herbs-natural-solution")]),
    ("Info", [("About us", "/pages/about-us"), ("Read our blog", "/blogs/news"), ("Work with us", "/pages/careers"), ("Locations", "/pages/location"),
              ("Franchise partner", "/pages/franchise-partner"), ("Wholesale", "/pages/wholesale-1")]),
    ("Support & policies", [("Contact us", "/pages/delivery-and-shipping"), ("Shipping policy", "/pages/shipping-policy"), ("Return policy", "/pages/return-policy"),
                            ("Privacy policy", "/pages/privacy-policy"), ("Terms of service", "/pages/terms-of-service")]),
]
STORES = [("Dehiwala", "133A Kawdana Road", "+94 77 977 3359"), ("Wattala", "880 Negombo Road", "+94 76 846 3359"), ("Nugegoda", "555 High Level Road", "+94 76 486 3359")]


def footer_section():
    blocks, order = {}, []
    for n, a, t in STORES:
        bid = "store_" + n.lower()
        blocks[bid] = {"type": "store", "settings": {"name": n, "address": a, "phone": t}}
        order.append(bid)
    for i, (h, items) in enumerate(FOOTER_COLS, 1):
        bid = f"menu_{i}"
        blocks[bid] = {"type": "menu", "settings": {"heading": h, "links": lines(items)}}
        order.append(bid)
    return {"type": "snh-footer", "blocks": blocks, "block_order": order,
            "settings": {"stores_heading": "Visit or call", "hours": "Open every day · Support 10am–7pm",
                         "payments": "Pay by card, bank transfer, cash on delivery or Koko · pay in 3", "whatsapp": "94764863359",
                         "legal": "Sports Nutrition Hub (Pvt) Ltd.", "policy_links": False, "mark": "shopify://shop_images/sn_o.png", "dot": True}}


if __name__ == "__main__":
    head, d = load("sections/header-group.json")
    for k in [k for k, v in d["sections"].items() if v["type"] == "ss-header-4"]:
        del d["sections"][k]
    d["sections"]["snh_header"] = header_section()
    d["order"] = [k for k in d["order"] if k in d["sections"] and k != "snh_header"]
    d["order"].insert(1 if d["order"] and d["order"][0] == "announcement-bar" else 0, "snh_header")
    save("sections/header-group.json", head, d)

    head, d = load("sections/footer-group.json")
    for k in [k for k, v in d["sections"].items() if v["type"] == "ss-footer-16"]:
        del d["sections"][k]
    d["sections"]["snh_footer"] = footer_section()
    d["order"] = ["snh_footer"] + [k for k in d["order"] if k in d["sections"] and k != "snh_footer"]
    save("sections/footer-group.json", head, d)
    print("seeded header + footer groups")
