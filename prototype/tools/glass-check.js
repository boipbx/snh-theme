// Elite glass readability: hides card text, samples the brightest backdrop pixel behind each text block over 21s of mesh animation.
// node tools/glass-check.js (S=<out dir>) then python3 the matching contrast step; worst case measured >= 4.6:1 at 390/768/1280/1440.
const { chromium } = require(process.env.PW); const fs = require('fs');
(async () => { const b = await chromium.launch(); const out = [];
  for (const w of [390, 768, 1280, 1440]) { const p = await (await b.newContext({ viewport: { width: w, height: 900 } })).newPage();
    await p.goto('http://127.0.0.1:8099/', { waitUntil: 'networkidle' });
    await p.evaluate(() => { document.querySelector('.hdr').style.visibility = 'hidden'; const t = document.querySelector('#elite .elite__card').getBoundingClientRect().top + scrollY; scrollTo({ top: t - 20, behavior: 'instant' }); });
    await p.waitForTimeout(800);
    await p.addStyleTag({ content: '#elite .elite__card *{color:transparent!important;text-shadow:none!important} #elite .chips-row li, #elite .btn{visibility:hidden}' });
    for (const t of [0, 7, 14, 21]) { if (t) await p.waitForTimeout(7000);
      const boxes = await p.evaluate(() => ['#elite-title', '.elite__card .lead', '.elite__card .eyebrow', '.tcard__perk', '.ladder__labels'].map(s => { const r = document.querySelector('#elite ' + s).getBoundingClientRect(); return [s, Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; }));
      const f = process.env.S + '/glass-' + w + '-' + t + '.png'; await p.screenshot({ path: f }); out.push({ w, t, f, boxes }); }
    await p.context().close(); }
  fs.writeFileSync(process.env.S + '/glass.json', JSON.stringify(out)); await b.close(); })();
