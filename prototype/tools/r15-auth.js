// Round 15 item 2: sign in, register, recover at 390 + 1440 (activate / reset need a real token link, not opened).
// Checks: background photos + crossfade (static with reduced motion), the form card and the sample Elite card + 3
// perks + social-proof line, desktop form left / card right, phone order photo header → form → card, password show /
// hide, register keeps mobile (+94) + quiz step 3, no sideways scroll. Never submits a form. Target theme asserted.
process.env.SHOTS = 'r15';
const { chromium, context, open, out } = require('./r14-lib.js');
const fs = require('fs'), path = require('path');
const O = out('auth'), rows = [];
const log = (w, step, ok, note) => { rows.push(`| ${w} | ${step} | ${ok ? 'PASS' : '**FAIL**'} | ${note || ''} |`); console.log(w, ok ? 'PASS' : 'FAIL', step, note || ''); };
(async () => {
  const b = await chromium.launch();
  for (const w of [390, 1440]) {
    const c = await context(b, w), p = await c.newPage();
    for (const [name, pth] of [['login', '/account/login'], ['register', '/account/register'], ['recover', '/account/login#recover']]) {
      await open(p, pth); await p.waitForTimeout(2000);
      if (name === 'recover') { await p.evaluate(() => { const a = document.querySelector('[data-auth-go="recover"]'); if (a) a.click(); }); await p.waitForTimeout(600); }
      const r = await p.evaluate(() => {
        const q = (s) => document.querySelector(s), R = (e) => e && e.getBoundingClientRect();
        const bg = q('.auth__bg'), card = q('.auth__card'), aside = q('.auth__aside'), ec = q('.auth__ecard .elc');
        const imgs = bg ? bg.querySelectorAll('.auth__bgimg').length : 0;
        const anim = bg ? getComputedStyle(bg.querySelector('.auth__bgimg')).animationName : '';
        const a = R(card), s = R(aside);
        return { imgs, fade: !!(bg && bg.hasAttribute('data-auth-fade')), anim, card: !!card, ecard: !!ec, perks: document.querySelectorAll('.auth__perks li').length, proof: (q('.auth__proof') || {}).textContent || '', side: a && s ? (a.right <= s.left + 1 ? 'form-left' : a.bottom <= s.top + 1 ? 'form-above' : 'overlap') : '', over: document.documentElement.scrollWidth - innerWidth, tog: document.querySelectorAll('.pw__tog').length, phone: !!q('input[type="tel"], [data-sl-phone], input[name*="phone"]'), quiz: !!q('[data-reg-step="3"]') };
      });
      const layoutOK = w >= 1024 ? r.side === 'form-left' : r.side === 'form-above';
      log(w, `${name}: photo background (${r.imgs} photos, crossfade ${r.anim}) + tint`, r.imgs >= 2 && r.fade && r.anim === 'auth-fade', '');
      log(w, `${name}: form card + sample Elite card + 3 perks + social proof, ${w >= 1024 ? 'form left / card right' : 'form above the card'}`, r.card && r.ecard && r.perks === 3 && /VIP|club/i.test(r.proof) && layoutOK && r.over <= 0, `layout ${r.side} · sideways ${r.over}`);
      if (name !== 'recover') {
        const t = p.locator('.auth__pane:not([hidden]) .pw__tog, .auth__card .pw__tog').first();
        let ok = false; if (await t.count()) { await t.click(); ok = await p.evaluate(() => { const i = document.querySelector('.pw input'); return i.type === 'text'; }); await t.click(); ok = ok && await p.evaluate(() => document.querySelector('.pw input').type === 'password'); }
        log(w, `${name}: password show / hide`, ok, `${r.tog} toggle(s)`);
      }
      if (name === 'register') log(w, 'register: mobile (+94) field and quiz step 3 kept', r.phone && r.quiz, '');
      await p.screenshot({ path: path.join(O, `${name}-${w}.png`), fullPage: w < 1024 });
    }
    await c.close();
  }
  // reduced motion: a static image
  const c = await context(b, 1440), p = await c.newPage(); await p.emulateMedia({ reducedMotion: 'reduce' });
  await open(p, '/account/login'); await p.waitForTimeout(1500);
  const rm = await p.evaluate(() => { const i = [...document.querySelectorAll('.auth__bgimg')]; return { anim: getComputedStyle(i[0]).animationName, first: getComputedStyle(i[0]).opacity, rest: i.slice(1).map((x) => getComputedStyle(x).opacity) }; });
  log(1440, 'reduced motion: one static photo, no crossfade', rm.anim === 'none' && rm.first === '1' && rm.rest.every((o) => o === '0'), JSON.stringify(rm));
  fs.writeFileSync(path.join(O, 'auth.md'), ['# Sign in / register / recover (Round 15)', '', '| width | check | result | note |', '|---|---|---|---|', ...rows].join('\n') + '\n');
  await b.close();
})();
