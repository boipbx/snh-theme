// Round 7: header account panel, opened, at 1440 and 390. PW=<playwright> node prototype/tools/r7-panel-shot.js [path] [prefix]
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path');
const DEV = process.env.DEV || 'http://127.0.0.1:9292';
const [pth = '/', pre = 'panel-out'] = process.argv.slice(2);
const OUT = path.join(__dirname, '..', 'shots', 'r7');
const HIDE = '.shopify-section--popup,#preview-bar-iframe,privacy-bar,#shopify-pc__banner{display:none!important}';
(async () => {
  const b = await chromium.launch();
  for (const w of [1440, 390]) {
    const ctx = await b.newContext({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 800, hasTouch: w < 800 });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(DEV + pth, { waitUntil: 'load', timeout: 90000 });
    await p.addStyleTag({ content: HIDE });
    await p.waitForTimeout(800);
    await p.screenshot({ path: path.join(OUT, `${pre}-header-${w}.png`) });
    await p.locator('.acct-btn:visible').first().click();
    await p.waitForTimeout(600);
    const info = await p.evaluate(() => {
      const a = document.querySelector('#acp'), r = a.getBoundingClientRect();
      return { open: a.classList.contains('is-open'), x: r.x, w: r.width, h: r.height, focus: document.activeElement.className, links: [...a.querySelectorAll('a')].map((x) => x.textContent.trim().replace(/\s+/g, ' ') + ' → ' + x.getAttribute('href')) };
    });
    await p.screenshot({ path: path.join(OUT, `${pre}-${w}.png`) });
    await p.keyboard.press('Escape');
    await p.waitForTimeout(500);
    const closed = await p.evaluate(() => document.querySelector('#acp').hidden && document.activeElement.classList.contains('acct-btn'));
    console.log(w, JSON.stringify(info), 'esc-closed+focus-returned:', closed, errs.length ? 'ERR ' + errs.join(' | ') : '');
    await ctx.close();
  }
  await b.close();
})();
