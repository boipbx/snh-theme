"""Round 5 phase 2: product templates get the v2 lower page (one-off, idempotent).
Order: main · reviews (apps) · related products · related articles · recently viewed · why choose us · FAQ.
The old text-with-icons and FAQ sections become the v2 snh-why-us / snh-faq with the homepage's current content
(the old FAQ named two stores and the old WhatsApp number). TikTok embed (empty) and the scrolling-text marquee are
switched off, not deleted."""
import json, pathlib, copy
ROOT = pathlib.Path(__file__).resolve().parents[2]

def load(p):
    s = (ROOT / p).read_text(); i = s.index("{"); return s[:i], json.loads(s[i:])

def save(p, head, d):
    (ROOT / p).write_text(head + json.dumps(d, indent=2, ensure_ascii=False) + "\n")

_, idx = load("templates/index.json")
home = {v["type"]: v for v in idx["sections"].values()}
WHY, FAQ = home["snh-why-us"], home["snh-faq"]
RV = {"type": "recently-viewed-products", "settings": {"full_width": False, "products_count": 8, "stack_products": False,
      "show_progress_bar": True, "products_per_row_mobile": "2", "products_per_row_desktop": 4, "subheading": "",
      "title": "Recently viewed", "content": ""}}

for p in sorted((ROOT / "templates").glob("product*.json")):
    rel = "templates/" + p.name
    head, d = load(rel)
    S = d["sections"]
    if len(d["order"]) <= 2:
        continue  # pre-order: main + articles only, leave it
    for k, v in list(S.items()):
        t = v["type"]
        if t in ("tiktok-profile", "scrolling-text"):
            v["disabled"] = True
        elif t == "text-with-icons" and "snh_why" not in S:
            S["snh_why"] = copy.deepcopy(WHY); del S[k]; d["order"][d["order"].index(k)] = "snh_why"
        elif t == "faq" and "snh_faq" not in S:
            S["snh_faq"] = copy.deepcopy(FAQ); del S[k]; d["order"][d["order"].index(k)] = "snh_faq"
        elif t == "related-products":
            v["settings"].update({"title": "You may also like", "subheading": "", "products_per_row_desktop": 4, "products_per_row_mobile": "2"})
    if "recently_viewed" not in S:
        S["recently_viewed"] = copy.deepcopy(RV)
    # order: main, apps (reviews), related, articles, recently viewed, then the rest as they were
    first = [k for k in d["order"] if S[k]["type"] == "main-product"]
    apps = [k for k in d["order"] if S[k]["type"] == "apps"]
    rel_p = [k for k in d["order"] if S[k]["type"] == "related-products"]
    arts = [k for k in d["order"] if S[k]["type"] == "snh-related-articles"]
    rest = [k for k in d["order"] if k not in first + apps + rel_p + arts + ["recently_viewed"]]
    d["order"] = first + apps + rel_p + arts + ["recently_viewed"] + rest
    save(rel, head, d)
    print(p.name, " > ".join(S[k]["type"] + ("(off)" if S[k].get("disabled") else "") for k in d["order"]))
