// Round 5 phase 5: homepage audit. Per section: vertical padding; visible text under 12px; text whose contrast
// against the nearest solid background is under 4.5:1 (3:1 for 18px+/bold 14px+; text over photos is skipped);
// plus layout shift over a full scroll.
//   PW=<playwright> node prototype/tools/r5-home-audit.js [path]
const { chromium } = require(process.env.PW || 'playwright');
const DEV = process.env.DEV || 'http://127.0.0.1:9292';
const PATH = process.argv[2] || '/';

(async () => {
  const b = await chromium.launch();
  for (const w of [390, 1440]) {
    const ctx = await b.newContext({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 800 });
    const p = await ctx.newPage();
    await p.addInitScript(() => { window.__cls = 0; window.__src = []; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) { window.__cls += e.value; if (e.value > .005) window.__src.push(e.value.toFixed(3) + ' ' + (e.sources || []).map(s => s.node ? s.node.nodeName + '.' + String(s.node.className || '').slice(0, 30) : '?').slice(0, 2).join('+')); } }).observe({ type: 'layout-shift', buffered: true }); });
    await p.goto(DEV + PATH, { waitUntil: 'load', timeout: 90000 });
    await p.addStyleTag({ content: '.shopify-section--popup,#preview-bar-iframe,privacy-bar{display:none!important}' });
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise(r => setTimeout(r, 160)); } scrollTo(0, 0); });
    await p.waitForTimeout(1200);
    const rep = await p.evaluate(() => {
      const lum = c => { const m = c.match(/[\d.]+/g); if (!m) return null; const [r, g, bb, a = 1] = m.map(Number); if (a < .9) return null; const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(bb); };
      const bgOf = el => { for (let e = el; e && e !== document.documentElement; e = e.parentElement) { const s = getComputedStyle(e); if (s.backgroundImage !== 'none' && !/gradient/.test(s.backgroundImage)) return 'img'; if (e.querySelector(':scope > img, :scope > video, :scope > picture') && e !== el) { const r = e.getBoundingClientRect(); if (r.height > 200) return 'img'; } const l = lum(s.backgroundColor); if (l !== null) return l; } return 1; };
      return [...document.querySelectorAll('main > .shopify-section')].map(sec => {
        const root = sec.querySelector(':scope > *') || sec, cs = getComputedStyle(root);
        const name = (sec.id.split('__')[1] || sec.id).slice(0, 26);
        const small = new Set(), low = new Set();
        sec.querySelectorAll('p, span, a, li, h1, h2, h3, h4, strong, b, small, button, label, figcaption').forEach(el => {
          if (!el.offsetParent || !el.childNodes.length) return;
          const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1); if (!own) return;
          const s = getComputedStyle(el); if (s.visibility === 'hidden' || +s.opacity < .3) return;
          if (el.closest('[aria-hidden="true"], .mq__track, iframe, .shopify-app-block, .hero__media, svg')) return;
          const fs = parseFloat(s.fontSize), txt = el.textContent.trim().slice(0, 28);
          if (fs < 12) small.add(fs + 'px "' + txt + '"');
          const bg = bgOf(el); if (bg === 'img') return;
          const fg = lum(s.color); if (fg === null) return;
          const ratio = (Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05), big = fs >= 18 || (fs >= 14 && +s.fontWeight >= 600);
          if (ratio < (big ? 3 : 4.5)) low.add(ratio.toFixed(2) + ' "' + txt + '"');
        });
        return { name, pad: [parseFloat(cs.paddingTop), parseFloat(cs.paddingBottom)], h: Math.round(sec.getBoundingClientRect().height), small: [...small].slice(0, 6), low: [...low].slice(0, 6) };
      });
    });
    console.log(`\n=== ${w}px  CLS over scroll ${(await p.evaluate(() => window.__cls)).toFixed(4)}  ${(await p.evaluate(() => window.__src)).slice(0, 6).join(' | ')}`);
    rep.forEach(r => console.log(`${r.name.padEnd(27)} pad ${r.pad.join('/')}  h ${r.h}${r.small.length ? '\n    small: ' + r.small.join(' · ') : ''}${r.low.length ? '\n    low contrast: ' + r.low.join(' · ') : ''}`));
    await ctx.close();
  }
  await b.close();
})();
