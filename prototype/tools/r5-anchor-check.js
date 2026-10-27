// Round 5: jumping to a homepage anchor never hides its heading under the sticky header.
//   PW=<playwright> node prototype/tools/r5-anchor-check.js
const { chromium } = require(process.env.PW || 'playwright');
const DEV = process.env.DEV || 'http://127.0.0.1:9292';
let fails = 0;
(async () => {
  const b = await chromium.launch();
  for (const w of [390, 1440]) {
    const ctx = await b.newContext({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 800 });
    const p = await ctx.newPage();
    await p.goto(DEV + '/', { waitUntil: 'load', timeout: 90000 });
    await p.addStyleTag({ content: '.shopify-section--popup,#preview-bar-iframe,privacy-bar{display:none!important}' });
    const ids = await p.evaluate(() => [...document.querySelectorAll('main [id]')].filter(e => e.matches('section[id], .v2[id]') && e.querySelector('h2')).map(e => e.id));
    for (const id of ids) {
      await p.evaluate(id => { location.hash = ''; location.hash = id; }, id); await p.waitForTimeout(900);
      const r = await p.evaluate(id => { const h = document.getElementById(id).querySelector('h2'), hdr = document.querySelector('.snh-hdr-sec');
        return { h: Math.round(h.getBoundingClientRect().top), hdr: Math.round(hdr.getBoundingClientRect().bottom) }; }, id);
      const pass = r.h >= r.hdr;
      if (!pass) fails++;
      console.log(`${pass ? 'PASS' : 'FAIL'} ${w} #${id}: heading top ${r.h} vs header bottom ${r.hdr}`);
    }
    await ctx.close();
  }
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})();
