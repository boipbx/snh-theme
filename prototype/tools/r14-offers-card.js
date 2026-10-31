// Round 14 P0.3 + P0.4 on the target theme.
// P0.3: email popup shows naturally for a fresh guest (desktop timer / phone scroll) and via ?popup=a / ?popup=b (game
// reveal on B, no email submitted); default campaigns render: announcement item, home banner (guest), cart banner in
// the drawer and on /cart, the account slot (member mock page).
// P0.4: the one Elite card (.mcard) in the header panel (mock), account Overview + Rewards + sidebar (mock persona),
// /pages/snh-elite hero and the home band (guest sample); flips by click and by keyboard; silver text contrast.
//   PART=offers|card node prototype/tools/r14-offers-card.js → shots/r14/p0-3, p0-4
const { chromium, context, open, out } = require('./r14-lib.js');
const fs = require('fs'), path = require('path');
const rows = [];
const log = (w, step, ok, note) => { rows.push(`| ${w} | ${step} | ${ok ? 'PASS' : '**FAIL**'} | ${note || ''} |`); console.log(w, ok ? 'PASS' : 'FAIL', step, note || ''); };
const pause = (ms) => new Promise((r) => setTimeout(r, ms || +(process.env.PAUSE || 20000)));
(async () => {
  const b = await chromium.launch(), part = process.env.PART || 'offers';
  const O3 = out('p0-3'), O4 = out('p0-4');
  for (const w of (process.env.W || '390,1440').split(',').map(Number)) {
    if (part === 'offers') {
      // natural popup for a new guest
      let c = await context(b, w, { popups: true }), p = await c.newPage();
      await open(p, '/');
      if (w < 800) { for (let y = 0; y < 8; y++) { await p.mouse.wheel(0, 900); await p.waitForTimeout(700); } }
      const shown = await p.waitForFunction(() => { const d = document.querySelector('dialog.ecm'); return d && d.open; }, null, { timeout: 70000 }).then(() => true, () => false);
      log(w, 'email popup opens by itself for a new guest (timer / scroll rule)', shown, w < 800 ? 'after scrolling 60 %' : 'after the desktop timer');
      await p.screenshot({ path: path.join(O3, `popup-natural-${w}.png`) });
      await c.close(); await pause();
      // forced variants
      for (const v of ['a', 'b']) {
        c = await context(b, w, { popups: true }); p = await c.newPage();
        await p.route(/\/contact|klaviyo\.com\/client\/subscriptions/, (r) => r.request().method() === 'POST' ? r.abort() : r.continue());
        await open(p, '/?popup=' + v);
        const ok = await p.waitForFunction((v) => { const d = document.querySelector('dialog.ecm'); return d && d.open && d.dataset.variant === v; }, v, { timeout: 20000 }).then(() => true, () => false);
        let note = '';
        if (ok && v === 'b') { const spin = p.locator('dialog.ecm[open] [data-spin], dialog.ecm[open] button:has-text("Spin")').first(); if (await spin.count()) { await spin.click(); await p.waitForTimeout(6500); note = 'after spin: ' + (await p.locator('dialog.ecm[open] [data-ecm-h]').textContent().catch(() => '')).trim(); } }
        log(w, `?popup=${v} opens variant ${v.toUpperCase()}`, ok, note);
        await p.screenshot({ path: path.join(O3, `popup-${v}-${w}.png`) });
        await c.close(); await pause();
      }
      // campaigns: announcement + home banner (guest) + drawer banner, then /cart, then the account slot (mock)
      c = await context(b, w); p = await c.newPage();
      await open(p, '/'); await p.waitForTimeout(2000);
      const live = await p.evaluate(() => (document.documentElement.getAttribute('data-campaigns-live') || ''));
      const ann = await p.evaluate(() => [...document.querySelectorAll('.announce__item[data-campaign]')].map((a) => a.textContent.trim()).join(' | '));
      const home = await p.evaluate(() => !!document.querySelector('[data-campaign-slot="home"] .cmp-ban'));
      log(w, 'default campaigns live (announcement item + guest home banner)', /announcement:live/.test(live) && ann && home, `${ann.slice(0, 80)} · home banner ${home}`);
      await p.evaluate(() => { const s = document.querySelector('[data-campaign-slot="home"]'); if (s) s.scrollIntoView({ block: 'center' }); });
      await p.waitForTimeout(800); await p.screenshot({ path: path.join(O3, `campaign-home-${w}.png`) });
      await p.evaluate(() => SNHCart.open()); await p.waitForTimeout(2500);
      const db = await p.evaluate(() => { const s = document.querySelector('#cart-drawer [data-campaign-slot="cart"]'); return s && !s.hidden && s.textContent.trim().slice(0, 60); });
      log(w, 'cart banner in the drawer', !!db, db || '');
      await p.screenshot({ path: path.join(O3, `campaign-drawer-${w}.png`) });
      await open(p, '/cart'); await p.waitForTimeout(2500);
      const cb = await p.evaluate(() => { const s = document.querySelector('main [data-campaign-slot="cart"], [data-mode="page"] [data-campaign-slot="cart"]'); return s && !s.hidden && s.textContent.trim().slice(0, 60); });
      log(w, 'cart banner on /cart', !!cb, cb || '');
      await p.screenshot({ path: path.join(O3, `campaign-cart-${w}.png`) });
      await pause();
      await open(p, '/pages/about-us?view=elite-mock-silver'); await p.waitForTimeout(2500);
      const ab = await p.evaluate(() => { const s = document.querySelector('[data-campaign-slot="account"]'); return s ? (!s.hidden && s.textContent.trim().slice(0, 60)) : 'no slot'; });
      log(w, 'campaign banner on the account page (member mock: logged-in suppression does not hide it)', !!ab && ab !== 'no slot', ab || '');
      await p.screenshot({ path: path.join(O3, `campaign-account-${w}.png`) });
      await c.close(); await pause();
    } else {
      const c = await context(b, w), p = await c.newPage();
      const check = async (pth, sel, name, prep) => {
        await open(p, pth); await p.waitForTimeout(2000);
        if (prep) await prep();
        const card = p.locator(sel).first();
        const n = await card.count();
        if (!n) { log(w, `${name}: one Elite card`, false, 'not found: ' + sel); return; }
        await card.scrollIntoViewIfNeeded(); await p.waitForTimeout(600);
        const info = await card.evaluate((el) => ({ tier: el.dataset.tier, size: [...el.classList].find((c) => /mcard--(full|compact)/.test(c)), text: el.querySelector('.mcard__front').innerText.replace(/\s+/g, ' ').slice(0, 80) }));
        await card.screenshot({ path: path.join(O4, `${name.replace(/\W+/g, '-')}-front-${w}.png`) });
        await card.locator('.mcard__in').click({ position: { x: 30, y: 60 } });
        await p.waitForTimeout(900);
        const flipped = await card.evaluate((el) => el.classList.contains('is-flipped') && el.querySelector('.mcard__back').getAttribute('aria-hidden') === 'false');
        await card.screenshot({ path: path.join(O4, `${name.replace(/\W+/g, '-')}-back-${w}.png`) });
        await card.locator('.mcard__flip').focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(800);
        const unflipped = await card.evaluate((el) => !el.classList.contains('is-flipped'));
        log(w, `${name}: one Elite card, flips by click and keyboard`, flipped && unflipped, `${info.tier} ${info.size} · "${info.text}"`);
      };
      await check('/?view=elite-mock', '.acp .mcard', 'header panel (member mock)');
      await pause(8000);
      await check('/pages/about-us?view=elite-mock-silver', '.app__hero .mcard', 'account Overview (silver mock)');
      await check('/pages/about-us?view=elite-mock-silver', '.app__mini .mcard', 'account sidebar mini-card', async () => { await p.evaluate(() => { const s = document.querySelector('.app__side'); if (s) s.scrollIntoView(); }); });
      await pause(8000);
      await check('/pages/about-us?view=elite-mock-silver#rewards', '.app__ecard .mcard', 'Rewards', async () => { await p.evaluate(() => { const a = document.querySelector('[data-go="rewards"]'); if (a) a.click(); }); await p.waitForTimeout(800); });
      await check('/pages/snh-elite', '.ep__card .mcard', 'Elite page hero');
      await pause(8000);
      await check('/', '.eband__card .mcard', 'home Elite band (guest sample)');
      // silver contrast (text colour vs the darkest/lightest metal stop)
      const cr = await p.evaluate(() => { const L = (h) => { const c = h.match(/\w\w/g).map((x) => parseInt(x, 16) / 255).map((x) => x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; }; const r = (a, b) => ((Math.max(L(a), L(b)) + .05) / (Math.min(L(a), L(b)) + .05)).toFixed(2); return { silverLight: r('FFFFFF', '646F7F'), silverDark: r('FFFFFF', '3A4350'), bronze: r('FFFFFF', '9A5A2B'), gold: r('1A1206', 'F2CF72') }; });
      log(w, 'tier text contrast ≥ 4.5:1 (lightest metal stop)', Object.values(cr).every((x) => +x >= 4.5), JSON.stringify(cr));
      await c.close();
    }
  }
  const OUTD = part === 'offers' ? O3 : O4;
  fs.writeFileSync(path.join(OUTD, part + '.md'), [`# ${part === 'offers' ? 'P0.3 offers + popups' : 'P0.4 one Elite card'}`, '', '| width | check | result | note |', '|---|---|---|---|', ...rows].join('\n') + '\n');
  await b.close();
})();
