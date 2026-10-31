#!/bin/bash
# Round 14: Lighthouse mobile + desktop (performance + accessibility) on home, collection, product, cart of theme
# 189832462590, preview bar hidden (pb=0). RUNS per page (default 2), median by LCP. A run that landed on the Cloudflare
# challenge (no Shopify theme in the page) is dropped.
#   [RUNS=2] prototype/tools/r14-lighthouse.sh   → prototype/shots/r14/p3/lighthouse/*.json + lighthouse.md
LH=${LH:-prototype/shots/r14/tmp/cli/node_modules/.bin/lighthouse}; export CHROME_PATH=${CHROME_PATH:-/opt/pw-browsers/chromium-1243/chrome-linux64/chrome}
OUT=prototype/shots/r14/p3/lighthouse; mkdir -p $OUT; RUNS=${RUNS:-2}
B=https://sports-nutrition-hub.myshopify.com; P="preview_theme_id=189832462590&pb=0"
for ff in mobile desktop; do
  [ $ff = desktop ] && PRE="--preset=desktop" || PRE="--form-factor=mobile"
  for pair in "home|$B/?$P" "collection|$B/collections/whey-protein?$P" "product|$B/products/applied-nutrition-critical-whey-2kg?$P" "cart|$B/cart?$P"; do
    name=${pair%%|*}; url=${pair#*|}
    for n in $(seq 1 $RUNS); do
      $LH "$url" --only-categories=performance,accessibility $PRE --output=json --output-path=$OUT/$ff-$name-$n.json --chrome-flags="--headless=new --no-sandbox" --quiet >/dev/null 2>&1
      sleep 20
    done
  done
done
python3 - "$OUT" <<'PY'
import json,sys,glob
out=sys.argv[1]; rows=['# Lighthouse, Round 14 (theme 189832462590)','','Median of the runs by LCP. Mobile = Lighthouse default (slow 4G, 4x CPU); desktop = desktop preset. Runs that hit the Cloudflare challenge are dropped.','','| form | page | performance | accessibility | LCP | TBT | CLS | runs kept |','|---|---|---|---|---|---|---|---|']
for ff in ['mobile','desktop']:
  for name in ['home','collection','product','cart']:
    runs=[]
    for f in sorted(glob.glob(f'{out}/{ff}-{name}-*.json')):
      try: d=json.load(open(f))
      except Exception: continue
      a=d['audits']; reqs=a.get('network-requests',{}).get('details',{}).get('items',[])
      if not d['categories']['performance'].get('score') or not any('/cdn/shop/t/' in r.get('url','') or 'cdn.shopify.com' in r.get('url','') for r in reqs): continue
      runs.append(dict(p=round(d['categories']['performance']['score']*100),a=round((d['categories']['accessibility']['score'] or 0)*100),lcp=a['largest-contentful-paint']['numericValue'],tbt=a['total-blocking-time']['numericValue'],cls=a['cumulative-layout-shift']['numericValue']))
    if not runs: rows.append(f'| {ff} | {name} | blocked | | | | | 0 |'); continue
    runs.sort(key=lambda r:r['lcp']); m=runs[(len(runs)-1)//2]
    rows.append(f"| {ff} | {name} | {m['p']} | {m['a']} | {m['lcp']/1000:.1f}s | {m['tbt']:.0f}ms | {m['cls']:.3f} | {len(runs)} |")
open(f'{out}/../lighthouse.md','w').write('\n'.join(rows)+'\n'); print('\n'.join(rows))
PY
