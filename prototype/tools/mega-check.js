// Round 4 mega menu / search / mobile drill-down checks + shots.  node tools/mega-check.js
const { chromium } = require(process.env.PW || 'playwright');
const OUT = require('path').join(__dirname, '..', 'shots', process.env.ROUND || 'round4');
let fails = 0;
const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
(async () => {
  const b = await chromium.launch();
  for (const w of [1024, 1280, 1440]) {
    const p = await (await b.newContext({ viewport: { width: w, height: 900 } })).newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://127.0.0.1:8099/product.html', { waitUntil: 'networkidle' });
    const nav = await p.evaluate(() => { const n = document.querySelector('.nav__list').getBoundingClientRect(), l = document.querySelector('.hdr__logo').getBoundingClientRect(), i = document.querySelector('.hdr__icons').getBoundingClientRect(); return { gapL: Math.round(n.left - l.right), gapR: Math.round(i.left - n.right), one: [...document.querySelectorAll('.nav__btn,.nav__link')].every(x => x.getBoundingClientRect().height <= 41 && x.scrollWidth <= x.clientWidth + 1) && document.querySelector('.hdr__logo img').getBoundingClientRect().width > 80 }; });
    ok(nav.gapL > 8 && nav.gapR > 8 && nav.one, `${w}: nav fits on one line (gaps ${nav.gapL}/${nav.gapR})`);
    for (const id of ['supplements', 'vitamins', 'sports', 'accessories', 'brands', 'offers']) {
      await p.hover(`[data-mega="mega-${id}"]`); await p.waitForTimeout(450);
      await p.evaluate(() => document.querySelectorAll('.mega img').forEach(i => i.loading = 'eager'));
      await p.waitForTimeout(600);
      const m = await p.evaluate(id => {
        const pn = document.getElementById('mega-' + id), r = pn.getBoundingClientRect();
        const over = [...pn.querySelectorAll('*')].filter(e => { const q = e.getBoundingClientRect(); return q.width && (q.right > innerWidth + 1 || (q.bottom > r.bottom + 1 && !e.closest('.az__groups'))); }).map(e => e.className).slice(0, 4);
        return { open: !pn.hidden && pn.classList.contains('is-open'), h: Math.round(r.height), vh: innerHeight, scroll: pn.scrollHeight > pn.clientHeight + 1, over, under: getComputedStyle(document.querySelector(`[data-mega="mega-${id}"]`), '::after').transform };
      }, id);
      ok(m.open && !m.scroll && !m.over.length, `${w} ${id}: panel open, ${m.h}px (${Math.round(m.h / m.vh * 100)}vh), no overflow${m.over.length ? ' — ' + m.over.join(',') : ''}${m.scroll ? ' — scrolls' : ''}`);
      ok(m.under !== 'none' && m.under.indexOf('matrix(0') !== 0, `${w} ${id}: orange underline on the active item`);
      if (w !== 1024) await p.screenshot({ path: `${OUT}/p4-mega-${id}-${w}.png`, clip: { x: 0, y: 0, width: w, height: Math.min(900, m.h + 120) } });
    }
    // brands filter
    await p.hover('[data-mega="mega-brands"]'); await p.waitForTimeout(400);
    await p.fill('#mega-brands [data-az-filter]', 'raw');
    const vis = await p.evaluate(() => [...document.querySelectorAll('#mega-brands li[data-name]')].filter(l => !l.hidden).map(l => l.dataset.name));
    ok(vis.length === 1 && vis[0] === 'raw nutrition', `${w}: brand filter "raw" → ${JSON.stringify(vis)}`);
    await p.mouse.move(w / 2, 880); await p.waitForTimeout(400);
    // keyboard: focus first nav item, Enter opens + focuses into the panel, ArrowRight moves, Esc closes and returns focus
    await p.focus('[data-mega="mega-supplements"]'); await p.keyboard.press('Enter'); await p.waitForTimeout(250);
    const k1 = await p.evaluate(() => ({ open: document.getElementById('mega-supplements').classList.contains('is-open'), inside: !!document.activeElement.closest('#mega-supplements') }));
    ok(k1.open && k1.inside, `${w}: Enter opens panel and moves focus inside`);
    await p.keyboard.press('Escape'); await p.waitForTimeout(250);
    const k2 = await p.evaluate(() => ({ open: !!document.querySelector('.mega.is-open'), f: document.activeElement.dataset.mega }));
    ok(!k2.open && k2.f === 'mega-supplements', `${w}: Esc closes and returns focus to the item`);
    await p.keyboard.press('ArrowRight');
    ok(await p.evaluate(() => document.activeElement.dataset.mega === 'mega-vitamins'), `${w}: ArrowRight moves to the next item`);
    // search
    await p.click('.hdr__icons [data-open-search]'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.activeElement.id === 'srch-q'), `${w}: search opens with focus in the field`);
    if (w === 1440) await p.screenshot({ path: `${OUT}/p4-search-empty-${w}.png` });
    await p.keyboard.type('creatine'); await p.waitForTimeout(900);
    const s = await p.evaluate(() => ({ p: document.querySelectorAll('[data-r="p"] .mini').length, c: document.querySelectorAll('[data-r="c"] a').length, a: document.querySelectorAll('[data-r="a"] a').length }));
    ok(s.p > 0 && s.c > 0 && s.a > 0, `${w}: "creatine" → ${s.p} products, ${s.c} collections, ${s.a} articles`);
    if (w === 1440) { await p.waitForTimeout(800); await p.screenshot({ path: `${OUT}/p4-search-results-${w}.png` }); }
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.getElementById('srch').hidden), `${w}: Esc closes search`);
    ok(!errs.length, `${w}: no JS errors ${errs.join('|')}`);
    await p.context().close();
  }
  for (const w of [390, 768]) {
    const p = await (await b.newContext({ viewport: { width: w, height: 844 }, isMobile: true, hasTouch: true })).newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://127.0.0.1:8099/', { waitUntil: 'networkidle' });
    await p.tap('.hdr__menu'); await p.waitForTimeout(450);
    await p.evaluate(() => document.querySelectorAll('.mmenu img').forEach(i => i.loading = 'eager')); await p.waitForTimeout(800);
    await p.screenshot({ path: `${OUT}/p4-mobile-root-${w}.png` });
    await p.tap('[data-level="mm-supplements"]'); await p.waitForTimeout(450);
    const lv = await p.evaluate(() => { const l = document.getElementById('mm-supplements'), r = l.getBoundingClientRect(); return { on: l.classList.contains('is-on'), left: Math.round(r.left), title: l.querySelector('.mm__head p').textContent }; });
    ok(lv.on && lv.left === 0, `${w}: tap Supplements slides to its level (${lv.title})`);
    await p.screenshot({ path: `${OUT}/p4-mobile-level-${w}.png` });
    await p.tap('#mm-supplements [data-tab="1"]'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => !document.querySelector('#mm-supplements [data-pane="1"]').hidden && document.querySelector('#mm-supplements [data-pane="0"]').hidden), `${w}: need/type tabs switch`);
    await p.screenshot({ path: `${OUT}/p4-mobile-type-${w}.png` });
    await p.evaluate(() => document.querySelector('#mm-supplements .mm__scroll').scrollTo(0, 99999)); await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/p4-mobile-bottom-${w}.png` });
    await p.tap('#mm-supplements .mm__back'); await p.waitForTimeout(450);
    ok(await p.evaluate(() => document.getElementById('mm-root').classList.contains('is-on') && !document.getElementById('mm-supplements').classList.contains('is-on')), `${w}: back arrow returns to the top level`);
    await p.tap('[data-level="mm-brands"]'); await p.waitForTimeout(450);
    await p.screenshot({ path: `${OUT}/p4-mobile-brands-${w}.png` });
    await p.tap('#mm-brands .mm__back'); await p.waitForTimeout(400);
    await p.tap('[data-level="mm-offers"]'); await p.waitForTimeout(450);
    await p.screenshot({ path: `${OUT}/p4-mobile-offers-${w}.png` });
    await p.tap('#mm-offers .mm__back'); await p.waitForTimeout(400);
    await p.tap('.mmenu__search'); await p.waitForTimeout(400);
    await p.keyboard.type('magnesium'); await p.waitForTimeout(900);
    const s = await p.evaluate(() => { const r = document.getElementById('srch').getBoundingClientRect(); const top = document.elementFromPoint(innerWidth / 2, 200); return { full: Math.round(r.height) >= innerHeight - 1 && !!top.closest('#srch'), z: +getComputedStyle(document.getElementById('srch')).zIndex, p: document.querySelectorAll('[data-r="p"] .mini').length, sw: document.documentElement.scrollWidth <= innerWidth }; });
    ok(s.full && s.p > 0 && s.sw, `${w}: search from the menu works full-screen (${s.p} products)`);
    await p.waitForTimeout(600); await p.screenshot({ path: `${OUT}/p4-mobile-search-${w}.png` });
    ok(!errs.length, `${w}: no JS errors ${errs.join('|')}`);
    await p.context().close();
  }
  await b.close();
  console.log(fails ? `\n${fails} FAIL` : '\nALL PASS');
  process.exitCode = fails ? 1 : 0;
})();
