"""Round 5 decisions: global SNH Elite / contact / reviews settings, and templates pointed at them (one-off)."""
import json, re, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]

def load(p):
    s = (ROOT / p).read_text(); i = s.index("{") if not s.lstrip().startswith("[") else s.index("[")
    return s[:i], json.loads(s[i:])

def save(p, head, d):
    (ROOT / p).write_text(head + json.dumps(d, indent=2, ensure_ascii=False) + "\n")

# 1. settings schema
head, schema = load("config/settings_schema.json")
schema = [g for g in schema if g.get("name") not in ("SNH Elite", "SNH contact and reviews")]
schema.append({"name": "SNH Elite", "settings": [
    {"type": "paragraph", "content": "One place for the loyalty figures. The Elite band, Shop the Look points strip, product page points, cart, account and register pages all read these. Confirm the thresholds with the client: the register page says Rs 198,000 / 300,000, older sections used 200,000 / 500,000."},
    {"type": "range", "id": "snh_rate_bronze", "label": "Bronze earn rate", "min": 1, "max": 20, "step": 1, "unit": "%", "default": 3},
    {"type": "range", "id": "snh_rate_silver", "label": "Silver earn rate", "min": 1, "max": 20, "step": 1, "unit": "%", "default": 7},
    {"type": "range", "id": "snh_rate_gold", "label": "Gold earn rate", "min": 1, "max": 20, "step": 1, "unit": "%", "default": 10},
    {"type": "number", "id": "snh_silver_threshold", "label": "Silver from (Rs annual spend)", "default": 198000},
    {"type": "number", "id": "snh_gold_threshold", "label": "Gold from (Rs annual spend)", "default": 300000}]})
schema.append({"name": "SNH contact and reviews", "settings": [
    {"type": "text", "id": "snh_whatsapp", "label": "WhatsApp number", "default": "94764863359", "info": "Country code + number, no + or spaces. Used by the footer, product pages and every product template."},
    {"type": "header", "content": "Google rating"},
    {"type": "paragraph", "content": "Shown in the reviews section and the Why choose us stats. Leave empty to hide the rating line; never type a figure you can't point to."},
    {"type": "text", "id": "snh_rating_value", "label": "Rating (e.g. 4.8)"},
    {"type": "text", "id": "snh_rating_count", "label": "Number of reviews (e.g. 827)"},
    {"type": "text", "id": "snh_rating_source", "label": "Source", "default": "Google reviews"}]})
save("config/settings_schema.json", head, schema)

# 2. settings data: write the values so they apply without a schema default round trip
head, data = load("config/settings_data.json")
cur = data["current"] if isinstance(data["current"], dict) else data["presets"][data["current"]]
cur.update({"snh_rate_bronze": 3, "snh_rate_silver": 7, "snh_rate_gold": 10, "snh_silver_threshold": 198000,
            "snh_gold_threshold": 300000, "snh_whatsapp": "94764863359", "snh_rating_source": "Google reviews"})
save("config/settings_data.json", head, data)

# 3. homepage: no hard-coded rating
head, idx = load("templates/index.json")
for s in idx["sections"].values():
    if s["type"] == "snh-reviews":
        s["settings"]["rating_text"] = ""
        s["settings"]["heading"] = "Rated by *real* customers"
    if s["type"] == "snh-why-us":
        for b in s.get("blocks", {}).values():
            if b["type"] == "stat" and "review" in b["settings"].get("label", ""):
                b["settings"] = {"value": "", "label": "", "use_rating": True}
save("templates/index.json", head, idx)

# 4. product templates: WhatsApp from the theme setting
WA = "{{ settings.snh_whatsapp | remove: '+' | remove: ' ' }}"
for p in sorted((ROOT / "templates").glob("product*.json")):
    s = p.read_text()
    n = re.sub(r"wa\.me/\+?94\d{9}", "wa.me/" + WA.replace("'", "\\u0027") if False else "wa.me/" + WA, s)
    if n != s:
        p.write_text(n); print("whatsapp ->", p.name)
