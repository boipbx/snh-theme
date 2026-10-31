// Round 14 shared helpers: open the target theme and assert it (window.Shopify.theme.id === 189832462590).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const HOST = 'https://sports-nutrition-hub.myshopify.com', THEME = 189832462590;
const OUT = path.join(__dirname, '..', 'shots', 'r14');
const url = (p) => HOST + p + (p.includes('?') ? '&' : '?') + 'preview_theme_id=' + THEME;
const HIDE = '#PBarNextFrameWrapper,privacy-bar,#shopify-pc__banner{display:none!important}';
async function context(b, w, opts = {}) {
  // a regular browser user agent: the store's Cloudflare challenges "HeadlessChrome" after a burst of test traffic
  const ua = w < 800 ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
  const ctx = await b.newContext({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 800, hasTouch: w < 800, userAgent: ua, ...opts.ctx });
  if (!opts.popups) await ctx.addInitScript(() => { try { localStorage.setItem('snh_ecm_until', String(Date.now() + 864e6)); } catch (e) {} });
  await ctx.route(/\/checkouts?\/.*\/(payment|processing)|\/wallets\//, (r) => r.abort());   // never past the checkout page
  return ctx;
}
async function open(p, pth, opts = {}) {
  let id = null;
  for (let i = 0; i < 6 && id !== THEME; i++) {   // a Cloudflare challenge page has no Shopify object: back off, retry
    if (i) await p.waitForTimeout(30000 * i);
    // Shopify's preview redirect keeps only the last of repeated query keys (filter.p.vendor=A&filter.p.vendor=B → B):
    // once the preview cookie is set, go to the primary domain directly so the URL arrives intact.
    const qs = (pth.split('?')[1] || '').split('&').map((x) => x.split('=')[0]);
    const rep = qs.length !== new Set(qs).size;
    if (rep && !/sportsnutritionhub\.lk/.test(p.url())) await p.goto(url('/'), { waitUntil: 'load', timeout: 90000 }).catch(() => null);
    const r = await p.goto(rep ? 'https://www.sportsnutritionhub.lk' + pth : url(pth), { waitUntil: opts.wait || 'load', timeout: 90000 }).catch(() => null);
    if (r && r.status() === 429) continue;
    id = await p.evaluate(() => window.Shopify && Shopify.theme && Shopify.theme.id).catch(() => null);
  }
  await p.addStyleTag({ content: HIDE + (opts.hide || '') }).catch(() => {});
  if (id !== THEME) throw new Error('WRONG THEME: ' + id + ' on ' + pth);
  return id;
}
function out(dir) { const d = path.join(OUT, dir); fs.mkdirSync(d, { recursive: true }); return d; }
module.exports = { chromium, HOST, THEME, url, context, open, out, HIDE };
// product JSON cached on disk (Cloudflare challenges bursts of /products/*.js): returns { handle: product }
async function products(b, handles) {
  const f = path.join(OUT, 'tmp', 'products.json'); fs.mkdirSync(path.dirname(f), { recursive: true });
  const cache = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
  const miss = handles.filter((h) => !cache[h]);
  if (miss.length) {
    const ctx = await b.newContext({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' });
    for (const h of miss) for (let i = 0; i < 5 && !cache[h]; i++) {
      const t = await (await ctx.request.get(HOST + '/products/' + h + '.js').catch(() => null))?.text().catch(() => '') || '';
      if (t.trim()[0] === '{') cache[h] = JSON.parse(t); else await new Promise((r) => setTimeout(r, 8000 * (i + 1)));
    }
    await ctx.close(); fs.writeFileSync(f, JSON.stringify(cache));
  }
  return cache;
}
module.exports.products = products;
