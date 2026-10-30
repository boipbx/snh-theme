// Round 12, phase 10: full-page screenshots of the QA pages at 390 / 768 / 1440 → prototype/shots/r12/qa/ (not in git).
//   REAL_PW=playwright PW=$PWD/prototype/tools/pw-preview.js THEME=189832462590 HOST=https://sports-nutrition-hub.myshopify.com node prototype/tools/r12-qa-shots.js
const { chromium } = require(process.env.PW || 'playwright');
const fs = require('fs'), path = require('path');
const HOST = process.env.HOST || 'https://sports-nutrition-hub.myshopify.com', Q = '?preview_theme_id=' + (process.env.THEME || '189832462590');
const OUT = path.join(__dirname, '..', 'shots', 'r12', 'qa'); fs.mkdirSync(OUT, { recursive: true });
const PAGES = (process.env.PAGES || '/,/collections/whey-protein,/products/sis-go-hydro-tablets,/cart,/pages/snh-elite,/account/login').split(',');
const HIDE = '[data-email-capture],dialog.ecm,.cmp-pop,.shopify-section--popup,#preview-bar-iframe,privacy-bar,#shopify-pc__banner{display:none!important}';
(async () => {
  const b = await chromium.launch();
  for (const w of [390, 768, 1440]) {
    const ctx = await b.newContext({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 600, hasTouch: w < 800 });
    await ctx.addInitScript(() => { try { localStorage.setItem('snh_ecm_until', String(Date.now() + 864e6)); } catch (e) {} });
    const p = await ctx.newPage();
    for (const pg of PAGES) {
      const name = (pg.replace(/^\/|\/$/g, '').replace(/\W+/g, '-') || 'home') + '-' + w + '.png';
      try {
        await p.goto(HOST + pg + Q, { waitUntil: 'load', timeout: 90000 });
        await p.addStyleTag({ content: HIDE });
        await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } window.scrollTo(0, 0); });
        await p.waitForTimeout(1200);
        await p.screenshot({ path: path.join(OUT, name), fullPage: true });
        const errs = await p.evaluate(() => ({ title: document.title.slice(0, 40), sx: document.documentElement.scrollWidth > innerWidth }));
        console.log('ok', name, JSON.stringify(errs));
      } catch (e) { console.log('FAIL', name, e.message.split('\n')[0]); }
    }
    await ctx.close();
  }
  await b.close();
})();
