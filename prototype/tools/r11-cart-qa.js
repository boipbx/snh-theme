// Round 11 cart QA: the drawer (and, with PAGE=1, the cart page) against MOCKED carts. /cart.js, /cart/change.js and
// /cart/add.js are answered with fixture JSON built from real products (read-only product GETs); the real cart is never
// touched. Scenarios: free-delivery gap Rs 1,500 / Rs 3,000 / unlocked, each as a guest and as a Silver member (config
// switched in the page), plus a line discount and a subscription line. PW=<playwright> node prototype/tools/r11-cart-qa.js
// Writes screenshots + prototype/shots/r11/cart/qa.md.
const { chromium } = require(process.env.PW || 'playwright');
const fs = require('fs');
const path = require('path');
const DEV = process.env.DEV || 'http://127.0.0.1:9292';
const OUT = path.join(__dirname, '..', 'shots', 'r11', 'cart');
const HIDE = '.shopify-section--popup,#preview-bar-iframe,privacy-bar,#shopify-pc__banner,.snh-np,[data-email-capture]{display:none!important}';
const HANDLES = ['applied-nutrition-critical-whey-2kg', 'applied-nutrition-creatine-monohydrate', 'sis-go-hydro-tablets'];

function line(p, v, qty, priceCents, extra) {
  const lp = priceCents * qty;
  return Object.assign({ key: v.id + ':mock' + qty, id: v.id, variant_id: v.id, product_id: p.id, quantity: qty, title: p.title + (v.title !== 'Default Title' ? ' - ' + v.title : ''), product_title: p.title, variant_title: v.title, vendor: p.vendor, product_type: p.type, image: p.featured_image, url: '/products/' + p.handle + '?variant=' + v.id, handle: p.handle,
    price: priceCents, original_price: priceCents, final_price: priceCents, line_price: lp, original_line_price: lp, final_line_price: lp, discounts: [], line_level_discount_allocations: [], selling_plan_allocation: null }, extra || {});
}
function cartOf(items, cartDisc) {
  const sub = items.reduce((s, i) => s + i.final_line_price, 0);
  const cd = cartDisc ? cartDisc.total_allocated_amount : 0;
  return { token: 'mock', item_count: items.reduce((s, i) => s + i.quantity, 0), items, items_subtotal_price: sub, original_total_price: items.reduce((s, i) => s + i.original_line_price, 0), total_price: sub - cd, total_discount: cd, cart_level_discount_applications: cartDisc ? [cartDisc] : [], currency: 'LKR', requires_shipping: true };
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
  // totals: 17,000 threshold → gap 1,500 = Rs 15,500, gap 3,000 = Rs 14,000, unlocked = Rs 18,500
  function scenario(total, opts) {
    const a = line(whey, whey.variants[0], 1, 1000000);
    const rest = total * 100 - 1000000;
    const bLine = line(crea, crea.variants[0], 1, rest, opts.sub ? { selling_plan_allocation: { selling_plan: { name: 'Subscribe & save · every 30 days' } } } : {});
    if (opts.disc) { bLine.line_level_discount_allocations = [{ amount: 50000, discount_application: { title: 'Creatine bundle', type: 'automatic' } }]; bLine.final_line_price -= 50000; bLine.final_price -= 50000; bLine.original_line_price = bLine.line_price; }
    return cartOf([a, bLine]);
  }
  const SCEN = [['gap1500', 15500, {}], ['gap3000', 14000, { sub: true }], ['unlocked', 18500, { disc: true }]];
  const rows = [], shots = [];
  for (const [name, total, opts] of SCEN) {
    for (const who of ['guest', 'member']) {
      for (const w of [390, 1440]) {
        const p = await b.newPage({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 800, hasTouch: w < 800 });
        const errs = []; p.on('pageerror', (e) => errs.push(e.message));
        let cart = scenario(total, opts), realPosts = 0;
        await p.route(/\/cart\.js(\?|$)/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(cart) }));
        await p.route(/\/cart\/(change|add|update)(\.js)?/, (r) => { realPosts++; return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(cart) }); });
        await p.route(/monorail|analytics|trekkie|web-pixels/, (r) => r.abort());
        await p.goto(DEV + (process.env.PAGE ? '/cart' : '/'), { waitUntil: 'domcontentloaded', timeout: 90000 });
        await p.addStyleTag({ content: HIDE });
        await p.waitForTimeout(1500);
        if (who === 'member') await p.evaluate(() => window.SNHCart.carts.forEach((c) => { Object.assign(c.cfg, { member: true, tier: 'Silver', rate: 7, spend: 205000 }); }));
        if (!process.env.PAGE) { await p.evaluate(() => { window.SNHCart.open(); }); } else { await p.evaluate(() => window.SNHCart.refresh(false)); }
        await p.waitForTimeout(6000);
        const m = await p.evaluate(() => {
          const r = document.querySelector('[data-cart-root]' + (location.pathname === '/cart' ? '[data-mode="page"]' : ''));
          const t = (s) => { const e = r.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
          const gap = r.querySelector('[data-cart-gap]');
          return { bar: t('.sfree__t'), banner: t('.sdisc'), lines: r.querySelectorAll('.sline').length, tags: [...r.querySelectorAll('.sline__tags span, .sline__sub')].map((e) => e.textContent.trim()),
            gap: gap && !gap.hidden ? [...gap.querySelectorAll('.smini')].map((e) => e.querySelector('.smini__t').textContent.trim() + ' ' + e.querySelector('.smini__p').textContent.trim()) : [],
            pts: t('.ssum__pts'), total: t('.ssum__tot dd'), save: t('.ssum__save dd'), koko: t('.ssum__koko'), checkout: !!r.querySelector('button[name="checkout"]'),
            width: Math.round((document.getElementById('cart-drawer') || r).getBoundingClientRect().width) };
        });
        const file = `${process.env.PAGE ? 'page' : 'drawer'}-${name}-${who}-${w}.png`;
        await p.screenshot({ path: path.join(OUT, file), fullPage: !!process.env.PAGE });
        shots.push(file);
        // a stepper tap re-renders instantly from the (mocked) response
        if (name === 'gap3000' && who === 'guest' && w === 390) {
          cart = scenario(16400, {});
          await p.click('.sline [data-qty]').catch(() => {});
          await p.waitForTimeout(1800);
          m.afterChange = await p.evaluate(() => document.querySelector('.sfree__t').textContent.replace(/\s+/g, ' ').trim() + ' | gap picks ' + [...document.querySelectorAll('[data-cart-gap] .smini')].length);
        }
        rows.push({ name, who, w, ...m, errs, realPosts });
        await p.close();
      }
    }
  }
  await b.close();
  const md = ['# Round 11 cart QA (mocked carts)', '', `Generated ${new Date().toISOString()} against ${DEV}. /cart.js, /cart/change.js and /cart/add.js were answered with fixtures; the real cart was never called.`, '',
    '| scenario | who | width | free-delivery bar | gap-filler | tags | points | total | savings | Koko | checkout | errors |', '|---|---|---|---|---|---|---|---|---|---|---|---|'];
  for (const r of rows) md.push(`| ${r.name} | ${r.who} | ${r.w} | ${r.bar} | ${r.gap.length ? r.gap.length + ': ' + r.gap.join('; ') : '—'} | ${r.tags.join(', ') || '—'} | ${r.pts} | ${r.total} | ${r.save || '—'} | ${r.koko ? 'yes' : '—'} | ${r.checkout ? 'button[name=checkout]' : '⚠'} | ${r.errs.length ? r.errs.join('; ') : '✓'} |`);
  const ch = rows.find((r) => r.afterChange);
  if (ch) md.push('', 'After a stepper tap (mocked response, gap now Rs 600): ' + ch.afterChange);
  md.push('', '## Screenshots', '', ...shots.map((s) => '- ' + s));
  fs.writeFileSync(path.join(OUT, (process.env.PAGE ? 'page-' : '') + 'qa.md'), md.join('\n') + '\n');
  console.log(md.join('\n'));
})();
