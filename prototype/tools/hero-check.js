// Every overlay slide has eyebrow + headline + sub + CTA visible when active (incl. after looping); banner slides have none.
const { chromium } = require(process.env.PW || 'playwright');
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
(async () => {
  const b = await chromium.launch();
  for (const w of [390, 1440]) {
    const p = await (await b.newContext({ viewport: { width: w, height: w < 800 ? 844 : 900 } })).newPage();
    await p.goto('http://127.0.0.1:8099/', { waitUntil: 'networkidle' });
    await p.evaluate(() => document.querySelector('.hero').classList.add('is-paused'));
    const n = await p.evaluate(() => document.querySelectorAll('.hero .seg').length);
    for (const i of [...Array(n).keys(), 0]) {
      await p.evaluate(i => document.querySelectorAll('.hero .seg')[i].click(), i); await p.waitForTimeout(900);
      const r = await p.evaluate(() => { const s = document.querySelector('.hero__slide.is-on'); const vis = el => el && +getComputedStyle(el).opacity > .9 && el.getBoundingClientRect().height > 0 && el.getBoundingClientRect().bottom <= innerHeight;
        return { banner: s.classList.contains('hero__slide--banner'), parts: ['.eyebrow', '.display', '.hero__sub', '.hero__cta .btn'].map(q => vis(s.querySelector(q))), any: !!s.querySelector('.hero__copy'), btns: s.querySelectorAll('.hero__cta .btn').length }; });
      ok(r.banner ? !r.any : r.parts.every(Boolean), `${w} slide ${i + 1}: ${r.banner ? 'banner, no text overlay' : 'overlay text fully visible (' + r.btns + ' buttons)'}`);
    }
    await p.context().close();
  }
  await b.close();
})();
