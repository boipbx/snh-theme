// Round 19 shared helpers: preview context at a width, theme assert, screenshot dir prototype/shots/r19
const { chromium } = require(process.env.PW || '/Users/pabasaradissanayake/Documents/eisenbahn-ops/qa/node_modules/playwright');
const path = require('path'), fs = require('fs');
const HOST = 'https://sports-nutrition-hub.myshopify.com', THEME = 189832462590;
const OUT = path.join(__dirname, '..', 'shots', 'r19'); fs.mkdirSync(OUT, { recursive: true });
async function open(b, w, opts = {}) {
  const m = w < 800;
  const ctx = await b.newContext({ viewport: { width: w, height: m ? 844 : 900 }, isMobile: m, hasTouch: m, deviceScaleFactor: m ? 2 : 1, userAgent: m ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' });
  await ctx.addInitScript((o) => { try { localStorage.setItem('snh_sub', String(Date.now())); localStorage.setItem('snh_onb_seen', String(Date.now())); if (o.ls) for (const k in o.ls) localStorage.setItem(k, o.ls[k]); if (o.clear) o.clear.forEach((k) => localStorage.removeItem(k)); } catch (e) {} }, { ls: opts.ls || null, clear: opts.clear || null });
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', (e) => p.errs.push(e.message.slice(0, 160)));
  return { ctx, p };
}
async function go(p, PATH) {
  await p.goto(HOST + PATH + (PATH.includes('?') ? '&' : '?') + 'preview_theme_id=' + THEME + '&_r=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
  const id = await p.evaluate(() => window.Shopify && Shopify.theme && Shopify.theme.id);
  if (id !== THEME) throw new Error('WRONG THEME ' + id);
  await p.evaluate(() => { document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; }); document.querySelectorAll('.reveal,[data-reveal]').forEach((e) => e.classList.add('is-in')); const s = document.createElement('style'); s.textContent = '#preview-bar-iframe,#PBarNextFrameWrapper{display:none!important}'; document.head.appendChild(s); });
  return id;
}
const shot = (n) => path.join(OUT, n + '.png');
module.exports = { chromium, open, go, shot, OUT, HOST, THEME };
