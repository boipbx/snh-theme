// Round 5 phase 6: Brands panel screenshots (desktop mega open + a hover preview; phone drill-down) and checks.
//   PW=<playwright> node prototype/tools/r5-brands-shot.js
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path');
const OUT = path.join(__dirname, '..', 'shots', 'r5');
const DEV = process.env.DEV || 'http://127.0.0.1:9292';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  for (const w of [1280, 1440]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 } }); const p = await ctx.newPage();
    await p.goto(DEV + '/collections/whey-protein', { waitUntil: 'load', timeout: 90000 });
    await p.addStyleTag({ content: '.shopify-section--popup,#preview-bar-iframe,privacy-bar{display:none!important}' });
    await p.waitForTimeout(1000);
    const btn = await p.$('.nav__btn[aria-label="Brands"]'); await btn.hover(); await p.waitForTimeout(700);
    if (await p.evaluate(() => ![...document.querySelectorAll('.mega')].some(x => !x.hidden))) await btn.click();
    await p.waitForTimeout(1500);
    await p.waitForFunction(() => { const m = [...document.querySelectorAll('.mega')].find(x => !x.hidden); return m && [...m.querySelectorAll('.az__ftiles .bmark')].every(x => x.classList.contains('is-fit')); }, null, { timeout: 8000 }).catch(() => {});
    const r = await p.evaluate(() => { const m = [...document.querySelectorAll('.mega')].find(x => !x.hidden); const az = m.querySelector('.az');
      const tiles = [...az.querySelectorAll('.az__ftiles .brand')]; const marks = [...az.querySelectorAll('.az__ftiles .bmark')];
      return { tiles: tiles.length, counts: az.querySelectorAll('.az__ftiles .brand__n').length, fit: marks.filter(x => x.classList.contains('is-fit')).length, markH: [...new Set(marks.map(x => Math.round(x.getBoundingClientRect().height)))],
        tileSizes: [...new Set(tiles.map(t => Math.round(t.getBoundingClientRect().width) + 'x' + Math.round(t.getBoundingClientRect().height)))], words: az.querySelectorAll('.az__ftiles .brand__word, .az__list .az__ini').length,
        inner: [...m.querySelectorAll('*')].filter(e => { const s = getComputedStyle(e); return /(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 2; }).map(e => e.className).slice(0, 3),
        cols: getComputedStyle(az.querySelector('.az__cols')).columnCount, links: az.querySelectorAll('.az__link').length };
    });
    ok(r.tiles === 6 && r.counts >= 5, `${w}: 6 featured tiles with product counts (${r.tiles}, ${r.counts} counts)`);
    ok(r.fit === r.tiles && r.markH.length === 1, `${w}: featured logos trimmed to one mark height (${r.fit}/${r.tiles}, ${r.markH})`);
    ok(r.tileSizes.length === 1, `${w}: uniform tiles ${r.tileSizes}`);
    ok(r.words === 0, `${w}: every brand has a real logo (${r.words} text fallbacks)`);
    ok(r.inner.length === 0, `${w}: no inner scrollbar in the panel (${r.inner})`);
    ok(+r.cols >= 3, `${w}: A–Z directory in ${r.cols} columns, ${r.links} brands`);
    await p.screenshot({ path: `${OUT}/brands-${w}.jpg`, type: 'jpeg', quality: 70 });
    const link = await p.$('.mega:not([hidden]) .az__link[data-brand="Dymatize"]'); await link.hover(); await p.waitForTimeout(1800);
    const pv = await p.evaluate(() => { const v = document.querySelector('.mega:not([hidden]) [data-az-pv]'); return { items: v.querySelectorAll('.az__pvl li').length, all: !!v.querySelector('.az__pvall'), h: v.querySelector('.mz__h') && v.querySelector('.mz__h').textContent }; });
    ok(pv.items >= 1 && pv.all, `${w}: hover preview "${pv.h}" with ${pv.items} products + Shop all`);
    const link2 = await p.$('.mega:not([hidden]) .az__link[data-brand="BSN"]'); await link2.hover(); await p.waitForTimeout(1800);
    const pv2 = await p.evaluate(() => document.querySelectorAll('.mega:not([hidden]) [data-az-pv] .az__pvl li').length);
    ok(pv2 >= 1, `${w}: vendor-filter brand preview (BSN) shows ${pv2} products`);
    await p.screenshot({ path: `${OUT}/brands-pv-${w}.jpg`, type: 'jpeg', quality: 70 });
    await p.fill('.mega:not([hidden]) [data-az-filter]', 'ry'); await p.waitForTimeout(300);
    const f = await p.evaluate(() => [...document.querySelectorAll('.mega:not([hidden]) .az__list li')].filter(l => !l.hidden).map(l => l.dataset.name));
    ok(f.length === 1 && f[0] === 'ryse', `${w}: search filters live ("ry" → ${f})`);
    await ctx.close();
  }
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage();
  await p.goto(DEV + '/', { waitUntil: 'load' }); await p.addStyleTag({ content: '.shopify-section--popup,#preview-bar-iframe,privacy-bar{display:none!important}' });
  await p.waitForTimeout(800); await p.click('.hdr__menu'); await p.waitForTimeout(600);
  const go = await p.$$('.mmenu .mm__go'); for (const g of go) { if (/Brands/.test(await g.textContent())) { await g.click(); break; } } await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/brands-390.jpg`, type: 'jpeg', quality: 70 });
  await ctx.close(); await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})();
