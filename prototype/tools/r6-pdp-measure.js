// Round 6 phase 1 QA: product page MEASURED against the spec. No add-to-cart (live store).
//   PW=<playwright> node prototype/tools/r6-pdp-measure.js [handles] [widths]
// Per product × width it dumps: every buy box block's left x / width (one left edge, ±1px); gallery top vs title-block
// top (±2px, desktop); computed font-size / line-height ratio of every text element in the section (on the scale);
// the vertical gaps between buy box blocks (24 between groups, 12 inside); container width; elements wider than the
// container or the viewport; sticky header / sticky add to cart overlaps. Screenshots (fold + full) and a markdown
// table go to prototype/shots/r6/.
const { chromium } = require(process.env.PW || 'playwright');
const fs = require('fs');
const path = require('path');
const DEV = process.env.DEV || 'http://127.0.0.1:9292';
const OUT = path.join(__dirname, '..', 'shots', 'r6');
const PRODUCTS = (process.argv[2] || 'applied-nutrition-critical-whey-2kg,sis-go-hydro-tablets,raw-cbum-itholate-protein,applied-nutrition-ashwagandha-ksm-66').split(',');
const WIDTHS = (process.argv[3] || '390,768,1024,1280,1440').split(',').map(Number);
const HIDE = '.shopify-section--popup,#preview-bar-iframe,privacy-bar,#shopify-pc__banner{display:none!important}';
const FS = [12, 13, 14, 15, 16, 18, 20, 24, 28, 36, 44, 56, 72, 96];
const FS_EXTRA = { 'sp-title': [26] };                 // the spec's mobile title size
let fails = 0;
const md = ['# Round 6 · product page measurements', '', `Generated ${new Date().toISOString()} against ${DEV}`, ''];
const bad = (m) => { fails++; md.push('- **FAIL** ' + m); console.log('  FAIL ' + m); };

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  for (const h of PRODUCTS) {
    for (const w of WIDTHS) {
      const ctx = await b.newContext({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 800, hasTouch: w < 800 });
      const p = await ctx.newPage();
      await p.goto(`${DEV}/products/${h}`, { waitUntil: 'load', timeout: 90000 });
      await p.addStyleTag({ content: HIDE });
      await p.waitForTimeout(1500);
      const r = await p.evaluate(({ FS, FS_EXTRA }) => {
        const sec = document.querySelector('[data-sp]');
        const vis = (el) => { const s = getComputedStyle(el); const b = el.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && b.width > 0 && b.height > 0; };
        const R = (el) => el.getBoundingClientRect();
        const wrap = sec.querySelector('.sp-wrap');
        const ws = getComputedStyle(wrap);
        const container = { left: R(wrap).left + parseFloat(ws.paddingLeft), right: R(wrap).right - parseFloat(ws.paddingRight) };
        const blocks = [...sec.querySelectorAll('.sp-buy > .sp-b')].filter(vis).map((el) => {
          const b = R(el);
          const name = (el.className.match(/sp-(?!b\b)[a-z-]+/) || [el.tagName])[0];
          return { name, g: el.getAttribute('data-g') || '', left: +b.left.toFixed(1), width: +b.width.toFixed(1), top: b.top + scrollY, bottom: b.bottom + scrollY };
        });
        // the left edge of each block's first visible content box (text or control)
        const innerLeft = [...sec.querySelectorAll('.sp-buy > .sp-b')].filter(vis).map((el) => {
          // boxed blocks (buttons, cards: a fill or a border) start at their own edge; otherwise the first visible box inside
          const cs = getComputedStyle(el);
          if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.boxShadow !== 'none' || parseFloat(cs.borderLeftWidth) > 0 || el.matches('.sp-bundles')) return +R(el).left.toFixed(1);
          const t = [...el.children].find((x) => vis(x) && !/^(LEGEND)$/.test(x.tagName)) || el;
          const k = t.matches('.sp-opt, .sp-price__row, .sp-pills, .sp-buyrow, .bx, .popt') ? (t.firstElementChild && vis(t.firstElementChild) ? t.firstElementChild : t) : t;
          return +R(k).left.toFixed(1);
        });
        const gaps = blocks.slice(1).map((bl, i) => ({ a: blocks[i].name, b: bl.name, same: bl.g && bl.g === blocks[i].g, gap: +(bl.top - blocks[i].bottom).toFixed(1) }));
        const gal = sec.querySelector('.sp-gal'), stage = sec.querySelector('.sp-slides'), title = sec.querySelector('.sp-title');
        const first = blocks[0];
        const geo = { galTop: +(R(stage).top + scrollY).toFixed(1), firstTop: first ? +first.top.toFixed(1) : null, titleTop: title ? +(R(title).top + scrollY).toFixed(1) : null,
          galLeft: +R(gal).left.toFixed(1), galW: +R(gal).width.toFixed(1), stageW: +R(stage).width.toFixed(1), stageH: +R(stage).height.toFixed(1),
          buyLeft: +R(sec.querySelector('.sp-buy')).left.toFixed(1), buyW: +R(sec.querySelector('.sp-buy')).width.toFixed(1),
          colGap: +(R(sec.querySelector('.sp-buy')).left - R(gal).right).toFixed(1),
          rail: (() => { const rl = sec.querySelector('.sp-rail'); return rl && vis(rl) ? { h: +R(rl).height.toFixed(1), top: +(R(rl).top + scrollY).toFixed(1), thumb: +R(rl.querySelector('.sp-thumb')).width.toFixed(1) } : null; })(),
          container: { left: +container.left.toFixed(1), width: +(container.right - container.left).toFixed(1) } };
        // typography: every element that owns text
        const type = [], offType = [];
        sec.querySelectorAll('*').forEach((el) => {
          if (!vis(el) || el.closest('dialog, .sp-app, .bx, script, style, svg, [aria-hidden="true"]')) return;
          const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
          if (!own) return;
          const s = getComputedStyle(el), f = parseFloat(s.fontSize), lh = s.lineHeight === 'normal' ? 'normal' : +(parseFloat(s.lineHeight) / f).toFixed(3);
          const cls = (typeof el.className === 'string' ? (el.className.split(' ').find((c) => c !== 'sp-b') || '') : '') || el.tagName.toLowerCase();
          const okFs = FS.includes(f) || (FS_EXTRA[cls] || []).includes(f);
          const okLh = lh !== 'normal' && (Math.abs(lh - 1.1) < .02 || Math.abs(lh - 1.5) < .02);
          const fam = s.fontFamily.split(',')[0].replace(/"/g, '').trim();
          const okFam = /^(Inter|Instrument Serif)$/i.test(fam);
          const row = { el: cls, text: el.textContent.trim().slice(0, 24), fs: f, lh, ls: s.letterSpacing, fam, fw: s.fontWeight };
          type.push(row);
          if (!okFs || !okLh || !okFam) offType.push(row);
        });
        // overflow
        const over = [];
        sec.querySelectorAll('*').forEach((el) => {
          if (!vis(el) || el.closest('.sp-slides, .sp-sticky, dialog, .sp-rail, .bx__pills')) return;
          const b = R(el);
          if (b.right > innerWidth + .5 || b.left < -.5) over.push((el.className || el.tagName).toString().slice(0, 40) + ` [${b.left.toFixed(0)}–${b.right.toFixed(0)}]`);
        });
        return { blocks, innerLeft, gaps, geo, type, offType, over: over.slice(0, 8), docW: document.documentElement.scrollWidth, vw: innerWidth };
      }, { FS, FS_EXTRA });

      // sticky header / sticky add to cart
      const st = await p.evaluate(async () => {
        const sec = document.querySelector('[data-sp]'), add = sec.querySelector('[data-sp-add]'), bar = sec.querySelector('[data-sp-sticky]');
        const hdrEl = [...document.querySelectorAll('header, .shopify-section-group-header-group, [class*="hdr"]')].find((e) => /sticky|fixed/.test(getComputedStyle(e).position));
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        const out = { hdrPos: hdrEl ? getComputedStyle(hdrEl).position : 'none' };
        out.barAtLoad = bar ? bar.classList.contains('is-on') : null;
        // scroll so the main button has just left the viewport (above)
        scrollTo(0, add.getBoundingClientRect().bottom + scrollY + 40); await wait(500);
        out.barPast = bar ? bar.classList.contains('is-on') : null;
        const hb = hdrEl ? hdrEl.getBoundingClientRect().bottom : 0;
        const gal = sec.querySelector('.sp-gal'), gb = gal.getBoundingClientRect();
        out.hdrBottom = +hb.toFixed(1); out.galTopScrolled = +gb.top.toFixed(1);
        out.galReleased = Math.abs(gb.bottom - sec.querySelector('.sp-grid').getBoundingClientRect().bottom) < 2;   // its row has ended: it scrolls away
        if (bar) { const bb = bar.getBoundingClientRect(); out.barH = +bb.height.toFixed(1); out.barTop = +bb.top.toFixed(1); out.barW = +bb.width.toFixed(1); }
        // main button back in view: bar must hide
        add.scrollIntoView({ block: 'center' }); await wait(500);
        out.barWithMain = bar ? bar.classList.contains('is-on') : null;
        // footer
        const f = document.querySelector('.shopify-section-group-footer-group') || document.querySelector('body > footer');
        if (f) { f.scrollIntoView({ block: 'start' }); await wait(600); out.barAtFooter = bar ? bar.classList.contains('is-on') : null; }
        scrollTo(0, 0); await wait(300);
        return out;
      });

      const tag = `${h} @ ${w}`;
      console.log(`\n${tag}`);
      md.push(`## ${tag}`, '');
      md.push(`container left ${r.geo.container.left} width ${r.geo.container.width} · gallery ${r.geo.galLeft}/${r.geo.galW} (stage ${r.geo.stageW}×${r.geo.stageH}) · buy box ${r.geo.buyLeft}/${r.geo.buyW} · column gap ${r.geo.colGap} · doc width ${r.docW}/${r.vw}`, '');
      md.push('| block | group | left | width | first content left | gap to next |', '|---|---|---|---|---|---|');
      r.blocks.forEach((bl, i) => md.push(`| ${bl.name} | ${bl.g} | ${bl.left} | ${bl.width} | ${r.innerLeft[i]} | ${r.gaps[i] ? r.gaps[i].gap + (r.gaps[i].same ? ' (in group)' : '') : ''} |`));
      md.push('');
      // checks
      const lefts = r.blocks.map((x) => x.left);
      const spread = Math.max(...lefts) - Math.min(...lefts);
      const inl = r.innerLeft.filter((x) => x !== null);
      const ispread = Math.max(...inl) - Math.min(...inl);
      md.push(`- block left edge spread **${spread.toFixed(1)}px**, first-content left spread **${ispread.toFixed(1)}px**`);
      if (spread > 1) bad(`${tag}: block left edges differ by ${spread.toFixed(1)}px`);
      if (ispread > 1) bad(`${tag}: content left edges differ by ${ispread.toFixed(1)}px (${inl.join(', ')})`);
      r.gaps.forEach((g) => { const want = g.same ? 12 : 24; if (Math.abs(g.gap - want) > 1) bad(`${tag}: gap ${g.a} → ${g.b} is ${g.gap} (want ${want})`); });
      if (w >= 1024) {
        const d1 = Math.abs(r.geo.galTop - r.geo.firstTop), d2 = Math.abs(r.geo.galTop - r.geo.titleTop);
        md.push(`- gallery top ${r.geo.galTop} · first buy-box block top ${r.geo.firstTop} (Δ ${d1.toFixed(1)}) · title top ${r.geo.titleTop} (Δ ${d2.toFixed(1)})`);
        if (d1 > 2) bad(`${tag}: gallery top vs title block top Δ ${d1.toFixed(1)}px`);
        if (Math.abs(r.geo.colGap - 64) > 1) bad(`${tag}: column gap ${r.geo.colGap}`);
        if (r.geo.rail) { md.push(`- thumbnail rail ${r.geo.rail.thumb}px squares, rail height ${r.geo.rail.h} vs image ${r.geo.stageH}`); if (r.geo.rail.h > r.geo.stageH + .5) bad(`${tag}: rail taller than the image`); }
      }
      const wantC = Math.min(w, 1280) - (w >= 1024 ? 80 : 40);
      if (Math.abs(r.geo.container.width - wantC) > 1) bad(`${tag}: container ${r.geo.container.width}, want ${wantC}`);
      if (r.docW > r.vw) bad(`${tag}: page scrolls sideways (${r.docW} > ${r.vw})`);
      if (r.over.length) bad(`${tag}: wider than the viewport: ${r.over.join('; ')}`);
      md.push(`- text elements measured: ${r.type.length}, off the scale: **${r.offType.length}**`);
      r.offType.forEach((t) => bad(`${tag}: off-scale type ${t.el} "${t.text}" ${t.fs}px / ${t.lh} / ${t.fam}`));
      md.push(`- sticky: header ${st.hdrPos}; bar at load ${st.barAtLoad}, after main button ${st.barPast}, with main button visible ${st.barWithMain}, at footer ${st.barAtFooter}; bar ${st.barH}px tall, ${st.barW}px wide; gallery top while scrolled ${st.galTopScrolled} vs header bottom ${st.hdrBottom}${st.galReleased ? ' (row ended, released)' : ''}`);
      if (st.barAtLoad || !st.barPast || st.barWithMain || st.barAtFooter) bad(`${tag}: sticky add to cart visibility (load ${st.barAtLoad}, past ${st.barPast}, with main ${st.barWithMain}, footer ${st.barAtFooter})`);
      if (st.barH && Math.abs(st.barH - 64) > .5) bad(`${tag}: sticky bar ${st.barH}px tall`);
      if (w >= 1024 && !st.galReleased && st.galTopScrolled < st.hdrBottom + 23) bad(`${tag}: gallery slides under the header (${st.galTopScrolled} < ${st.hdrBottom})`);
      md.push('');
      if (process.env.TYPE) { md.push('| element | text | size | lh | weight | tracking | family |', '|---|---|---|---|---|---|---|'); r.type.forEach((t) => md.push(`| ${t.el} | ${t.text.replace(/\|/g, '/')} | ${t.fs} | ${t.lh} | ${t.fw} | ${t.ls} | ${t.fam} |`)); md.push(''); }
      const slug = h.split('-').slice(0, 3).join('-');
      await p.screenshot({ path: path.join(OUT, `pdp-${slug}-${w}.png`) });
      if (process.env.FULL) await p.screenshot({ path: path.join(OUT, `pdp-${slug}-${w}-full.png`), fullPage: true });
      await ctx.close();
    }
  }
  await b.close();
  md.push('', fails ? `**${fails} FAILED**` : '**ALL PASS**');
  fs.writeFileSync(path.join(OUT, 'pdp-measure.md'), md.join('\n'));
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASS');
})();
