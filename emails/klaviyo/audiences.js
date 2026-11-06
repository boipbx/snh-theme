// Step 3: create missing lists + segments only (never edit / delete existing ones).
const { all, req, errText, sleep } = require('./kv');
const fs = require('fs'), path = require('path');
const statePath = path.join(__dirname, 'state.json'); const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
state.lists = state.lists || {}; state.segments = state.segments || {};
(async () => {
  const lists = await all('/lists/?fields[list]=name'); const lmap = new Map(lists.data.map((d) => [d.attributes.name, d.id]));
  for (const n of ['Newsletter', 'Quiz takers', 'Wholesale leads', 'Franchise leads']) {
    if (lmap.has(n)) { state.lists[n] = { id: lmap.get(n), existed: true }; console.log('list exists', n); continue; }
    const r = await req('POST', '/lists/', { data: { type: 'list', attributes: { name: n } } });
    if (r.status === 201) { state.lists[n] = { id: r.json.data.id, created: true }; console.log('list created', n, r.json.data.id); } else console.log('list FAILED', n, r.status, errText(r.json));
    await sleep(400);
  }
  const metrics = await all('/metrics/?fields[metric]=name,integration'); const mid = (name) => (metrics.data.find((m) => m.attributes.name === name) || {}).id;
  const opened = mid('Opened Email'), clicked = mid('Clicked Email'), received = mid('Received Email');
  const tier = (v) => ({ condition_groups: [{ conditions: [{ type: 'profile-property', property: "properties['loyalty_tier']", filter: { type: 'string', operator: 'equals', value: v } }] }] });
  const metricCond = (id, op, value, days) => ({ type: 'profile-metric', metric_id: id, measurement: 'count', measurement_filter: { type: 'numeric', operator: op, value }, timeframe_filter: { type: 'date', operator: 'in-the-last', quantity: days, unit: 'day' }, metric_filters: null });
  const defs = {
    'SNH Elite · Bronze': tier('Bronze'), 'SNH Elite · Silver': tier('Silver'), 'SNH Elite · Gold': tier('Gold'),
    'SNH · Engaged 90d': { condition_groups: [{ conditions: [metricCond(opened, 'greater-than', 0, 90), metricCond(clicked, 'greater-than', 0, 90)] }] },
    'SNH · Unengaged 180d': { condition_groups: [{ conditions: [metricCond(received, 'greater-than', 0, 180)] }, { conditions: [metricCond(opened, 'equals', 0, 180)] }, { conditions: [metricCond(clicked, 'equals', 0, 180)] }] },
  };
  const segs = await all('/segments/?fields[segment]=name'); const smap = new Map(segs.data.map((d) => [d.attributes.name, d.id]));
  for (const [n, def] of Object.entries(defs)) {
    if (smap.has(n)) { state.segments[n] = { id: smap.get(n), existed: true }; console.log('segment exists', n); continue; }
    const r = await req('POST', '/segments/', { data: { type: 'segment', attributes: { name: n, definition: def } } });
    if (r.status === 201) { state.segments[n] = { id: r.json.data.id, created: true }; console.log('segment created', n, r.json.data.id); } else { state.segments[n] = { failed: r.status + ' ' + errText(r.json) }; console.log('segment FAILED', n, r.status, errText(r.json)); }
    await sleep(600);
  }
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
})();
