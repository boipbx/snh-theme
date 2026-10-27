// Round 5 (polish): screenshots of SNH Dev (:9292) at 390/768/1280/1440 for design review.
//   PW=<playwright> node prototype/tools/r5-shot.js <label> <path> [selector|viewport|full] [widths] [scrollY]
// selector: element screenshot (scrolled into view, lazy content given time to load); viewport: the fold;
// full: the whole page. Output: prototype/shots/r5/<label>-<w>.jpg. Prints page errors (ours) and overflow.
const { chromium } = require(process.env.PW || 'playwright');
const fs = require('fs');
const path = require('path');
const [label, pth = '/', target = 'viewport', widthsArg = '390,768,1280,1440', scrollY = '0'] = process.argv.slice(2);
const OUT = path.join(__dirname, '..', 'shots', 'r5');
fs.mkdirSync(OUT, { recursive: true });
const DEV = process.env.DEV || 'http://127.0.0.1:9292';
const HIDE = '.shopify-section--popup,#preview-bar-iframe,#PBarNextFrameWrapper,privacy-bar,.toast{display:none!important}';
const THIRD = /amose|wpm\/|klaviyo|judge|jdgm|trafficly|clarity|appstle|shop\.app|google|facebook|tiktok|origin_trials|hoppy/i;

(async () => {
  const b = await chromium.launch();
  for (const w of widthsArg.split(',').map(Number)) {
    const ctx = await b.newContext({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 800, hasTouch: w < 800 });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', e => { const s = e.message + ' ' + (e.stack || ''); if (!THIRD.test(s)) errs.push(e.message.slice(0, 160)); });
    await p.goto(DEV + pth, { waitUntil: 'load', timeout: 120000 }).catch(() => {});
    await p.addStyleTag({ content: HIDE }).catch(() => {});
    await p.waitForTimeout(1500);
    const file = `${OUT}/${label}-${w}.jpg`;
    if (target === 'full') {
      await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } scrollTo(0, 0); });
      await p.waitForTimeout(1200);
      await p.screenshot({ path: file, type: 'jpeg', quality: 60, fullPage: true });
    } else if (target === 'viewport') {
      if (+scrollY) { await p.evaluate(y => scrollTo(0, y), +scrollY); await p.waitForTimeout(1200); }
      await p.screenshot({ path: file, type: 'jpeg', quality: 65 });
    } else {
      // element shots: keep the sticky header out of the frame
      await p.addStyleTag({ content: '.snh-hdr-sec{position:relative!important;top:0!important}' }).catch(() => {});
      const el = await p.$(target);
      if (!el) { console.log(`${w}: selector not found ${target}`); await ctx.close(); continue; }
      await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(1800);
      const box = await el.boundingBox();
      console.log(`${w}: ${Math.round(box.width)}×${Math.round(box.height)}`);
      await el.screenshot({ path: file, type: 'jpeg', quality: 65 });
    }
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (ov > 1) console.log(`${w}: OVERFLOW ${ov}px`);
    if (errs.length) console.log(`${w}: errors ${[...new Set(errs)].join(' | ')}`);
    await ctx.close();
  }
  await b.close();
})();
