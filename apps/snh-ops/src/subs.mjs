// Subscribe & save (SCAFFOLD, docs/subscriptions/PLAN.md). Recurring card charges through Onepay "Card on File"
// (customer tokenises a Visa/Mastercard on Onepay's hosted 3-D Secure page; we charge the token on schedule).
//
// SAFETY: SUBS_MODE is "off" (default) or "sandbox". Any other value, "live" included, counts as OFF: going live
// needs a code change reviewed by a person, Onepay enabling card-on-file on the merchant account, and the owner's OK.
// In sandbox: Onepay sandbox credentials only (secrets ONEPAY_APP_ID / ONEPAY_APP_TOKEN), no Shopify order is created
// and no points are written: both are planned and logged only.
//
// Onepay endpoints (docs.onepay.lk/api-documentation/customer-tokenizer, read 23 Nov 2026):
//   POST   /v3/customers/                                  → { data: { customer_id, token_url, request_id } }
//   GET    /v3/customers/{customer_id}/cards/?app_id=      → { data: [{ token_id, card_type, masked_number, expiry, is_deleted }] }
//   POST   /v3/customers/{customer_id}/payments/           { app_id, token_id, amount: "1000.00", currency: "LKR" }
//                                                          → { data: { transaction_id, status: bool, amount, currency, token_id } }
//   DELETE /v3/customers/{customer_id}/cards/{token_id}/?app_id=
//   Header: Authorization: <App Token>. No idempotency key is documented, so we guard against double charges ourselves.

export const DAY = 864e5;
export const STATUSES = ['pending_card', 'active', 'paused', 'past_due', 'cancelled'];
export const RETRY_DAYS = [1, 3, 5]; // after a failed charge: retry on day +1, +3, +5, then pause and tell the customer
export const MAX_DISCOUNT_PCT = 20;

export const mode = (env) => (String(env.SUBS_MODE || 'off').trim().toLowerCase() === 'sandbox' ? 'sandbox' : 'off');

// ── pure logic ──

// next charge after `fromMs`, keeping the subscriber's chosen day of month where possible (28 is the latest allowed)
export function nextChargeAt(fromMs, intervalDays, anchorDay = null) {
  if (anchorDay && intervalDays % 30 === 0) { // monthly plans: step whole months, land on the chosen day (max 28)
    const d = new Date(fromMs); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + intervalDays / 30); d.setUTCDate(Math.min(28, anchorDay));
    return d.getTime();
  }
  return fromMs + intervalDays * DAY;
}
export function price(unitPrice, qty, discountPct) {
  const pct = Math.max(0, Math.min(MAX_DISCOUNT_PCT, Number(discountPct) || 0));
  return Math.round(Number(unitPrice) * qty * (100 - pct)) / 100; // rupees, 2 dp
}
export const amountStr = (rs) => (Math.round(rs * 100) / 100).toFixed(2);
export const pointsFor = (amountRs, tierRate) => Math.floor(amountRs * (Number(tierRate) || 0));

// What the charge job should do with one subscription right now.
export function plan(sub, now) {
  if (sub.status !== 'active' && sub.status !== 'past_due') return { action: 'none', why: sub.status };
  if (!sub.token_id) return { action: 'none', why: 'no card' };
  if (sub.skip_next && sub.next_charge_at <= now) return { action: 'skip' };
  if (sub.next_charge_at > now) return { action: 'none', why: 'not due' };
  if (sub.status === 'past_due') {
    const due = sub.retry_at || sub.next_charge_at;
    if (due > now) return { action: 'none', why: 'retry not due' };
  }
  return { action: 'charge', amount: price(sub.unit_price, sub.quantity, sub.discount_pct) };
}
// After a charge attempt: the new subscription fields.
export function afterCharge(sub, ok, now) {
  if (ok) return { status: 'active', failures: 0, retry_at: null, last_charged_at: now, next_charge_at: nextChargeAt(sub.next_charge_at, sub.interval_days, sub.anchor_day) };
  const failures = (sub.failures || 0) + 1;
  if (failures > RETRY_DAYS.length) return { status: 'paused', failures, retry_at: null, paused_reason: 'payment_failed' };
  return { status: 'past_due', failures, retry_at: now + RETRY_DAYS[failures - 1] * DAY };
}
// Customer controls. Returns the field changes, or { error }.
export function control(sub, action, arg, now) {
  if (sub.status === 'cancelled') return { error: 'cancelled' };
  if (action === 'skip') return { skip_next: 1 };
  if (action === 'pause') return { status: 'paused', paused_reason: 'customer' };
  if (action === 'resume') return sub.status === 'paused' ? { status: 'active', paused_reason: null, next_charge_at: Math.max(sub.next_charge_at, now + DAY) } : { error: 'not paused' };
  if (action === 'cancel') return { status: 'cancelled', cancelled_at: now };
  if (action === 'date') {
    const t = Date.parse(arg); if (Number.isNaN(t)) return { error: 'bad date' };
    if (t < now + DAY || t > now + 90 * DAY) return { error: 'date must be 1–90 days ahead' };
    return { next_charge_at: t, anchor_day: new Date(t).getUTCDate() };
  }
  return { error: 'unknown action' };
}

// ── Onepay adapter (fetch is injectable for tests) ──
export function onepay(env, f = fetch) {
  const base = env.ONEPAY_BASE || 'https://api.onepay.lk'; const app = env.ONEPAY_APP_ID;
  const call = async (method, path, body) => {
    const r = await f(base + path, { method, headers: { Authorization: env.ONEPAY_APP_TOKEN, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(`Onepay ${method} ${path.split('?')[0]} ${r.status}`); return j;
  };
  return {
    createCustomer: (p) => call('POST', '/v3/customers/', p.customer_id ? { app_id: app, customer_id: p.customer_id, redirect_url: p.redirect_url } : { app_id: app, ...p }),
    cards: (cid) => call('GET', `/v3/customers/${encodeURIComponent(cid)}/cards/?app_id=${encodeURIComponent(app)}`),
    charge: (cid, token, amountRs, currency = 'LKR') => call('POST', `/v3/customers/${encodeURIComponent(cid)}/payments/`, { app_id: app, token_id: token, amount: amountStr(amountRs), currency }),
    removeCard: (cid, token) => call('DELETE', `/v3/customers/${encodeURIComponent(cid)}/cards/${encodeURIComponent(token)}/?app_id=${encodeURIComponent(app)}`),
  };
}

// ── charge job (cron) ──
const cols = 'id,shop,customer_id,onepay_customer_id,token_id,variant_id,product_title,quantity,unit_price,discount_pct,interval_days,anchor_day,next_charge_at,status,failures,retry_at,skip_next,tier_rate';
export async function runSubs(env, shop, now = Date.now(), f = fetch, log = console.log) {
  if (mode(env) !== 'sandbox') return { mode: 'off', charged: 0 };
  const due = (await env.DB.prepare(`SELECT ${cols} FROM subscriptions WHERE shop=? AND status IN ('active','past_due') AND next_charge_at<=? ORDER BY next_charge_at LIMIT 20`).bind(shop, now).all()).results;
  const op = onepay(env, f); const out = { mode: 'sandbox', charged: 0, failed: 0, skipped: 0 };
  for (const s of due) {
    const p = plan(s, now);
    if (p.action === 'skip') { await upd(env, s, { skip_next: 0, next_charge_at: nextChargeAt(s.next_charge_at, s.interval_days, s.anchor_day) }); out.skipped++; continue; }
    if (p.action !== 'charge') continue;
    // one charge per subscription per due date: the (sub_id, due_at) key makes a second insert fail, so a re-run can't charge twice
    const key = `${s.id}:${s.retry_at || s.next_charge_at}`;
    const ins = await env.DB.prepare('INSERT OR IGNORE INTO subscription_charges (shop, id, sub_id, due_at, amount, status, created_at) VALUES (?,?,?,?,?,?,?)').bind(shop, key, s.id, s.retry_at || s.next_charge_at, p.amount, 'started', now).run();
    if (!ins.meta || !ins.meta.changes) { log(`subs ${s.id}: already attempted for this due date`); continue; }
    let ok = false, txn = null, msg = '';
    try { const r = await op.charge(s.onepay_customer_id, s.token_id, p.amount); ok = !!(r.data && r.data.status); txn = r.data && r.data.transaction_id; msg = r.message || ''; }
    catch (e) { msg = String(e.message || e).slice(0, 200); }
    const order = ok ? { plannedOrder: { customer_id: s.customer_id, variant_id: s.variant_id, quantity: s.quantity, amount: p.amount, gateway_ref: txn }, plannedPoints: pointsFor(p.amount, s.tier_rate) } : {};
    await env.DB.prepare('UPDATE subscription_charges SET status=?, transaction_id=?, message=?, plan=? WHERE shop=? AND id=?').bind(ok ? 'paid' : 'failed', txn, msg, JSON.stringify(order), shop, key).run();
    await upd(env, s, afterCharge(s, ok, now)); ok ? out.charged++ : out.failed++;
    log(`subs ${s.id}: ${ok ? 'paid' : 'failed'} Rs ${amountStr(p.amount)} (sandbox; Shopify order and points NOT written)`);
  }
  return out;
}
async function upd(env, s, fields) {
  const keys = Object.keys(fields); if (!keys.length) return;
  await env.DB.prepare(`UPDATE subscriptions SET ${keys.map((k) => k + '=?').join(',')} WHERE shop=? AND id=?`).bind(...keys.map((k) => fields[k]), s.shop, s.id).run();
}

// ── staff API (inside the embedded app, session token already checked by worker.mjs) ──
const J = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
export async function subsApi(path, req, env, shop, now = Date.now()) {
  if (mode(env) === 'off') return J({ error: 'Subscriptions are switched off (SUBS_MODE).', mode: 'off' }, 404);
  if (path === 'subs' && req.method === 'GET') {
    const r = (await env.DB.prepare(`SELECT ${cols} FROM subscriptions WHERE shop=? ORDER BY next_charge_at LIMIT 200`).bind(shop).all()).results;
    const c = (await env.DB.prepare('SELECT id,sub_id,due_at,amount,status,transaction_id,message FROM subscription_charges WHERE shop=? ORDER BY created_at DESC LIMIT 100').bind(shop).all()).results;
    return J({ mode: 'sandbox', subscriptions: r, charges: c });
  }
  const m = path.match(/^subs\/([\w-]+)\/(skip|pause|resume|cancel|date)$/);
  if (m && req.method === 'POST') {
    const s = await env.DB.prepare(`SELECT ${cols} FROM subscriptions WHERE shop=? AND id=?`).bind(shop, m[1]).first(); if (!s) return J({ error: 'not found' }, 404);
    const body = await req.json().catch(() => ({})); const ch = control(s, m[2], body.date, now); if (ch.error) return J(ch, 400);
    await upd(env, s, ch); return J({ ok: true, changes: ch });
  }
  return J({ error: 'not found' }, 404);
}
