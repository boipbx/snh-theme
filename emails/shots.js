// Screenshots of every preview email at 600px and 375px (full length) → preview/shots/<platform>/<id>-<w>.png
//   node shots.js [id,id…]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const man = require('./manifest.json');
const only = (process.argv[2] || '').split(',').filter(Boolean);
(async () => {
  const b = await chromium.launch();
  for (const w of [600, 375]) {
    const p = await b.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
    for (const m of man) {
      if (only.length && !only.includes(m.id)) continue;
      const f = path.join(__dirname, 'preview/html', m.platform, m.id + '.html');
      await p.goto('file://' + f, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
      await p.waitForTimeout(150);
      fs.mkdirSync(path.join(__dirname, 'preview/shots', m.platform), { recursive: true });
      await p.screenshot({ path: path.join(__dirname, 'preview/shots', m.platform, `${m.id}-${w}.png`), fullPage: true });
    }
    await p.close();
  }
  await b.close();
  console.log('shots done');
})();
