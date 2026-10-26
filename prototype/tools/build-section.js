// Round 5: one homepage section, prototype (:8099) vs SNH Dev (:9292), side by side, at each width.
//   PW=<playwright> node prototype/tools/build-section.js <label> <protoSelector> <devSelector> [widths=390,1440] [path=/]
// Output: prototype/shots/build/<label>-<w>.jpg. Prints both element sizes so height drift is visible.
const { chromium } = require(process.env.PW || 'playwright');
const fs = require('fs');
const path = require('path');
const [label, ps, ds, widthsArg = '390,1440', pth = '/'] = process.argv.slice(2);
const OUT = path.join(__dirname, '..', 'shots', 'build');
fs.mkdirSync(OUT, { recursive: true });
const HIDE = '.seg.is-on span::after{animation-play-state:paused!important}.shopify-section--popup,#preview-bar-iframe,#PBarNextFrameWrapper,.edit-toggle,privacy-bar,.toast{display:none!important}';

async function grab(b, url, sel, w) {
  const ctx = await b.newContext({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 800, hasTouch: w < 800 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await p.goto(url, { waitUntil: 'networkidle', timeout: 120000 }).catch(() => {});
  await p.addStyleTag({ content: HIDE });
  await p.evaluate(async () => {
    document.querySelectorAll('[data-carousel],[data-v2="carousel"]').forEach(x => x.classList.add('is-paused'));
    document.querySelectorAll('img[loading="lazy"]').forEach(i => { i.loading = 'eager'; });
    for (let y = 0; y < document.body.scrollHeight; y += 800) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); }
    document.querySelectorAll('.reveal, .v-reveal, .ftr__mark, .snh-reveal').forEach(el => el.classList.add('is-in'));
    window.scrollTo(0, 0);
  });
  await p.waitForTimeout(1200);
  const el = await p.$(sel);
  if (!el) { await ctx.close(); return { buf: null, box: null, errs: ['no element ' + sel] }; }
  if (!/hero/.test(sel)) await p.addStyleTag({ content: '.hdr,.snh-hdr-sec,[data-chrome],.announce,.ticker{visibility:hidden!important;opacity:0!important}' });
  await el.scrollIntoViewIfNeeded();
  await p.evaluate(() => document.querySelectorAll('.hero__progress').forEach(g => { const f = g.querySelector('.seg'); if (f) f.click(); }));
  await p.waitForTimeout(1400);
  const box = await el.boundingBox();
  const buf = await el.screenshot({ type: 'jpeg', quality: 70 }).catch(e => { errs.push(e.message.slice(0, 120)); return null; });
  await ctx.close();
  return { buf, box, errs };
}

(async () => {
  const b = await chromium.launch();
  for (const w of widthsArg.split(',').map(Number)) {
    const L = await grab(b, 'http://127.0.0.1:8099' + (pth === '/' ? '/' : pth.split('|')[0]), ps, w);
    const R = await grab(b, 'http://127.0.0.1:9292' + (pth === '/' ? '/' : (pth.split('|')[1] || pth)), ds, w);
    const ctx = await b.newContext({ viewport: { width: w * 2 + 24, height: 300 } });
    const p = await ctx.newPage();
    const src = x => x ? 'data:image/jpeg;base64,' + x.toString('base64') : '';
    await p.setContent(`<body style="margin:0;background:#777;display:flex;gap:24px;align-items:flex-start;font:12px sans-serif">
      <div><div style="padding:4px;background:#000;color:#fff">PROTOTYPE ${L.box ? Math.round(L.box.height) : '-'}px</div><img src="${src(L.buf)}" style="display:block;width:${w}px"></div>
      <div><div style="padding:4px;background:#E0521C;color:#fff">SNH DEV ${R.box ? Math.round(R.box.height) : '-'}px</div><img src="${src(R.buf)}" style="display:block;width:${w}px"></div></body>`);
    await p.waitForTimeout(200);
    await p.screenshot({ path: `${OUT}/${label}-${w}.jpg`, type: 'jpeg', quality: 62, fullPage: true });
    await ctx.close();
    console.log(`${label} ${w}: proto ${L.box ? Math.round(L.box.width) + 'x' + Math.round(L.box.height) : 'missing'} | dev ${R.box ? Math.round(R.box.width) + 'x' + Math.round(R.box.height) : 'missing'}${R.errs.length ? ' | dev: ' + R.errs.join('; ') : ''}`);
  }
  await b.close();
})();
