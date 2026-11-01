// Round 15 item 1: the one static SNH Elite card. For bronze / silver / gold (member mocks): front + back at full size
// (Overview at 1440: two cards side by side) and phone size (Overview at 390: one card + "Show back"). Also: header
// panel (compact), account sidebar (small), Rewards, /pages/snh-elite, home band (guest sample). DOM checks per card:
// no transform / perspective on the card or its faces (also while hovered), every text ≥ 12px, nothing overflows the
// card, contrast of each text colour against the lightest metal stop ≥ 4.5:1. Target theme asserted.
//   node prototype/tools/r15-card.js → shots/r15/card/
process.env.SHOTS = 'r15';
const { chromium, context, open, out } = require('./r14-lib.js');
const fs = require('fs'), path = require('path');
const O = out('card'), rows = [];
const log = (w, step, ok, note) => { rows.push(`| ${w} | ${step} | ${ok ? 'PASS' : '**FAIL**'} | ${note || ''} |`); console.log(w, ok ? 'PASS' : 'FAIL', step, note || ''); };
const AUDIT = (el) => {
  const L = (r, g, b) => { const f = (x) => { x /= 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
  const card = el.closest('.elc') || el; const cs = getComputedStyle(card);
  const stops = ['--e1', '--e2', '--e3'].map((k) => cs.getPropertyValue(k).trim()).map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
  const lightest = stops.reduce((a, b) => (L(...a) > L(...b) ? a : b)); const darkest = stops.reduce((a, b) => (L(...a) < L(...b) ? a : b));
  const r = card.getBoundingClientRect(); let small = [], over = [], tf = [], low = [], minC = 99;
  [card, ...card.querySelectorAll('.elc__face')].forEach((e) => { const s = getComputedStyle(e); if (s.transform !== 'none' || s.perspective !== 'none') tf.push(e.className); });
  card.querySelectorAll('.elc__face').forEach((face) => { if (getComputedStyle(face).visibility === 'hidden') return; face.querySelectorAll('*').forEach((e) => { if (e.closest('.v-sr')) return; if (!e.childNodes.length || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return; const s = getComputedStyle(e); const fs = parseFloat(s.fontSize); if (fs < 12) small.push(e.className + ' ' + fs); const b = e.getBoundingClientRect(); if (b.right > r.right + 1 || b.left < r.left - 1 || b.bottom > r.bottom + 1 || b.top < r.top - 1 || e.scrollWidth > e.clientWidth + 1 && s.textOverflow !== 'ellipsis') over.push(e.className || e.tagName); if (e.closest('.elc__stripe')) return; const c = rgb(s.color); const bg = e.closest('.elc__back') && e.closest('.elc__rows, .elc__link') ? [lightest, darkest] : [lightest, darkest]; const cr = Math.min(...bg.map((g) => (Math.max(L(...c), L(...g)) + .05) / (Math.min(L(...c), L(...g)) + .05))); if (cr < 4.5) low.push((e.className || e.tagName) + ' ' + s.color + ' ' + cr.toFixed(2)); minC = Math.min(minC, cr); }); });
  return { tier: card.dataset.tier, side: card.dataset.side, w: Math.round(r.width), h: Math.round(r.height), ratio: (r.width / r.height).toFixed(3), small, over, tf, minC: +minC.toFixed(2), low: low.slice(0, 3), logo: getComputedStyle(card.querySelector('.elc__logo') || card).maskImage || '' };
};
(async () => {
  const b = await chromium.launch();
  const C = await context(b, 1440), P = await C.newPage(), M = await context(b, 390), Q = await M.newPage();
  const audit = async (p, sel, name, w) => {
    const el = p.locator(sel).first(); if (!(await el.count())) { log(w, name, false, 'not found: ' + sel); return; }
    await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
    await el.hover().catch(() => {}); await p.waitForTimeout(400);
    const a = await el.evaluate(AUDIT);
    await p.mouse.move(0, 0); await p.waitForTimeout(1200);
    await el.screenshot({ path: path.join(O, `${name.replace(/\W+/g, '-').replace(/-+$/, '')}-${w}.png`) });
    log(w, name, !a.small.length && !a.over.length && !a.tf.length && a.minC >= 4.5 && Math.abs(a.ratio - 1.586) < .02, `${a.tier} ${a.side} ${a.w}×${a.h} ratio ${a.ratio} · min contrast ${a.minC} · small ${a.small.length}${a.low.length ? ' · low: ' + a.low.join('; ') : ''} · overflow ${a.over.join(',') || 0} · transform ${a.tf.join(',') || 'none'}`);
  };
  for (const t of ['bronze', 'silver', 'gold']) {
    await open(P, `/pages/about-us?view=elite-mock-${t}`); await P.waitForTimeout(1500);
    await audit(P, '.app__ec--front .elc', `${t} front full`, 1440);
    await audit(P, '.app__ec--back .elc', `${t} back full`, 1440);
    await P.evaluate(() => { const h = document.querySelector('.app__hero--cards'); if (h) h.scrollIntoView({ block: 'start' }); scrollBy(0, -100); }); await P.waitForTimeout(500);
    await P.screenshot({ path: path.join(O, `overview-${t}-1440.png`) });
    const ov = await P.evaluate(() => { const h = document.querySelector('.app__hero--cards'); const kids = [...h.children].filter((k) => getComputedStyle(k).display !== 'none').map((k) => k.getBoundingClientRect()); const ov = kids.some((a, i) => kids.some((b2, j) => i < j && a.left < b2.right - 1 && b2.left < a.right - 1 && a.top < b2.bottom - 1 && b2.top < a.bottom - 1)); return { n: kids.length, overlap: ov, heights: kids.map((k) => Math.round(k.height)), tops: kids.map((k) => Math.round(k.top)) }; });
    log(1440, `${t} Overview layout: front + back side by side (equal size), points panel below, no overlap`, ov.n === 3 && !ov.overlap && ov.tops[0] === ov.tops[1] && ov.heights[0] === ov.heights[1], JSON.stringify(ov));
    await open(Q, `/pages/about-us?view=elite-mock-${t}`); await Q.waitForTimeout(1500);
    await audit(Q, '.app__ec--both .elc', `${t} front phone`, 390);
    await Q.locator('.app__ec--both [data-elc-flip]').click(); await Q.waitForTimeout(500);
    await audit(Q, '.app__ec--both .elc', `${t} back phone`, 390);
    const fl = await Q.evaluate(() => { const c = document.querySelector('.app__ec--both .elc'); return { back: c.classList.contains('is-back'), btn: document.querySelector('.app__ec--both [data-elc-flip]').textContent }; });
    log(390, `${t} phone: "Show back" swaps to the back`, fl.back && /front/i.test(fl.btn), JSON.stringify(fl));
    await Q.evaluate(() => { const h = document.querySelector('.app__hero--cards'); if (h) h.scrollIntoView({ block: 'start' }); scrollBy(0, -80); }); await Q.waitForTimeout(400);
    await Q.screenshot({ path: path.join(O, `overview-${t}-390.png`) });
  }
  // sidebar (small) + Rewards
  await audit(P, '.app__mini .elc', 'sidebar small', 1440);
  await P.evaluate(() => { const a = document.querySelector('[data-go="rewards"]'); if (a) a.click(); }); await P.waitForTimeout(900);
  await audit(P, '.app__elc .elc', 'rewards', 1440);
  // header panel mock (compact), Elite page, home band (guest sample)
  for (const [p, w] of [[P, 1440], [Q, 390]]) {
    await open(p, '/pages/about-us?view=elite-mock'); await p.waitForTimeout(1500);
    await audit(p, '.acp--static .elc', 'header panel compact', w);
    await open(p, '/pages/snh-elite'); await p.waitForTimeout(1500);
    await audit(p, '.ep__card .elc, main .elc', 'elite page hero', w);
    await open(p, '/'); await p.waitForTimeout(1500);
    await audit(p, '.eband__card .elc', 'home band sample', w);
  }
  fs.writeFileSync(path.join(O, 'card.md'), ['# SNH Elite card (Round 15)', '', '| width | check | result | note |', '|---|---|---|---|', ...rows].join('\n') + '\n');
  await b.close();
})();
