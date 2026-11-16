// Redeem + welcome service against a fake Shopify (no network): modes, one code per request, no double deduction, rollback, cap.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { runRedeem, runWelcome, processCustomer, redeemCfg, newCode, mode, allowed, redeemStatus } from '../src/redeem.mjs';
import * as M from '../src/metrics.mjs';
const shop = 'demo-store.myshopify.com'; const QA = '111'; const NOW = Date.parse('2026-11-16T06:00:00Z');
function world() {
  const db = new DatabaseSync(':memory:'); db.exec(fs.readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  const cfg = JSON.parse(fs.readFileSync(new URL('../config/example-store.json', import.meta.url), 'utf8')); cfg.redeem.qaCustomerIds = [QA]; cfg.redeem.welcome.qaCustomerIds = ['555'];
  db.prepare('INSERT INTO shops (shop, config) VALUES (?, ?)').run(shop, JSON.stringify(cfg));
  const stmt = (sql, a = []) => ({ bind: (...x) => stmt(sql, x), run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...a).changes) } }), all: async () => ({ results: db.prepare(sql).all(...a) }), first: async () => db.prepare(sql).get(...a) || null });
  const W = { db, customers: new Map(), discounts: new Map(), events: [], calls: [], failDeduct: false, raceOnDeduct: null, digest: 0,
    env: { DB: { prepare: (s) => stmt(s) }, SHOPIFY_CLIENT_ID: 'a', SHOPIFY_CLIENT_SECRET: 'b', KLAVIYO_KEY: 'k', REDEEM_MODE: 'qa', WELCOME_MODE: 'qa' } };
  W.add = (id, o) => W.customers.set(String(id), { id: 'gid://shopify/Customer/' + id, state: 'ENABLED', tags: ['Trigger_Redeem_2500'], email: id + '@example.com', mf: { loyalty_points: '2600', loyalty_tier: 'Bronze' }, dg: {}, ...o });
  const view = (c) => { const m = (k) => (c.mf[k] == null ? null : { value: c.mf[k], compareDigest: 'd' + (c.dg[k] || 0) });
    return { id: c.id, state: c.state, tags: [...c.tags], firstName: 'T', defaultEmailAddress: { emailAddress: c.email }, pts: m('loyalty_points'), tier: m('loyalty_tier'), last: m('last_reward_code'), codes: m('reward_codes'), status: m('redeem_status'), updatedAt: '2026-11-16T05:59:00Z' }; };
  W.fetch = async (url, init) => {
    url = String(url); const J = (o) => new Response(JSON.stringify(o), { headers: { 'Content-Type': 'application/json' } });
    if (url.includes('/oauth/access_token')) return J({ access_token: 't', expires_in: 3600 });
    if (url.includes('klaviyo.com')) { W.events.push(JSON.parse(init.body).data.attributes); return new Response('', { status: 202 }); }
    const { query, variables: v } = JSON.parse(init.body); const byId = (id) => W.customers.get(String(id).split('/').pop());
    if (query.includes('discountCodeBasicCreate')) { W.calls.push('create'); const d = v.d; assert.ok(d.code.startsWith('ELITE-')); const id = 'gid://shopify/DiscountCodeNode/' + (W.discounts.size + 1); W.discounts.set(d.code, { id, input: d, status: 'ACTIVE', used: 0 }); return J({ data: { discountCodeBasicCreate: { codeDiscountNode: { id }, userErrors: [] } } }); }
    if (query.includes('discountCodeDeactivate')) { W.calls.push('deactivate'); for (const d of W.discounts.values()) if (d.id === v.id) d.status = 'EXPIRED'; return J({ data: { discountCodeDeactivate: { userErrors: [] } } }); }
    if (query.includes('codeDiscountNodeByCode')) { const d = W.discounts.get(v.c); return J({ data: { codeDiscountNodeByCode: d ? { id: d.id, codeDiscount: { status: d.status, asyncUsageCount: d.used, endsAt: d.input.endsAt } } : null } }); }
    if (query.includes('metafieldsSet')) { W.calls.push('set');
      const c = byId(v.m[0].ownerId); if (W.raceOnDeduct && v.m.some((x) => x.key === 'loyalty_points')) { W.raceOnDeduct(c); W.raceOnDeduct = null; }
      if (W.failDeduct && v.m.some((x) => x.key === 'loyalty_points')) return J({ data: { metafieldsSet: { metafields: [], userErrors: [{ message: 'boom', code: 'INTERNAL' }] } } });
      for (const x of v.m) if (x.compareDigest !== undefined) { const cur = c.mf[x.key] == null ? null : 'd' + (c.dg[x.key] || 0); if (cur !== x.compareDigest) return J({ data: { metafieldsSet: { metafields: [], userErrors: [{ message: 'stale', code: 'STALE_OBJECT' }] } } }); }
      for (const x of v.m) { c.mf[x.key] = x.value; c.dg[x.key] = (c.dg[x.key] || 0) + 1; } return J({ data: { metafieldsSet: { metafields: v.m.map((x) => ({ key: x.key })), userErrors: [] } } }); }
    if (query.includes('tagsRemove')) { const c = byId(v.id); c.tags = c.tags.filter((t) => !v.t.includes(t)); return J({ data: { tagsRemove: { userErrors: [] } } }); }
    if (query.includes('tagsAdd')) { const c = byId(v.id); c.tags.push(...v.t); return J({ data: { tagsAdd: { userErrors: [] } } }); }
    if (query.includes('customers(first')) { const all = [...W.customers.values()]; return J({ data: { customers: { nodes: (v.q.startsWith('tag:') ? all.filter((c) => c.tags.includes(v.q.slice(4))) : all).map(view) } } }); }
    if (query.includes('customer(id')) { const c = byId(v.id); return J({ data: { customer: c ? view(c) : null } }); }
    throw new Error('unexpected query ' + query.slice(0, 60));
  };
  return W;
}
const withFetch = async (W, fn) => { const old = globalThis.fetch; globalThis.fetch = W.fetch; try { return await fn(); } finally { globalThis.fetch = old; } };
const pts = (W, id) => Number(W.customers.get(String(id)).mf.loyalty_points);

test('modes: anything but qa/live is off; qa only allows the listed customer IDs', () => {
  assert.equal(mode('LIVE'), 'live'); assert.equal(mode('qa'), 'qa'); assert.equal(mode(undefined), 'off'); assert.equal(mode('yes'), 'off');
  assert.equal(allowed('qa', 'gid://shopify/Customer/111', ['111']), true); assert.equal(allowed('qa', '222', ['111']), false); assert.equal(allowed('off', '111', ['111']), false); assert.equal(allowed('live', '222', []), true);
});
test('codes: prefix + 6 unambiguous characters', () => { for (let i = 0; i < 200; i++) assert.match(newCode('ELITE-'), /^ELITE-[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{6}$/); });
test('qa mode: the QA customer is processed; another tagged customer is never touched', async () => {
  const W = world(); W.add(QA, {}); W.add('222', { mf: { loyalty_points: '9000' } });
  const out = await withFetch(W, () => runRedeem(W.env, shop, NOW));
  assert.deepEqual(out.processed.map((p) => [p.customer_id, p.status]), [[QA, 'done']]);
  assert.equal(pts(W, QA), 100); assert.equal(pts(W, '222'), 9000); assert.ok(W.customers.get('222').tags.includes('Trigger_Redeem_2500')); assert.equal(W.discounts.size, 1);
  const [code, d] = [...W.discounts][0]; const c = W.customers.get(QA);
  assert.equal(c.mf.last_reward_code, code); assert.equal(c.mf.redeem_status, 'ready'); assert.deepEqual(c.tags, []);
  const list = JSON.parse(c.mf.reward_codes); assert.equal(list.length, 1); assert.deepEqual([list[0].code, list[0].value, list[0].status], [code, 2500, 'active']); assert.equal(list[0].expires.slice(0, 10), '2027-02-14');
  // the code: Rs 2,500 off, this customer only, one use, minimum Rs 2,501, combines with nothing
  assert.equal(d.input.customerGets.value.discountAmount.amount, '2500'); assert.equal(d.input.usageLimit, 1); assert.deepEqual(d.input.context.customers.add, ['gid://shopify/Customer/' + QA]);
  assert.equal(d.input.minimumRequirement.subtotal.greaterThanOrEqualToSubtotal, '2501'); assert.deepEqual(d.input.combinesWith, { productDiscounts: false, shippingDiscounts: false, orderDiscounts: false });
  assert.equal(W.events.length, 1); assert.equal(W.events[0].metric.data.attributes.name, 'Elite Reward Ready'); assert.equal(W.events[0].properties.code, code); assert.match(W.events[0].properties.discount_url, /\/discount\/ELITE-/);
  const row = W.db.prepare('SELECT * FROM redeem_requests').get(); assert.equal(row.status, 'done'); assert.equal(row.points_before, 2600); assert.equal(row.points_after, 100); assert.equal(JSON.parse(row.backup).points, '2600');
  assert.equal(W.db.prepare('SELECT COUNT(*) n FROM redeem_locks').get().n, 0);
});
test('running twice (cron + button) never deducts twice or issues two codes', async () => {
  const W = world(); W.add(QA, { mf: { loyalty_points: '6000', loyalty_tier: 'Bronze' } });
  await withFetch(W, async () => { await Promise.all([runRedeem(W.env, shop, NOW), runRedeem(W.env, shop, NOW + 1)]); await runRedeem(W.env, shop, NOW + 5000); });
  assert.equal(pts(W, QA), 3500); assert.equal(W.discounts.size, 1); assert.equal(W.events.length, 1);
});
test('not enough points: refused cleanly, tag removed, status set, nothing created', async () => {
  const W = world(); W.add(QA, { mf: { loyalty_points: '100' } }); const out = await withFetch(W, () => runRedeem(W.env, shop, NOW));
  assert.equal(out.processed[0].status, 'refused'); assert.equal(pts(W, QA), 100); assert.equal(W.discounts.size, 0); assert.deepEqual(W.customers.get(QA).tags, []); assert.equal(W.customers.get(QA).mf.redeem_status, 'not_enough_points'); assert.equal(W.events.length, 0);
});
test('no enabled account: refused, no code', async () => {
  const W = world(); W.add(QA, { state: 'DISABLED' }); await withFetch(W, () => runRedeem(W.env, shop, NOW)); assert.equal(W.discounts.size, 0); assert.equal(pts(W, QA), 2600); assert.equal(W.customers.get(QA).mf.redeem_status, 'no_account');
});
test('a member who still holds an unused code does not get a second one', async () => {
  const W = world(); W.add(QA, { mf: { loyalty_points: '3025', last_reward_code: 'ELITE-OLD' } }); W.discounts.set('ELITE-OLD', { id: 'x', input: {}, status: 'ACTIVE', used: 0 });
  const out = await withFetch(W, () => runRedeem(W.env, shop, NOW)); assert.equal(out.processed[0].status, 'refused'); assert.match(out.processed[0].note, /already holds/); assert.equal(pts(W, QA), 3025); assert.equal(W.discounts.size, 1); assert.deepEqual(W.customers.get(QA).tags, []);
});
test('rollback: if the deduction fails, the code is cancelled and no points are taken', async () => {
  const W = world(); W.add(QA, {}); W.failDeduct = true; const out = await withFetch(W, () => runRedeem(W.env, shop, NOW));
  assert.equal(out.processed[0].status, 'rolled_back'); assert.equal(pts(W, QA), 2600); assert.equal([...W.discounts.values()][0].status, 'EXPIRED'); assert.equal(W.customers.get(QA).mf.last_reward_code, undefined); assert.equal(W.events.length, 0);
  assert.equal(W.db.prepare('SELECT COUNT(*) n FROM redeem_locks').get().n, 0);
});
test('rollback: balance changed between the read and the write (an order, another deduction) → nothing is written', async () => {
  const W = world(); W.add(QA, {}); W.raceOnDeduct = (c) => { c.mf.loyalty_points = '90'; c.dg.loyalty_points = 7; };
  const out = await withFetch(W, () => runRedeem(W.env, shop, NOW)); assert.equal(out.processed[0].status, 'rolled_back'); assert.equal(pts(W, QA), 90); assert.equal([...W.discounts.values()][0].status, 'EXPIRED');
});
test('a run that died after creating the code is finished by the next run, not repeated', async () => {
  const W = world(); W.add(QA, {}); const cfgR = redeemCfg(M.withDefaults(JSON.parse(W.db.prepare('SELECT config FROM shops').get().config)));
  W.db.prepare("INSERT INTO redeem_locks VALUES (?,?,?,?)").run(shop, QA, 'r1', new Date(NOW - 10 * 60e3).toISOString());
  W.db.prepare("INSERT INTO redeem_requests (shop,id,customer_id,status,code,discount_id,created_at,expires_at,mode,notified) VALUES (?,?,?,?,?,?,?,?,?,0)").run(shop, 'r1', QA, 'code_created', 'ELITE-ABCDEF', 'gid://shopify/DiscountCodeNode/9', new Date(NOW - 10 * 60e3).toISOString(), '2027-02-14T00:00:00Z', 'qa');
  W.discounts.set('ELITE-ABCDEF', { id: 'gid://shopify/DiscountCodeNode/9', input: {}, status: 'ACTIVE', used: 0 });
  const r = await withFetch(W, () => processCustomer(W.env, shop, QA, cfgR, 'qa', NOW)); assert.equal(r.status, 'done'); assert.equal(r.code, 'ELITE-ABCDEF'); assert.equal(pts(W, QA), 100); assert.equal(W.discounts.size, 1); assert.ok(!W.calls.includes('create'));
});
test('live mode: everyone tagged is processed, up to the daily cap; then it pauses and says so', async () => {
  const W = world(); W.env.REDEEM_MODE = 'live'; const cfg = JSON.parse(W.db.prepare('SELECT config FROM shops').get().config); cfg.redeem.dailyCap = 2; W.db.prepare('UPDATE shops SET config=?').run(JSON.stringify(cfg));
  for (const id of ['301', '302', '303']) W.add(id, {});
  const a = await withFetch(W, () => runRedeem(W.env, shop, NOW)); assert.equal(a.processed.filter((p) => p.status === 'done').length, 2); assert.equal(W.discounts.size, 2);
  const b = await withFetch(W, () => runRedeem(W.env, shop, NOW + 60e3)); assert.equal(b.paused, true); assert.equal(W.discounts.size, 2); assert.equal(pts(W, '303'), 2600);
  const s = await withFetch(W, () => redeemStatus(W.env, shop, NOW + 61e3)); assert.equal(s.paused, true); assert.match(s.pauseReason, /cap/i); assert.equal(s.today, 2);
});
test('off mode does nothing', async () => { const W = world(); W.env.REDEEM_MODE = ''; W.add(QA, {}); const o = await withFetch(W, () => runRedeem(W.env, shop, NOW)); assert.equal(o.processed.length, 0); assert.equal(pts(W, QA), 2600); });
test('saved code status follows Shopify (used / expired) on the customer', async () => {
  const W = world(); W.add(QA, {}); await withFetch(W, () => runRedeem(W.env, shop, NOW)); const d = [...W.discounts.values()][0]; d.used = 1;
  W.customers.get(QA).tags = []; await withFetch(W, () => runRedeem(W.env, shop, NOW + 300e3));
  assert.equal(JSON.parse(W.customers.get(QA).mf.reward_codes)[0].status, 'used'); assert.equal(W.db.prepare('SELECT code_status FROM redeem_requests').get().code_status, 'used'); assert.equal(W.customers.get(QA).mf.redeem_status, 'used');
});
test('welcome: nothing without an account; 500 + Bronze once when the account is enabled; an existing balance is never touched', async () => {
  const W = world(); W.add('555', { state: 'DISABLED', tags: [], mf: {} }); W.add('556', { state: 'ENABLED', tags: [], mf: {} });
  let o = await withFetch(W, () => runWelcome(W.env, shop, NOW)); assert.equal(o.awarded, 0); assert.deepEqual(W.customers.get('555').mf, {});
  W.customers.get('555').state = 'ENABLED'; o = await withFetch(W, () => runWelcome(W.env, shop, NOW)); assert.equal(o.awarded, 1);
  assert.equal(W.customers.get('555').mf.loyalty_points, '500'); assert.equal(W.customers.get('555').mf.loyalty_tier, 'Bronze'); assert.ok(W.customers.get('555').tags.includes('welcome_awarded'));
  W.customers.get('555').mf.loyalty_points = '740'; o = await withFetch(W, () => runWelcome(W.env, shop, NOW)); assert.equal(o.awarded, 0); assert.equal(W.customers.get('555').mf.loyalty_points, '740');      // once only
  assert.deepEqual(W.customers.get('556').mf, {});                                                                                                                                    // not on the QA list in qa mode
  W.env.WELCOME_MODE = 'live'; W.add('557', { tags: [], mf: { loyalty_points: '1234', loyalty_tier: 'Silver' } }); o = await withFetch(W, () => runWelcome(W.env, shop, NOW));
  assert.equal(W.customers.get('556').mf.loyalty_points, '500'); assert.equal(W.customers.get('557').mf.loyalty_points, '1234'); assert.equal(W.customers.get('557').mf.loyalty_tier, 'Silver'); assert.ok(W.customers.get('557').tags.includes('welcome_awarded'));
});
