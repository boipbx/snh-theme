// Round 7 QA: SNH Elite account UI with mock customers (page.elite-mock via ?view=elite-mock) + the real
// logged-out pages. PW=<playwright> node prototype/tools/r7-qa.js
// Per state × width (390, 1440): screenshots (icon + panel, dashboard) into prototype/shots/r7/, and measures
//   type   — text off the Round 6 scale (size, line-height 1.1/1.5, tracking 0/-0.02/0.12em, Inter/Instrument Serif)
//   align  — dashboard column left edge vs the container (1280 max, 40 / 20px gutters)
//   rhythm — vertical gaps between the dashboard's blocks (want 40) and inside cards (multiples of 4)
//   scroll — horizontal overflow
// Writes prototype/shots/r7/qa.md.
const { chromium } = require(process.env.PW || 'playwright');
const fs = require('fs');
const path = require('path');
const DEV = process.env.DEV || 'http://127.0.0.1:9292';
const OUT = path.join(__dirname, '..', 'shots', 'r7');
const HIDE = '.shopify-section--popup,#preview-bar-iframe,privacy-bar,#shopify-pc__banner,.mock__flag{display:none!important}';
const MOCK_CSS = '.shopify-section-group-header-group,.hdr-wrap{position:static!important}';
const MOCK = '/pages/about-us?view=elite-mock';
const REAL = [['login', '/account/login'], ['recover', '/account/login#recover'], ['register', '/account/register'], ['elite-page', '/pages/about-us?view=snh-elite']];

function measure(scope) {
  const FS = [12, 13, 14, 15, 16, 18, 20, 24, 28, 36, 44, 56, 72, 96];
  const LS = [0, -0.02, 0.12];
  const vis = (el) => { const s = getComputedStyle(el), r = el.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.05 && r.width > 0 && r.height > 0; };
  const root = document.querySelector(scope);
  const desk = innerWidth >= 1024, gut = desk ? 40 : 20, cLeft = Math.max(0, (innerWidth - 1280) / 2) + gut;
  const type = [];
  root.querySelectorAll('*').forEach((el) => {
    if (!vis(el) || el.closest('svg, script, style, .v-sr, .mock__label')) return;
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0)) return;
    const s = getComputedStyle(el), f = parseFloat(s.fontSize);
    const lh = s.lineHeight === 'normal' ? null : parseFloat(s.lineHeight) / f;
    const ls = s.letterSpacing === 'normal' ? 0 : parseFloat(s.letterSpacing) / f;
    const fam = s.fontFamily.split(',')[0].replace(/["']/g, '').trim();
    const issues = [];
    if (!FS.includes(Math.round(f * 100) / 100)) issues.push('size ' + f);
    // pills/badges/buttons are fixed-height controls: line-height 1 inside them is the scale's control style
    const control = el.closest('.v-btn, .pill, .tierb, .etier__you, .acc__count, .reg__steps span, .acct-ini, .acp__av');
    if (!control && (lh === null || !(Math.abs(lh - 1.1) < .02 || Math.abs(lh - 1.5) < .02))) issues.push('lh ' + (lh === null ? 'normal' : lh.toFixed(2)));
    if (!LS.some((x) => Math.abs(x - ls) < .006)) issues.push('ls ' + ls.toFixed(3) + 'em');
    if (!/^(Inter|Instrument Serif)$/i.test(fam)) issues.push('font ' + fam);
    if (issues.length) type.push((el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : el.tagName.toLowerCase()) + ' "' + el.textContent.trim().replace(/\s+/g, ' ').slice(0, 24) + '": ' + issues.join(', '));
  });
  const align = [], rhythm = [];
  const acc = root.querySelector('.acc');
  if (acc) {
    const l = acc.getBoundingClientRect().left + parseFloat(getComputedStyle(acc).paddingLeft);
    if (Math.abs(l - cLeft) > 1.5) align.push(`dashboard column at ${l.toFixed(1)}, container ${cLeft}`);
    const kids = [...acc.children].filter(vis);
    for (let i = 1; i < kids.length; i++) {
      const gap = Math.round(kids[i].getBoundingClientRect().top - kids[i - 1].getBoundingClientRect().bottom);
      const want = kids[i].classList.contains('anav') || kids[i - 1].classList.contains('acc__head') && kids[i].classList.contains('anav') ? 24 : 40;
      if (Math.abs(gap - want) > 1) rhythm.push(`${kids[i - 1].className.split(' ')[0]} → ${kids[i].className.split(' ')[0]}: ${gap}px (want ${want})`);
    }
    acc.querySelectorAll('.acc__card, .rcard, .ecard, .etier, .how li').forEach((c) => {
      const s = getComputedStyle(c), g = parseFloat(s.rowGap) || 0;
      [parseFloat(s.paddingTop), parseFloat(s.paddingLeft), g].forEach((v) => { if (v % 4) rhythm.push(`${c.className.split(' ')[0]} spacing ${v}px not on the 4px grid`); });
    });
    // the hero pair lines up: card and rewards card share a top edge and (desktop) a bottom edge
    const e = acc.querySelector('.ecard'), r = acc.querySelector('.rcard');
    if (e && r && desk) { const a = e.getBoundingClientRect(), b = r.getBoundingClientRect(); if (Math.abs(a.top - b.top) > 1 || Math.abs(a.bottom - b.bottom) > 1) rhythm.push('membership card and rewards card edges differ'); }
  }
  return { type: [...new Set(type)], align, rhythm: [...new Set(rhythm)], docW: document.documentElement.scrollWidth };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const md = ['# Round 7 QA: SNH Elite account UI', '', `Generated ${new Date().toISOString()} against ${DEV}`, '', 'Mock states from `page.elite-mock` (dev only). Real pages are the logged-out storefront.', '', '| state | width | type | align | rhythm | sideways scroll | console errors |', '|---|---|---|---|---|---|---|'];
  const detail = [];
  for (const w of [390, 1440]) {
    const ctx = await b.newContext({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 800, hasTouch: w < 800 });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(DEV + MOCK, { waitUntil: 'load', timeout: 90000 });
    await p.addStyleTag({ content: HIDE + MOCK_CSS });
    await p.waitForTimeout(1200);
    for (const st of ['out', 'bronze', 'silver', 'gold']) {
      const sel = `#state-${st}`;
      const el = p.locator(sel);
      await el.locator('.mock__bar').screenshot({ path: path.join(OUT, `${st}-icon-${w}.png`) });
      await el.locator('.acp').screenshot({ path: path.join(OUT, `${st}-panel-${w}.png`) });
      if (st !== 'out') await el.locator('.mock__dash').screenshot({ path: path.join(OUT, `${st}-dashboard-${w}.png`) });
      const r = await p.evaluate(measure, sel);
      md.push(`| ${st} | ${w} | ${r.type.length} | ${r.align.length} | ${r.rhythm.length} | ${r.docW > w ? r.docW : 'no'} | ${errs.length} |`);
      detail.push({ st, w, ...r });
    }
    // real logged-out pages
    for (const [name, url] of REAL) {
      const errs2 = [];
      const q = await ctx.newPage();
      q.on('pageerror', (e) => errs2.push(e.message));
      await q.goto(DEV + url, { waitUntil: 'load', timeout: 90000 });
      await q.addStyleTag({ content: HIDE });
      await q.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 100)); } scrollTo(0, 0); });
      await q.waitForTimeout(1000);
      await q.screenshot({ path: path.join(OUT, `${name}-${w}.png`), fullPage: true });
      const r = await q.evaluate(measure, 'main');
      const liquid = await q.evaluate(() => (document.body.innerText.match(/Liquid (syntax )?error[^\n]*/g) || []).join(' | '));
      md.push(`| ${name} (real) | ${w} | ${r.type.length} | ${r.align.length} | ${r.rhythm.length} | ${r.docW > w ? r.docW : 'no'} | ${errs2.length}${liquid ? ' · ' + liquid : ''} |`);
      detail.push({ st: name + ' (real)', w, ...r });
      await q.close();
    }
    // header panel opened for real (signed out)
    await p.goto(DEV + '/', { waitUntil: 'load' });
    await p.addStyleTag({ content: HIDE });
    await p.locator('.acct-btn:visible').first().click();
    await p.waitForTimeout(600);
    await p.screenshot({ path: path.join(OUT, `header-panel-open-${w}.png`) });
    await ctx.close();
  }
  await b.close();
  md.push('');
  detail.forEach((d) => {
    if (!d.type.length && !d.align.length && !d.rhythm.length) return;
    md.push(`## ${d.st} @ ${d.w}`, '');
    d.align.forEach((x) => md.push(`- align · ${x}`));
    d.rhythm.forEach((x) => md.push(`- rhythm · ${x}`));
    d.type.forEach((x) => md.push(`- type · ${x}`));
    md.push('');
  });
  fs.writeFileSync(path.join(OUT, 'qa.md'), md.join('\n'));
  console.log(md.slice(6, 6 + 2 + 16).join('\n'));
})();
