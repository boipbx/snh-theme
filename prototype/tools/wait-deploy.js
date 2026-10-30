// Waits until the preview serves a change: node prototype/tools/wait-deploy.js <path> <text in HTML | asset:file.js:text> [minutes]
const { chromium } = require('playwright');
const [, , PATH = '/', NEEDLE, MIN = '6'] = process.argv;
const URL0 = 'https://sports-nutrition-hub.myshopify.com' + PATH + (PATH.includes('?') ? '&' : '?') + 'preview_theme_id=189832462590';
(async () => {
  const b = await chromium.launch(), p = await b.newPage(), t0 = Date.now();
  while (Date.now() - t0 < MIN * 60000) {
    try {
      const res = await p.request.get(URL0); let body = await res.text(), hit;
      if (NEEDLE.startsWith('asset:')) { const [, f, ...rest] = NEEDLE.split(':'); const m = body.match(new RegExp('[^"\']*/assets/' + f.replace('.', '\\.') + '\\?v=[^"\']*')); hit = m && (await (await p.request.get(m[0].startsWith('//') ? 'https:' + m[0] : m[0])).text()).includes(rest.join(':')); }
      else hit = body.includes(NEEDLE);
      if (hit) { console.log('live after', Math.round((Date.now() - t0) / 1000) + 's'); await b.close(); return; }
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 15000));
  }
  console.log('NOT live after', MIN, 'min'); await b.close(); process.exitCode = 1;
})();
