// Round 5: header/footer interaction check on SNH Dev (:9292), with the prototype for reference.
//   PW=<playwright> node prototype/tools/build-header-check.js <label>
// Shots: mega panel open (each panel), search with a query, mobile drill-down, footer. Prints pass/fail lines.
const { chromium } = require(process.env.PW || 'playwright');
const fs = require('fs');
const path = require('path');
const label = process.argv[2] || 'hdr';
const OUT = path.join(__dirname, '..', 'shots', 'build');
fs.mkdirSync(OUT, { recursive: true });
const DEV = process.env.DEV || 'http://127.0.0.1:9292';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const hide = '.shopify-section--popup,#preview-bar-iframe,#PBarNextFrameWrapper,newsletter-popup,.newsletter-popup,privacy-bar{display:none!important}';

(async () => {
  const b = await chromium.launch();
  // desktop
  let ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  let p = await ctx.newPage();
  await p.goto(DEV + '/', { waitUntil: 'networkidle', timeout: 120000 });
  await p.addStyleTag({ content: hide });
  const hh = await p.evaluate(() => document.querySelector('.hdr').getBoundingClientRect().height);
  ok(hh > 60 && hh < 80, 'header bar height ' + hh);
  const btns = await p.$$('.nav__btn');
  ok(btns.length >= 6, 'nav buttons ' + btns.length);
  for (let k = 0; k < btns.length; k++) {
    await btns[k].hover();
    await p.waitForTimeout(600);
    const st = await p.evaluate(k => { const b = document.querySelectorAll('.nav__btn')[k]; const pn = document.getElementById(b.getAttribute('aria-controls')); return { open: b.getAttribute('aria-expanded'), vis: pn && !pn.hidden, h: pn && pn.getBoundingClientRect().height, label: b.textContent.trim() }; }, k);
    ok(st.open === 'true' && st.vis, `mega "${st.label}" opens (h ${Math.round(st.h)})`);
    await p.screenshot({ path: `${OUT}/${label}-mega-${k}-1440.jpg`, type: 'jpeg', quality: 65 });
  }
  await p.mouse.move(700, 800); await p.waitForTimeout(500);
  ok(await p.evaluate(() => !document.querySelector('.nav__btn[aria-expanded="true"]')), 'mega closes on leave');
  await p.click('[data-open-search]');
  await p.waitForTimeout(400);
  await p.keyboard.type('whey');
  await p.waitForTimeout(2500);
  const n = await p.evaluate(() => document.querySelectorAll('.srch [data-r="p"] li a').length);
  ok(n > 0, 'predictive search products ' + n);
  await p.screenshot({ path: `${OUT}/${label}-search-1440.jpg`, type: 'jpeg', quality: 65 });
  await p.keyboard.press('Escape');
  await p.evaluate(() => window.scrollTo(0, 1400)); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.querySelector('.hdr').classList.contains('is-solid') && Math.abs(document.querySelector('.hdr').getBoundingClientRect().top) < 2), 'header solid + stuck on scroll');
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await p.waitForTimeout(3500);
  await p.screenshot({ path: `${OUT}/${label}-footer-1440.jpg`, type: 'jpeg', quality: 65 });
  ok(await p.evaluate(() => { const m = document.querySelector('.ftr__mark'); return !m || m.classList.contains('is-in'); }), 'footer mark revealed');
  await ctx.close();
  // mobile
  ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  p = await ctx.newPage();
  await p.goto(DEV + '/', { waitUntil: 'networkidle', timeout: 120000 });
  await p.addStyleTag({ content: hide });
  await p.tap('.hdr__menu'); await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/${label}-mmenu-root-390.jpg`, type: 'jpeg', quality: 65 });
  await p.tap('.mm__level.is-on [data-level]'); await p.waitForTimeout(600);
  ok(await p.evaluate(() => document.querySelectorAll('.mm__level.is-on').length === 1 && !document.querySelector('.mm__level.is-on').hasAttribute('data-root')), 'mobile drill-down level 2');
  await p.screenshot({ path: `${OUT}/${label}-mmenu-l2-390.jpg`, type: 'jpeg', quality: 65 });
  await p.tap('.mm__level.is-on .mm__back'); await p.waitForTimeout(600);
  ok(await p.evaluate(() => document.querySelector('.mm__level.is-on').hasAttribute('data-root')), 'mobile back');
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await ctx.close();
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})();
