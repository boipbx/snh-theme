// Round 13: axe-core (WCAG 2 A/AA) on the main templates at 390 and 1440 on the preview → shots/r13/6/axe-<tag>.md
//   AXE=<path to axe.min.js> node prototype/tools/r13-axe.js
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const HOST = 'https://sports-nutrition-hub.myshopify.com', Q = 'preview_theme_id=189832462590';
const OUT = path.join(__dirname, '..', 'shots', 'r13', '6'); fs.mkdirSync(OUT, { recursive: true });
const AXE = fs.readFileSync(process.env.AXE, 'utf8');
const PAGES = (process.env.PAGES || '/,/collections/whey-protein,/products/applied-nutrition-critical-whey-2kg,/cart,/search?q=whey,/blogs/news,/pages/about-us,/pages/snh-elite,/account/login,/account/register').split(',');
(async () => {
  const b = await chromium.launch(), md = ['# axe-core (WCAG 2 A + AA) on the preview', '', '| page | width | violations (rule × nodes) |', '|---|---|---|'], detail = [];
  for (const w of [390, 1440]) {
    const ctx = await b.newContext({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 800, hasTouch: w < 800 });
    await ctx.addInitScript(() => { try { localStorage.setItem('snh_ecm_until', String(Date.now() + 864e6)); } catch (e) {} });
    for (const pg of PAGES) {
      const p = await ctx.newPage();
      await p.goto(HOST + pg + (pg.includes('?') ? '&' : '?') + Q, { waitUntil: 'load', timeout: 90000 }).catch(() => {});
      await p.addStyleTag({ content: '#PBarNextFrameWrapper{display:none!important}' }).catch(() => {});
      await p.waitForTimeout(2500);
      await p.addScriptTag({ content: AXE }).catch(() => {});
      const res = await p.evaluate(async () => { const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] }, exclude: [['#PBarNextFrameWrapper'], ['iframe']] }); return r.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, nodes: v.nodes.slice(0, 4).map((x) => x.target.join(' ').slice(0, 90) + (x.any[0] && x.any[0].data && x.any[0].data.contrastRatio ? ' (' + x.any[0].data.contrastRatio + ':1 ' + x.any[0].data.fgColor + ' on ' + x.any[0].data.bgColor + ')' : '')) })); }).catch((e) => [{ id: 'ERROR ' + e.message.slice(0, 60), n: 0, nodes: [] }]);
      md.push(`| ${pg} | ${w} | ${res.map((v) => v.id + ' × ' + v.n).join(', ') || '—'} |`);
      res.forEach((v) => detail.push(`- ${w} ${pg} **${v.id}** (${v.impact}): ${v.nodes.join(' · ')}`));
      console.log(w, pg, res.map((v) => v.id + 'x' + v.n).join(', ') || 'clean');
      await p.close(); await new Promise((r) => setTimeout(r, 1500));
    }
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, `axe-${process.env.TAG || 'run'}.md`), md.concat(['', '## Nodes', '', ...detail]).join('\n') + '\n');
  await b.close();
})();
