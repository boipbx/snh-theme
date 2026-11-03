// R19 #1: card tile colour + hover stability on home, collection, search, cart suggestions (390 + 1440)
const { chromium, open, go, shot } = require('./r19-lib');
const PAGES = [['home', '/', '.pc'], ['collection', '/collections/whey-protein', '.pc'], ['search', '/search?q=creatine&type=product', '.pc']];
(async () => {
  const b = await chromium.launch();
  for (const w of [390, 1440]) {
    const { ctx, p } = await open(b, w);
    for (const [n, u, sel] of PAGES) {
      await go(p, u);
      const el = await p.$(sel); await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(2500);
      const m = await p.evaluate((sel) => { const cs = [...document.querySelectorAll(sel)]; const t = cs.map((c) => { const tile = c.querySelector('.card__tile'), im = c.querySelector('.card__img img'); return { bg: getComputedStyle(tile).backgroundColor, blend: im && getComputedStyle(im).mixBlendMode, filt: im && getComputedStyle(im).filter, alt: !!c.querySelector('.card__img--alt') }; });
        const bgs = {}; t.forEach((x) => { bgs[x.bg] = (bgs[x.bg] || 0) + 1; });
        return { cards: t.length, bgs, filtered: t.filter((x) => x.filt && x.filt !== 'none').length, alts: t.filter((x) => x.alt).length }; }, sel);
      let hov = '';
      if (w > 800) { const c = await p.$(sel); const before = await c.evaluate((c) => [getComputedStyle(c.querySelector('.card__tile')).backgroundColor, c.querySelector('.card__img img').currentSrc, getComputedStyle(c.querySelector('.card__img')).opacity].join(' ')); await c.hover(); await p.waitForTimeout(600); const after = await c.evaluate((c) => [getComputedStyle(c.querySelector('.card__tile')).backgroundColor, c.querySelector('.card__img img').currentSrc, getComputedStyle(c.querySelector('.card__img')).opacity].join(' ')); const tr = await c.evaluate((c) => getComputedStyle(c).transform + ' / ' + getComputedStyle(c).boxShadow.slice(0, 40)); hov = 'hover same=' + (before === after) + ' card=' + tr; }
      const grid = await p.$(sel); await grid.evaluate((e) => e.parentElement.scrollIntoView({ block: 'start' }));
      await p.waitForTimeout(500);
      await p.screenshot({ path: shot(`01-cards-${n}-${w}`) });
      console.log(w, n, JSON.stringify(m), hov);
    }
    await ctx.close();
  }
  await b.close();
})();
