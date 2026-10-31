// Round 14 P0.2: the mini cart on the target theme with REAL carts in this browser (cleared + filled via /cart/*.js;
// no orders). Carts: creatine only, whey only, gels only, a near-threshold cart, and creatine with a bundle offer
// (the store has no bundle configured yet, so that one injects a bundle into the drawer's settings JSON).
// Asserts: smart suggestions (relevant complement + a bar/snack ≤ Rs 1,500), decision rule, the free-delivery line,
// footer (total, points, Secure checkout, Koko logo line, Visa/Mastercard/Amex, COD, bank transfer), bundle card.
//   node prototype/tools/r14-minicart.js → shots/r14/p0-2/
const { chromium, context, open, out, products } = require('./r14-lib.js');
const fs = require('fs'), path = require('path');
const OUT = out('p0-2'), rows = [];
const CARTS = [
  ['creatine only', ['applied-nutrition-creatine-monohydrate']],
  ['whey only', ['applied-nutrition-critical-whey-2kg']],
  ['gels only', ['sis-go-isotonic-energy-gel', 'sis-go-isotonic-energy-gel', 'sis-go-isotonic-energy-gel']],
  ['near free delivery', ['applied-nutrition-critical-whey-2kg']],   // whey 2kg alone is over the threshold; see note
  ['creatine + bundle offer', ['applied-nutrition-creatine-monohydrate'], true],
];
(async () => {
  const b = await chromium.launch();
  const P = await products(b, ['applied-nutrition-creatine-monohydrate', 'applied-nutrition-critical-whey-2kg', 'sis-go-isotonic-energy-gel', 'snh-shaker-bottle-750ml-orange']);
  const vid = (h) => (P[h].variants.find((v) => v.available) || P[h].variants[0]);
  for (const w of (process.env.W || '390,1440').split(',').map(Number)) {
    const ctx = await context(b, w), p = await ctx.newPage();   // one context per width (Cloudflare keeps its cookies)
    for (const [name, handles, bundle] of CARTS.filter((c) => !process.env.ONLY || process.env.ONLY.split('|').includes(c[0]))) {
      await p.unrouteAll({ behavior: 'ignoreErrors' }).catch(() => {});
      if (bundle) await p.route((u) => u.pathname === '/', async (r) => {
        const res = await r.fetch(); let t = await res.text();
        const ids = P['applied-nutrition-creatine-monohydrate'], sh = P['snh-shaker-bottle-750ml-orange'];
        const bi = (x) => ({ pid: x.id, vid: x.variants[0].id, title: x.title, price: x.variants[0].price, available: true, image: x.featured_image });
        t = t.replace(/("bundles": \[)[\s\S]*?(\]\s*\}\s*<\/script>)/, (m, a, z) => a + JSON.stringify([{ title: 'Creatine + Shaker Stack', save: '', items: [bi(ids), bi(sh)] }]).slice(1, -1) + z);
        r.fulfill({ response: res, body: t });
      });
      await open(p, '/');
      const items = name === 'near free delivery' ? [{ id: vid('applied-nutrition-creatine-monohydrate').id, quantity: 1 }, { id: vid('sis-go-isotonic-energy-gel').id, quantity: 7 }]   /* Rs 15,492: gap Rs 1,508 */ : handles.map((h) => ({ id: vid(h).id, quantity: 1 }));
      let added = '';
      for (let i = 0; i < 6 && !/items [1-9]/.test(added); i++) {   // Cloudflare may challenge API bursts: wait it out
        if (i) { await p.waitForTimeout(60000); await open(p, '/'); }
        added = await p.evaluate(async (items) => { try { await fetch('/cart/clear.js', { method: 'POST' }); const r = await fetch('/cart/add.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) }); const c = JSON.parse(await (await fetch('/cart.js')).text()); return r.status + ' items ' + c.item_count; } catch (e) { return 'blocked ' + e.message.slice(0, 40); } }, items);
      }
      if (!/items [1-9]/.test(added)) console.log('  add failed:', added, JSON.stringify(items));
      await p.evaluate(() => SNHCart.refresh(true));
      await p.waitForFunction(() => { const r = document.querySelector('#cart-drawer [data-cart-root]'); return r && r.hasAttribute('data-cart-decision'); }, null, { timeout: 40000 }).catch(() => {});
      await p.waitForTimeout(2500);
      const m = await p.evaluate(() => {
        const r = document.querySelector('#cart-drawer [data-cart-root]'), t = (s) => { const e = r.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; };
        const box = r.querySelector('[data-cart-sugg]'), cards = box && !box.hidden ? [...box.querySelectorAll('.ssug')].map((e) => ({ t: e.querySelector('.ssug__t').textContent.trim(), p: +e.querySelector('.ssug__p').firstChild.textContent.replace(/\D/g, ''), why: (e.querySelector('.ssug__p i') || {}).textContent || '' })) : [];
        const foot = r.querySelector('[data-cart-foot]'), fr = foot.getBoundingClientRect();
        return { d: JSON.parse(r.getAttribute('data-cart-decision') || '{}'), head: box && !box.hidden ? t('.scd__bh') : '', cards, bar: t('.sfree__t'),
          total: t('.sft__tot b'), points: t('.sft__line'), checkout: !!foot.querySelector('button[name="checkout"]'), koko: !!foot.querySelector('.sft__koko img[alt="Koko"]') && /3 ×/.test(t('.sft__koko')),
          cards3: foot.querySelectorAll('.spay__card').length, cod: /Cash on delivery/.test(t('.spay')), bank: /Bank transfer/.test(t('.spay')), footInView: fr.bottom <= innerHeight + 1 && fr.top < innerHeight,
          bundle: !!r.querySelector('[data-cart-bundle]:not([hidden])') && t('.sbm') };
      });
      const bar = m.cards.some((c) => /bar|snack|cookie|wafer|chips|crisps/i.test(c.t) && c.p <= 1500);
      const okFoot = m.total && m.checkout && m.koko && m.cards3 === 3 && m.cod && m.bank && m.footInView;
      const ok = (bundle ? !!m.bundle : true) && okFoot && (m.cards.length > 0) && (name === 'near free delivery' ? m.d.rule === 'close' : bar);
      rows.push(`| ${w} | ${name} | ${m.d.rule} · ${m.head} | ${m.cards.map((c) => c.t + ' · Rs ' + c.p + ' · ' + c.why).join('<br>')} | ${m.bar} | ${okFoot ? 'all present' : JSON.stringify({ total: m.total, koko: m.koko, cards: m.cards3, cod: m.cod, bank: m.bank, inView: m.footInView })} | ${m.bundle || '—'} | ${ok ? 'PASS' : '**FAIL**'} |`);
      if (!ok) console.log('DECISION', JSON.stringify(m.d).slice(0, 400));
      console.log(w, name, ok ? 'PASS' : 'FAIL', '|', m.d.rule, '|', m.cards.map((c) => c.t.slice(0, 26) + ' ' + c.p + ' ' + c.why).join(' ; '), '| foot', okFoot, '| bundle', !!m.bundle);
      await p.screenshot({ path: path.join(OUT, `drawer-${name.replace(/\W+/g, '-')}-${w}.png`) });
      await p.evaluate(() => fetch('/cart/clear.js', { method: 'POST' }));
      await new Promise((r) => setTimeout(r, +(process.env.PAUSE || 45000)));
    }
    await ctx.close();
  }
  fs.appendFileSync(path.join(OUT, 'minicart-rows.md'), rows.join('\n') + '\n');
  fs.writeFileSync(path.join(OUT, 'minicart.md'), ['# P0.2 mini cart (real carts in the test browser)', '', '| width | cart | rule · heading | suggestions (name · price · reason) | free delivery | footer | bundle card | result |', '|---|---|---|---|---|---|---|---|', ...rows].join('\n') + '\n');
  await b.close();
})();
