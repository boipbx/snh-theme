// Round 14 shared helpers: open the target theme and assert it (window.Shopify.theme.id === 189832462590).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const HOST = 'https://sports-nutrition-hub.myshopify.com', THEME = 189832462590;
const OUT = path.join(__dirname, '..', 'shots', 'r14');
const url = (p) => HOST + p + (p.includes('?') ? '&' : '?') + 'preview_theme_id=' + THEME;
const HIDE = '#PBarNextFrameWrapper,privacy-bar,#shopify-pc__banner{display:none!important}';
async function context(b, w, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 800, hasTouch: w < 800, ...opts.ctx });
  if (!opts.popups) await ctx.addInitScript(() => { try { localStorage.setItem('snh_ecm_until', String(Date.now() + 864e6)); } catch (e) {} });
  await ctx.route(/\/checkouts?\/.*\/(payment|processing)|\/wallets\//, (r) => r.abort());   // never past the checkout page
  return ctx;
}
async function open(p, pth, opts = {}) {
  for (let i = 0; i < 3; i++) {
    const r = await p.goto(url(pth), { waitUntil: opts.wait || 'load', timeout: 90000 }).catch(() => null);
    if (r && r.status() !== 429) break;
    await p.waitForTimeout(10000 * (i + 1));
  }
  await p.addStyleTag({ content: HIDE + (opts.hide || '') }).catch(() => {});
  const id = await p.evaluate(() => window.Shopify && Shopify.theme && Shopify.theme.id).catch(() => null);
  if (id !== THEME) throw new Error('WRONG THEME: ' + id + ' on ' + pth);
  return id;
}
function out(dir) { const d = path.join(OUT, dir); fs.mkdirSync(d, { recursive: true }); return d; }
module.exports = { chromium, HOST, THEME, url, context, open, out, HIDE };
