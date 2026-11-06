// Step 4: create the SNH flows as DRAFT (flow + every email draft). Never touches existing flows. Skips a flow whose
// name already exists. ONLY=<key> builds one flow.
const { all, req, errText, sleep } = require('./kv');
const fs = require('fs'), path = require('path');
const statePath = path.join(__dirname, 'state.json'); const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
state.flows = state.flows || {};
const man = Object.fromEntries(require('../manifest.json').map((m) => [m.id, m]));
const FROM = { from_email: 'support@sportsnutritionhub.lk', from_label: 'Sports Nutrition Hub - SNH' };
(async () => {
  const metrics = await all('/metrics/?fields[metric]=name,integration');
  const mid = (name, integ) => { const m = metrics.data.find((x) => x.attributes.name === name && (!integ || (x.attributes.integration || {}).name === integ)) || metrics.data.find((x) => x.attributes.name === name); return m && m.id; };
  const M = { placed: mid('Placed Order', 'Shopify'), fulfilled: mid('Fulfilled Order', 'Shopify'), added: mid('Added to Cart'), checkout: mid('Checkout Started'), viewed: mid('Viewed Product'), ordered: mid('Ordered Product') };
  const zeroSince = (id) => ({ type: 'profile-metric', metric_id: id, measurement: 'count', measurement_filter: { type: 'numeric', operator: 'equals', value: 0 }, timeframe_filter: { type: 'date', operator: 'flow-start' }, metric_filters: null });
  const filter = (...ids) => ({ condition_groups: ids.map((id) => ({ conditions: [zeroSince(id)] })) });
  const L = state.lists, S = state.segments;
  // steps: ['wait', n, unit] | ['email', manifestId, { transactional, smart }]
  const FLOWS = {
    welcome: { name: 'SNH · Welcome series', trigger: { type: 'list', id: L['Newsletter'].id }, filter: filter(M.placed), steps: [['email', 'welcome-1'], ['wait', 2, 'days'], ['email', 'welcome-2'], ['wait', 2, 'days'], ['email', 'welcome-3']] },
    cart: { name: 'SNH · Abandoned cart', trigger: { type: 'metric', id: M.added }, filter: filter(M.checkout, M.placed), steps: [['wait', 2, 'hours'], ['email', 'cart-1'], ['wait', 1, 'days'], ['email', 'cart-2'], ['wait', 2, 'days'], ['email', 'cart-3']] },
    checkout: { name: 'SNH · Abandoned checkout', trigger: { type: 'metric', id: M.checkout }, filter: filter(M.placed), steps: [['wait', 1, 'hours'], ['email', 'checkout-1'], ['wait', 1, 'days'], ['email', 'checkout-2']] },
    browse: { name: 'SNH · Browse abandonment', trigger: { type: 'metric', id: M.viewed }, filter: filter(M.added, M.placed), steps: [['wait', 4, 'hours'], ['email', 'browse-1'], ['wait', 2, 'days'], ['email', 'browse-2']] },
    post: { name: 'SNH · Post-purchase', trigger: { type: 'metric', id: M.placed }, steps: [['wait', 1, 'hours'], ['email', 'post-thanks'], ['wait', 14, 'days'], ['email', 'cross-sell']] },
    review: { name: 'SNH · Review request', trigger: { type: 'metric', id: M.fulfilled }, steps: [['wait', 7, 'days'], ['email', 'review-request']] },
    howto: { name: 'SNH · How to use', trigger: { type: 'metric', id: M.fulfilled }, steps: [['wait', 3, 'days'], ['email', 'howto-protein']], note: 'protein only (the category split is manual)' },
    replenish: { name: 'SNH · Replenishment', trigger: { type: 'metric', id: M.placed }, filter: filter(M.placed), steps: [['wait', 25, 'days'], ['email', 'replenishment']] },
    winback: { name: 'SNH · Win-back', trigger: { type: 'metric', id: M.placed }, filter: filter(M.placed), steps: [['wait', 90, 'days'], ['email', 'winback-1'], ['wait', 14, 'days'], ['email', 'winback-2']] },
    sunset: { name: 'SNH · Sunset', trigger: { type: 'segment', id: S['SNH · Unengaged 180d'] && S['SNH · Unengaged 180d'].id }, steps: [['email', 'sunset']] },
    wholesale: { name: 'SNH · Wholesale enquiry reply', trigger: { type: 'list', id: L['Wholesale leads'].id }, steps: [['email', 'wholesale-autoreply', { smart: false }]] },
    franchise: { name: 'SNH · Franchise enquiry reply', trigger: { type: 'list', id: L['Franchise leads'].id }, steps: [['email', 'franchise-autoreply', { smart: false }]] },
  };
  const existing = await all('/flows/?fields[flow]=name,status'); const names = new Set(existing.data.map((d) => d.attributes.name));
  for (const [key, f] of Object.entries(FLOWS)) {
    if (process.env.ONLY && process.env.ONLY !== key) continue;
    if (names.has(f.name)) { console.log('exists, skipped', f.name); continue; }
    const actions = f.steps.map((s, i) => {
      const id = String(i + 1), next = i + 1 < f.steps.length ? String(i + 2) : null;
      if (s[0] === 'wait') return { temporary_id: id, type: 'time-delay', data: { unit: s[2], value: s[1], secondary_value: 0, timezone: 'profile' }, links: { next } };
      const m = man[s[1]], o = s[2] || {}, t = state.templates[s[1]];
      return { temporary_id: id, type: 'send-email', data: { message: { ...FROM, subject_line: m.subject, preview_text: m.preheader, template_id: t.id, smart_sending_enabled: o.smart !== false, transactional: false, add_tracking_params: true, name: m.name }, status: 'draft' }, links: { next } };
    });
    const body = { data: { type: 'flow', attributes: { name: f.name, definition: { triggers: [{ ...f.trigger }], profile_filter: f.filter || null, actions, entry_action_id: '1' } } } };
    const r = await req('POST', '/flows/', body);
    if (r.status === 201) { const d = r.json.data; state.flows[key] = { id: d.id, name: f.name, status: d.attributes.status, note: f.note }; console.log('created', d.id, d.attributes.status, f.name); }
    else { state.flows[key] = { failed: r.status + ' ' + errText(r.json), name: f.name }; console.log('FAILED', f.name, r.status, errText(r.json)); }
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2)); await sleep(1500);
  }
})();
