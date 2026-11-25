// One font in Klaviyo emails: the serif accent → Inter 800 upright. Backs up every template's HTML first. node kl-fix.mjs [--live]
import fs from 'fs';
const LIVE = process.argv.includes('--live'); const K = process.env.KLAVIYO_KEY.replace(/[<>]/g, '');
const H = { Authorization: 'Klaviyo-API-Key ' + K, revision: '2025-10-15', accept: 'application/vnd.api+json', 'content-type': 'application/vnd.api+json' };
const call = async (u, init = {}) => { for (let i = 0; i < 8; i++) { const r = await fetch(u, { headers: H, ...init }); if (r.status === 429) { await new Promise((s) => setTimeout(s, 2000 * (i + 1))); continue; } return { status: r.status, j: await r.json().catch(() => ({})) }; } throw new Error('rate'); };
const BK = '/home/user/snh-theme/docs/golive/backup-klaviyo-2026-11-25/'; fs.mkdirSync(BK, { recursive: true });
const SANS = 'Inter, Helvetica, Arial, sans-serif';
const fixBody = (b) => { if (!/Instrument Serif|Georgia/i.test(b)) return b; return b.replace(/font-family:\s*[^;"}]*(Instrument Serif|Georgia)[^;"}]*/gi, 'font-family:' + SANS).replace(/font-style:\s*italic/gi, 'font-style:normal').replace(/font-weight:\s*(300|400|normal)\b/gi, 'font-weight:800'); };
const fixStyle = (b) => { const o = fixBody(b); return o !== b && !/font-style/i.test(o) ? o.replace(/;?\s*$/, ';font-style:normal') : o; };
export function fix(h) {
  let o = h.replace(/style="([^"]*)"/g, (m, v) => 'style="' + fixStyle(v) + '"').replace(/style='([^']*)'/g, (m, v) => "style='" + fixStyle(v) + "'");
  o = o.replace(/\{([^{}]*)\}/g, (m, v) => '{' + fixStyle(v) + '}');                 // <style> rules
  o = o.replace(/<link[^>]*Instrument\+Serif[^>]*>/gi, (m) => (/family=Inter/.test(m) ? m.replace(/&(amp;)?family=Instrument\+Serif[^&"']*/gi, '') : ''));
  o = o.replace(/family=Instrument\+Serif[^&"']*&(amp;)?/gi, '');
  return o;
}
const base = []; let url = 'https://a.klaviyo.com/api/templates/?fields[template]=name,html';
while (url) { const { j } = await call(url); for (const t of j.data) if (/Instrument Serif|Georgia/.test(t.attributes.html || '')) base.push({ id: t.id, name: t.attributes.name, html: t.attributes.html }); url = j.links && j.links.next; }
const flowT = JSON.parse(fs.readFileSync('kl-flow-templates.json', 'utf8')).filter((r) => r.serif);
for (const f of flowT) if (!base.some((b) => b.id === f.tid)) { const { j } = await call(`https://a.klaviyo.com/api/templates/${f.tid}/?fields[template]=name,html`); base.push({ id: f.tid, name: 'flow copy: ' + (f.where[0] || ''), html: j.data.attributes.html }); }
let changed = 0, left = 0; const log = [];
for (const t of base) {
  if (!fs.existsSync(BK + t.id + '.html')) fs.writeFileSync(BK + t.id + '.html', t.html);
  const n = fix(t.html); const still = (n.match(/Instrument Serif|Georgia|italic/gi) || []).length; left += still;
  log.push({ id: t.id, name: t.name, before: (t.html.match(/Instrument Serif/g) || []).length, after: still, bytes: n.length - t.html.length });
  if (n !== t.html) { changed++; if (LIVE) { const r = await call(`https://a.klaviyo.com/api/templates/${t.id}/`, { method: 'PATCH', body: JSON.stringify({ data: { type: 'template', id: t.id, attributes: { html: n } } }) }); log[log.length - 1].patch = r.status; } }
}
fs.writeFileSync(BK + 'index.json', JSON.stringify(log, null, 1)); console.log(LIVE ? 'LIVE' : 'DRY', 'templates', base.length, 'changed', changed, 'serif/italic left', left);
console.log(log.filter((l) => l.after || (l.patch && l.patch !== 200)).slice(0, 8));
