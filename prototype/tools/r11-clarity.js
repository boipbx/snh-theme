// Round 11 phase 9: conversion clarity + a Lighthouse-style mobile performance pass (Lighthouse itself isn't
// installed here; this uses Chrome DevTools Protocol directly: Moto-class viewport, 4× CPU slowdown, slow 4G).
// Clarity per page (390 + 1440): images rendered larger than their file (blurry) or missing alt, product cards and
// product pages without a per-serving or compare-at price where one exists, payment info (Koko / COD / card) and
// delivery info on the page, the primary CTA's position on a phone (above the fold?).
// Perf (home + product, mobile, throttled): LCP, CLS, total blocking time (long tasks − 50ms), requests, transfer KB.
// PW=<playwright> node prototype/tools/r11-clarity.js [label] → prototype/shots/r11/p9/clarity-<label>.md
const { chromium } = require(process.env.PW || 'playwright');
const fs = require('fs'), path = require('path');
const DEV = process.env.DEV || 'http://127.0.0.1:9292';
const LABEL = process.argv[2] || 'before';
const OUT = path.join(__dirname, '..', 'shots', 'r11', 'p9');
const PAGES = [['home', '/'], ['collection', '/collections/whey-protein'], ['search', '/search?q=creatine'], ['pdp-whey', '/products/applied-nutrition-critical-whey-2kg'], ['pdp-creatine', '/products/applied-nutrition-creatine-monohydrate'], ['pdp-hydro', '/products/sis-go-hydro-tablets'], ['cart', '/cart']];
const HIDE = '#preview-bar-iframe,privacy-bar,#shopify-pc__banner,[data-email-capture]{display:none!important}';

function clarity() {
  const vis = (e) => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 24 && r.height > 24 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > .05; };
  const dpr = devicePixelRatio || 1, issues = [];
  // blurry: the file is narrower than its rendered width (at 1× even, so not a retina nit)
  document.querySelectorAll('main img').forEach((im) => {
    if (!vis(im) || !im.complete || !im.naturalWidth || im.closest('[aria-hidden="true"], .tiktok-embed, iframe')) return;
    // layout width without transforms (the frame crop scales pack shots 1.12×); for srcset images naturalWidth is the
    // size the browser picked the file for, so a smaller one means the sizes attribute under-asks (blurry on retina)
    const w = im.offsetWidth;
    if (im.naturalWidth < w * 0.95) issues.push(`blurry image ${Math.round(w)}px shown from a ${im.naturalWidth}px file: ${(im.currentSrc || im.src).split('/').pop().slice(0, 50)}`);
  });
  const text = document.body.innerText.toLowerCase();
  const res = {
    issues,
    koko: /koko/.test(text), cod: /cash on delivery|\bcod\b/.test(text), card: /\bcard\b|visa|mastercard/.test(text),
    delivery: /same-day|same day|working days|free delivery/.test(text),
    cards: document.querySelectorAll('.pc').length,
    cardsNoPer: [...document.querySelectorAll('.pc')].filter((c) => /servings?/i.test(c.querySelector('.pc__name')?.title || '') && !/\/ serving/.test(c.querySelector('.pc__sub')?.textContent || '')).length,
    cardsKoko: [...document.querySelectorAll('.pc')].filter((c) => c.querySelector('.pc__koko')).length
  };
  // product page: price block, compare-at, per serving, primary CTA
  const atc = document.querySelector('form[action*="/cart/add"] button[type="submit"]:not([disabled]), [data-sp-atc], .sp-buy button[type="submit"]');
  if (location.pathname.indexOf('/products/') === 0) {
    const r = atc && atc.getBoundingClientRect();
    res.ctaTop = r ? Math.round(r.top + scrollY) : null;
    res.ctaAboveFold = !!(r && r.top + scrollY + r.height <= innerHeight);
    res.perServing = /per serving|\/ serving|a serving/i.test(text);
    res.compareAt = !!document.querySelector('main s, main del, main .price--compare, main [class*="compare"], main [class*="was"]');
  }
  return res;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const rows = [];
  for (const [name, url] of PAGES) {
    for (const w of [390, 1440]) {
      const p = await b.newPage({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 800, hasTouch: w < 800, deviceScaleFactor: w < 800 ? 3 : 1 });
      await p.route(/monorail|analytics|trekkie|web-pixels/, (r) => r.abort());
      for (let t = 0; t < 3; t++) { if (await p.goto(DEV + url, { waitUntil: 'load', timeout: 90000 }).then(() => true, () => false)) break; await p.waitForTimeout(3000); }
      await p.addStyleTag({ content: HIDE }).catch(() => {});
      await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 100)); } scrollTo(0, 0); });
      await p.waitForTimeout(1500);
      rows.push({ name, w, ...(await p.evaluate(clarity)) });
      await p.close();
    }
  }
  // performance, mobile, throttled (the Lighthouse mobile profile's CPU and network)
  const perf = [];
  for (const [name, url] of [['home', '/'], ['pdp-whey', '/products/applied-nutrition-critical-whey-2kg']]) {
    const ctx = await b.newContext({ viewport: { width: 412, height: 823 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6 });
    const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    let bytes = 0, reqs = 0;
    cdp.on('Network.loadingFinished', (e) => { bytes += e.encodedDataLength || 0; reqs++; });
    await p.addInitScript(() => {
      window.__m = { lcp: 0, cls: 0, tbt: 0 };
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__m.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.tbt += Math.max(0, e.duration - 50); }).observe({ type: 'longtask', buffered: true });
    });
    const t0 = Date.now();
    await p.goto(DEV + url, { waitUntil: 'load', timeout: 180000 }).catch(() => {});
    const loadMs = Date.now() - t0;
    await p.waitForTimeout(5000);
    const m = await p.evaluate(() => window.__m);
    perf.push({ name, lcp: Math.round(m.lcp), cls: +m.cls.toFixed(3), tbt: Math.round(m.tbt), load: loadMs, reqs, kb: Math.round(bytes / 1024) });
    await ctx.close();
  }
  await b.close();
  const md = [`# Round 11 conversion clarity (${LABEL})`, '', `Generated ${new Date().toISOString()} against ${DEV}`, '',
    '| page | width | blurry images | Koko | COD | card | delivery | cards (Koko / no per-serving) | per serving | compare-at | CTA above the fold |', '|---|---|---|---|---|---|---|---|---|---|---|'];
  for (const r of rows) md.push(`| ${r.name} | ${r.w} | ${r.issues.length || '✓'} | ${r.koko ? '✓' : '⚠'} | ${r.cod ? '✓' : '⚠'} | ${r.card ? '✓' : '⚠'} | ${r.delivery ? '✓' : '⚠'} | ${r.cards ? r.cardsKoko + '/' + r.cards + ' · ' + r.cardsNoPer : '—'} | ${r.perServing === undefined ? '—' : r.perServing ? '✓' : '⚠'} | ${r.compareAt === undefined ? '—' : r.compareAt ? '✓' : '—'} | ${r.ctaAboveFold === undefined ? '—' : r.ctaAboveFold ? '✓' : '⚠ at ' + r.ctaTop + 'px'} |`);
  md.push('', '## Mobile performance (412×823, 4× CPU, slow 4G; Lighthouse-style, measured in Chrome)', '', '| page | LCP ms | CLS | TBT ms | load ms | requests | transfer KB |', '|---|---|---|---|---|---|---|');
  for (const p of perf) md.push(`| ${p.name} | ${p.lcp} | ${p.cls} | ${p.tbt} | ${p.load} | ${p.reqs} | ${p.kb} |`);
  md.push('', '## Issues', '');
  for (const r of rows) if (r.issues.length) md.push(`### ${r.name} @ ${r.w}`, ...r.issues.slice(0, 12).map((x) => '- ' + x), '');
  fs.writeFileSync(path.join(OUT, `clarity-${LABEL}.md`), md.join('\n') + '\n');
  console.log(md.join('\n'));
})();
