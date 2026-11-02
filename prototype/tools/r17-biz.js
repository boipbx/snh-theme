// Round 17: wholesale + franchise pages (390 / 768 / 1440), forms (fields, hidden fields, +94, required; never
// submitted) + success states (Shopify's ?contact_posted=true return), the menu / footer / home / locations / about
// placements. Target theme asserted.   node prototype/tools/r17-biz.js → shots/r17/pages, forms, placements
process.env.SHOTS = 'r17';
const { chromium, context, open, out } = require('./r14-lib.js');
const fs = require('fs'), path = require('path');
const PG = out('pages'), FM = out('forms'), PL = out('placements'), rows = [];
const log = (w, step, ok, note) => { rows.push(`| ${w} | ${step} | ${ok ? 'PASS' : '**FAIL**'} | ${note || ''} |`); console.log(w, ok ? 'PASS' : 'FAIL', step, note || ''); };
const PAGES = [['wholesale', '/pages/wholesale-1', ['Business name', 'contact[name]', 'contact[email]', 'contact[Mobile]', 'Business type', 'District / city', 'Interest – Whey protein', 'Interest – Other', 'Monthly volume', 'Current suppliers', 'contact[body]'], '[Wholesale enquiry]', 'wholesale', 'wholesale-lead'],
               ['franchise', '/pages/franchise-partner', ['contact[name]', 'contact[email]', 'contact[Mobile]', 'City / district of interest', 'Property', 'Investment range', 'Business experience', 'Timeline', 'contact[body]'], '[Franchise enquiry]', 'franchise', 'franchise-lead']];
(async () => {
  const b = await chromium.launch();
  for (const w of [390, 768, 1440]) {
    const c = await context(b, w), p = await c.newPage();
    await p.addInitScript(() => { window.__cls = 0; try { new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: 'layout-shift', buffered: true }); } catch (e) {} });
    for (const [n, pth, fields, subj, kind, tags] of PAGES) {
      await open(p, pth); await p.waitForTimeout(1500);
      const eagerBefore = await p.evaluate(() => [...document.querySelectorAll('main img')].filter((i) => !i.closest('.biz-hero') && i.loading !== 'lazy' && i.getBoundingClientRect().top > innerHeight * 1.5).length);   // before scrolling: the marquee rightly loads its logos once it's near
      await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 140)); } scrollTo(0, 0); }); await p.waitForTimeout(800);
      const r = await p.evaluate(() => {
        const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap((s) => { try { const j = JSON.parse(s.textContent); return (j['@graph'] || [j]).map((x) => x['@type']); } catch (e) { return ['bad']; } });
        const main = document.querySelector('main') || document.body;
        const content = [...main.querySelectorAll('.biz-photo img, .biz-copy__img img')];
        const words = (main.innerText.match(/\b\w+\b/g) || []).length;
        const imgs = [...main.querySelectorAll('img')]; const hero = main.querySelector('.biz-hero__img');
        const lazy = imgs.filter((i) => i !== hero && !i.closest('.biz-hero')).filter((i) => i.loading !== 'lazy' && i.getBoundingClientRect().top > innerHeight * 1.5).length;
        const links = [...main.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));
        return { h1: document.querySelectorAll('h1').length, ld: [...new Set(ld)], altMissing: content.filter((i) => !i.alt.trim()).length, content: content.length, words, eagerBelow: lazy, toCollections: links.filter((h) => /\/collections\//.test(h)).length, toElite: links.some((h) => /snh-elite/.test(h)), cross: links.some((h) => /wholesale-1|franchise-partner/.test(h)), over: document.documentElement.scrollWidth - innerWidth, cls: +window.__cls.toFixed(3) };
      });
      log(w, `${n}: one H1, Organization + BreadcrumbList + FAQPage, alt text, lazy images, internal links, no sideways scroll, CLS < 0.1`, r.h1 === 1 && ['Organization', 'BreadcrumbList', 'FAQPage'].every((t) => r.ld.includes(t)) && r.altMissing === 0 && eagerBefore === 0 && r.toCollections >= 5 && r.toElite && r.cross && r.over <= 0 && r.cls < 0.1, JSON.stringify(Object.assign(r, { eagerBefore })));
      if (w !== 768) await p.screenshot({ path: path.join(PG, `${n}-${w}.png`), fullPage: true });
      else await p.screenshot({ path: path.join(PG, `${n}-${w}.png`) });
      // form: fields + hidden fields + +94; never submitted
      const f = await p.evaluate(({ fields }) => { const form = document.querySelector('#biz-form form'); const names = [...form.elements].map((e) => e.name || ''); const has = fields.map((k) => names.some((nm) => nm.includes(k))); const h = (k) => (form.querySelector(`input[type=hidden][name="contact[${k}]"]`) || {}).value; const tel = form.querySelector('input[type=tel]'); return { method: form.method, action: form.getAttribute('action'), missing: fields.filter((_, i) => !has[i]), subj: h('Subject'), form: h('form'), tags: h('tags'), tel94: !!(tel && tel.hasAttribute('data-tel94') && tel.hasAttribute('data-sl-mobile')), required: [...form.querySelectorAll('[required]')].length, checks: form.querySelectorAll('input[type=checkbox]').length }; }, { fields });
      log(w, `${n} form: native POST to /contact, every field, hidden Subject / form / tags, +94 mobile, required fields (not submitted)`, f.method === 'post' && /contact/.test(f.action) && !f.missing.length && f.subj === subj && f.form === kind && f.tags === tags && f.tel94 && f.required >= 4, JSON.stringify(f));
      if (w !== 768) { const fc = p.locator('#biz-form'); await fc.scrollIntoViewIfNeeded(); await fc.screenshot({ path: path.join(FM, `${n}-form-${w}.png`) }); }
      // phone normalising (typed, blurred; not submitted)
      await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));   // the phone welcome popup opens after scrolling and makes the page inert
      const tel = p.locator('#biz-form input[type=tel]'); await tel.scrollIntoViewIfNeeded(); await p.waitForFunction(() => { const t = document.querySelector('#biz-form input[type=tel]'); return t && t.__tel94; }, null, { timeout: 15000 }).catch(() => {}); await tel.fill('0771234567'); await tel.blur(); await p.waitForTimeout(200);
      const tv = await tel.inputValue(); log(w, `${n} form: mobile 0771234567 cleans to the local part (+94 shown)`, /77 ?123 ?4567/.test(tv), tv);
      // success state (Shopify returns with ?contact_posted=true)
      await open(p, pth + '?contact_posted=true'); await p.waitForTimeout(1500);
      const ok = await p.evaluate(() => { const o = document.querySelector('[data-biz-ok]'); return o ? { h: o.querySelector('.biz-ok__h').textContent.trim(), steps: o.querySelectorAll('li').length, fields: document.querySelectorAll('#biz-form input:not([type=hidden]), #biz-form select').length } : null; });
      log(w, `${n}: success state on return (next steps, form hidden)`, ok && ok.steps >= 3 && ok.fields === 0, JSON.stringify(ok));
      if (w !== 768) { const fc = p.locator('#biz-form'); await fc.scrollIntoViewIfNeeded(); await fc.screenshot({ path: path.join(FM, `${n}-success-${w}.png`) }); }
    }
    // placements: mega menu / mobile menu, home band, locations + about
    await open(p, '/'); await p.waitForTimeout(1500);
    if (w >= 1024) {
      const offers = p.locator('.nav__btn:has-text("Offers"), button:has-text("Offers")').first(); await offers.hover(); await offers.click().catch(() => {}); await p.waitForTimeout(700);
      const mz = await p.evaluate(() => { const z = [...document.querySelectorAll('.mega .mz--biz')].find((e) => e.offsetParent); return z ? [...z.querySelectorAll('a')].map((a) => a.textContent.trim() + ' ' + a.getAttribute('href')) : null; });
      log(w, 'mega menu: "For business" column in Offers', mz && mz.length === 2, JSON.stringify(mz));
      await p.screenshot({ path: path.join(PL, `mega-offers-${w}.png`) }); await p.keyboard.press('Escape');
    } else {
      await p.locator('.hdr__menu').click(); await p.waitForTimeout(600);
      await p.locator('.mm__item:has-text("Offers"), [aria-controls^="mm-"]:has-text("Offers")').first().click().catch(() => {}); await p.waitForTimeout(700);
      const mm = await p.evaluate(() => { const z = [...document.querySelectorAll('.mm__level .mz--biz')]; return z.map((x) => [...x.querySelectorAll('a')].map((a) => a.textContent.trim())); });
      log(w, 'mobile menu: "For business" in the Offers panel', mm.length && mm[0].length === 2, JSON.stringify(mm));
      await p.screenshot({ path: path.join(PL, `mobile-menu-offers-${w}.png`) }); await p.keyboard.press('Escape');
    }
    const g = p.locator('.grow'); await g.scrollIntoViewIfNeeded(); await p.waitForTimeout(800);
    const gr = await p.evaluate(() => { const s = document.querySelector('.grow'); const prev = s.closest('.shopify-section').previousElementSibling; return { cards: [...s.querySelectorAll('.grow__card')].map((a) => a.getAttribute('href')), after: prev && prev.id.replace(/.*__/, '') }; });
    log(w, 'home: "Grow with SNH" band (wholesale + franchise) after the stores', gr.cards.length === 2 && gr.cards.includes('/pages/wholesale-1') && gr.cards.includes('/pages/franchise-partner'), JSON.stringify(gr));
    await g.screenshot({ path: path.join(PL, `home-grow-${w}.png`) });
    const ft = await p.evaluate(() => { const col = [...document.querySelectorAll('.ftr__col')].find((c) => /business/i.test(c.querySelector('h3') && c.querySelector('h3').textContent)); return col ? [...col.querySelectorAll('a')].map((a) => a.textContent.trim()) : null; });
    log(w, 'footer: Business column (Wholesale, Franchise partner, Work with us)', ft && ft.length === 3, JSON.stringify(ft));
    for (const pth of ['/pages/locations-info', '/pages/about-us']) {
      await open(p, pth).catch(() => {}); await p.waitForTimeout(1200);
      const l = await p.evaluate(() => [...document.querySelectorAll('main a[href*="wholesale-1"], main a[href*="franchise-partner"]')].length);
      log(w, `${pth}: links to both business pages`, l >= 2, `${l} links`);
    }
    await c.close();
  }
  fs.writeFileSync(path.join(out(''), 'biz.md'), ['# Round 17: business pages, forms, placements', '', '| width | check | result | note |', '|---|---|---|---|', ...rows].join('\n') + '\n');
  await b.close();
})();
