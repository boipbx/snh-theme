// Round 5 phase 7: cart drawer and cart page with a MOCKED cart (no request ever adds to the live cart): /cart.js and
// /cart?section_id… are answered in the browser from two real products. Shots: prototype/shots/r5/cart-*.jpg
//   PW=<playwright> node prototype/tools/r5-cart-shot.js [label]
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path');
const OUT = path.join(__dirname, '..', 'shots', 'r5');
const DEV = process.env.DEV || 'http://127.0.0.1:9292';
const label = process.argv[2] || 'cart';
(async () => {
  const prods = await Promise.all(['applied-nutrition-critical-whey-2kg', 'sis-go-hydro-tablets'].map(h => fetch(`${DEV}/products/${h}.js`).then(r => r.json())));
  const items = prods.map((p, i) => { const v = p.variants.find(x => x.available) || p.variants[0]; const q = i === 1 ? 2 : 1;
    return { id: v.id, key: v.id + ':mock', variant_id: v.id, product_id: p.id, quantity: q, price: v.price, original_price: v.price, final_price: v.price, line_price: v.price * q, final_line_price: v.price * q, original_line_price: v.price * q, title: p.title + ' - ' + v.title, product_title: p.title, variant_title: v.title, vendor: p.vendor, handle: p.handle, url: '/products/' + p.handle + '?variant=' + v.id, image: p.featured_image, featured_image: { url: p.featured_image, alt: p.title }, options_with_values: [], properties: {}, discounts: [], line_level_discount_allocations: [], requires_shipping: true }; });
  const total = items.reduce((s, i) => s + i.line_price, 0);
  const cart = { token: 'mock', note: '', attributes: {}, items, item_count: items.reduce((s, i) => s + i.quantity, 0), total_price: total, original_total_price: total, items_subtotal_price: total, total_discount: 0, currency: 'LKR', requires_shipping: true, cart_level_discount_applications: [] };
  const b = await chromium.launch();
  for (const w of [390, 1280]) {
    const ctx = await b.newContext({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 800, hasTouch: w < 800 });
    await ctx.route(/\/cart(\.js|\/update\.js|\/change\.js|\/add\.js)(\?.*)?$/, r => r.request().method() === 'GET' ? r.fulfill({ contentType: 'application/json', body: JSON.stringify(cart) }) : r.abort());
    const p = await ctx.newPage();
    p.on('console', m => { if (m.type() === 'error' && !/cdn.shopify|CORS|402|origin_trials|shop.app|Failed to load/.test(m.text())) console.log('  console:', m.text().slice(0, 200)); });
    p.on('pageerror', e => console.log('  pageerror:', e.message.slice(0, 200)));
    await p.goto(DEV + '/collections/whey-protein', { waitUntil: 'load', timeout: 90000 });
    await p.addStyleTag({ content: '.shopify-section--popup,#preview-bar-iframe,privacy-bar{display:none!important}' });
    await p.waitForTimeout(1200);
    await p.evaluate(c => { const d = document.getElementById('cart-drawer'); d && d.show && d.show(); }, cart);
    await p.waitForTimeout(2500);
    console.log('  fetch check:', await p.evaluate(() => fetch('/cart.js').then(r => r.json()).then(j => j.item_count)));
    await p.screenshot({ path: `${OUT}/${label}-drawer-${w}.jpg`, type: 'jpeg', quality: 70 });
    console.log(w, await p.evaluate(() => { const d = document.getElementById('cart-drawer'); const r = d && d.getBoundingClientRect(); return { open: d && d.hasAttribute('open'), w: r && Math.round(r.width), over: document.documentElement.scrollWidth - innerWidth, popover: !!document.querySelector('cart-notification-drawer[open], .cart-notification[open], [is="variant-added"]') }; }));
    await ctx.close();
  }
  await b.close();
})();
