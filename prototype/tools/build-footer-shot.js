// Round 5: footer side by side (prototype vs SNH Dev) after the wipe reveal. node build-footer-shot.js <label> [width]
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path');
const [label = 'ftr', w = '1440'] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  for (const [tag, url] of [['proto', 'http://127.0.0.1:8099/'], ['dev', 'http://127.0.0.1:9292/']]) {
    const p = await b.newPage({ viewport: { width: +w, height: 900 } });
    await p.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
    await p.addStyleTag({ content: '.shopify-section--popup,#preview-bar-iframe{display:none!important}' });
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await p.waitForTimeout(4000);
    await p.screenshot({ path: path.join(__dirname, '..', 'shots', 'build', `${label}-footer-${tag}-${w}.jpg`), type: 'jpeg', quality: 60 });
    await p.close();
  }
  await b.close();
})();
