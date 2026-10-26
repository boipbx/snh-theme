// Round 3 QA: overflow, shared container edges, images, hero fill, dead zones.  node tools/qa.js
const { chromium } = require(process.env.PW || 'playwright');
const WIDTHS = [390, 768, 1280, 1440];
let fails = 0;
const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
(async () => {
  const b = await chromium.launch();
  for (const page of ['/', '/product.html']) {
    for (const w of WIDTHS) {
      const h = w < 800 ? 844 : 900;
      const p = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 800, hasTouch: w < 800 })).newPage();
      const errs = [];
      p.on('pageerror', e => errs.push(e.message));
      await p.goto('http://127.0.0.1:8099' + page, { waitUntil: 'networkidle' });
      const tag = `${page === '/' ? 'home' : 'pdp '} ${w}`;
      if (page === '/') {
        const hero = await p.evaluate(() => { const r = document.querySelector('.hero').getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight }; });
        ok(Math.abs(hero.bottom - hero.vh) <= 2, `${tag}: hero fills the screen (hero ${hero.top}→${hero.bottom}, viewport ${hero.vh})`);
      }
      await p.evaluate(async () => {
        document.querySelectorAll('.reveal, .ftr__mark').forEach(el => el.classList.add('is-in'));
        document.querySelectorAll('img[loading="lazy"]').forEach(i => { i.loading = 'eager'; });
        for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); }
      });
      await p.waitForTimeout(2500);
      await p.waitForFunction(() => [...document.images].every(i => i.complete), null, { timeout: 30000 }).catch(() => {});
      const m = await p.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const wrap = document.querySelector('main .wrap');
        const cs = getComputedStyle(wrap);
        const edge = wrap.getBoundingClientRect().left + parseFloat(cs.paddingLeft);
        // every section heading block / first text column must start on the container edge
        const starts = [...document.querySelectorAll('main .head, main .split > :first-child, main .why-head, main .sis__text, main .hs__grid, main .news, main .hero__copy, main .crumbs, main .pdp, main .goalbar__in, main .logos__in')]
          .filter(el => el.offsetParent).map(el => ({ cls: el.className.split(' ')[0], left: Math.round(el.getBoundingClientRect().left + (el.matches('.goalbar__in, .logos__in, .hero__copy, .news, .pdp') ? parseFloat(getComputedStyle(el).paddingLeft) : 0)) }));
        const off = starts.filter(s => Math.abs(s.left - Math.round(edge)) > 1);
        const broken = [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.src.slice(-60));
        // dead zones: sections where less than ~15% of the area is painted by content
        const dead = [...document.querySelectorAll('main > section, main > div, main > nav')].filter(s => s.offsetHeight > 300).map(s => {
          const r = s.getBoundingClientRect(); let covered = 0;
          s.querySelectorAll('img, h1, h2, h3, p, a, button, li, figure, details, .ph').forEach(e => { const q = e.getBoundingClientRect(); if (q.width * q.height < r.width * r.height) covered += q.width * q.height; });
          return { id: s.id || s.className.split(' ')[0], ratio: covered / (r.width * r.height) };
        }).filter(x => x.ratio < 0.15);
        return { scrollW: document.documentElement.scrollWidth, vw, edge: Math.round(edge), off, broken, images: document.images.length, dead };
      });
      ok(m.scrollW <= m.vw, `${tag}: no horizontal overflow (${m.scrollW}/${m.vw})`);
      ok(m.off.length === 0, `${tag}: section starts on the container edge ${m.edge}px${m.off.length ? ' — off: ' + JSON.stringify(m.off) : ''}`);
      ok(m.broken.length === 0, `${tag}: all ${m.images} images load${m.broken.length ? ' — broken: ' + m.broken.join(', ') : ''}`);
      ok(m.dead.length === 0, `${tag}: no dead zones${m.dead.length ? ' — ' + JSON.stringify(m.dead) : ''}`);
      ok(errs.length === 0, `${tag}: no JS errors${errs.length ? ' — ' + errs.join(' | ') : ''}`);
      await p.context().close();
    }
  }
  await b.close();
  console.log(fails ? `\n${fails} FAIL` : '\nALL PASS');
  process.exitCode = fails ? 1 : 0;
})();
