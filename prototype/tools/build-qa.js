// Round 5 phase 6: site QA on SNH Dev (:9292). Every page × width: HTTP status, Liquid errors in the HTML, page errors
// (split into ours vs third-party), horizontal overflow, and a fold screenshot in prototype/shots/build/qa/.
//   PW=<playwright> node prototype/tools/build-qa.js
const { chromium } = require(process.env.PW || 'playwright');
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, '..', 'shots', 'build', 'qa');
fs.mkdirSync(OUT, { recursive: true });
const DEV = process.env.DEV || 'http://127.0.0.1:9292';
const PAGES = {
  home: '/', 'col-whey': '/collections/whey-protein', 'col-sis': '/collections/sis', 'col-health': '/collections/health-wellness',
  'pdp-whey': '/products/applied-nutrition-critical-whey-2kg', 'pdp-sis': '/products/sis-go-isotonic-energy-gel', 'pdp-raw': '/products/raw-cbum-itholate-protein',
  cart: '/cart', search: '/search?q=whey',
};
const WIDTHS = [390, 768, 1280, 1440];
const THIRD = /amose|wpm\/|klaviyo|judge|jdgm|trafficly|clarity|appstle|shop\.app|google|facebook|tiktok|origin_trials|hoppy/i;
let problems = 0;

(async () => {
  const b = await chromium.launch();
  for (const [name, url] of Object.entries(PAGES)) {
    const res = await fetch(DEV + url); const html = await res.text();
    const liquid = (html.match(/Liquid (syntax )?error[^<]{0,120}/g) || []);
    const line = [`${name.padEnd(11)} ${res.status}`, liquid.length ? `LIQUID ERRORS: ${[...new Set(liquid)].join(' | ')}` : 'no Liquid errors'];
    if (res.status !== 200 || liquid.length) problems++;
    for (const w of WIDTHS) {
      const ctx = await b.newContext({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 800, hasTouch: w < 800 });
      const p = await ctx.newPage();
      const ours = [], theirs = [];
      p.on('pageerror', e => { const s = (e.message + ' ' + (e.stack || '')).slice(0, 400); (THIRD.test(s) ? theirs : ours).push(e.message.slice(0, 140) + ' @ ' + ((e.stack || '').split('\n')[1] || '').trim().slice(0, 120)); });
      await p.goto(DEV + url, { waitUntil: 'load', timeout: 90000 }).catch(() => {});
      await p.addStyleTag({ content: '.shopify-section--popup,#preview-bar-iframe,privacy-bar{display:none!important}' }).catch(() => {});
      await p.waitForTimeout(2500);
      const ov = await p.evaluate(() => { const w = document.documentElement.scrollWidth - innerWidth; if (w <= 1) return null; const wide = [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(e).position !== 'fixed').slice(0, 3).map(e => e.tagName.toLowerCase() + '.' + (e.className || '').toString().split(' ')[0]); return w + 'px ' + wide.join(','); });
      await p.screenshot({ path: `${OUT}/${name}-${w}.jpg`, type: 'jpeg', quality: 55 });
      const bits = [`${w}:`, ov ? `OVERFLOW ${ov}` : 'ok', ours.length ? `OUR ERRORS ${[...new Set(ours)].join(' ; ')}` : '', theirs.length ? `(3rd-party errors: ${new Set(theirs).size})` : ''];
      if (ov || ours.length) problems++;
      line.push(bits.filter(Boolean).join(' '));
      await ctx.close();
    }
    console.log(line.join('\n   '));
  }
  await b.close();
  console.log(problems ? problems + ' PROBLEMS' : 'ALL CLEAN');
})();
