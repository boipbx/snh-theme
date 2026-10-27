// Round 5 phase 2: product page check on SNH Dev (:9292). No add-to-cart (live store).
//   PW=<playwright> node prototype/tools/r5-pdp-check.js [handles] [widths]
// Per product × width: no overflow; 12-col alignment (gallery top = buy box top, thumbs rail = stage top, one left
// edge in the buy box); every module present; details band tabs/accordions with normalised headings; sticky add to
// cart only after the main button and never over the footer; gallery image inside its stage; no empty bands.
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path');
const DEV = process.env.DEV || 'http://127.0.0.1:9292';
const OUT = path.join(__dirname, '..', 'shots', 'r5');
const PRODUCTS = (process.argv[2] || 'applied-nutrition-critical-whey-2kg,sis-go-hydro-tablets,raw-cbum-itholate-protein,applied-nutrition-ashwagandha-ksm-66').split(',');
const WIDTHS = (process.argv[3] || '390,768,1024,1280,1440').split(',').map(Number);
const HIDE = '.shopify-section--popup,#preview-bar-iframe,privacy-bar{display:none!important}';
let fails = 0;
const ok = (c, m) => { if (!c) { console.log('  FAIL ' + m); fails++; } else if (process.env.VERBOSE) console.log('  PASS ' + m); };

(async () => {
  const b = await chromium.launch();
  for (const h of PRODUCTS) {
    for (const w of WIDTHS) {
      const ctx = await b.newContext({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 800, hasTouch: w < 800 });
      const p = await ctx.newPage();
      const errs = [];
      p.on('pageerror', e => { const s = e.message + (e.stack || ''); if (!/amose|wpm|klaviyo|judge|jdgm|appstle|shop\.app|google|facebook|tiktok|hoppy/i.test(s)) errs.push(e.message.slice(0, 120)); });
      await p.goto(`${DEV}/products/${h}`, { waitUntil: 'load', timeout: 90000 }).catch(() => {});
      await p.addStyleTag({ content: HIDE });
      await p.waitForTimeout(3000);
      const r = await p.evaluate(() => {
        const q = s => document.querySelector(s), R = e => e && e.getBoundingClientRect();
        const gal = q('.snh-gal'), stage = q('.snh-gal__stage'), info = q('.product-info'), thumbs = q('.snh-gal__thumbs');
        const img = q('.snh-gal__slide.is-active img') || q('.snh-gal__slide img');
        const title = q('.product-info__title, .product-info h1');
        const edges = info ? [...info.children].filter(c => c.offsetHeight > 0 && getComputedStyle(c).position !== 'absolute').map(c => Math.round(R(c).left)) : [];
        const det = q('.v2pdp-details');
        const heads = det ? [...det.querySelectorAll('.det__rte h1, .det__rte h2, .det__rte h3')].map(x => parseFloat(getComputedStyle(x).fontSize)) : [];
        const empties = [...document.querySelectorAll('main .shopify-section')].filter(s => s.offsetHeight > 0 && s.offsetHeight < 40 && !s.querySelector('product-quick-add, script')).map(s => s.id.slice(-30));
        return {
          overflow: document.documentElement.scrollWidth - innerWidth,
          galTop: gal && Math.round(R(gal).top + scrollY), stageTop: stage && Math.round(R(stage).top + scrollY), titleTop: title && Math.round(R(title).top + scrollY), infoTop: info && Math.round(R(info).top + scrollY),
          thumbsTop: thumbs && Math.round(R(thumbs).top + scrollY), edges: [...new Set(edges)],
          imgFits: img && stage ? R(img).height <= R(stage).height + 2 && R(img).top >= R(stage).top - 2 : true,
          perks: !!q('.v2-perks .koko-pdp-message') && !!q('.v2-perks .snh-points-banner'),
          pills: document.querySelectorAll('variant-picker label.block-swatch').length, variants: document.querySelectorAll('variant-picker fieldset').length,
          atc: !!q('.product-info buy-buttons button[type="submit"]'), wa: !!q('.wa-btn, [data-snh-wa-block] a'), benefits: !!q('.snh-benefits'), elite: !!q('.snh-adv'),
          tabs: det ? det.querySelectorAll('[role="tab"]').length : 0, desc: !!(det && det.querySelector('[id$="-description"] .det__rte')),
          headMax: heads.length ? Math.max(...heads) : 0, accInBuyBox: info ? [...info.querySelectorAll('.accordion-group, .product-info__accordion')].filter(x => x.offsetHeight > 0).length : 0,
          reviews: !!q('.jdgm-widget, .jdgm-rev-widg'), related: document.querySelectorAll('.shopify-section--product-recommendations product-card.card').length,
          articles: document.querySelectorAll('.post .post__t').length, recent: !!q('[id*="recently_viewed"]'),
          pstatsEmpty: !!q('.pstats') && !q('.pstats .pstat'), empties,
        };
      });
      const tag = `${h.split('-').slice(0, 3).join('-')} ${w}`;
      const n0 = fails;
      ok(r.overflow <= 1, `${tag}: no horizontal overflow (${r.overflow}px)`);
      if (w >= 1024) {
        ok(Math.abs(r.galTop - r.infoTop) <= 4, `${tag}: gallery top ${r.galTop} = buy box top ${r.infoTop}`);
        ok(Math.abs(r.thumbsTop - r.stageTop) <= 2, `${tag}: thumb rail top ${r.thumbsTop} = stage top ${r.stageTop}`);
        ok(r.edges.length === 1, `${tag}: buy box has one left edge (${r.edges})`);
      }
      ok(r.imgFits, `${tag}: gallery image inside its stage`);
      ok(r.perks, `${tag}: Koko + points row`);
      ok(r.variants === 0 || r.pills > 0, `${tag}: variant pills`);
      ok(r.atc && r.wa && r.benefits && r.elite, `${tag}: add to cart, WhatsApp, benefits, Elite strip (${r.atc}/${r.wa}/${r.benefits}/${r.elite})`);
      ok(r.tabs >= 2 && r.desc, `${tag}: details band with ${r.tabs} tabs incl. description`);
      ok(r.headMax <= 24.5, `${tag}: description headings normalised (max ${r.headMax}px)`);
      ok(r.accInBuyBox === 0, `${tag}: no accordions left in the buy box`);
      ok(r.reviews, `${tag}: reviews widget`);
      ok(r.related >= 2, `${tag}: related products use the v2 card (${r.related})`);
      ok(r.articles >= 2, `${tag}: related articles (${r.articles})`);
      ok(!r.pstatsEmpty && r.empties.length === 0, `${tag}: no empty bands (${r.empties})`);
      // sticky add to cart: hidden at top, shown after the main button, hidden over the footer
      const qa = async () => p.evaluate(() => { const x = document.querySelector('product-quick-add'); return x ? x.classList.contains('is-visible') : null; });
      const top0 = await qa();
      if (top0 !== null) {
        await p.evaluate(() => { const bb = document.querySelector('.product-info buy-buttons'); scrollTo(0, bb.getBoundingClientRect().bottom + scrollY + 300); }); await p.waitForTimeout(600);
        const mid = await qa();
        await p.evaluate(() => { const f = document.querySelector('.footer'); scrollTo(0, f.getBoundingClientRect().top + scrollY - innerHeight / 2); }); await p.waitForTimeout(600);
        const foot = await qa();
        ok(!top0 && mid && !foot, `${tag}: sticky add to cart (top ${top0}, after button ${mid}, at footer ${foot})`);
        const pad = await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('main#main')).paddingBottom));
        ok(pad >= 70, `${tag}: room reserved under the content for the bar (${pad}px)`);
      }
      ok(errs.length === 0, `${tag}: no page errors from our code (${[...new Set(errs)].join(' | ')})`);
      console.log(`${tag}: ${fails === n0 ? 'ok' : (fails - n0) + ' failed'}`);
      if (w === 390 || w === 1280) { await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(400); await p.screenshot({ path: `${OUT}/pdpcheck-${h.split('-')[0]}-${h.split('-')[1]}-${w}.jpg`, type: 'jpeg', quality: 60 }); }
      await ctx.close();
    }
  }
  // recently viewed: fills from browsing history, so view one product, then another
  {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
    const p = await ctx.newPage();
    await p.goto(`${DEV}/products/${PRODUCTS[0]}`, { waitUntil: 'load' }); await p.waitForTimeout(2000);
    await p.goto(`${DEV}/products/${PRODUCTS[1]}`, { waitUntil: 'load' }); await p.waitForTimeout(1500);
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise(r => setTimeout(r, 150)); } });
    await p.waitForTimeout(2500);
    const n = await p.evaluate(() => document.querySelectorAll('.shopify-section--recently-viewed-products product-card.card').length);
    ok(n >= 1, `recently viewed shows the previous product as a v2 card (${n})`);
    console.log(`recently viewed: ${n} card(s)`);
    await ctx.close();
  }
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})();
