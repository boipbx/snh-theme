// Round 13 product card QA: per page × width, cards per visual row must have equal heights; text rows (brand, name,
// meta, Koko) must not be cut (scroll size > box). Screenshots of the first two rows → shots/r13/4/.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const HOST = 'https://sports-nutrition-hub.myshopify.com', Q = '?preview_theme_id=189832462590';
const OUT = path.join(__dirname, '..', 'shots', 'r13', '4'); fs.mkdirSync(OUT, { recursive: true });
const PAGES = (process.env.PAGES || '/collections/whey-protein,/collections/creatine,/,/products/sis-go-hydro-tablets').split(',');
(async () => {
  const b = await chromium.launch();
  for (const w of (process.env.W || '390,1440').split(',').map(Number)) {
    const ctx = await b.newContext({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 800, hasTouch: w < 800 });
    await ctx.addInitScript(() => { try { localStorage.setItem('snh_ecm_until', String(Date.now() + 864e6)); } catch (e) {} });
    const p = await ctx.newPage();
    for (const pg of PAGES) {
      await p.goto(HOST + pg + (pg.includes('?') ? '&' : '?') + Q.slice(1), { waitUntil: 'load', timeout: 90000 }).catch(() => {});
      await p.addStyleTag({ content: '#PBarNextFrameWrapper,[data-email-capture],dialog.ecm,.cmp-pop{display:none!important}' }).catch(() => {});
      await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); } scrollTo(0, 0); });
      await p.waitForTimeout(800);
      const r = await p.evaluate(() => {
        const cards = [...document.querySelectorAll('.pc')].filter((c) => c.offsetParent && c.getBoundingClientRect().width > 0);
        const rows = {}; cards.forEach((c) => { const k = Math.round(c.getBoundingClientRect().top + scrollY); (rows[k] = rows[k] || []).push(Math.round(c.getBoundingClientRect().height)); });
        const uneven = Object.values(rows).filter((h) => h.length > 1 && Math.max(...h) - Math.min(...h) > 1).length;
        const cut = []; cards.forEach((c) => ['.pc__brand', '.pc__name', '.pc__sub', '.pc__koko', '.pc__now'].forEach((s) => { const e = c.querySelector(s); if (e && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 2)) cut.push(s.slice(5) + ': ' + e.textContent.trim().slice(0, 40)); }));
        const first = cards[0] && cards[0].getBoundingClientRect();
        return { cards: cards.length, rows: Object.keys(rows).length, uneven, cut: cut.slice(0, 6), cutN: cut.length, y: first ? Math.round(first.top + scrollY) : 0, h: first ? Math.round(first.height) : 0 };
      });
      if (r.cards) { await p.evaluate((y) => scrollTo(0, Math.max(0, y - 90)), r.y); await p.waitForTimeout(500); await p.screenshot({ path: path.join(OUT, `card-${(pg.replace(/\W+/g, '-').replace(/^-|-$/g, '') || 'home')}-${w}.png`) }); }
      console.log(w, pg, 'cards', r.cards, 'rows', r.rows, 'uneven', r.uneven, 'cut', r.cutN, JSON.stringify(r.cut), 'cardH', r.h);
    }
    await ctx.close();
  }
  await b.close();
})();
