// Final before/after set: shots/round3/{before,after}/<page>-<w>-{fold.png,full.jpg} + side-by-side folds.
const { chromium } = require(process.env.PW || 'playwright');
const fs = require('fs'); const path = require('path');
const OUT = path.join(__dirname, '..', 'shots', 'round3');
const SETS = [['before', 'http://127.0.0.1:8098'], ['after', 'http://127.0.0.1:8099']];
(async () => {
  const b = await chromium.launch();
  for (const [set, base] of SETS) {
    fs.mkdirSync(path.join(OUT, set), { recursive: true });
    for (const [name, url] of [['home', '/'], ['product', '/product.html']]) {
      for (const w of [390, 768, 1280, 1440]) {
        const p = await (await b.newContext({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 800, hasTouch: w < 800 })).newPage();
        await p.goto(base + url, { waitUntil: 'networkidle', timeout: 90000 });
        await p.evaluate(() => document.querySelectorAll('[data-carousel]').forEach(h => h.classList.add('is-paused')));
        await p.waitForTimeout(1500);
        await p.screenshot({ path: `${OUT}/${set}/${name}-${w}-fold.png` });
        await p.evaluate(async () => { document.querySelectorAll('.reveal, .ftr__mark').forEach(el => el.classList.add('is-in')); document.querySelectorAll('img[loading="lazy"]').forEach(i => { i.loading = 'eager'; }); document.querySelectorAll('.sticky-atc').forEach(s => { s.style.display = 'none'; }); for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 50)); } window.scrollTo(0, 0); });
        await p.waitForTimeout(2500);
        await p.screenshot({ path: `${OUT}/${set}/${name}-${w}-full.jpg`, fullPage: true, type: 'jpeg', quality: 75 });
        await p.context().close();
      }
    }
  }
  await b.close();
})();
