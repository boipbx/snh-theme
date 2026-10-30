// Round 12 campaign QA: mock campaigns (past / active / future, audiences, page targets) are injected into the page's
// data-campaigns JSON (the HTML is fetched for real, only that JSON is replaced). Checks the announcement bar, promo
// popup (+ frequency cap on reload, + never together with the email popup), homepage banner and cart banners.
//   PW=<playwright or pw-preview.js> DEV=<base> node prototype/tools/r12-campaigns-qa.js
const { chromium } = require(process.env.PW || 'playwright');
const fs = require('fs'); const path = require('path');
const DEV = process.env.DEV || 'http://127.0.0.1:9292';
const OUT = path.join(__dirname, '..', 'shots', 'r12', 'p8'); fs.mkdirSync(OUT, { recursive: true });
const D = 864e5, iso = (ms) => new Date(Date.now() + ms).toISOString();
const base = { tag: '', heading: '', message: '', img: '', imgM: '', cta: '', link: '/collections/all', code: '', pages: 'all', audience: 'all', priority: 0, tone: 'orange', freq: 'day', src: 'block' };
const LIST = [
  { ...base, id: 'ann-past', name: 'Past sale', type: 'announcement', tag: 'Sale', message: 'PAST: weekend sale (ended yesterday)', start: iso(-3 * D), end: iso(-D) },
  { ...base, id: 'ann-live', name: 'Live', type: 'announcement', tag: 'This week', message: 'LIVE: 15% off electrolytes every Saturday', start: iso(-D), end: iso(D), tone: 'ink', priority: 5, code: 'SAT15' },
  { ...base, id: 'ann-future', name: 'Future', type: 'announcement', tag: 'Soon', message: 'FUTURE: Black Friday (starts tomorrow)', start: iso(D), end: iso(3 * D) },
  { ...base, id: 'ann-members', name: 'Members only', type: 'announcement', message: 'MEMBERS: double points this week', start: iso(-D), end: iso(D), audience: 'members' },
  { ...base, id: 'pop-live', name: 'Popup live', type: 'popup', heading: 'Weekend stack deal', message: 'Whey + creatine, Rs 2,000 off until Sunday.', cta: 'Shop the deal', code: 'STACK2000', start: iso(-D), end: iso(D), priority: 3, freq: 'day', tone: 'ink' },
  { ...base, id: 'pop-products', name: 'Popup PDP only', type: 'popup', heading: 'PDP only', start: iso(-D), end: iso(D), pages: 'products', priority: 9 },
  { ...base, id: 'home-live', name: 'Home banner', type: 'home_banner', heading: 'RYSE launch week', message: 'Free shaker with any RYSE protein.', cta: 'See RYSE', link: '/collections/ryse', start: iso(-D), end: '' },
  { ...base, id: 'home-future', name: 'Home future', type: 'home_banner', heading: 'FUTURE banner', start: iso(D), end: '' , priority: 9 },
  { ...base, id: 'cart-live', name: 'Cart banner', type: 'cart_banner', heading: 'Free delivery over Rs 17,000', message: 'Same-day in Colombo when you order by 2pm.', start: '', end: iso(D), tone: 'cream' },
];
(async () => {
  const b = await chromium.launch(); const rows = [];
  async function page(pg, w, opts) {
    opts = opts || {};
    const ctx = await b.newContext({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 800, hasTouch: w < 800 });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.route((u) => u.pathname === new URL(DEV + pg.split('?')[0]).pathname, async (r) => {
      if (r.request().resourceType() !== 'document') return r.continue();
      const res = await r.fetch(); let body = await res.text();
      body = body.replace(/("delay":\s*)\d+/, '$11').replace(/("list":\s*)\[[\s\S]*?\]\s*\n?\}<\/script>/, (m, a) => a + JSON.stringify(LIST) + '}</script>');
      if (opts.member) body = body.replace(/(data-campaigns>\{\s*"ctx":\s*\{[^}]*?)"member":\s*false,\s*"tier":\s*""/, '$1"member": true, "tier": "silver"');
      return r.fulfill({ response: res, body, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } });
    });
    await p.route(/\/cart\.js(\?|$)/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ item_count: 0, items: [], total_price: 0, items_subtotal_price: 0, cart_level_discount_applications: [] }) }));
    let status = 0;
    for (let i = 0; i < 3; i++) { const resp = await p.goto(DEV + pg, { waitUntil: 'load', timeout: 90000 }).catch(() => null); status = resp ? resp.status() : 0; if (status === 200 && await p.$('[data-campaigns]')) break; await p.waitForTimeout(8000); }
    await p.waitForTimeout(2500);
    const r = await p.evaluate(() => {
      const ann = [...document.querySelectorAll('.announce__item')].filter((a) => !a.hidden).map((a) => a.textContent.replace(/\s+/g, ' ').trim().slice(0, 60));
      const pop = document.querySelector('dialog.cmp-pop[open]'), ecm = document.querySelector('dialog.ecm[open]');
      return { live: JSON.parse(document.documentElement.getAttribute('data-campaigns-live') || '[]'), ann, tone: (document.querySelector('.announce') || {}).getAttribute && document.querySelector('.announce').getAttribute('data-tone'), barHidden: !!(document.querySelector('.announce') || {}).hidden,
        popup: pop ? pop.getAttribute('data-campaign') + ': ' + pop.textContent.replace(/\s+/g, ' ').trim().slice(0, 80) : null, emailPopup: !!ecm,
        home: [...document.querySelectorAll('[data-campaign-slot="home"] [data-campaign]')].map((x) => x.getAttribute('data-campaign')), cart: [...document.querySelectorAll('[data-campaign-slot="cart"]:not([hidden]) [data-campaign]')].map((x) => x.getAttribute('data-campaign')) };
    });
    await p.screenshot({ path: path.join(OUT, `${opts.shot || pg.replace(/\W+/g, '-') || 'home'}-${w}.png`) });
    let again = null;
    if (opts.reload) { await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(2500); again = await p.evaluate(() => !!document.querySelector('dialog.cmp-pop[open]')); }
    rows.push({ pg, w, opts, r, again, errs: status === 200 ? errs : errs.concat('HTTP ' + status) }); await ctx.close();
  }
  await page('/', 1440, { reload: true, shot: 'home' });
  await page('/', 390, { shot: 'home' });
  await page('/', 1440, { member: true, shot: 'home-member' });
  await page('/?popup=test', 1440, { shot: 'home-with-email-test' });
  await page('/cart', 390, { shot: 'cart' });
  await page('/cart', 1440, { shot: 'cart' });
  await page('/products/applied-nutrition-critical-whey-2kg', 1440, { shot: 'pdp' });
  await b.close();
  const md = ['# Campaign scheduling QA (mock entries relative to now: past = ended yesterday, active = yesterday → tomorrow, future = from tomorrow)', '', '| page | width | visitor | decision per campaign | announcement bar (visible items) | promo popup | email popup | home banner | cart banner | errors |', '|---|---|---|---|---|---|---|---|---|---|'];
  rows.forEach((x) => md.push(`| ${x.pg} | ${x.w} | ${x.opts.member ? 'Silver member' : 'guest'} | ${x.r.live.join(', ')} | ${x.r.barHidden ? 'hidden' : x.r.ann.join(' ‖ ') + ' (tone ' + x.r.tone + ')'} | ${x.r.popup || '—'}${x.again !== null ? ' · after reload: ' + (x.again ? 'shown again ⚠' : 'not shown (once a day) ✓') : ''} | ${x.r.emailPopup ? 'open' : '—'} | ${x.r.home.join(', ') || '—'} | ${x.r.cart.join(', ') || '—'} | ${x.errs.length ? x.errs.join('; ') : '✓'} |`));
  fs.writeFileSync(path.join(OUT, 'campaigns.md'), md.join('\n') + '\n'); console.log(md.join('\n'));
})();
