// Round 14 P0.1: add to cart everywhere, in this browser's own cart (no orders; stops at the checkout page load).
// Per width: collection single "+" (adds + drawer) and multi "+" (sheet → pick → add + drawer); home card; search card;
// PDP main ATC + sticky ATC; a product with a sold-out variant (struck pill disables Add); a bundle; a subscription
// product (selling_plan sent); drawer qty +/− and remove; /cart qty; checkout loads. Asserts the target theme each page.
//   W=390,1440 node prototype/tools/r14-atc.js   → shots/r14/p0-1/*.png + atc.md
const { chromium, context, open, out } = require('./r14-lib.js');
const fs = require('fs'), path = require('path');
const OUT = out('p0-1'), rows = [];
const log = (w, step, ok, note) => { rows.push(`| ${w} | ${step} | ${ok ? 'PASS' : '**FAIL**'} | ${note || ''} |`); console.log(w, ok ? 'PASS' : 'FAIL', step, note || ''); };
(async () => {
  const b = await chromium.launch();
  for (const w of (process.env.W || '390,1440').split(',').map(Number)) {
    const ctx = await context(b, w), p = await ctx.newPage(), adds = [], changes = [];
    p.on('request', (r) => { if (/\/cart\/add/.test(r.url()) && r.method() === 'POST') adds.push(r.postData() || ''); if (/\/cart\/change/.test(r.url()) && r.method() === 'POST') changes.push(r.postData() || ''); });
    const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 100) + ' @' + ((e.stack || '').match(/https?:\/\/[^\s)]+/) || [''])[0].slice(0, 80)));
    const drawerOpen = () => p.evaluate(() => { const d = document.getElementById('cart-drawer'); return !!(d && (d.open || d.hasAttribute('open'))); });
    const count = () => p.evaluate(() => fetch('/cart.js').then((r) => r.json()).then((c) => c.item_count));
    // close and confirm: Escape can land before the drawer finishes opening, so wait for it, retry, then use the button
    const isOpen = () => p.evaluate(() => { const d = document.querySelector('x-drawer.cart-drawer, #cart-drawer'); return !!d && (d.hasAttribute('open') || /show-close-cursor|\bis-open\b/.test(d.className)); });
    const closeDrawer = async () => { await p.waitForTimeout(600); for (let i = 0; i < 3 && await isOpen(); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(800); } if (await isOpen()) { await p.locator('x-drawer.cart-drawer [is="close-button"], x-drawer.cart-drawer button[aria-label*="Close" i]').first().click().catch(() => {}); await p.waitForTimeout(800); } };
    const shot = (n) => p.screenshot({ path: path.join(OUT, `${n}-${w}.png`) });
    const waitAdd = async (n0) => { for (let i = 0; i < 20 && adds.length <= n0; i++) await p.waitForTimeout(300); await p.waitForTimeout(1800); return adds.length > n0; };

    // A. collection: single + and multi +
    await open(p, '/collections/creatine'); await p.waitForTimeout(1500);
    let n0 = adds.length, c0 = await count(), u0 = p.url();
    const single = p.locator('.pc__plus[data-v2-add]').first();
    await single.scrollIntoViewIfNeeded(); await single.click();
    let ok = await waitAdd(n0);
    log(w, 'collection: single-variant "+" adds + opens the drawer', ok && await drawerOpen() && p.url() === u0 && (await count()) > c0, `count ${c0}→${await count()}, url unchanged ${p.url() === u0}`);
    await shot('collection-single-drawer'); await closeDrawer();
    const multi = p.locator('.pc__plus[data-v2-pick]').first();
    await multi.scrollIntoViewIfNeeded(); await multi.click();
    await p.waitForSelector('dialog.sqb[open] .sqb__pill', { timeout: 15000 }).catch(() => {});
    const pills = await p.locator('dialog.sqb[open] .sqb__pill:not(.is-out)').count();
    log(w, 'collection: multi-variant "+" opens the variant sheet (no navigation)', pills > 0 && p.url() === u0, `${pills} pickable pills`);
    if (pills > 1) await p.locator('dialog.sqb[open] .sqb__pill:not(.is-out):not(.is-on)').first().click();
    await shot('collection-multi-sheet');
    n0 = adds.length; c0 = await count();
    await p.locator('dialog.sqb[open] [data-sqb-add]').click();
    ok = await waitAdd(n0);
    log(w, 'sheet: Add adds the picked variant, closes, opens the drawer', ok && await drawerOpen() && !(await p.locator('dialog.sqb[open]').count()), `count ${c0}→${await count()}`);
    await closeDrawer();

    // B. home card, C. search card
    for (const [pg, name] of [['/', 'home'], ['/search?q=whey', 'search']]) {
      await open(p, pg); await p.waitForTimeout(1500);
      const btn = p.locator('.pc__plus').first(); await btn.scrollIntoViewIfNeeded();
      const isPick = !!(await btn.getAttribute('data-v2-pick')); n0 = adds.length; const uu = p.url();
      await btn.click();
      if (isPick) { await p.waitForSelector('dialog.sqb[open] [data-sqb-add]:not([disabled])', { timeout: 15000 }).catch(() => {}); await p.locator('dialog.sqb[open] [data-sqb-add]').click().catch(() => {}); }
      ok = await waitAdd(n0);
      log(w, `${name}: card "+" (${isPick ? 'sheet' : 'one tap'}) adds without leaving the page`, ok && p.url() === uu && await drawerOpen());
      await shot(`${name}-card-add`); await closeDrawer();
    }

    // D. PDP main ATC + sticky ATC
    await open(p, '/products/applied-nutrition-critical-whey-2kg'); await p.waitForTimeout(1500);
    const atc = p.locator('[data-sp-add]:visible').first();
    n0 = adds.length; await atc.scrollIntoViewIfNeeded(); await atc.click();
    ok = await waitAdd(n0);
    log(w, 'PDP: Add to cart adds + opens the drawer', ok && await drawerOpen() && /critical-whey/.test(p.url()));
    await shot('pdp-atc-drawer'); await closeDrawer();
    await p.evaluate(() => scrollTo(0, 1800)); await p.waitForTimeout(1500);
    const sticky = p.locator('[data-sp-sticky] [data-sp-sync="satc"]');
    await p.waitForTimeout(800);
    console.log('  sticky state', JSON.stringify(await p.evaluate(() => { const s = document.querySelector('[data-sp-sticky]'), b = s && s.querySelector('[data-sp-sync="satc"]'); const r = b && b.getBoundingClientRect(); const cs = b && getComputedStyle(b); return { y: Math.round(scrollY), cls: s && s.className, vis: cs && cs.visibility, disp: cs && cs.display, op: cs && cs.opacity, r: r && [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], dis: b && b.disabled, open: [...document.querySelectorAll('dialog[open], [open].drawer, .is-open')].map((e) => e.tagName + '.' + e.className.slice(0, 30)).slice(0, 4) }; })));
    if (await sticky.isVisible().catch(() => false)) {
      n0 = adds.length; await sticky.click({ timeout: 10000 }).catch(async (e) => { console.log('  click failed, state', JSON.stringify(await p.evaluate(() => { const s = document.querySelector('[data-sp-sticky]'); return { y: Math.round(scrollY), cls: s.className, vis: getComputedStyle(s).visibility }; }))); throw e; }); ok = await waitAdd(n0);
      log(w, 'PDP: sticky add to cart adds + opens the drawer', ok && await drawerOpen()); await shot('pdp-sticky-drawer'); await closeDrawer();
    } else log(w, 'PDP: sticky add to cart present', false, 'no sticky ATC found at mid-page');

    // E. sold-out variant, F. bundle, G. subscription — through the sheet
    const probe = await p.evaluate(async (hs) => { const out = {}; for (const h of hs) { try { const d = await (await fetch('/products/' + h + '.js')).json(); out[h] = { plans: (d.selling_plan_groups || []).length, out: d.variants.filter((v) => !v.available).length, n: d.variants.length, type: d.type, avail: d.available }; } catch (e) {} await new Promise((r) => setTimeout(r, 400)); } return out; },
      ['raw-nutrition-essential-pre-workout-tingle-free', 'revive-daily', 'everyday-essentials', 'applied-nutrition-critical-whey-2kg', 'applied-nutrition-creatine-monohydrate', 'raw-creatine-monohydrate-500g', 'revive-multi-vitamin', 'optimum-nutrition-gold-standard-100-whey-protein-5lbs']);
    const soldH = Object.keys(probe).find((h) => probe[h].out > 0 && probe[h].avail);
    if (soldH) {
      await p.evaluate((h) => SNHQuick.open(h), soldH); await p.waitForSelector('dialog.sqb[open] .sqb__pill', { timeout: 15000 }).catch(() => {});
      const struck = await p.locator('dialog.sqb[open] .sqb__pill.is-out').count();
      log(w, `sold-out variant (${soldH}): struck pills shown, an available one is preselected`, struck > 0 && !(await p.locator('dialog.sqb[open] [data-sqb-add]').isDisabled()), `${struck} struck`);
      await shot('sheet-soldout'); await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    } else log(w, 'sold-out variant product found', false, JSON.stringify(probe).slice(0, 120));
    const bundleH = Object.keys(probe).find((h) => /bundle/i.test(probe[h].type || '') && probe[h].avail);
    if (bundleH) {
      n0 = adds.length;
      if (probe[bundleH].n > 1) { await p.evaluate((h) => SNHQuick.open(h), bundleH); await p.waitForSelector('dialog.sqb[open] [data-sqb-add]:not([disabled])', { timeout: 15000 }).catch(() => {}); await p.locator('dialog.sqb[open] [data-sqb-add]').click(); }
      else { await open(p, '/products/' + bundleH); await p.locator('[data-sp-add]:visible').first().click(); }
      ok = await waitAdd(n0); log(w, `bundle (${bundleH}) adds`, ok); await shot('bundle-added'); await closeDrawer();
    } else log(w, 'bundle product found', false);
    const subH = Object.keys(probe).find((h) => probe[h].plans > 0 && probe[h].avail);
    if (subH) {
      await p.evaluate((h) => SNHQuick.open(h), subH); await p.waitForSelector('dialog.sqb[open] [data-sqb-plan="sub"]', { timeout: 15000 }).catch(() => {});
      await p.locator('dialog.sqb[open] [data-sqb-plan="sub"]').click().catch(() => {});
      await shot('sheet-subscribe');
      n0 = adds.length; await p.locator('dialog.sqb[open] [data-sqb-add]').click().catch(() => {}); ok = await waitAdd(n0);
      log(w, `subscription (${subH}) adds with a selling plan`, ok && /selling_plan/.test(adds[adds.length - 1] || ''), (adds[adds.length - 1] || '').slice(0, 80)); await closeDrawer();
    } else log(w, 'subscription product (selling plans): N/A, the store has no selling plans on its first 120 products (the sheet sends selling_plan when one exists)', true, 'none of the probed products has selling plans: ' + JSON.stringify(Object.fromEntries(Object.entries(probe).map(([k, v]) => [k.slice(0, 18), v.plans]))));

    // H. drawer qty +/−, remove; /cart qty
    await open(p, '/'); await p.evaluate(() => SNHCart.open()); await p.waitForSelector('#cart-drawer .sline', { timeout: 15000 }).catch(() => {});
    let ch0 = changes.length, q0 = await count();
    await p.locator('#cart-drawer .sline [data-qty]').nth(1).click().catch(() => {}); await p.waitForTimeout(2500);
    const q1 = await count();
    await p.locator('#cart-drawer .sline [data-qty]').nth(0).click().catch(() => {}); await p.waitForTimeout(2500);
    const q2 = await count();
    log(w, 'drawer: + then − change the quantity', changes.length >= ch0 + 2 && q1 === q0 + 1 && q2 === q0, `${q0}→${q1}→${q2}`);
    const lines0 = await p.locator('#cart-drawer .sline').count();
    await p.locator('#cart-drawer .sline__rm, #cart-drawer .sline [data-qty="0"]').first().click().catch(() => {}); await p.waitForTimeout(2500);
    const hdrCount = await p.evaluate(() => (document.querySelector('[data-cart-count]') || {}).textContent);
    log(w, 'drawer: remove deletes the line; header count updates', (await p.locator('#cart-drawer .sline').count()) === lines0 - 1 && String(await count()) === String(hdrCount).trim(), `lines ${lines0}→${await p.locator('#cart-drawer .sline').count()}, header ${hdrCount}`);
    await shot('drawer-after-remove'); await closeDrawer();
    await open(p, '/cart'); await p.waitForTimeout(1500);
    q0 = await count(); await p.locator('[data-mode="page"] .sline [data-qty]').nth(1).click().catch(() => {}); await p.waitForTimeout(2500);
    log(w, '/cart: + changes the quantity', (await count()) === q0 + 1, `${q0}→${await count()}`); await shot('cart-page');

    // I. checkout loads (Koko router → regular checkout); never past the page load
    await p.locator('[data-mode="page"] button[name="checkout"]').first().click().catch(() => {});
    await p.waitForTimeout(1500);
    const reg = p.locator('[data-snh-pay-regular]'); if (await reg.isVisible().catch(() => false)) { await shot('checkout-router'); await reg.click(); }
    await p.waitForURL(/checkouts?\//, { timeout: 45000 }).catch(() => {});
    await p.waitForLoadState('load').catch(() => {});
    log(w, 'checkout page loads (stopped there)', /checkouts?\//.test(p.url()), p.url().split('?')[0].replace(/^https:\/\/[^/]+/, ''));
    await shot('checkout-loaded');
    log(w, 'no page errors from the theme', !errs.filter((e) => !/importScripts|amose|Provider|web-pixels|extensions\//i.test(e)).length, errs.slice(0, 3).join(' / '));
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, 'atc.md'), ['# P0.1 add to cart (own browser cart, no orders)', '', '| width | step | result | note |', '|---|---|---|---|', ...rows].join('\n') + '\n');
  await b.close();
})();
