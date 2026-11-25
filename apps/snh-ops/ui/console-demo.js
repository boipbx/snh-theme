// SNH Staff DEMO: a read-only preview of the console. Everything below is FAKE sample data made in the browser:
// no real customers, no Shopify calls, no writes anywhere. Buttons work visually and change only this page's memory
// (a reload resets it). Served only on /console/demo with a valid demo token.
(function () {
  'use strict';
  let seed = 20261125; const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const pick = (a) => a[Math.floor(rnd() * a.length)]; const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const FIRST = ['Amal', 'Nadeesha', 'Kasun', 'Ishara', 'Tharindu', 'Dilini', 'Ravindu', 'Sachini', 'Chamod', 'Hiruni', 'Pasan', 'Nethmi', 'Dinuka', 'Ruvini', 'Sahan', 'Kavindya', 'Malith', 'Oshadi', 'Yasiru', 'Tharushi'];
  const LAST = ['Demo', 'Sample', 'Example', 'Testa', 'Placeholder'];
  const LOCS = ['Nugegoda', 'Dehiwala', 'Wattala'];
  const now = Date.now(); const day = 864e5; const iso = (t) => new Date(t).toISOString();
  const tierOf = (s) => (s >= 300000 ? 'Gold' : s >= 198000 ? 'Silver' : 'Bronze');
  const customers = [];
  for (let i = 0; i < 36; i++) {
    const f = FIRST[i % FIRST.length], l = pick(LAST); const spend = i < 3 ? int(300000, 420000) : i < 8 ? int(198000, 290000) : int(0, 190000);
    const pts = i === 0 ? 4120 : i === 1 ? 2650 : int(0, 3400); const status = i % 9 === 4 ? 'invited' : i % 11 === 7 ? 'no account' : 'enabled';
    const orders = []; for (let k = 0, n = int(0, 5); k < n; k++) orders.push({ name: '#DEMO' + (1000 + i * 7 + k), at: iso(now - int(2, 300) * day), total: int(4, 60) * 500, location: pick([...LOCS, 'Online']), cancelled: false });
    orders.sort((a, b) => (a.at < b.at ? 1 : -1));
    const ledger = []; let bal = pts;
    for (let k = 0, n = int(1, 4); k < n; k++) { const d = pick([+500, +120, +860, -2500, +100]); ledger.push({ at: now - int(1, 60) * day, delta: d, balance_before: bal - d, balance_after: bal, source: d === -2500 ? 'redeem' : d === 500 ? 'welcome' : 'console-adjust', reason: d === -2500 ? 'Redeemed for ELITE-DEMO' + k : d === 500 ? 'Welcome points on account activation' : 'Goodwill: demo entry', staff_name: d === 500 || d === -2500 ? null : 'Demo Admin', location: pick(LOCS) }); bal -= d; }
    ledger.sort((a, b) => b.at - a.at);
    customers.push({ id: String(900000000 + i * 137), name: f + ' ' + l, firstName: f, lastName: l, phone: '+9470000' + String(1000 + i).slice(-4), email: (f + '.' + l).toLowerCase() + '@example.com',
      consent: i % 3 ? 'SUBSCRIBED' : 'NOT_SUBSCRIBED', status, state: status === 'enabled' ? 'ENABLED' : status === 'invited' ? 'INVITED' : 'DISABLED', points: pts, value: pts, tier: status === 'enabled' ? tierOf(spend) : '',
      annualSpend: spend, qa: false, birthday: i % 4 ? '' : '199' + (i % 10) + '-0' + ((i % 9) + 1) + '-1' + (i % 9), orderCount: orders.length, lastOrder: orders[0] ? { name: orders[0].name, at: orders[0].at } : null,
      _orders: orders, ledger, codes: i === 2 ? [{ code: 'ELITE-DEMO42', value: 2500 }] : [] });
  }
  const tierInfo = (c) => { const next = c.annualSpend >= 300000 ? null : c.annualSpend >= 198000 ? ['Gold', 300000] : ['Silver', 198000]; return { next: next ? next[0] : null, toNext: next ? next[1] - c.annualSpend : 0, progress: next ? c.annualSpend / next[1] : 1 }; };
  const card = (c) => ({ ...c, ...tierInfo(c), orders: c._orders, adminUrl: '#', canRedeem: c.status === 'enabled' && c.points >= 2500 });
  const brief = (c) => { const { _orders, ledger, codes, ...rest } = c; return { ...rest, ...tierInfo(c) }; };
  const staff = [{ id: 's1', name: 'Demo Admin', role: 'admin', location: 'Nugegoda', active: true, locked: false }, { id: 's2', name: 'Counter Staff A', role: 'staff', location: 'Dehiwala', active: true, locked: false },
    { id: 's3', name: 'Counter Staff B', role: 'staff', location: 'Wattala', active: true, locked: false }, { id: 's4', name: 'Former Staff', role: 'staff', location: 'Nugegoda', active: false, locked: false }];
  const devices = [{ id: 'd1', name: 'Demo tablet', location: 'Nugegoda', status: 'active', registered_at: now - 3 * day, last_seen: now }, { id: 'd2', name: 'Dehiwala counter iPad', location: 'Dehiwala', status: 'active', registered_at: now - 2 * day, last_seen: now - 3600e3 },
    { id: 'd3', name: 'Wattala CloudPOS PC', location: 'Wattala', status: 'pending', code_expires: now + 20 * 3600e3 }];
  const audit = []; const ACTS = ['customer.search', 'customer.view', 'customer.create', 'customer.update', 'redeem.counter', 'points.adjust', 'login', 'unlock'];
  for (let i = 0; i < 40; i++) { const c = pick(customers); const a = pick(ACTS); audit.push({ at: now - i * 2.7 * 3600e3, staff_name: pick(staff.slice(0, 3)).name, device_name: pick(devices).name, location: pick(LOCS), action: a, customer_id: /customer|redeem|points/.test(a) ? c.id : null, reason: a === 'points.adjust' ? 'Goodwill: demo entry' : '', before: a === 'points.adjust' ? '{"points":1200}' : null, after: a === 'points.adjust' ? '{"points":1300}' : null, ok: 1 }); }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const find = (id) => customers.find((c) => c.id === String(id));
  const code = () => 'DEMO-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  const log = (action, customer_id, reason) => audit.unshift({ at: Date.now(), staff_name: 'Demo Admin', device_name: 'Demo tablet', location: 'Nugegoda', action, customer_id: customer_id || null, reason: (reason || '') + ' (demo: nothing saved)', ok: 1 });
  async function api(path, opts = {}) {
    await wait(180 + Math.random() * 160); const [p, qs] = path.split('?'); const q = new URLSearchParams(qs || ''); const b = opts.body || {}; const post = (opts.method || 'GET') === 'POST';
    const fail = (msg) => { throw Object.assign(new Error(msg), {}); };
    switch (p) {
      case 'state': return { device: { id: 'd1', name: 'Demo tablet', location: 'Nugegoda' }, staff, session: { staff: staff[0], locked: false }, idleMs: 864e5, redeemMode: 'demo' };
      case 'meta': return { locations: LOCS, reasons: ['Missed order points', 'Goodwill', 'Correction', 'Other'], consentText: 'Yes, send me SNH offers, Elite rewards and new arrivals by email. I can unsubscribe at any time.',
        limits: { adjustMax: 5000, adjustDay: 20000 }, me: staff[0], device: { name: 'Demo tablet', location: 'Nugegoda' }, redeem: { mode: 'live', points: 2500, value: 2500, minOrder: 2501 } };
      case 'search': { const t = (q.get('q') || '').toLowerCase().replace(/[\s-]/g, ''); log('customer.search', null, t);
        return { results: customers.filter((c) => (c.name + c.email + c.phone).toLowerCase().replace(/[\s-]/g, '').includes(t.replace(/^0/, '')) || t.length < 3).slice(0, 15).map(brief), query: q.get('q') }; }
      case 'customer':
        if (!post) { const c = find(q.get('id')); if (!c) fail('Customer not found.'); return { customer: card(c) }; }
        { if (!b.firstName) fail('Enter a first name.'); const c = { ...customers[5], id: String(990000000 + customers.length), name: b.firstName + ' ' + (b.lastName || ''), firstName: b.firstName, lastName: b.lastName || '', email: b.email || '', phone: b.phone || '', points: 0, value: 0, status: b.email ? 'invited' : 'no account', tier: '', annualSpend: 0, _orders: [], ledger: [], codes: [], lastOrder: null, orderCount: 0 };
          customers.unshift(c); log('customer.create', c.id); return { ok: true, id: c.id, invite: b.email ? 'not sent (demo)' : 'not sent (no email)' }; }
      case 'customer/update': { const c = find(b.id); if (!b.reason) fail('Say briefly why (for the log).'); const ch = []; for (const k of ['firstName', 'lastName', 'phone', 'email', 'birthday']) if (b[k] !== undefined && b[k] !== c[k]) { c[k] = b[k]; ch.push(k); } c.name = c.firstName + ' ' + c.lastName; log('customer.update', c.id, b.reason); return ch.length ? { ok: true, changed: ch } : { ok: true, unchanged: true }; }
      case 'redeem': { const c = find(b.id); if (c.points < 2500) fail('Needs 2,500 points.'); const k = code(); c.ledger.unshift({ at: Date.now(), delta: -2500, balance_before: c.points, balance_after: c.points - 2500, source: 'console-redeem', reason: 'Redeemed for ' + k, staff_name: 'Demo Admin', location: 'Nugegoda' });
        c.points -= 2500; c.value = c.points; c.codes = [{ code: k, value: 2500 }]; log('redeem.counter', c.id); return { ok: true, code: k, value: 2500, minOrder: 2501, expires: iso(Date.now() + 90 * day), pointsAfter: c.points }; }
      case 'points': { const c = find(b.id); const d = Math.round(Number(b.delta)); if (!b.reason) fail('Pick a reason.'); if (Math.abs(d) > 5000) fail('At most 5,000 points per change.'); if (c.points + d < 0) fail('Only ' + c.points + ' points to take from.');
        c.ledger.unshift({ at: Date.now(), delta: d, balance_before: c.points, balance_after: c.points + d, source: 'console-adjust', reason: b.reason + (b.note ? ': ' + b.note : ''), staff_name: 'Demo Admin', location: 'Nugegoda' }); const before = c.points; c.points += d; c.value = c.points; log('points.adjust', c.id, b.reason); return { ok: true, before, after: c.points }; }
      case 'staff': if (!post) return { staff };
        if (b.action === 'add') staff.push({ id: 's' + (staff.length + 1), name: b.name, role: b.role, location: b.location, active: true, locked: false });
        else { const s = staff.find((x) => x.id === b.staff_id); if (b.action === 'disable') s.active = false; if (b.action === 'enable') s.active = true; if (b.action === 'update') s.role = b.role; }
        log('staff.' + b.action); return { ok: true };
      case 'devices': if (!post) return { devices, current: 'd1' };
        if (b.action === 'new') { devices.unshift({ id: 'd' + (devices.length + 1), name: b.name, location: b.location, status: 'pending', code_expires: Date.now() + day }); log('device.code_created'); return { ok: true, code: 'DEMO-CODE', expires: Date.now() + day }; }
        { const d = devices.find((x) => x.id === b.device_id); if (d) d.status = 'revoked'; log('device.revoke'); return { ok: true }; }
      case 'audit': return { rows: audit.slice(0, 300), total: audit.length };
      case 'unlock': case 'logout': case 'login': return { ok: true };
      default: fail('Not available in the demo.');
    }
  }
  function csv() { const head = 'time,staff,device,location,action,customer_id,reason'; const rows = audit.map((r) => [new Date(r.at).toISOString(), r.staff_name, r.device_name, r.location, r.action, r.customer_id || '', r.reason || ''].map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(','));
    return URL.createObjectURL(new Blob([[head, ...rows].join('\n')], { type: 'text/csv' })); }
  window.SNHDemo = { api, csv };
})();
