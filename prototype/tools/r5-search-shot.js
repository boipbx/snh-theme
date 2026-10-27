// Round 5 phase 7: search tabs (products, articles, collections) + the empty cart page, at 390 and 1280.
//   PW=<playwright> node prototype/tools/r5-search-shot.js
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path');
const OUT = path.join(__dirname, '..', 'shots', 'r5');
const DEV = process.env.DEV || 'http://127.0.0.1:9292';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  for (const w of [390, 1280]) {
    const ctx = await b.newContext({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 800 }); const p = await ctx.newPage();
    const go = async u => { await p.goto(DEV + u, { waitUntil: 'load', timeout: 90000 }); await p.addStyleTag({ content: '.shopify-section--popup,#preview-bar-iframe,privacy-bar{display:none!important}' }); await p.waitForTimeout(1500); };
    await go('/search?q=whey');
    const a = await p.evaluate(() => ({ tabs: document.querySelectorAll('.srtab').length, on: (document.querySelector('.srtab.is-on') || {}).textContent, cards: document.querySelectorAll('.shopify-section--main-search product-card.card').length, over: document.documentElement.scrollWidth - innerWidth }));
    ok(a.tabs === 3 && /Products/.test(a.on) && a.cards > 0 && a.over <= 1, `${w}: products tab (${a.on}), ${a.cards} v2 cards, overflow ${a.over}`);
    await p.screenshot({ path: `${OUT}/search-products-${w}.jpg`, type: 'jpeg', quality: 65 });
    await p.click('[data-srtab-col]'); await p.waitForTimeout(1800);
    const c = await p.evaluate(() => ({ items: document.querySelectorAll('.srcol__item').length, hidden: (document.querySelector('.shopify-section--main-search .collection') || {}).hidden }));
    ok(c.items > 0 && c.hidden, `${w}: collections tab lists ${c.items} collections`);
    await p.screenshot({ path: `${OUT}/search-collections-${w}.jpg`, type: 'jpeg', quality: 65 });
    await go('/search?q=hydration&type=article');
    const r = await p.evaluate(() => ({ posts: document.querySelectorAll('.srposts .post').length, on: (document.querySelector('.srtab.is-on') || {}).textContent }));
    ok(r.posts > 0 && /Articles/.test(r.on), `${w}: articles tab shows ${r.posts} article cards`);
    await p.screenshot({ path: `${OUT}/search-articles-${w}.jpg`, type: 'jpeg', quality: 65 });
    await go('/cart');
    await p.screenshot({ path: `${OUT}/cart-page-${w}.jpg`, type: 'jpeg', quality: 65 });
    await ctx.close();
  }
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})();
