// Round 13 launch sweep: every template at 390 / 768 / 1440 on the preview. Per page × width: console errors (theme vs
// apps), broken images, images without alt, sideways scroll, h1 count, title / meta description / canonical, JSON-LD
// types, unlabelled buttons/links, overlapping fixed/sticky bars at the top. Output: shots/r13/6/sweep.json + sweep.md.
//   W=390,768,1440 node prototype/tools/r13-sweep.js
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const HOST = 'https://sports-nutrition-hub.myshopify.com', Q = 'preview_theme_id=189832462590';
const OUT = path.join(__dirname, '..', 'shots', 'r13', '6'); fs.mkdirSync(OUT, { recursive: true });
const PAGES = (process.env.PAGES || ['/', '/collections/whey-protein', '/products/applied-nutrition-critical-whey-2kg', '/products/revive-vitamin-c', '/cart', '/search?q=whey', '/search?q=qqzzxx', '/blogs/news',
  '/blogs/news/stop-guessing-how-to-verify-your-supplements-using-batch-codes-in-sri-lanka', '/pages/about-us', '/pages/contact', '/pages/snh-elite', '/account/login', '/account/register', '/pages/this-page-does-not-exist'].join(',')).split(',');
const APP = /amose|judge|klaviyo|reputon|nosto|tagembed|appstle|hextom|clarity|facebook|fbevents|google|gtag|doubleclick|shop\.app|monorail|tiktok|cloudfront|trekkie|web-pixel|boomerang|shopify-perf|sentry|hotjar/i;
(async () => {
  const b = await chromium.launch(), all = [];
  for (const w of (process.env.W || '390,768,1440').split(',').map(Number)) {
    const ctx = await b.newContext({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 600, hasTouch: w < 800 });
    await ctx.addInitScript(() => { try { localStorage.setItem('snh_ecm_until', String(Date.now() + 864e6)); } catch (e) {} });
    await ctx.route(/\/(cart\/add|cart\/change|contact|account\/(login|register)$)/, (r) => r.request().method() === 'POST' ? r.abort() : r.continue());   // never submit
    for (const pg of PAGES) {
      const p = await ctx.newPage(), errs = [];
      p.on('pageerror', (e) => errs.push({ msg: e.message.slice(0, 120), stack: (e.stack || '').split('\n').slice(1, 3).join(' ').slice(0, 200) }));
      p.on('console', (m) => { if (m.type() === 'error') errs.push({ msg: m.text().slice(0, 140), stack: (m.location() || {}).url || '' }); });
      let status = 0;
      const resp = await p.goto(HOST + pg + (pg.includes('?') ? '&' : '?') + Q, { waitUntil: 'load', timeout: 90000 }).catch(() => null); status = resp ? resp.status() : 0;
      await p.addStyleTag({ content: '#PBarNextFrameWrapper{display:none!important}' }).catch(() => {});
      await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 800) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)); } scrollTo(0, 0); }).catch(() => {});
      await p.waitForTimeout(1500);
      const r = await p.evaluate(() => {
        const vis = (e) => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
        const imgs = [...document.querySelectorAll('img')].filter((i) => vis(i) && !i.closest('#PBarNextFrameWrapper'));
        const name = (e) => (e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') && (document.getElementById(e.getAttribute('aria-labelledby')) || {}).textContent || e.textContent || e.getAttribute('title') || (e.querySelector('img[alt]') || {}).alt || '').trim();
        const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap((s) => { try { const j = JSON.parse(s.textContent); return [].concat(j['@graph'] || j).map((x) => x['@type']); } catch (e) { return ['INVALID']; } });
        const tops = [...document.querySelectorAll('body *')].filter((e) => { const cs = getComputedStyle(e); return (cs.position === 'fixed' || cs.position === 'sticky') && vis(e) && e.getBoundingClientRect().top < 200 && e.getBoundingClientRect().height < 300 && e.getBoundingClientRect().height > 20; }).map((e) => ({ s: e.tagName + '.' + String(e.className).split(' ')[0], t: Math.round(e.getBoundingClientRect().top), b: Math.round(e.getBoundingClientRect().bottom), z: getComputedStyle(e).zIndex }));
        return {
          title: document.title, desc: (document.querySelector('meta[name="description"]') || {}).content || '', canonical: (document.querySelector('link[rel="canonical"]') || {}).href || '',
          h1: [...document.querySelectorAll('h1')].filter(vis).map((h) => h.textContent.trim().slice(0, 50)), h1All: document.querySelectorAll('h1').length,
          sideways: document.documentElement.scrollWidth > innerWidth + 1, sw: document.documentElement.scrollWidth,
          broken: imgs.filter((i) => i.complete && i.naturalWidth === 0 && !(i.loading === 'lazy' && !i.currentSrc)).map((i) => (i.currentSrc || i.src).slice(0, 90)),
          noAlt: imgs.filter((i) => !i.hasAttribute('alt')).map((i) => (i.currentSrc || i.src).split('/').pop().slice(0, 50)),
          unlabelled: [...document.querySelectorAll('button, a[href], [role="button"]')].filter((e) => vis(e) && !name(e)).map((e) => e.tagName + '.' + String(e.className).split(' ')[0] + (e.closest('[id]') ? '#' + e.closest('[id]').id : '')).slice(0, 10),
          ld, tops,
        };
      }).catch((e) => ({ error: e.message }));
      const theme = errs.filter((e) => !APP.test(e.msg + ' ' + e.stack)), apps = errs.length - theme.length;
      all.push({ pg, w, status, ...r, themeErrors: theme, appErrors: apps });
      console.log(w, pg, status, 'h1', (r.h1 || []).length, 'side', r.sideways, 'broken', (r.broken || []).length, 'noAlt', (r.noAlt || []).length, 'unlab', (r.unlabelled || []).length, 'themeErr', theme.length, 'appErr', apps);
      await p.close(); await new Promise((r) => setTimeout(r, 1500));
    }
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, (process.env.TAG || 'sweep') + '.json'), JSON.stringify(all, null, 1));
  await b.close();
})();
