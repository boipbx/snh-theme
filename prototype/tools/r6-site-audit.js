// Round 6 phase 2: site-wide formatting audit, measured from computed styles and bounding boxes.
//   PW=<playwright> node prototype/tools/r6-site-audit.js [label]
// Pages: home, 3 collections, cart, search, about, locations, 2 product pages; widths 390 and 1440.
// Per page × width it lists:
//   type   — visible text elements whose font-size, line-height (ratio), letter-spacing or font-family is off the scale
//   pad    — sections whose vertical padding isn't 64/96 (desktop) or 48 (mobile)
//   align  — section content containers whose left edge isn't the container's (1280 max, 40px / 20px gutters)
// Writes prototype/shots/r6/audit-<label>.json + .md (counts per page and rule, every offender).
const { chromium } = require(process.env.PW || 'playwright');
const fs = require('fs');
const path = require('path');
const DEV = process.env.DEV || 'http://127.0.0.1:9292';
const OUT = path.join(__dirname, '..', 'shots', 'r6');
const LABEL = process.argv[2] || 'after';
const PAGES = (process.env.PAGES || '/,/collections/vitamins-minerals,/collections/sis,/collections/hydration-recovery,/cart,/search?q=whey,/pages/about-us,/pages/location,/products/applied-nutrition-critical-whey-2kg,/products/sis-go-hydro-tablets').split(',');
const WIDTHS = [390, 1440];
const HIDE = '.shopify-section--popup,#preview-bar-iframe,privacy-bar,#shopify-pc__banner{display:none!important}';

(async () => {
  const b = await chromium.launch();
  const report = [];
  for (const pg of PAGES) {
    for (const w of WIDTHS) {
      const ctx = await b.newContext({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 800, hasTouch: w < 800 });
      const p = await ctx.newPage();
      await p.goto(DEV + pg, { waitUntil: 'load', timeout: 90000 }).catch(() => {});
      await p.addStyleTag({ content: HIDE });
      await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } scrollTo(0, 0); });
      await p.waitForTimeout(1200);
      const r = await p.evaluate(() => {
        const FS = [12, 13, 14, 15, 16, 18, 20, 24, 28, 36, 44, 56, 72, 96];
        const LS = [0, -0.02, 0.12];                                  // em
        const vis = (el) => { const s = getComputedStyle(el), r = el.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.05 && r.width > 0 && r.height > 0; };
        const desk = innerWidth >= 1024;
        const gut = desk ? 40 : 20;
        const cLeft = Math.max(0, (innerWidth - 1280) / 2) + gut;
        const skip = '[aria-hidden="true"], script, style, noscript, svg, iframe, .shopify-app-block, [id^="judgeme"], .jdgm-widget, .jdgm-rev-widg, #snh-pay-router, .sp-modal, dialog, .visually-hidden, .sr-only, [inert]';
        const sections = [...document.querySelectorAll('main .shopify-section, .shopify-section-group-header-group, .shopify-section-group-footer-group')].filter(vis);
        const type = [], pad = [], align = [];
        const sname = (sec) => (sec.id.replace('shopify-section-', '').split('__').pop() || sec.className.split(' ').find((c) => /--/.test(c)) || '?').slice(0, 30);
        for (const sec of sections) {
          const name = sname(sec);
          const inHeader = sec.matches('.shopify-section-group-header-group');
          // ── type
          sec.querySelectorAll('*').forEach((el) => {
            if (!vis(el) || el.closest(skip)) return;
            const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
            if (!own) return;
            const r = el.getBoundingClientRect();
            if (r.right < 0 || r.left > innerWidth) return;                     // off-screen slides
            const s = getComputedStyle(el), f = parseFloat(s.fontSize);
            const lh = s.lineHeight === 'normal' ? null : parseFloat(s.lineHeight) / f;
            const ls = s.letterSpacing === 'normal' ? 0 : parseFloat(s.letterSpacing) / f;
            const fam = s.fontFamily.split(',')[0].replace(/["']/g, '').trim();
            const issues = [];
            if (!FS.includes(Math.round(f * 100) / 100) && !(f === 26 && el.matches('.sp-title'))) issues.push('size ' + f);   // 26: the spec's mobile product title
            if (lh === null || !(Math.abs(lh - 1.1) < .02 || Math.abs(lh - 1.5) < .02)) {
              // single-line labels whose box is the line box are allowed any line-height only if they sit in a fixed-height control
              issues.push('lh ' + (lh === null ? 'normal' : lh.toFixed(2)));
            }
            if (!LS.some((x) => Math.abs(x - ls) < .006)) issues.push('ls ' + ls.toFixed(3) + 'em');
            if (!/^(Inter|Instrument Serif)$/i.test(fam)) issues.push('font ' + fam);
            if (issues.length) type.push({ sec: name, el: el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/)[0] : ''), text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 28), issues });
          });
          // ── vertical padding: the section's padded root (the first child with padding, else the section)
          if (!inHeader && !sec.matches('.shopify-section-group-footer-group')) {
            const root = [sec, ...sec.querySelectorAll(':scope > *, :scope > * > *')].find((e) => vis(e) && (parseFloat(getComputedStyle(e).paddingTop) > 0 || parseFloat(getComputedStyle(e).paddingBottom) > 0)) || sec;
            const cs = getComputedStyle(root), pt = Math.round(parseFloat(cs.paddingTop)), pb = Math.round(parseFloat(cs.paddingBottom));
            const h = sec.getBoundingClientRect().height;
            const ok = desk ? [64, 96] : [48];
            const exempt = h < 140 || sec.querySelector('.hero, [class*="hero"], .sp, .announcement-bar, .colhero, .srhead, slideshow-carousel, .slideshow') !== null;   // heroes and the product's main section
            const okBottom = ok.includes(pb), okTop = ok.includes(pt);
            if (!exempt && (!okTop || !okBottom)) pad.push({ sec: name, top: pt, bottom: pb, h: Math.round(h) });
          }
          // ── container: walk down from the section while the box is full-bleed with no side padding; the first box that
          //    is narrower or padded defines the content column, whose content-box left must be the container's
          if (inHeader) {
            // header: the logo starts on the container's left edge, the last icon ends on its right edge
            const logo = [...sec.querySelectorAll('a[href="/"], a[href$=".com/"], a[href$=".lk/"]')].find((a) => vis(a) && a.querySelector('img, svg'));
            const icons = [...sec.querySelectorAll('a, button')].filter((a) => vis(a) && a.querySelector('svg') && a.getBoundingClientRect().top < 200 && a.getBoundingClientRect().top > 0);
            const firstL = Math.min(...icons.map((a) => a.querySelector('svg').getBoundingClientRect().left));
            if (!desk && Math.abs(firstL - cLeft) > 12) align.push({ sec: name + ' menu', left: +firstL.toFixed(1), want: cLeft, wraps: 'header left edge (menu glyph)' });
            if (logo && desk) {                       // phones centre the logo, with the menu button on the left edge
              const l = logo.querySelector('img, svg').getBoundingClientRect().left;
              if (Math.abs(l - cLeft) > 1.5) align.push({ sec: name + ' logo', left: +l.toFixed(1), want: cLeft, wraps: 'header' });
            }
            const lastR = Math.max(...icons.map((a) => a.getBoundingClientRect().right));
            const lastIcon = icons.find((a) => a.getBoundingClientRect().right === lastR);
            if (lastIcon) { const ir = lastIcon.querySelector('svg').getBoundingClientRect().right; const want = innerWidth - cLeft;
              if (Math.abs(ir - want) > 12) align.push({ sec: name + ' icons', left: +ir.toFixed(1), want, wraps: 'header right edge (icon glyph within its 40px button)' }); }
          } else {
            let el = sec, depth = 0, col = null;
            while (el && depth < 8) {
              const r = el.getBoundingClientRect(), cs = getComputedStyle(el), pl = parseFloat(cs.paddingLeft);
              if (r.width < innerWidth - 1 || pl > 0) { col = { left: r.left + pl, el }; break; }
              el = [...el.children].find((c) => vis(c) && !c.matches('style, script, link, img, picture, video, svg') && !/absolute|fixed/.test(getComputedStyle(c).position)); depth++;   // decorations don't define the column
            }
            if (col && Math.abs(col.left - cLeft) > 1.5 && col.el.getBoundingClientRect().width > innerWidth * .5) {
              align.push({ sec: name, left: +col.left.toFixed(1), want: cLeft, wraps: (col.el.className || col.el.tagName).toString().split(' ')[0] });
            }
          }
        }
        return { type, pad, align, docW: document.documentElement.scrollWidth };
      });
      report.push({ page: pg, w, ...r });
      console.log(`${pg} @ ${w}: type ${r.type.length} · padding ${r.pad.length} · alignment ${r.align.length}${r.docW > w ? ' · SIDEWAYS SCROLL ' + r.docW : ''}`);
      await ctx.close();
    }
  }
  await b.close();
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `audit-${LABEL}.json`), JSON.stringify(report, null, 1));
  const md = [`# Round 6 site audit (${LABEL})`, '', `Generated ${new Date().toISOString()}`, '', '| page | width | type | padding | alignment |', '|---|---|---|---|---|'];
  let T = 0, P = 0, A = 0;
  report.forEach((r) => { md.push(`| ${r.page} | ${r.w} | ${r.type.length} | ${r.pad.length} | ${r.align.length} |`); T += r.type.length; P += r.pad.length; A += r.align.length; });
  md.push(`| **total** | | **${T}** | **${P}** | **${A}** |`, '');
  report.forEach((r) => {
    if (!r.type.length && !r.pad.length && !r.align.length) return;
    md.push(`## ${r.page} @ ${r.w}`, '');
    r.pad.forEach((x) => md.push(`- padding · ${x.sec}: ${x.top}/${x.bottom} (h ${x.h})`));
    r.align.forEach((x) => md.push(`- align · ${x.sec}: text starts at ${x.left}, container ${x.want} (${x.wraps})`));
    r.type.forEach((x) => md.push(`- type · ${x.sec} · ${x.el} "${x.text}": ${x.issues.join(', ')}`));
    md.push('');
  });
  fs.writeFileSync(path.join(OUT, `audit-${LABEL}.md`), md.join('\n'));
  console.log(`TOTAL type ${T} · padding ${P} · alignment ${A}`);
})();
