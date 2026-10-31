// Round 14 P2: responsive sweep on the target theme (theme id asserted): 360 390 430 768 1024 1280 1440 1920 ×
// home, collection, product, cart. Checks: no sideways scroll; body text (paragraphs ≥ 40 chars in main) ≥ 16 px;
// tap targets (visible links / buttons / inputs in main + header, not inline links inside text) ≥ 44 px in both
// directions, or ≥ 24 px with enough spacing (WCAG 2.5.8) — both counted. Fluid type: h1 size per width.
//   node prototype/tools/r14-responsive.js → shots/r14/p2/responsive.md + responsive-<page>-<w>.png
const { chromium, context, open, out } = require('./r14-lib.js');
const fs = require('fs'), path = require('path');
const OUT = out('p2'), rows = [], W = (process.env.W || '360,390,430,768,1024,1280,1440,1920').split(',').map(Number);
const PAGES = (process.env.ONLY ? [['home', '/']] : null) || [['home', '/'], ['collection', '/collections/whey-protein'], ['product', '/products/applied-nutrition-critical-whey-2kg'], ['cart', '/cart']];
(async () => {
  const b = await chromium.launch();
  for (const w of W) {
    const c = await context(b, w), p = await c.newPage();
    for (const [name, pth] of PAGES) {
      await open(p, pth); await p.waitForTimeout(1500);
      await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); });
      await p.waitForTimeout(600);
      const r = await p.evaluate(() => {
        const vis = (el) => { const s = getComputedStyle(el), b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0; };
        const over = document.documentElement.scrollWidth - innerWidth;
        const small = [...document.querySelectorAll('main p, main li')].filter((e) => vis(e) && e.textContent.trim().length >= 40 && !e.closest('footer, .announce, [class*="badge"], [class*="legal"], small, [class*="eyebrow"], [class^="go"], [id*="reputon"], [class*="jdgm"]') && parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => parseFloat(getComputedStyle(e).fontSize) + 'px "' + e.textContent.trim().slice(0, 30) + '"');
        // exemptions (WCAG 2.5.8): inline links in text; a control inside a label (the label is the target); range
        // sliders (the thumb is the target); a link with an equivalent larger link to the same URL in the same card;
        // anything off-screen or clipped away by an ancestor (closed menus, carousels)
        const clipped = (e) => { const r = e.getBoundingClientRect(); if (r.right <= 0 || r.left >= innerWidth) return true; for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const cs = getComputedStyle(a); if (/hidden|clip/.test(cs.overflow + cs.overflowX + cs.overflowY)) { const q = a.getBoundingClientRect(); if (q.height < 2 || q.width < 2 || r.bottom <= q.top || r.top >= q.bottom || r.right <= q.left || r.left >= q.right) return true; } } return false; };
        const equiv = (e) => { if (e.tagName !== 'A') return false; const card = e.closest('product-card, .pc, .card, li'); if (!card) return false; return [...card.querySelectorAll('a[href]')].some((x) => x !== e && x.getAttribute('href') === e.getAttribute('href') && x.getBoundingClientRect().height >= 44); };
        const tg = [...document.querySelectorAll('main a, main button, main input:not([type=hidden]):not([type=range]), main select, main summary, header a, header button')].filter((e) => vis(e) && !e.closest('p, li p') && !(e.tagName === 'INPUT' && e.closest('label')) && !clipped(e) && !equiv(e) && !e.closest('[class*="reputon"], .jdgm-widget'));   // third-party widgets (Reputon reviews, Judge.me)
        const t44 = [], t24 = [];
        tg.forEach((e) => { const b = e.getBoundingClientRect(); if (b.width < 44 || b.height < 44) { t44.push(e); if (b.width < 24 || b.height < 24) t24.push((e.getAttribute('aria-label') || e.textContent || e.className).trim().replace(/\s+/g, ' ').slice(0, 24) + ' ' + Math.round(b.width) + '×' + Math.round(b.height)); } });
        const h1 = document.querySelector('main h1'); return { over, small: small.slice(0, 4), nsmall: small.length, targets: tg.length, under44: t44.length, under24: t24.slice(0, 5), nunder24: t24.length, h1: h1 ? parseFloat(getComputedStyle(h1).fontSize) : 0 };
      });
      const ok = r.over <= 0 && r.nsmall === 0 && r.nunder24 === 0;
      rows.push(`| ${w} | ${name} | ${ok ? 'PASS' : '**FAIL**'} | ${r.over > 0 ? r.over + 'px' : 'none'} | ${r.nsmall ? r.nsmall + ': ' + r.small.join('; ') : '0'} | ${r.under44}/${r.targets} | ${r.nunder24 ? r.nunder24 + ': ' + r.under24.join('; ') : '0'} | ${r.h1}px |`);
      console.log(w, name, ok ? 'PASS' : 'FAIL', JSON.stringify(r).slice(0, 260));
      await p.screenshot({ path: path.join(OUT, `responsive-${name}-${w}.png`) });
      await p.waitForTimeout(6000);
    }
    await c.close();
  }
  fs.writeFileSync(path.join(OUT, 'responsive.md'), ['# Responsive sweep (Round 14)', '', 'PASS = no sideways scroll, no body paragraph under 16 px, no tap target under 24 px (WCAG 2.5.8 minimum). Under-44 count shown for reference (WCAG 2.5.5 enhanced).', '', '| width | page | result | sideways scroll | body text < 16px | targets < 44px | targets < 24px | h1 |', '|---|---|---|---|---|---|---|---|', ...rows].join('\n') + '\n');
  await b.close();
})();
