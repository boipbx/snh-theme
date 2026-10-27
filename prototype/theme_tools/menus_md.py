"""Writes MENUS.md: the Shopify navigation menus to create, generated from the fallback links in the header and
footer groups (so the doc always matches what the site shows today)."""
import json, pathlib, re
ROOT = pathlib.Path(__file__).resolve().parents[2]
load = lambda p: (lambda t: json.loads(t[t.index("{"):]))((ROOT / p).read_text())
handle = lambda s: re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", s.lower().replace("&", "and"))).strip("-")
out = ["# Navigation menus to create", "",
       "The SNH header and footer show **fallback links** typed into the sections until a Shopify navigation menu is",
       "picked. To manage them in **Online Store → Navigation** instead, create each menu below (exact name, handle and",
       "links), then pick it in the section setting listed under it. Once a menu is picked its fallback lines are ignored,",
       "so the site looks the same until you change the menu.", "",
       "Tip: in Navigation, *Add menu item* → paste the link path (e.g. `/collections/whey-protein`) or search for the",
       "collection. Keep the order shown.", ""]
def table(lines):
    rows = ["| # | Label | Link |", "|---|---|---|"]
    for i, l in enumerate([x for x in lines.split("\n") if x.strip()], 1):
        lab, _, href = l.partition("|")
        rows.append(f"| {i} | {lab.strip()} | `{href.strip()}` |")
    return rows
hdr = load("sections/header-group.json")["sections"]["snh_header"]
out += ["## Header (Customize → Header → SNH header)", ""]
for bid in hdr["block_order"]:
    b = hdr["blocks"][bid]
    if b["type"] != "mega": continue
    st = b["settings"]
    for zone, key, title in (("need", "need_menu", "Zone 1 · shop by need"), ("type", "type_menu", "Zone 2 · shop by type")):
        name = f"{st['label']} · {st[zone + '_title']}"
        out += [f"### {name}", f"- **Handle:** `{handle(name)}`",
                f"- **Plug into:** *{st['label']}* mega menu block → *{title}* → **Menu**",
                f"- *View all* link stays in the block: `{st.get(zone + '_all', '')}`", ""]
        out += table(st.get(zone + "_links", "")) + [""]
ftr = load("sections/footer-group.json")["sections"]
ftr = next(v for v in ftr.values() if v["type"] == "snh-footer")
out += ["## Footer (Customize → Footer → SNH footer)", ""]
for bid in ftr["block_order"]:
    b = ftr["blocks"][bid]
    if b["type"] != "menu": continue
    name = f"Footer · {b['settings']['heading']}"
    out += [f"### {name}", f"- **Handle:** `{handle(name)}`",
            f"- **Plug into:** *Menu column* block \"{b['settings']['heading']}\" → **Menu**", ""]
    out += table(b["settings"].get("links", "")) + [""]
out += ["## Not menus", "",
        "- **Top brands** (zone 3 of each mega menu) and the **Brands A–Z** panel come from the *Brand* blocks in the header,",
        "  so logos and links stay together. Add a brand there, not in Navigation.",
        "- **Offers panel**, **announcements** and the **SNH Elite** link are header blocks too.",
        "- Store policy links in the footer come from **Settings → Policies** (turn on *Show store policy links*).", ""]
(ROOT / "MENUS.md").write_text("\n".join(out))
print(len(out), "lines")
