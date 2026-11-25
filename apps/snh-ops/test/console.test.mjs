// Staff console: setup link, device registration, PIN login + lockout, idle lock, admin-only actions with PIN,
// point adjustment limits + ledger, redeem through the service in qa mode, audit CSV. Fake Shopify, in-memory D1.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { consoleFetch, makeSetupToken, normPhone, searchQuery, LIMITS } from '../src/console.mjs';
import { hashPin, validPin, PBKDF2_ITERATIONS, resetReady } from '../src/console-db.mjs';
const shop = 'sports-nutrition-hub.myshopify.com'; const T0 = Date.parse('2026-11-25T04:00:00Z');

function world() {
  resetReady();
  const db = new DatabaseSync(':memory:'); db.exec(fs.readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  const cfg = JSON.parse(fs.readFileSync(new URL('../config/example-store.json', import.meta.url), 'utf8')); cfg.redeem.qaCustomerIds = ['111'];
  db.prepare('INSERT INTO shops (shop, config) VALUES (?, ?)').run(shop, JSON.stringify(cfg));
  const stmt = (sql, a = []) => ({ sql, a, bind: (...x) => stmt(sql, x), run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...a).changes) } }),
    all: async () => ({ results: db.prepare(sql).all(...a) }), first: async () => db.prepare(sql).get(...a) || null });
  const W = { db, customers: new Map(), discounts: new Map(), calls: [] };
  W.env = { DB: { prepare: (s) => stmt(s), batch: async (l) => Promise.all(l.map((s) => (/^\s*(SELECT|PRAGMA)/i.test(s.sql) ? s.all() : s.run()))) }, SHOPIFY_CLIENT_ID: 'a', SHOPIFY_CLIENT_SECRET: 'b', REDEEM_MODE: 'qa', WELCOME_MODE: 'qa' };
  W.add = (id, o = {}) => W.customers.set(String(id), { id: 'gid://shopify/Customer/' + id, firstName: 'Q', lastName: 'A' + id, state: 'ENABLED', tags: ['qa-test'], email: `qa${id}@example.com`, phone: '+94770000' + String(id).padStart(3, '0'),
    mf: { loyalty_points: '3000', loyalty_tier: 'Bronze', annual_spend: '50000' }, dg: {}, ...o });
  const view = (c) => { const m = (k) => (c.mf[k] == null ? null : { value: c.mf[k], compareDigest: 'd' + (c.dg[k] || 0) });
    return { id: c.id, firstName: c.firstName, lastName: c.lastName, displayName: c.firstName + ' ' + c.lastName, state: c.state, tags: [...c.tags], createdAt: '2026-01-01', numberOfOrders: 2, amountSpent: { amount: '1000' },
      defaultEmailAddress: { emailAddress: c.email, marketingState: 'NOT_SUBSCRIBED' }, defaultPhoneNumber: { phoneNumber: c.phone }, lastOrder: null, firstName2: 1,
      pts: m('loyalty_points'), tier: m('loyalty_tier'), spend: m('annual_spend'), codes: m('reward_codes'), last: m('last_reward_code'), status: m('redeem_status'), bd1: null, bd2: null, orders: { nodes: [] } }; };
  W.fetch = async (url, init) => {
    url = String(url); const J = (o) => new Response(JSON.stringify(o), { headers: { 'Content-Type': 'application/json' } });
    if (url.includes('/oauth/access_token')) return J({ access_token: 't', expires_in: 3600 });
    if (url.includes('klaviyo')) return new Response('', { status: 202 });
    const { query, variables: v } = JSON.parse(init.body); const byId = (id) => W.customers.get(String(id).split('/').pop());
    if (query.includes('locations(')) return J({ data: { locations: { nodes: [{ name: 'Nugegoda', isActive: true }, { name: 'Dehiwala', isActive: true }, { name: 'Wattala', isActive: true }] } } });
    if (query.includes('discountCodeBasicCreate')) { const id = 'gid://shopify/DiscountCodeNode/' + (W.discounts.size + 1); W.discounts.set(v.d.code, { id, status: 'ACTIVE', used: 0, endsAt: v.d.endsAt }); return J({ data: { discountCodeBasicCreate: { codeDiscountNode: { id }, userErrors: [] } } }); }
    if (query.includes('codeDiscountNodeByCode')) { const d = W.discounts.get(v.c); return J({ data: { codeDiscountNodeByCode: d ? { id: d.id, codeDiscount: { status: d.status, asyncUsageCount: d.used, endsAt: d.endsAt } } : null } }); }
    if (query.includes('metafieldsSet')) { W.calls.push('set'); const c = byId(v.m[0].ownerId);
      for (const x of v.m) if (x.compareDigest !== undefined && x.compareDigest !== null) { const cur = c.mf[x.key] == null ? null : 'd' + (c.dg[x.key] || 0); if (cur !== x.compareDigest) return J({ data: { metafieldsSet: { metafields: [], userErrors: [{ message: 'stale', code: 'STALE_OBJECT' }] } } }); }
      for (const x of v.m) { c.mf[x.key] = x.value; c.dg[x.key] = (c.dg[x.key] || 0) + 1; } return J({ data: { metafieldsSet: { metafields: [], userErrors: [] } } }); }
    if (query.includes('tagsRemove')) { const c = byId(v.id); c.tags = c.tags.filter((t) => !v.t.includes(t)); return J({ data: { tagsRemove: { userErrors: [] } } }); }
    if (query.includes('tagsAdd')) { const c = byId(v.id); c.tags.push(...v.t); return J({ data: { tagsAdd: { userErrors: [] } } }); }
    if (query.includes('customerCreate')) { const id = String(900 + W.customers.size); W.add(id, { firstName: v.i.firstName, lastName: v.i.lastName || '', email: v.i.email, phone: v.i.phone, tags: v.i.tags, state: 'DISABLED', mf: {} }); W.calls.push('create'); return J({ data: { customerCreate: { customer: { id: 'gid://shopify/Customer/' + id }, userErrors: [] } } }); }
    if (query.includes('customerSendAccountInviteEmail')) { W.calls.push('invite'); byId(v.id).state = 'INVITED'; return J({ data: { customerSendAccountInviteEmail: { customer: { id: v.id }, userErrors: [] } } }); }
    if (query.includes('customerUpdate')) { const c = byId(v.i.id); for (const k of ['firstName', 'lastName', 'email', 'phone']) if (k in v.i) c[k] = v.i[k]; W.calls.push('update'); return J({ data: { customerUpdate: { customer: { id: c.id }, userErrors: [] } } }); }
    if (query.includes('customers(first')) { const q = v.q; const all = [...W.customers.values()];
      const hit = q.startsWith('phone:') ? all.filter((c) => c.phone === q.slice(7, -1)) : q.startsWith('email:') ? all.filter((c) => c.email === q.slice(7, -1)) : q.startsWith('tag:') ? all.filter((c) => c.tags.includes(q.slice(4))) : all.filter((c) => (c.firstName + ' ' + c.lastName).toLowerCase().includes(q.toLowerCase()));
      return J({ data: { customers: { nodes: hit.map(view) } } }); }
    if (query.includes('customer(id')) { const c = byId(v.id); return J({ data: { customer: c ? view(c) : null } }); }
    throw new Error('unexpected query ' + query.slice(0, 80));
  };
  return W;
}
// a tiny browser: keeps cookies, sends the X-SNH header
function browser(W) {
  const jar = new Map();
  const call = async (path, body, now = T0, method) => {
    const headers = { 'X-SNH': '1', 'Content-Type': 'application/json', 'CF-Connecting-IP': '10.0.0.1', Cookie: [...jar].map(([k, v]) => k + '=' + v).join('; ') };
    const req = new Request('https://snh-ops.example.workers.dev/console/api/' + path, { method: method || (body ? 'POST' : 'GET'), headers, body: body ? JSON.stringify(body) : undefined });
    const old = globalThis.fetch; globalThis.fetch = W.fetch; let r; try { r = await consoleFetch(req, W.env, {}, now); } finally { globalThis.fetch = old; }
    for (const c of r.headers.getSetCookie ? r.headers.getSetCookie() : []) { const [kv] = c.split(';'); const [k, v] = kv.split('='); if (/Max-Age=0/.test(c)) jar.delete(k); else jar.set(k, v); }
    const text = await r.text(); let j; try { j = JSON.parse(text); } catch (e) { j = text; } return { status: r.status, j, headers: r.headers };
  };
  return { call, jar };
}
async function adminReady(W) {
  const t = await makeSetupToken(W.env, shop, T0); const b = browser(W);
  const r = await b.call('setup', { token: t, name: 'Owner', location: 'Nugegoda', deviceName: 'Office PC', pin: '482915' }); assert.equal(r.status, 200, JSON.stringify(r.j)); return { b, token: t };
}

test('phone normalisation and search query', () => {
  assert.equal(normPhone('077 123 4567'), '+94771234567'); assert.equal(normPhone('771234567'), '+94771234567'); assert.equal(normPhone('+94 77 123-4567'), '+94771234567'); assert.equal(normPhone('0094771234567'), '+94771234567');
  assert.equal(searchQuery('0771234567'), 'phone:"+94771234567"'); assert.equal(searchQuery('A@B.lk'), 'email:"A@B.lk"'); assert.equal(searchQuery('kasun "perera"'), 'kasun perera');
});
test('PIN hashing: PBKDF2 100k, salted, weak PINs refused', async () => {
  assert.ok(PBKDF2_ITERATIONS >= 100000); const a = await hashPin('482915', 'aa'.repeat(16)); const b = await hashPin('482915', 'bb'.repeat(16)); assert.notEqual(a, b); assert.equal(a.length, 64);
  assert.ok(!validPin('111111')); assert.ok(!validPin('123456')); assert.ok(!validPin('12345')); assert.ok(validPin('482915'));
});
test('setup link: works once, sets device + session cookies, never stores the PIN', async () => {
  const W = world(); const { b, token } = await adminReady(W);
  assert.ok(b.jar.has('snh_dev') && b.jar.has('snh_ses'));
  const st = (await b.call('state')).j; assert.equal(st.session.staff.role, 'admin'); assert.equal(st.session.locked, false);
  const again = await browser(W).call('setup', { token, name: 'X', pin: '482916' }); assert.equal(again.status, 403);
  const row = W.db.prepare('SELECT * FROM staff').get(); assert.ok(!JSON.stringify(row).includes('482915')); assert.equal(row.pin_hash.length, 64);
  const tok = W.db.prepare('SELECT * FROM console_tokens').get(); assert.ok(!tok.token_hash.includes(token) && tok.used_at);
  assert.equal((await browser(W).call('setup', { token: await makeSetupToken(W.env, shop, T0), name: 'Y', pin: '482917' })).status, 409);   // an admin exists
});
test('unregistered device: only "register"; codes work once and expire', async () => {
  const W = world(); const { b } = await adminReady(W); const kiosk = browser(W);
  const s = await kiosk.call('state'); assert.equal(s.j.device, null); assert.equal(s.j.setupNeeded, false);
  assert.equal((await kiosk.call('search?q=qa')).status, 401); assert.equal((await kiosk.call('login', { staff_id: 'x', pin: '1' })).status, 401);
  assert.equal((await b.call('devices', { action: 'new', name: 'Wattala iPad', location: 'Wattala', pin: '000000' })).status, 401);           // wrong admin PIN
  const code = (await b.call('devices', { action: 'new', name: 'Wattala iPad', location: 'Wattala', pin: '482915' })).j.code; assert.match(code, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.equal((await kiosk.call('register', { code: 'ZZZZ-ZZZZ' })).status, 403);
  assert.equal((await kiosk.call('register', { code })).status, 200); assert.equal((await kiosk.call('state')).j.device.name, 'Wattala iPad');
  assert.equal((await browser(W).call('register', { code })).status, 403);                                                                       // used
  const late = (await b.call('devices', { action: 'new', name: 'Late', location: 'Wattala', pin: '482915' })).j.code;
  assert.equal((await browser(W).call('register', { code: late }, T0 + LIMITS.codeMs + 1000)).status, 403);                                   // expired
});
test('5 wrong PINs lock the person for 15 minutes; idle lock after 5 minutes', async () => {
  const W = world(); const { b } = await adminReady(W);
  await b.call('staff', { action: 'add', name: 'Nimal', role: 'staff', location: 'Dehiwala', newPin: '305819', pin: '482915' });
  const code = (await b.call('devices', { action: 'new', name: 'Dehiwala tab', location: 'Dehiwala', pin: '482915' })).j.code; const k = browser(W); await k.call('register', { code });
  const nimal = (await k.call('state')).j.staff.find((s) => s.name === 'Nimal');
  for (let i = 0; i < 4; i++) assert.equal((await k.call('login', { staff_id: nimal.id, pin: '111222' })).status, 401);
  const fifth = await k.call('login', { staff_id: nimal.id, pin: '111222' }); assert.equal(fifth.status, 423);
  assert.equal((await k.call('login', { staff_id: nimal.id, pin: '305819' })).status, 423);                                                       // right PIN, still locked
  const ok = await k.call('login', { staff_id: nimal.id, pin: '305819' }, T0 + LIMITS.lockMs + 1000); assert.equal(ok.status, 200);
  const t1 = T0 + LIMITS.lockMs + 2000; assert.equal((await k.call('meta', null, t1)).status, 200);
  const idle = await k.call('meta', null, t1 + LIMITS.idleMs + 1000); assert.equal(idle.status, 423); assert.equal(idle.j.locked, true);
  assert.equal((await k.call('unlock', { pin: '000000' }, t1 + LIMITS.idleMs + 2000)).status, 401);
  assert.equal((await k.call('unlock', { pin: '305819' }, t1 + LIMITS.idleMs + 3000)).status, 200); assert.equal((await k.call('meta', null, t1 + LIMITS.idleMs + 4000)).status, 200);
  assert.equal((await k.call('points', { id: '111', delta: 100, reason: 'Goodwill', pin: '305819' }, t1 + LIMITS.idleMs + 5000)).status, 403);       // staff cannot adjust
  const csv = (await k.call('audit.csv', null, t1 + LIMITS.idleMs + 6000)); assert.equal(csv.status, 403);
});
test('search, create (duplicate check, invite), edit with reason; all audited', async () => {
  const W = world(); W.add('111'); const { b } = await adminReady(W);
  const s = (await b.call('search?q=0770000111')).j; assert.equal(s.results.length, 1); assert.equal(s.results[0].points, 3000); assert.equal(s.results[0].status, 'enabled');
  const dup = await b.call('customer', { firstName: 'Dup', phone: '077 0000 111' }); assert.equal(dup.status, 409); assert.equal(dup.j.duplicates.length, 1);
  const cr = await b.call('customer', { firstName: 'QA', lastName: 'Two', phone: '0770000222', email: 'qa2@example.com', consent: false, qa: true }); assert.equal(cr.status, 200); assert.equal(cr.j.invite, 'sent');
  assert.deepEqual(W.customers.get(cr.j.id).tags.includes('qa-test'), true);
  assert.equal((await b.call('customer/update', { id: cr.j.id, lastName: 'Second' })).status, 400);                                             // reason needed
  const up = await b.call('customer/update', { id: cr.j.id, lastName: 'Second', reason: 'test' }); assert.equal(up.status, 200); assert.deepEqual(up.j.changed, ['lastName']);
  const acts = W.db.prepare('SELECT action FROM audit_log ORDER BY at').all().map((r) => r.action); for (const a of ['setup.first_admin', 'customer.search', 'customer.create', 'customer.update']) assert.ok(acts.includes(a), a);
  const upd = W.db.prepare(`SELECT before, after FROM audit_log WHERE action='customer.update'`).get(); assert.match(upd.before, /Two/); assert.match(upd.after, /Second/);
});
test('admin point adjust: PIN, reason, ±5,000 per change, 20,000 a day, ledger + audit, never below zero', async () => {
  const W = world(); W.add('111'); const { b } = await adminReady(W);
  assert.equal((await b.call('points', { id: '111', delta: 100, reason: 'Goodwill', pin: '999999' })).status, 401);
  assert.equal((await b.call('points', { id: '111', delta: 100, pin: '482915' })).status, 400);
  assert.equal((await b.call('points', { id: '111', delta: 5001, reason: 'Goodwill', pin: '482915' })).status, 400);
  assert.equal((await b.call('points', { id: '111', delta: -9000, reason: 'Correction', pin: '482915' })).status, 400);
  const p = await b.call('points', { id: '111', delta: 100, reason: 'Goodwill', note: 'QA test', pin: '482915' }); assert.equal(p.status, 200); assert.equal(p.j.after, 3100);
  const m = await b.call('points', { id: '111', delta: -100, reason: 'Correction', note: 'QA test', pin: '482915' }); assert.equal(m.j.after, 3000); assert.equal(W.customers.get('111').mf.loyalty_points, '3000');
  for (let i = 0; i < 3; i++) assert.equal((await b.call('points', { id: '111', delta: i % 2 ? -5000 : 5000, reason: 'Correction', pin: '482915' })).status, 200);
  assert.equal((await b.call('points', { id: '111', delta: 4900, reason: 'Correction', pin: '482915' })).status, 400);                            // 15,200 + 4,900 > 20,000
  const led = W.db.prepare(`SELECT * FROM points_ledger WHERE customer_id='111' ORDER BY at`).all(); assert.equal(led.length, 5); assert.equal(led[0].delta, 100); assert.equal(led[0].balance_before, 3000); assert.equal(led[0].staff_name, 'Owner');
  const card = (await b.call('customer?id=111')).j.customer; assert.equal(card.ledger.length, 5); assert.equal(W.customers.get('111').mf.loyalty_tier, 'Bronze');
});
test('counter redeem runs the redeem service: qa mode = QA customers only; code shown; ledger row; live cap respected', async () => {
  const W = world(); W.add('111'); W.add('222', { tags: [] }); W.add('333'); const { b } = await adminReady(W);
  assert.equal((await b.call('redeem', { id: '222' })).status, 403);                                                                            // not a QA customer
  const r = await b.call('redeem', { id: '111' }); assert.equal(r.status, 200, JSON.stringify(r.j)); assert.match(r.j.code, /^ELITE-/); assert.equal(r.j.pointsAfter, 500);
  assert.equal(W.customers.get('111').mf.loyalty_points, '500');
  const led = W.db.prepare(`SELECT * FROM points_ledger WHERE customer_id='111'`).get(); assert.equal(led.source, 'console-redeem'); assert.equal(led.delta, -2500); assert.equal(led.staff_name, 'Owner');
  const again = await b.call('redeem', { id: '111' }); assert.equal(again.status, 400);                                                         // 500 points left
  const tagged = await b.call('redeem', { id: '333' }); assert.equal(tagged.status, 200);                                                       // qa-test tag counts as QA
  W.env.REDEEM_MODE = 'off'; assert.equal((await b.call('redeem', { id: '333' })).status, 403);
});
test('audit CSV export (admin) is CSV with a header and guards formula cells', async () => {
  const W = world(); W.add('111'); const { b } = await adminReady(W); await b.call('customer/update', { id: '111', firstName: '=HYPERLINK("x")', reason: 'test' });
  const r = await b.call('audit.csv'); assert.equal(r.status, 200); assert.match(r.headers.get('Content-Type'), /text\/csv/); assert.match(r.j, /^time_colombo,staff,role/); assert.ok(!/,=HYPERLINK/.test(r.j));
});
test('writes need the X-SNH header', async () => {
  const W = world(); const req = new Request('https://x/console/api/login', { method: 'POST', body: '{}' }); const r = await consoleFetch(req, W.env, {}, T0); assert.equal(r.status, 400);
});
