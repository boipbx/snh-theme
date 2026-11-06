// Generate INDEX.md, ASSETS.md, SETUP-SHOPIFY.md and preview/index.html (gallery) from manifest.json.   node docs.js
const fs = require('fs'), path = require('path');
const man = require('./manifest.json');
const A = require('./lib/assets');
const W = (f, s) => fs.writeFileSync(path.join(__dirname, f), s);
const cell = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const by = (p) => man.filter((m) => m.platform === p);

// INDEX.md
const idx = ['# SNH emails: index', '', `${man.length} emails · Shopify notifications: ${by('shopify').length} · Klaviyo flows + campaigns: ${by('klaviyo').length}. Brand: ink #0E0E0E, the theme's brand orange #BF4512 (the current accent in Theme settings; #E0521C is the older, lighter orange and is only used decoratively), canvas #F6F4F1, cream tile #F5F2EC. Built with MJML (\`emails/src\`), compiled to inline-CSS HTML (\`emails/dist\`, 600px) + a plain-text version each. Rebuild: \`cd emails && npm install && node build.js && node check.js && node docs.js\`.`, '',
  'Paste the **HTML** file. Subject, preheader and the A/B subject are below (and in `manifest.json`). Gallery: `emails/preview/index.html`.', ''];
for (const p of ['shopify', 'klaviyo']) {
  idx.push(`## ${p === 'shopify' ? 'Shopify notifications' : 'Klaviyo flows and campaigns'}`, '', '| # | name | group | trigger · timing | subject | A/B subject | preheader | file | variables | paste into |', '|---|---|---|---|---|---|---|---|---|---|');
  by(p).forEach((m, i) => idx.push(`| ${i + 1} | ${cell(m.name)} | ${cell(m.group)} | ${cell(m.trigger)} · ${cell(m.timing)} | ${cell(m.subject)} | ${cell(m.alt_subject)} | ${cell(m.preheader)} | \`${m.html}\` (+ .txt) | ${cell(m.vars.join(', '))} | ${cell(m.paste)} |`));
  idx.push('');
}
W('INDEX.md', idx.join('\n') + '\n');

// ASSETS.md
const used = {};
for (const m of man) { const h = fs.readFileSync(path.join(__dirname, '..', m.html), 'utf8'); for (const [k, u] of Object.entries(A)) if (h.includes(u.replace(/&/g, '&amp;')) || h.includes(u)) (used[k] = used[k] || []).push(m.id); }
W('ASSETS.md', ['# Images used in the emails', '', 'Every image is an absolute https URL on Shopify\'s CDN. `files/…` are Shopify Files (Content → Files); `t/36/assets/…` are assets of theme 189832462590 (snh-theme/feat/theme-v2): they keep working once that theme is published, but if you delete or replace the theme, upload `snh-koko.png` to Files and update `emails/lib/assets.js`, then rebuild. WebP store photos are requested as progressive JPEG (`format=pjpg`) so Outlook shows them. Product images in order / cart emails come from the platform (Shopify line items, Klaviyo event data). All URLs were HEAD-checked (see CHECK.md).', '',
  '| key | url | used in |', '|---|---|---|', ...Object.entries(A).map(([k, u]) => `| ${k} | ${u} | ${(used[k] || []).length} emails |`)].join('\n') + '\n');

// SETUP-SHOPIFY.md
W('SETUP-SHOPIFY.md', ['# Shopify notifications: setup', '', 'Admin → **Settings → Notifications → Customer notifications**. For each row: open the notification → **Edit code** → replace the **Email body (HTML)** with the file below → set the **Email subject** → **Preview** (Shopify shows a Liquid error if a variable is not available) → **Send test email** → **Save**. Keep a copy of the default first (Shopify has "Revert to default").', '',
  'Shopify notifications do not take a separate preheader or plain-text field: the preheader is built into the HTML (hidden first line) and Shopify makes its own text part. The `.txt` files are for reference.', '',
  '| notification (admin path) | file | subject | variables used |', '|---|---|---|---|',
  ...by('shopify').map((m) => `| ${cell(m.paste.replace('Settings → Notifications → Customer notifications → ', ''))} | \`${m.html}\` | ${cell(m.subject)} | ${cell(m.vars.join(', '))} |`), '',
  '## Notes', '',
  '- **Points earned** (order confirmation) uses the customer metafield `custom.loyalty_tier` for the rate (Bronze 3, Silver 7, Gold 10) and 1 point = Rs 1. If the metafield is not set, it shows the Bronze rate.',
  '- **Payment note** reads the first transaction\'s gateway: "Koko", "Cash on Delivery (COD)" and "Bank Deposit" / manual methods show their own line. Rename the checks in the file if your payment method names differ.',
  '- **Draft order invoice**: the button uses `{{ invoice_url }}`. If Shopify\'s default template on your store uses a different link variable, copy that variable into the button.',
  '- **Out for delivery / Delivered** fire only for carriers that send tracking status to Shopify. Same-day Colombo riders use **Local order out for delivery** (Settings → Notifications → Local delivery).',
  '- **Ready for pickup** needs local pickup enabled at the store location (Settings → Shipping and delivery → Local pickup).',
  '- **Payment reminder** applies to orders with payment terms (manual / bank transfer). COD orders do not trigger it.',
  '- Sender email and the reply-to: Settings → Notifications → Sender email (use a monitored address; WhatsApp is the fastest support line in every email).', ''].join('\n') + '\n');

// gallery
const card = (m) => `<article class="e"><header><b>${m.name}</b><span>${m.platform === 'shopify' ? 'Shopify' : 'Klaviyo'} · ${m.group}</span><small>${m.subject}</small></header>
<div class="frames"><figure><figcaption>Desktop 600</figcaption><iframe loading="lazy" src="html/${m.platform}/${m.id}.html" width="600" height="760" title="${m.name} desktop"></iframe></figure>
<figure class="m"><figcaption>Mobile 375</figcaption><iframe loading="lazy" src="html/${m.platform}/${m.id}.html" width="375" height="760" title="${m.name} mobile"></iframe></figure></div>
<p class="links"><a href="../dist/${m.platform}/${m.id}.html">HTML</a> · <a href="../dist/${m.platform}/${m.id}.txt">Text</a> · <a href="shots/${m.platform}/${m.id}-600.png">600 shot</a> · <a href="shots/${m.platform}/${m.id}-375.png">375 shot</a></p></article>`;
const groups = [...new Set(man.map((m) => m.platform + '|' + m.group))];
W('preview/index.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SNH emails</title>
<style>:root{--ink:#0E0E0E;--o:#BF4512;--c:#F6F4F1}body{margin:0;background:var(--c);color:var(--ink);font:16px/1.5 Inter,Helvetica,Arial,sans-serif}main{max-width:1180px;margin:0 auto;padding:24px 16px}h1{font-size:34px;margin:0 0 4px}h1 em{font-family:Georgia,serif;font-weight:400}h2{margin:40px 0 12px;font-size:22px;border-bottom:2px solid var(--o);padding-bottom:6px}nav{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0}nav a{padding:4px 10px;border:1px solid #ddd5c8;border-radius:999px;color:var(--ink);text-decoration:none;font-size:14px}.e{background:#fff;border:1px solid #e3dcd0;border-radius:16px;padding:16px;margin:16px 0}.e header{display:grid;gap:2px;margin-bottom:12px}.e header span{font-size:13px;color:#5C574F}.e header small{color:var(--o);font-weight:600}.frames{display:flex;gap:16px;overflow-x:auto}figure{margin:0}figcaption{font-size:12px;color:#5C574F;margin-bottom:4px}iframe{border:1px solid #e3dcd0;border-radius:10px;background:#fff}.links{font-size:14px;margin:10px 0 0}.links a{color:var(--o)}</style></head><body><main>
<h1>SNH <em>emails</em></h1><p>${man.length} emails · ${by('shopify').length} Shopify notifications · ${by('klaviyo').length} Klaviyo flows and campaigns. Previews use sample data; the files in <code>dist/</code> hold the real platform variables.</p>
<nav>${groups.map((g) => `<a href="#${g.replace(/\W+/g, '-')}">${g.split('|')[1]}</a>`).join('')}</nav>
${groups.map((g) => `<h2 id="${g.replace(/\W+/g, '-')}">${g.split('|')[0] === 'shopify' ? 'Shopify · ' : 'Klaviyo · '}${g.split('|')[1]}</h2>${man.filter((m) => m.platform + '|' + m.group === g).map(card).join('')}`).join('')}
</main></body></html>`);
console.log('docs written');
