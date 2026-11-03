// R19 #7: bundle map from the live cart JS (SNHCart.loadBundles + bundleMatch over the whole catalogue) → table,
// then real test-browser carts (no orders): creatine → offer, swap → Bundle unlocked; whey → its stack; gels → race pack.
//   node prototype/tools/r19-bundles.js <products.json> [widths]
const { chromium, open, go, shot, OUT } = require('./r19-lib');
const fs = require('fs'), path = require('path');
const CAT = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).map((p) => ({ id: p.id, handle: p.handle, title: p.title, vendor: p.vendor, type: p.product_type, vid: (p.variants.find((v) => v.available) || {}).id }));
const W = (process.argv[3] || '390,1440').split(',').map(Number);
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  let { ctx, p } = await open(b, 1440); await go(p, '/');
  const map = await p.evaluate(async (cat) => {
    const cfg = JSON.parse(document.querySelector('#cart-drawer [data-cart-cfg], [data-cart-cfg]').textContent).autoBundles;
    const bs = await SNHCart.loadBundles(cfg);
    return bs.map((bd) => ({ h: bd.h, t: bd.t, p: bd.p, r: bd.r, s: bd.s, comps: cat.filter((x) => !/bundle/i.test(x.type) && SNHCart.bundleMatch({ handle: x.handle, title: x.title, vendor: x.vendor }, bd)).map((x) => x.handle) }));
  }, CAT);
  const rows = ['| bundle (handle) | price | saving | contains (auto + overrides) |', '|---|---|---|---|'];
  map.forEach((m) => rows.push(`| ${m.t} (\`${m.h}\`) | Rs ${(m.p / 100).toLocaleString('en-US')} | ${m.s ? 'Rs ' + (m.s / 100).toLocaleString('en-US') : '—'} | ${m.comps.map((c) => '`' + c + '`').join(', ') || '**none found**'} |`));
  const inv = {}; map.forEach((m) => m.comps.forEach((c) => { (inv[c] = inv[c] || []).push(m.h); }));
  const rows2 = ['| product | bundles it is in |', '|---|---|'];
  Object.keys(inv).sort().forEach((k) => rows2.push(`| \`${k}\` | ${inv[k].map((x) => '`' + x + '`').join(', ')} |`));
  fs.mkdirSync(path.join(OUT, '07-bundles'), { recursive: true });
  fs.writeFileSync(path.join(OUT, '07-bundles', 'bundles.md'), '# Bundles found by the cart (R19 #7)\n\n' + map.length + ' bundle products.\n\n' + rows.join('\n') + '\n\n## Product → bundles\n\n' + rows2.join('\n') + '\n');
  console.log(map.length, 'bundles;', map.filter((m) => !m.comps.length).length, 'without components');
  ok(map.length >= 25 && map.every((m) => m.comps.length), 'every bundle product found with at least one component');
  await ctx.close();
  const vid = (h) => CAT.find((x) => x.handle === h).vid, pid = (h) => CAT.find((x) => x.handle === h).id;
  const CASES = [['creatine', 'applied-nutrition-creatine-monohydrate', /creatine-starter/], ['pre-workout', 'raw-essential-pre-workout', /raw-(training|loaded)-stack/], ['collagen', 'applied-nutrition-collagen-peptides', /strength-skin|scar-tissue/], ['magnesium', 'revive-magnesium-glycinate', /revive-magnesium-glycinate-1|revive-daily|main-mineral|stress|daily-foundation/], ['gels', 'sis-go-isotonic-energy-gel', /race-day-pack-1-0|endurance-trial/]];
  for (const w of W) {
    ({ ctx, p } = await open(b, w)); await go(p, '/');
    for (const [name, h, want] of CASES) {
      if (!vid(h)) { ok(false, w + ' ' + name + ': ' + h + ' not available'); continue; }
      let r = 0; for (let i = 0; i < 4 && r !== 200; i++) { if (i) await p.waitForTimeout(30000); r = await p.evaluate(async (id) => { try { await fetch('/cart/clear.js', { method: 'POST' }); const x = await fetch('/cart/add.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: [{ id, quantity: 1 }] }) }); return x.status; } catch (e) { return -1; } }, vid(h)); }
      await p.evaluate(() => { sessionStorage.removeItem('snh_bwin'); SNHCart.refresh(true); });
      await p.waitForSelector('#cart-drawer .sline .sbo', { timeout: 20000 }).catch(() => {});
      await p.waitForTimeout(1200);
      const o = await p.evaluate(() => { const x = document.querySelector('#cart-drawer .sline .sbo'); return x ? { t: x.querySelector('.sbo__t').textContent, href: x.querySelector('.sbo__t').getAttribute('href'), eb: x.querySelector('.sbo__eb').textContent, s: x.querySelector('.sbo__s').textContent } : null; });
      ok(r === 200 && o && want.test(o.href), w + ' ' + name + ' in the basket → "' + (o && o.eb) + '": ' + (o && o.t) + ' (' + (o && o.href) + ')');
      const ln = await p.$('#cart-drawer .sline'); if (ln) await ln.screenshot({ path: shot(`07-bundles/${name}-offer-${w}`) }).catch(() => {});
      await p.screenshot({ path: shot(`07-bundles/${name}-drawer-${w}`) });
      if (name === 'creatine' && o) {
        await p.click('#cart-drawer .sbo__go');
        await p.waitForSelector('#cart-drawer [data-bundle-win]', { timeout: 20000 }).catch(() => {});
        await p.waitForTimeout(300);
        const fx = await p.evaluate(() => !!document.querySelector('#cart-drawer .sbw__fx i'));
        await p.screenshot({ path: shot(`07-bundles/creatine-unlocked-${w}`) });
        const c = await p.evaluate(async () => { const j = await (await fetch('/cart.js')).json(); const win = document.querySelector('#cart-drawer [data-bundle-win]'); return { items: j.items.map((i) => i.handle + '×' + i.quantity), win: win && win.textContent.replace(/\s+/g, ' ').trim() }; });
        ok(c.items.length === 1 && /creatine-starter/.test(c.items[0]) && /Bundle unlocked/.test(c.win || ''), w + ' swap: basket now ' + JSON.stringify(c.items) + ' · banner "' + c.win + '"');
        ok(fx, w + ' confetti on the first unlock');
        await p.evaluate(() => SNHCart.refresh(false)); await p.waitForTimeout(1500);
        ok(await p.evaluate(() => !document.querySelector('#cart-drawer .sbw__fx')), w + ' no confetti replay on the next render');
        await p.goto(p.url().split('?')[0].replace(/\/$/, '') + '/cart', { waitUntil: 'domcontentloaded' }).catch(() => {});
        await go(p, '/cart'); await p.waitForSelector('.scp [data-bundle-win]', { timeout: 20000 }).catch(() => {});
        await p.screenshot({ path: shot(`07-bundles/cartpage-unlocked-${w}`) });
        ok(await p.evaluate(() => !!document.querySelector('.scp [data-bundle-win]')), w + ' cart page shows Bundle unlocked too');
        await go(p, '/');
      }
      await p.waitForTimeout(8000);
    }
    await p.evaluate(() => fetch('/cart/clear.js', { method: 'POST' })).catch(() => {});
    await ctx.close();
  }
  await b.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})();
