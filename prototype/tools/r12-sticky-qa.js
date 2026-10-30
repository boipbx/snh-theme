// Round 12: the collection filter bar stays visible under the sticky SNH header while scrolling to the bottom.
// Optional FILTER=1 applies the first filter value via the URL (GET only) so the active chips can be checked.
//   PW=<playwright> node prototype/tools/r12-sticky-qa.js [/collections/handle]
const { chromium } = require(process.env.PW || 'playwright');
const fs = require('fs'); const path = require('path');
const DEV = process.env.DEV || 'http://127.0.0.1:9292';
const OUT = path.join(__dirname, '..', 'shots', 'r12', 'p4'); fs.mkdirSync(OUT, { recursive: true });
const PG = process.argv[2] || '/collections/whey-protein';
(async () => {
  const b = await chromium.launch(); const rows = [];
  for (const w of [390, 768, 1440]) {
    const p = await b.newPage({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 800, hasTouch: w < 800 });
    await p.goto(DEV + PG, { waitUntil: 'load', timeout: 90000 });
    // one active filter (a GET URL, like a shopper's tap) so the chips show
    const href = await p.evaluate(() => { const i = document.querySelector('#facet-form input[type=checkbox][name^="filter."]'); return i ? location.pathname + '?' + encodeURIComponent(i.name) + '=' + encodeURIComponent(i.value) : null; });
    if (href) await p.goto(DEV + href, { waitUntil: 'load', timeout: 90000 });
    await p.addStyleTag({ content: '[data-email-capture],.shopify-section--popup,#preview-bar-iframe{display:none!important}' });
    await p.waitForTimeout(1200);
    const r = await p.evaluate(async () => {
      const f = document.querySelector('form.snh-bar-form'), h = document.querySelector('.hdr'), out = [];
      const H = document.documentElement.scrollHeight;
      for (const y of [0, 1200, 3000, Math.round(H / 2), H - innerHeight]) {
        scrollTo(0, y); await new Promise((r) => setTimeout(r, 450));
        const fr = f.getBoundingClientRect(), hr = h.getBoundingClientRect();
        const pt = document.elementFromPoint(innerWidth / 2, Math.min(fr.top + 10, innerHeight - 1));
        const chips = [...f.querySelectorAll('.snh-chip')].filter((c) => c.getBoundingClientRect().height > 0 && c.getBoundingClientRect().top >= 0).length;
        const btn = f.querySelector('.snh-mtrig__btn'); const btnVis = btn && btn.offsetParent && btn.getBoundingClientRect().top >= hr.bottom - 1;
        out.push({ y, barTop: Math.round(fr.top), hdrBottom: Math.round(hr.bottom), visible: fr.top >= hr.bottom - 1 && fr.top < innerHeight && !!(pt && pt.closest('form.snh-bar-form')), condensed: f.classList.contains('is-condensed'), shadow: getComputedStyle(f).boxShadow !== 'none', chips, pill: !!btnVis });
      }
      return out;
    });
    await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight / 2)); await p.waitForTimeout(500);
    await p.screenshot({ path: path.join(OUT, `sticky-${PG.split('/').pop()}-${w}.png` ) });
    rows.push({ w, href, r }); await p.close();
  }
  await b.close();
  const md = [`# Sticky filter bar, ${PG}`, '', `Filter applied: ${rows[0].href || 'none'}`, '', '| width | scrollY | bar top | header bottom | visible (topmost at its spot) | condensed | shadow | chips in view | Filter & sort pill |', '|---|---|---|---|---|---|---|---|---|'];
  rows.forEach((x) => x.r.forEach((s) => md.push(`| ${x.w} | ${s.y} | ${s.barTop} | ${s.hdrBottom} | ${s.visible ? '✓' : '✗'} | ${s.condensed ? '✓' : '—'} | ${s.shadow ? '✓' : '—'} | ${s.chips} | ${x.w < 1000 ? (s.pill ? '✓' : '✗') : 'n/a'} |`)));
  fs.writeFileSync(path.join(OUT, 'sticky.md'), md.join('\n') + '\n'); console.log(md.join('\n'));
})();
