// Round 12 popup QA: both variants via ?popup=a / ?popup=b at 390 and 1440, keyboard only, reduced motion, the test
// override on the cart page and with "subscribed" set, and both email paths. Every POST is MOCKED (Shopify /contact
// and Klaviyo's client API are answered here; nothing is submitted). PW=<playwright> node prototype/tools/r12-popup-qa.js
const { chromium } = require(process.env.PW || 'playwright');
const fs = require('fs'); const path = require('path');
const DEV = process.env.DEV || 'http://127.0.0.1:9292';
const OUT = path.join(__dirname, '..', 'shots', 'r12', 'p7'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch(); const rows = [];
  async function run(name, url, w, opts) {
    opts = opts || {};
    const ctx = await b.newContext({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 800, hasTouch: w < 800, reducedMotion: opts.reduce ? 'reduce' : 'no-preference' });
    const p = await ctx.newPage(); const posts = []; const errs = []; const events = [];
    p.on('pageerror', (e) => errs.push(e.message));
    await p.route(/\/contact(\?|$|#)/, (r) => { if (r.request().method() === 'POST') { const pd = r.request().postData() || ''; posts.push('shopify /contact, tags: ' + ((pd.match(/name="contact\[tags\]"\r?\n\r?\n([^\r\n]*)/) || [])[1] || '?') + ', email: ' + ((pd.match(/name="contact\[email\]"\r?\n\r?\n([^\r\n]*)/) || [])[1] || '?')); return r.fulfill({ status: 302, headers: { location: DEV + '/?customer_posted=true#' + (globalThis.__fid || '') } }); } return r.continue(); });
    await p.route(/a\.klaviyo\.com\/client\/subscriptions/, (r) => { posts.push('klaviyo: ' + (r.request().postData() || '').slice(0, 260)); return r.fulfill({ status: 202, body: '' }); });
    if (opts.sub) await p.addInitScript(() => { try { localStorage.setItem('snh_sub', String(Date.now())); localStorage.setItem('snh_ecm_t', String(Date.now())); } catch (e) {} });
    await p.addInitScript(() => { window.__ev = []; const k = window.klaviyo = []; const push = k.push.bind(k); k.push = (x) => { window.__ev.push(JSON.stringify(x).slice(0, 140)); return push(x); }; });
    if (opts.varA) { await p.goto(DEV + '/', { waitUntil: 'load' }); const fid = await p.evaluate(() => { localStorage.setItem('snh_pop_var', 'a'); return document.querySelector('dialog.ecm form').id; }); url = url.replace('FID', fid); }
    await p.goto(DEV + url, { waitUntil: 'load', timeout: 90000 });
    if (opts.list !== false) await p.evaluate(() => document.querySelector('[data-email-capture]').setAttribute('data-kl-list', 'LISTMOCK'));
    globalThis.__fid = await p.evaluate(() => { const f = document.querySelector('dialog.ecm form'); return f ? f.id : ''; });
    await p.waitForTimeout(1500);
    const st = async () => p.evaluate(() => { const m = document.querySelector('dialog.ecm'); const vis = (s) => { const e = m && m.querySelector(s); return !!(e && !e.hidden); }; return { open: !!(m && m.open), variant: m && m.dataset.variant, h: m && m.querySelector('[data-ecm-h]').textContent.trim(), email: vis('[data-step="email"]'), game: vis('[data-step="game"]'), win: vis('[data-step="win"]'), code: m && m.querySelector('[data-win-code]') ? m.querySelector('[data-win-code]').textContent : '', apply: m && m.querySelector('[data-apply]') ? m.querySelector('[data-apply]').getAttribute('href') : '', focus: document.activeElement && (document.activeElement.getAttribute('data-spin') !== null ? 'spin button' : document.activeElement.type || document.activeElement.tagName) }; });
    const s0 = await st();
    await p.screenshot({ path: path.join(OUT, `${name}-${w}-1.png`) });
    const flow = [`opened ${s0.open} · variant ${s0.variant} · "${s0.h}" · step ${s0.email ? 'email' : s0.game ? 'game' : '?'} · focus ${s0.focus}`];
    if (s0.open && !opts.only) {
      const t0 = Date.now();
      const kb = async (keys) => { for (const k of keys) await p.keyboard.press(k); };
      if (s0.variant === 'a') { await p.keyboard.type('qa+' + name + '@example.com'); await kb(['Enter']); await p.waitForTimeout(opts.list === false ? 6000 : 1200); if (opts.list === false) flow.push('came back: ' + p.url().replace(DEV, '')); const s1 = await st(); flow.push(`email → ${s1.game ? 'game' : '?'} · "${s1.h}" · focus ${s1.focus}`); await p.screenshot({ path: path.join(OUT, `${name}-${w}-2.png`) }); await kb(['Enter']); }
      else { await kb(['Enter']); }
      await p.waitForFunction(() => { const m = document.querySelector('dialog.ecm'); return !m.querySelector('[data-step="win"]').hidden || (m.dataset.variant === 'b' && !m.querySelector('[data-step="email"]').hidden && /won/i.test(m.querySelector('[data-ecm-h]').textContent)); }, null, { timeout: 8000 }).catch(() => {});
      const spinMs = Date.now() - t0;
      if (s0.variant === 'b') { const s1 = await st(); flow.push(`spin → claim "${s1.h}" (${spinMs} ms) · focus ${s1.focus}`); await p.screenshot({ path: path.join(OUT, `${name}-${w}-2.png`) }); await p.keyboard.type('qa+' + name + '@example.com'); await kb(['Enter']); await p.waitForTimeout(1200); }
      const s2 = await st(); flow.push(`win "${s2.h}" · code ${s2.code} · apply ${s2.apply}` + (s0.variant === 'a' ? ` (spin ${spinMs} ms)` : ''));
      await p.screenshot({ path: path.join(OUT, `${name}-${w}-3.png`) });
      // Phase 10: the Copy button (clipboard + "Copied" label); the Apply link is only read, never followed
      await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(p.url()).origin }).catch(() => {});
      const cp = await p.evaluate(async () => { const m = document.querySelector('dialog.ecm'); const b = m && m.querySelector('[data-copy]'); if (!b) return 'no copy button'; b.click(); await new Promise((r) => setTimeout(r, 300)); let clip = '?'; try { clip = await navigator.clipboard.readText(); } catch (e) { clip = 'unreadable'; } return 'label "' + b.textContent.trim() + '" · clipboard ' + clip; });
      flow.push('copy → ' + cp);
    }
    const ev = await p.evaluate(() => window.__ev.filter((x) => /Welcome wheel|identify/.test(x)));
    rows.push({ name, url, w, flow, posts, ev, errs }); await ctx.close();
  }
  for (const w of [390, 1440]) { await run('A', '/?popup=a', w); await run('B', '/?popup=b', w); }
  await run('A-reduced-motion', '/?popup=a', 390, { reduce: true });
  await run('B-reduced-motion', '/?popup=b', 390, { reduce: true });
  await run('A-shopify-return', '/?popup=a&customer_posted=true#FID', 1440, { only: true, varA: true });
  await run('test-on-cart', '/cart?popup=test', 390, { only: true });
  await run('test-while-subscribed', '/?popup=test', 1440, { sub: true, only: true });
  await run('no-override-subscribed', '/', 1440, { sub: true, only: true });
  await b.close();
  const md = ['# Welcome wheel QA (all POSTs mocked: Klaviyo answers 202; Shopify /contact answers a 302 back to ?customer_posted=true like the real form)', ''];
  rows.forEach((r) => { md.push(`## ${r.name} · ${r.url} · ${r.w}`, '', ...r.flow.map((f) => '- ' + f), ...r.posts.map((x) => '- POST ' + x), ...r.ev.map((x) => '- event ' + x), `- errors: ${r.errs.length ? r.errs.join('; ') : 'none'}`, ''); });
  fs.writeFileSync(path.join(OUT, 'popup.md'), md.join('\n') + '\n'); console.log(md.join('\n'));
})();
