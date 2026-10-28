// Round 6: quick screenshots. PW=<playwright> node prototype/tools/r6-shot.js <path> <widths> [full] [outprefix]
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path');
const DEV = process.env.DEV || 'http://127.0.0.1:9292';
const [pth = '/', widths = '1440,390', full = '', pre = 'shot'] = process.argv.slice(2);
const OUT = path.join(__dirname, '..', 'shots', 'r6');
(async () => {
  const b = await chromium.launch();
  for (const w of widths.split(',').map(Number)) {
    const ctx = await b.newContext({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 800, hasTouch: w < 800, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    await p.goto(DEV + pth, { waitUntil: 'load', timeout: 90000 });
    await p.addStyleTag({ content: '.shopify-section--popup,#preview-bar-iframe,privacy-bar,#shopify-pc__banner{display:none!important}' });
    if (full) { await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise(r => setTimeout(r, 150)); } scrollTo(0, 0); }); }
    await p.waitForTimeout(1500);
    const f = path.join(OUT, `${pre}-${w}${full ? '-full' : ''}.png`);
    await p.screenshot({ path: f, fullPage: !!full });
    console.log(f);
    await ctx.close();
  }
  await b.close();
})();
