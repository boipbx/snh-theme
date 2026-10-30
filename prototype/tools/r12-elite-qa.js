// Round 12 SNH Elite page: screenshots at 390 / 768 / 1440, the calculator at three spends, tab keyboard, and the
// tier-card contrast MEASURED from pixels: for every text element on a metal surface the text is made transparent,
// the card is screenshotted, and the lightest/darkest background pixel inside the text box is compared with the
// text colour (WCAG). Output: prototype/shots/r12/p6/contrast.md (+ elite.md). Needs python3 + PIL.
const { chromium } = require(process.env.PW || 'playwright');
const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const DEV = process.env.DEV || 'http://127.0.0.1:9292';
const OUT = path.join(__dirname, '..', 'shots', 'r12', 'p6'); fs.mkdirSync(OUT, { recursive: true });
const HIDE = '[data-email-capture],dialog.ecm,.shopify-section--popup,#preview-bar-iframe{display:none!important}';
(async () => {
  const b = await chromium.launch(); const md = ['# SNH Elite page', ''];
  for (const w of [390, 768, 1440]) {
    const p = await b.newPage({ viewport: { width: w, height: w < 800 ? 844 : 900 }, isMobile: w < 800, hasTouch: w < 800 });
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(DEV + '/pages/snh-elite', { waitUntil: 'load', timeout: 90000 });
    await p.addStyleTag({ content: HIDE });
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 100)); } scrollTo(0, 0); });
    await p.waitForTimeout(1200);
    await p.screenshot({ path: path.join(OUT, `elite-${w}.png`), fullPage: true });
    if (w === 1440) {
      const calc = [];
      for (const v of [5000, 17000, 30000]) {
        calc.push(await p.evaluate((v) => { const i = document.querySelector('[data-calc-in]'); i.value = v; i.dispatchEvent(new Event('input')); const t = (s) => document.querySelector(s).textContent; return `Rs ${v.toLocaleString()} a month → ${t('[data-calc-pm]')} points a month · first reward ${t('[data-calc-first]')} · 12 months: ${t('[data-calc-tier]')} (${t('[data-calc-tier-note]')})`; }, v));
      }
      await p.locator('[data-calc]').screenshot({ path: path.join(OUT, 'calculator-1440.png') });
      await p.focus('[role="tab"][data-tier="bronze"]'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(400);
      const tab = await p.evaluate(() => ({ sel: document.querySelector('[data-perks] [role="tab"][aria-selected="true"]').dataset.tier, focus: document.activeElement.dataset.tier, visible: [...document.querySelectorAll('[role="tabpanel"]')].filter((x) => !x.hidden).map((x) => x.dataset.tier) }));
      await p.locator('[data-perks]').screenshot({ path: path.join(OUT, 'perks-silver-1440.png') });
      md.push('## Calculator (1440)', '', ...calc.map((c) => '- ' + c), '', `Tabs: ArrowRight from Bronze → selected ${tab.sel}, focus ${tab.focus}, visible pane ${tab.visible.join(',')}`, '');
      // contrast: every text node inside a metal surface
      const items = await p.evaluate(() => [...document.querySelectorAll('.ep2 [data-metal]')].flatMap((card, ci) => [...card.querySelectorAll('*')].concat([card]).filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())).map((el, ei) => { el.setAttribute('data-cx', ci + '-' + ei); const r = el.getBoundingClientRect(); return { id: ci + '-' + ei, tier: card.dataset.tier, kind: card.className.split(' ')[0], text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 40), color: getComputedStyle(el).color, size: parseFloat(getComputedStyle(el).fontSize), weight: getComputedStyle(el).fontWeight }; })));
      await p.addStyleTag({ content: '.ep2 [data-metal], .ep2 [data-metal] * { color: transparent !important; } .ep2__tiers .ep2__tier { opacity: 1 !important; transform: none !important; transition: none !important; }' });
      await p.evaluate(() => document.querySelectorAll('[role="tabpanel"]').forEach((x) => { x.hidden = false; }));
      for (const it of items) {
        const el = p.locator(`[data-cx="${it.id}"]`);
        // the perk panes share one spot: show only this item's pane, or the others paint over it (R12 phase 10 fix)
        await el.evaluate((e) => { const own = e.closest('[role="tabpanel"]'); if (own) document.querySelectorAll('[role="tabpanel"]').forEach((x) => { x.hidden = x !== own; }); });
        await el.scrollIntoViewIfNeeded(); const f = path.join(OUT, `cx-${it.id}.png`); await el.screenshot({ path: f }); it.file = f;
      }
      const py = `import sys,json\nfrom PIL import Image\nitems=json.load(sys.stdin)\ndef lum(c):\n  c=[x/255 for x in c[:3]]\n  c=[x/12.92 if x<=0.03928 else ((x+0.055)/1.055)**2.4 for x in c]\n  return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]\nout=[]\nfor it in items:\n  im=Image.open(it['file']).convert('RGB'); W,H=im.size; ix=int(min(H/2,12)) if it['kind']=='ep2__pane-rate' else 2; im=im.crop((ix,2,max(ix+1,W-ix),max(3,H-2))); px=list(im.getdata()); ls=[lum(p) for p in px]\n  import re\n  t=[int(x) for x in re.findall(r'[\\d.]+',it['color'])[:3]]; lt=lum(t)\n  def cr(a,b): a,b=max(a,b),min(a,b); return (a+0.05)/(b+0.05)\n  worst=min(cr(lt,max(ls)),cr(lt,min(ls)))\n  out.append(dict(it,worst=round(worst,2),bgmin=round(min(ls),3),bgmax=round(max(ls),3)))\nprint(json.dumps(out))`;
      const res = JSON.parse(execFileSync('python3', ['-c', py], { input: JSON.stringify(items) }).toString());
      res.forEach((r) => fs.unlinkSync(r.file));
      md.push('## Tier contrast (measured)', '', 'Text made transparent, each text box screenshotted on its real metal (pills: inset past the rounded ends, which show the page behind); worst case = text colour vs the lightest or darkest background pixel in that box. Pass = 4.5:1 (all text).', '', '| surface | tier | text | size/weight | colour | worst contrast | pass |', '|---|---|---|---|---|---|---|',
        ...res.map((r) => `| ${r.kind} | ${r.tier} | ${r.text} | ${r.size}/${r.weight} | ${r.color} | ${r.worst}:1 | ${r.worst >= 4.5 ? '✓' : '✗'} |`), '');
      fs.writeFileSync(path.join(OUT, 'contrast.md'), md.slice(md.indexOf('## Tier contrast (measured)')).join('\n') + '\n');
    }
    md.push(`${w}: errors ${errs.length ? errs.join('; ') : 'none'}`);
    await p.close();
  }
  await b.close();
  fs.writeFileSync(path.join(OUT, 'elite.md'), md.join('\n') + '\n'); console.log(md.join('\n'));
})();
