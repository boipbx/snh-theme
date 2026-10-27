// Round 5 phase 1: the product card is the same everywhere. For each page × width: every card has the same parts,
// quick add is wired (single variant = data-v2-add, multi = a quick-buy drawer), every packshot was processed
// (assets/snh-v2.js data-v2-lift), cards in a row have equal height and aligned prices. No add-to-cart.
//   PW=<playwright> node prototype/tools/r5-card-check.js
const { chromium } = require(process.env.PW || 'playwright');
const DEV = process.env.DEV || 'http://127.0.0.1:9292';
const PAGES = { home: '/', collection: '/collections/whey-protein', search: '/search?q=creatine', pdp: '/products/applied-nutrition-critical-whey-2kg' };
let fails = 0;
const ok = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) fails++; };

(async () => {
  const b = await chromium.launch();
  for (const [name, url] of Object.entries(PAGES)) {
    for (const w of [390, 1440]) {
      const ctx = await b.newContext({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 800, hasTouch: w < 800 });
      const p = await ctx.newPage();
      await p.goto(DEV + url, { waitUntil: 'load', timeout: 90000 }).catch(() => {});
      await p.addStyleTag({ content: '.shopify-section--popup,#preview-bar-iframe,privacy-bar{display:none!important}' });
      // scroll through so lazy images load
      await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise(r => setTimeout(r, 150)); } });
      await p.waitForTimeout(1500);
      const r = await p.evaluate(() => {
        const cards = [...document.querySelectorAll('product-card.card')];
        const parts = ['.card__tile', '.card__body', '.card__top', '.card__name', '.card__foot', '.card__price', '.card__koko'];
        const missing = cards.filter(c => parts.some(s => !c.querySelector(s))).length;
        const others = document.querySelectorAll('product-card:not(.card), .snh-pc, .product-card').length;
        const quickBad = cards.filter(c => !c.classList.contains('card--out')).filter(c => { const q = c.querySelector('.quick'); if (!q) return true; return !(q.hasAttribute('data-v2-add') || (q.getAttribute('aria-controls') && document.getElementById(q.getAttribute('aria-controls')))); }).length;
        const imgs = cards.map(c => c.querySelector('.card__img:not(.card__img--alt) img')).filter(Boolean);
        const loaded = imgs.filter(i => i.complete && i.naturalWidth);
        const unprocessed = loaded.filter(i => !i.classList.contains('is-ready')).length;
        // rows: group visible cards by top; equal heights and price baselines
        const vis = cards.filter(c => c.offsetParent && c.getBoundingClientRect().width > 0);
        const rows = {};
        vis.forEach(c => { const t = Math.round(c.getBoundingClientRect().top + scrollY); (rows[t] = rows[t] || []).push(c); });
        let badRows = 0;
        Object.values(rows).filter(r => r.length > 1).forEach(r => {
          const hs = r.map(c => Math.round(c.getBoundingClientRect().height)), ps = r.map(c => Math.round(c.querySelector('.card__price').getBoundingClientRect().top));
          if (Math.max(...hs) - Math.min(...hs) > 2 || Math.max(...ps) - Math.min(...ps) > 2) badRows++;
        });
        const quickVisible = vis.slice(0, 2).map(c => { const q = c.querySelector('.quick'); return q ? getComputedStyle(q).opacity : 'none'; });
        return { n: cards.length, missing, others, quickBad, imgs: loaded.length, unprocessed, rows: Object.keys(rows).length, badRows, quickVisible };
      });
      console.log(`${name} ${w}: ${r.n} cards, ${r.imgs} images loaded`);
      ok(r.n > 0, 'cards present');
      ok(r.missing === 0, `every card has every part (${r.missing} missing)`);
      ok(r.others === 0, `no other card markup on the page (${r.others})`);
      ok(r.quickBad === 0, `quick add wired on every available card (${r.quickBad} bad)`);
      ok(r.unprocessed === 0, `every loaded packshot processed (${r.unprocessed} left)`);
      ok(r.badRows === 0, `equal heights and aligned prices in every row (${r.badRows} bad of ${r.rows})`);
      if (w < 800) ok(r.quickVisible.every(o => o === 'none' || o === '1'), `quick add visible on phones (${r.quickVisible})`);
      await ctx.close();
    }
  }
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})();
