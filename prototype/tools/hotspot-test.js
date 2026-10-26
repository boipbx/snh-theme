const { chromium } = require(process.env.PW || 'playwright');
const path = require('path');
const OUT = path.join(__dirname, '..', 'shots', process.env.ROUND || 'round4');
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const p = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 800, hasTouch: w < 800 })).newPage();
    await p.goto('http://127.0.0.1:8099/', { waitUntil: 'networkidle' });
    await p.evaluate(() => document.querySelector('.hs').scrollIntoView()); await p.waitForTimeout(800);
    const visiblePops = () => p.evaluate(() => [...document.querySelectorAll('.hs__pop')].filter(x => !x.hidden).length);
    ok(await visiblePops() === 0, `${w}: no product cards open initially`);
    if (w < 800) await p.tap('.hs__dot[data-spot="0"]'); else await p.click('.hs__dot[data-spot="0"]');
    await p.waitForTimeout(400);
    ok(await visiblePops() === 1, `${w}: tapping dot 1 opens its card`);
    const inView = await p.evaluate(() => { const r = document.querySelector('.hs__pop:not([hidden])').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight + 1; });
    ok(inView, `${w}: card fully on screen`);
    await p.screenshot({ path: `${OUT}/phase3-hotspot-open-${w}.png` });
    await p.click('.hs__pop:not([hidden]) [data-atc]'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.querySelector('.icon-btn__count').textContent) === '1', `${w}: Add to basket updates the bag count`);
    if (w >= 800) { await p.click('.hs__dot[data-spot="2"]'); await p.waitForTimeout(300); ok(await p.evaluate(() => document.querySelector('.hs__pop[data-pop="2"]').hidden === false && document.querySelector('.hs__item[data-spot="2"]').classList.contains('is-hot')), `${w}: dot 3 opens and highlights list row 3`); }
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    ok(await visiblePops() === 0, `${w}: Esc closes`);
    await p.context().close();
  }
  await b.close();
})();
