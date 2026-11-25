// SNH Ops dashboard: embedded Shopify admin app on Cloudflare Workers + D1.
// - GET /            → the app page (no store data in it)
// - /api/*           → JSON, every request needs a valid Shopify session token (Authorization: Bearer …)
// - cron 20:30 UTC   → nightly incremental sync (02:00 Asia/Colombo); every 2 min → advance a sync that is in progress
// READ-ONLY against Shopify and Klaviyo. The page's numbers come from D1 only.
import { verify } from './auth.mjs';
import { getConfig, getState, startSync, step, compute, syncLog, writtenToday, migrated, isLimitError, LIMIT_MSG, saveDash } from './sync.mjs';
import { page } from './ui.mjs';
import { runRedeem, runWelcome, redeemStatus } from './redeem.mjs';
import { subsApi, runSubs } from './subs.mjs';
import { consoleFetch } from './console.mjs';
import { gql } from './shopify.mjs';

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const SHOP_RE = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;
async function snap(env, shop, key) { const r = await env.DB.prepare('SELECT json, updated_at FROM snapshots WHERE shop=? AND key=?').bind(shop, key).first(); return r ? { data: JSON.parse(r.json), updated_at: r.updated_at } : { data: null, updated_at: null }; }
const pubState = (s) => ({ phase: s.phase, kind: s.kind || '', message: s.message, started_at: s.started_at, finished_at: s.finished_at, rows: s.rows || 0, refused: s.refused || '',
  counts: typeof s.counts === 'string' ? JSON.parse(s.counts || '{}') : (s.counts || {}), running: !['idle', 'error'].includes(s.phase) });
export const isAdmin = (cfg, user) => !(cfg.admins || []).length || (cfg.admins || []).map(String).includes(String(user));

async function serviceHealth(url) {
  if (!url) return { status: 'not deployed' };
  try { const r = await fetch(url, { signal: AbortSignal.timeout(5000) }); return { status: r.ok ? 'running' : 'error ' + r.status }; } catch (e) { return { status: 'unreachable' }; }
}
// Until the first v2 sync has stored a snapshot, the numbers are worked out from the cached rows on request (and kept in memory for 10 minutes).
const live = new Map();
async function dataFor(env, shop, now) {
  const s = await snap(env, shop, 'data'); if (s.data && s.data.version === 2) return { data: s.data, interim: false };
  const hit = live.get(shop); if (hit && now - hit.at < 600e3) return { data: hit.data, interim: true };
  const data = await compute(env, shop, now); live.set(shop, { at: now, data }); return { data, interim: true };
}
const SORTS = { points: 'points DESC', spend: 'annual_spend DESC', name: 'name COLLATE NOCASE ASC', recent: 'last_order_at DESC', joined: 'created_at DESC' };
export async function api(req, env, ctx, who, now = Date.now()) {
  const shop = who.shop; const u = new URL(req.url); const path = u.pathname.replace(/^\/api\//, ''); const cfg = await getConfig(env, shop);
  if (!cfg) return json({ error: 'This store is not set up in SNH Ops yet.' }, 403);
  const state = await getState(env, shop);
  if (path === 'status') { if (pubState(state).running) { const s = await step(env, shop, now); return json({ sync: pubState(s) }); } return json({ sync: pubState(state) }); }
  if ((path === 'refresh' || path === 'resync') && req.method === 'POST') {
    if (path === 'resync' && !isAdmin(cfg, who.user)) return json({ error: 'Only an admin can run a full resync.' }, 403);
    const s = await startSync(env, shop, now, path === 'resync' ? 'full' : 'incremental'); return json({ sync: pubState(s) });
  }
  if (path === 'data') {
    // one precomputed row ('dash', written at the end of every sync) + the live sync state and write counter.
    // Server-Timing shows where the time goes (see docs/golive/OPS-DASHBOARD-SPEED.md).
    const T = []; const tm = async (name, f) => { const a = Date.now(); const v = await f(); T.push(`${name};dur=${Date.now() - a}`); return v; };
    const [dash, used, mig] = await Promise.all([tm('dash', () => snap(env, shop, 'dash')), tm('writes', () => writtenToday(env, now)), tm('migrated', () => migrated(env))]);
    let body;
    if (dash.data && dash.data.data && dash.data.data.version === 2) body = { ...dash.data, interim: false, source: 'dash' };
    else {                                                                                     // no dash row yet: build it from the parts once
      const [d, kl, log] = await tm('parts', () => Promise.all([dataFor(env, shop, now), snap(env, shop, 'klaviyo'), syncLog(env, shop)]));
      body = { data: d.data, interim: d.interim, klaviyo: kl.data && kl.data.flows ? kl.data : null, klaviyo_at: kl.updated_at, log, source: 'parts' };
      if (!d.interim) { const pr = saveDash(env, shop, now).catch(() => {}); if (ctx && ctx.waitUntil) ctx.waitUntil(pr); else await pr; }
    }
    const res = json({ ...body, sync: pubState(state), writes: { today: used, budget: Number(cfg.dailyWriteBudget) || 0, pendingSetup: !mig },
      config: { currency: cfg.currency, brand: cfg.brand, newBundleTag: cfg.newBundleTag, klaviyoFlowPrefix: cfg.klaviyoFlowPrefix }, user: { id: who.user || '', admin: isAdmin(cfg, who.user) } });
    res.headers.set('Server-Timing', T.join(', ')); return res;
  }
  if (path === 'x-pos/customer') {                                                    // POS tile: one customer's points (read-only)
    const id = String(u.searchParams.get('id') || '').replace(/\D/g, ''); if (!id) return json({ error: 'no customer' }, 400);
    const d = await gql(env, shop, `query($id:ID!){customer(id:$id){displayName state pts:metafield(namespace:"custom",key:"loyalty_points"){value} tier:metafield(namespace:"custom",key:"loyalty_tier"){value} codes:metafield(namespace:"custom",key:"reward_codes"){value}}}`, { id: 'gid://shopify/Customer/' + id });
    const c = d.customer; if (!c) return json({ error: 'Customer not found' }, 404); const pts = Math.round(Number((c.pts && c.pts.value) || 0)); let codes = []; try { codes = JSON.parse((c.codes && c.codes.value) || '[]').filter((x) => x && x.status === 'active').map((x) => x.code); } catch (e) {}
    const status = c.state === 'ENABLED' ? 'enabled' : c.state === 'INVITED' ? 'invited' : 'no account';
    return json({ name: c.displayName, points: pts, value: Math.floor(pts * (cfg.pointValue || 1)), tier: (c.tier && c.tier.value) || '', status, codes, canRedeem: status === 'enabled' && pts >= 2500 });
  }
  if (path === 'subs' || path.startsWith('subs/')) return subsApi(path, req, env, shop, now); // SUBS_MODE off → 404
  if (path === 'redeem') return json(await redeemStatus(env, shop, now));
  if (path === 'redeem/run' && req.method === 'POST') {
    if (!isAdmin(cfg, who.user)) return json({ error: 'Only an admin can run this.' }, 403);
    const redeem = await runRedeem(env, shop, now); const welcome = await runWelcome(env, shop, now); return json({ redeem, welcome, status: await redeemStatus(env, shop, now) });
  }
  if (path === 'services') { const [cc, sms] = await Promise.all([serviceHealth(cfg.services.clickCollectUrl), serviceHealth(cfg.services.smsUrl)]); return json({ clickCollect: cc, sms }); }
  if (path === 'members') {
    const q = (u.searchParams.get('q') || '').trim().slice(0, 60); const pg = Math.max(0, parseInt(u.searchParams.get('page') || '0', 10) || 0); const all = u.searchParams.get('all') === '1'; const size = 50;
    const hasState = (await migrated(env)); const scope = u.searchParams.get('scope') === 'records' || !hasState ? 'records' : 'members';
    const tier = (u.searchParams.get('tier') || '').trim().slice(0, 30); const sort = SORTS[u.searchParams.get('sort')] || SORTS.points;
    let where = 'shop=?'; const args = [shop];
    if (scope === 'members') where += ` AND state='ENABLED'`;
    if (q) { where += ' AND name LIKE ?'; args.push(`%${q}%`); }
    if (tier) { where += ' AND tier = ? COLLATE NOCASE'; args.push(tier); }
    const cols = 'id,name,tier,points,annual_spend,last_order_at,created_at,orders_count,amount_spent' + (hasState ? ',state,consent' : '');
    if (all) { const rows = []; for (let off = 0; ; off += 20000) { const r = await env.DB.prepare(`SELECT ${cols} FROM customers WHERE ${where} ORDER BY ${sort} LIMIT 20000 OFFSET ?`).bind(...args, off).all(); rows.push(...r.results); if (r.results.length < 20000) break; } return json({ rows, total: rows.length, scope }); }
    const total = await env.DB.prepare(`SELECT COUNT(*) AS n FROM customers WHERE ${where}`).bind(...args).first();
    const r = await env.DB.prepare(`SELECT ${cols} FROM customers WHERE ${where} ORDER BY ${sort} LIMIT ? OFFSET ?`).bind(...args, size, pg * size).all();
    return json({ rows: r.results, total: total.n, page: pg, size, scope });
  }
  return json({ error: 'not found' }, 404);
}
const handler = {
  async fetch(req, env, ctx) {
    const u = new URL(req.url);
    const pos = u.pathname.startsWith('/api/pos/'); const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Max-Age': '600' };
    if (pos && req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });   // POS tile: bearer token only, no cookies
    if (pos) { const r = await handler.fetch(new Request(req.url.replace('/api/pos/', '/api/x-pos/'), req), env, ctx); const h = new Headers(r.headers); for (const [k, v] of Object.entries(cors)) h.set(k, v); return new Response(r.body, { status: r.status, headers: h }); }
    if (u.pathname.startsWith('/api/')) {
      let who; try { who = await verify((req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, ''), { clientId: env.SHOPIFY_CLIENT_ID, clientSecret: env.SHOPIFY_CLIENT_SECRET }); } catch (e) { return json({ error: 'unauthorized' }, 401); }
      try { return await api(req, env, ctx, who); } catch (e) { if (isLimitError(e)) return json({ error: LIMIT_MSG }, 503); console.log('api error', String(e.message || e).slice(0, 200)); return json({ error: 'Something went wrong. Try again.' }, 500); }
    }
    if (u.pathname === '/console' || u.pathname.startsWith('/console/')) return consoleFetch(req, env, ctx);
    if (u.pathname === '/favicon.ico') return Response.redirect(new URL('/console/favicon.ico', req.url).toString(), 301);
    if (u.pathname === '/health') return new Response('ok');
    const shop = u.searchParams.get('shop') || ''; const fa = SHOP_RE.test(shop) ? `https://${shop} https://admin.shopify.com` : 'https://admin.shopify.com https://*.myshopify.com';
    let video = ''; try { video = ((JSON.parse(env.SHOP_CONFIG || '{}')[shop] || {}).brand || {}).loopVideoUrl || ''; } catch (e) {}
    return new Response(page(env.SHOPIFY_CLIENT_ID || '', '', video), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': `frame-ancestors ${fa};`, 'Cache-Control': 'no-store' } });
  },
  async scheduled(event, env, ctx) {
    const shops = (await env.DB.prepare('SELECT shop FROM shops').all()).results.map((r) => r.shop); const nightly = event.cron === '30 20 * * *';
    if (event.cron === '*/5 * * * *') { for (const shop of shops) ctx.waitUntil((async () => { try { await runRedeem(env, shop, event.scheduledTime); await runWelcome(env, shop, event.scheduledTime); await runSubs(env, shop, event.scheduledTime); } catch (e) { console.log('redeem run error', shop, String(e.message || e).slice(0, 200)); } })()); return; }
    const t = new Date(event.scheduledTime || Date.now()); const justAfterReset = t.getUTCHours() === 0 && t.getUTCMinutes() < 10;   // the daily write allowance starts again at 00:00 UTC
    for (const shop of shops) ctx.waitUntil((async () => { try {
      const s = await getState(env, shop); const running = !['idle', 'error'].includes(s.phase);
      if (running) await step(env, shop);
      else if (nightly) await startSync(env, shop, event.scheduledTime);
      // one catch-up try a day, right after the allowance resets, for a store that has never finished a sync on this version
      else if (justAfterReset && !s.cursor) await startSync(env, shop, event.scheduledTime);
    } catch (e) { console.log('sync error', shop, String(e.message || e).slice(0, 200)); } })());
  },
};
export default handler;
