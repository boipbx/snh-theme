// v2: member definition, date ranges, exports, and the write budget.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import * as M from '../src/metrics.mjs';
import { upsertChanged, migrate, migrated, writtenToday, startSync, isLimitError } from '../src/sync.mjs';
import { isOwnFlow } from '../src/klaviyo.mjs';
import { source } from '../build-ui.mjs';
const cfg = M.withDefaults(JSON.parse(fs.readFileSync(new URL('../config/example-store.json', import.meta.url))));
const NOW = Date.parse('2026-11-16T06:00:00Z'); const ago = (d) => new Date(NOW - d * M.DAY).toISOString();
const C = [
  { id: 'c1', state: 'ENABLED', name: 'A', tier: 'Gold', points: 6000, annual_spend: 350000, created_at: ago(400) },
  { id: 'c2', state: 'ENABLED', name: 'B', tier: 'Bronze', points: 500, annual_spend: 0, created_at: ago(3) },
  { id: 'c3', state: 'DISABLED', name: 'Guest', tier: 'Bronze', points: 2600, annual_spend: 0, created_at: ago(3) },      // guest checkout record with points
  { id: 'c4', state: 'INVITED', name: 'Inv', tier: 'Silver', points: 500, annual_spend: 0, created_at: ago(40) },
  { id: 'c5', state: 'DISABLED', name: 'POS', tier: 'Bronze', points: 500, annual_spend: 0, created_at: ago(500) },
];
const O = [
  { id: 'o1', created_at: ago(1), customer_id: 'c1', total: 10000, subtotal: 10000, financial: 'PAID', codes: 'SUN15-15NOV', discount_total: 1500 },
  { id: 'o2', created_at: ago(2), customer_id: 'c3', total: 4000, subtotal: 4000, financial: 'PAID', codes: '' },
  { id: 'o3', created_at: ago(35), customer_id: 'c1', total: 7000, subtotal: 7000, financial: 'PAID', codes: 'ELITE-1' },
  { id: 'o4', created_at: ago(2), customer_id: null, total: 999, subtotal: 999, financial: 'PAID', cancelled: 1, codes: '' },
];
const L = [
  { order_id: 'o1', product_id: 'x', product_type: 'Protein', title: 'Whey', qty: 1, amount: 6000, group_id: 'g1', group_product_id: 'b1', group_title: 'Stack', group_qty: 2 },
  { order_id: 'o1', product_id: 'y', product_type: 'Creatine', title: 'Creatine', qty: 1, amount: 4000, group_id: 'g1', group_product_id: 'b1', group_title: 'Stack', group_qty: 2 },
  { order_id: 'o3', product_id: 'x', product_type: 'Protein', title: 'Whey', qty: 1, amount: 7000, group_id: 'g9', group_product_id: 'b1', group_title: 'Stack', group_qty: 1 },
  { order_id: 'o4', product_id: 'x', product_type: 'Protein', title: 'Whey', qty: 1, amount: 999, group_id: 'g2', group_product_id: 'b1', group_title: 'Stack', group_qty: 1 },
];
const B = [{ product_id: 'b1', title: 'Stack', tags: 'bundle', status: 'ACTIVE' }, { product_id: 'b2', title: 'Brand New', tags: 'x, Bundles-Nov26', status: 'ACTIVE' }];
const D = M.buildData(C, O, L, B, cfg, NOW);

test('a member is a customer with an ENABLED account; records with points but no account are not', () => {
  assert.equal(M.isMember({ state: 'ENABLED' }), true); for (const s of ['DISABLED', 'INVITED', 'DECLINED', '', undefined]) assert.equal(M.isMember({ state: s, points: 9999, tier: 'Gold' }), false);
  assert.equal(D.totals.members, 2); assert.equal(D.totals.records, 5); assert.deepEqual(D.totals.states, { ENABLED: 2, DISABLED: 2, INVITED: 1 });
  assert.deepEqual(D.totals.tiersMembers, { Bronze: 1, Silver: 0, Gold: 1 }); assert.deepEqual(D.totals.tiersAll, { Bronze: 3, Silver: 1, Gold: 1 });
});
test('points outstanding: members only and all records, with the reward value each side could claim', () => {
  assert.deepEqual(D.totals.points, { members: 6500, all: 10100, nonMembers: 3600, value: 1 });
  assert.deepEqual(D.totals.rewardReady, { members: 1, membersValue: 5000, nonMembers: 1, nonMembersValue: 2500 });
  assert.deepEqual(D.totals.bands.map((b) => [b.label, b.members, b.records]), [['0', 0, 0], ['1–499', 0, 0], ['500', 1, 3], ['501–2,499', 0, 0], ['2,500+', 1, 2]]);
  assert.deepEqual(D.loyalty.redeemable.map((x) => x.id), ['c1']);                         // the guest record with 2,600 points is not "reward ready"
});
test('older caches without account states are flagged, not counted as zero members silently', () => {
  const d = M.buildData(C.map(({ state, ...c }) => c), O, L, B, cfg, NOW); assert.equal(d.statesKnown, false); assert.equal(D.statesKnown, true);
});
test('date range: sums for the range and for the period before it', () => {
  const last = D.days[D.days.length - 1]; assert.equal(last, '2026-11-16'); assert.equal(D.days.length, 365);
  const r = M.rangeTotals(D, D.days[D.days.length - 30], last);
  assert.equal(r.days, 30); assert.equal(r.cur.revMember, 10000); assert.equal(r.cur.revGuest, 4000); assert.equal(r.cur.revenue, 14000); assert.equal(r.cur.orders, 2);
  assert.equal(r.prev.revMember, 7000); assert.equal(r.cur.newMembers, 1); assert.equal(r.cur.newRecords, 2);
  assert.equal(r.cur.pointsIssuedEstimate, Math.floor(10000 * 0.10) + 500); assert.equal(r.prev.rewardCodes, 1);
  const w = M.rangeTotals(D, D.days[D.days.length - 365], last); assert.equal(w.hasPrev, false); assert.equal(w.prev.revMember, null); assert.equal(w.cur.revenue, 21000);
  assert.equal(M.rangeTotals(D, '2031-01-01', '2031-02-01'), null);
});
test('bundles: every bundle is listed (also with no sales), new ones are marked, a bundle counts once per group', () => {
  const r = M.rangeTotals(D, D.days[D.days.length - 30], D.days[D.days.length - 1]);
  assert.deepEqual(r.bundles.map((b) => [b.title, b.isNew, b.revenue, b.units, b.orders]), [['Brand New', true, 0, 0, 0], ['Stack', false, 10000, 2, 1]]);
  assert.equal(r.cur.bundleRev, 10000); assert.equal(r.cur.bundleOrders, 1); assert.equal(r.cur.bundleUnits, 2); assert.equal(r.prev.bundleRev, 7000);   // cancelled order left out
  assert.deepEqual(r.campaigns.map((c) => [c.code, c.orders, c.discount]), [['SUN15-15NOV', 1, 1500]]);
});
test('exports: CSV quoting, formula cells neutralised, numbers left alone, clear file names', () => {
  assert.equal(M.toCsv(['Name', 'Points'], [['Asha, "Ace"', 5000], ['=cmd()', -20], ['+94 77', 1]]), 'Name,Points\n"Asha, ""Ace""",5000\n\'=cmd(),-20\n\'+94 77,1');
  assert.equal(M.exportName('snh', 'Elite members', '2026-11-16', 'xlsx'), 'snh-elite-members-2026-11-16.xlsx');
  assert.equal(M.exportName('', 'Bundles (new)', '2026-11-16', 'csv'), 'bundles-new-2026-11-16.csv');
});
test('Klaviyo: only live flows with the store prefix count as current', () => {
  assert.equal(isOwnFlow({ name: 'SNH · Welcome series', status: 'live' }, 'SNH ·'), true); assert.equal(isOwnFlow({ name: 'SNH · Sunset', status: 'draft' }, 'SNH ·'), false);
  assert.equal(isOwnFlow({ name: 'Abandoned Cart', status: 'live' }, 'SNH ·'), false); assert.equal(isOwnFlow({ name: 'Anything', status: 'live' }, ''), true);
});

// ── sync: write only what changed, stay inside the daily budget ──
const mk = () => { const db = new DatabaseSync(':memory:'); const stmt = (sql, a = []) => ({ bind: (...x) => stmt(sql, x), run: async () => { const r = db.prepare(sql).run(...a); return { meta: { rows_written: Number(r.changes) } }; }, all: async () => ({ results: db.prepare(sql).all(...a) }), first: async () => db.prepare(sql).get(...a) || null, _run: () => (/^\s*SELECT/i.test(sql) ? { results: db.prepare(sql).all(...a) } : { results: [], meta: { rows_written: Number(db.prepare(sql).run(...a).changes) } }) });
  return { db, env: { DB: { prepare: (s) => stmt(s), batch: async (l) => { calls.n++; return l.map((s) => s._run()); } } }, calls }; }; const calls = { n: 0 };
const cols = ['id', 'name', 'points', 'tier', 'annual_spend', 'state'];
test('upsertChanged: unchanged rows are skipped, changed and new rows are written', async () => {
  const { db, env } = mk(); db.exec(fs.readFileSync(new URL('../schema.sql', import.meta.url), 'utf8')); const shop = 's.myshopify.com';
  const rows = Array.from({ length: 250 }, (_, i) => ({ shop, id: 'c' + i, name: 'N' + i, points: i, tier: 'Bronze', annual_spend: i * 1.5, state: 'DISABLED' }));
  calls.n = 0; assert.deepEqual(await upsertChanged(env, 'customers', 'id', cols, rows), { written: 250, changed: 250, same: 0 }); assert.ok(calls.n <= 3, 'database calls: ' + calls.n);   // reads and writes go in batches (50 calls per run on the free plan)
  assert.deepEqual(await upsertChanged(env, 'customers', 'id', cols, rows), { written: 0, changed: 0, same: 250 });
  const next = rows.map((r) => ({ ...r })); next[7].points = 999; next[8].state = 'ENABLED'; next.push({ shop, id: 'new', name: 'New', points: 500, tier: 'Bronze', annual_spend: null, state: 'ENABLED' });
  const r = await upsertChanged(env, 'customers', 'id', cols, next); assert.equal(r.written, 3); assert.equal(r.same, 248);
  assert.equal(db.prepare("SELECT points FROM customers WHERE id='c7'").get().points, 999); assert.equal(db.prepare('SELECT COUNT(*) n FROM customers').get().n, 251);
});
test('upsertChanged: a batch that does not fit today\'s budget writes nothing', async () => {
  const { db, env } = mk(); db.exec(fs.readFileSync(new URL('../schema.sql', import.meta.url), 'utf8')); const shop = 's.myshopify.com';
  const rows = Array.from({ length: 10 }, (_, i) => ({ shop, id: 'c' + i, name: 'N', points: 1, tier: '', annual_spend: 0, state: '' })); const budget = { left: 9 };
  await assert.rejects(() => upsertChanged(env, 'customers', 'id', cols, rows, budget), /budget/); assert.equal(db.prepare('SELECT COUNT(*) n FROM customers').get().n, 0);
  budget.left = 10; await upsertChanged(env, 'customers', 'id', cols, rows, budget); assert.equal(budget.left, 0);
});
test('migrate: brings a v1 database up to date without touching rows, and drops the unused indexes', async () => {
  const { db, env } = mk();
  db.exec(`CREATE TABLE shops (shop TEXT PRIMARY KEY, config TEXT NOT NULL DEFAULT '{}');
    CREATE TABLE sync_state (shop TEXT PRIMARY KEY, phase TEXT NOT NULL DEFAULT 'idle', op_id TEXT, url TEXT, offset INTEGER NOT NULL DEFAULT 0, started_at TEXT, finished_at TEXT, message TEXT, counts TEXT NOT NULL DEFAULT '{}', orders_since TEXT);
    CREATE TABLE customers (shop TEXT NOT NULL, id TEXT NOT NULL, name TEXT, tags TEXT, points INTEGER, tier TEXT, annual_spend REAL, last_reward_code TEXT, created_at TEXT, orders_count INTEGER, amount_spent REAL, last_order_at TEXT, PRIMARY KEY (shop, id));
    CREATE INDEX customers_tier ON customers (shop, tier); CREATE TABLE bundle_products (shop TEXT NOT NULL, product_id TEXT NOT NULL, title TEXT, PRIMARY KEY (shop, product_id));
    INSERT INTO customers (shop,id,name,points) VALUES ('s','c1','A',500);`);
  assert.equal(await migrated(env), false); assert.equal(await migrate(env), true); assert.equal(await migrated(env), true); assert.equal(await migrate(env), false);
  assert.deepEqual({ ...db.prepare('SELECT name, points, state FROM customers').get() }, { name: 'A', points: 500, state: null });
  assert.equal(db.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE type='index' AND name='customers_tier'").get().n, 0);
});
test('a sync is skipped, with a clear message, once the day\'s budget is used; a database write-limit error is recognised', async () => {
  const { db, env } = mk(); db.exec(fs.readFileSync(new URL('../schema.sql', import.meta.url), 'utf8')); const shop = 's.myshopify.com';
  db.prepare('INSERT INTO shops (shop, config) VALUES (?, ?)').run(shop, JSON.stringify({ dailyWriteBudget: 1000 }));
  db.prepare("INSERT INTO sync_log (shop, started_at, kind, rows_written, status) VALUES (?, ?, 'incremental', 1200, 'ok')").run(shop, new Date(NOW - 3600e3).toISOString());
  db.prepare("INSERT INTO sync_log (shop, started_at, kind, rows_written, status) VALUES (?, ?, 'full', 50000, 'ok')").run(shop, new Date(NOW - 2 * M.DAY).toISOString());   // another day: not counted
  assert.equal(await writtenToday(env, NOW), 1200);
  const s = await startSync(env, shop, NOW); assert.equal(s.refused, 'budget'); assert.match(s.message, /skipped/i); assert.equal(s.phase, 'idle');     // no Shopify call was made
  assert.equal(isLimitError(new Error("D1_ERROR: Your account has exceeded D1's free tier daily row write limit. [code: 7500]")), true); assert.equal(isLimitError(new Error('Shopify: throttled')), false);
});
test('src/ui.mjs is the built copy of ui/app.html', () => {
  assert.equal(fs.readFileSync(new URL('../src/ui.mjs', import.meta.url), 'utf8'), source(fs.readFileSync(new URL('../ui/app.html', import.meta.url), 'utf8')));
});
