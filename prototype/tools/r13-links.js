// Round 13: crawl the internal links of the home page (header menus incl. mega menu, mobile menu, footer, body) on
// the preview; GET each once (throttled, retried on 429) and list anything that isn't 200 → shots/r13/6/links.md
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const HOST = 'https://sports-nutrition-hub.myshopify.com', Q = 'preview_theme_id=189832462590';
const OUT = path.join(__dirname, '..', 'shots', 'r13', '6'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch(), p = await b.newPage();
  await p.goto(HOST + '/?' + Q, { waitUntil: 'load', timeout: 90000 });
  const links = await p.evaluate(() => [...new Set([...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => h && /^\/(?!\/)/.test(h) && !/^\/(cart\/|account\/logout|checkout)/.test(h)).map((h) => h.split('#')[0]).filter(Boolean))]);
  const bad = [], ok = [];
  for (const h of links) {
    let st = 0;
    for (let i = 0; i < 5; i++) {
      const r = await p.request.get(HOST + h + (h.includes('?') ? '&' : '?') + Q, { maxRedirects: 5, timeout: 60000 }).catch(() => null);
      st = r ? r.status() : 0; if (st !== 429) break; await new Promise((x) => setTimeout(x, 8000 * (i + 1)));
    }
    (st === 200 ? ok : bad).push([st, h]);
    await new Promise((x) => setTimeout(x, 700));
  }
  const md = ['# Internal links from the home page (preview)', '', `${links.length} links · ${ok.length} OK · ${bad.length} not OK`, '', ...bad.map(([s, h]) => `- ${s} ${h}`)];
  fs.writeFileSync(path.join(OUT, 'links.md'), md.join('\n') + '\n');
  console.log(md.slice(2).join('\n'));
  await b.close();
})();
