// Round 10 QA: the SNH Elite member app after the Round 10 rebuild. PW=<playwright> node prototype/tools/r10-qa.js
// 1. Personas (page.elite-mock-<persona>: new, bronze = shipped order + bundle match, silver = near reward, gold,
//    vegan = vegan plan + reward ready) × 390 / 1440 × every view: full-page screenshot into prototype/shots/r10/ and
//    the Round 6 measurements (type scale, column alignment, 40px view rhythm, 4px card spacing, sideways scroll,
//    tab bar), plus clipping: anything poking out of the app column (decorative sheen / cropped pack shots excluded).
// 2. Sheets: sign-out confirm and the re-order preview (bronze) at both widths.
// 3. Forms that write tags: markup only. Each [data-snh-post] form must be a Liquid customer form (action /contact,
//    form_type=customer), carry data-shopify-captcha="true" and a return_to, and be bound by Shopify's captcha
//    bootstrap (data-cptcha) with the hCaptcha provider script on the page. Every POST is aborted and counted (want 0).
// 4. The plan quiz (mock): every question, the level up, the shaker game and the results, at 390 and 1440.
// 5. Logged-out sign in / recover / register (register step 3 = the plan quiz; customer[tags] present), not submitted.
// Writes prototype/shots/r10/qa.md.
const { chromium } = require(process.env.PW || 'playwright');
const fs = require('fs');
const path = require('path');
const DEV = process.env.DEV || 'http://127.0.0.1:9292';
const OUT = path.join(__dirname, '..', 'shots', 'r10');
const HIDE = '.shopify-section--popup,#preview-bar-iframe,privacy-bar,#shopify-pc__banner{display:none!important}';
const STILL = '.metal__stats > div,.metal__track i,.app__view.is-in,.tj__fill,.tj__you,.pro__ring circle,.qz__step,.qz__res .qz__item,.ostat i{animation:none!important}';
const PERSONAS = (process.env.PERSONAS || 'new,bronze,silver,gold,vegan').split(',');
const VIEWS = ['overview', 'rewards', 'orders', 'goals', 'profile'];
const WIDTHS = [390, 1440];
const NOISE = /cdn\.shopify\.com|shop\.app|CORS|ERR_FAILED|status of 40[0-9]|status of 50[0-9]|Failed to fetch|monorail|Content Security Policy|hcaptcha/i;

function measure(scope) {
  const FS = [12, 13, 14, 15, 16, 18, 20, 24, 28, 36, 44, 56, 72, 96];
  const LS = [0, -0.02, 0.12];
  const vis = (el) => { const s = getComputedStyle(el), r = el.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.05 && r.width > 0 && r.height > 0; };
  const root = document.querySelector(scope);
  if (!root) return { type: ['scope ' + scope + ' missing'], align: [], rhythm: [], docW: document.documentElement.scrollWidth, tabbar: [] };
  const desk = innerWidth >= 1024, gut = desk ? 40 : 20, cLeft = Math.max(0, (innerWidth - 1280) / 2) + gut;
  const type = [];
  root.querySelectorAll('*').forEach((el) => {
    if (!vis(el) || el.closest('svg, script, style, .v-sr, .card, dialog:not([open]), canvas')) return;
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0)) return;
    const s = getComputedStyle(el), f = parseFloat(s.fontSize);
    const lh = s.lineHeight === 'normal' ? null : parseFloat(s.lineHeight) / f;
    const ls = s.letterSpacing === 'normal' ? 0 : parseFloat(s.letterSpacing) / f;
    const fam = s.fontFamily.split(',')[0].replace(/["']/g, '').trim();
    const issues = [];
    if (!FS.includes(Math.round(f * 100) / 100)) issues.push('size ' + f);
    const control = el.closest('.v-btn, .pill, .app__badge, .app__count, .acc__count, .avp__b, .quiz__opt, .metal__chip, .tmetal__you, .tmetal__th, .app__av, .reg__steps span, .acct-ini, .tierb, .ostat, .trow__you, .trow__done, .qz__lvl, .tj__tip, .refer__go, .avp__c');
    if (!control && (lh === null || !(Math.abs(lh - 1.1) < .02 || Math.abs(lh - 1.5) < .02))) issues.push('lh ' + (lh === null ? 'normal' : lh.toFixed(2)));
    if (!LS.some((x) => Math.abs(x - ls) < .006)) issues.push('ls ' + ls.toFixed(3) + 'em');
    if (!/^(Inter|Instrument Serif)$/i.test(fam)) issues.push('font ' + fam);
    if (issues.length) type.push((el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : el.tagName.toLowerCase()) + ' "' + el.textContent.trim().replace(/\s+/g, ' ').slice(0, 24) + '": ' + issues.join(', '));
  });
  const align = [], rhythm = [], tabbar = [];
  const inner = root.querySelector('.app__in') || root;
  const l = inner.getBoundingClientRect().left + parseFloat(getComputedStyle(inner).paddingLeft);
  if (Math.abs(l - cLeft) > 1.5) align.push(`app column at ${l.toFixed(1)}, container ${cLeft}`);
  const pane = root.querySelector('.app__view:not([style*="none"])');
  const panes = [...root.querySelectorAll('.app__view')].filter(vis);
  panes.forEach((p) => {
    const kids = [...p.children].filter(vis);
    for (let i = 1; i < kids.length; i++) {
      const gap = Math.round(kids[i].getBoundingClientRect().top - kids[i - 1].getBoundingClientRect().bottom);
      if (Math.abs(gap - 40) > 1) rhythm.push(`${kids[i - 1].className.split(' ')[0]} → ${kids[i].className.split(' ')[0]}: ${gap}px (want 40)`);
    }
    p.querySelectorAll('.app__card, .metal, .rwd, .bal, .ocard, .refer, .qact__a, .app__prompt, .active, .bcard, .elpromo, .calc, .tnext, .trow summary, .pro__id, .qz__tile, .rep__in, .out__in').forEach((c) => {
      if (!vis(c)) return;
      const s = getComputedStyle(c);
      [parseFloat(s.paddingTop), parseFloat(s.paddingLeft), parseFloat(s.rowGap) || 0].forEach((v) => { if (v % 4) rhythm.push(`${c.className.split(' ')[0]} spacing ${v}px not on the 4px grid`); });
    });
    const m = p.querySelector('.metal'), r = p.querySelector('.rwd');
    if (m && r && innerWidth >= 1200) { const a = m.getBoundingClientRect(), b = r.getBoundingClientRect(); if (Math.abs(a.top - b.top) > 1 || Math.abs(a.bottom - b.bottom) > 1) rhythm.push('metal card and reward card edges differ'); }
  });
  return { type: [...new Set(type)], align, rhythm: [...new Set(rhythm)], docW: document.documentElement.scrollWidth, tabbar };
}

function clip() {
  const main = document.querySelector('.app__main');
  if (!main) return ['no app column'];
  const m = main.getBoundingClientRect(), bad = [];
  const pane = document.querySelector('.app__view:not([hidden])[data-pane="' + document.querySelector('[data-app]').getAttribute('data-view') + '"]');
  pane.querySelectorAll('*').forEach((e) => {
    if (!e.offsetParent || e.closest('svg, .metal__sheen, .oimg, .card__media, .card__img, .rwd__stage, .rwd__fx, dialog, .ttk__vids')) return;
    const r = e.getBoundingClientRect();
    if (!r.width || !r.height) return;
    if (r.left < m.left - 1 || r.right > m.right + 1) bad.push(`${String(e.className || e.tagName).split(' ')[0]} ${Math.round(r.left)}..${Math.round(r.right)} (column ${Math.round(m.left)}..${Math.round(m.right)})`);
  });
  return [...new Set(bad)].slice(0, 8);
}

function formCheck() {
  return [...document.querySelectorAll('form[data-snh-post]')].map((f) => {
    const ft = f.querySelector('input[name="form_type"]'), rt = f.querySelector('input[name="return_to"]'), tags = f.querySelector('input[name="contact[tags]"]');
    const issues = [];
    if (!/^\/contact/.test(f.getAttribute('action') || '')) issues.push('action ' + f.getAttribute('action'));
    if (!ft || ft.value !== 'customer') issues.push('form_type');
    if (f.getAttribute('data-shopify-captcha') !== 'true') issues.push('no data-shopify-captcha');
    if (!rt || !/^\/account\?snh_posted=/.test(rt.value)) issues.push('return_to ' + (rt && rt.value));
    if (!tags) issues.push('no contact[tags]');
    if (!f.dataset.cptcha) issues.push('not bound by the captcha bootstrap');
    return { kind: f.getAttribute('data-snh-post'), id: f.id, returnTo: rt && rt.value, bound: !!f.dataset.cptcha, issues };
  });
}

async function settle(p) {
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); });
  await p.waitForTimeout(600);
}

async function open(b, w, url, sel) {
  const p = await b.newPage({ viewport: { width: w, height: w < 1024 ? 844 : 900 }, deviceScaleFactor: 1 });
  p.__errs = []; p.__posts = 0;
  p.on('pageerror', (e) => p.__errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !NOISE.test(m.text())) p.__errs.push(m.text()); });
  await p.route('**/*', (r) => {
    const q = r.request();
    if (q.method() === 'POST' && !/monorail|web-pixels|otlp|\/api\/collect/.test(q.url())) { if (/\/contact|\/account/.test(q.url())) p.__posts++; return r.abort(); }
    return r.continue();
  });
  for (let t = 0; t < 3; t++) {
    await p.goto(DEV + url, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});
    if (await p.waitForSelector(sel, { timeout: 30000 }).then(() => true, () => false)) break;
  }
  await p.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await p.addStyleTag({ content: HIDE + STILL });
  return p;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const rows = [], shots = [], forms = [], quiz = [];
  let posts = 0;

  for (const persona of PERSONAS) {
    for (const w of WIDTHS) {
      const p = await open(b, w, `/pages/about-us?view=elite-mock-${persona}#overview`, '[data-app]');
      await p.waitForTimeout(2500); // captcha bootstrap binds on DOMContentLoaded
      if (w === 1440) forms.push(...(await p.evaluate(formCheck)).map((f) => ({ persona, ...f, provider: false })));
      const provider = await p.evaluate(() => !!document.getElementById('captcha-provider') || !!(window.Shopify && Shopify.ce_forms && Shopify.ce_forms.bindForm));
      forms.forEach((f) => { if (f.persona === persona) f.provider = provider; });
      for (const v of VIEWS) {
        await p.evaluate((v) => { location.hash = v; }, v);
        await p.waitForTimeout(500);
        await settle(p);
        const res = await p.evaluate(measure, '[data-app]');
        res.clip = await p.evaluate(clip);
        if (w < 1024) {
          res.tabbar = await p.evaluate(() => {
            const app = document.querySelector('[data-app]'), pane = app && app.querySelector('[data-pane="' + app.getAttribute('data-view') + '"]'), tabs = document.querySelector('.app__tabs');
            if (!pane || !tabs) return ['view not found'];
            const last = [...pane.children].filter((c) => c.getBoundingClientRect().height > 0).pop();
            scrollTo(0, document.documentElement.scrollHeight);
            const lb2 = last.getBoundingClientRect().bottom, tt = tabs.getBoundingClientRect().top;
            return lb2 > tt + 0.5 ? [`end of view at ${lb2.toFixed(0)} under the tab bar (${tt.toFixed(0)})`] : [];
          });
          await p.evaluate(() => scrollTo(0, 0));
        }
        const name = `${persona}-${v}-${w}.png`;
        await p.addStyleTag({ content: '.app__tabs{position:sticky!important}' });
        await p.screenshot({ path: path.join(OUT, name), fullPage: true });
        await p.addStyleTag({ content: '.app__tabs{position:fixed!important}' });
        shots.push(name);
        rows.push({ state: `${persona} #${v}`, w, ...res, errs: [...new Set(p.__errs)] });
        p.__errs.length = 0;
      }
      // sheets
      if (persona === 'bronze') {
        await p.evaluate(() => { location.hash = 'orders'; });
        await p.waitForTimeout(400);
        await p.click('[data-pane="orders"] .ocard [data-reorder-open]');
        await p.waitForTimeout(900);
        await p.screenshot({ path: path.join(OUT, `sheet-reorder-${w}.png`) }); shots.push(`sheet-reorder-${w}.png`);
        await p.keyboard.press('Escape');
        await p.evaluate(() => { location.hash = 'profile'; });
        await p.waitForTimeout(400);
        await p.click('[data-pane="profile"] [data-signout-open]');
        await p.waitForTimeout(900);
        await p.screenshot({ path: path.join(OUT, `sheet-signout-${w}.png`) }); shots.push(`sheet-signout-${w}.png`);
        await p.keyboard.press('Escape');
      }
      posts += p.__posts;
      await p.close();
    }
  }

  // the plan quiz on its own (mock): every question, level up, game, results
  const picks = { goal: 'build-muscle', goal2: 'hydration-recovery', lvl: 'intermediate', freq: '4x', sess: 'strength', sport: 'padel', diet: 'vegan', budget: '20-35k', exp: 'some', take: 'creatine', challenge: 'sleep', flavour: 'chocolate', age: '25-34' };
  for (const w of WIDTHS) {
    const p = await open(b, w, '/pages/about-us?view=elite-mock-quiz', '[data-quiz]');
    await p.addStyleTag({ content: '.qz__lvlup{animation:none!important}' });
    const card = await p.$('.mock-app__quiz');
    const steps = [];
    for (let n = 0; n < 16; n++) {
      const step = await p.evaluate(() => { const s = [...document.querySelectorAll('.qz__step')].find((x) => !x.hidden); return s ? s.dataset.step : null; });
      if (!step) break;
      const file = `quiz-${String(n + 1).padStart(2, '0')}-${step}-${w}.png`;
      await card.screenshot({ path: path.join(OUT, file) }); shots.push(file);
      const m = await p.evaluate(measure, '.mock-app__quiz');
      steps.push(step);
      quiz.push({ state: `quiz ${step}`, w, type: m.type, levelUp: await p.evaluate(() => !document.querySelector('[data-qz-levelup]').hidden) });
      await p.click(`.qz__step[data-step="${step}"] input[value="${picks[step]}"]`, { force: true });
      await p.waitForTimeout(500);
      if (await p.evaluate((s) => !document.querySelector(`.qz__step[data-step="${s}"]`).hidden, step)) { await p.click('[data-quiz-next]'); await p.waitForTimeout(400); }
    }
    const tags = await p.evaluate(() => document.querySelector('[data-quiz-tags]').value);
    await card.screenshot({ path: path.join(OUT, `quiz-14-game-${w}.png`) }); shots.push(`quiz-14-game-${w}.png`);
    for (let t = 0; t < 14; t++) { await p.click('[data-qz-shake]'); await p.waitForTimeout(50); }
    await card.screenshot({ path: path.join(OUT, `quiz-15-game-shaking-${w}.png`) }); shots.push(`quiz-15-game-shaking-${w}.png`);
    await p.waitForTimeout(6500);
    await card.screenshot({ path: path.join(OUT, `quiz-16-results-${w}.png`) }); shots.push(`quiz-16-results-${w}.png`);
    const r = await p.evaluate(() => ({ items: [...document.querySelectorAll('.qz__item .qz__name')].map((x) => x.textContent), total: (document.querySelector('[data-qz-tot] b') || {}).textContent, canvas: document.querySelector('[data-qz-canvas]').toDataURL().length }));
    const m = await p.evaluate(measure, '.mock-app__quiz');
    quiz.push({ state: 'quiz results', w, type: m.type, steps: steps.join(' → '), tags, ...r, errs: [...new Set(p.__errs)] });
    posts += p.__posts;
    await p.close();
  }

  // logged-out real pages
  const REAL = [['login', '/account/login', '.auth'], ['recover', '/account/login#recover', '.auth'], ['register', '/account/register', '.auth']];
  for (const [name, url, sel] of REAL) {
    for (const w of WIDTHS) {
      const p = await open(b, w, url, sel);
      await p.waitForTimeout(800);
      let extra = '';
      if (name === 'register') {
        await p.fill('[name="customer[first_name]"]', 'QA'); await p.fill('[name="customer[last_name]"]', 'Persona');
        await p.fill('[name="customer[email]"]', 'qa@example.com'); await p.fill('[name="customer[password]"]', 'qa-pass'); await p.fill('[data-pwd2]', 'qa-pass');
        await p.click('[data-reg-step="1"] [data-reg-next]');
        await p.fill('[name="customer[note][Phone]"]', '0771234567'); await p.fill('[name="customer[note][Address]"]', '1 Test Road');
        await p.fill('[name="customer[note][City]"]', 'Colombo'); await p.fill('[name="customer[note][Birthday]"]', '1990-05-12');
        await p.click('[data-reg-step="2"] [data-reg-next]');
        await p.waitForTimeout(300);
        await p.click('.qz__step[data-step="goal"] input[value="endurance"]', { force: true });
        await p.waitForTimeout(600);
        extra = await p.evaluate(() => 'customer[tags] = ' + document.querySelector('[name="customer[tags]"]').value);
      }
      const m = await p.evaluate(measure, sel).catch(() => ({ type: [] }));
      const file = `out-${name}-${w}.png`;
      await p.screenshot({ path: path.join(OUT, file), fullPage: true }); shots.push(file);
      rows.push({ state: 'logged out · ' + name, w, type: m.type, align: [], rhythm: [], clip: [], docW: await p.evaluate(() => document.documentElement.scrollWidth), tabbar: [], errs: [...new Set(p.__errs)], extra });
      posts += p.__posts;
      await p.close();
    }
  }
  await b.close();

  const ok = (a) => (a && a.length ? a.length + ' ⚠' : '✓');
  const md = ['# Round 10 QA: SNH Elite member app', '', `Generated ${new Date().toISOString()} against ${DEV}`, '',
    'Personas from `page.elite-mock-<persona>` (dev only). Every form POST was aborted: **' + posts + ' attempted** (want 0).', '',
    '| state | width | type | align | rhythm | clipped | sideways scroll | tab bar | errors |', '|---|---|---|---|---|---|---|---|---|'];
  for (const r of rows) md.push(`| ${r.state} | ${r.w} | ${ok(r.type)} | ${ok(r.align)} | ${ok(r.rhythm)} | ${ok(r.clip)} | ${r.docW > r.w ? r.docW + 'px ⚠' : '✓'} | ${ok(r.tabbar)} | ${ok(r.errs)} |`);
  md.push('', '## Tag-writing forms (markup only, not submitted)', '', '| persona | form | return_to | data-shopify-captcha + bound | hCaptcha provider on page | issues |', '|---|---|---|---|---|---|');
  for (const f of forms) md.push(`| ${f.persona} | ${f.kind} (${f.id}) | \`${f.returnTo}\` | ${f.bound ? '✓' : '⚠'} | ${f.provider ? '✓' : '⚠'} | ${f.issues.length ? f.issues.join('; ') : '✓'} |`);
  md.push('', '## Plan quiz', '', '| state | width | type | level up shown | notes |', '|---|---|---|---|---|');
  for (const q of quiz) md.push(`| ${q.state} | ${q.w} | ${ok(q.type)} | ${q.levelUp ? 'yes' : ''} | ${q.items ? 'stack: ' + q.items.join(', ') + ' · total ' + q.total + ' · plan card ' + (q.canvas > 5000 ? 'drawn' : '⚠') + ' · errors ' + ok(q.errs) : ''} |`);
  const qr = quiz.filter((q) => q.tags);
  if (qr.length) md.push('', 'Path: ' + qr[0].steps, '', 'Tags the Save button would post: `' + qr[0].tags + '`');
  md.push('', '## Details', '');
  for (const r of [...rows, ...quiz]) { const all = [...(r.type || []), ...(r.align || []), ...(r.rhythm || []), ...(r.clip || []), ...(r.tabbar || []), ...(r.errs || [])]; if (all.length || r.extra) md.push(`### ${r.state} @ ${r.w}`, ...(r.extra ? ['- ' + r.extra] : []), ...all.slice(0, 30).map((x) => '- ' + x), ''); }
  md.push('## Screenshots', '', ...shots.map((s) => '- ' + s));
  fs.writeFileSync(path.join(OUT, 'qa.md'), md.join('\n') + '\n');
  console.log(md.slice(0, 90).join('\n'));
})();
