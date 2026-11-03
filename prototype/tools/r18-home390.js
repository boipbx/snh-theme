// R18 #7: homepage at 390, one screenshot per section + layout problems (elements past the viewport edge, tiny text).
//   node prototype/tools/r18-home390.js <outdir> [width=390]
const { chromium } = require(process.env.PW || '/Users/pabasaradissanayake/Documents/eisenbahn-ops/qa/node_modules/playwright');
const path = require('path');
const OUT = path.join(__dirname, '..', 'shots', 'r18', process.argv[2] || 'home390');
require('fs').mkdirSync(OUT, { recursive: true });
const W = Number(process.argv[3] || 390);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); await p.addInitScript(() => { try { localStorage.setItem('snh_sub', String(Date.now())); } catch (e) {} }); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 140)));
  await p.goto('https://sports-nutrition-hub.myshopify.com/?preview_theme_id=189832462590&_r=' + Date.now(), { waitUntil: 'load', timeout: 90000 });
  console.log('theme', await p.evaluate(() => Shopify.theme.id));
  await p.addStyleTag({ content: '#preview-bar-iframe,#PBarNextFrameWrapper{display:none!important}' });
  await p.evaluate(async () => {
    document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; });
    for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
    window.scrollTo(0, 0);
  });
  await p.waitForTimeout(2500);
  const secs = await p.$$('main .shopify-section');
  let k = 0;
  for (const s of secs) {
    const info = await s.evaluate((el, W) => {
      const r = el.getBoundingClientRect(); if (r.height < 4) return null;
      const bad = [];
      const clipped = (e) => { for (let a = e.parentElement; a && a !== el.parentElement; a = a.parentElement) { if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(a).overflowX)) return true; } return false; };
      el.querySelectorAll('*').forEach((e) => {
        const q = e.getBoundingClientRect(); if (!q.width || !q.height) return;
        const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.position === 'fixed') return;
        const name = (typeof e.className === 'string' && e.className ? e.className : e.tagName).slice(0, 40);
        if ((q.right > W + 1 || q.left < -1) && !clipped(e)) bad.push('overflow ' + name + ' ' + Math.round(q.left) + '..' + Math.round(q.right));
        if (e.children.length === 0 && e.textContent.trim() && parseFloat(cs.fontSize) < 11.5) bad.push('tiny ' + cs.fontSize + ' "' + e.textContent.trim().slice(0, 24) + '"');
      });
      return { id: el.id.replace('shopify-section-template--', '').slice(-28), h: Math.round(r.height), bad: [...new Set(bad)].slice(0, 8) };
    }, W);
    if (!info) continue;
    k++;
    await s.screenshot({ path: `${OUT}/${String(k).padStart(2, '0')}-${info.id.replace(/[^a-z0-9_-]/gi, '')}.png` }).catch(() => {});
    console.log(k, info.id, info.h, info.bad.join(' | '));
  }
  console.log('docOverflow', await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), errs.join(' | '));
  await b.close();
})();
