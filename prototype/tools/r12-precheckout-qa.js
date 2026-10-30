// Round 12 pre-checkout modal QA (mocked cart; nothing reaches the real cart or Koko's worker).
// Opens the drawer with a Rs 14,000 basket, taps Secure checkout → the Koko router opens with the summary layer.
// Guest + member (config switched in the page) × 390 / 768 / 1440; taps the last-chance add-on (mocked add → the
// totals update) and, as a guest, "Sign in" (→ the account panel). PW=<playwright> node prototype/tools/r12-precheckout-qa.js
const { chromium } = require(process.env.PW || 'playwright');
const fs = require('fs');
const path = require('path');
const DEV = process.env.DEV || 'http://127.0.0.1:9292';
const OUT = path.join(__dirname, '..', 'shots', 'r12', 'checkout');
const HIDE = '.shopify-section--popup,#preview-bar-iframe,privacy-bar,#shopify-pc__banner,[data-email-capture],[data-snh-capture]{display:none!important}';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const c0 = await b.newContext(); const p0 = await c0.newPage();
  const whey = await (await p0.request.get(`${DEV}/products/applied-nutrition-critical-whey-2kg.js`)).json();
  const crea = await (await p0.request.get(`${DEV}/products/applied-nutrition-creatine-monohydrate.js`)).json();
  await c0.close();
  const L = (p, cents) => ({ key: p.variants[0].id + ':m', id: p.variants[0].id, variant_id: p.variants[0].id, product_id: p.id, quantity: 1, product_title: p.title, title: p.title, variant_title: p.variants[0].title, vendor: p.vendor, product_type: p.type, image: p.featured_image, url: '/products/' + p.handle, handle: p.handle, price: cents, original_line_price: cents, final_line_price: cents, line_price: cents, line_level_discount_allocations: [] });
  const cartOf = (items) => { const t = items.reduce((s, i) => s + i.final_line_price, 0); return { token: 'mock', item_count: items.length, items, items_subtotal_price: t, total_price: t, cart_level_discount_applications: [], currency: 'LKR' }; };
  const rows = [];
  for (const who of ['guest', 'member']) {
    for (const w of [390, 768, 1440]) {
      const p = await b.newPage({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 800, hasTouch: w < 800 });
      const errs = []; p.on('pageerror', (e) => errs.push(e.message));
      let cart = cartOf([L(whey, 1000000), L(crea, 400000)]), worker = 0, added = null;
      await p.route(/\/cart\.js(\?|$)/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(cart) }));
      await p.route(/\/cart\/add(\.js)?/, (r) => { const body = JSON.parse(r.request().postData() || '{}'); added = body; const it = L(whey, 99900); it.key = 'addon'; it.variant_id = body.items[0].id; it.product_title = 'Add-on'; it.product_id = 1; cart = cartOf(cart.items.concat([it])); return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); });
      await p.route(/workers\.dev/, (r) => { worker++; return r.abort(); });
      await p.route(/\/checkout/, (r) => r.abort());
      await p.route(/monorail|analytics|trekkie|web-pixels/, (r) => r.abort());
      await p.goto(DEV + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
      await p.addStyleTag({ content: HIDE });
      await p.waitForFunction(() => window.SNHCart && SNHCart.carts.length, null, { timeout: 30000 });
      if (who === 'member') await p.evaluate(() => { document.querySelectorAll('[data-cart-cfg]').forEach((s) => { const j = JSON.parse(s.textContent); Object.assign(j, { member: true, tier: 'Silver', rate: 7 }); s.textContent = JSON.stringify(j); }); });
      await p.evaluate(() => SNHCart.open());
      await p.waitForSelector('#cart-drawer button[name="checkout"]', { timeout: 20000 });
      await p.waitForTimeout(1500);
      await p.click('#cart-drawer button[name="checkout"]');
      await p.waitForSelector('#snh-pay-router:not([hidden]) [data-spc]:not([hidden])', { timeout: 15000 }).catch(() => {});
      await p.waitForSelector('[data-spc-add]:not([hidden])', { timeout: 15000 }).catch(() => {});
      await p.waitForTimeout(800);
      const t = () => p.evaluate(() => { const g = (s) => { const e = document.querySelector(s); return e && !e.hidden ? e.textContent.replace(/\s+/g, ' ').trim() : null; }; return { items: g('[data-spc-items]'), total: g('[data-spc-total]'), save: g('[data-spc-save]'), points: g('[data-spc-points]'), addon: g('[data-spc-add]'), eta: g('[data-spc-eta]'), koko: g('[data-spc-koko]'), fits: document.querySelector('.snh-pay-dialog').scrollHeight <= document.querySelector('.snh-pay-dialog').clientHeight + 1 }; });
      const before = await t();
      await p.screenshot({ path: path.join(OUT, `modal-${who}-${w}.png`) });
      let after = null, panel = null;
      if (before.addon) {
        await p.click('[data-spc-addon]');
        await p.waitForTimeout(1500);
        after = await t();
        if (w === 390) await p.screenshot({ path: path.join(OUT, `modal-${who}-${w}-added.png`) });
      }
      if (who === 'guest' && w === 1440) {
        await p.click('[data-spc-signin]').catch(() => {});
        await p.waitForTimeout(800);
        panel = await p.evaluate(() => { const a = document.querySelector('.acp'); return { routerHidden: document.getElementById('snh-pay-router').hidden, panelOpen: !!(a && !a.hidden && a.classList.contains('is-open')) }; });
        await p.screenshot({ path: path.join(OUT, `modal-guest-signin-${w}.png`) });
      }
      rows.push({ who, w, before, after, added, panel, worker, errs });
      await p.close();
    }
  }
  await b.close();
  const md = ['# Round 12 pre-checkout modal QA (mocked)', '', `Generated ${new Date().toISOString()} against ${DEV}. /cart.js and /cart/add.js mocked; Koko's worker and /checkout blocked (never called: see "worker").`, '',
    '| who | width | summary | points | add-on offered | after one tap | Koko | fits without scroll | sign-in → panel | worker | errors |', '|---|---|---|---|---|---|---|---|---|---|---|'];
  for (const r of rows) md.push(`| ${r.who} | ${r.w} | ${r.before.items} ${r.before.total}${r.before.save ? ' · ' + r.before.save : ''} | ${r.before.points} | ${r.before.addon || '—'} | ${r.after ? r.after.items + ' ' + r.after.total + ' · Koko ' + r.after.koko + (r.added ? ' (posted variant ' + r.added.items[0].id + ')' : '') : '—'} | ${r.before.koko} | ${r.before.fits ? '✓' : 'scrolls'} | ${r.panel ? (r.panel.routerHidden && r.panel.panelOpen ? '✓ router closed, panel open' : JSON.stringify(r.panel)) : '—'} | ${r.worker} | ${r.errs.length ? r.errs.join('; ') : '✓'} |`);
  fs.writeFileSync(path.join(OUT, 'qa.md'), md.join('\n') + '\n');
  console.log(md.join('\n'));
})();
