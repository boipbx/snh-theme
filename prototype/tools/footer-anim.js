const { chromium } = require(process.env.PW || 'playwright');
const path = require('path');
const OUT = path.join(__dirname, '..', 'shots', process.env.ROUND || 'round4');
(async () => {
  const b = await chromium.launch();
  for (const w of [390, 1440]) {
    const p = await (await b.newContext({ viewport: { width: w, height: w < 800 ? 844 : 900 } })).newPage();
    await p.goto('http://127.0.0.1:8099/', { waitUntil: 'networkidle' });
    await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    for (const [t, n] of [[150, 'start'], [700, 'mid'], [3200, 'end']]) {
      await p.waitForTimeout(n === 'start' ? t : t - (n === 'mid' ? 150 : 700));
      await p.screenshot({ path: `${OUT}/phase5-footer-${n}-${w}.png` });
    }
    await p.context().close();
  }
  await b.close();
})();
