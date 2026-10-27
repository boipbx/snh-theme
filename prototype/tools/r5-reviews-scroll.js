// Round 5 phase 5: scroll-through frames around the reviews section, from a fresh load (widget not yet loaded),
// plus the section's height and the layout shifts recorded on the way. Frames: prototype/shots/r5/rev-<w>-<n>.jpg
//   PW=<playwright> node prototype/tools/r5-reviews-scroll.js
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path');
const OUT = path.join(__dirname, '..', 'shots', 'r5');
const DEV = process.env.DEV || 'http://127.0.0.1:9292';
let fails = 0;
(async () => {
  const b = await chromium.launch();
  for (const w of [390, 1440]) {
    const ctx = await b.newContext({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 800, hasTouch: w < 800 });
    const p = await ctx.newPage();
    await p.addInitScript(() => { window.__cls = 0; window.__src = []; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) { window.__cls += e.value; (e.sources || []).forEach(s => s.node && window.__src.push(s.node.nodeName + '.' + String(s.node.className || '').slice(0, 30))); } }).observe({ type: 'layout-shift', buffered: true }); });
    await p.goto(DEV + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await p.waitForTimeout(800);
    await p.addStyleTag({ content: '.shopify-section--popup,#preview-bar-iframe,privacy-bar{display:none!important}' });
    const top = await p.evaluate(() => { const s = document.querySelector('[id$="__snh_reviews"]'); return s.getBoundingClientRect().top + scrollY; });
    await p.evaluate(() => { window.__cls = 0; window.__src = []; });
    const hs = [];
    let n = 0;
    for (let y = top - 1200; y <= top + 700; y += 190) {
      await p.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), y); await p.waitForTimeout(220);
      hs.push(await p.evaluate(() => Math.round(document.querySelector('[id$="__snh_reviews"]').getBoundingClientRect().height)));
      await p.screenshot({ path: `${OUT}/rev-${w}-${String(n++).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 45 });
    }
    await p.waitForTimeout(1500);
    hs.push(await p.evaluate(() => Math.round(document.querySelector('[id$="__snh_reviews"]').getBoundingClientRect().height)));
    const cls = await p.evaluate(() => ({ v: +window.__cls.toFixed(4), src: [...new Set(window.__src)].slice(0, 5) }));
    const steady = Math.max(...hs) - Math.min(...hs) <= 2;
    if (!steady || cls.v > 0.01) fails++;
    console.log(`${w}: reviews section height ${[...new Set(hs)].join('/')}px (${steady ? 'steady' : 'JUMPS'}), layout shift while scrolling ${cls.v} ${cls.src.join(', ')}; ${n} frames`);
    await ctx.close();
  }
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})();
