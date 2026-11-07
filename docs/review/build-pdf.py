"""Render the review markdown files to branded A4 PDFs (SNH logo, ink #0E0E0E, orange accent).
Usage: python3 docs/review/build-pdf.py <logo.png>   (needs: pip install markdown; Playwright + Chromium)"""
import base64, pathlib, subprocess, sys, markdown
HERE = pathlib.Path(__file__).parent
logo = base64.b64encode(pathlib.Path(sys.argv[1]).read_bytes()).decode()
CSS = """
@page { size: A4; margin: 18mm 16mm 18mm 16mm; }
* { box-sizing: border-box; }
body { font-family: Inter, 'Helvetica Neue', Arial, sans-serif; color: #0E0E0E; font-size: 10.5pt; line-height: 1.5; margin: 0; }
.brand { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #BF4512; padding-bottom: 10px; margin-bottom: 18px; }
.brand img { height: 30px; }
.brand span { font-size: 9pt; color: #5C574F; letter-spacing: .08em; text-transform: uppercase; }
h1 { font-size: 23pt; line-height: 1.1; margin: 0 0 6px; letter-spacing: -.02em; }
h1 + p { color: #5C574F; margin-top: 0; }
h2 { font-size: 14.5pt; margin: 22px 0 8px; padding-top: 4px; color: #0E0E0E; border-top: 1px solid #E3DCD0; }
h2::before { content: ""; display: inline-block; width: 8px; height: 8px; background: #BF4512; border-radius: 2px; margin-right: 8px; vertical-align: middle; }
h3 { font-size: 11.5pt; margin: 14px 0 6px; color: #BF4512; }
p, li { orphans: 3; widows: 3; }
ul, ol { padding-left: 20px; margin: 6px 0; }
li { margin: 2px 0; }
table { width: 100%; border-collapse: collapse; margin: 8px 0 12px; font-size: 9pt; page-break-inside: auto; }
thead { display: table-header-group; }
tr { page-break-inside: avoid; }
thead { display: table-header-group; }
.keep { break-inside: avoid; page-break-inside: avoid; }
th { background: #0E0E0E; color: #fff; text-align: left; padding: 6px 7px; font-weight: 700; }
td { padding: 5px 7px; border-bottom: 1px solid #E3DCD0; vertical-align: top; }
tr:nth-child(even) td { background: #F6F4F1; }
code { font-family: 'SFMono-Regular', Consolas, monospace; font-size: 8.5pt; background: #F5F2EC; padding: 1px 4px; border-radius: 3px; }
strong { color: #0E0E0E; }
em { color: #5C574F; }
"""
for name, label in [("collections-and-tags", "Collections & tags"), ("email-automations", "Email automations")]:
    md = (HERE / f"{name}.md").read_text()
    body = markdown.markdown(md, extensions=["tables"])
    # keep each heading on the same page as the block that follows it
    import re
    body = re.sub(r'(<h([23])>[^<]*</h\2>\s*(?:<p>(?:(?!</p>).)*</p>\s*)?<(table|ol|ul)>.*?</\3>)', r'<div class="keep">\1</div>', body, flags=re.S)
    html = f"<!doctype html><html><head><meta charset='utf-8'><title>{label}</title><style>{CSS}</style></head><body><div class='brand'><img src='data:image/png;base64,{logo}' alt='SNH'><span>Sports Nutrition Hub · launch review</span></div>{body}</body></html>"
    out = HERE / f"{name}.html"; out.write_text(html)
    js = f"""const {{ chromium }} = require('playwright');(async()=>{{const b=await chromium.launch();const p=await b.newPage();await p.goto('file://{out}');await p.pdf({{path:'{HERE / (name + '.pdf')}',format:'A4',printBackground:true,displayHeaderFooter:true,headerTemplate:'<span></span>',footerTemplate:'<div style="font-size:8px;width:100%;text-align:center;color:#5C574F;font-family:Arial">{label} · page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',margin:{{top:'16mm',bottom:'18mm',left:'16mm',right:'16mm'}}}});await b.close();}})();"""
    subprocess.run(["node", "-e", js], check=True)
    out.unlink()
    print("wrote", name + ".pdf")
