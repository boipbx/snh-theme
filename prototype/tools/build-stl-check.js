// Round 5 phase 3: Shop the Look interaction check on SNH Dev (:9292). No add-to-cart is performed (live store):
// the Add buttons are only checked for their wiring (one-tap variant id, or a quick-buy drawer that exists).
//   PW=<playwright> node prototype/tools/build-stl-check.js <label>
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path');
const label = process.argv[2] || 'stl';
const OUT = path.join(__dirname, '..', 'shots', 'build');
const URL = (process.env.DEV || 'http://127.0.0.1:9292') + '/';
const HIDE = '.shopify-section--popup,#preview-bar-iframe,privacy-bar{display:none!important}';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

(async () => {
  const b = await chromium.launch();
  // ---- desktop
  let ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  let p = await ctx.newPage();
  await p.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: 'layout-shift', buffered: true });
  });
  await p.goto(URL, { waitUntil: 'networkidle', timeout: 120000 });
  await p.addStyleTag({ content: HIDE });
  const hs = await p.$('section.hs');
  await hs.scrollIntoViewIfNeeded(); await p.waitForTimeout(1200);
  const frame = await p.evaluate(() => { const f = document.querySelector('.hs__frame').getBoundingClientRect(); return [Math.round(f.width), Math.round(f.height)]; });
  ok(Math.abs(frame[0] - frame[1]) <= 1, 'frame is square (reserved ratio) ' + frame.join('x'));
  const dots = await p.$$('.hs__dot');
  ok(dots.length === 4, 'dots ' + dots.length);
  await dots[1].hover(); await p.waitForTimeout(700);
  let st = await p.evaluate(() => ({ s: getComputedStyle(document.querySelector('.hs__frame')).getPropertyValue('--s').trim(), item: document.querySelector('.hs__item[data-spot="1"]').classList.contains('is-hot'), tf: getComputedStyle(document.querySelector('.hs__img-main')).transform }));
  ok(st.item, 'hover dot 2 → card 2 highlighted');
  ok(st.s && st.s !== '1' && st.tf !== 'none', 'image zooms toward dot (--s ' + st.s + ')');
  const pin = await p.evaluate(() => { const d = document.querySelector('.hs__dot[data-spot="1"]').getBoundingClientRect(); return [d.x, d.y]; });
  await p.screenshot({ path: `${OUT}/${label}-hover-1440.jpg`, type: 'jpeg', quality: 70, clip: await hs.boundingBox() });
  await p.mouse.move(5, 5); await p.waitForTimeout(800);
  st = await p.evaluate(() => ({ s: getComputedStyle(document.querySelector('.hs__frame')).getPropertyValue('--s').trim(), hot: document.querySelectorAll('.hs .is-hot').length }));
  ok(st.s === '1' && st.hot === 0, 'leave → zoom reset, nothing highlighted');
  const items = await p.$$('.hs__item');
  await items[2].hover(); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.querySelector('.hs__dot[data-spot="2"]').classList.contains('is-hot')), 'hover card 3 → dot 3 highlighted');
  await p.mouse.move(5, 5); await p.waitForTimeout(300);
  await dots[0].click(); await p.waitForTimeout(500);
  ok(await p.evaluate(() => !document.querySelector('[data-pop="0"]').hidden), 'click dot 1 → popover');
  await p.screenshot({ path: `${OUT}/${label}-pop-1440.jpg`, type: 'jpeg', quality: 70, clip: await hs.boundingBox() });
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.querySelector('[data-pop="0"]').hidden && document.activeElement.classList.contains('hs__dot')), 'Esc closes and returns focus to the dot');
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.activeElement.getAttribute('data-spot') === '1' && document.activeElement.classList.contains('is-hot')), 'arrow key moves to the next dot and activates it');
  const wiring = await p.evaluate(() => [...document.querySelectorAll('.hs__item .v-btn, .hs__pop .v-btn')].filter(x => !x.disabled).map(x => x.hasAttribute('data-v2-add') ? 'add' : (x.getAttribute('aria-controls') && document.getElementById(x.getAttribute('aria-controls')) ? 'drawer' : 'BROKEN')));
  ok(wiring.length > 0 && !wiring.includes('BROKEN'), 'add buttons wired: ' + [...new Set(wiring)].join(','));
  const cls = await p.evaluate(() => window.__cls);
  ok(cls < 0.1, 'CLS ' + cls.toFixed(3));
  await ctx.close();
  // ---- phone
  ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'networkidle', timeout: 120000 });
  await p.addStyleTag({ content: HIDE });
  const hs2 = await p.$('section.hs');
  await hs2.scrollIntoViewIfNeeded(); await p.waitForTimeout(1000);
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('.hs__list')).display !== 'none'), 'phone: list stacked under the image');
  await p.tap('.hs__dot[data-spot="2"]'); await p.waitForTimeout(600);
  const sheet = await p.evaluate(() => { const s = document.querySelector('[data-pop="2"]'); const r = s.getBoundingClientRect(); return { open: !s.hidden, bottom: Math.round(r.bottom), scrim: !document.querySelector('.hs__scrim').hidden }; });
  ok(sheet.open && sheet.bottom >= 840 && sheet.scrim, 'phone: tap dot → bottom sheet + scrim');
  await p.screenshot({ path: `${OUT}/${label}-sheet-390.jpg`, type: 'jpeg', quality: 70 });
  await p.tap('.hs__scrim'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.querySelector('[data-pop="2"]').hidden), 'phone: scrim tap closes the sheet');
  await ctx.close();
  // ---- reduced motion
  ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'networkidle', timeout: 120000 });
  await p.addStyleTag({ content: HIDE });
  await (await p.$('section.hs')).scrollIntoViewIfNeeded();
  await (await p.$$('.hs__dot'))[1].hover(); await p.waitForTimeout(400);
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('.hs__img-main')).transform === 'none' || getComputedStyle(document.querySelector('.hs__img-main')).transform === 'matrix(1, 0, 0, 1, 0, 0)'), 'reduced motion: no zoom');
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})();
