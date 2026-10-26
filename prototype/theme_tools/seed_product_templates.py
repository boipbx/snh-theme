"""Round 5 phase 5: write the SNH v2 product-page settings into every product template's main-product instance
(new schema defaults do not apply to section instances that already exist in JSON templates), and add the
related-articles section after the main section when asked. Run once; the editor owns the values afterwards."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
V2 = {
    "v2_bundles": True,
    "v2_bundle_handles": "training-strength-bundles, daily-health-wellness-bundles, endurance-bundles, bundle-offers",
    "v2_details_eyebrow": "The details",
    "v2_details_heading": "Everything *inside*",
    "v2_details_lead": "What it does, how to use it and exactly what goes in.",
}
ARTICLES = {"type": "snh-related-articles", "settings": {"blog": "news", "fallback_blog": "news", "limit": 3, "eyebrow": "Learn more",
                                                         "heading": "Know what you're *taking*", "link_label": "All guides", "link_url": "/blogs/news"}}

for f in sorted((ROOT / "templates").glob("product*.json")):
    s = f.read_text()
    head, d = s[: s.index("{")], json.loads(s[s.index("{"):])
    main = next((k for k, v in d["sections"].items() if v["type"] == "main-product"), None)
    if not main:
        continue
    d["sections"][main].setdefault("settings", {}).update({k: v for k, v in V2.items() if k not in d["sections"][main]["settings"]})
    if "--articles" in sys.argv and "snh_articles" not in d["sections"]:
        d["sections"]["snh_articles"] = ARTICLES
        i = d["order"].index(main)
        d["order"].insert(i + 1, "snh_articles")
    f.write_text(head + json.dumps(d, indent=2, ensure_ascii=False) + "\n")
    print("updated", f.name)
