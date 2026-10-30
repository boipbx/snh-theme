// Round 12 bug check: announcement bar colour per page with a mock campaign announcement (tone ink, priority 1)
// injected into the [data-campaigns] JSON. Logs every change to .announce (attributes + replaced nodes).
const { chromium } = require('playwright');
const BASE = 'https://sports-nutrition-hub.myshopify.com', Q = '?preview_theme_id=189832462590', TONE = process.env.TONE || 'ink';
const PAGES = (process.env.PAGES || '/,/products/sis-go-hydro-tablets,/cart').split(','), W = (process.env.W || '390,1440').split(',').map(Number);
const mock = { id: 'qa-ann', src: 'block', name: 'QA', type: 'announcement', heading: '', message: 'QA campaign announcement', tag: 'QA', img: '', imgM: '', cta: '', link: '/cart', code: 'QA10', start: '', end: '', pages: 'all', audience: 'all', priority: +(process.env.PRIO || 1), tone: TONE, freq: 'day' };
(async () => {
  const b = await chromium.launch();
  for (const w of W) for (const p of PAGES) {
    const pg = await b.newPage({ viewport: { width: w, height: 900 } });
    await pg.route(u => u.pathname === new URL(BASE + p).pathname, async r => { const res = await r.fetch(); let t = await res.text();
      t = t.replace(/(<script type="application\/json" data-campaigns>)([\s\S]*?)(<\/script>)/, (m, a, j, c) => { const d = JSON.parse(j); d.list.unshift(mock); return a + JSON.stringify(d) + c; });
      r.fulfill({ response: res, body: t }); });
    // LOCAL=1: serve this checkout's JS instead of the deployed copies (verify before the push lands)
    if (process.env.LOCAL) for (const f of ['snh-v2.js', 'snh-campaigns.js']) await pg.route(u => u.pathname.endsWith('/' + f), r => r.fulfill({ contentType: 'application/javascript', body: require('fs').readFileSync('assets/' + f, 'utf8') }));
    const log = [];
    await pg.exposeFunction('_log', s => log.push(s));
    await pg.addInitScript(() => { const T = () => Math.round(performance.now()); new MutationObserver(ms => ms.forEach(m => {
      const a = m.target.closest && m.target.closest('.announce');
      if (m.type === 'attributes' && m.target.classList && m.target.classList.contains('announce')) window._log(m.attributeName + '=' + m.target.getAttribute(m.attributeName) + '@' + T());
      if (m.type === 'childList' && [...m.removedNodes].some(n => n.querySelector && (n.matches('.announce,.announce__item') || n.querySelector('.announce')))) window._log('REMOVED announce by ' + (m.target.className || m.target.nodeName) + '@' + T() + ' ' + new Error().stack.split('\n').slice(2, 4).join(' '));
    })).observe(document, { attributes: true, childList: true, subtree: true, attributeFilter: ['data-tone', 'hidden'] }); });
    await pg.goto(BASE + p + Q, { waitUntil: 'load', timeout: 90000 });
    await pg.waitForTimeout(+(process.env.WAIT || 6000));
    if (process.env.ROT === '0') await pg.evaluate(() => document.querySelector('.announce').dispatchEvent(new Event('mouseenter')));
    const r = await pg.evaluate(() => { const a = document.querySelector('.announce'); if (!a) return 'none:' + document.title; const cs = getComputedStyle(a);
      const rc = a.getBoundingClientRect(), top = document.elementFromPoint(8, rc.top + rc.height / 2); return { hit: top && (top.closest('.announce') ? 'announce' : top.className + '<' + (top.parentElement && top.parentElement.className)), rc: [Math.round(rc.top), Math.round(rc.height)], tone: a.dataset.tone, bg: cs.backgroundColor, n: document.querySelectorAll('.announce').length, items: [...a.querySelectorAll('.announce__item')].map(x => (x.dataset.campaign ? 'C:' : '') + x.dataset.tone + (x.classList.contains('is-on') ? '*' : '')).join(','), live: document.documentElement.getAttribute('data-campaigns-live') }; });
    if (process.env.SHOT) await pg.screenshot({ path: (process.env.SHOTDIR || 'prototype/shots/r12/bug/') + w + (p.replace(/\W+/g, '-') || 'home') + '.png', clip: { x: 0, y: 0, width: w, height: 160 } });
    console.log(w, p, JSON.stringify(r), '\n   ', log.join(' | ').slice(0, 900));
    await pg.close();
  }
  await b.close();
})();
