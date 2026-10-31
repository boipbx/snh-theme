// Round 14 P3: link crawl + console errors on the target theme (theme id asserted on every page opened).
// Collects internal links from home (header, mega menu, mobile menu, footer, body), a collection, a product, /cart,
// /pages/snh-elite, search and 404; GETs each once (preview cookie from the context, throttled, 429 retried).
// Console: errors / page errors on those pages, split into theme (our assets / inline) and third-party.
//   node prototype/tools/r14-links.js → shots/r14/p3/links.md
const { chromium, context, open, out } = require('./r14-lib.js');
const fs = require('fs'), path = require('path');
const OUT = out('p3'), D = 'https://www.sportsnutritionhub.lk';
const PAGES = ['/', '/collections/whey-protein', '/products/applied-nutrition-critical-whey-2kg', '/cart', '/pages/snh-elite', '/search?q=creatine', '/search?q=zzqxnothing', '/pages/this-does-not-exist', '/blogs/news', '/collections'];
(async () => {
  const b = await chromium.launch(), c = await context(b, 1440), p = await c.newPage();
  const errs = []; let cur = '';
  p.on('console', (m) => { if (m.type() === 'error') errs.push([cur, m.text().slice(0, 160), (m.location() || {}).url || '']); });
  p.on('pageerror', (e) => errs.push([cur, 'pageerror: ' + e.message.slice(0, 160), '']));
  const links = new Set();
  for (const pg of PAGES) {
    cur = pg; await open(p, pg); await p.waitForTimeout(3500);
    (await p.evaluate((D) => [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).map((h) => h.startsWith(D) ? h.slice(D.length) || '/' : h).filter((h) => /^\/(?!\/)/.test(h) && !/^\/(cart\/|account\/logout|checkout|cdn\/)/.test(h)).map((h) => h.split('#')[0]), D)).forEach((h) => h && links.add(h));
    await p.waitForTimeout(5000);
  }
  const bad = [], ok = [];
  for (const h of links) {
    let st = 0;
    for (let i = 0; i < 5; i++) {
      const r = await c.request.get(D + h, { maxRedirects: 5, timeout: 60000 }).catch(() => null);
      st = r ? r.status() : 0;
      if (st === 200 && r) { const t = (await r.text()).slice(0, 6000); if (/Verifying your connection|challenge-platform/.test(t)) st = 'cf'; }
      if (st !== 429 && st !== 'cf' && st !== 0) break; await new Promise((x) => setTimeout(x, 15000 * (i + 1)));
    }
    (st === 200 ? ok : bad).push([st, h]);
    await new Promise((x) => setTimeout(x, 900));
  }
  const ours = (e) => !e[2] || /\/cdn\/shop\/t\/|snh-|theme\.js/.test(e[2]) && !/apps|extensions/.test(e[2]);
  const theme = errs.filter((e) => ours(e) && !/Failed to load resource|importScripts|shop\.app|Amose|amose|klaviyo|judge|appstle|reputon|nosto|tagembed|google|facebook|tiktok/i.test(e[1] + e[2]));
  const md = ['# Links + console (Round 14, theme 189832462590)', '', `**Links:** ${links.size} internal links from ${PAGES.length} pages · ${ok.length} OK · ${bad.length} not OK`, '', ...bad.map(([s, h]) => `- ${s} ${h}`), '',
    `**Console:** ${errs.length} errors on ${PAGES.length} pages · theme: ${theme.length} · third-party / network: ${errs.length - theme.length}`, '', '| page | message | source |', '|---|---|---|', ...errs.map((e) => `| ${e[0]} | ${e[1].replace(/\|/g, '/')} | ${(e[2] || '').slice(0, 80)} |`)];
  fs.writeFileSync(path.join(OUT, 'links.md'), md.join('\n') + '\n');
  console.log(md.slice(2, 6 + bad.length).join('\n')); console.log('theme errors:', JSON.stringify(theme).slice(0, 600));
  await b.close();
})();
