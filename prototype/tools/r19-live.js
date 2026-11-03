// Round 19: wait until the preview serves an asset containing a needle: node r19-live.js <asset file> <needle> [path] [minutes]
const { chromium } = require(process.env.PW || '/Users/pabasaradissanayake/Documents/eisenbahn-ops/qa/node_modules/playwright');
const [, , FILE, NEEDLE, PATH = '/', MIN = '8'] = process.argv;
const HOST = 'https://sports-nutrition-hub.myshopify.com', THEME = 189832462590;
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ userAgent: process.env.UA || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' }), p = await ctx.newPage(), t0 = Date.now();
  while (Date.now() - t0 < MIN * 60000) {
    try {
      await p.goto(HOST + PATH + (PATH.includes('?') ? '&' : '?') + 'preview_theme_id=' + THEME + '&_r=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
      const id = await p.evaluate(() => window.Shopify && Shopify.theme && Shopify.theme.id);
      const html = await p.content();
      let hit;
      if (FILE === 'html') hit = html.includes(NEEDLE);
      else { const m = html.match(new RegExp('[^"\'\\s]*/assets/' + FILE.replace(/\./g, '\\.') + '[^"\'\\s]*')); if (m) { const u = (m[0].startsWith('//') ? 'https:' + m[0] : m[0]).replace(/&amp;/g, '&'); hit = (await (await p.request.get(u)).text()).includes(NEEDLE); } }
      if (id !== THEME) console.log('theme id', id);
      if (hit && id === THEME) { console.log('live after', Math.round((Date.now() - t0) / 1000) + 's, theme', id); await b.close(); return; }
    } catch (e) { console.log('err', e.message.slice(0, 80)); }
    await new Promise((r) => setTimeout(r, 20000));
  }
  console.log('NOT live after', MIN, 'min'); await b.close(); process.exitCode = 1;
})();
