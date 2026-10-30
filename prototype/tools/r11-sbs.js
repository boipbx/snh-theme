// Round 11: old (live site, prototype/shots/r11/old) vs new (dev theme) side-by-sides for the card, the filter bar,
// Shop the Look and the cart drawer, at 390 and 1440 → prototype/shots/r11/sbs/. PW=<playwright> node …
const { chromium } = require(process.env.PW || 'playwright');
const fs = require('fs'), path = require('path');
const DEV = process.env.DEV || 'http://127.0.0.1:9292';
const OLD = path.join(__dirname, '..', 'shots', 'r11', 'old'), OUT = path.join(__dirname, '..', 'shots', 'r11', 'sbs');
const HIDE = '#preview-bar-iframe,privacy-bar,#shopify-pc__banner,[data-email-capture],.stoast{display:none!important}';
const SETS = [
  ['card', '/collections/whey-protein', '.pc', 'collection-card'],
  ['filters', '/collections/whey-protein', '.snh-bar-form', 'collection-filters'],
  ['shop-the-look', '/', '.hs', 'home-shop-the-look'],
  ['cart-drawer', '/', '#cart-drawer', 'cart-drawer-empty']
];
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  for (const [name, url, sel, old] of SETS) {
    for (const w of [390, 1440]) {
      const p = await b.newPage({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 800, hasTouch: w < 800 });
      await p.route(/monorail|analytics|trekkie|web-pixels/, (r) => r.abort());
      await p.goto(DEV + url, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await p.addStyleTag({ content: HIDE });
      await p.waitForTimeout(2500);
      let file = path.join(OUT, `${name}-new-${w}.png`);
      if (name === 'cart-drawer') { await p.evaluate(() => window.SNHCart.open()); await p.waitForTimeout(2500); await p.screenshot({ path: file }); }
      else { const el = await p.$(sel); await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(1500); await el.screenshot({ path: file }); }
      await p.close();
      const oldFile = path.join(OLD, `${old}-${w}.png`);
      if (!fs.existsSync(oldFile)) continue;
      const html = `<html><body style="margin:0;padding:24px;background:#F4EFE6;font:600 16px Inter,sans-serif">
        <div style="display:flex;gap:24px;align-items:flex-start">
          <figure style="margin:0"><figcaption style="margin-bottom:8px">OLD · live site</figcaption><img src="data:image/png;base64,${fs.readFileSync(oldFile).toString('base64')}" style="max-width:${w < 800 ? 390 : 720}px;display:block;border:1px solid #ddd"></figure>
          <figure style="margin:0"><figcaption style="margin-bottom:8px">NEW · v2 (Round 11)</figcaption><img src="data:image/png;base64,${fs.readFileSync(file).toString('base64')}" style="max-width:${w < 800 ? 390 : 720}px;display:block;border:1px solid #ddd"></figure>
        </div></body></html>`;
      const q = await b.newPage({ viewport: { width: w < 800 ? 880 : 1520, height: 600 } });
      await q.setContent(html); await q.waitForTimeout(500);
      await q.screenshot({ path: path.join(OUT, `${name}-old-vs-new-${w}.png`), fullPage: true });
      await q.close();
    }
  }
  await b.close();
  console.log(fs.readdirSync(OUT).join('\n'));
})();
