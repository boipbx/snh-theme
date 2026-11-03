// R19 #2: cart drawer + /cart page CSS audit at 360/390/768/1440 with a real test-browser cart (no orders).
//   SHOTS=r19 NODE_PATH=<qa node_modules> node prototype/tools/r19-cart.js [tag]
const { chromium, context, open, out, products } = require('./r14-lib.js');
const path = require('path');
const TAG = process.argv[2] || 'after', OUT = out('02-cart');
const H = ['applied-nutrition-creatine-monohydrate', 'applied-nutrition-critical-whey-2kg'];
const AUDIT = (root) => {
  const R = document.querySelector(root); if (!R) return { missing: root };
  const rb = R.getBoundingClientRect(), res = { qty: [], overflow: [], small: [], outside: [] };
  R.querySelectorAll('.sline').forEach((l) => {
    const q = l.querySelector('.sqty'); if (!q) return;
    const [m, n, p] = [q.children[0], q.children[1], q.children[2]].map((e) => e.getBoundingClientRect());
    const rm = l.querySelector('.sline__rm').getBoundingClientRect(), pr = l.querySelector('.sline__p').getBoundingClientRect(), qb = q.getBoundingClientRect();
    const cy = (b) => Math.round(b.top + b.height / 2);
    res.qty.push({ pill: [Math.round(qb.width), Math.round(qb.height)], minus: [Math.round(m.width), Math.round(m.height)], plus: [Math.round(p.width), Math.round(p.height)], num: Math.round(n.width), cy: [cy(m), cy(n), cy(p), cy(rm), cy(pr)], radius: getComputedStyle(q).borderRadius });
  });
  R.querySelectorAll('*').forEach((e) => {
    const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || !e.offsetParent && cs.position !== 'fixed') return;
    const b = e.getBoundingClientRect(); if (!b.width || !b.height) return;
    const cls = (e.className && e.className.baseVal === undefined ? e.className : e.tagName).toString().split(' ')[0] || e.tagName;
    if (e.scrollWidth > e.clientWidth + 1 && !/auto|scroll/.test(cs.overflowX) && cs.overflowX !== 'visible' && e.clientWidth) res.overflow.push(cls + ' ' + e.scrollWidth + '>' + e.clientWidth);
    if (e.childNodes.length && [...e.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()) && parseFloat(cs.fontSize) < 12) res.small.push(cls + ' ' + cs.fontSize + ' "' + e.textContent.trim().slice(0, 24) + '"');
    if ((b.right > rb.right + 1 || b.left < rb.left - 1) && !e.closest('[data-cart-sugg] .ssugs, .ssugs, [style*="overflow"]') ) res.outside.push(cls + ' ' + Math.round(b.left) + '..' + Math.round(b.right) + ' / ' + Math.round(rb.left) + '..' + Math.round(rb.right));
  });
  res.small = [...new Set(res.small)].slice(0, 12); res.overflow = [...new Set(res.overflow)].slice(0, 12); res.outside = [...new Set(res.outside)].slice(0, 12);
  return res;
};
(async () => {
  const b = await chromium.launch();
  for (const w of (process.env.W || '360,390,768,1440').split(',').map(Number)) {
    const ctx = await context(b, w), p = await ctx.newPage();
    await open(p, '/');
    let added = ''; for (let i = 0; i < 4 && !/ [1-9]/.test(added); i++) { if (i) await p.waitForTimeout(45000); added = await p.evaluate(async () => { try { await fetch('/cart/clear.js', { method: 'POST' });
      const pick = async (c) => { const j = await (await fetch('/collections/' + c + '/products.json?limit=30')).json(); const pr = j.products.find((x) => x.variants.some((v) => v.available) && x.variants.length > 1) || j.products.find((x) => x.variants.some((v) => v.available)); return pr.variants.find((v) => v.available).id; };
      const items = [{ id: await pick('creatine'), quantity: 1 }, { id: await pick('whey-protein'), quantity: 1 }]; const r = await fetch('/cart/add.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) }); return r.status + ' ' + (await (await fetch('/cart.js')).json()).item_count; } catch (e) { return 'blocked'; } }); }
    await p.evaluate(() => { SNHCart.refresh(true); SNHCart.open(); });
    await p.waitForFunction(() => document.querySelector('#cart-drawer .sline'), null, { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(3500);
    const d = await p.evaluate(AUDIT, '#cart-drawer [data-cart-root]');
    await p.screenshot({ path: path.join(OUT, `drawer-${TAG}-${w}.png`) });
    const ln = await p.$('#cart-drawer .sline'); if (ln) await ln.screenshot({ path: path.join(OUT, `drawer-line-${TAG}-${w}.png`) });
    console.log(w, 'drawer', added, JSON.stringify(d));
    await open(p, '/cart'); await p.waitForFunction(() => document.querySelector('.scp .sline'), null, { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(3000);
    const c = await p.evaluate(AUDIT, '.scp');
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await p.screenshot({ path: path.join(OUT, `cartpage-${TAG}-${w}.png`), fullPage: true });
    console.log(w, 'cart', 'pageOverflowX', ov, JSON.stringify(c));
    await p.evaluate(() => fetch('/cart/clear.js', { method: 'POST' })).catch(() => {});
    await ctx.close(); await new Promise((r) => setTimeout(r, +(process.env.PAUSE || 30000)));
  }
  await b.close();
})();
