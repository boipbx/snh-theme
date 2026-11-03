// Round 18: preview screenshots of one section at 390 + 1440.
//   node prototype/tools/r18-shot.js <label> <path> <css selector> [widths=390,1440] [js to run before the shot]
// Asserts window.Shopify.theme.id === 189832462590. Output: prototype/shots/r18/<label>-<w>.png
const { chromium } = require(process.env.PW || '/Users/pabasaradissanayake/Documents/eisenbahn-ops/qa/node_modules/playwright');
const path = require('path'), fs = require('fs');
const [, , label, PATH = '/', SEL = 'body', W = '390,1440', PRE = ''] = process.argv;
const HOST = 'https://sports-nutrition-hub.myshopify.com', THEME = 189832462590;
const OUT = path.join(__dirname, '..', 'shots', 'r18'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch();
  for (const w of W.split(',').map(Number)) {
    const m = w < 800;
    const ctx = await b.newContext({ viewport: { width: w, height: m ? 844 : 900 }, isMobile: m, hasTouch: m, deviceScaleFactor: m ? 2 : 1 });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
    await p.goto(HOST + PATH + (PATH.includes('?') ? '&' : '?') + 'preview_theme_id=' + THEME + '&_r=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 90000 });
    await p.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
    const id = await p.evaluate(() => window.Shopify && Shopify.theme && Shopify.theme.id);
    if (id !== THEME) { console.log('WRONG THEME', id); process.exitCode = 1; }
    await p.evaluate(() => { document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; }); document.querySelectorAll('.reveal,[data-reveal]').forEach((e) => e.classList.add('is-in')); const s = document.createElement('style'); s.textContent = '#preview-bar-iframe,#PBarNextFrameWrapper{display:none!important}'; document.head.appendChild(s); });
    const el = SEL === 'body' ? null : await p.$(SEL);
    if (SEL !== 'body' && !el) { console.log(w, 'selector not found', SEL); continue; }
    if (el) { await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(1500); }
    if (PRE) { const r = await p.evaluate(PRE).catch((e) => 'PRE ERR ' + e.message); if (r !== undefined) console.log(w, 'pre:', JSON.stringify(r)); }
    await p.waitForTimeout(1200);
    const f = path.join(OUT, `${label}-${w}.png`);
    if (el) await el.screenshot({ path: f }); else await p.screenshot({ path: f, fullPage: !!process.env.FULL });
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    console.log(w, 'theme', id, 'overflowX', ov, errs.length ? 'errors: ' + errs.join(' | ') : '', '->', f);
    await ctx.close();
  }
  await b.close();
})();
