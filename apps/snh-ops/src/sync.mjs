// Sync state machine: one small step per call, so it fits Cloudflare's per-request limits.
// idle → customers:export → customers:load → orders:export → orders:load → snapshot → idle
//
// Two kinds of sync, same steps:
//   incremental ("Refresh now", nightly): asks Shopify only for customers and orders updated since the last successful sync.
//   full ("Full resync"): asks for everything again.
// Either way a row is written only if it is new or its content changed (it is compared with the stored row first),
// so a sync writes a few hundred rows, not the whole table. D1's free plan allows 100,000 row writes a day:
// rows written are counted, logged per sync, and a sync stops cleanly before the day's budget would be passed.
import { startBulk, bulkStatus, customersQuery, ordersQuery, customerRow, orderRow, lineRow, bundleProducts } from './shopify.mjs';
import { klaviyoData } from './klaviyo.mjs';
import * as M from './metrics.mjs';

// D1's free plan allows 50 database calls per Worker run (a batch is one call), so a step reads and writes in batches and takes at most MAX_ROWS lines.
const CHUNK = 1_500_000, MAX_ROWS = 6_000;
const RUNNING = (p) => !['idle', 'error'].includes(p);
export const isLimitError = (e) => /daily row write limit|D1[^.]*exceeded|code: 7500/i.test(String((e && e.message) || e));
export const LIMIT_MSG = 'The database has reached its daily write limit. Reads still work. The next sync runs after 00:00 UTC (05:30 Colombo).';
class BudgetError extends Error {}

export async function getConfig(env, shop) {
  const r = await env.DB.prepare('SELECT config FROM shops WHERE shop=?').bind(shop).first(); if (!r) return null; let c = {}, extra = {};
  try { c = JSON.parse(r.config || '{}'); } catch (e) {}
  try { extra = (JSON.parse(env.SHOP_CONFIG || '{}') || {})[shop] || {}; } catch (e) {}      // deploy-time defaults per shop; the D1 config wins
  return M.withDefaults({ ...extra, ...c, brand: { ...extra.brand, ...c.brand }, services: { ...extra.services, ...c.services }, redeem: { ...extra.redeem, ...c.redeem, welcome: { ...(extra.redeem || {}).welcome, ...(c.redeem || {}).welcome } } });
}
export async function getState(env, shop) {
  const s = await env.DB.prepare('SELECT * FROM sync_state WHERE shop=?').bind(shop).first();
  return s || { shop, phase: 'idle', offset: 0, counts: '{}', rows: 0 };
}
const S_COLS = ['phase', 'op_id', 'url', 'offset', 'started_at', 'finished_at', 'message', 'counts', 'orders_since', 'kind', 'cursor', 'rows'];
async function setState(env, shop, patch) {
  const cur = await getState(env, shop); const s = { ...cur, ...patch }; s.counts = typeof s.counts === 'string' ? s.counts : JSON.stringify(s.counts || {});
  await env.DB.prepare(`INSERT INTO sync_state (shop,${S_COLS.join(',')}) VALUES (?${',?'.repeat(S_COLS.length)}) ON CONFLICT(shop) DO UPDATE SET ${S_COLS.map((c) => `${c}=excluded.${c}`).join(',')}`)
    .bind(shop, ...S_COLS.map((c) => (c === 'offset' || c === 'rows' ? s[c] || 0 : s[c] == null ? null : s[c]))).run();
  return s;
}

// ── schema: bring an older database up to schema.sql (a handful of statements, no row rewrites) ──
const MIGRATIONS = [
  'ALTER TABLE customers ADD COLUMN state TEXT', 'ALTER TABLE customers ADD COLUMN updated_at TEXT', 'ALTER TABLE customers ADD COLUMN consent TEXT',
  'ALTER TABLE bundle_products ADD COLUMN tags TEXT', 'ALTER TABLE bundle_products ADD COLUMN created_at TEXT', 'ALTER TABLE bundle_products ADD COLUMN status TEXT',
  'ALTER TABLE sync_state ADD COLUMN kind TEXT', 'ALTER TABLE sync_state ADD COLUMN cursor TEXT', 'ALTER TABLE sync_state ADD COLUMN rows INTEGER NOT NULL DEFAULT 0',
  // no query used these; each one cost an extra row write per row
  'DROP INDEX IF EXISTS customers_tier', 'DROP INDEX IF EXISTS orders_created', 'DROP INDEX IF EXISTS lines_order',
  // last: its presence marks the migration as done
  `CREATE TABLE IF NOT EXISTS sync_log (shop TEXT NOT NULL, started_at TEXT NOT NULL, finished_at TEXT, kind TEXT, rows_written INTEGER NOT NULL DEFAULT 0, status TEXT, message TEXT, PRIMARY KEY (shop, started_at))`,
];
export async function migrated(env) {
  if (!(await env.DB.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='sync_log'`).first())) return false;
  return (await env.DB.prepare('PRAGMA table_info(customers)').all()).results.some((c) => c.name === 'state');
}
export async function migrate(env) {
  if (await migrated(env)) return false;
  for (const sql of MIGRATIONS) { try { await env.DB.prepare(sql).run(); } catch (e) { if (!/duplicate column/i.test(String(e.message || e))) throw e; } }
  return true;
}

// ── write budget ──
const utcDay = (now) => new Date(now).toISOString().slice(0, 10);
// rows written today (UTC) by finished syncs of every shop (the limit is per database account) + the sync that is running
export async function writtenToday(env, now = Date.now()) {
  const day = utcDay(now); let n = 0;
  try { n += ((await env.DB.prepare('SELECT COALESCE(SUM(rows_written),0) AS n FROM sync_log WHERE started_at >= ?').bind(day).first()) || {}).n || 0;
    n += ((await env.DB.prepare(`SELECT COALESCE(SUM(rows),0) AS n FROM sync_state WHERE phase NOT IN ('idle','error') AND started_at >= ?`).bind(day).first()) || {}).n || 0; } catch (e) { /* not migrated yet */ }
  return n;
}
const written = (res, fallback) => { const l = Array.isArray(res) ? res : [res]; let n = 0, seen = false; for (const r of l) if (r && r.meta && typeof r.meta.rows_written === 'number') { n += r.meta.rows_written; seen = true; } return seen ? n : fallback; };
const sig = (row, cols) => cols.map((c) => { const v = row[c]; return v == null ? '' : typeof v === 'number' ? String(v) : String(v); }).join('\u0001');

// Compare rows with what is stored (by key) and write only the new and the changed ones.
// budget.left = rows that may still be written today; if this batch does not fit, nothing of it is written.
export async function upsertChanged(env, table, key, cols, rows, budget) {
  if (!rows.length) return { written: 0, changed: 0, same: 0 };
  const shop = rows[0].shop; const have = new Map(); const sel = [];
  for (let i = 0; i < rows.length; i += 90) { const ids = rows.slice(i, i + 90).map((r) => r[key]);
    sel.push(env.DB.prepare(`SELECT ${[key, ...cols.filter((c) => c !== key)].join(',')} FROM ${table} WHERE shop=? AND ${key} IN (${ids.map(() => '?').join(',')})`).bind(shop, ...ids)); }
  for (let i = 0; i < sel.length; i += 50) { const res = await env.DB.batch(sel.slice(i, i + 50)); for (const r of res) for (const x of r.results) have.set(x[key], sig(x, cols)); }
  const last = new Map(); for (const r of rows) last.set(r[key], r);                         // the same key twice in one batch: the last one wins
  const changed = [...last.values()].filter((r) => have.get(r[key]) !== sig(r, cols));
  if (!changed.length) return { written: 0, changed: 0, same: rows.length };
  if (budget && changed.length > budget.left) throw new BudgetError(`${changed.length} rows to write, ${Math.max(0, budget.left)} left in today's budget`);
  const per = Math.max(1, Math.floor(99 / (cols.length + 1))); const stmts = []; const set = cols.filter((c) => c !== key).map((c) => `${c}=excluded.${c}`).join(',');
  // D1 allows 100 bound values per statement; each row also binds the shop
  for (let i = 0; i < changed.length; i += per) { const part = changed.slice(i, i + per);
    stmts.push(env.DB.prepare(`INSERT INTO ${table} (shop,${cols.join(',')}) VALUES ${part.map(() => '(' + Array(cols.length + 1).fill('?').join(',') + ')').join(',')} ON CONFLICT(shop,${key}) DO UPDATE SET ${set}`)
      .bind(...part.flatMap((r) => [r.shop, ...cols.map((c) => (r[c] === undefined ? null : r[c]))]))); }
  let w = 0; for (let i = 0; i < stmts.length; i += 50) { const part = stmts.slice(i, i + 50); w += written(await env.DB.batch(part), 0); }
  const n = w || changed.length; if (budget) budget.left -= n;
  return { written: n, changed: changed.length, same: rows.length - changed.length };
}
// kept for callers that want a plain insert (tests, seeds)
export async function insertMany(env, table, cols, rows) {
  if (!rows.length) return 0; const per = Math.max(1, Math.floor(99 / (cols.length + 1))); const stmts = [];
  for (let i = 0; i < rows.length; i += per) { const part = rows.slice(i, i + per);
    stmts.push(env.DB.prepare(`INSERT OR REPLACE INTO ${table} (shop,${cols.join(',')}) VALUES ${part.map(() => '(' + Array(cols.length + 1).fill('?').join(',') + ')').join(',')}`).bind(...part.flatMap((r) => [r.shop, ...cols.map((c) => (r[c] === undefined ? null : r[c]))]))); }
  for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
  return rows.length;
}
const C_COLS = ['id', 'name', 'tags', 'points', 'tier', 'annual_spend', 'last_reward_code', 'created_at', 'orders_count', 'amount_spent', 'last_order_at', 'state', 'updated_at', 'consent'];
const O_COLS = ['id', 'name', 'created_at', 'cancelled', 'customer_id', 'total', 'subtotal', 'discount_total', 'financial', 'fulfillment', 'pickup_status', 'ready_at', 'codes', 'tags'];   // delivery is set apart, from the fulfillment orders
const L_COLS = ['line_id', 'order_id', 'product_id', 'product_type', 'title', 'qty', 'amount', 'group_id', 'group_product_id', 'group_title', 'group_qty'];
const B_COLS = ['product_id', 'title', 'tags', 'created_at', 'status'];

// kind: 'incremental' | 'full'. Returns the sync state; state.refused says why nothing was started.
export async function startSync(env, shop, now = Date.now(), kind = 'incremental') {
  let st;
  try {
    await migrate(env); st = await getState(env, shop);
    if (RUNNING(st.phase) && now - Date.parse(st.started_at || 0) < 3 * 3600e3) return st;   // already running
    const cfg = await getConfig(env, shop); if (!cfg) throw new Error('shop not configured');
    const used = await writtenToday(env, now); const cap = Number(cfg.dailyWriteBudget) || 0;
    if (cap && used >= cap) return { ...st, refused: 'budget', message: `Sync skipped: ${used.toLocaleString('en')} rows were written today and the daily budget is ${cap.toLocaleString('en')}. It runs again after 00:00 UTC.` };
    const since = new Date(now - cfg.monthsOfOrders * 30.44 * 864e5).toISOString().slice(0, 10);
    const cursor = kind === 'full' ? null : st.cursor || null; const real = cursor ? 'incremental' : (kind === 'full' ? 'full' : 'first load');
    const op = await startBulk(env, shop, customersQuery(cursor));
    return await setState(env, shop, { phase: 'customers:export', op_id: op, url: null, offset: 0, started_at: new Date(now).toISOString(), finished_at: null, message: 'Asking Shopify for ' + (cursor ? 'changed customers' : 'customers'), counts: '{}', orders_since: since, kind: real, rows: 0 });
  } catch (e) {
    if (isLimitError(e)) return { ...(st || { shop, phase: 'idle', counts: '{}' }), refused: 'limit', message: LIMIT_MSG };
    throw e;
  }
}
// read the next slice of the export file (byte range), return whole lines + how many bytes they used
async function readLines(url, offset) {
  const r = await fetch(url, { headers: { Range: `bytes=${offset}-${offset + CHUNK - 1}` } });
  if (r.status === 416) return { lines: [], used: 0, done: true };
  if (!r.ok) throw new Error('export download failed: ' + r.status);
  let buf = new Uint8Array(await r.arrayBuffer()); let fileEnd;
  if (r.status === 200) { buf = buf.subarray(offset); fileEnd = true; } else fileEnd = buf.length < CHUNK;    // 200 = the host ignored Range and sent everything
  const dec = new TextDecoder(); const lines = []; let start = 0, used = 0;
  for (let i = 0; i < buf.length; i++) if (buf[i] === 10) { if (i > start) lines.push(dec.decode(buf.subarray(start, i))); start = i + 1; used = start; if (lines.length >= MAX_ROWS) break; }
  let done = false;
  if (lines.length < MAX_ROWS && fileEnd) { if (start < buf.length) { lines.push(dec.decode(buf.subarray(start))); used = buf.length; } done = true; }
  if (!done && used === 0) throw new Error('export line longer than one chunk');
  return { lines, used, done };
}
async function logRun(env, shop, st, now, status, message) {
  await env.DB.prepare('INSERT OR REPLACE INTO sync_log (shop,started_at,finished_at,kind,rows_written,status,message) VALUES (?,?,?,?,?,?,?)')
    .bind(shop, st.started_at || new Date(now).toISOString(), new Date(now).toISOString(), st.kind || '', st.rows || 0, status, String(message || '').slice(0, 300)).run();
  await env.DB.prepare('DELETE FROM sync_log WHERE shop=? AND started_at < ?').bind(shop, new Date(now - 60 * 864e5).toISOString()).run();   // keep 60 days
}
export async function step(env, shop, now = Date.now()) {
  let st = await getState(env, shop); if (!RUNNING(st.phase)) return st;
  const counts = typeof st.counts === 'string' ? JSON.parse(st.counts || '{}') : (st.counts || {});
  try {
    const cfg = await getConfig(env, shop); const cap = Number(cfg.dailyWriteBudget) || 0;
    const budget = cap ? { left: cap - await writtenToday(env, now) } : null; const before = budget ? budget.left : 0; let wrote = 0;
    const add = (r) => { wrote += r.written; return r; };
    const save = (patch) => setState(env, shop, { ...patch, counts, rows: (st.rows || 0) + wrote });
    if (st.phase === 'customers:export' || st.phase === 'orders:export') {
      const b = await bulkStatus(env, shop, st.op_id); const what = st.phase.split(':')[0];
      if (b.status === 'COMPLETED') {
        if (!b.url) { counts[what] = 0; return save(what === 'customers' ? await nextOrders(env, shop, st, cfg, budget, add) : { phase: 'snapshot', message: 'Calculating' }); }
        return save({ phase: what + ':load', url: b.url, offset: 0, message: `Checking ${what} (${b.objectCount} rows from Shopify)` });
      }
      if (['FAILED', 'CANCELED', 'EXPIRED'].includes(b.status)) { st = await save({ phase: 'error', message: `${what} export ${b.status} ${b.errorCode || ''}`, finished_at: new Date(now).toISOString() }); await logRun(env, shop, st, now, 'error', st.message); return st; }
      return st;                                                                              // still exporting: nothing to write
    }
    if (st.phase === 'customers:load') {
      const { lines, used, done } = await readLines(st.url, st.offset);
      const rows = lines.map((l) => ({ shop, ...customerRow(JSON.parse(l)) })); const r = add(await upsertChanged(env, 'customers', 'id', C_COLS, rows, budget));
      counts.customers = (counts.customers || 0) + rows.length; counts.customersWritten = (counts.customersWritten || 0) + r.written;
      if (done) return save(await nextOrders(env, shop, st, cfg, budget, add));
      return save({ offset: st.offset + used, message: `Checking customers (${counts.customers})` });
    }
    if (st.phase === 'orders:load') {
      const { lines, used, done } = await readLines(st.url, st.offset); const orders = [], items = [], pick = new Map();
      for (const l of lines) { const n = JSON.parse(l);
        if (!n.__parentId) orders.push({ shop, ...orderRow(n) });
        else if (n.id.includes('/LineItem/')) items.push({ shop, ...lineRow(n) });
        else if (n.id.includes('/FulfillmentOrder/') && n.deliveryMethod) { const m = n.deliveryMethod.methodType; if (pick.get(n.__parentId) !== 'PICK_UP') pick.set(n.__parentId, m); } }   // PICK_UP wins over anything else on the same order
      const ro = add(await upsertChanged(env, 'orders', 'id', O_COLS, orders, budget)); const rl = add(await upsertChanged(env, 'order_lines', 'line_id', L_COLS, items, budget));
      const rd = add(await upsertChanged(env, 'orders', 'id', ['id', 'delivery'], await deliveryRows(env, shop, pick), budget));
      counts.orders = (counts.orders || 0) + orders.length; counts.lines = (counts.lines || 0) + items.length; counts.ordersWritten = (counts.ordersWritten || 0) + ro.written + rd.written; counts.linesWritten = (counts.linesWritten || 0) + rl.written;
      if (done) return save({ phase: 'snapshot', url: null, offset: 0, message: 'Calculating' });
      return save({ offset: st.offset + used, message: `Checking orders (${counts.orders})` });
    }
    if (st.phase === 'snapshot') {
      if (st.kind !== 'incremental') {                                                        // tidy: orders that fell out of the window
        const old = (await env.DB.prepare('SELECT COUNT(*) AS n FROM orders WHERE shop=? AND created_at < ?').bind(shop, st.orders_since).first()).n;
        if (old && (!budget || old * 3 <= budget.left)) { const res = await env.DB.batch([env.DB.prepare('DELETE FROM order_lines WHERE shop=? AND order_id IN (SELECT id FROM orders WHERE shop=? AND created_at < ?)').bind(shop, shop, st.orders_since), env.DB.prepare('DELETE FROM orders WHERE shop=? AND created_at < ?').bind(shop, st.orders_since)]); wrote += written(res, old); counts.pruned = old; }
      }
      await snapshot(env, shop, now); wrote += 3;
      try { const k = await klaviyoData(env, now, cfg); await env.DB.prepare('INSERT OR REPLACE INTO snapshots (shop,key,json,updated_at) VALUES (?,?,?,?)').bind(shop, 'klaviyo', JSON.stringify(k), new Date(now).toISOString()).run(); wrote += 1; } catch (e) { if (isLimitError(e)) throw e; console.log('klaviyo skipped', String(e.message || e).slice(0, 120)); }
      wrote += 4;                                                                              // this state row + the log row
      try { await saveDash(env, shop, now); wrote += 1; } catch (e) { if (isLimitError(e)) throw e; console.log('dash snapshot skipped', String(e.message || e).slice(0, 120)); }
      const total = (st.rows || 0) + wrote; const msg = `Up to date: ${total.toLocaleString('en')} rows written`;
      // next time, ask only for what changed after this sync began (5 minutes of overlap, harmless: unchanged rows are skipped)
      st = await setState(env, shop, { phase: 'idle', op_id: null, url: null, offset: 0, finished_at: new Date(now).toISOString(), message: msg, counts, rows: total, cursor: new Date(Date.parse(st.started_at) - 5 * 60e3).toISOString() });
      await logRun(env, shop, st, now, 'ok', msg); return st;
    }
    return st;
  } catch (e) {
    const budgetStop = e instanceof BudgetError; const limit = isLimitError(e);
    const message = budgetStop ? `Sync stopped before passing today's write budget (${e.message}). Nothing was half-written. It picks up after 00:00 UTC.` : limit ? LIMIT_MSG : String(e.message || e).slice(0, 300);
    try { st = await setState(env, shop, { phase: budgetStop || limit ? 'idle' : 'error', op_id: null, url: null, offset: 0, message, finished_at: new Date(now).toISOString() }); await logRun(env, shop, st, now, budgetStop || limit ? 'stopped' : 'error', message); return st; }
    catch (e2) { return { ...st, phase: 'idle', message: LIMIT_MSG, refused: 'limit' }; }       // the database refuses writes: report it, change nothing
  }
}
async function deliveryRows(env, shop, pick) {
  // an order already marked PICK_UP stays PICK_UP
  const ids = [...pick.keys()]; const cur = new Map(); const sel = [];
  for (let i = 0; i < ids.length; i += 90) { const part = ids.slice(i, i + 90); sel.push(env.DB.prepare(`SELECT id, delivery FROM orders WHERE shop=? AND id IN (${part.map(() => '?').join(',')})`).bind(shop, ...part)); }
  for (let i = 0; i < sel.length; i += 50) for (const r of await env.DB.batch(sel.slice(i, i + 50))) for (const x of r.results) cur.set(x.id, x.delivery);
  return ids.filter((id) => cur.has(id) && cur.get(id) !== 'PICK_UP').map((id) => ({ shop, id, delivery: pick.get(id) }));
}
async function nextOrders(env, shop, st, cfg, budget, add) {
  const bp = await bundleProducts(env, shop, cfg.bundleProductType);
  add(await upsertChanged(env, 'bundle_products', 'product_id', B_COLS, bp.map((p) => ({ shop, product_id: p.id, title: p.title, tags: (p.tags || []).join(','), created_at: p.createdAt || null, status: p.status || '' })), budget));
  const op = await startBulk(env, shop, ordersQuery(st.orders_since, st.kind === 'incremental' ? st.cursor : null));
  return { phase: 'orders:export', op_id: op, url: null, offset: 0, message: 'Asking Shopify for ' + (st.kind === 'incremental' ? 'changed orders' : 'orders') };
}

async function allRows(env, sql, shop) { const out = []; for (let off = 0; ; off += 20000) { const r = await env.DB.prepare(sql + ' LIMIT 20000 OFFSET ?').bind(shop, off).all(); out.push(...r.results); if (r.results.length < 20000) break; } return out; }
// Everything the dashboard shows, computed from the cached rows. Read-only unless write = true.
export async function compute(env, shop, now = Date.now()) {
  const cfg = await getConfig(env, shop);
  const customers = await allRows(env, 'SELECT * FROM customers WHERE shop=? ORDER BY id', shop);
  const orders = await allRows(env, 'SELECT * FROM orders WHERE shop=? ORDER BY id', shop);
  const lines = await allRows(env, 'SELECT order_id,product_id,product_type,title,qty,amount,group_id,group_product_id,group_title,group_qty FROM order_lines WHERE shop=? ORDER BY line_id', shop);
  const bundles = await allRows(env, 'SELECT * FROM bundle_products WHERE shop=? ORDER BY product_id', shop);
  return M.buildData(customers, orders, lines, bundles, cfg, now);
}
export async function snapshot(env, shop, now = Date.now()) {
  const data = await compute(env, shop, now); const ts = new Date(now).toISOString();
  await env.DB.prepare('INSERT OR REPLACE INTO snapshots (shop,key,json,updated_at) VALUES (?,?,?,?)').bind(shop, 'data', JSON.stringify(data), ts).run();
  return data;
}
export async function syncLog(env, shop, limit = 15) { try { return (await env.DB.prepare('SELECT started_at,finished_at,kind,rows_written,status,message FROM sync_log WHERE shop=? ORDER BY started_at DESC LIMIT ?').bind(shop, limit).all()).results; } catch (e) { return []; } }

// The dashboard's first screen as ONE row (snapshots key 'dash'): the numbers, Klaviyo, the sync log. Written at the end of
// every sync, so the page needs a single read before it can draw. The live sync state and the write counter are added on request.
export async function saveDash(env, shop, now = Date.now()) {
  const rows = (await env.DB.prepare(`SELECT key, json, updated_at FROM snapshots WHERE shop=? AND key IN ('data','klaviyo')`).bind(shop).all()).results;
  const by = Object.fromEntries(rows.map((r) => [r.key, r])); if (!by.data) return null;
  const k = by.klaviyo ? JSON.parse(by.klaviyo.json) : null;
  const dash = { data: JSON.parse(by.data.json), klaviyo: k && k.flows ? k : null, klaviyo_at: by.klaviyo ? by.klaviyo.updated_at : null, log: await syncLog(env, shop), built_at: new Date(now).toISOString() };
  await env.DB.prepare('INSERT OR REPLACE INTO snapshots (shop,key,json,updated_at) VALUES (?,?,?,?)').bind(shop, 'dash', JSON.stringify(dash), dash.built_at).run();
  return dash;
}
