// Round 12 TikTok check on the PREVIEW URL (real storefront, not the dev server): waits 10s at the top (a slow
// shopper), scrolls to the section, waits for the cards, opens the first card's lightbox and checks the player.
//   PW=<playwright> node prototype/tools/r12-tiktok-qa.js [/products/handle]
const { chromium } = require(process.env.PW || 'playwright');
const fs = require('fs'); const path = require('path');
const BASE = 'https://sports-nutrition-hub.myshopify.com';
const OUT = path.join(__dirname, '..', 'shots', 'r12', 'p5'); fs.mkdirSync(OUT, { recursive: true });
const PAGES = (process.argv[2] ? [process.argv[2]] : ['/', '/products/applied-nutrition-critical-whey-2kg']);
(async () => {
  const b = await chromium.launch(); const rows = [];
  for (const pg of PAGES) for (const w of [390, 1440]) {
    const ctx = await b.newContext({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 800, hasTouch: w < 800 });
    const p = await ctx.newPage();
    const tt = []; p.on('request', (r) => { if (/tiktok\.com\/(embed|player|oembed)/.test(r.url())) tt.push(r.url().replace(/\?.*/, '').slice(0, 70)); });
    await p.goto(BASE + pg + (pg.includes('?') ? '&' : '?') + 'preview_theme_id=189336944894', { waitUntil: 'load', timeout: 90000 });
    await p.addStyleTag({ content: '[data-email-capture],dialog.ecm,.shopify-section--popup,#preview-bar-iframe,#shopify-pc__banner{display:none!important}' });
    await p.waitForTimeout(10000);
    const has = await p.evaluate(() => { const s = document.querySelector('[data-ttk]'); if (!s) return false; s.scrollIntoView(); return true; });
    if (!has) { rows.push({ pg, w, err: 'no TikTok section' }); await ctx.close(); continue; }
    await p.waitForTimeout(9000);
    const st = await p.evaluate(() => { const s = document.querySelector('[data-ttk]'); return { theme: Shopify.theme.id, cls: s.className, cards: [...s.querySelectorAll('[data-ttv]')].map((li) => li.className.replace('ttv', '').trim() + (li.querySelector('iframe') ? ' +player-preview' : '') + (li.querySelector('.ttv__thumb img:not([hidden])') ? ' +img' : '')), profile: s.querySelector('.ttk__box--profile') ? s.querySelector('.ttk__box--profile').className : 'not shown (video blocks)' }; });
    await p.screenshot({ path: path.join(OUT, `tiktok-${pg === '/' ? 'home' : 'pdp'}-${w}.png` ) });
    await p.evaluate(() => document.querySelectorAll('dialog.ecm[open]').forEach((d) => d.close()));   // the phone email modal (60% scroll) makes the page inert
    await p.click('[data-ttv] .ttv__card').catch((e) => {});
    await p.waitForTimeout(6000);
    const lb = await p.evaluate(() => { const d = document.querySelector('[data-ttl]'); const f = d && d.querySelector('iframe'); return { open: !!(d && d.open), player: f ? f.src.replace(/\?.*/, '') : null, size: f ? Math.round(f.getBoundingClientRect().width) + '×' + Math.round(f.getBoundingClientRect().height) : '' }; });
    await p.screenshot({ path: path.join(OUT, `tiktok-${pg === '/' ? 'home' : 'pdp'}-${w}-lightbox.png`) });
    rows.push({ pg, w, ...st, lb, tt: [...new Set(tt)].length });
    await ctx.close();
  }
  await b.close();
  const md = ['# TikTok on the preview URL (theme 189336944894)', '', 'Each run waits 10s at the top before scrolling (the old 6s limit failed exactly this).', '', '| page | width | theme | section | cards | lightbox | TikTok requests |', '|---|---|---|---|---|---|---|',
    ...rows.map((r) => r.err ? `| ${r.pg} | ${r.w} | ${r.err} |||||` : `| ${r.pg} | ${r.w} | ${r.theme} | ${r.cls.replace(/v2 v-section ttk ?/, '') || '—'} | ${r.cards.length}: ${r.cards.join('; ')} | ${r.lb.open ? 'open, ' + r.lb.player + ' ' + r.lb.size : '✗'} | ${r.tt} |`)];
  fs.writeFileSync(path.join(OUT, 'tiktok.md'), md.join('\n') + '\n'); console.log(md.join('\n'));
})();
