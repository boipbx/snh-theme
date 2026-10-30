// Round 13: on a collection page, scroll down then up in steps and record the SNH header bar and the sticky filter bar
// (top/bottom, visible), plus the filter entry points. node prototype/tools/r13-header-qa.js [/collections/x] (W=390,1440)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const HOST = 'https://sports-nutrition-hub.myshopify.com', Q = '?preview_theme_id=189832462590', PG = process.argv[2] || '/collections/whey-protein';
const OUT = path.join(__dirname, '..', 'shots', 'r13', '3'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch();
  for (const w of (process.env.W || '390,1440').split(',').map(Number)) {
    const ctx = await b.newContext({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 800, hasTouch: w < 800 });
    await ctx.addInitScript(() => { try { localStorage.setItem('snh_ecm_until', String(Date.now() + 864e6)); } catch (e) {} });
    const p = await ctx.newPage();
    await p.goto(HOST + PG + Q, { waitUntil: 'load', timeout: 90000 });
    await p.addStyleTag({ content: '#PBarNextFrameWrapper,[data-email-capture],dialog.ecm{display:none!important}' }).catch(() => {});
    await p.waitForTimeout(1500);
    const st = () => p.evaluate(() => {
      const r = (e) => { if (!e) return null; const b = e.getBoundingClientRect(), cs = getComputedStyle(e); return { top: Math.round(b.top), bot: Math.round(b.bottom), vis: b.bottom > 0 && b.top < innerHeight && cs.visibility !== 'hidden' && +cs.opacity > 0.1 }; };
      const hdr = document.querySelector('.hdr'), fb = document.querySelector('[data-fbar], .fbar, .snh-fbar, .cfb');
      const btns = [...document.querySelectorAll('button, a')].filter((x) => /filter/i.test(x.textContent + (x.getAttribute('aria-label') || '')) && x.offsetParent && x.getBoundingClientRect().width > 0).map((x) => x.className.split(' ')[0] + ':' + x.textContent.trim().replace(/\s+/g, ' ').slice(0, 20));
      return { y: Math.round(scrollY), hdr: r(hdr), hdrCls: hdr && hdr.className, fbar: r(fb), fbarSel: fb && fb.className.split(' ')[0], hh: getComputedStyle(document.documentElement).getPropertyValue('--header-height'), btns };
    });
    const rows = [await st()];
    const H = await p.evaluate(() => document.body.scrollHeight - innerHeight);
    for (const y of [400, 900, 1600, Math.round(H * .6), H - 300, H, Math.round(H * .8), Math.round(H * .5), 1000, 200]) { await p.mouse.wheel(0, y - rows[rows.length - 1].y); await p.waitForTimeout(500); rows.push(await st()); if ([1600, 1000].includes(y)) await p.screenshot({ path: path.join(OUT, `hdr-${process.env.TAG || 'now'}-${w}-${y}.png`) }); }
    console.log('== ' + w);
    rows.forEach((x) => console.log(x.y, 'hdr', JSON.stringify(x.hdr), (x.hdrCls || '').replace('hdr', '').trim().slice(0, 40), '| fbar', x.fbarSel, JSON.stringify(x.fbar), '| --hh', x.hh));
    console.log('filter entries in view at top:', JSON.stringify(rows[0].btns));
    await ctx.close();
  }
  await b.close();
})();
