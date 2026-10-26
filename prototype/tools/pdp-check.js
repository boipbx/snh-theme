// PDP alignment + variant behaviour checks.  node tools/pdp-check.js
const { chromium } = require(process.env.PW || 'playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); return c; };
(async () => {
  const b = await chromium.launch();
  for (const w of [1024, 1280, 1440]) {
    const p = await (await b.newContext({ viewport: { width: w, height: 900 } })).newPage();
    await p.goto('http://127.0.0.1:8099/product.html', { waitUntil: 'networkidle' });
    const m = await p.evaluate(() => {
      const r = s => document.querySelector(s).getBoundingClientRect();
      const main = r('.pg__main'), th = r('.pg__thumbs'), title = r('.buy__title'), buy = r('.buy'), wrap = r('.pdp');
      const lefts = [...document.querySelectorAll('.buy > *')].filter(el => el.offsetParent).map(el => Math.round(el.getBoundingClientRect().left));
      return { mainTop: Math.round(main.top), thumbsTop: Math.round(th.top), titleTop: Math.round(title.top), mainH: Math.round(main.height), thumbsH: Math.round(th.height), mainW: Math.round(main.width),
               buyW: Math.round(buy.width), buyLeft: Math.round(buy.left), wrapRight: Math.round(wrap.right), buyRight: Math.round(buy.right), lefts: [...new Set(lefts)] };
    });
    ok(Math.abs(m.mainTop - m.titleTop) <= 2 && m.mainTop === m.thumbsTop, `${w}: gallery top ${m.mainTop} = thumbs top ${m.thumbsTop} = title top ${m.titleTop}`);
    ok(Math.abs(m.thumbsH - m.mainH) <= 1, `${w}: thumb column height ${m.thumbsH} = main image ${m.mainH}`);
    ok(m.lefts.length === 1, `${w}: buy box children share one left edge ${JSON.stringify(m.lefts)}`);
    ok(m.buyRight <= m.wrapRight + 1 && m.buyW >= 360, `${w}: buy box ${m.buyW}px wide, inside the container (right ${m.buyRight} ≤ ${m.wrapRight})`);
    await p.context().close();
  }
  // variant switching
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  await p.goto('http://127.0.0.1:8099/product.html', { waitUntil: 'networkidle' });
  const state = () => p.evaluate(() => ({ img: (() => { const tr = document.querySelector('.pg__track'); return Math.round(tr.scrollLeft / tr.clientWidth); })(), want: JSON.parse(document.querySelector('.vpill[aria-checked="true"]').dataset.variant).media, flav: document.querySelector('[data-flavour]').textContent, price: document.querySelector('[data-price]').textContent, per: document.querySelector('[data-per]').textContent, stock: document.querySelector('[data-stock]').textContent.trim(), atc: document.querySelector('[data-atc-main]').disabled }));
  const s0 = await state();
  await p.tap('.vpill:has-text("Salted Caramel")'); await p.waitForTimeout(900);
  const s1 = await state();
  ok(s0.img === s0.want && s1.img === s1.want && s1.img !== s0.img && s1.flav === 'Salted Caramel', `variant: gallery jumps to the flavour's own live image (${s0.img} -> ${s1.img}) + subtitle follows`);
  ok(await p.evaluate(() => document.querySelectorAll('.pg__slide').length === 17 && document.querySelectorAll('.pg__thumb').length === 17), 'gallery: all 17 live images, 17 thumbs');
  ok(/Rs 31,999/.test(s1.price) && /Rs 525 per serving/.test(s1.per), `variant: price "${s1.price}" and per serving "${s1.per}" update from the variant data`);
  await p.tap('.vpill:has-text("Caramel Latte")'); await p.waitForTimeout(300);
  const s2 = await state();
  ok(s2.stock === 'Sold out' && s2.atc === true, `variant: sold-out flavour shows "Sold out" and disables Add to cart`);
  await p.tap('[data-modal="delivery"]'); await p.waitForTimeout(250);
  ok(await p.evaluate(() => !document.getElementById('m-delivery').hidden), 'Elite strip: Delivery opens the dark modal');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.getElementById('m-delivery').hidden), 'modal closes on Esc');
  await p.evaluate(() => window.scrollTo(0, document.querySelector('.pstats').offsetTop)); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.querySelector('.sticky-atc').classList.contains('is-on')), 'mobile sticky add-to-cart appears after scrolling past the button');
  // round 4 modules
  const order = await p.evaluate(() => { const want = ['buy__title', 'buy__top', 'buy__price', 'buy__perks', 'Flavour', 'Size', 'Purchase option', 'buy__qty', 'buy__ctas', 'btn--wa', 'bx', 'why', 'estrip', 'buy__desc'];
    const kids = [...document.querySelector('.buy').children].map(k => k.matches('fieldset') ? k.querySelector('legend').firstChild.textContent.trim() : [...k.classList].find(c => want.includes(c)) || k.className.split(' ')[0]);
    return kids.filter(k => want.includes(k)).join(' > ') === want.join(' > ') ? 'ok' : kids.join(' > '); });
  ok(order === 'ok', `buy box order matches the brief ${order === 'ok' ? '' : '— ' + order}`);
  await p.tap('.popt__card:nth-of-type(2)'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.querySelectorAll('.popt__card')[1].classList.contains('is-on') && getComputedStyle(document.querySelector('.popt__more')).display !== 'none'), 'purchase option: Subscribe card selects and shows the frequency dropdown');
  await p.tap('#bxp-1'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => !document.getElementById('bx-1').hidden && document.getElementById('bx-0').hidden), 'bundle pills switch between the two live bundles');
  ok(await p.evaluate(() => document.querySelectorAll('.post').length === 3), 'Learn more shows 3 live posts');
  for (const w of [1024, 1280, 1440]) {
    const q = await (await b.newContext({ viewport: { width: w, height: 900 } })).newPage();
    await q.goto('http://127.0.0.1:8099/product.html', { waitUntil: 'networkidle' });
    const s = [];
    for (const f of [0.2, 0.5, 0.8]) {
      s.push(await q.evaluate(f => { const pdp = document.querySelector('.pdp'), r0 = pdp.getBoundingClientRect(); scrollTo({ top: scrollY + r0.top + (pdp.offsetHeight - innerHeight) * f, behavior: 'instant' }); const g = document.querySelector('.pg').getBoundingClientRect(), bb = document.querySelector('.buy').getBoundingClientRect(), hdr = document.querySelector('.hdr').getBoundingClientRect();
        return { gTop: Math.round(g.top), hdr: Math.round(hdr.bottom), overlap: g.right > bb.left + 1 }; }, f));
    }
    ok(s.every(x => !x.overlap && x.gTop >= x.hdr), `${w}: gallery stays sticky under the header while the taller buy box scrolls (${s.map(x => x.gTop).join('/')})`);
    await q.context().close();
  }
  await b.close();
})();
