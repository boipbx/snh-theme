// SiS slider: full screen, controls, links, autoplay coordination with the hero.
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path');
const OUT = path.join(__dirname, '..', 'shots', process.env.ROUND || 'round4');
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
(async () => {
  const b = await chromium.launch();
  for (const w of [390, 768, 1280, 1440]) {
    const h = w < 800 ? 844 : 900;
    const p = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 800, hasTouch: w < 800 })).newPage();
    await p.goto('http://127.0.0.1:8099/', { waitUntil: 'networkidle' });
    await p.waitForTimeout(800);
    const st = () => p.evaluate(() => [...document.querySelectorAll('[data-carousel]')].map(c => c.classList.contains('is-paused')));
    let s = await st();
    ok(!s[0] && s[1], `${w}: at top, hero plays and SiS slider is paused (${JSON.stringify(s)})`);
    await p.evaluate(() => document.getElementById('sis').scrollIntoView()); await p.waitForTimeout(700);
    s = await st();
    ok(s[0] && !s[1], `${w}: at SiS, hero paused and SiS plays (${JSON.stringify(s)})`);
    const r = await p.evaluate(() => { const r = document.querySelector('.hero--sis').getBoundingClientRect(); return { h: Math.round(r.height), w: Math.round(r.width) }; });
    ok(r.h === h && r.w === w, `${w}: SiS slider is full screen (${r.w}×${r.h})`);
    await p.evaluate(() => document.querySelector('.hero--sis').classList.add('is-paused'));
    for (let i = 0; i < 3; i++) {
      await p.evaluate(i => document.querySelectorAll('.hero--sis .seg')[i].click(), i); await p.waitForTimeout(1300);
      await p.screenshot({ path: `${OUT}/p2-sis-slide${i + 1}-${w}.png` });
    }
    const links = await p.evaluate(() => [...document.querySelectorAll('#sis .hero__slide a')].map(a => a.getAttribute('href')));
    ok(links.length >= 7 && links.every(h => /^\/(collections|products)\//.test(h)), `${w}: every SiS CTA links to an SNH collection/product (${links.length})`);
    const imgs = await p.evaluate(() => [...document.querySelectorAll('#sis .hero img')].filter(i => i.getBoundingClientRect().width > 0).map(i => ({ shown: Math.round(i.getBoundingClientRect().width * devicePixelRatio), nat: i.naturalWidth, src: i.src.split('/').pop().slice(0, 40) })).filter(x => x.nat && x.shown > x.nat * 1.05 && !/\.svg/.test(x.src)));
    ok(imgs.length === 0, `${w}: no SiS raster image shown larger than its native size${imgs.length ? ' ' + JSON.stringify(imgs) : ''}`);
    await p.context().close();
  }
  await b.close();
})();
