// Round 3 screenshots + layout checks.  node tools/shoot.js <label> [pages=home,product] [widths=390,768,1440]
// Run from prototype/ with the static server on :8099 and Playwright installed (scratch install is fine).
const { chromium } = require(process.env.PW || 'playwright');
const fs = require('fs');
const path = require('path');
const [label = 'shot', pagesArg = 'home,product', widthsArg = '390,768,1280,1440'] = process.argv.slice(2);
const OUT = path.join(__dirname, '..', 'shots', process.env.ROUND || 'round4');
fs.mkdirSync(OUT, { recursive: true });
const PAGES = { home: '/', product: '/product.html' };

(async () => {
  const b = await chromium.launch();
  let problems = 0;
  for (const name of pagesArg.split(',')) {
    for (const w of widthsArg.split(',').map(Number)) {
      const h = w < 800 ? 844 : 900;
      const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 800, hasTouch: w < 800 });
      const p = await ctx.newPage();
      const errs = [];
      p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
      p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
      await p.goto('http://127.0.0.1:8099' + PAGES[name], { waitUntil: 'networkidle', timeout: 90000 });
      await p.evaluate(() => document.querySelectorAll('[data-carousel]').forEach(h => h.classList.add('is-paused')));
      await p.waitForTimeout(1200);
      await p.screenshot({ path: `${OUT}/${label}-${name}-${w}-fold.png` });
      // reveal everything + load lazy images for the full-page shot
      await p.evaluate(async () => {
        document.querySelectorAll('.reveal, .ftr__mark').forEach(el => el.classList.add('is-in'));
        document.querySelectorAll('img[loading="lazy"]').forEach(i => { i.loading = 'eager'; });
        document.querySelectorAll('.sticky-atc').forEach(s => { s.style.display = 'none'; });
        for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); }
        window.scrollTo(0, 0);
      });
      await p.waitForTimeout(2500);
      await p.waitForFunction(() => [...document.images].every(i => i.complete), null, { timeout: 30000 }).catch(() => {});
      await p.screenshot({ path: `${OUT}/${label}-${name}-${w}-full.jpg`, fullPage: true, type: 'jpeg', quality: 78 });
      const m = await p.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const scrollers = '.rail,.quotes,.grid--rail,.promos,.goals,.tabs,.gallery__track,.ticker,.ftr__mark,.announce,.hs__list,.logos__track,.mrail,.pdp-thumbs,.pills-scroll';
        const clipped = e => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const s = getComputedStyle(a); if (/(hidden|clip|auto|scroll)/.test(s.overflowX)) return true; } return false; };
        const wide = [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > vw + 1 && !e.closest(scrollers) && getComputedStyle(e).position !== 'fixed' && !clipped(e); }).slice(0, 6).map(e => e.tagName + '.' + String(e.className).slice(0, 40));
        const broken = [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.src.slice(-70));
        return { scrollW: document.documentElement.scrollWidth, vw, H: document.documentElement.scrollHeight, wide, broken };
      });
      const bad = m.scrollW > m.vw || m.wide.length || m.broken.length || errs.length;
      if (bad) problems++;
      console.log(`${bad ? 'PROBLEM' : 'ok     '} ${name} ${w}  height ${m.H}  scrollW ${m.scrollW}/${m.vw}${m.wide.length ? '  wide: ' + m.wide.join(', ') : ''}${m.broken.length ? '  broken: ' + m.broken.join(', ') : ''}${errs.length ? '  errors: ' + errs.join(' | ') : ''}`);
      await ctx.close();
    }
  }
  await b.close();
  process.exitCode = problems ? 1 : 0;
})();
