// Round 14 P1: filters in depth on the target theme vs the old site (same query → same product count).
// 10 combinations on 3 collections (URL-driven, then the UI must reflect them: checked inputs, chips, count), plus
// interactive checks at 390 + 1440: click a brand (multi-select), sort keeps filters, back/forward restores, clear all,
// no-results message, page 2 keeps filters, the sticky bar stays under the header while scrolling.
//   node prototype/tools/r14-filters.js → shots/r14/p1/filters.md + screenshots
const { chromium, context, open, out, url } = require('./r14-lib.js');
const fs = require('fs'), path = require('path');
const OUT = out('p1'), rows = [], OLD = 'https://www.sportsnutritionhub.lk';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const log = (w, step, ok, note) => { rows.push(`| ${w} | ${step} | ${ok ? 'PASS' : '**FAIL**'} | ${note || ''} |`); console.log(w, ok ? 'PASS' : 'FAIL', step, note || ''); };
const cnt = (html) => (html.match(/<product-card\b/g) || []).length;
(async () => {
  const b = await chromium.launch(), rq = await b.newContext({ userAgent: UA });
  const oldCount = async (q) => { for (let i = 0; i < 4; i++) { const r = await rq.request.get(OLD + q).catch(() => null); const t = r ? await r.text() : ''; if (/<html/i.test(t) && !/challenge-platform\/h\/[bg]\/orchestrate\/chl_page/.test(t.slice(0, 5000))) return (t.match(/class="[^"]*\bsnh-pc\b/g) || t.match(/<product-card\b/g) || []).length; await new Promise((z) => setTimeout(z, 8000)); } return -1; };
  // 10 combinations (the values exist on the old site's bar)
  const COMBOS = [
    '/collections/whey-protein?filter.p.vendor=Applied+Nutrition',
    '/collections/whey-protein?filter.p.vendor=Applied+Nutrition&filter.p.vendor=MYPROTEIN',
    '/collections/whey-protein?filter.v.availability=1',
    '/collections/whey-protein?filter.v.price.gte=10000&filter.v.price.lte=20000',
    '/collections/whey-protein?filter.p.vendor=Applied+Nutrition&filter.v.availability=1&sort_by=price-ascending',
    '/collections/creatine?filter.p.vendor=RAW',
    '/collections/creatine?filter.v.price.lte=9000',
    '/collections/creatine?filter.p.vendor=Applied+Nutrition&filter.v.availability=1',
    '/collections/applied-nutrition?filter.v.availability=1',
    '/collections/applied-nutrition?filter.v.price.gte=5000&filter.v.price.lte=15000&sort_by=title-ascending',
  ];
  const ctx = await context(b, 1440), p = await ctx.newPage();
  for (const q of (process.env.ONLYUI ? [] : COMBOS)) {
    await open(p, q); await p.waitForTimeout(1200);
    const n = await p.evaluate(() => document.querySelectorAll('product-card').length);
    const ui = await p.evaluate(() => { const qs = new URLSearchParams(location.search); const want = [...qs.entries()].filter(([k]) => /^filter\.(p|v\.availability)/.test(k)); const checked = want.filter(([k, v]) => [...document.querySelectorAll(`input[name="${k}"]`)].some((i) => i.value === v && i.checked)).length; const chips = document.querySelectorAll('.snh-chip, [data-snh-chip], .snh-active__chip, [class*="chip"][href*="filter"]').length; return { want: want.length, checked, chips, sort: (document.querySelector('select[name="sort_by"]') || {}).value || '', qsort: qs.get('sort_by') || '' }; });
    const o = await oldCount(q);
    const ok = n === o && ui.checked === ui.want && (!ui.qsort || ui.sort === ui.qsort);
    log(1440, 'combo ' + q.replace('/collections/', ''), ok, `new ${n} / old ${o} products · inputs ${ui.checked}/${ui.want} checked · chips ${ui.chips}${ui.qsort ? ' · sort ' + ui.sort : ''}`);
  }
  await ctx.close();

  for (const w of [390, 1440]) {
    const c = await context(b, w), pg = await c.newPage();
    await open(pg, '/collections/whey-protein'); await pg.waitForTimeout(1500);
    const n0 = await pg.evaluate(() => document.querySelectorAll('product-card').length);
    // open the controls on phones
    // brands are the logo rail above the bar on every width (outside the phone sheet)
    // two copies of the facets exist (bar + phone sheet): use the visible labels
    const vend = pg.locator('label.snh-brand:visible:has(input[name="filter.p.vendor"]:not(:checked))');
    const v1 = await vend.nth(0).locator('input').getAttribute('value');
    await vend.nth(0).click(); await pg.waitForTimeout(2500); await pg.waitForLoadState('load').catch(() => {});
    // phones: the page scrolls to the grid and the condensed bar hides the rail → the second brand comes from the sheet
    if (w < 1000) { await pg.locator('.snh-mtrig__btn').click(); await pg.waitForTimeout(800); }
    let tog = 0;
    if (w >= 1000) { const t = pg.locator('.snh-brandtog:visible'); tog = await t.count(); if (tog) { await t.click(); await pg.waitForTimeout(600); await pg.screenshot({ path: path.join(OUT, `filters-brand-toggle-${w}.png`) }); } log(w, 'second brand reachable after the first pick (rail in view, or Brand toggle in the condensed bar)', await vend.count() > 0, tog ? 'via the Brand toggle' : 'rail still in view (bar not condensed)'); }
    const inSheet = await pg.locator('[data-snh-sheet].is-open .snh-brands.is-in-sheet').count();
    if (w < 1000) await pg.screenshot({ path: path.join(OUT, `filters-sheet-brands-${w}.png`) });
    const v2 = await vend.nth(0).locator('input').getAttribute('value');
    await vend.nth(0).click(); await pg.waitForTimeout(2500); await pg.waitForLoadState('load').catch(() => {});
    if (w < 1000) { const go = pg.locator('.snh-sheet__go:visible'); if (await go.count()) { await go.click(); await pg.waitForTimeout(800); } }
    if (w < 1000) log(w, 'phone sheet shows the brand rail after the first pick', inSheet > 0);
    await pg.waitForLoadState('load').catch(() => {});
    const u1 = new URL(pg.url()); const vs = u1.searchParams.getAll('filter.p.vendor');
    const n1 = await pg.evaluate(() => document.querySelectorAll('product-card').length);
    log(w, 'multi-select two brands (UI) → URL keeps both, grid narrows', vs.includes(v1) && vs.includes(v2) && n1 > 0 && n1 <= n0, `${v1} + ${v2} → ${n1} of ${n0}`);
    await pg.screenshot({ path: path.join(OUT, `filters-two-brands-${w}.png`) });
    // sort keeps filters
    await pg.evaluate(() => { const s = document.querySelector('select[name="sort_by"]'); if (s) { s.value = 'price-ascending'; s.dispatchEvent(new Event('change', { bubbles: true })); } });
    await pg.waitForTimeout(3000); await pg.waitForLoadState('load').catch(() => {});
    const u2 = new URL(pg.url());
    log(w, 'sort keeps the filters', u2.searchParams.getAll('filter.p.vendor').length === 2 && u2.searchParams.get('sort_by') === 'price-ascending', u2.search.slice(0, 120));
    // back / forward
    await pg.goBack().catch(() => {}); await pg.waitForTimeout(2500);
    const back = await pg.evaluate(() => ({ s: location.search, checked: [...new Set([...document.querySelectorAll('input[name="filter.p.vendor"]:checked')].map((i) => i.value))] }));   // each brand input exists twice in the markup
    log(w, 'back restores the previous state (URL + checked brands)', !/sort_by=price-ascending/.test(back.s) && back.checked.length === new URLSearchParams(back.s).getAll('filter.p.vendor').length, `${back.s.slice(0, 90)} · checked ${back.checked.length}`);
    await pg.goForward().catch(() => {}); await pg.waitForTimeout(2500);
    log(w, 'forward restores the sorted state', /sort_by=price-ascending/.test(pg.url()));
    // chips + clear all
    const chipTxt = await pg.evaluate(() => [...document.querySelectorAll('a[href*="/collections/whey-protein"]')].filter((a) => /clear|remove|×/i.test(a.textContent + (a.getAttribute('aria-label') || '')) && a.offsetParent).map((a) => a.textContent.trim().slice(0, 30)));
    const clear = pg.locator('a:visible, button:visible').filter({ hasText: /clear all|clear filters|reset/i }).first();
    const hasClear = await clear.count();
    if (hasClear) { await clear.click(); await pg.waitForTimeout(3000); await pg.waitForLoadState('load').catch(() => {}); }
    log(w, 'active chips + clear all removes every filter', hasClear && !/filter\./.test(pg.url()), `chips: ${JSON.stringify(chipTxt).slice(0, 120)} · after: ${new URL(pg.url()).search.slice(0, 60) || '(none)'}`);
    // no results
    await open(pg, '/collections/whey-protein?filter.v.price.lte=1'); await pg.waitForTimeout(1500);
    const nr = await pg.evaluate(() => ({ n: document.querySelectorAll('product-card').length, msg: (document.body.innerText.match(/no products|no results|nothing matches|try|clear/i) || [''])[0] }));
    log(w, 'no-results state is helpful', nr.n === 0 && !!nr.msg, `message match: "${nr.msg}"`);
    await pg.screenshot({ path: path.join(OUT, `filters-no-results-${w}.png`) });
    // pagination keeps filters
    await open(pg, '/collections/applied-nutrition?filter.v.availability=1'); await pg.waitForTimeout(1500);
    const next = await pg.evaluate(() => { const a = [...document.querySelectorAll('a[href*="page=2"]')][0]; return a ? a.getAttribute('href') : ''; });
    log(w, 'page 2 / load more keeps the filters', !next || /filter\.v\.availability=1/.test(decodeURIComponent(next)), next ? decodeURIComponent(next).slice(0, 100) : 'no page 2 with this filter');
    // sticky bar under the header while scrolling, one entry point
    await open(pg, '/collections/whey-protein'); await pg.waitForTimeout(1200);
    let okSticky = true, notes = [];
    for (const y of [1500, 3000, 1800, 900]) {
      await pg.evaluate((y) => scrollTo(0, y), y); await pg.waitForTimeout(600);
      const r = await pg.evaluate(() => { const h = document.querySelector('.hdr').getBoundingClientRect(), f = document.querySelector('.snh-bar-form').getBoundingClientRect(); return { hb: Math.round(h.bottom), ht: Math.round(h.top), ft: Math.round(f.top) }; });
      if (r.ht !== 0 || r.ft < r.hb - 1) okSticky = false;   // pinned under the header, or still in flow below it (tall desktop hero) notes.push(`y${y}: hdr ${r.ht}-${r.hb}, bar ${r.ft}`);
    }
    const entries = await pg.evaluate(() => [...document.querySelectorAll('button, a')].filter((x) => x.offsetParent && /filter\s*(&|and)\s*sort|^filters?$/i.test(x.textContent.trim())).length);
    log(w, 'header stays, filter bar pinned under it, one filter entry point', okSticky && entries <= 1, notes.join(' · ') + ` · entries ${entries}`);
    await pg.screenshot({ path: path.join(OUT, `filters-sticky-${w}.png`) });
    await c.close();
  }
  if (process.env.ONLYUI) { fs.writeFileSync(path.join(OUT, 'filters-ui.md'), rows.join('\n') + '\n'); await b.close(); return; }
  const md = fs.readFileSync(path.join(__dirname, '..', '..', 'PARITY.md'), 'utf8').split('\n## Filters in depth')[0];
  fs.writeFileSync(path.join(__dirname, '..', '..', 'PARITY.md'), md + '\n## Filters in depth\n\n`prototype/tools/r14-filters.js` (browser, target theme asserted, counts compared with the old site for the same URL; screenshots in `prototype/shots/r14/p1/`).\n\n| width | check | result | note |\n|---|---|---|---|\n' + rows.join('\n') + '\n');
  await b.close();
})();
