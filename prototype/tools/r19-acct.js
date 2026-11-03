// R19 #8 #9 #10: video slots (QA page ?view=r19-video + silver persona hero), workouts in the account + tracker,
// shaker level visual (header panel mock, Overview level card, tracker XP, quiz game).   node prototype/tools/r19-acct.js [widths]
const { chromium, open, go, shot } = require('./r19-lib');
const W = (process.argv[2] || '390,1440').split(',').map(Number);
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const vstate = (p, sel) => p.evaluate((sel) => [...document.querySelectorAll(sel)].map((b) => { const v = b.querySelector('video'); return { src: !!(v && v.querySelector('source')), playing: !!(v && !v.paused && v.readyState > 2), cls: b.classList.contains('is-playing'), poster: !!b.querySelector('.snh-bgv__poster'), ov: getComputedStyle(b.querySelector('.snh-bgv__ov')).backgroundImage.slice(0, 30) }; }), sel);
(async () => {
  const b = await chromium.launch();
  for (const w of W) {
    // --- #8 video slots
    let { ctx, p } = await open(b, w);
    await go(p, '/pages/about-us?view=r19-video');
    const before = await vstate(p, '.sbx [data-bgv]');
    ok(before.length === 2 && !before[1].src, w + ' stats video: no source until a slot nears the viewport (tile slot further down: ' + JSON.stringify(before.map((x) => x.src)) + ')');
    await p.locator('.sbx').first().scrollIntoViewIfNeeded(); await p.waitForTimeout(4500);
    let st = await vstate(p, '.sbx [data-bgv]');
    ok(st[0] && st[0].src && st[0].playing && st[0].cls, w + ' stats video plays when in view ' + JSON.stringify(st[0]));
    const contrast = await p.evaluate(() => { const n = document.querySelector('.sbx--video .sbx__num'); return n ? getComputedStyle(n).color : ''; });
    ok(/255, 255, 255/.test(contrast), w + ' stats stay white on the dark overlay');
    await p.screenshot({ path: shot(`08-video-stats-${w}`) });
    await p.locator('.sbx--video-tile').scrollIntoViewIfNeeded(); await p.waitForTimeout(3500);
    await (await p.$('.sbx--video-tile')).screenshot({ path: shot(`08-video-tile-${w}`) });
    st = await vstate(p, '.sbx [data-bgv]');
    ok(st[1] && st[1].playing, w + ' tile variant plays');
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await p.waitForTimeout(1500);
    const off = await p.evaluate(() => [...document.querySelectorAll('.sbx [data-bgv] video')].map((v) => v.paused));
    ok(off[0] === true, w + ' video pauses off-screen ' + JSON.stringify(off));
    ok(await p.evaluate(() => !document.querySelectorAll('.sbx')[2].querySelector('[data-bgv]')), w + ' no video set → current look (no slot)');
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(3500);
    st = await vstate(p, '.auth__bg [data-bgv]');
    ok(st[0] && st[0].playing, w + ' register background video plays ' + JSON.stringify(st[0]));
    await p.screenshot({ path: shot(`08-video-register-${w}`) });
    await ctx.close();
    // reduced motion: poster only, no download
    ctx = await b.newContext({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce', isMobile: w < 800, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' }); p = await ctx.newPage();
    await go(p, '/pages/about-us?view=r19-video'); await p.locator('.sbx').first().scrollIntoViewIfNeeded(); await p.waitForTimeout(2500);
    st = await vstate(p, '.sbx [data-bgv]');
    ok(st.every((x) => !x.src && !x.playing), w + ' reduced motion: no video source loaded');
    await ctx.close();
    // --- silver persona: hero video, level card, plan card (goal endurance → matched plan), tracker
    ({ ctx, p } = await open(b, w, { clear: ['snh_wk_track'] }));
    await go(p, '/pages/about-us?view=elite-mock-silver#overview'); await p.waitForTimeout(4000);
    st = await vstate(p, '.app__hero [data-bgv]');
    ok(st[0] && st[0].playing, w + ' account Elite hero video plays');
    await (await p.$('.app__hero')).screenshot({ path: shot(`08-video-account-hero-${w}`) });
    const lv = await p.evaluate(() => { const s = document.querySelector('.lvlc .shk'); return s && { pct: s.getAttribute('data-pct'), fill: getComputedStyle(s).getPropertyValue('--fill'), tier: s.getAttribute('data-tier'), svg: !!s.querySelector('svg'), label: s.getAttribute('aria-label'), text: document.querySelector('.lvlc .shk-row__v').textContent }; });
    await p.locator('.lvlc').scrollIntoViewIfNeeded(); await p.waitForTimeout(1800);
    const lv2 = await p.evaluate(() => { const s = document.querySelector('.lvlc .shk'); const g = s.querySelector('.shk__liq'); return { fill: getComputedStyle(s).getPropertyValue('--fill'), tr: getComputedStyle(g).transform }; });
    ok(lv && lv.svg && lv.tier === 'silver' && +lv2.fill > 0 && Math.round(+lv2.fill * 100) === +lv.pct, w + ' level card shaker: ' + JSON.stringify(lv) + ' → fill ' + lv2.fill + ' ' + lv2.tr);
    await (await p.$('.lvlc')).screenshot({ path: shot(`10-shaker-level-card-${w}`) });
    const ov = await p.evaluate(() => { const c = document.querySelector('[data-wk-overview]'); return c && !c.hidden ? c.textContent.replace(/\s+/g, ' ').slice(0, 140) : null; });
    ok(!!ov && /Endurance/i.test(ov), w + ' Overview plan card: ' + ov);
    await (await p.$('[data-wk-overview]')).screenshot({ path: shot(`09-overview-plan-card-${w}`) }).catch(() => {});
    await p.click('[data-wk-overview] [data-app-go]'); await p.waitForTimeout(1500);
    const g = await p.evaluate(() => { const b = document.querySelector('[data-wk-account]'); return { shown: b && !b.hidden, table: b && getComputedStyle(b.querySelector('.wk__week')).display !== 'none', ticks: b ? b.querySelectorAll('[data-wk-done]').length : 0, pics: b ? b.querySelectorAll('.wk__pic-svg').length : 0, how: b ? b.querySelectorAll('a.wk__how').length : 0, hash: location.hash }; });
    ok(g.shown && g.ticks > 0 && g.pics > 0 && g.how > 0 && g.hash === '#goals', w + ' Goals tab: matched plan with tracker ' + JSON.stringify(g));
    await p.locator('[data-wk-account]').scrollIntoViewIfNeeded(); await p.waitForTimeout(600);
    await p.screenshot({ path: shot(`09-goals-plan-${w}`) });
    // tick day 1 + 2 (visible control for this width)
    for (const d of [0, 1]) { const vis = p.locator(`[data-wk-account] [data-wk-done="${d}"]:visible`).first(); await vis.check(); await p.waitForTimeout(500); }
    const t = await p.evaluate(() => { const x = JSON.parse(localStorage.getItem('snh_wk_track') || '{}'); const tr = document.querySelector('[data-wk-account] [data-wk-tracker]'); return { log: x.log, plan: x.plan, txt: tr && tr.textContent.replace(/\s+/g, ' '), shk: !!(tr && tr.querySelector('.shk svg')) }; });
    ok(t.plan && JSON.stringify(t.log).includes('[0,1]') && /2\/\d+ sessions/.test(t.txt) && /100 XP/.test(t.txt) && t.shk, w + ' tracker: 2 ticks → ' + t.txt + ' (stored ' + JSON.stringify(t.log) + ')');
    await (await p.$('[data-wk-account] [data-wk-tracker]')).screenshot({ path: shot(`09-tracker-${w}`) });
    await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(3000);
    ok(await p.evaluate(() => /2\/\d+ sessions/.test((document.querySelector('[data-wk-account] [data-wk-tracker]') || {}).textContent || '')), w + ' tracker survives a reload (localStorage)');
    await ctx.close();
    // --- header panel mock (member)
    ({ ctx, p } = await open(b, w));
    await go(p, '/pages/about-us?view=elite-mock'); await p.waitForTimeout(2500);
    await p.evaluate(() => document.querySelectorAll('.acp .acp__prog--shk').forEach((e) => e.scrollIntoView())); await p.waitForTimeout(2000);
    const hp = await p.$$eval('.acp .acp__prog--shk .shk', (a) => a.map((s) => s.getAttribute('data-tier') + ':' + s.getAttribute('data-pct') + '→' + getComputedStyle(s).getPropertyValue('--fill')));
    ok(hp.length > 0, w + ' header panel shakers (mock panels): ' + hp.join(', '));
    const el = await p.$('.acp .acp__prog--shk'); if (el) { await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(1800); await (await p.$('.acp:has(.acp__prog--shk)')).screenshot({ path: shot(`10-shaker-header-panel-${w}`) }).catch(() => {}); }
    await ctx.close();
  }
  await b.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})();
