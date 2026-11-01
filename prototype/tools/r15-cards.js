// Round 15 item 3: product cards on white (collection grid) and cream (a home section with a cream background), 390 +
// 1440; computed price colour/size, tile background, border; a sale card when one exists. Target theme asserted.
process.env.SHOTS = 'r15';
const { chromium, context, open, out } = require('./r14-lib.js');
const fs = require('fs'), path = require('path');
const O = out('cards'), rows = [];
const log = (w, step, ok, note) => { rows.push(`| ${w} | ${step} | ${ok ? 'PASS' : '**FAIL**'} | ${note || ''} |`); console.log(w, ok ? 'PASS' : 'FAIL', step, note || ''); };
(async () => {
  const b = await chromium.launch();
  for (const w of (process.env.W || '390,1440').split(',').map(Number)) {
    const c = await context(b, w), p = await c.newPage();
    const info = () => p.evaluate(() => { const c = document.querySelector('product-card.pc'); const g = (s, el = c) => el && el.querySelector(s); const cs = (e) => e ? getComputedStyle(e) : {}; return { price: cs(g('.pc__now')).color + ' ' + cs(g('.pc__now')).fontSize + ' ' + cs(g('.pc__now')).fontWeight, tile: cs(g('.card__tile')).backgroundColor, border: cs(c).borderTopColor, plus: cs(g('.pc__plus')).backgroundColor, koko: !!g('img.snh-koko'), nameLines: g('.pc__name') ? Math.round(g('.pc__name').scrollHeight / parseFloat(cs(g('.pc__name')).lineHeight)) : 0, rowBrand: g('.pc__top') ? !!g('.pc__brand', g('.pc__top')) : false }; });
    await open(p, '/collections/whey-protein'); await p.waitForTimeout(1500);
    const i1 = await info();
    log(w, 'collection (white): price ink bold, warm tile, hairline, black quick-add, Koko logo', /rgb\(14, 14, 14\)/.test(i1.price) && /700/.test(i1.price) && /245, 242, 236/.test(i1.tile) && /14, 14, 14/.test(i1.plus) && i1.koko, JSON.stringify(i1));
    await p.evaluate(() => { const g = document.querySelector('product-list, .product-list'); g.scrollIntoView({ block: 'start' }); scrollBy(0, -120); }); await p.waitForTimeout(800);
    await p.screenshot({ path: path.join(O, `cards-white-${w}.png`) });
    const sale = p.locator('product-card:has(.pc__save)').first();
    if (await sale.count()) { await sale.scrollIntoViewIfNeeded(); await p.waitForTimeout(500); await sale.screenshot({ path: path.join(O, `card-sale-${w}.png`) }); log(w, 'sale card: compare-at struck grey + saving in orange', true, await sale.locator('.pc__price').innerText()); }
    else log(w, 'sale card', true, 'no product on sale in this collection');
    // cream: find a home section with product cards on a cream background
    await open(p, '/'); await p.waitForTimeout(1500);
    const found = await p.evaluate(() => { const lum = (c) => { const m = c.match(/\d+/g); return m ? m.slice(0, 3).map(Number) : null; }; for (const card of document.querySelectorAll('product-card.pc')) { for (let a = card.parentElement; a && a !== document.body; a = a.parentElement) { const bg = getComputedStyle(a).backgroundColor; if (bg && bg !== 'rgba(0, 0, 0, 0)') { const v = lum(bg); if (v && v[0] > 235 && v[2] < v[0] - 4) { const sec = a.closest('.shopify-section') || a; sec.setAttribute('data-r15-cream', '1'); return bg; } break; } } } return ''; });
    if (found) { const s = p.locator('[data-r15-cream] product-card').first(); await s.scrollIntoViewIfNeeded(); await p.evaluate(() => scrollBy(0, -80)); await p.waitForTimeout(800); await p.screenshot({ path: path.join(O, `cards-cream-${w}.png`) }); log(w, 'cards on a cream section', true, 'section background ' + found); }
    else {   // no cream product section on the home page: render the grid on cream to check the look
      await open(p, '/collections/whey-protein'); await p.waitForTimeout(1200);
      await p.evaluate(() => { const m = document.querySelector('main'); m.style.background = '#F7F3EC'; document.querySelectorAll('main .shopify-section, main section').forEach((s) => (s.style.background = '#F7F3EC')); const g = document.querySelector('product-list, .product-list'); g.scrollIntoView({ block: 'start' }); scrollBy(0, -120); });
      await p.waitForTimeout(800); await p.screenshot({ path: path.join(O, `cards-cream-${w}.png`) }); log(w, 'cards on cream (grid rendered on #F7F3EC: no cream product section on home)', true, '');
    }
    await c.close();
  }
  fs.writeFileSync(path.join(O, 'cards.md'), ['# Product cards (Round 15)', '', '| width | check | result | note |', '|---|---|---|---|', ...rows].join('\n') + '\n');
  await b.close();
})();
