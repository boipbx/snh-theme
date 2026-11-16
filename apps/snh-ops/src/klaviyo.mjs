// Klaviyo, READ-ONLY: per-flow daily stats for the last year (emails received, opened, clicked, and order revenue
// Klaviyo attributes to the flow). metric-aggregates is a POST but only reads. Fetched during a sync and cached.
const K = async (env, method, path, body) => { const r = await fetch('https://a.klaviyo.com/api' + path, { method, headers: { Authorization: 'Klaviyo-API-Key ' + env.KLAVIYO_KEY, revision: '2025-10-15', 'Content-Type': 'application/vnd.api+json', accept: 'application/vnd.api+json' }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error('Klaviyo ' + r.status); return r.json(); };
// which flows count as "ours": live, and (when a prefix is set) named with it
export const isOwnFlow = (f, prefix) => f.status === 'live' && (!prefix || String(f.name || '').toLowerCase().startsWith(String(prefix).toLowerCase()));
export async function klaviyoData(env, now = Date.now(), cfg = {}) {
  if (!env.KLAVIYO_KEY) return { configured: false, flows: [] };
  const flows = new Map((await K(env, 'GET', '/flows/?fields[flow]=name,status&page[size]=50')).data.map((f) => [f.id, { id: f.id, name: f.attributes.name, status: f.attributes.status, own: isOwnFlow(f.attributes, cfg.klaviyoFlowPrefix), d: new Map() }]));
  const metrics = (await K(env, 'GET', '/metrics/?fields[metric]=name,integration')).data;
  const id = (n, integ) => (metrics.find((m) => m.attributes.name === n && (!integ || ((m.attributes.integration || {}).name === integ))) || {}).id;
  const iso = (t) => new Date(t).toISOString().slice(0, 19); let revenue = false;
  // [field index in a day row, metric, measurement, group by]
  const jobs = [[0, id('Received Email'), 'count', '$flow'], [1, id('Opened Email'), 'unique', '$flow'], [2, id('Clicked Email'), 'unique', '$flow'], [3, id('Placed Order', 'Shopify') || id('Placed Order'), 'sum_value', '$attributed_flow']];
  for (const [idx, metric, measure, by] of jobs) {
    if (!metric) continue;
    let r; try { r = await K(env, 'POST', '/metric-aggregates/', { data: { type: 'metric-aggregate', attributes: { metric_id: metric, measurements: [measure], interval: 'day', by: [by], filter: [`greater-or-equal(datetime,${iso(now - 364 * 864e5)})`, `less-than(datetime,${iso(now)})`] } } }); }
    catch (e) { if (idx === 3) continue; throw e; }
    if (idx === 3) revenue = true; const dates = r.data.attributes.dates.map((d) => d.slice(0, 10));
    for (const x of r.data.attributes.data) { const f = flows.get(x.dimensions[0]); if (!f) continue;
      x.measurements[measure].forEach((v, i) => { v = Number(v); if (!v) return; let e = f.d.get(dates[i]); if (!e) { e = [0, 0, 0, 0]; f.d.set(dates[i], e); } e[idx] += v; }); }
  }
  // p: [day, received, opened, clicked, revenue], only days with activity
  return { configured: true, revenue, prefix: cfg.klaviyoFlowPrefix || '', flows: [...flows.values()].map((f) => ({ id: f.id, name: f.name, status: f.status, own: f.own, p: [...f.d].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([day, v]) => [day, v[0], v[1], v[2], Math.round(v[3] * 100) / 100]) })) };
}
