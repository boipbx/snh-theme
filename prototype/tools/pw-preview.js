// Round 12: a drop-in for the QA scripts' PW=<playwright> when `shopify theme dev` (127.0.0.1:9292) answers
// {"error":"unauthorized"} but file sync still works. Every new context/page first visits ?preview_theme_id=SNH Dev,
// so the scripts run unchanged against the preview:
//   REAL_PW=<playwright path> PW=$PWD/prototype/tools/pw-preview.js DEV=https://www.sportsnutritionhub.lk node prototype/tools/<script>.js
// Their cart / contact / Klaviyo mocks are Playwright routes, so nothing is posted to the store.
const real = require(process.env.REAL_PW || 'playwright');
const THEME = process.env.THEME || '189336944894', HOST = 'https://www.sportsnutritionhub.lk';
async function arm(ctx) { const p = await ctx.newPage(); await p.goto(HOST + '/?preview_theme_id=' + THEME, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {}); await p.close(); return ctx; }
const chromium = Object.create(real.chromium);
chromium.launch = async (o) => {
  const b = await real.chromium.launch(o);
  const nc = b.newContext.bind(b);
  b.newContext = async (opts) => arm(await nc(opts));
  b.newPage = async (opts) => { const c = await b.newContext(opts); return c.newPage(); };
  return b;
};
module.exports = Object.assign({}, real, { chromium });
