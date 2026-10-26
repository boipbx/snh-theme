// Viewport shot of every hero slide.  node tools/hero.js <label> [widths]
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path');
const OUT = path.join(__dirname, '..', 'shots', process.env.ROUND || 'round4');
const [label = 'hero', widthsArg = '390,768,1440'] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  for (const w of widthsArg.split(',').map(Number)) {
    const p = await (await b.newContext({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 800, hasTouch: w < 800 })).newPage();
    await p.goto('http://127.0.0.1:8099/', { waitUntil: 'networkidle' });
    await p.evaluate(() => document.querySelector('.hero').classList.add('is-paused'));
    const n = await p.evaluate(() => document.querySelectorAll('.hero .seg').length);
    for (let i = 0; i < n; i++) {
      await p.evaluate(i => document.querySelectorAll('.hero .seg')[i].click(), i);
      await p.waitForTimeout(1700);
      await p.screenshot({ path: `${OUT}/${label}-slide${i + 1}-${w}.jpg`, type: 'jpeg', quality: 80 });
    }
    await p.context().close();
  }
  await b.close();
})();
