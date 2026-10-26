// Round 5 phase 5: product page check on SNH Dev (:9292) for Critical Whey, a SiS product and a RAW product.
// No add-to-cart (live store): buttons are checked for presence/wiring only.
//   PW=<playwright> node prototype/tools/build-pdp-check.js <label>
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path');
const label = process.argv[2] || 'pdp';
const OUT = path.join(__dirname, '..', 'shots', 'build');
const DEV = process.env.DEV || 'http://127.0.0.1:9292';
const PRODUCTS = (process.argv[3] || 'applied-nutrition-critical-whey-2kg,sis-go-isotonic-energy-gel,raw-cbum-itholate-protein').split(',');
const HIDE = '.shopify-section--popup,#preview-bar-iframe,privacy-bar{display:none!important}';
let fails = 0;
const ok = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) fails++; };

(async () => {
  const b = await chromium.launch();
  for (const h of PRODUCTS) {
    console.log(h);
    for (const w of [1440, 390]) {
      const ctx = await b.newContext({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 800, hasTouch: w < 800 });
      const p = await ctx.newPage();
      const errs = [];
      p.on('pageerror', e => errs.push((e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' ')).slice(0, 260)));
      await p.goto(`${DEV}/products/${h}`, { waitUntil: 'load', timeout: 90000 });
      await p.addStyleTag({ content: HIDE });
      await p.waitForTimeout(3500);
      const r = await p.evaluate(() => {
        const q = s => document.querySelector(s);
        const box = s => { const e = q(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.x), w: Math.round(r.width) }; };
        const info = q('.product-info');
        const order = info ? [...info.children].filter(c => c.offsetHeight > 0).sort((a, b) => (+getComputedStyle(a).order) - (+getComputedStyle(b).order))
          .map(c => c.querySelector('h1') ? 'title' : c.classList.contains('snh-topline') ? 'topline' : c.classList.contains('snh-subtitle') ? 'sub' : c.classList.contains('snh-payrow') ? 'price'
            : c.querySelector('variant-picker') ? 'variants' : c.querySelector('quantity-selector') ? 'qty' : c.querySelector('buy-buttons') ? 'buttons' : c.hasAttribute('data-snh-wa-block') ? 'whatsapp'
            : c.classList.contains('bx') ? 'bundle' : c.classList.contains('snh-benefits') ? 'why' : c.classList.contains('snh-adv') ? 'elite' : c.classList.contains('snh-desc') ? 'desc' : (c.className || c.tagName).toString().slice(0, 24)) : [];
        const fs = info ? [...info.querySelectorAll('variant-picker fieldset')].map(f => (f.querySelector('.variant-picker__option-info') || {}).textContent.trim()).filter(Boolean) : [];
        const visualFirst = info ? [...info.querySelectorAll('variant-picker fieldset')].sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top).map(f => (f.querySelector('.variant-picker__option-info') || {}).textContent.trim()) : [];
        return {
          title: (q('.product-info__title') || {}).innerText, product: box('.product'), gal: box('.snh-gal'), info: box('.product-info'),
          order, options: visualFirst, perks: !!q('.v2-perks .koko-pdp-message'), points: !!q('.v2-perks .snh-points-banner'),
          per: (q('.v2-per') || {}).textContent || '', bundle: !!q('.product-info .bx'), details: q('[data-v2-details]') && !q('[data-v2-details]').hidden,
          articles: document.querySelectorAll('.post .post__t').length, judgeme: !!q('.jdgm-widget, .jdgm-rev-widg, [id*="judgeme"]'),
          atc: !!q('buy-buttons button[type="submit"]'), wa: !!q('.wa-btn'), overflow: document.documentElement.scrollWidth > innerWidth + 1,
          thumbs: document.querySelectorAll('.snh-gal__thumb').length,
        };
      });
      console.log(`  ${w}px  order: ${r.order.join(' > ')}`);
      ok(r.title && !/^[A-Z]{3,} [A-Z]{3,} /.test(r.title.trim()), `short sentence-case title "${(r.title || '').trim()}"`);
      ok(!r.overflow, 'no horizontal overflow');
      if (w >= 1024) ok(r.gal && r.info && r.gal.w > r.info.w && r.info.x > r.gal.x, `12-col grid (gallery ${r.gal && r.gal.w} | buy box ${r.info && r.info.w})`);
      ok(r.order.indexOf('title') === 0 && r.order.indexOf('price') < r.order.indexOf('variants') && r.order.indexOf('variants') < r.order.indexOf('buttons') && r.order.indexOf('buttons') < r.order.indexOf('whatsapp'), 'buy box order title > … > price > variants > buttons > whatsapp');
      if (r.options.length > 1) ok(/flavo/i.test(r.options[0]), 'flavour option first: ' + r.options.join(' | '));
      ok(r.perks && r.points, 'Koko + points pills');
      ok(r.atc && r.wa, 'add to cart + WhatsApp present');
      ok(r.details, '"The details" band filled');
      ok(r.articles >= 2, `related articles ${r.articles}`);
      console.log(`  info: bundle box ${r.bundle ? 'yes' : 'no (no matching bundle)'} · per serving "${r.per}" · Judge.me ${r.judgeme ? 'yes' : 'not loaded'} · thumbs ${r.thumbs}`);
      // gallery: thumb click moves the slide (desktop) / variant click updates price
      if (w >= 1024 && r.thumbs > 2) {
        const before = await p.evaluate(() => document.querySelector('[data-snh-gal]').dataset.snhIndex || '0');
        await p.click('.snh-gal__thumb:not(.is-active) >> nth=3'); await p.waitForTimeout(800);
        const after = await p.evaluate(() => document.querySelector('[data-snh-gal]').dataset.snhIndex || '0');
        ok(before !== after, `thumb click changes the image (${before} → ${after})`);
      }
      const swatches = await p.$$('variant-picker fieldset:has(label.block-swatch:not(.is-disabled)) input:not(:checked) + label.block-swatch:not(.is-disabled)');
      if (swatches.length) {
        const p0 = await p.evaluate(() => document.querySelector('.snh-payrow sale-price').textContent.trim());
        await swatches[swatches.length - 1].click(); await p.waitForTimeout(2500);
        const st = await p.evaluate(() => ({ price: document.querySelector('.snh-payrow sale-price').textContent.trim(), order: getComputedStyle(document.querySelector('.snh-payrow')).order, perks: !!document.querySelector('.v2-perks .koko-pdp-message') }));
        ok(st.order === '4' && st.perks, `variant change keeps the v2 layout (price ${p0} → ${st.price})`);
      }
      if (w < 800) {
        await p.evaluate(() => window.scrollTo(0, 2600)); await p.waitForTimeout(800);
        const sticky = await p.evaluate(() => { const s = document.querySelector('product-quick-add'); return s ? getComputedStyle(s).visibility + '/' + s.hasAttribute('hidden') : 'none'; });
        console.log('  sticky add to cart: ' + sticky);
      }
      await p.screenshot({ path: `${OUT}/${label}-${h.split('-')[0]}-${w}.jpg`, type: 'jpeg', quality: 62 });
      if (errs.length) console.log('  page errors:\n    ' + [...new Set(errs)].join('\n    '));
      await ctx.close();
    }
  }
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})();
