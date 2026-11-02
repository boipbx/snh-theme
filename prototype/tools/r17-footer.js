// Round 17: footer screenshots + checks (LABEL=before|after): the mark reveal timing, floating buttons bottom-right
// (icon + accessible name), Koko logo in the footer (transparent, no chip), long tasks / layout shift while the footer
// scrolls in. Target theme asserted.
process.env.SHOTS = 'r17';
const { chromium, context, open, out } = require('./r14-lib.js');
const fs = require('fs'), path = require('path');
const O = out('footer'), L = process.env.LABEL || 'after', rows = [];
const log = (w, step, ok, note) => { rows.push(`| ${w} | ${step} | ${ok ? 'PASS' : '**FAIL**'} | ${note || ''} |`); console.log(w, ok ? 'PASS' : 'FAIL', step, note || ''); };
(async () => {
  const b = await chromium.launch();
  for (const w of (process.env.W || '390,768,1440').split(',').map(Number)) {
    const c = await context(b, w), p = await c.newPage();
    await p.addInitScript(() => { window.__lt = []; window.__cls = 0; try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(Math.round(e.duration)))).observe({ type: 'longtask', buffered: true }); new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: 'layout-shift', buffered: true }); } catch (e) {} });
    await open(p, '/'); await p.waitForTimeout(2500);
    const before = await p.evaluate(() => ({ lt: window.__lt.length, cls: window.__cls }));
    await p.evaluate(() => document.querySelector('footer.ftr').scrollIntoView({ block: 'end' })); await p.waitForTimeout(150);
    const t0 = Date.now(); const mark = p.locator('.ftr__mark');
    let ms = -1; for (let i = 0; i < 40; i++) { const done = await mark.evaluate((m) => { const w = m.querySelector('.ftr__wipe, .ftr__logo'); const s = getComputedStyle(w); return m.classList.contains('is-in') && (s.clipPath === 'none' || s.clipPath === 'inset(0px)' || /inset\(0(px)? 0(px)? 0(px)? 0(px)?\)/.test(s.clipPath)) && (+s.opacity === 1) && (s.transform === 'none' || s.transform === 'matrix(1, 0, 0, 1, 0, 0)'); }).catch(() => false); if (done) { ms = Date.now() - t0; break; } await p.waitForTimeout(50); }
    await p.waitForTimeout(1500);
    const after = await p.evaluate(() => ({ lt: window.__lt.slice(), cls: window.__cls }));
    const f = await p.evaluate(() => {
      const vw = innerWidth, vh = innerHeight;
      const fl = [...document.querySelectorAll('body *')].filter((e) => { const s = getComputedStyle(e); if (s.position !== 'fixed' || s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) return false; const r = e.getBoundingClientRect(); return r.width > 20 && r.width < 120 && r.height > 20 && r.right > vw - 160 && r.bottom > vh - 200; }).map((e) => { const r = e.getBoundingClientRect(); const name = e.getAttribute('aria-label') || e.title || e.textContent.trim() || (e.querySelector('[aria-label]') || {}).ariaLabel || ''; const icon = !!e.querySelector('svg, img') || getComputedStyle(e).backgroundImage !== 'none'; return { tag: e.tagName + '.' + String(e.className).slice(0, 40), w: Math.round(r.width), name: name.slice(0, 40), icon }; });
      const dot = document.querySelector('.ftr__dot'); const kk = document.querySelector('.ftr__pay img[src*="koko"]');
      const ks = kk && getComputedStyle(kk);
      return { floats: fl, dot: !!(dot && dot.getClientRects().length), koko: kk ? { src: kk.src.split('/').pop().split('?')[0], bg: ks.backgroundColor, pad: ks.padding, h: Math.round(kk.getBoundingClientRect().height) } : null, over: document.documentElement.scrollWidth - vw };
    });
    log(w, `[${L}] footer mark reveal completes`, ms >= 0 && ms <= 600, `${ms} ms after scrolling in`);
    log(w, `[${L}] no long tasks / layout shift from the footer`, after.lt.length === before.lt && after.cls - before.cls < 0.01, `long tasks +${after.lt.length - before.lt} · CLS +${(after.cls - before.cls).toFixed(3)}`);
    log(w, `[${L}] floating buttons bottom-right have an icon + name; no empty orange dot`, f.floats.every((x) => x.icon && x.name) && !f.dot, JSON.stringify(f.floats) + ` · dot ${f.dot}`);
    log(w, `[${L}] Koko in the footer: transparent, no chip`, f.koko && /transparent|rgba\(0, 0, 0, 0\)/.test(f.koko.bg) && /^0px/.test(f.koko.pad), JSON.stringify(f.koko));
    await p.evaluate(() => scrollTo(0, document.body.scrollHeight)); await p.waitForTimeout(1600);
    await p.locator('footer.ftr').screenshot({ path: path.join(O, `footer-${L}-${w}.png`) });
    await p.screenshot({ path: path.join(O, `footer-viewport-${L}-${w}.png`) });
    await c.close();
  }
  fs.appendFileSync(path.join(O, 'footer.md'), [`\n## ${L}`, '', '| width | check | result | note |', '|---|---|---|---|', ...rows].join('\n') + '\n');
  await b.close();
})();
