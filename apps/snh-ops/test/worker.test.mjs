// The API layer end to end on SQLite (no network): auth gate, status shape, members search, CSV.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from '../src/worker.mjs';
import { sign } from '../src/auth.mjs';
import { snapshot, insertMany } from '../src/sync.mjs';
const db = new DatabaseSync(':memory:'); db.exec(fs.readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
const stmt = (sql, a = []) => ({ bind: (...x) => stmt(sql, x), run: async () => { db.prepare(sql).run(...a); return {}; }, all: async () => ({ results: db.prepare(sql).all(...a) }), first: async () => db.prepare(sql).get(...a) || null, _run: () => db.prepare(sql).run(...a) });
const env = { DB: { prepare: (s) => stmt(s), batch: async (l) => { for (const s of l) s._run(); return []; } }, SHOPIFY_CLIENT_ID: 'app', SHOPIFY_CLIENT_SECRET: 'sec' };
const shop = 'demo-store.myshopify.com';
db.prepare('INSERT INTO shops (shop, config) VALUES (?, ?)').run(shop, fs.readFileSync(new URL('../config/example-store.json', import.meta.url), 'utf8'));
db.prepare("INSERT INTO customers (shop,id,name,tier,points,annual_spend,created_at) VALUES (?,?,?,?,?,?,?)").run(shop, 'c1', 'Asha, "Ace"', 'Gold', 5000, 400000, '2026-01-01T00:00:00Z');
db.prepare("INSERT INTO customers (shop,id,name,tier,points,annual_spend,created_at) VALUES (?,?,?,?,?,?,?)").run(shop, 'c2', '=cmd', 'Bronze', 10, 100, '2026-01-01T00:00:00Z');
db.prepare("INSERT INTO customers (shop,id,name,tier,points,annual_spend,created_at) VALUES (?,?,?,?,?,?,?)").run('other-store.myshopify.com', 'x1', 'Other shop member', 'Gold', 9, 1, '2026-01-01T00:00:00Z');
const tok = async (s = shop, secret = 'sec') => { const n = Math.floor(Date.now() / 1000); return sign({ iss: `https://${s}/admin`, dest: `https://${s}`, aud: 'app', sub: '1', exp: n + 60, nbf: n - 5 }, secret); };
const call = async (path, o = {}) => worker.fetch(new Request('https://x.test' + path, { method: o.method || 'GET', headers: o.token === false ? {} : { Authorization: 'Bearer ' + (o.token || await tok()) } }), env, { waitUntil() {} });

test('no token / bad token → 401, and no data in the body', async () => {
  for (const o of [{ token: false }, { token: await tok(shop, 'wrong') }, { token: 'abc' }]) { const r = await call('/api/overview', o); assert.equal(r.status, 401); assert.deepEqual(await r.json(), { error: 'unauthorized' }); }
});
test('a store that is not registered gets 403', async () => { const r = await call('/api/overview', { token: await tok('stranger.myshopify.com') }); assert.equal(r.status, 403); });
test('status returns a plain object for counts (stored as text or as an object)', async () => {
  const r = await call('/api/status'); assert.equal(r.status, 200); const j = await r.json(); assert.deepEqual(j.sync.counts, {}); assert.equal(j.sync.running, false);
  db.prepare("INSERT INTO sync_state (shop, phase, counts) VALUES (?, 'idle', ?)").run(shop, '{"customers":2}'); assert.deepEqual((await (await call('/api/status')).json()).sync.counts, { customers: 2 });
});
test('pages answer after a snapshot; members are scoped to the caller\'s shop', async () => {
  await snapshot(env, shop, Date.parse('2026-11-15T00:00:00Z'));
  const o = await (await call('/api/overview')).json(); assert.equal(o.data.members, 2); assert.equal(o.data.tiers.tiers.Gold, 1);
  for (const p of ['loyalty', 'bundles', 'promotions']) assert.equal((await call('/api/' + p)).status, 200);
  const m = await (await call('/api/members?q=')).json(); assert.equal(m.total, 2); assert.ok(!JSON.stringify(m).includes('Other shop'));
  assert.equal((await (await call('/api/members?q=asha')).json()).total, 1);
});
test('CSV export: quoted, and spreadsheet formulas are neutralised', async () => {
  const r = await call('/api/members.csv'); assert.match(r.headers.get('content-type'), /text\/csv/); const t = await r.text();
  assert.match(t, /"Asha, ""Ace""",Gold,5000/); assert.match(t, /'=cmd,Bronze/); assert.ok(!t.includes('Other shop'));
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
