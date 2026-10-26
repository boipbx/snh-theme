// Mega menu / mobile menu behaviour test + screenshots.  node tools/menu-test.js <label>
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path');
const OUT = path.join(__dirname, '..', 'shots', process.env.ROUND || 'round4');
const label = process.argv[2] || 'menu';
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await p.goto('http://127.0.0.1:8099/', { waitUntil: 'networkidle' });
  const isOpen = id => p.evaluate(id => { const el = document.getElementById(id); return !el.hidden && el.classList.contains('is-open'); }, id);
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('.hdr')).backgroundColor === 'rgba(0, 0, 0, 0)'), 'header transparent over hero at top');
  await p.hover('[data-mega="mega-supplements"]'); await p.waitForTimeout(80);
  ok(!(await isOpen('mega-supplements')), 'no open before 150ms intent delay');
  await p.waitForTimeout(400);
  ok(await isOpen('mega-supplements'), 'hover opens Supplements');
  await p.screenshot({ path: `${OUT}/${label}-mega-supplements-1440.png` });
  await p.hover('[data-mega="mega-brands"]'); await p.waitForTimeout(400);
  ok(await isOpen('mega-brands') && !(await isOpen('mega-supplements')), 'moving to Brands swaps panels');
  await p.screenshot({ path: `${OUT}/${label}-mega-brands-1440.png` });
  await p.mouse.move(700, 880); await p.waitForTimeout(500);
  ok(!(await isOpen('mega-brands')), 'mouse leave closes');
  await p.focus('[data-mega="mega-vitamins"]'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  ok(await isOpen('mega-vitamins'), 'Enter opens Vitamins');
  await p.screenshot({ path: `${OUT}/${label}-mega-vitamins-1440.png` });
  await p.keyboard.press('ArrowDown');
  ok(await p.evaluate(() => document.activeElement.closest('#mega-vitamins') !== null), 'ArrowDown moves focus into the panel');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  ok(!(await isOpen('mega-vitamins')) && await p.evaluate(() => document.activeElement.getAttribute('data-mega') === 'mega-vitamins'), 'Esc closes and returns focus');
  await p.evaluate(() => window.scrollTo(0, 1200)); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.querySelector('.hdr').classList.contains('is-solid') && getComputedStyle(document.querySelector('.hdr')).backgroundColor === 'rgb(255, 255, 255)'), 'header solid white after scroll');
  await p.screenshot({ path: `${OUT}/${label}-header-solid-1440.png` });
  await p.context().close();
  for (const w of [390, 768]) {
    const m = await (await b.newContext({ viewport: { width: w, height: 844 }, isMobile: true, hasTouch: true })).newPage();
    await m.goto('http://127.0.0.1:8099/', { waitUntil: 'networkidle' });
    await m.tap('.hdr__menu'); await m.waitForTimeout(450);
    ok(await m.evaluate(() => document.getElementById('mmenu').classList.contains('is-open')), `${w}: tap opens mobile menu`);
    await m.tap('#mmenu .mm__top > summary'); await m.waitForTimeout(200);
    await m.tap('#mmenu .mm__top[open] .mm__sub > summary'); await m.waitForTimeout(200);
    await m.screenshot({ path: `${OUT}/${label}-mobile-menu-${w}.png` });
    await m.tap('.mmenu__close'); await m.waitForTimeout(450);
    ok(await m.evaluate(() => document.getElementById('mmenu').hidden), `${w}: close button closes`);
    await m.context().close();
  }
  await b.close();
})();
