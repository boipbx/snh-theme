// SNH Ops dashboard: embedded Shopify admin app on Cloudflare Workers + D1.
// - GET /            → the app page (no store data in it)
// - /api/*           → JSON, every request needs a valid Shopify session token (Authorization: Bearer …)
// - cron 20:30 UTC   → nightly sync (02:00 Asia/Colombo); every 2 min → advance a sync that is in progress
// READ-ONLY against Shopify and Klaviyo.
import { verify } from './auth.mjs';
import { getConfig, getState, startSync, step } from './sync.mjs';
import { flowStats } from './klaviyo.mjs';
import { page } from './ui.mjs';

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const SHOP_RE = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;
async function snap(env, shop, key) { const r = await env.DB.prepare('SELECT json, updated_at FROM snapshots WHERE shop=? AND key=?').bind(shop, key).first(); return r ? { data: JSON.parse(r.json), updated_at: r.updated_at } : { data: null, updated_at: null }; }
const pubState = (s) => ({ phase: s.phase, message: s.message, started_at: s.started_at, finished_at: s.finished_at, counts: JSON.parse(s.counts || '{}'), running: !['idle', 'error'].includes(s.phase) });

async function serviceHealth(url) {
  if (!url) return { status: 'not deployed' };
  try { const r = await fetch(url, { signal: AbortSignal.timeout(5000) }); return { status: r.ok ? 'running' : 'error ' + r.status }; } catch (e) { return { status: 'unreachable' }; }
}
export async function api(req, env, ctx, shop, now = Date.now()) {
  const u = new URL(req.url); const path = u.pathname.replace(/^\/api\//, ''); const cfg = await getConfig(env, shop);
  if (!cfg) return json({ error: 'This store is not set up in SNH Ops yet.' }, 403);
  const state = await getState(env, shop);
  if (path === 'status') { if (pubState(state).running) { const s = await step(env, shop, now); return json({ sync: pubState(s) }); } return json({ sync: pubState(state) }); }
  if (path === 'refresh' && req.method === 'POST') { const s = await startSync(env, shop, now); return json({ sync: pubState(s) }); }
  if (['overview', 'loyalty', 'bundles', 'promotions'].includes(path)) { const s = await snap(env, shop, path); const meta = await snap(env, shop, 'meta'); return json({ ...s, meta: meta.data, sync: pubState(state), config: { currency: cfg.currency, tiers: cfg.tiers, rewardPoints: cfg.rewardPoints, pointValue: cfg.pointValue } }); }
  if (path === 'operations') {
    const s = await snap(env, shop, 'operations'); let kl = await snap(env, shop, 'klaviyo');
    if (!kl.data || now - Date.parse(kl.updated_at) > 3600e3) { try { const d = await flowStats(env, now); await env.DB.prepare('INSERT OR REPLACE INTO snapshots (shop,key,json,updated_at) VALUES (?,?,?,?)').bind(shop, 'klaviyo', JSON.stringify(d), new Date(now).toISOString()).run(); kl = { data: d, updated_at: new Date(now).toISOString() }; } catch (e) { kl = { data: { configured: true, error: 'Klaviyo did not answer', rows: (kl.data && kl.data.rows) || [] }, updated_at: kl.updated_at }; } }
    const [cc, sms] = await Promise.all([serviceHealth(cfg.services.clickCollectUrl), serviceHealth(cfg.services.smsUrl)]);
    return json({ data: { ...(s.data || { pickup: [] }), klaviyo: kl.data, klaviyo_at: kl.updated_at, services: { clickCollect: cc, sms } }, updated_at: s.updated_at, sync: pubState(state), config: { currency: cfg.currency, pickupHoldHours: cfg.pickupHoldHours } });
  }
  if (path === 'members' || path === 'members.csv') {
    const q = (u.searchParams.get('q') || '').trim().slice(0, 60); const csv = path.endsWith('.csv'); const pg = Math.max(0, parseInt(u.searchParams.get('page') || '0', 10) || 0); const size = 50;
    const where = `shop=? AND (tier<>'' OR points IS NOT NULL)` + (q ? ` AND (name LIKE ? OR tier LIKE ?)` : ''); const args = q ? [shop, `%${q}%`, `${q}%`] : [shop];
    if (csv) {
      const rows = []; for (let off = 0; ; off += 20000) { const r = await env.DB.prepare(`SELECT name,tier,points,annual_spend,last_order_at,id FROM customers WHERE ${where} ORDER BY points DESC LIMIT 20000 OFFSET ?`).bind(...args, off).all(); rows.push(...r.results); if (r.results.length < 20000) break; }
      const esc = (v) => { let s = v == null ? '' : String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
      const body = 'Name,Tier,Points,Annual spend,Last order,Customer ID\n' + rows.map((r) => [r.name, r.tier, r.points, r.annual_spend, (r.last_order_at || '').slice(0, 10), String(r.id).split('/').pop()].map(esc).join(',')).join('\n');
      return new Response(body, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="elite-members.csv"', 'Cache-Control': 'no-store' } });
    }
    const total = await env.DB.prepare(`SELECT COUNT(*) AS n FROM customers WHERE ${where}`).bind(...args).first();
    const r = await env.DB.prepare(`SELECT id,name,tier,points,annual_spend,last_order_at FROM customers WHERE ${where} ORDER BY points DESC LIMIT ? OFFSET ?`).bind(...args, size, pg * size).all();
    return json({ rows: r.results, total: total.n, page: pg, size });
  }
  return json({ error: 'not found' }, 404);
}
export default {
  async fetch(req, env, ctx) {
    const u = new URL(req.url);
    if (u.pathname.startsWith('/api/')) {
      let who; try { who = await verify((req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, ''), { clientId: env.SHOPIFY_CLIENT_ID, clientSecret: env.SHOPIFY_CLIENT_SECRET }); } catch (e) { return json({ error: 'unauthorized' }, 401); }
      try { return await api(req, env, ctx, who.shop); } catch (e) { console.log('api error', String(e.message || e).slice(0, 200)); return json({ error: 'Something went wrong. Try again.' }, 500); }
    }
    if (u.pathname === '/health') return new Response('ok');
    const shop = u.searchParams.get('shop') || ''; const fa = SHOP_RE.test(shop) ? `https://${shop} https://admin.shopify.com` : 'https://admin.shopify.com https://*.myshopify.com';
    return new Response(page(env.SHOPIFY_CLIENT_ID || ''), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': `frame-ancestors ${fa};`, 'Cache-Control': 'no-store' } });
  },
  async scheduled(event, env, ctx) {
    const shops = (await env.DB.prepare('SELECT shop FROM shops').all()).results.map((r) => r.shop); const nightly = event.cron === '30 20 * * *';
    for (const shop of shops) ctx.waitUntil((async () => { try { if (nightly) await startSync(env, shop, event.scheduledTime); else { const s = await getState(env, shop); if (!['idle', 'error'].includes(s.phase)) await step(env, shop); } } catch (e) { console.log('sync error', shop, String(e.message || e).slice(0, 200)); } })());
  },
};
