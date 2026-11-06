// Step 2: create every Klaviyo email as a CODE template "SNH · <flow> · <email>"; skip existing names; verify by GET.
const { all, req, errText, sleep } = require('./kv');
const fs = require('fs'), path = require('path');
const man = require('../manifest.json').filter((m) => m.platform === 'klaviyo');
const ROOT = path.join(__dirname, '..', '..');
const statePath = path.join(__dirname, 'state.json');
const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {};
state.templates = state.templates || {};
const tname = (m) => `SNH · ${m.group} · ${m.name.replace(/^[^:]+: /, (x) => (x.toLowerCase().startsWith(m.group.toLowerCase().split(' ')[0]) ? '' : x))}`.slice(0, 120);
(async () => {
  const ex = await all('/templates/?fields[template]=name');
  const byName = new Map(ex.data.map((d) => [d.attributes.name, d.id]));
  let created = 0, skipped = 0, failed = 0;
  for (const m of man) {
    const name = tname(m);
    if (byName.has(name)) { state.templates[m.id] = { id: byName.get(name), name }; skipped++; continue; }
    const html = fs.readFileSync(path.join(ROOT, m.html), 'utf8'), text = fs.readFileSync(path.join(ROOT, m.text), 'utf8');
    const r = await req('POST', '/templates/', { data: { type: 'template', attributes: { name, editor_type: 'CODE', html, text } } });
    if (r.status === 201) { const id = r.json.data.id; const g = await req('GET', `/templates/${id}/?fields[template]=name,editor_type,html`); const ok = g.status === 200 && g.json.data.attributes.name === name && (g.json.data.attributes.html || '').length > 1000; state.templates[m.id] = { id, name, verified: ok }; created++; console.log('created', ok ? 'verified' : 'UNVERIFIED', id, name); }
    else { failed++; console.log('FAILED', m.id, r.status, errText(r.json)); }
    await sleep(300);
  }
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  console.log({ created, skipped, failed });
})();
