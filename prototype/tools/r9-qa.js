// Round 9 QA: Seen on TikTok (product page) + Instagram (homepage). PW=<playwright> node prototype/tools/r9-qa.js
// Per page × width (390, 768, 1440):
//   lazy   — TikTok / Instagram requests at first paint (want 0), and how far the section still was from the viewport
//            when the first TikTok request went out (want ≤ ~600px + one scroll step)
//   cls    — layout-shift total while scrolling the whole page (want 0 from these sections; the page total is listed too)
//   embed  — after reaching the section: TikTok iframe rendered, or the fallback card shown
//   type   — text in the section off the Round 6 scale · spacing — section padding / gaps on the 4px grid
// Screenshots of the section into prototype/shots/r9/. Writes prototype/shots/r9/qa.md.
const { chromium } = require(process.env.PW || 'playwright');
const fs = require('fs');
const path = require('path');
const DEV = process.env.DEV || 'http://127.0.0.1:9292';
const OUT = path.join(__dirname, '..', 'shots', 'r9');
const HIDE = '.shopify-section--popup,#preview-bar-iframe,privacy-bar,#shopify-pc__banner{display:none!important}';
const PAGES = [
  ['pdp-tiktok', '/products/applied-nutrition-critical-whey-2kg', '.ttk'],
  ['home-instagram', '/', '.igr']
];
const WIDTHS = [390, 768, 1440];
const SOCIAL = /tiktok|tiktokcdn|ttwstatic|byteoversea|instagram|cdninstagram|fbcdn/i;

function audit(sel) {
  const FS = [12, 13, 14, 15, 16, 18, 20, 24, 28, 36, 44, 56, 72, 96];
  const el = document.querySelector(sel);
  if (!el) return { type: ['section missing'], spacing: [] };
  const vis = (e) => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.05 && r.width > 0 && r.height > 0; };
  const type = [], spacing = [];
  el.querySelectorAll('*').forEach((e) => {
    if (!vis(e) || e.closest('svg, script, style, .v-sr, iframe, .tiktok-embed')) return;
    if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return;
    const s = getComputedStyle(e), f = parseFloat(s.fontSize), lh = s.lineHeight === 'normal' ? null : parseFloat(s.lineHeight) / f;
    const ls = s.letterSpacing === 'normal' ? 0 : parseFloat(s.letterSpacing) / f, fam = s.fontFamily.split(',')[0].replace(/["']/g, '').trim();
    const iss = [];
    if (!FS.includes(Math.round(f * 100) / 100)) iss.push('size ' + f);
    if (!e.closest('.v-btn') && (lh === null || !(Math.abs(lh - 1.1) < .02 || Math.abs(lh - 1.5) < .02))) iss.push('lh ' + (lh === null ? 'normal' : lh.toFixed(2)));
    if (![0, -0.02, 0.12].some((x) => Math.abs(x - ls) < .006)) iss.push('ls ' + ls.toFixed(3));
    if (!/^(Inter|Instrument Serif)$/i.test(fam)) iss.push('font ' + fam);
    if (iss.length) type.push(`.${(e.className || e.tagName).toString().split(' ')[0]} "${e.textContent.trim().slice(0, 24)}": ${iss.join(', ')}`);
  });
  [el, ...el.querySelectorAll('.ttk__row, .ttk__box, .ttk__side, .ttk__fb, .ttk__vids, .igr__grid, .head')].forEach((c) => {
    if (!vis(c)) return;
    const s = getComputedStyle(c);
    [['pad-top', s.paddingTop], ['pad-left', s.paddingLeft], ['row-gap', s.rowGap], ['col-gap', s.columnGap]].forEach(([k, v]) => { const n = parseFloat(v); if (n && n % 4) spacing.push(`${(c.className || '').split(' ')[0]} ${k} ${n}px`); });
  });
  return { type: [...new Set(type)], spacing };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const rows = [], shots = [];
  for (const [name, url, sel] of PAGES) {
    for (const w of WIDTHS) {
      const p = await b.newPage({ viewport: { width: w, height: w < 768 ? 844 : 900 } });
      const reqs = [];
      p.on('request', (r) => { if (SOCIAL.test(new URL(r.url()).hostname)) reqs.push({ url: r.url(), t: Date.now() }); });
      await p.addInitScript(() => {
        window.__cls = 0; window.__shifts = [];
        new PerformanceObserver((l) => { for (const e of l.getEntries()) { if (!e.hadRecentInput) { window.__cls += e.value; window.__shifts.push({ v: e.value, src: (e.sources || []).map((s) => s.node && s.node.className ? String(s.node.className).slice(0, 40) : s.node && s.node.nodeName).join(' ') }); } } }).observe({ type: 'layout-shift', buffered: true });
      });
      for (let t = 0; t < 3; t++) {
        const ok = await p.goto(DEV + url, { waitUntil: 'domcontentloaded', timeout: 90000 }).then(() => true, () => false);
        if (ok && await p.waitForSelector(sel, { state: 'attached', timeout: 30000 }).then(() => true, () => false)) break;
      }
      await p.addStyleTag({ content: HIDE });
      await p.waitForTimeout(2500);
      const atLoad = reqs.length;
      // scroll down in steps; note the section's distance from the viewport bottom when the first social request goes out
      const clsBefore = await p.evaluate(() => window.__cls);
      let firstAt = null;
      const H = await p.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y <= H; y += 300) {
        const n = reqs.length;
        await p.evaluate((y) => scrollTo(0, y), y);
        await p.waitForTimeout(220);
        if (firstAt === null && reqs.length > n) firstAt = await p.evaluate((s) => Math.round(document.querySelector(s).getBoundingClientRect().top - innerHeight), sel);
        const reached = await p.evaluate((s) => document.querySelector(s).getBoundingClientRect().top < innerHeight * .5, sel);
        if (reached) break;
      }
      await p.waitForTimeout(sel === '.ttk' ? 12000 : 1500);
      const st = await p.evaluate((s) => {
        const e = document.querySelector(s);
        const prof = e.querySelector('.ttk__box--profile');
        return {
          iframe: !!(prof && prof.querySelector('iframe')),
          loaded: !!(prof && prof.classList.contains('is-loaded')),
          failed: !!(prof && prof.classList.contains('is-failed')),
          boxH: prof ? Math.round(prof.getBoundingClientRect().height) : null,
          tiles: [...e.querySelectorAll('.igr__item')].filter((i) => getComputedStyle(i).display !== 'none').length
        };
      }, sel);
      // finish the page so late shifts count too
      await p.evaluate(async () => { for (let y = scrollY; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } });
      await p.waitForTimeout(1000);
      const cls = await p.evaluate(() => ({ total: window.__cls, shifts: window.__shifts }));
      const secShifts = cls.shifts.filter((x) => /ttk|igr|tiktok|instagram/i.test(x.src));
      await p.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'start' }), sel);
      await p.waitForTimeout(800);
      const a = await p.evaluate(audit, sel);
      const file = `${name}-${w}.png`;
      await (await p.$(sel)).screenshot({ path: path.join(OUT, file) });
      shots.push(file);
      rows.push({ name, w, atLoad, firstAt, total: reqs.length, clsPage: cls.total, clsSec: secShifts.reduce((s, x) => s + x.v, 0), secShifts, clsBefore, ...st, ...a });
      await p.close();
    }
  }
  await b.close();
  const md = ['# Round 9 QA: Seen on TikTok + Instagram', '', `Generated ${new Date().toISOString()} against ${DEV}`, '',
    '| page | width | social requests at load | first TikTok request (section px below viewport) | social requests total | CLS from section | CLS page | embed | type | spacing |', '|---|---|---|---|---|---|---|---|---|---|'];
  for (const r of rows) md.push(`| ${r.name} | ${r.w} | ${r.atLoad === 0 ? '0 ✓' : r.atLoad + ' ⚠'} | ${r.firstAt === null ? (r.name.includes('instagram') ? 'none (no Instagram requests) ✓' : 'none') : r.firstAt + 'px'} | ${r.total} | ${r.clsSec.toFixed(4)}${r.clsSec === 0 ? ' ✓' : ' ⚠'} | ${r.clsPage.toFixed(4)} | ${r.name.includes('tiktok') ? (r.loaded ? 'embed rendered (TikTok replied)' : r.failed ? (r.iframe ? 'fallback card (iframe loaded but TikTok never replied)' : 'fallback card (no iframe)') : 'waiting') + ', box ' + r.boxH + 'px' : r.tiles + ' tiles'} | ${r.type.length ? r.type.length + ' ⚠' : '✓'} | ${r.spacing.length ? r.spacing.length + ' ⚠' : '✓'} |`);
  md.push('', '## Details', '');
  for (const r of rows) { const all = [...r.type, ...r.spacing, ...r.secShifts.map((x) => 'shift ' + x.v.toFixed(4) + ' ' + x.src)]; if (all.length) md.push(`### ${r.name} @ ${r.w}`, ...all.map((x) => '- ' + x), ''); }
  md.push('## Screenshots', '', ...shots.map((s) => '- ' + s));
  fs.writeFileSync(path.join(OUT, 'qa.md'), md.join('\n') + '\n');
  console.log(md.join('\n'));
})();
