// Round 12: a drop-in for the QA scripts' PW=<playwright> when `shopify theme dev` (127.0.0.1:9292) answers
// {"error":"unauthorized"} but file sync still works. Every new context/page first visits ?preview_theme_id=SNH Dev,
// so the scripts run unchanged against the preview:
//   REAL_PW=<playwright path> PW=$PWD/prototype/tools/pw-preview.js DEV=https://www.sportsnutritionhub.lk node prototype/tools/<script>.js
// Their cart / contact / Klaviyo mocks are Playwright routes, so nothing is posted to the store.
const real = require(process.env.REAL_PW || 'playwright');
// THEME / HOST pick the preview (e.g. THEME=189832462590 HOST=https://sports-nutrition-hub.myshopify.com, the v2 theme).
// LOCAL_ASSETS=1 answers the theme's static .js/.css assets from this checkout (Liquid still comes from the preview),
// to check a change before it is deployed.
const THEME = process.env.THEME || '189336944894', HOST = process.env.HOST || 'https://www.sportsnutritionhub.lk';
const fs = require('fs'), path = require('path'), ASSETS = path.join(__dirname, '..', '..', 'assets');
async function arm(ctx) {
  if (process.env.LOCAL_ASSETS) await ctx.route(/\/cdn\/shop\/t\/\d+\/assets\/[^/?]+\.(js|css)(\?|$)/, (r) => {
    const f = path.join(ASSETS, new URL(r.request().url()).pathname.split('/').pop());
    if (!fs.existsSync(f)) return r.continue();
    r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'application/javascript', body: fs.readFileSync(f, 'utf8') });
  }); const p = await ctx.newPage(); await p.goto(HOST + '/?preview_theme_id=' + THEME, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {}); await p.close(); return ctx; }
const chromium = Object.create(real.chromium);
chromium.launch = async (o) => {
  const b = await real.chromium.launch(o);
  const nc = b.newContext.bind(b);
  b.newContext = async (opts) => arm(await nc(opts));
  b.newPage = async (opts) => { const c = await b.newContext(opts); return c.newPage(); };
  return b;
};
module.exports = Object.assign({}, real, { chromium });
