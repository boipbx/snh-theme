// Step 1 (read-only): flows, lists, segments, metrics, templates; Shopify metrics; sample profile properties.
const { all, req, errText } = require('./kv');
const fs = require('fs'), path = require('path');
(async () => {
  const out = {};
  for (const [k, p] of [['flows', '/flows/?fields[flow]=name,status,trigger_type,created,updated'], ['lists', '/lists/?fields[list]=name,created'], ['segments', '/segments/?fields[segment]=name,created,is_active'], ['metrics', '/metrics/?fields[metric]=name,integration'], ['templates', '/templates/?fields[template]=name,editor_type,created']]) {
    const r = await all(p); out[k] = r.status === 200 ? r.data.map((d) => ({ id: d.id, ...d.attributes })) : { error: r.status + ' ' + errText(r.error) };
    console.log(k, Array.isArray(out[k]) ? out[k].length : out[k].error);
  }
  // sample profiles: which custom properties exist
  const pr = await req('GET', '/profiles/?page[size]=50&fields[profile]=properties,created');
  const props = {}; let n = 0;
  if (pr.status === 200) for (const d of pr.json.data) { n++; for (const k of Object.keys(d.attributes.properties || {})) props[k] = (props[k] || 0) + 1; }
  out.profileSample = { status: pr.status, profiles: n, properties: props };
  fs.writeFileSync(path.join(__dirname, 'inventory.json'), JSON.stringify(out, null, 2));
  console.log('profiles sampled', n, 'props', Object.keys(props).length);
})();
