// R18 #5: mobile menu shots at 360/390/430 (root + first mega level) with tab geometry.
const { chromium } = require(process.env.PW || '/Users/pabasaradissanayake/Documents/eisenbahn-ops/qa/node_modules/playwright');
const path = require('path'); const OUT = path.join(__dirname, '..', 'shots', 'r18'); const tag = process.argv[2] || 'menu';
(async () => {
  const b = await chromium.launch();
  for (const w of [360, 390, 430]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    await p.goto('https://sports-nutrition-hub.myshopify.com/?preview_theme_id=189832462590&_r=' + Date.now(), { waitUntil: 'load', timeout: 90000 });
    const id = await p.evaluate(() => Shopify.theme.id); if (id !== 189832462590) console.log('WRONG THEME', id);
    await p.addStyleTag({ content: '#preview-bar-iframe,#PBarNextFrameWrapper{display:none!important}' });
    await p.click('.hdr__menu'); await p.waitForTimeout(700);
    await p.screenshot({ path: `${OUT}/${tag}-root-${w}.png` });
    await p.click('.mmenu [data-level]'); await p.waitForTimeout(700);
    const g = await p.evaluate(() => {
      const lv = [...document.querySelectorAll('.mm__level')].find((l) => !l.inert);
      const t = lv.querySelector('.mm__tabs'), r = t.getBoundingClientRect(), list = lv.querySelector('.mm__list:not([hidden]) a');
      const bs = [...t.querySelectorAll('button')].map((x) => { const q = x.getBoundingClientRect(); return [Math.round(q.left - r.left), Math.round(q.width), Math.round(q.top - r.top), Math.round(q.height)]; });
      const span = [...t.querySelectorAll('button')].map((x) => { const range = document.createRange(); range.selectNodeContents(x); const q = range.getBoundingClientRect(), bq = x.getBoundingClientRect(); return Math.round((q.left - bq.left) - (bq.right - q.right)); });
      return { tabs: [Math.round(r.left), Math.round(r.width), Math.round(r.height)], buttons: bs, labelOffCentre: span, listLeft: list && Math.round(list.getBoundingClientRect().left), overflow: lv.scrollWidth - lv.clientWidth };
    });
    console.log(w, JSON.stringify(g));
    await p.screenshot({ path: `${OUT}/${tag}-level-${w}.png` });
    await ctx.close();
  }
  await b.close();
})();
