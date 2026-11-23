// Subscribe & save scaffold: flag, schedule, retries, customer controls, Onepay adapter shape, no double charge.
// Onepay is a local fake that mirrors the documented sandbox API (docs.onepay.lk customer-tokenizer); no network, no real cards.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import * as S from '../src/subs.mjs';

const shop = 'demo-store.myshopify.com'; const NOW = Date.parse('2026-12-01T03:00:00Z'); const D = S.DAY;
function world(env = {}) {
  const db = new DatabaseSync(':memory:'); db.exec(fs.readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  const stmt = (sql, a = []) => ({ bind: (...x) => stmt(sql, x), run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...a).changes) } }),
    all: async () => ({ results: db.prepare(sql).all(...a) }), first: async () => db.prepare(sql).get(...a) || null });
  const W = { db, calls: [], decline: false, env: { DB: { prepare: (s) => stmt(s) }, SUBS_MODE: 'sandbox', ONEPAY_APP_ID: 'app_test', ONEPAY_APP_TOKEN: 'tok_test', ...env } };
  W.fetch = async (url, init) => {
    W.calls.push({ url: String(url), method: init.method, auth: init.headers.Authorization, body: init.body ? JSON.parse(init.body) : null });
    const J = (o) => new Response(JSON.stringify(o), { headers: { 'Content-Type': 'application/json' } });
    if (/\/payments\/$/.test(url)) { const b = JSON.parse(init.body); return J({ status: 200, message: W.decline ? 'Declined' : 'Success', data: { transaction_id: 'TXN' + W.calls.length, status: !W.decline, amount: b.amount, currency: b.currency, token_id: b.token_id } }); }
    if (/\/v3\/customers\/$/.test(url)) return J({ status: 200, data: { status: 201, customer_id: 'cus_1', token_url: 'https://onepay.example/token', request_id: 'tok_req_1' } });
    if (/\/cards\//.test(url)) return J({ status: 200, data: [{ token_id: 'tok_1', card_type: 'Visa', masked_number: '**** **** **** 4564', expiry: '12/26', is_deleted: false }] });
    return new Response('{}', { status: 404 });
  };
  W.add = (o = {}) => { const s = { shop, id: 'sub1', customer_id: '111', onepay_customer_id: 'cus_1', token_id: 'tok_1', variant_id: '999', product_title: 'Whey', quantity: 1,
    unit_price: 10000, discount_pct: 10, interval_days: 30, anchor_day: 1, next_charge_at: NOW - 1000, status: 'active', failures: 0, retry_at: null, skip_next: 0, tier_rate: 0.03, created_at: NOW - 40 * D, ...o };
    const k = Object.keys(s); db.prepare(`INSERT INTO subscriptions (${k.join(',')}) VALUES (${k.map(() => '?').join(',')})`).run(...k.map((x) => s[x])); return s; };
  W.sub = (id = 'sub1') => db.prepare('SELECT * FROM subscriptions WHERE id=?').get(id);
  return W;
}

test('flag: only "sandbox" turns it on; "live" and anything else count as off', () => {
  for (const v of [undefined, '', 'off', 'live', 'LIVE', 'on', 'true']) assert.equal(S.mode({ SUBS_MODE: v }), 'off');
  assert.equal(S.mode({ SUBS_MODE: ' Sandbox ' }), 'sandbox');
});

test('off: the job charges nothing and the API answers 404', async () => {
  const W = world({ SUBS_MODE: 'live' }); W.add();
  assert.deepEqual(await S.runSubs(W.env, shop, NOW, W.fetch, () => {}), { mode: 'off', charged: 0 });
  assert.equal(W.calls.length, 0);
  const r = await S.subsApi('subs', new Request('https://x/api/subs'), W.env, shop, NOW); assert.equal(r.status, 404);
});

test('price, discount cap and points', () => {
  assert.equal(S.price(10000, 2, 10), 18000);
  assert.equal(S.price(10000, 1, 50), 8000); // capped at 20%
  assert.equal(S.amountStr(8999.5), '8999.50');
  assert.equal(S.pointsFor(9000, 0.07), 630);
});

test('schedule keeps the chosen day of month (max 28)', () => {
  const from = Date.parse('2026-01-31T00:00:00Z');
  assert.equal(new Date(S.nextChargeAt(from, 30, 31)).getUTCDate(), 28);
  assert.equal(new Date(S.nextChargeAt(Date.parse('2026-03-05T00:00:00Z'), 30, 5)).toISOString().slice(0, 10), '2026-04-05');
  assert.equal(S.nextChargeAt(from, 14, null), from + 14 * D);
});

test('sandbox charge: documented Onepay request, sub moves on, order and points only planned', async () => {
  const W = world(); W.add();
  const r = await S.runSubs(W.env, shop, NOW, W.fetch, () => {});
  assert.equal(r.charged, 1);
  const c = W.calls[0]; assert.equal(c.method, 'POST'); assert.equal(c.url, 'https://api.onepay.lk/v3/customers/cus_1/payments/'); assert.equal(c.auth, 'tok_test');
  assert.deepEqual(c.body, { app_id: 'app_test', token_id: 'tok_1', amount: '9000.00', currency: 'LKR' });
  const s = W.sub(); assert.equal(s.status, 'active'); assert.ok(s.next_charge_at > NOW); assert.equal(s.failures, 0);
  const ch = W.db.prepare('SELECT * FROM subscription_charges').get(); assert.equal(ch.status, 'paid');
  const plan = JSON.parse(ch.plan); assert.equal(plan.plannedPoints, 270); assert.equal(plan.plannedOrder.amount, 9000); assert.equal(ch.shopify_order_id, null);
});

test('no double charge: a re-run for the same due date does not call Onepay again', async () => {
  const W = world(); W.decline = true; W.add();
  await S.runSubs(W.env, shop, NOW, W.fetch, () => {});
  W.db.prepare('UPDATE subscriptions SET status=?, retry_at=NULL, next_charge_at=? WHERE id=?').run('active', NOW - 1000, 'sub1'); // force the same due date again
  await S.runSubs(W.env, shop, NOW, W.fetch, () => {});
  assert.equal(W.calls.length, 1);
});

test('failed payments: retries on day +1, +3, +5, then pause', async () => {
  const W = world(); W.decline = true; W.add(); let t = NOW;
  for (const days of S.RETRY_DAYS) {
    await S.runSubs(W.env, shop, t, W.fetch, () => {}); const s = W.sub();
    assert.equal(s.status, 'past_due'); assert.equal(s.retry_at, t + days * D); t = s.retry_at;
  }
  await S.runSubs(W.env, shop, t, W.fetch, () => {});
  assert.equal(W.sub().status, 'paused'); assert.equal(W.sub().paused_reason, 'payment_failed'); assert.equal(W.calls.length, 4);
});

test('retry not due yet: nothing happens', () => {
  assert.equal(S.plan({ status: 'past_due', token_id: 't', next_charge_at: NOW - D, retry_at: NOW + D }, NOW).action, 'none');
});

test('customer controls: skip, pause/resume, change date, cancel', async () => {
  const W = world(); W.add();
  const post = (a, body = {}) => S.subsApi('subs/sub1/' + a, new Request('https://x/api/subs/sub1/' + a, { method: 'POST', body: JSON.stringify(body) }), W.env, shop, NOW);
  assert.equal((await post('skip')).status, 200);
  await S.runSubs(W.env, shop, NOW, W.fetch, () => {}); assert.equal(W.calls.length, 0); assert.equal(W.sub().skip_next, 0); assert.ok(W.sub().next_charge_at > NOW);
  assert.equal((await post('pause')).status, 200); assert.equal(W.sub().status, 'paused');
  assert.equal((await post('resume')).status, 200); assert.equal(W.sub().status, 'active');
  assert.equal((await post('date', { date: new Date(NOW + 200 * D).toISOString() })).status, 400);
  assert.equal((await post('date', { date: new Date(NOW + 10 * D).toISOString() })).status, 200); assert.equal(W.sub().anchor_day, new Date(NOW + 10 * D).getUTCDate());
  assert.equal((await post('cancel')).status, 200); assert.equal(W.sub().status, 'cancelled');
  await S.runSubs(W.env, shop, NOW + 400 * D, W.fetch, () => {}); assert.equal(W.calls.length, 0);
});

test('Onepay adapter: tokenise, list and remove cards use the documented paths', async () => {
  const W = world(); const op = S.onepay(W.env, W.fetch);
  const c = await op.createCustomer({ first_name: 'A', last_name: 'B', email: 'a@example.com', phone_number: '+94770000000', address: 'Colombo', redirect_url: 'https://x/back' });
  assert.equal(c.data.token_url, 'https://onepay.example/token'); assert.equal(W.calls[0].body.app_id, 'app_test');
  const cards = await op.cards('cus_1'); assert.equal(cards.data[0].token_id, 'tok_1'); assert.match(W.calls[1].url, /\/v3\/customers\/cus_1\/cards\/\?app_id=app_test$/);
  await op.removeCard('cus_1', 'tok_1').catch(() => {}); assert.equal(W.calls[2].method, 'DELETE'); assert.match(W.calls[2].url, /\/cards\/tok_1\/\?app_id=app_test$/);
});
