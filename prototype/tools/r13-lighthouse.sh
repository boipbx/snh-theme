#!/bin/bash
# Round 13 (from r12-lighthouse.sh, v2 preview): Lighthouse mobile (default throttling: simulated slow 4G, 4x CPU) on the SNH Dev preview, preview bar hidden
# (pb=0, it doesn't exist in production), performance only. RUNS runs per page (default 3); prints the median run.
#   LH=<lighthouse bin> CHROME_PATH=<chromium> [RUNS=3] prototype/tools/r13-lighthouse.sh <label>
# Writes prototype/shots/r13/lighthouse/<label>-<page>-<n>.json and <label>.md.
OUT=prototype/shots/r13/lighthouse; mkdir -p $OUT
P="preview_theme_id=189832462590&pb=0"; RUNS=${RUNS:-3}
for pair in "home|https://sports-nutrition-hub.myshopify.com/?$P" "collection|https://sports-nutrition-hub.myshopify.com/collections/whey-protein?$P" "product|https://sports-nutrition-hub.myshopify.com/products/applied-nutrition-critical-whey-2kg?$P"; do
  name=${pair%%|*}; url=${pair#*|}
  for n in $(seq 1 $RUNS); do
    $LH "$url" --only-categories=performance --form-factor=mobile --output=json --output-path=$OUT/$1-$name-$n.json --chrome-flags="--headless=new --no-sandbox" --quiet >/dev/null 2>&1
  done
done
python3 - "$OUT" "$1" <<'PY'
import json,sys,glob,statistics
out,label=sys.argv[1],sys.argv[2]; rows=['# Lighthouse mobile, '+label,'','Median of the runs (by LCP). Slow 4G + 4x CPU (Lighthouse default), preview bar hidden.','','| page | score | LCP | FCP | TBT | CLS | Speed Index | weight (MB) | bytes before LCP (MB) | requests | runs (LCP) |','|---|---|---|---|---|---|---|---|---|---|---|']
for name in ['home','collection','product']:
    runs=[]
    for f in sorted(glob.glob(f'{out}/{label}-{name}-*.json')):
        d=json.load(open(f)); a=d['audits']; it=a['network-requests']['details']['items']; lcp=a['largest-contentful-paint']['numericValue']
        runs.append(dict(score=round(d['categories']['performance']['score']*100),lcp=lcp,fcp=a['first-contentful-paint']['numericValue'],tbt=a['total-blocking-time']['numericValue'],cls=a['cumulative-layout-shift']['numericValue'],si=a['speed-index']['numericValue'],w=a['total-byte-weight']['numericValue']/1e6,pre=sum(i.get('transferSize',0) for i in it if i.get('networkRequestTime',0)<lcp)/1e6,req=len(it)))
    runs.sort(key=lambda r:r['lcp']); m=runs[len(runs)//2]
    rows.append(f"| {name} | {m['score']} | {m['lcp']/1000:.1f}s | {m['fcp']/1000:.1f}s | {m['tbt']:.0f}ms | {m['cls']:.3f} | {m['si']/1000:.1f}s | {m['w']:.2f} | {m['pre']:.2f} | {m['req']} | {', '.join(f'{r['lcp']/1000:.1f}' for r in runs)} |")
open(f'{out}/{label}.md','w').write('\n'.join(rows)+'\n'); print('\n'.join(rows))
PY
