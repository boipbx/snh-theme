// Round 5 phase 3: brand marquee on the ink band. Both rows: seamless (shift = one run), constant px/s, opposite
// directions, hover pauses, drag scrubs; every logo trimmed (is-fit) to the same height, links to a collection.
//   PW=<playwright> node prototype/tools/r5-marquee-check.js
const { chromium } = require(process.env.PW || 'playwright');
const URL = (process.env.DEV || 'http://127.0.0.1:9292') + '/';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

(async () => {
  const b = await chromium.launch();
  for (const w of [1440, 390]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: w < 800, hasTouch: w < 800 });
    const p = await ctx.newPage();
    await p.goto(URL, { waitUntil: 'load', timeout: 120000 });
    await p.addStyleTag({ content: '.shopify-section--popup,#preview-bar-iframe,privacy-bar{display:none!important}' });
    await p.evaluate(() => { const t = document.querySelector('.mqd'); scrollTo(0, t.getBoundingClientRect().top + scrollY - 200); });
    await p.waitForTimeout(2500);
    if (w > 800) await p.mouse.move(5, 5);
    const rows = await p.evaluate(() => [...document.querySelectorAll('.mqd__row')].map(r => { const rail = r.querySelector('.mq__rail'), run = rail.querySelector('.logos__run').getBoundingClientRect().width;
      return { run, shift: parseFloat(rail.style.getPropertyValue('--mq-shift')), dur: parseFloat(rail.style.getPropertyValue('--mq-dur')), right: r.classList.contains('mq--right') }; }));
    const speed = await p.evaluate(() => +document.querySelector('.mqd__row').getAttribute('data-speed'));
    ok(rows.length === 2 && rows[0].right !== rows[1].right, `${w}: two rows, opposite directions`);
    rows.forEach((r, i) => {
      ok(Math.abs(r.shift + r.run) < 1, `${w} row ${i + 1}: loop shift = one run (${r.shift} / ${r.run.toFixed(1)})`);
      ok(Math.abs(r.run / r.dur - speed) < 1, `${w} row ${i + 1}: ${(r.run / r.dur).toFixed(1)} px/s (setting ${speed})`);
    });
    const tx = i => p.evaluate(i => new DOMMatrixReadOnly(getComputedStyle(document.querySelectorAll('.mqd .mq__rail')[i]).transform).m41, i);
    const a0 = await tx(0), a1 = await tx(1); await p.waitForTimeout(1000); const c0 = await tx(0), c1 = await tx(1);
    const d0 = a0 - c0, d1 = a1 - c1;
    ok(Math.sign(d0) !== Math.sign(d1) && Math.abs(Math.abs(d0) - speed) < 12, `${w}: rows move ${d0.toFixed(0)} and ${d1.toFixed(0)} px in 1s`);
    const logos = await p.evaluate(() => { const L = [...document.querySelectorAll('.mqd .logos__run:first-child .logo')];
      return { n: L.length, fit: L.filter(l => l.classList.contains('is-fit')).length, hs: [...new Set(L.map(l => Math.round(l.getBoundingClientRect().height)))],
        links: L.filter(l => /\/collections\//.test(l.getAttribute('href'))).length, white: L.filter(l => /invert|contrast/.test(getComputedStyle(l.querySelector('img') || l).filter)).length,
        tiles: L.filter(l => { const s = getComputedStyle(l); return s.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(s.borderTopWidth) > 0; }).length }; });
    ok(logos.fit === logos.n, `${w}: every logo trimmed to its mark (${logos.fit}/${logos.n})`);
    ok(logos.hs.length === 1, `${w}: one logo height (${logos.hs})`);
    ok(logos.links === logos.n, `${w}: every logo links to a collection (${logos.links}/${logos.n})`);
    ok(logos.white === logos.n && logos.tiles === 0, `${w}: white monochrome, no tiles (${logos.white}/${logos.n}, tiles ${logos.tiles})`);
    if (w > 800) {
      const tb = await (await p.$('.mqd .mq__track')).boundingBox();
      await p.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2); await p.waitForTimeout(300);
      const h1 = await tx(0); await p.waitForTimeout(800); const h2 = await tx(0);
      ok(Math.abs(h1 - h2) < .5, `${w}: hover pauses`);
      await p.mouse.down(); await p.mouse.move(tb.x + tb.width / 2 - 160, tb.y + tb.height / 2, { steps: 8 }); const g = await tx(0); await p.mouse.up();
      ok(Math.abs(g - h2) > 100, `${w}: drag scrubs (${(g - h2).toFixed(0)}px)`);
    }
    await ctx.close();
  }
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})();
