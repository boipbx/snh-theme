// Validate the compiled emails: image URLs resolve (HEAD), every <img> has alt text, links point to real store URLs (or
// platform variables), no unresolved placeholders or wrong-platform tags, every file under 102 KB (Gmail clips above),
// a preheader and plain text for each. Writes CHECK.md.   node check.js
const fs = require('fs'), path = require('path'), https = require('https');
const man = require('./manifest.json');
const ALLOW = [/^https:\/\/www\.sportsnutritionhub\.lk(\/|$)/, /^https:\/\/wa\.me\//, /^https:\/\/www\.(instagram|facebook|tiktok)\.com\//, /^https:\/\/maps\.google\.com\//, /^tel:\+94\d+$/, /^#$/];
const head = (u) => new Promise((res) => { const r = https.request(u, { method: 'HEAD', timeout: 20000 }, (x) => res(x.statusCode)); r.on('error', () => res(0)); r.on('timeout', () => { r.destroy(); res(0); }); r.end(); });
(async () => {
  const imgs = new Map(), rows = [], problems = [];
  for (const m of man) {
    const html = fs.readFileSync(path.join(__dirname, '..', m.html), 'utf8');
    const txt = fs.readFileSync(path.join(__dirname, '..', m.text), 'utf8');
    const p = [];
    if (m.bytes > 102 * 1024) p.push(`size ${(m.bytes / 1024).toFixed(1)} KB`);
    for (const [, tag] of html.matchAll(/<img\b([^>]*)>/g)) { const src = (tag.match(/src="([^"]*)"/) || [])[1] || ''; const alt = (tag.match(/alt="([^"]*)"/) || [null, null])[1]; if (alt === null || (!alt.trim() && !/\{\{/.test(src))) p.push('img without alt: ' + src.slice(0, 60)); if (!/\{\{|\{%/.test(src)) imgs.set(src, (imgs.get(src) || 0) + 1); }
    for (const [, href] of html.matchAll(/href="([^"]*)"/g)) { if (/\{\{|\{%/.test(href) || /^https:\/\/www\.sportsnutritionhub\.lk\/discount\//.test(href)) continue; if (!ALLOW.some((r) => r.test(href)) && !/^urn:schemas/.test(href)) p.push('link: ' + href); }
    if (/zephra/i.test(html + txt)) p.push('forbidden word');
    if (/\b(TODO|XXX|lorem|PLACEHOLDER)\b|\[\[|\]\]/i.test(html)) p.push('unresolved placeholder');
    if (m.platform === 'shopify' && /person\|lookup|event\.|\|default:'|{% unsubscribe/.test(html)) p.push('Klaviyo tag in a Shopify template');
    if (m.platform === 'klaviyo' && /\| money|img_url|\{\{ shop\.|\{\{[^}]*customer\./.test(html)) p.push('Shopify tag in a Klaviyo template');
    if (!/<div style="display:none;font-size:1px[^>]*>[^<]{10,}/.test(html)) p.push('no preheader');
    if (txt.length < 200) p.push('plain text too short');
    if (p.length) problems.push([m.id, p]);
    rows.push(`| ${m.platform} | ${m.id} | ${(m.bytes / 1024).toFixed(1)} KB | ${p.length ? '**' + p.join('; ') + '**' : 'OK'} |`);
  }
  const imgRows = [];
  for (const [u, n] of imgs) { let s = await head(u); if (s !== 200) s = await head(u); imgRows.push(`| ${s === 200 ? 'OK' : '**' + s + '**'} | ${n} | ${u} |`); if (s !== 200) problems.push(['image', [u + ' → ' + s]]); }
  const md = ['# Email checks', '', `${man.length} emails · ${imgs.size} unique image URLs · ${problems.length ? problems.length + ' problem(s)' : 'no problems'}`, '', '## Emails', '', '| platform | id | size | result |', '|---|---|---|---|', ...rows, '', '## Image URLs (HEAD)', '', '| status | used | url |', '|---|---|---|', ...imgRows].join('\n');
  fs.writeFileSync(path.join(__dirname, 'CHECK.md'), md + '\n');
  console.log(`${man.length} emails, ${imgs.size} images, problems: ${problems.length}`); problems.slice(0, 12).forEach((x) => console.log(' ', x[0], x[1].slice(0, 3).join(' | ')));
})();
