// Build every SNH email: src/<platform>/<id>.mjml (generated from lib/catalog.js + lib/modules.js), compiled to
// dist/<platform>/<id>.html (inline CSS, 600px) + .txt (plain text), a preview build with sample values in
// preview/html/<platform>/<id>.html, and manifest.json.   node build.js
const fs = require('fs'), path = require('path');
const mjml = require('mjml');
const { convert } = require('html-to-text');
const M = require('./lib/modules');
const E = require('./lib/catalog');

const ROOT = __dirname;
const mk = (p) => fs.mkdirSync(p, { recursive: true });
const SAMPLE = { first_name: 'Nimal', order_name: '#18452', 'order.name': '#18452', name: '#D1042', ProductName: 'Critical Whey 2KG', product_title: 'Critical Whey 2KG', plan_title: 'Build muscle: 4-day upper / lower', days_left: '6', loyalty_points: '2,180', points_value_rs: '2,180', next_tier: 'Gold', rs_to_next_tier: '58,500', popup_prize: '7%', amount: 'Rs 8,499', 'location.name': 'Nugegoda', initial_value: 'Rs 10,000', code: 'ELITE-7K2P9', value_rs: '2,500', points: '640' };
// subject / preheader sample: replace each {{ … }} with a sample chosen by the variable it reads
const sampleText = (s) => String(s).replace(/\{\{\s*([^}|]+?)\s*(\|[^}]*)?\}\}/g, (m, v) => { const k = v.trim().replace(/^person\|lookup:['"]?/, '').replace(/^(event|customer|gift_card|location)\./, ''); for (const key of Object.keys(SAMPLE)) if (k.endsWith(key) || v.includes(`'${key}'`) || v.includes(`"${key}"`)) return SAMPLE[key]; return 'Nimal'; }).replace(/\{%.*?%\}/g, '');

function tagger(platform, preview) {
  return {
    platform, preview,
    v: (real, sample) => (preview ? sample : real),
    raw: (real, sample) => (preview ? sample : real),
    loop: (open, close, samples, row) => (preview ? samples.map((s) => row(s, true)).join('') : open + row(null, false) + close),
  };
}
function doc(e, t) {
  const body = e.body(t).filter(Boolean).join('\n');
  return `<mjml lang="en">${M.head(t, { ...e, preheader: t.preview ? sampleText(e.preheader) : e.preheader })}
  <mj-body background-color="${M.C.canvas}" width="600px" css-class="body">
  ${M.header(t)}
  ${body}
  </mj-body></mjml>`;
}
const manifest = [];
let errors = 0;
for (const e of E) {
  for (const preview of [false, true]) {
    const t = tagger(e.platform, preview);
    const src = doc(e, t);
    const out = mjml(src, { validationLevel: 'soft', keepComments: true, minify: false });
    if (out.errors && out.errors.length) { const real = out.errors.filter((x) => !/mj-raw|has invalid content/.test(x.message)); if (real.length) { errors++; console.log('MJML', e.id, real.slice(0, 2).map((x) => x.formattedMessage).join(' | ')); } }
    let html = out.html;
    if (preview) {
      mk(path.join(ROOT, 'preview/html', e.platform));
      fs.writeFileSync(path.join(ROOT, 'preview/html', e.platform, e.id + '.html'), html);
    } else {
      mk(path.join(ROOT, 'src', e.platform)); mk(path.join(ROOT, 'dist', e.platform));
      fs.writeFileSync(path.join(ROOT, 'src', e.platform, e.id + '.mjml'), src);
      fs.writeFileSync(path.join(ROOT, 'dist', e.platform, e.id + '.html'), html);
      const txt = convert(html, { wordwrap: 78, selectors: [{ selector: 'img', format: 'skip' }, { selector: 'a', options: { hideLinkHrefIfSameAsText: true } }, { selector: 'table', format: 'block' }, { selector: 'tr', format: 'block' }, { selector: 'td', format: 'inline' }] })
        .replace(/\n{3,}/g, '\n\n');
      fs.writeFileSync(path.join(ROOT, 'dist', e.platform, e.id + '.txt'), `Subject: ${e.subject}\nPreheader: ${e.preheader}\n\n${txt}\n`);
      manifest.push({ id: e.id, platform: e.platform, group: e.group, name: e.name, trigger: e.trigger, timing: e.timing, subject: e.subject, alt_subject: e.alt, preheader: e.preheader, vars: e.vars, paste: e.paste, html: `emails/dist/${e.platform}/${e.id}.html`, text: `emails/dist/${e.platform}/${e.id}.txt`, mjml: `emails/src/${e.platform}/${e.id}.mjml`, bytes: Buffer.byteLength(html) });
    }
  }
}
fs.writeFileSync(path.join(ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2));
const by = manifest.reduce((a, m) => ((a[m.platform] = (a[m.platform] || 0) + 1), a), {});
console.log(`built ${manifest.length} emails`, JSON.stringify(by), 'max KB', (Math.max(...manifest.map((m) => m.bytes)) / 1024).toFixed(1), errors ? `· ${errors} with MJML errors` : '');
