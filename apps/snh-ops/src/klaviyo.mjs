// Klaviyo, READ-ONLY: last-7-day flow stats (sent, opened, clicked). metric-aggregates is a POST but only reads.
const K = async (env, method, path, body) => { const r = await fetch('https://a.klaviyo.com/api' + path, { method, headers: { Authorization: 'Klaviyo-API-Key ' + env.KLAVIYO_KEY, revision: '2025-10-15', 'Content-Type': 'application/vnd.api+json', accept: 'application/vnd.api+json' }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error('Klaviyo ' + r.status); return r.json(); };
export async function flowStats(env, now = Date.now()) {
  if (!env.KLAVIYO_KEY) return { configured: false, rows: [] };
  const flows = (await K(env, 'GET', '/flows/?fields[flow]=name,status&page[size]=50')).data; const names = new Map(flows.map((f) => [f.id, f.attributes]));
  const metrics = (await K(env, 'GET', '/metrics/?fields[metric]=name')).data; const id = (n) => (metrics.find((m) => m.attributes.name === n) || {}).id;
  const iso = (t) => new Date(t).toISOString().slice(0, 19); const rows = new Map();
  for (const [key, name] of [['sent', 'Received Email'], ['opened', 'Opened Email'], ['clicked', 'Clicked Email']]) {
    if (!id(name)) continue;
    const r = await K(env, 'POST', '/metric-aggregates/', { data: { type: 'metric-aggregate', attributes: { metric_id: id(name), measurements: [key === 'sent' ? 'count' : 'unique'], interval: 'week', by: ['$flow'], filter: [`greater-or-equal(datetime,${iso(now - 7 * 864e5)})`, `less-than(datetime,${iso(now)})`] } } });
    for (const x of r.data.attributes.data) { const f = x.dimensions[0]; if (!f || !names.has(f)) continue; const e = rows.get(f) || { flow: names.get(f).name, status: names.get(f).status, sent: 0, opened: 0, clicked: 0 }; e[key] = Object.values(x.measurements)[0].reduce((a, b) => a + Number(b), 0); rows.set(f, e); }
  }
  return { configured: true, rows: [...rows.values()].sort((a, b) => b.sent - a.sent) };
}
