// Round 8 QA: the SNH Elite member app with mock personas (page.elite-mock-<persona> via ?view=…) + the real
// logged-out sign-in / recover / register pages and the quiz on its own. PW=<playwright> node prototype/tools/r8-qa.js
// Per persona × width (390, 1440) × view: a full-page screenshot into prototype/shots/r8/, plus
//   type   — text off the Round 6 scale (size, line-height 1.1/1.5, tracking 0/-0.02/0.12em, Inter/Instrument Serif)
//   align  — app column vs the container (1280 max, 40 / 20px gutters)
//   rhythm — gaps between a view's blocks (want 40) and card padding/gaps on the 4px grid
//   scroll — horizontal overflow · tabbar — the bottom tab bar never covers the end of a view (phones)
//   errors — page errors and console errors from theme code (Shopify's own CDN/CORS noise on 127.0.0.1 is ignored)
// Real pages: nothing is submitted (every POST is aborted); the register check fills fake values and stops at step 3.
// Writes prototype/shots/r8/qa.md.
const { chromium } = require(process.env.PW || 'playwright');
const fs = require('fs');
const path = require('path');
const DEV = process.env.DEV || 'http://127.0.0.1:9292';
const OUT = path.join(__dirname, '..', 'shots', 'r8');
const HIDE = '.shopify-section--popup,#preview-bar-iframe,privacy-bar,#shopify-pc__banner{display:none!important}';
const PERSONAS = ['new', 'bronze', 'silver', 'gold'];
const VIEWS = ['overview', 'rewards', 'orders', 'goals', 'profile'];
const WIDTHS = [390, 1440];
const NOISE = /cdn\.shopify\.com|shop\.app|CORS|ERR_FAILED|status of 40[0-9]|status of 50[0-9]|Failed to fetch|monorail|Content Security Policy/i;

function measure(scope) {
  const FS = [12, 13, 14, 15, 16, 18, 20, 24, 28, 36, 44, 56, 72, 96];
  const LS = [0, -0.02, 0.12];
  const vis = (el) => { const s = getComputedStyle(el), r = el.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.05 && r.width > 0 && r.height > 0; };
  const root = document.querySelector(scope);
  if (!root) return { type: ['scope ' + scope + ' missing'], align: [], rhythm: [], docW: document.documentElement.scrollWidth, tabbar: [] };
  const desk = innerWidth >= 1024, gut = desk ? 40 : 20, cLeft = Math.max(0, (innerWidth - 1280) / 2) + gut;
  const type = [];
  root.querySelectorAll('*').forEach((el) => {
    if (!vis(el) || el.closest('svg, script, style, .v-sr, .card, dialog:not([open])')) return;
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0)) return;
    const s = getComputedStyle(el), f = parseFloat(s.fontSize);
    const lh = s.lineHeight === 'normal' ? null : parseFloat(s.lineHeight) / f;
    const ls = s.letterSpacing === 'normal' ? 0 : parseFloat(s.letterSpacing) / f;
    const fam = s.fontFamily.split(',')[0].replace(/["']/g, '').trim();
    const issues = [];
    if (!FS.includes(Math.round(f * 100) / 100)) issues.push('size ' + f);
    const control = el.closest('.v-btn, .pill, .app__badge, .app__count, .acc__count, .avp__b, .quiz__opt, .metal__chip, .tmetal__you, .tmetal__th, .app__av, .reg__steps span, .acct-ini, .tierb');
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
    p.querySelectorAll('.app__card, .metal, .rwd, .tmetal, .bal, .ocard, .refer, .qact__a, .app__prompt').forEach((c) => {
      if (!vis(c)) return;
      const s = getComputedStyle(c);
      [parseFloat(s.paddingTop), parseFloat(s.paddingLeft), parseFloat(s.rowGap) || 0].forEach((v) => { if (v % 4) rhythm.push(`${c.className.split(' ')[0]} spacing ${v}px not on the 4px grid`); });
    });
    const m = p.querySelector('.metal'), r = p.querySelector('.rwd');
    if (m && r && innerWidth >= 1200) { const a = m.getBoundingClientRect(), b = r.getBoundingClientRect(); if (Math.abs(a.top - b.top) > 1 || Math.abs(a.bottom - b.bottom) > 1) rhythm.push('metal card and reward card edges differ'); }
  });
  return { type: [...new Set(type)], align, rhythm: [...new Set(rhythm)], docW: document.documentElement.scrollWidth, tabbar };
}

async function settle(p) {
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); });
  await p.waitForTimeout(600);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const rows = [], shots = [];
  for (const persona of PERSONAS) {
    for (const w of WIDTHS) {
      const p = await b.newPage({ viewport: { width: w, height: w < 1024 ? 844 : 900 }, deviceScaleFactor: 1 });
      const errs = [];
      p.on('pageerror', (e) => errs.push(e.message));
      p.on('console', (m) => { if (m.type() === 'error' && !NOISE.test(m.text())) errs.push(m.text()); });
      await p.route('**/*', (r) => (r.request().method() === 'POST' && !/\/cart\/|monorail|web-pixels|\.json/.test(r.request().url()) ? r.abort() : r.continue()));
      for (let t = 0; t < 3; t++) {
        await p.goto(`${DEV}/pages/about-us?view=elite-mock-${persona}#overview`, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});
        if (await p.waitForSelector('[data-app]', { timeout: 30000 }).then(() => true, () => false)) break;
      }
      await p.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
      await p.addStyleTag({ content: HIDE + '.metal__stats > div,.metal__track i,.app__view.is-in{animation:none!important}' });
      for (const v of VIEWS) {
        await p.evaluate((v) => { location.hash = v; }, v);
        await p.waitForTimeout(500);
        await settle(p);
        const res = await p.evaluate(measure, '[data-app]');
        // tab bar: scroll to the end of the view and check its last block clears the bar
        if (w < 1024) {
          res.tabbar = await p.evaluate(() => {
            const app = document.querySelector('[data-app]'), pane = app && app.querySelector('[data-pane="' + app.getAttribute('data-view') + '"]'), tabs = document.querySelector('.app__tabs');
            if (!pane || !tabs) return ['view not found'];
            const last = [...pane.children].filter((c) => c.getBoundingClientRect().height > 0).pop();
            scrollTo(0, last.getBoundingClientRect().bottom + scrollY - innerHeight + 24);
            const lb = last.getBoundingClientRect().bottom, tt = tabs.getBoundingClientRect().top;
            const max = document.documentElement.scrollHeight - innerHeight;
            scrollTo(0, max);
            const lb2 = last.getBoundingClientRect().bottom;
            return lb2 > tt + 0.5 ? [`end of view at ${lb2.toFixed(0)} under the tab bar (${tt.toFixed(0)})`] : [];
          });
          await p.evaluate(() => scrollTo(0, 0));
        }
        const name = `${persona}-${v}-${w}.png`;
        await p.addStyleTag({ content: '.app__tabs{position:sticky!important}' });
        await p.screenshot({ path: path.join(OUT, name), fullPage: true });
        await p.addStyleTag({ content: '.app__tabs{position:fixed!important}' });
        shots.push(name);
        rows.push({ state: `${persona} #${v}`, w, ...res, errs: [...new Set(errs)] });
        errs.length = 0;
      }
      await p.close();
    }
  }

  // logged-out real pages + the quiz on its own
  const REAL = [['login', '/account/login'], ['recover', '/account/login#recover'], ['register', '/account/register'], ['quiz', '/pages/about-us?view=elite-mock-quiz']];
  const forms = [];
  for (const [name, url] of REAL) {
    for (const w of WIDTHS) {
      const p = await b.newPage({ viewport: { width: w, height: w < 1024 ? 844 : 900 } });
      const errs = [];
      p.on('pageerror', (e) => errs.push(e.message));
      await p.route('**/*', (r) => (r.request().method() === 'POST' && !/monorail|web-pixels/.test(r.request().url()) ? r.abort() : r.continue()));
      await p.goto(DEV + url, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});
      await p.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
      await p.addStyleTag({ content: HIDE });
      await p.waitForTimeout(800);
      if (name === 'register') {
        await p.fill('[name="customer[first_name]"]', 'QA'); await p.fill('[name="customer[last_name]"]', 'Persona');
        await p.fill('[name="customer[email]"]', 'qa@example.com'); await p.fill('[name="customer[password]"]', 'qa-pass'); await p.fill('[data-pwd2]', 'qa-pass');
        await p.click('[data-reg-step="1"] [data-reg-next]');
        await p.fill('[data-sl-mobile]', '0771234567'); await p.fill('[name="customer[note][Address]"]', '1 Test Road');
        await p.fill('[name="customer[note][City]"]', 'Colombo'); await p.fill('[name="customer[note][Birthday]"]', '1990-05-12');
        await p.click('[data-reg-step="2"] [data-reg-next]');
        await p.waitForTimeout(300);
      }
      const scope = name === 'quiz' ? '.mock-app' : '.auth';
      const res = await p.evaluate((s) => {
        const r = document.querySelector(s);
        return { docW: document.documentElement.scrollWidth, ok: !!r };
      }, scope);
      const m = await p.evaluate(measure, scope).catch(() => ({ type: [], align: [], rhythm: [] }));
      if (w === 1440) forms.push(...(await p.evaluate((n) => [...document.querySelectorAll('.auth form, .mock-app form')].map((f) => `${n}: <form action="${f.getAttribute('action')}"> ${[...f.querySelectorAll('input[type=hidden]')].map((i) => i.name + '=' + i.value).filter((x) => !/utf8/.test(x)).join(' ')}`), name)));
      const file = `out-${name}-${w}.png`;
      await p.screenshot({ path: path.join(OUT, file), fullPage: true });
      shots.push(file);
      rows.push({ state: 'logged out · ' + name, w, type: m.type, align: [], rhythm: [], docW: res.docW, tabbar: [], errs: errs });
      await p.close();
    }
  }
  await b.close();

  const md = ['# Round 8 QA: SNH Elite member app', '', `Generated ${new Date().toISOString()} against ${DEV}`, '',
    'Personas from `page.elite-mock-<persona>` (dev only). Logged-out pages are the real storefront; every form POST was aborted.', '',
    '| state | width | type | align | rhythm | sideways scroll | tab bar | errors |', '|---|---|---|---|---|---|---|---|'];
  for (const r of rows) md.push(`| ${r.state} | ${r.w} | ${r.type.length ? r.type.length + ' ⚠' : '✓'} | ${r.align.length ? r.align.length + ' ⚠' : '✓'} | ${r.rhythm.length ? r.rhythm.length + ' ⚠' : '✓'} | ${r.docW > r.w ? r.docW + 'px ⚠' : '✓'} | ${r.tabbar.length ? '⚠' : '✓'} | ${r.errs.length ? r.errs.length + ' ⚠' : '✓'} |`);
  md.push('', '## Details', '');
  for (const r of rows) { const all = [...r.type, ...r.align, ...r.rhythm, ...r.tabbar, ...r.errs]; if (all.length) md.push(`### ${r.state} @ ${r.w}`, ...all.slice(0, 30).map((x) => '- ' + x), ''); }
  md.push('## Logged-out form endpoints (not submitted)', '', ...forms.map((f) => '- `' + f + '`'), '', '## Screenshots', '', ...shots.map((s) => '- ' + s));
  fs.writeFileSync(path.join(OUT, 'qa.md'), md.join('\n') + '\n');
  console.log(md.slice(0, 60).join('\n'));
})();
