// Round 15 item 4: the Koko logo renders (img.snh-koko loaded, naturalWidth > 0) in every location, 390 + 1440:
// product card, PDP line, quick-buy sheet, cart drawer footer, cart page footer, campaign cart banner, footer payments,
// checkout payment router (DOM), Shop the Look (home, when shown). Target theme asserted.
//   node prototype/tools/r15-koko.js → shots/r15/koko/
process.env.SHOTS = 'r15';
const { chromium, context, open, out, products } = require('./r14-lib.js');
const fs = require('fs'), path = require('path');
const O = out('koko'), rows = [];
const log = (w, step, ok, note) => { rows.push(`| ${w} | ${step} | ${ok ? 'PASS' : '**FAIL**'} | ${note || ''} |`); console.log(w, ok ? 'PASS' : 'FAIL', step, note || ''); };
(async () => {
  const b = await chromium.launch();
  for (const w of (process.env.W || '390,1440').split(',').map(Number)) {
    const c = await context(b, w), p = await c.newPage();
    const shot = async (sel, name) => { const el = p.locator(sel).first(); if (await el.count()) { await el.scrollIntoViewIfNeeded().catch(() => {}); await p.waitForTimeout(500); await el.screenshot({ path: path.join(O, `${name}-${w}.png`) }).catch(() => {}); } };
    const check = async (scope, name) => { for (let t = 0; t < 2; t++) { try { return await chk(scope); } catch (e) { await p.waitForTimeout(3000); } } return { n: 0, ok: 0, h: 0 }; };
    const chk = async (scope) => p.evaluate(async (scope) => { const im = [...document.querySelectorAll(scope + ' img.snh-koko, ' + scope + ' img[src*="snh-koko"]')].filter((i) => i.closest('#snh-pay-router') || i.getClientRects().length); for (const i of im) { if (!i.complete) await new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 4000); }); if (i.loading === 'lazy' && !i.naturalWidth) { i.scrollIntoView({ block: 'center' }); await new Promise((r) => setTimeout(r, 1200)); } } return { n: im.length, ok: im.filter((i) => i.naturalWidth > 0).length, h: im[0] ? Math.round(im[0].getBoundingClientRect().height) : 0, text: [...document.querySelectorAll(scope)].map((e) => e.innerText).join(' ').match(/\bKOKO\b|\bKoko\b(?! ·)/) ? 'text wordmark left' : '' }; }, scope);
    // collection: product card + quick-buy sheet
    await open(p, '/collections/whey-protein'); await p.waitForTimeout(1500);
    let r = await check('.pc__koko', 'card'); log(w, 'product card Koko line', r.n > 0 && r.ok === r.n, `${r.ok}/${r.n} logos loaded, ${r.h}px`); await shot('product-card', 'card');
    const pick = p.locator('product-card [data-v2-pick]').first();
    if (await pick.count()) { await pick.scrollIntoViewIfNeeded(); await pick.click(); await p.waitForSelector('.sqb.is-open, .sqb[open], [data-sqb].is-open', { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(1500); r = await check('.sqb__koko', 'sheet'); log(w, 'quick-buy sheet Koko line', r.n > 0 && r.ok === r.n, `${r.ok}/${r.n}`); await shot('.sqb__koko', 'quickbuy'); await p.keyboard.press('Escape'); }
    // footer payments
    r = await check('.ftr__pay', 'footer'); log(w, 'footer payments', r.n > 0 && r.ok === r.n, `${r.ok}/${r.n}`); await shot('.ftr__pay', 'footer');
    // PDP
    await open(p, '/products/applied-nutrition-critical-whey-2kg'); await p.waitForTimeout(1500);
    r = await check('[data-sp-sync="koko"]', 'pdp'); log(w, 'PDP Koko line', r.n > 0 && r.ok === r.n, `${r.ok}/${r.n}, ${r.h}px`); await shot('[data-sp-sync="koko"]', 'pdp');
    // drawer + campaign banner: add the PDP item
    await p.locator('[data-sp-add]').first().click(); await p.waitForTimeout(3500);
    r = await check('#cart-drawer .sft__koko', 'drawer'); log(w, 'cart drawer footer', r.n > 0 && r.ok === r.n, `${r.ok}/${r.n}`); await shot('#cart-drawer .sft__koko', 'drawer');
    r = await check('#cart-drawer .cmp-ban__h', 'banner'); log(w, 'campaign cart banner heading (Pay in 3 with Koko)', r.n > 0 && r.ok === r.n, `${r.ok}/${r.n}`); await shot('#cart-drawer [data-campaign-slot="cart"]', 'banner-drawer');
    // cart page
    await open(p, '/cart'); await p.waitForTimeout(2500);
    r = await check('[data-mode="page"] .sft__koko', 'cart'); log(w, 'cart page footer', r.n > 0 && r.ok === r.n, `${r.ok}/${r.n}`); await shot('main .sft__koko, [data-mode="page"] .sft__koko', 'cartpage');
    r = await check('#snh-pay-router', 'router'); log(w, 'checkout payment router (Koko option)', r.n > 0 && r.ok === r.n, `${r.ok}/${r.n} (in the DOM, opens at checkout)`);
    // home: Shop the Look (if present)
    await open(p, '/'); await p.waitForTimeout(1500);
    r = await check('.hpc__koko', 'stl'); log(w, 'Shop the Look cards (home)', r.n === 0 || r.ok === r.n, r.n ? `${r.ok}/${r.n}` : 'section not on the home page');
    await c.close();
  }
  fs.writeFileSync(path.join(O, 'koko.md'), ['# Koko logo locations (Round 15)', '', '| width | location | result | note |', '|---|---|---|---|', ...rows].join('\n') + '\n');
  await b.close();
})();
