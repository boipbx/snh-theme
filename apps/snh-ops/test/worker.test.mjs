// The API layer end to end on SQLite (no network): auth gate, status shape, members search, CSV.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from '../src/worker.mjs';
import { sign } from '../src/auth.mjs';
import { snapshot, insertMany } from '../src/sync.mjs';
const db = new DatabaseSync(':memory:'); db.exec(fs.readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
const stmt = (sql, a = []) => ({ bind: (...x) => stmt(sql, x), run: async () => { db.prepare(sql).run(...a); return {}; }, all: async () => ({ results: db.prepare(sql).all(...a) }), first: async () => db.prepare(sql).get(...a) || null, _run: () => (/^\s*SELECT/i.test(sql) ? { results: db.prepare(sql).all(...a) } : { results: [], meta: { rows_written: Number(db.prepare(sql).run(...a).changes) } }) });
const env = { DB: { prepare: (s) => stmt(s), batch: async (l) => l.map((s) => s._run()) }, SHOPIFY_CLIENT_ID: 'app', SHOPIFY_CLIENT_SECRET: 'sec' };
const shop = 'demo-store.myshopify.com';
db.prepare('INSERT INTO shops (shop, config) VALUES (?, ?)').run(shop, fs.readFileSync(new URL('../config/example-store.json', import.meta.url), 'utf8'));
db.prepare("INSERT INTO customers (shop,id,name,tier,points,annual_spend,created_at,state) VALUES (?,?,?,?,?,?,?,'ENABLED')").run(shop, 'c1', 'Asha, "Ace"', 'Gold', 5000, 400000, '2026-01-01T00:00:00Z');
db.prepare("INSERT INTO customers (shop,id,name,tier,points,annual_spend,created_at,state) VALUES (?,?,?,?,?,?,?,'DISABLED')").run(shop, 'c2', '=cmd', 'Bronze', 10, 100, '2026-01-01T00:00:00Z');
db.prepare("INSERT INTO customers (shop,id,name,tier,points,annual_spend,created_at) VALUES (?,?,?,?,?,?,?)").run('other-store.myshopify.com', 'x1', 'Other shop member', 'Gold', 9, 1, '2026-01-01T00:00:00Z');
const tok = async (s = shop, secret = 'sec') => { const n = Math.floor(Date.now() / 1000); return sign({ iss: `https://${s}/admin`, dest: `https://${s}`, aud: 'app', sub: '1', exp: n + 60, nbf: n - 5 }, secret); };
const call = async (path, o = {}) => worker.fetch(new Request('https://x.test' + path, { method: o.method || 'GET', headers: o.token === false ? {} : { Authorization: 'Bearer ' + (o.token || await tok()) } }), env, { waitUntil() {} });

test('no token / bad token → 401, and no data in the body', async () => {
  for (const o of [{ token: false }, { token: await tok(shop, 'wrong') }, { token: 'abc' }]) { const r = await call('/api/data', o); assert.equal(r.status, 401); assert.deepEqual(await r.json(), { error: 'unauthorized' }); }
});
test('a store that is not registered gets 403', async () => { const r = await call('/api/data', { token: await tok('stranger.myshopify.com') }); assert.equal(r.status, 403); });
test('status returns a plain object for counts (stored as text or as an object)', async () => {
  const r = await call('/api/status'); assert.equal(r.status, 200); const j = await r.json(); assert.deepEqual(j.sync.counts, {}); assert.equal(j.sync.running, false);
  db.prepare("INSERT INTO sync_state (shop, phase, counts) VALUES (?, 'idle', ?)").run(shop, '{"customers":2}'); assert.deepEqual((await (await call('/api/status')).json()).sync.counts, { customers: 2 });
});
test('data answers before any snapshot (worked out from the cache), and after one', async () => {
  const j = await (await call('/api/data')).json(); assert.equal(j.interim, true); assert.equal(j.data.totals.members, 1); assert.equal(j.data.totals.records, 2); assert.equal(j.data.totals.tiersMembers.Gold, 1);
  await snapshot(env, shop, Date.parse('2026-11-15T00:00:00Z')); const k = await (await call('/api/data')).json(); assert.equal(k.interim, false); assert.equal(k.data.version, 2); assert.equal(k.writes.budget, 2000000);
});
test('members: accounts by default, all records on request, scoped to the caller\'s shop', async () => {
  const m = await (await call('/api/members')).json(); assert.equal(m.total, 1); assert.equal(m.scope, 'members'); assert.equal(m.rows[0].name, 'Asha, "Ace"');
  const all = await (await call('/api/members?scope=records&all=1')).json(); assert.equal(all.total, 2); assert.ok(!JSON.stringify(all).includes('Other shop'));
  assert.equal((await (await call('/api/members?scope=records&q=asha')).json()).total, 1); assert.equal((await (await call('/api/members?scope=records&tier=bronze')).json()).total, 1);
  assert.equal((await (await call("/api/members?sort=points;DROP TABLE customers")).json()).total, 1);            // unknown sort falls back
});
test('full resync is for admins when the store lists admins; refresh needs POST', async () => {
  assert.equal((await call('/api/refresh')).status, 404);
  db.prepare('UPDATE shops SET config = json_set(config, \'$.admins\', json_array(\'42\')) WHERE shop = ?').run(shop);
  const r = await call('/api/resync', { method: 'POST' }); assert.equal(r.status, 403); assert.match((await r.json()).error, /admin/);
  db.prepare('UPDATE shops SET config = json_remove(config, \'$.admins\') WHERE shop = ?').run(shop);
});
test('the page shell holds no store data and sets frame-ancestors for the shop', async () => {
  const r = await call('/?shop=' + shop, { token: false }); assert.match(r.headers.get('content-security-policy'), /frame-ancestors https:\/\/demo-store\.myshopify\.com https:\/\/admin\.shopify\.com/); assert.ok(!(await r.text()).includes('Asha'));
});
test('insertMany: writes every row and never binds more than 100 values in one statement (D1 limit)', async () => {
  let maxBinds = 0; const spy = { DB: { prepare: (sql) => ({ bind: (...a) => { maxBinds = Math.max(maxBinds, a.length); return stmt(sql, a); } }), batch: env.DB.batch } };
  const C = ['id', 'name', 'tags', 'points', 'tier', 'annual_spend', 'last_reward_code', 'created_at', 'orders_count', 'amount_spent', 'last_order_at'];
  const rows = Array.from({ length: 205 }, (_, i) => ({ shop: 'bulk.myshopify.com', id: 'b' + i, name: 'N' + i, points: i }));
  assert.equal(await insertMany(spy, 'customers', C, rows), 205);
  assert.equal(await insertMany(spy, 'bundle_products', ['product_id', 'title'], Array.from({ length: 120 }, (_, i) => ({ shop: 'bulk.myshopify.com', product_id: 'p' + i, title: 'T' }))), 120);
  assert.ok(maxBinds <= 100, 'bound ' + maxBinds); assert.equal(db.prepare("SELECT COUNT(*) n FROM customers WHERE shop='bulk.myshopify.com'").get().n, 205);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM bundle_products WHERE shop='bulk.myshopify.com'").get().n, 120);
});
