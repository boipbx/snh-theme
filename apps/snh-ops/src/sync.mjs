// Sync state machine: one small step per call, so it fits Cloudflare's per-request limits.
// idle → customers:export → customers:load → orders:export → orders:load → snapshot → idle
import { startBulk, bulkStatus, CUSTOMERS_QUERY, ordersQuery, customerRow, orderRow, lineRow, bundleProducts } from './shopify.mjs';
import * as M from './metrics.mjs';

const CHUNK = 1_500_000, MAX_ROWS = 12_000;
export async function getConfig(env, shop) { const r = await env.DB.prepare('SELECT config FROM shops WHERE shop=?').bind(shop).first(); if (!r) return null; let c = {}; try { c = JSON.parse(r.config || '{}'); } catch (e) {} return M.withDefaults(c); }
export async function getState(env, shop) {
  const s = await env.DB.prepare('SELECT * FROM sync_state WHERE shop=?').bind(shop).first();
  return s || { shop, phase: 'idle', offset: 0, counts: '{}' };
}
async function setState(env, shop, patch) {
  const cur = await getState(env, shop); const s = { ...cur, ...patch };
  await env.DB.prepare(`INSERT INTO sync_state (shop,phase,op_id,url,offset,started_at,finished_at,message,counts,orders_since) VALUES (?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(shop) DO UPDATE SET phase=excluded.phase,op_id=excluded.op_id,url=excluded.url,offset=excluded.offset,started_at=excluded.started_at,finished_at=excluded.finished_at,message=excluded.message,counts=excluded.counts,orders_since=excluded.orders_since`)
    .bind(shop, s.phase, s.op_id || null, s.url || null, s.offset || 0, s.started_at || null, s.finished_at || null, s.message || null, typeof s.counts === 'string' ? s.counts : JSON.stringify(s.counts || {}), s.orders_since || null).run();
  return s;
}
export async function startSync(env, shop, now = Date.now()) {
  const st = await getState(env, shop); if (st.phase !== 'idle' && st.phase !== 'error' && now - Date.parse(st.started_at || 0) < 3 * 3600e3) return st;   // already running
  const cfg = await getConfig(env, shop); if (!cfg) throw new Error('shop not configured');
  const since = new Date(now - cfg.monthsOfOrders * 30.44 * 864e5).toISOString().slice(0, 10);
  const op = await startBulk(env, shop, CUSTOMERS_QUERY);
  return setState(env, shop, { phase: 'customers:export', op_id: op, url: null, offset: 0, started_at: new Date(now).toISOString(), finished_at: null, message: 'Exporting customers', counts: '{}', orders_since: since });
}
async function insertMany(env, table, cols, rows) {
  if (!rows.length) return 0; const per = Math.max(1, Math.floor(95 / cols.length)); const stmts = [];
  for (let i = 0; i < rows.length; i += per) { const part = rows.slice(i, i + per);
    stmts.push(env.DB.prepare(`INSERT OR REPLACE INTO ${table} (shop,${cols.join(',')}) VALUES ${part.map(() => '(' + Array(cols.length + 1).fill('?').join(',') + ')').join(',')}`).bind(...part.flatMap((r) => [r.shop, ...cols.map((c) => (r[c] === undefined ? null : r[c]))]))); }
  for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
  return rows.length;
}
const C_COLS = ['id', 'name', 'tags', 'points', 'tier', 'annual_spend', 'last_reward_code', 'created_at', 'orders_count', 'amount_spent', 'last_order_at'];
const O_COLS = ['id', 'name', 'created_at', 'cancelled', 'customer_id', 'total', 'subtotal', 'discount_total', 'financial', 'fulfillment', 'delivery', 'pickup_status', 'ready_at', 'codes', 'tags'];
const L_COLS = ['line_id', 'order_id', 'product_id', 'product_type', 'title', 'qty', 'amount', 'group_id', 'group_product_id', 'group_title', 'group_qty'];

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
export async function step(env, shop, now = Date.now()) {
  const st = await getState(env, shop); const counts = JSON.parse(st.counts || '{}');
  try {
    if (st.phase === 'customers:export' || st.phase === 'orders:export') {
      const b = await bulkStatus(env, shop, st.op_id); const what = st.phase.split(':')[0];
      if (b.status === 'COMPLETED') {
        if (what === 'customers') await env.DB.prepare('DELETE FROM customers WHERE shop=?').bind(shop).run();
        else await env.DB.batch([env.DB.prepare('DELETE FROM orders WHERE shop=?').bind(shop), env.DB.prepare('DELETE FROM order_lines WHERE shop=?').bind(shop)]);
        if (!b.url) return setState(env, shop, what === 'customers' ? await nextOrders(env, shop, st) : { phase: 'snapshot', message: 'Calculating' });
        return setState(env, shop, { phase: what + ':load', url: b.url, offset: 0, message: `Loading ${what} (${b.objectCount} rows)` });
      }
      if (['FAILED', 'CANCELED', 'EXPIRED'].includes(b.status)) return setState(env, shop, { phase: 'error', message: `${what} export ${b.status} ${b.errorCode || ''}`, finished_at: new Date(now).toISOString() });
      return setState(env, shop, { message: `Exporting ${what} (${b.objectCount || 0} so far)` });
    }
    if (st.phase === 'customers:load') {
      const { lines, used, done } = await readLines(st.url, st.offset);
      const rows = lines.map((l) => ({ shop, ...customerRow(JSON.parse(l)) })); counts.customers = (counts.customers || 0) + await insertMany(env, 'customers', C_COLS, rows);
      if (done) return setState(env, shop, { ...(await nextOrders(env, shop, st)), counts });
      return setState(env, shop, { offset: st.offset + used, counts, message: `Loading customers (${counts.customers})` });
    }
    if (st.phase === 'orders:load') {
      const { lines, used, done } = await readLines(st.url, st.offset); const orders = [], items = [], pickups = [];
      for (const l of lines) { const n = JSON.parse(l);
        if (!n.__parentId) orders.push({ shop, ...orderRow(n) });
        else if (n.id.includes('/LineItem/')) items.push({ shop, ...lineRow(n) });
        else if (n.id.includes('/FulfillmentOrder/') && n.deliveryMethod) pickups.push([n.deliveryMethod.methodType, n.__parentId]); }
      counts.orders = (counts.orders || 0) + await insertMany(env, 'orders', O_COLS, orders); counts.lines = (counts.lines || 0) + await insertMany(env, 'order_lines', L_COLS, items);
      // delivery method: PICK_UP wins over anything else on the same order
      const upd = pickups.map(([m, id]) => env.DB.prepare(`UPDATE orders SET delivery = CASE WHEN delivery='PICK_UP' THEN delivery ELSE ? END WHERE shop=? AND id=?`).bind(m, shop, id));
      for (let i = 0; i < upd.length; i += 50) await env.DB.batch(upd.slice(i, i + 50));
      if (done) return setState(env, shop, { phase: 'snapshot', url: null, offset: 0, counts, message: 'Calculating' });
      return setState(env, shop, { offset: st.offset + used, counts, message: `Loading orders (${counts.orders})` });
    }
    if (st.phase === 'snapshot') { await snapshot(env, shop, now); return setState(env, shop, { phase: 'idle', op_id: null, url: null, offset: 0, finished_at: new Date(now).toISOString(), message: 'Up to date', counts }); }
    return st;
  } catch (e) { return setState(env, shop, { phase: 'error', message: String(e.message || e).slice(0, 300), finished_at: new Date(now).toISOString() }); }
}
async function nextOrders(env, shop, st) {
  const cfg = await getConfig(env, shop); const bp = await bundleProducts(env, shop, cfg.bundleProductType);
  await env.DB.prepare('DELETE FROM bundle_products WHERE shop=?').bind(shop).run(); await insertMany(env, 'bundle_products', ['product_id', 'title'], bp.map((p) => ({ shop, product_id: p.id, title: p.title })));
  const op = await startBulk(env, shop, ordersQuery(st.orders_since)); return { phase: 'orders:export', op_id: op, url: null, offset: 0, message: 'Exporting orders' }; }

async function allRows(env, sql, shop) { const out = []; for (let off = 0; ; off += 20000) { const r = await env.DB.prepare(sql + ' LIMIT 20000 OFFSET ?').bind(shop, off).all(); out.push(...r.results); if (r.results.length < 20000) break; } return out; }
export async function snapshot(env, shop, now = Date.now()) {
  const cfg = await getConfig(env, shop);
  const customers = await allRows(env, 'SELECT id,name,points,tier,annual_spend,last_reward_code,created_at,last_order_at FROM customers WHERE shop=? ORDER BY id', shop);
  const orders = await allRows(env, 'SELECT * FROM orders WHERE shop=? ORDER BY id', shop);
  const lines = await allRows(env, 'SELECT order_id,product_id,product_type,title,qty,amount,group_id,group_product_id,group_title,group_qty FROM order_lines WHERE shop=? ORDER BY line_id', shop);
  const bundleIds = (await allRows(env, 'SELECT product_id FROM bundle_products WHERE shop=? ORDER BY product_id', shop)).map((r) => r.product_id);
  const snaps = {
    overview: M.overview(customers, orders, cfg, now),
    loyalty: { close: M.closeToNextTier(customers, cfg).slice(0, 300), closeCount: M.closeToNextTier(customers, cfg).length, redeemable: M.redeemable(customers, cfg).slice(0, 300), redeemableCount: M.redeemable(customers, cfg).length, health: M.dataHealth(customers, orders, cfg, now) },
    bundles: { ...M.bundleStats(orders, lines, cfg, now, 30, bundleIds), bundleProducts: bundleIds.length },
    promotions: { prefix: cfg.promoCodePrefix, rows: M.promoUsage(orders, cfg) },
    operations: { pickup: M.pickupOrders(orders, cfg, now).slice(0, 200) },
    meta: { computed_at: new Date(now).toISOString(), customers: customers.length, orders: orders.length, lines: lines.length, currency: cfg.currency },
  };
  const ts = new Date(now).toISOString();
  await env.DB.batch(Object.entries(snaps).map(([k, v]) => env.DB.prepare('INSERT OR REPLACE INTO snapshots (shop,key,json,updated_at) VALUES (?,?,?,?)').bind(shop, k, JSON.stringify(v), ts)));
  return snaps;
}
