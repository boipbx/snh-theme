// Round 16: Overview (390 / 768 / 1024 / 1440), the flip card (3 tiers: front, mid-flip, back; second click back;
// Enter / Space; pointer moves change nothing; reduced motion = crossfade), back + front fit at every width, one-line
// points + name, sidebar (no avatar pill, compact card one line at 1024–1440). Target theme asserted.
//   node prototype/tools/r16-card.js → shots/r16/overview/, card/, sidebar/
process.env.SHOTS = 'r16';
const { chromium, context, open, out } = require('./r14-lib.js');
const fs = require('fs'), path = require('path');
const OV = out('overview'), CD = out('card'), SB = out('sidebar'), rows = [];
const log = (w, step, ok, note) => { rows.push(`| ${w} | ${step} | ${ok ? 'PASS' : '**FAIL**'} | ${note || ''} |`); console.log(w, ok ? 'PASS' : 'FAIL', step, note || ''); };
const FIT = (card) => { const r = card.getBoundingClientRect(); const bad = []; card.querySelectorAll('.elc__face').forEach((f) => { const fr = f.getBoundingClientRect(); f.querySelectorAll('*').forEach((e) => { if (e.closest('.v-sr') || !e.getClientRects().length || e.matches('.elc__sheen')) return; const b = e.getBoundingClientRect(); if (b.width && (b.right > fr.right + 1 || b.bottom > fr.bottom + 1 || b.left < fr.left - 1 || b.top < fr.top - 1)) bad.push(e.className || e.tagName); if (parseFloat(getComputedStyle(e).fontSize) < 12 && e.textContent.trim() && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) bad.push('small:' + (e.className || e.tagName)); }); }); const pts = card.querySelector('.elc__pts'), nm = card.querySelector('.elc__name'); const lines = (e) => e ? Math.round(e.getBoundingClientRect().height / (parseFloat(getComputedStyle(e).lineHeight) || parseFloat(getComputedStyle(e).fontSize) * 1.2)) : 0; return { w: Math.round(r.width), h: Math.round(r.height), bad: [...new Set(bad)].slice(0, 5), ptsLine: pts ? pts.getBoundingClientRect().height < parseFloat(getComputedStyle(pts.querySelector('strong')).fontSize) * 1.6 : true, nameLines: lines(nm), ptsText: pts ? pts.textContent.replace(/\s+/g, ' ').trim() : '' }; };
(async () => {
  const b = await chromium.launch();
  for (const w of [390, 768, 1024, 1440]) {
    const c = await context(b, w), p = await c.newPage();
    await open(p, '/pages/about-us?view=elite-mock-silver'); await p.waitForTimeout(1500);
    const o = await p.evaluate(() => { const T = (s) => { const e = document.querySelector(s); return e && e.offsetParent !== null ? Math.round(e.getBoundingClientRect().top + scrollY) : null; }; const card = document.querySelector('.app__hero--cards .elc'), rw = document.querySelector('.app__hero--cards .rwd'); const a = card.getBoundingClientRect(), r = rw.getBoundingClientRect(); return { banner: !!document.querySelector('.app__main [data-campaign-slot], .app__main .cmp-ban'), cards: document.querySelectorAll('.app__hero--cards .elc').length, flip: card.dataset.side, eyebrow: T('.app__head .eyebrow'), sideTop: T('.app__mini .elc'), cardH: Math.round(a.height), panelH: Math.round(r.height), beside: r.left >= a.right - 1 && Math.abs(r.top - a.top) < 2, below: r.top >= a.bottom - 1 }; });
    const layout = w >= 1200 ? o.beside && Math.abs(o.cardH - o.panelH) <= 2 : o.below;
    log(w, 'Overview: no payment banner, ONE flip card, points panel ' + (w >= 1200 ? 'beside (equal height)' : 'below'), !o.banner && o.cards === 1 && o.flip === 'both' && layout, `card ${o.cardH} / panel ${o.panelH}px`);
    if (w >= 1024) log(w, 'Overview: eyebrow top aligned with the sidebar card top', o.sideTop !== null && Math.abs(o.eyebrow - o.sideTop) <= 2, `eyebrow ${o.eyebrow} · sidebar card ${o.sideTop}`);
    else log(w, 'Overview: eyebrow + heading spacing', o.eyebrow > 0, `eyebrow at ${o.eyebrow}px`);
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(OV, `overview-${w}.png`) });
    if (w >= 1024) {
      const s = await p.evaluate(() => { const card = document.querySelector('.app__mini .elc'); const nm = card.querySelector('.elc__name'), pts = card.querySelector('.elc__pts'); return { pill: !!document.querySelector('.app__side .app__me'), first: document.querySelector('.app__side').firstElementChild.className, nameOne: nm.scrollWidth <= nm.clientWidth + 1 || getComputedStyle(nm).textOverflow === 'ellipsis', nameH: Math.round(nm.getBoundingClientRect().height), ptsH: Math.round(pts.getBoundingClientRect().height), pts: pts.textContent.replace(/\s+/g, ' ').trim(), name: nm.textContent }; });
      log(w, 'sidebar: no avatar pill, compact card first, name + points on one line', !s.pill && /app__mini/.test(s.first) && s.nameH < 24 && s.ptsH < 26, `${s.name} · ${s.pts} · heights ${s.nameH}/${s.ptsH}`);
      await p.locator('.app__side').screenshot({ path: path.join(SB, `sidebar-${w}.png`) });
    }
    // back fits at every width
    const card = p.locator('.app__hero--cards .elc');
    const f1 = await card.evaluate(FIT);
    log(w, 'card front + back fit (no overflow, text ≥ 12px), points + name one line', !f1.bad.length && f1.ptsLine && f1.nameLines <= 1, `${f1.w}×${f1.h} · "${f1.ptsText}" · ${f1.bad.join(',') || 'ok'}`);
    await c.close();
  }
  // flip, 3 tiers, 1440 + 390
  for (const w of [1440, 390]) {
    const c = await context(b, w), p = await c.newPage();
    for (const t of ['bronze', 'silver', 'gold']) {
      await open(p, `/pages/about-us?view=elite-mock-${t}`); await p.waitForTimeout(1500);
      const card = p.locator('.app__hero--cards .elc'); await card.scrollIntoViewIfNeeded(); await p.waitForTimeout(400);
      const wrap = p.locator('.app__hero--cards .elc-wrap');
      // pointer moves: nothing changes (no tilt)
      const box = await card.boundingBox();
      const tf0 = await card.evaluate((e) => getComputedStyle(e).transform + '|' + getComputedStyle(e.querySelector('.elc__in')).transform);
      if (w > 800) { await p.mouse.move(box.x + 20, box.y + 20); await p.waitForTimeout(150); await p.mouse.move(box.x + box.width - 20, box.y + box.height - 20); await p.waitForTimeout(300); }
      const tf1 = await card.evaluate((e) => getComputedStyle(e).transform + '|' + getComputedStyle(e.querySelector('.elc__in')).transform);
      await p.mouse.move(0, 0); await p.waitForTimeout(1200);
      await wrap.screenshot({ path: path.join(CD, `${t}-front-${w}.png`) });
      await card.click({ position: { x: 40, y: 40 } }); await p.waitForTimeout(110);
      await wrap.screenshot({ path: path.join(CD, `${t}-midflip-${w}.png`) });
      const mid = await card.evaluate((e) => getComputedStyle(e.querySelector('.elc__in')).transform);
      await p.waitForTimeout(900);
      await wrap.screenshot({ path: path.join(CD, `${t}-back-${w}.png`) });
      const back = await card.evaluate((e) => ({ f: e.classList.contains('is-flipped'), tf: getComputedStyle(e.querySelector('.elc__in')).transform, hint: e.closest('.elc-wrap').querySelector('[data-elc-hint]').textContent.trim(), link: e.querySelector('.elc__link').tabIndex }));
      const fb = await card.evaluate((card) => { const f = card.querySelector('.elc__back'); const fr = f.getBoundingClientRect(); return [...f.querySelectorAll('dt, dd, .elc__link')].filter((e) => { const r = e.getBoundingClientRect(); return r.right > fr.right + 1 || r.bottom > fr.bottom + 1; }).length; });
      await card.click({ position: { x: 40, y: 40 } }); await p.waitForTimeout(900);
      const again = await card.evaluate((e) => !e.classList.contains('is-flipped'));
      await card.focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(800);
      const kEnter = await card.evaluate((e) => e.classList.contains('is-flipped'));
      await p.keyboard.press(' '); await p.waitForTimeout(800);
      const kSpace = await card.evaluate((e) => !e.classList.contains('is-flipped'));
      const midOK = mid !== 'none' && mid !== 'matrix(1, 0, 0, 1, 0, 0)' && !/^matrix3d\(-1/.test(mid);
      log(w, `${t}: 3D flip on click (mid-flip frame), back shows, second click flips back, Enter + Space`, back.f && /matrix3d\(-1/.test(back.tf) && midOK && again && kEnter && kSpace && back.link === 0 && /back/i.test(back.hint), `mid ${mid.slice(0, 28)} · hint "${back.hint}" · back overflow ${fb}`);
      log(w, `${t}: pointer moves change nothing (no tilt / parallax)`, tf0 === tf1, w > 800 ? tf1.slice(0, 40) : 'touch width: no hover');
    }
    await c.close();
  }
  // reduced motion
  const c = await context(b, 1440), p = await c.newPage(); await p.emulateMedia({ reducedMotion: 'reduce' });
  await open(p, '/pages/about-us?view=elite-mock-gold'); await p.waitForTimeout(1500);
  const card = p.locator('.app__hero--cards .elc'); await card.click({ position: { x: 40, y: 40 } }); await p.waitForTimeout(400);
  const rm = await card.evaluate((e) => ({ tf: getComputedStyle(e.querySelector('.elc__in')).transform, back: getComputedStyle(e.querySelector('.elc__back')).opacity, front: getComputedStyle(e.querySelector('.elc__front')).opacity }));
  log(1440, 'reduced motion: no rotation, instant crossfade to the back', rm.tf === 'none' && rm.back === '1' && rm.front === '0', JSON.stringify(rm));
  // other full-size placements are flip cards; compact ones front-only with the one-line points
  for (const [pth, sel, name, side] of [['/pages/about-us?view=elite-mock-silver#rewards', '.app__ecard .elc', 'Rewards', 'both'], ['/pages/snh-elite', 'main .elc', 'Elite page', 'both'], ['/', '.eband__card .elc', 'home band', 'both'], ['/account/login', '.auth__ecard .elc', 'login', 'both'], ['/account/register', '.auth__ecard .elc', 'register', 'both'], ['/pages/about-us?view=elite-mock', '.acp--static .elc', 'header panel (compact)', 'front']]) {
    await open(p, pth); await p.waitForTimeout(1500);
    if (name === 'Rewards') { await p.evaluate(() => { const a = document.querySelector('[data-go="rewards"]'); if (a) a.click(); }); await p.waitForTimeout(800); }
    const el = p.locator(sel).first(); const n = await el.count();
    const r = n ? await el.evaluate((e) => ({ side: e.dataset.side, pts: e.querySelector('.elc__pts').textContent.replace(/\s+/g, ' ').trim(), one: e.querySelector('.elc__pts').getBoundingClientRect().height < 30 })) : {};
    log(1440, `${name}: ${side === 'both' ? 'flip card' : 'front only'}, one-line points`, n && r.side === side && r.one, r.pts || 'not found');
  }
  await c.close();
  fs.writeFileSync(path.join(out(''), 'card.md'), ['# Round 16: card + Overview + sidebar', '', '| width | check | result | note |', '|---|---|---|---|', ...rows].join('\n') + '\n');
  await b.close();
})();
