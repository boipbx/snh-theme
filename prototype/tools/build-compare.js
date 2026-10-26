// Round 5 (theme build): side-by-side screenshots, prototype (:8099) left vs SNH Dev through `shopify theme dev` (:9292) right.
//   PW=<playwright path> node prototype/tools/build-compare.js <label> [pages=home] [widths=390,1440] [full=1]
// Writes prototype/shots/build/<label>-<page>-<w>-{fold,full}.jpg plus each side alone, and prints console errors per side.
const { chromium } = require(process.env.PW || 'playwright');
const fs = require('fs');
const path = require('path');
const [label = 'cmp', pagesArg = 'home', widthsArg = '390,1440', fullArg = '1'] = process.argv.slice(2);
const OUT = path.join(__dirname, '..', 'shots', 'build');
fs.mkdirSync(OUT, { recursive: true });
const PROTO = 'http://127.0.0.1:8099';
const DEV = 'http://127.0.0.1:9292';
const PAGES = {
  home: ['/', '/'],
  product: ['/product.html', '/products/applied-nutrition-critical-whey-2kg'],
  sis: [null, '/products/sis-go-isotonic-energy-gel'],
  raw: [null, '/products/raw-cbum-itholate-protein'],
};

async function shoot(b, url, w, full, tag) {
  const h = w < 800 ? 844 : 900;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 800, hasTouch: w < 800, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  await p.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(e => errs.push('goto: ' + e.message.slice(0, 120)));
  await p.addStyleTag({ content: '.shopify-section--popup,#shopify-pc__banner,#preview-bar-iframe,#PBarNextFrameWrapper,.shopify-preview-bar{display:none!important}' }).catch(() => {});
  await p.evaluate(() => {
    document.querySelectorAll('[data-carousel],[data-v2="carousel"]').forEach(x => x.classList.add('is-paused'));
    document.querySelectorAll('newsletter-popup, .newsletter-popup, privacy-bar').forEach(x => x.remove());
  });
  await p.waitForTimeout(3500);
  const fold = await p.screenshot({ type: 'jpeg', quality: 70 });
  let whole = null;
  if (full) {
    await p.evaluate(async () => {
      document.querySelectorAll('.reveal, .v-reveal, .ftr__mark, .snh-reveal').forEach(el => el.classList.add('is-in'));
      document.querySelectorAll('img[loading="lazy"]').forEach(i => { i.loading = 'eager'; });
      document.querySelectorAll('.sticky-atc').forEach(s => { s.style.display = 'none'; });
      for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); }
      window.scrollTo(0, 0);
    });
    await p.waitForTimeout(1500);
    whole = await p.screenshot({ type: 'jpeg', quality: 55, fullPage: true });
  }
  await ctx.close();
  return { fold, whole, errs };
}

async function pair(b, left, right, w, file) {
  const ctx = await b.newContext({ viewport: { width: w * 2 + 24, height: 400 } });
  const p = await ctx.newPage();
  const src = buf => buf ? 'data:image/jpeg;base64,' + buf.toString('base64') : '';
  await p.setContent(`<body style="margin:0;background:#888;display:flex;gap:24px;align-items:flex-start;font:12px sans-serif">
    <div><div style="padding:4px;background:#000;color:#fff">PROTOTYPE</div><img src="${src(left)}" style="display:block;width:${w}px"></div>
    <div><div style="padding:4px;background:#E0521C;color:#fff">SNH DEV (9292)</div><img src="${src(right)}" style="display:block;width:${w}px"></div></body>`);
  await p.waitForTimeout(300);
  await p.screenshot({ path: file, type: 'jpeg', quality: 60, fullPage: true });
  await ctx.close();
}

(async () => {
  const b = await chromium.launch();
  for (const name of pagesArg.split(',')) {
    const [pp, dp] = PAGES[name] || [name, name];
    for (const w of widthsArg.split(',').map(Number)) {
      const full = fullArg === '1';
      const L = pp ? await shoot(b, PROTO + pp, w, full) : { fold: null, whole: null, errs: [] };
      const R = await shoot(b, DEV + dp, w, full);
      const base = `${OUT}/${label}-${name}-${w}`;
      await pair(b, L.fold, R.fold, w, base + '-fold.jpg');
      if (full) {
        fs.writeFileSync(base + '-dev-full.jpg', R.whole);
        if (L.whole) fs.writeFileSync(base + '-proto-full.jpg', L.whole);
      }
      console.log(`${name} ${w}: dev errors ${R.errs.length}${R.errs.length ? '\n  ' + R.errs.slice(0, 6).join('\n  ') : ''}`);
    }
  }
  await b.close();
})();
