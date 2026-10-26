// Round 5 phase 4: brand marquee behaviour on SNH Dev (:9292).
//   PW=<playwright> node prototype/tools/build-marquee-check.js
const { chromium } = require(process.env.PW || 'playwright');
const URL = (process.env.DEV || 'http://127.0.0.1:9292') + '/';
const HIDE = '.shopify-section--popup,#preview-bar-iframe,privacy-bar{display:none!important}';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const tx = p => p.evaluate(() => new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.mq__rail')).transform).m41);

(async () => {
  const b = await chromium.launch();
  let ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  let p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'networkidle', timeout: 120000 });
  await p.addStyleTag({ content: HIDE + '.snh-hdr-sec{visibility:hidden}' });
  await p.evaluate(() => { const t = document.querySelector('.mq__track'); window.scrollTo(0, t.getBoundingClientRect().top + window.scrollY - 300); });
  await p.waitForTimeout(400);
  await p.mouse.move(5, 890);
  const m = await p.evaluate(() => { const r = document.querySelector('.mq__rail'); const run = r.querySelector('.logos__run').getBoundingClientRect().width;
    return { run, shift: parseFloat(r.style.getPropertyValue('--mq-shift')), dur: parseFloat(r.style.getPropertyValue('--mq-dur')), runs: r.querySelectorAll('.logos__run').length,
      sizes: [...new Set([...document.querySelectorAll('.mq .logo')].map(l => Math.round(l.getBoundingClientRect().width) + 'x' + Math.round(l.getBoundingClientRect().height)))] }; });
  ok(Math.abs(m.shift + m.run) < 1, `loop shift = one run width (${m.shift} vs ${m.run.toFixed(1)}): seamless`);
  ok(Math.abs(m.run / m.dur - 40) < 1, `constant speed ${(m.run / m.dur).toFixed(1)} px/s (setting 40)`);
  ok(m.sizes.length === 1, 'uniform tiles ' + m.sizes.join(','));
  const a = await tx(p); await p.waitForTimeout(1000); const c = await tx(p);
  ok(c < a && Math.abs((a - c) - 40) < 12, `moving left ~40px/s (${(a - c).toFixed(1)}px in 1s)`);
  const tb = await (await p.$('.mq__track')).boundingBox();
  await p.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2); await p.waitForTimeout(300);
  const h1 = await tx(p); await p.waitForTimeout(800); const h2 = await tx(p);
  ok(Math.abs(h1 - h2) < 0.5, 'hover pauses');
  const logoStyle = await p.evaluate(() => { const l = document.elementFromPoint(...(() => { const r = document.querySelector('.mq__track').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()); const a = l && l.closest('.logo'); return a ? getComputedStyle(a.querySelector('img')).filter : 'none-found'; });
  ok(!/grayscale\(1\)/.test(logoStyle), 'hovered logo in colour (' + logoStyle + ')');
  // drag to scrub, then resume from the same spot
  await p.mouse.move(tb.x + tb.width * 0.7, tb.y + tb.height / 2);
  const d0 = await tx(p);
  await p.mouse.down(); await p.mouse.move(tb.x + tb.width * 0.3, tb.y + tb.height / 2, { steps: 8 });
  const d1 = await tx(p);
  ok(Math.abs((d0 - d1) - tb.width * 0.4) < 6 || d1 > d0, `drag scrubs (${(d1 - d0).toFixed(0)}px)`);
  await p.mouse.up(); await p.mouse.move(5, 890); await p.waitForTimeout(150);
  const r0 = await tx(p);
  const gap = Math.abs(r0 - d1) % m.run; ok(Math.min(gap, m.run - gap) < 12, `resumes from the release point (${d1.toFixed(0)} → ${r0.toFixed(0)})`);
  await ctx.close();
  // touch: horizontal swipe scrubs, page can still scroll vertically (touch-action: pan-y)
  ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'networkidle', timeout: 120000 });
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('.mq__track')).touchAction === 'pan-y'), 'touch: vertical page scroll kept (pan-y)');
  await ctx.close();
  // reduced motion
  ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'networkidle', timeout: 120000 });
  const rm = await p.evaluate(() => { const t = document.querySelector('.mq__track'); return { anim: getComputedStyle(document.querySelector('.mq__rail')).animationName, ov: getComputedStyle(t).overflowX, scroll: t.scrollWidth > t.clientWidth }; });
  ok(rm.anim === 'none' && rm.ov === 'auto' && rm.scroll, 'reduced motion: static, scrolls sideways');
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})();
