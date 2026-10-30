// Round 12: collection heroes at 390 / 768 / 1440 (top of page) + which mode rendered.
//   PW=<playwright> [BASE=preview url] node prototype/tools/r12-hero-shots.js
const { chromium } = require(process.env.PW || 'playwright');
const fs = require('fs'); const path = require('path');
const DEV = process.env.DEV || 'http://127.0.0.1:9292';
const OUT = path.join(__dirname, '..', 'shots', 'r12', 'p4'); fs.mkdirSync(OUT, { recursive: true });
const HANDLES = (process.env.HANDLES || 'whey-protein,creatine,sis,applied-nutrition').split(',');
(async () => {
  const b = await chromium.launch(); const rows = [];
  for (const h of HANDLES) for (const w of [390, 768, 1440]) {
    const p = await b.newPage({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 800, hasTouch: w < 800 });
    await p.goto(`${DEV}/collections/${h}`, { waitUntil: 'load', timeout: 90000 });
    await p.addStyleTag({ content: '[data-email-capture],.shopify-section--popup,#preview-bar-iframe{display:none!important}' });
    await p.waitForTimeout(800);
    const r = await p.evaluate(() => { const s = document.querySelector('.colhero'); const i = s.querySelector('.colhero__pic img'); return { mode: s.classList.contains('colhero--photo') ? 'photo' : s.classList.contains('colhero--art') ? 'artwork' : 'text', tpl: s.dataset.template, img: i ? (i.currentSrc || '').split('/files/').pop().split('?')[0] : '—', natural: i ? i.naturalWidth + '×' + i.naturalHeight : '', hh: Math.round(s.getBoundingClientRect().height), lcp: i ? i.getAttribute('fetchpriority') : '' }; });
    await p.screenshot({ path: path.join(OUT, `hero-${h}-${w}.png`) });
    rows.push({ h, w, ...r }); await p.close();
  }
  await b.close();
  const md = ['# Collection heroes', '', '| collection | width | template | mode | image (served) | px | hero height | fetchpriority |', '|---|---|---|---|---|---|---|---|', ...rows.map((r) => `| ${r.h} | ${r.w} | ${r.tpl} | ${r.mode} | ${r.img} | ${r.natural} | ${r.hh} | ${r.lcp || '—'} |`)];
  fs.writeFileSync(path.join(OUT, 'heroes.md'), md.join('\n') + '\n'); console.log(md.join('\n'));
})();
