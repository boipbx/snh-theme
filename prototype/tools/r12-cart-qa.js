// Round 12 cart QA: the suggestion decision + the decluttered drawer/page footer against MOCKED carts of
// Rs 2,500 / 8,499 / 14,000 / 16,200 / 18,000. /cart.js, /cart/change.js and /cart/add.js are answered with fixtures
// built from real products (read-only GETs); the real cart is never touched.
//   PW=<playwright> node prototype/tools/r12-cart-qa.js            → drawer at 390 / 768 / 1440
//   PAGE=1 PW=<playwright> node prototype/tools/r12-cart-qa.js     → cart page at 390 / 1440
// Writes screenshots + prototype/shots/r12/cart/(page-)qa.md with the decision log (data-cart-decision) per cart.
const { chromium } = require(process.env.PW || 'playwright');
const fs = require('fs');
const path = require('path');
const DEV = process.env.DEV || 'http://127.0.0.1:9292';
const OUT = path.join(__dirname, '..', 'shots', 'r12', 'cart');
const HIDE = '.shopify-section--popup,#preview-bar-iframe,privacy-bar,#shopify-pc__banner,.snh-np,[data-email-capture],[data-snh-capture]{display:none!important}';
const HANDLES = ['applied-nutrition-critical-whey-2kg', 'applied-nutrition-creatine-monohydrate', 'sis-go-hydro-tablets'];

function line(p, v, qty, priceCents) {
  const lp = priceCents * qty;
  return { key: v.id + ':mock' + priceCents, id: v.id, variant_id: v.id, product_id: p.id, quantity: qty, title: p.title, product_title: p.title, variant_title: v.title, vendor: p.vendor, product_type: p.type, image: p.featured_image, url: '/products/' + p.handle, handle: p.handle,
    price: priceCents, original_price: priceCents, final_price: priceCents, line_price: lp, original_line_price: lp, final_line_price: lp, discounts: [], line_level_discount_allocations: [], selling_plan_allocation: null };
}
function cartOf(items) {
  const sub = items.reduce((s, i) => s + i.final_line_price, 0);
  return { token: 'mock', item_count: items.reduce((s, i) => s + i.quantity, 0), items, items_subtotal_price: sub, original_total_price: sub, total_price: sub, total_discount: 0, cart_level_discount_applications: [], currency: 'LKR', requires_shipping: true };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const ctx0 = await b.newContext();
  const pp = await ctx0.newPage();
  const prods = [];
  for (const h of HANDLES) prods.push(await (await pp.request.get(`${DEV}/products/${h}.js`)).json());
  await ctx0.close();
  const [whey, crea, hydro] = prods;
  const L = (p, rs) => line(p, p.variants[0], 1, rs * 100);
  const SCEN = [
    ['2500', () => cartOf([L(crea, 2500)])],
    ['8499', () => cartOf([L(whey, 8499)])],
    ['14000', () => cartOf([L(whey, 10000), L(crea, 4000)])],
    ['16200', () => cartOf([L(whey, 12700), L(hydro, 3500)])],
    ['18000', () => cartOf([L(whey, 14000), L(crea, 4000)])],
  ];
  const widths = process.env.PAGE ? [390, 1440] : [390, 768, 1440];
  const rows = [], shots = [];
  for (const [name, mk] of SCEN) {
    for (const w of widths) {
      const p = await b.newPage({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 800, hasTouch: w < 800 });
      const errs = []; p.on('pageerror', (e) => errs.push(e.message));
      const cart = mk(); let realPosts = 0;
      await p.route(/\/cart\.js(\?|$)/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(cart) }));
      await p.route(/\/cart\/(change|add|update)(\.js)?/, (r) => { realPosts++; return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(cart) }); });
      await p.route(/monorail|analytics|trekkie|web-pixels/, (r) => r.abort());
      await p.goto(DEV + (process.env.PAGE ? '/cart' : '/'), { waitUntil: 'domcontentloaded', timeout: 90000 });
      await p.addStyleTag({ content: HIDE });
      await p.waitForFunction(() => window.SNHCart && window.SNHCart.carts.length, null, { timeout: 30000 }).catch(() => {});
      if (!process.env.PAGE) await p.evaluate(() => window.SNHCart.open()); else await p.evaluate(() => window.SNHCart.refresh(false));
      await p.waitForFunction(() => { const r = document.querySelector('[data-cart-root]' + (location.pathname === '/cart' ? '[data-mode="page"]' : '')); return r && r.hasAttribute('data-cart-decision'); }, null, { timeout: 30000 }).catch(() => {});
      await p.waitForTimeout(1200);
      const m = await p.evaluate(() => {
        const r = document.querySelector('[data-cart-root]' + (location.pathname === '/cart' ? '[data-mode="page"]' : ''));
        const t = (s, el) => { const e = (el || r).querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
        const foot = r.querySelector('[data-cart-foot]').getBoundingClientRect();
        const box = r.querySelector('[data-cart-sugg]');
        return {
          decision: JSON.parse(r.getAttribute('data-cart-decision') || '{}'),
          bar: t('.sfree__t'),
          sugg: box && !box.hidden ? [...box.querySelectorAll('.ssug')].map((e) => t('.ssug__t', e) + ' · ' + t('.ssug__p', e)) : [],
          head: box && !box.hidden ? t('.scd__bh') : null,
          footVisible: foot.bottom <= innerHeight + 1 && foot.top >= 0,
          footH: Math.round(foot.height),
          total: t('.sft__tot b'), pts: t('.sft__line'), koko: t('.sft__koko'), payLogos: r.querySelectorAll('.spay li').length,
          subtotalBlocks: r.querySelectorAll('.ssum, .scd__sum').length,
          checkout: !!r.querySelector('button[name="checkout"]'),
        };
      });
      const file = `${process.env.PAGE ? 'page' : 'drawer'}-${name}-${w}.png`;
      await p.screenshot({ path: path.join(OUT, file), fullPage: false });
      shots.push(file);
      rows.push({ name, w, ...m, errs, realPosts });
      await p.close();
    }
  }
  await b.close();
  const why = (d) => {
    if (!d.rule) return '—';
    const s = [`gap Rs ${d.gap.toLocaleString()} vs limit Rs ${d.closeLimit.toLocaleString()}`];
    if (d.rule === 'close') s.push(`→ close the gap, window Rs ${d.window.map((x) => x.toLocaleString()).join('–')}`);
    else s.push(`→ ${d.rule}, cap Rs ${d.cap.toLocaleString()} (${d.source})`);
    s.push(`comp cap Rs ${d.compCap.toLocaleString()}: ${d.comp.rule}`);
    s.push(`pool ${d.pool}, excluded in-cart ${d.excluded.inCart} / sold-out ${d.excluded.soldOut} / ≥ subtotal ${d.excluded.overSubtotal}`);
    return s.join('; ');
  };
  const md = [`# Round 12 cart QA (${process.env.PAGE ? 'cart page' : 'drawer'}, mocked carts)`, '', `Generated ${new Date().toISOString()} against ${DEV}. /cart.js, /cart/change.js, /cart/add.js answered with fixtures; the real cart was never called.`, '',
    '| cart | width | rule & why (data-cart-decision) | suggested | footer in view | footer px | total | points | Koko | pay logos | mid-scroll totals | errors |', '|---|---|---|---|---|---|---|---|---|---|---|---|'];
  for (const r of rows) md.push(`| Rs ${Number(r.name).toLocaleString()} | ${r.w} | ${why(r.decision)} | ${r.sugg.length ? r.head + ': ' + r.sugg.join('; ') : '—'} | ${r.footVisible ? '✓' : (process.env.PAGE && r.w > 1023 ? 'sticky column' : '⚠')} | ${r.footH} | ${r.total} | ${r.pts} | ${r.koko ? '✓' : '—'} | ${r.payLogos} | ${r.subtotalBlocks} | ${r.errs.length ? r.errs.join('; ') : '✓'}${r.realPosts ? ' posts:' + r.realPosts : ''} |`);
  md.push('', '## Screenshots', '', ...shots.map((s) => '- ' + s));
  fs.writeFileSync(path.join(OUT, (process.env.PAGE ? 'page-' : '') + 'qa.md'), md.join('\n') + '\n');
  console.log(md.join('\n'));
})();
