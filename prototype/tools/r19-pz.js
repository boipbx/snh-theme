// R19 #5 + #6: relevant promos only + onboarding prompt. Guests in fresh contexts; personas via ?view=elite-mock-*.
//   node prototype/tools/r19-pz.js [widths]
const { chromium, open, go, shot } = require('./r19-lib');
const W = (process.argv[2] || '390,1440').split(',').map(Number);
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const state = (p) => p.evaluate(() => { const o = document.querySelector('[data-snh-onb]'); const e = document.querySelector('.ecm[open], dialog[open]');
  return { onb: !!o && !o.hidden && o.classList.contains('is-on'), onbEl: !!o, email: !!e, claim: window.SNHPopups && SNHPopups.taken, prefs: document.documentElement.getAttribute('data-prefs') }; });
(async () => {
  const b = await chromium.launch();
  for (const w of W) {
    // 1. fresh guest on home: prompt slides in; email popup not on the same view
    let { ctx, p } = await open(b, w, { clear: ['snh_sub', 'snh_onb_seen', 'snh_onb_t', 'snh_prefs', 'snh_quiz_pending', 'snh_ecm_t'] });
    await go(p, '/'); await p.waitForTimeout(12500);
    let s = await state(p);
    ok(s.onb && !s.email && s.claim === 'onboard' && s.prefs === 'none', w + ' home, no prefs: onboarding prompt shown, email popup not (' + JSON.stringify(s) + ')');
    await p.screenshot({ path: shot(`06-onb-home-${w}`) });
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight * .6)); await p.waitForTimeout(16000);
    s = await state(p); ok(!s.email, w + ' email popup still not shown after scroll + wait on the same page view');
    await p.click('[data-snh-onb] [data-onb-go]'); await p.waitForTimeout(2500);
    ok(await p.evaluate(() => !document.querySelector('.qzb__ov').hidden), w + ' prompt button opens the quiz full screen');
    await ctx.close();
    // 2. next page view inside 7 days: no prompt again
    ({ ctx, p } = await open(b, w, { clear: ['snh_sub', 'snh_onb_seen', 'snh_prefs', 'snh_quiz_pending'], ls: { snh_onb_t: String(Date.now() - 3 * 864e5) } }));
    await go(p, '/collections/whey-protein'); await p.waitForTimeout(12500);
    s = await state(p); ok(!s.onb, w + ' seen 3 days ago: no prompt (' + JSON.stringify(s) + ')');
    await ctx.close();
    // 3. seen 8 days ago, collection page: prompt again
    ({ ctx, p } = await open(b, w, { clear: ['snh_onb_seen', 'snh_prefs', 'snh_quiz_pending'], ls: { snh_onb_t: String(Date.now() - 8 * 864e5) } }));
    await go(p, '/collections/whey-protein'); await p.waitForTimeout(12500);
    s = await state(p); ok(s.onb, w + ' seen 8 days ago, collection: prompt again');
    await p.screenshot({ path: shot(`06-onb-collection-${w}`) });
    // 4. cart page: never; and promos: guest without prefs sees no RYSE promo
    await go(p, '/cart'); await p.waitForTimeout(12500);
    s = await state(p);
    const cp = await p.evaluate(() => { const g = document.querySelector('.scp [data-pz-group]'); return { el: !!g, hidden: g ? g.hidden : null, shown: g && g.getAttribute('data-pz-shown'), ryse: [...document.querySelectorAll('.scp .elpromo')].some((a) => !a.hidden && /RYSE/i.test(a.textContent)) }; });
    ok(!s.onbEl || !s.onb, w + ' cart page: no onboarding prompt');
    ok(!cp.ryse && cp.hidden === true, w + ' cart page, guest without prefs: RYSE promo hidden (' + JSON.stringify(cp) + ')');
    await p.screenshot({ path: shot(`05-cart-guest-noprefs-${w}`) });
    await ctx.close();
    // 5. guest with quiz answers on this device: no prompt anywhere
    ({ ctx, p } = await open(b, w, { clear: ['snh_onb_seen', 'snh_onb_t'], ls: { snh_prefs: JSON.stringify({ goal: 'build-muscle', sport: 'gym', diet: 'none' }) } }));
    await go(p, '/'); await p.waitForTimeout(12500);
    s = await state(p); ok(!s.onb && s.prefs === 'yes', w + ' guest with quiz answers: no prompt (' + JSON.stringify(s) + ')');
    await ctx.close();
    // 6. personas (QA mock pages render the member app with mock tags/orders)
    for (const [persona, expect] of [['new', 'quiz'], ['bronze', 'any'], ['vegan', 'any']]) {
      ({ ctx, p } = await open(b, w));
      await go(p, `/pages/about-us?view=elite-mock-${persona}#overview`); await p.waitForTimeout(3000);
      const r = await p.evaluate(() => { const g = document.querySelector('[data-app] [data-pz-group]'); const vis = [...document.querySelectorAll('[data-app] .elpromo')].filter((a) => !a.hidden && a.offsetParent).map((a) => a.querySelector('.elpromo__t').textContent.trim());
        return { group: !!g, p: g && ['goal', 'sport', 'diet', 'bought'].map((k) => k + '=' + (g.getAttribute('data-p-' + k) || '').slice(0, 40)).join(' '), cands: g ? g.querySelectorAll('[data-pz]').length : 0, shown: vis, prompt: !!document.querySelector('[data-app] [data-goal-prompt]') }; });
      console.log(w, persona, JSON.stringify(r));
      if (expect === 'quiz') ok(r.shown.length === 0 && r.prompt, w + ' persona new (no goal, no orders): no promos, the Personalise your SNH card instead');
      else ok(r.shown.every((t) => true), w + ' persona ' + persona + ': promos shown = ' + JSON.stringify(r.shown));
      const el = await p.$('[data-app] .elpromos:not([hidden]), [data-app] [data-goal-prompt]'); if (el) { await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(400); await p.screenshot({ path: shot(`05-account-${persona}-${w}`) }); }
      await ctx.close();
    }
  }
  // pure matcher checks
  const { ctx, p } = await open(b, 1440); await go(p, '/');
  const m = await p.evaluate(() => { const P = (o) => Object.assign({ goal: '', goal2: '', sport: '', diet: '', bought: '' }, o);
    return {
      ryseNoBuy: SNH.prefsMatch({ link: '/collections/ryse' }, P({ goal: 'build-muscle' })),
      ryseBought: SNH.prefsMatch({ link: '/collections/ryse' }, P({ bought: 'ryse protein' })),
      goalHit: SNH.prefsMatch({ goals: 'build-muscle,lose-fat' }, P({ goal: 'lose-fat' })),
      goalMiss: SNH.prefsMatch({ goals: 'endurance' }, P({ goal: 'lose-fat' })),
      dietMiss: SNH.prefsMatch({ goals: 'lose-fat', diets: 'vegan' }, P({ goal: 'lose-fat', diet: 'none' })),
      noTarget: SNH.prefsMatch({ link: '/collections/all' }, P({ goal: 'lose-fat' })) }; });
  console.log('matcher', JSON.stringify(m));
  ok(!m.ryseNoBuy && m.ryseBought && m.goalHit && !m.goalMiss && !m.dietMiss && !m.noTarget, 'matcher: RYSE only for RYSE buyers, goal hit/miss, all set fields must match, untargeted generic link never matches');
  await ctx.close(); await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})();
