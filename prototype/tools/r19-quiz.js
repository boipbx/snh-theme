// R19 #3/#4 (from r18-quiz): no budget step, 3+ picks, plan layout (weekly table ≥ 900 px, cards below), no overflow.
// R18 #8: homepage quiz band → full-screen quiz → stack + plan preview + gate (guest). Never submits: Klaviyo is
// answered by a Playwright route and the gate's submit is a synthetic event (no navigation), to check the tags it builds.
//   node prototype/tools/r18-quiz.js [widths=390,1440]
const { chromium } = require(process.env.PW || '/Users/pabasaradissanayake/Documents/eisenbahn-ops/qa/node_modules/playwright');
const path = require('path'); const OUT = path.join(__dirname, '..', 'shots', 'r19', '04-plan'); require('fs').mkdirSync(OUT, { recursive: true }); 
const W = (process.argv[2] || '360,390,1440').split(',').map(Number);
const PICK = JSON.parse(process.env.PICK || '{"goal":"build-muscle","lvl":"beginner","freq":"4x","sport":"cricket"}'); const TAG = process.env.TAG || 'muscle';
(async () => {
  const b = await chromium.launch(); let fails = 0;
  const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  for (const w of W) {
    const m = w < 800;
    const ctx = await b.newContext({ viewport: { width: w, height: m ? 844 : 900 }, isMobile: m, hasTouch: m, deviceScaleFactor: m ? 2 : 1, userAgent: m ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' });
    const kl = [];
    await ctx.route(/a\.klaviyo\.com\/client\/(events|subscriptions)/, (r) => { kl.push({ url: r.request().url(), body: r.request().postData() }); r.fulfill({ status: 202, body: '' }); });
    const p = await ctx.newPage(); const errs = [];
    await p.addInitScript(() => { try { localStorage.setItem('snh_sub', String(Date.now())); localStorage.setItem('snh_onb_t', String(Date.now())); localStorage.removeItem('snh_quiz_pending'); } catch (e) {} });
    p.on('response', (res) => { const rq = res.request(); if (/fetch|xhr/.test(rq.resourceType()) && (res.headers()['content-type'] || '').includes('text/html')) console.log('HTML fetch', res.status(), rq.url().slice(0, 160)); });
    p.on('pageerror', (e) => errs.push(e.message.slice(0, 160) + ' @ ' + String(e.stack || '').split('\n').slice(1, 3).join(' ').slice(0, 200)));
    await p.goto('https://sports-nutrition-hub.myshopify.com/?preview_theme_id=189832462590&_r=' + Date.now(), { waitUntil: 'load', timeout: 90000 });
    ok(await p.evaluate(() => Shopify.theme.id) === 189832462590, w + ' theme 189832462590');
    await p.addStyleTag({ content: '#preview-bar-iframe,#PBarNextFrameWrapper{display:none!important}' });
    const band = await p.$('section.qzb'); ok(!!band, w + ' quiz band on the homepage');
    ok(!(await p.$('.goalbar')), w + ' goal chip strip gone');
    await band.scrollIntoViewIfNeeded(); await p.waitForTimeout(400);
    await band.screenshot({ path: `${OUT}/${TAG}-band-${w}.png` });
    ok(await p.evaluate(() => !document.querySelector('script[data-snh-app-js]') && !document.querySelector('[data-quiz]')), w + ' quiz JS + markup not loaded before the click');
    await p.click('[data-qzb-open]');
    await p.waitForSelector('.qzb__ov [data-quiz] .qz__step:not([hidden])', { timeout: 20000 });
    ok(await p.evaluate(() => !document.querySelector('.qzb__ov').hidden && getComputedStyle(document.querySelector('.qzb__ov')).position === 'fixed'), w + ' full-screen overlay open');
    await p.screenshot({ path: `${OUT}/${TAG}-quiz-q1-${w}.png` });
    // answer: the picks above, else the first tile; checkboxes / last step press Next
    for (let n = 0; n < 20; n++) {
      const st = await p.evaluate(() => { const s = document.querySelector('.qzb__ov .qz__step:not([hidden])'); return s ? { k: s.getAttribute('data-step'), t: s.getAttribute('data-type') } : null; });
      if (!st) break;
      const val = PICK[st.k];
      const sel = `.qzb__ov .qz__step[data-step="${st.k}"] .qz__tile:not([hidden]) input` + (val ? `[value="${val}"]` : '');
      await p.locator(sel).first().evaluate((i) => i.closest('label').click());
      await p.waitForTimeout(150);
      const still = await p.evaluate((k) => { const s = document.querySelector('.qzb__ov .qz__step:not([hidden])'); return s && s.getAttribute('data-step') === k; }, st.k);
      if (still) { await p.click('.qzb__ov [data-quiz-next]'); }
      await p.waitForTimeout(420);
    }
    await p.waitForSelector('.qzb__ov [data-qz-skipgame]', { state: 'visible', timeout: 10000 }).then(() => p.click('.qzb__ov [data-qz-skipgame]')).catch(() => {});
    await p.waitForSelector('.qzb__ov [data-step="results"]:not([hidden])', { timeout: 10000 }).catch(() => {});
    await p.waitForTimeout(1200);
    const r = await p.evaluate(() => {
      const q = document.querySelector('.qzb__ov [data-quiz]');
      return { mode: q.getAttribute('data-mode'), plan: q.getAttribute('data-plan'), stack: q.querySelectorAll('.qz__item').length, days: q.querySelectorAll('.wk__day').length, locked: q.querySelectorAll('.wk__day.is-locked').length,
        gate: !!q.querySelector('[data-wk-gate-slot] [data-wk-gate]:not([hidden])'), gdays: (q.querySelector('[data-wk-gate-days]') || {}).textContent, save: !!q.querySelector('[data-quiz-save]') };
    });
    console.log(w, JSON.stringify(r));
    const L = await p.evaluate(() => { const q = document.querySelector('.qzb__ov [data-quiz]'); const wk = q.querySelector('[data-wk-plan]'); const tb = wk.querySelector('.wk__week'), cd = wk.querySelector('.wk__days');
      const vis = (e) => !!e && getComputedStyle(e).display !== 'none';
      const over = [...wk.querySelectorAll('*')].filter((e) => { const b = e.getBoundingClientRect(), W = wk.getBoundingClientRect(); return b.width && (b.right > W.right + 1) && !e.closest('.wk__week'); }).length;
      const small = [...wk.querySelectorAll('*')].filter((e) => [...e.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 12 && !e.closest('.v-sr')).map((e) => e.className).slice(0, 5);
      return { budget: !!q.querySelector('[data-step="budget"]'), table: vis(tb), cards: vis(cd), pics: wk.querySelectorAll('.wk__pic-svg').length, how: wk.querySelectorAll('a.wk__nm[href*="youtube"]').length, over, small, pageX: document.documentElement.scrollWidth - document.documentElement.clientWidth, tableScroll: tb ? tb.scrollWidth - tb.clientWidth : 0 }; });
    console.log(w, 'layout', JSON.stringify(L));
    ok(!L.budget, w + ' no budget question');
    ok(r.stack >= 3, w + ' at least 3 picks (' + r.stack + ')');
    ok(w >= 900 ? L.table && !L.cards : L.cards && !L.table, w + ' plan layout: ' + (w >= 900 ? 'weekly table' : 'day cards'));
    ok(L.over === 0 && L.pageX <= 0 && !L.small.length, w + ' no overflow / tiny text ' + JSON.stringify(L.small));
    ok(L.pics > 0 && L.how > 0, w + ' exercise pictograms + Watch how links (' + L.pics + ' / ' + L.how + ')');
    ok(r.mode === 'guest' && !r.save, w + ' guest mode, no save form');
    ok(r.stack >= 2, w + ' stack shown (' + r.stack + ' products)');
    if (TAG === 'muscle') ok(r.plan === 'muscle-4', w + ' plan matched: build muscle × 4 days → muscle-4 (got ' + r.plan + ')');
    if (TAG === 'muscle') ok(r.days === 4 && r.locked === 3, w + ' plan preview: day 1 open, 3 locked');
    if (TAG === 'muscle') ok(r.gate && /4-day/.test(r.gdays || ''), w + ' gate under the plan ("' + r.gdays + '")');
    await p.locator('.qzb__ov [data-wk-plan]').scrollIntoViewIfNeeded();
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUT}/${TAG}-plan-${w}.png` });
    await p.locator('.qzb__ov [data-wk-gate]').scrollIntoViewIfNeeded();
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/${TAG}-gate-${w}.png` });
    // gate: fill + synthetic submit (no navigation) → tags + Klaviyo payload
    await p.fill('#qzb-register [name="customer[first_name]"]', 'Test');
    await p.fill('#qzb-register [data-wk-mobile]', '0771234567');
    await p.fill('#qzb-register [data-wk-email]', 'qa-r19@example.invalid');
    const tags = await p.evaluate(() => { const f = document.getElementById('qzb-register'); f.dispatchEvent(new Event('submit', { cancelable: true })); return f.querySelector('[data-wk-tags]').value; });
    await p.waitForTimeout(800);
    console.log(w, 'tags:', tags);
    if (TAG === 'muscle') ok(/goal:build-muscle/.test(tags) && /freq:4x/.test(tags) && /plan:muscle-4/.test(tags) && /quiz:home/.test(tags) && /mobile:\+94771234567/.test(tags), w + ' customer[tags] carry the answers + plan + mobile');
    const ev = kl.find((k) => /events/.test(k.url)), sub = kl.find((k) => /subscriptions/.test(k.url));
    const evb = ev && JSON.parse(ev.body);
    if (TAG === 'muscle') ok(!!ev && evb.data.attributes.metric.data.attributes.name === 'Workout Plan Unlocked' && evb.data.attributes.properties.plan_id === 'muscle-4' && evb.data.attributes.properties.plan_days.length === 4, w + ' Klaviyo "Workout Plan Unlocked" event with the plan');
    if (TAG === 'muscle') ok(!!ev && evb.data.attributes.profile.data.attributes.properties.snh_sport === 'cricket', w + ' Klaviyo profile properties (sport cricket)');
    console.log(w, 'list subscription sent:', !!sub, '(only when a list ID is set in theme settings)');
    if (TAG === 'muscle') ok(await p.evaluate(() => { const x = JSON.parse(localStorage.getItem('snh_quiz_pending') || '{}'); return x.plan === 'muscle-4'; }), w + ' answers kept for the sign-in path');
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.querySelector('.qzb__ov').hidden && !document.documentElement.classList.contains('qzb-open')), w + ' Escape closes, scroll unlocked');
    ok(!errs.length, w + ' no page errors ' + errs.join(' | '));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})();
