// Round 14 RECO.md: 12 scenarios (guest + member × 6 carts) on the target theme (Shopify.theme.id asserted). From r13-reco-qa.
// Round 13 cart recommendations QA: MOCKED carts (/cart.js answered here, built from real products via read-only
// GETs; adds/changes are answered with the same mock, nothing reaches the real cart) → the drawer's suggestions and the
// engine's decision (data-cart-decision). Member scenarios rewrite the page's cart JSON (member: true, order history,
// goal). Output: prototype/shots/r13/1/reco.md + drawer screenshots.
//   W=390,1440 node prototype/tools/r13-reco-qa.js        (LOCAL=1 serves this checkout's assets/*.js|css)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const HOST = 'https://sports-nutrition-hub.myshopify.com', Q = '?preview_theme_id=189832462590';
const OUT = path.join(__dirname, '..', 'shots', 'r14', 'p2'); fs.mkdirSync(OUT, { recursive: true });
const W = (process.env.W || '390,1440').split(',').map(Number);
const H = { crea: 'applied-nutrition-creatine-monohydrate', whey: 'applied-nutrition-critical-whey-2kg', pre: 'raw-nutrition-essential-performance-pre-workout', gel: 'sis-go-isotonic-energy-gel', vitc: 'revive-vitamin-c', hydro: 'sis-go-hydro-tablets', shaker: 'snh-shaker-bottle-750ml-orange' };
const day = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

function line(p, qty, cents) {
  const v = p.variants.find((x) => x.available) || p.variants[0], pr = cents || v.price, lp = pr * qty;
  return { key: v.id + ':m' + pr, id: v.id, variant_id: v.id, product_id: p.id, quantity: qty, title: p.title, product_title: p.title, variant_title: v.title, vendor: p.vendor, product_type: p.type, image: p.featured_image, url: '/products/' + p.handle, handle: p.handle,
    price: pr, original_price: pr, final_price: pr, line_price: lp, original_line_price: lp, final_line_price: lp, discounts: [], line_level_discount_allocations: [], selling_plan_allocation: null };
}
function cartOf(items) { const sub = items.reduce((s, i) => s + i.final_line_price, 0); return { token: 'mock', item_count: items.reduce((s, i) => s + i.quantity, 0), items, items_subtotal_price: sub, original_total_price: sub, total_price: sub, total_discount: 0, cart_level_discount_applications: [], currency: 'LKR', requires_shipping: true }; }

(async () => {
  const b = await chromium.launch();
  const c0 = await b.newContext(), p0 = await c0.newPage(), P = {};
  const FIX = path.join(OUT, 'fixtures.json');   // cached: the store rate-limits bursts of JSON requests
  if (fs.existsSync(FIX)) Object.assign(P, JSON.parse(fs.readFileSync(FIX, 'utf8')));
  for (const [k, h] of Object.entries(H)) for (let i = 0; !P[k] && i < 6; i++) {
    try { P[k] = await (await p0.request.get(`${HOST}/products/${h}.js`)).json(); } catch (e) { await new Promise((r) => setTimeout(r, 10000 * (i + 1))); }
  }
  fs.writeFileSync(FIX, JSON.stringify(P));
  await c0.close();
  const mem = { member: true, goal: 'build-muscle', history: [
      { p: P.whey.id, type: P.whey.type, t: P.whey.title, tags: '', d: day(40) }, { p: P.crea.id, type: P.crea.type, t: P.crea.title, tags: '', d: day(60) }, { p: P.shaker.id, type: P.shaker.type, t: P.shaker.title, tags: '', d: day(10) }] };
  const CARTS = [
    ['creatine only', () => cartOf([line(P.crea, 1)])],
    ['whey only', () => cartOf([line(P.whey, 1)])],
    ['pre-workout + creatine', () => cartOf([line(P.pre, 1), line(P.crea, 1)])],
    ['gels only', () => cartOf([line(P.gel, 3)])],
    ['vitamins only', () => cartOf([line(P.vitc, 1)])],
    ['Rs 16,200 mixed', () => cartOf([line(P.whey, 1, 1270000), line(P.hydro, 1, 350000)])],
  ];
  const SCEN = [].concat(CARTS.map(([n, f]) => ['guest · ' + n, f, {}]), CARTS.map(([n, f]) => ['member (whey 40d, creatine 60d, shaker 10d ago; goal muscle) · ' + n, f, mem]));
  const rows = [];
  for (const [name, mk, opt = {}] of SCEN.filter((x) => !process.env.ONLY || process.env.ONLY.split('|').includes(x[0]))) for (const w of W) {
    const ctx = await b.newContext({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 800, hasTouch: w < 800 });
    await ctx.addInitScript((o) => { try { localStorage.setItem('snh_ecm_until', String(Date.now() + 864e6)); localStorage.setItem('snh_rv', JSON.stringify(o.viewed || [])); sessionStorage.clear(); } catch (e) {} }, opt);
    const p = await ctx.newPage(), errs = [], cart = mk();
    p.on('pageerror', (e) => errs.push(e.message.slice(0, 80)));
    if (process.env.LOCAL) await p.route(/\/cdn\/shop\/t\/\d+\/assets\/[^/?]+\.(js|css)(\?|$)/, (r) => { const f = path.join(__dirname, '..', '..', 'assets', new URL(r.request().url()).pathname.split('/').pop()); return fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'application/javascript', body: fs.readFileSync(f, 'utf8') }) : r.continue(); });
    await p.route(/\/cart\.js(\?|$)/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(cart) }));
    await p.route(/\/cart\/(change|add|update)(\.js)?/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(cart) }));
    const bi = (x) => ({ pid: x.id, vid: x.variants[0].id, title: x.title, price: x.variants[0].price, available: true, image: x.featured_image });
    if (opt.member || opt.bundle) await p.route((u) => u.pathname === (process.env.PAGE ? '/cart' : '/'), async (r) => {
      const res = await r.fetch(); let t = await res.text();
      t = t.replace(/(<script type="application\/json" data-cart-cfg>)([\s\S]*?)(<\/script>)/, (m, a, j, c) => {
        if (opt.member) j = j.replace('"member": false', '"member": true').replace('"tier": "Bronze"', '"tier": "Silver"');
        if (opt.bundle) j = j.replace(/"bundles": \[[\s\S]*?\]\s*\}\s*$/, '"bundles": ' + JSON.stringify([{ title: 'Creatine + Shaker Stack', save: 'Save 10%', items: [bi(P.crea), bi(P.shaker)] }]) + '}');
        return a + j + c; })
        .replace(/(<script type="application\/json" data-cart-reco>)([\s\S]*?)(<\/script>)/, (m, a, j, c) => { const d = JSON.parse(j); d.history = opt.history; d.goal = opt.goal; return a + JSON.stringify(d) + c; });
      r.fulfill({ response: res, body: t });
    });
    for (let i = 0; i < 3; i++) {   // the preview is sometimes slow: retry until the cart script is up
      await p.goto(HOST + (process.env.PAGE ? '/cart' : '/') + Q, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});
      if (await p.waitForFunction(() => window.SNHCart && window.SNHCart.carts.length, null, { timeout: 45000 }).then(() => true, () => false)) break;
      await p.waitForTimeout(30000 * (i + 1));
    }
    const tid = await p.evaluate(() => window.Shopify && Shopify.theme && Shopify.theme.id); if (tid !== 189832462590) throw new Error('WRONG THEME ' + tid);
    await p.addStyleTag({ content: '[data-email-capture],dialog.ecm,.cmp-pop,#preview-bar-iframe,#PBarNextFrameWrapper,privacy-bar{display:none!important}' }).catch(() => {});
    await p.waitForFunction(() => window.SNHCart && window.SNHCart.carts.length, null, { timeout: 30000 }).catch(() => {});
    if (!process.env.PAGE) await p.evaluate(() => window.SNHCart.open()); else await p.evaluate(() => window.SNHCart.refresh(false));
    await p.waitForFunction(() => { const r = document.querySelector(location.pathname === '/cart' ? '[data-cart-root][data-mode="page"]' : '#cart-drawer [data-cart-root]'); return r && r.hasAttribute('data-cart-decision'); }, null, { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(1500);
    const m = await p.evaluate(() => {
      const r = document.querySelector(location.pathname === '/cart' ? '[data-cart-root][data-mode="page"]' : '#cart-drawer [data-cart-root]'), box = r.querySelector('[data-cart-sugg]'), t = (e, s) => { const x = e.querySelector(s); return x ? x.textContent.replace(/\s+/g, ' ').trim() : ''; };
      return { d: JSON.parse(r.getAttribute('data-cart-decision') || '{}'), head: box && !box.hidden ? t(box, '.scd__bh') : '(none)', cards: box && !box.hidden ? [...box.querySelectorAll('.ssug')].map((e) => t(e, '.ssug__t') + ' · ' + t(e, '.ssug__p')) : [], bundle: !r.querySelector('[data-cart-bundle]').hidden };
    });
    await p.screenshot({ path: path.join(OUT, `${process.env.PAGE ? 'page' : 'reco'}-${name.replace(/\W+/g, '-')}-${w}.png`) });
    rows.push({ name, w, sub: cart.total_price / 100, ...m, errs });
    console.log(w, name, '→', m.head, '|', m.cards.join(' ; '), errs.length ? '| ERR ' + errs.join(';') : '');
    await ctx.close();
    await new Promise((r) => setTimeout(r, +(process.env.PAUSE || 4000)));
  }
  const md = ['# Round 14 recommendation scenarios (mocked carts, drawer, target theme)', '', '| basket | width | subtotal | rule | heading | suggestions (name · price · reason) | why (engine) |', '|---|---|---|---|---|---|---|'];
  rows.forEach((r) => md.push(`| ${r.name} | ${r.w} | Rs ${r.sub.toLocaleString('en-US')} | ${r.d.rule || ''} | ${r.head} | ${r.cards.join('<br>')} | ${(r.d.picked || []).map((x) => x.replace(/\|/g, '/')).join('<br>')} |`));
  fs.writeFileSync(path.join(OUT, 'reco.md'), md.join('\n') + '\n');
  await b.close();
})();
