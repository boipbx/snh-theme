// Redeem service + welcome points. The ONLY part of this app that writes to Shopify, and only:
//   - customer metafields custom.loyalty_points / loyalty_tier / last_reward_code / reward_codes / redeem_status
//   - the redeem tag (removed) and the welcome tag (added)
//   - discount codes that start with the store's reward prefix (create; deactivate only to undo a code of its own)
// Modes (env REDEEM_MODE / WELCOME_MODE): "off" = do nothing · "qa" = only the customer IDs listed in the store config ·
// "live" = everyone. Anything else counts as "off".
//
// One request = one D1 row, taken with a per-customer lock row so it can only run once:
//   started → code_created → deducted → done        (or refused / rolled_back)
// The points deduction and the code are written to the customer in ONE metafieldsSet call guarded by compareDigest:
// if the balance changed in between, nothing is written and the code is deactivated. So there is never a deduction
// without a code, and a code without a deduction is undone.
import { gql } from './shopify.mjs';
import { getConfig } from './sync.mjs';

export const DEFAULT_REDEEM = { tag: 'Trigger_Redeem_2500', points: 2500, value: 2500, minOrder: 2501, expiryDays: 90, dailyCap: 50, qaCustomerIds: [], eventName: 'Elite Reward Ready', accountUrl: '',
  welcome: { points: 500, tier: 'Bronze', tag: 'welcome_awarded', qaCustomerIds: [] } };
export const redeemCfg = (cfg) => ({ ...DEFAULT_REDEEM, ...(cfg.redeem || {}), welcome: { ...DEFAULT_REDEEM.welcome, ...((cfg.redeem || {}).welcome || {}) }, prefix: cfg.rewardCodePrefix || 'ELITE-', currency: cfg.currency || '' });
export const mode = (v) => (['qa', 'live'].includes(String(v || '').toLowerCase()) ? String(v).toLowerCase() : 'off');
const gid = (id) => (String(id).startsWith('gid://') ? String(id) : 'gid://shopify/Customer/' + id); const num = (id) => String(id).split('/').pop();
export const allowed = (m, id, list) => m === 'live' || (m === 'qa' && (list || []).map(num).includes(num(id)));
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';     // no I, L, O, 0, 1
export function newCode(prefix, rand = crypto.getRandomValues(new Uint8Array(6))) { let s = ''; for (const b of rand) s += ALPHABET[b % ALPHABET.length]; return prefix + s; }
const iso = (t) => new Date(t).toISOString();
const utcDay = (t) => iso(t).slice(0, 10);

const CUSTOMER = `id state tags defaultEmailAddress{emailAddress} firstName
  pts:metafield(namespace:"custom",key:"loyalty_points"){value compareDigest}
  tier:metafield(namespace:"custom",key:"loyalty_tier"){value}
  last:metafield(namespace:"custom",key:"last_reward_code"){value}
  codes:metafield(namespace:"custom",key:"reward_codes"){value compareDigest}
  status:metafield(namespace:"custom",key:"redeem_status"){value}`;
const readCustomer = async (env, shop, id) => (await gql(env, shop, `query($id:ID!){customer(id:$id){${CUSTOMER}}}`, { id: gid(id) })).customer;
const points = (c) => (c.pts && c.pts.value !== '' && c.pts.value != null ? Math.round(Number(c.pts.value)) : null);
export const parseCodes = (c) => { try { const v = JSON.parse((c.codes && c.codes.value) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
const mf = (ownerId, key, type, value, compareDigest) => ({ ownerId, namespace: 'custom', key, type, value: String(value), ...(compareDigest !== undefined ? { compareDigest } : {}) });
async function setMetafields(env, shop, list) {
  const d = await gql(env, shop, `mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){metafields{key} userErrors{field message code}}}`, { m: list });
  const e = d.metafieldsSet.userErrors; if (e.length) { const err = new Error('metafieldsSet: ' + e.map((x) => x.message).join('; ')); err.stale = e.some((x) => /STALE|compare/i.test((x.code || '') + x.message)); throw err; }
}
const tags = async (env, shop, id, op, list) => { const d = await gql(env, shop, `mutation($id:ID!,$t:[String!]!){${op}(id:$id,tags:$t){userErrors{message}}}`, { id: gid(id), t: list }); const e = d[op].userErrors; if (e.length) throw new Error(op + ': ' + e.map((x) => x.message).join('; ')); };
async function codeStatus(env, shop, code) {
  const d = await gql(env, shop, `query($c:String!){codeDiscountNodeByCode(code:$c){id codeDiscount{... on DiscountCodeBasic{status asyncUsageCount endsAt}}}}`, { c: code }); const n = d.codeDiscountNodeByCode;
  if (!n || !n.codeDiscount) return null; const x = n.codeDiscount; return { id: n.id, status: x.asyncUsageCount > 0 ? 'used' : x.status === 'ACTIVE' ? 'active' : x.status === 'SCHEDULED' ? 'active' : 'expired', endsAt: x.endsAt };
}
async function createCode(env, shop, r, customerId, now) {
  for (let i = 0; i < 4; i++) {
    const code = newCode(r.prefix); const ends = iso(now + r.expiryDays * 864e5);
    if (!code.startsWith(r.prefix) || !r.prefix) throw new Error('reward prefix missing');                                          // this service only ever creates reward codes
    const d = await gql(env, shop, `mutation($d:DiscountCodeBasicInput!){discountCodeBasicCreate(basicCodeDiscount:$d){codeDiscountNode{id} userErrors{field message code}}}`, { d: {
      title: `Elite reward ${code} (customer ${num(customerId)})`, code, startsAt: iso(now), endsAt: ends, usageLimit: 1, appliesOncePerCustomer: true,
      combinesWith: { productDiscounts: false, shippingDiscounts: false, orderDiscounts: false }, context: { customers: { add: [gid(customerId)] } },
      minimumRequirement: { subtotal: { greaterThanOrEqualToSubtotal: String(r.minOrder) } }, customerGets: { value: { discountAmount: { amount: String(r.value), appliesOnEachItem: false } }, items: { all: true } } } });
    const out = d.discountCodeBasicCreate; if (out.codeDiscountNode) return { code, id: out.codeDiscountNode.id, ends };
    if (!out.userErrors.some((e) => /taken|unique|already/i.test(e.message + (e.code || '')))) throw new Error('discount: ' + out.userErrors.map((e) => e.message).join('; '));
  }
  throw new Error('could not find a free code');
}
const deactivate = async (env, shop, id) => { const d = await gql(env, shop, `mutation($id:ID!){discountCodeDeactivate(id:$id){userErrors{message}}}`, { id }); const e = d.discountCodeDeactivate.userErrors; if (e.length) throw new Error('deactivate: ' + e.map((x) => x.message).join('; ')); };
async function klaviyoEvent(env, name, email, props) {
  if (!env.KLAVIYO_KEY || !email) return false;
  const r = await fetch('https://a.klaviyo.com/api/events/', { method: 'POST', headers: { Authorization: 'Klaviyo-API-Key ' + env.KLAVIYO_KEY, revision: '2025-10-15', 'Content-Type': 'application/vnd.api+json', accept: 'application/vnd.api+json' },
    body: JSON.stringify({ data: { type: 'event', attributes: { properties: props, metric: { data: { type: 'metric', attributes: { name } } }, profile: { data: { type: 'profile', attributes: { email } } }, unique_id: props.request_id } } }) });
  if (!r.ok) throw new Error('Klaviyo event ' + r.status); return true;
}

// ── D1 ──
const R_COLS = ['id', 'customer_id', 'status', 'code', 'discount_id', 'points_before', 'points_after', 'created_at', 'updated_at', 'note', 'mode', 'code_status', 'expires_at', 'notified', 'backup'];
const put = (env, shop, r) => env.DB.prepare(`INSERT INTO redeem_requests (shop,${R_COLS.join(',')}) VALUES (?${',?'.repeat(R_COLS.length)}) ON CONFLICT(shop,id) DO UPDATE SET ${R_COLS.slice(1).map((c) => `${c}=excluded.${c}`).join(',')}`)
  .bind(shop, ...R_COLS.map((c) => (r[c] === undefined ? null : r[c]))).run();
async function lock(env, shop, customerId, requestId, now) {
  const res = await env.DB.prepare('INSERT OR IGNORE INTO redeem_locks (shop, customer_id, request_id, locked_at) VALUES (?,?,?,?)').bind(shop, num(customerId), requestId, iso(now)).run();
  if (res && res.meta && typeof res.meta.changes === 'number') return res.meta.changes === 1;
  return ((await env.DB.prepare('SELECT request_id FROM redeem_locks WHERE shop=? AND customer_id=?').bind(shop, num(customerId)).first()) || {}).request_id === requestId;
}
const unlock = (env, shop, customerId) => env.DB.prepare('DELETE FROM redeem_locks WHERE shop=? AND customer_id=?').bind(shop, num(customerId)).run();
const flag = async (env, shop, key, value) => env.DB.prepare('INSERT OR REPLACE INTO snapshots (shop,key,json,updated_at) VALUES (?,?,?,?)').bind(shop, key, JSON.stringify(value), iso(Date.now())).run();
const getFlag = async (env, shop, key) => { const r = await env.DB.prepare('SELECT json FROM snapshots WHERE shop=? AND key=?').bind(shop, key).first(); try { return r ? JSON.parse(r.json) : null; } catch (e) { return null; } };
export const doneToday = async (env, shop, now) => ((await env.DB.prepare(`SELECT COUNT(*) AS n FROM redeem_requests WHERE shop=? AND status='done' AND mode='live' AND created_at >= ?`).bind(shop, utcDay(now)).first()) || {}).n || 0;

// ── one request, resumable ──
async function finish(env, shop, r, customer, cfgR, now) {
  // deducted → done: take the tag off, tell Klaviyo (once)
  if (customer.tags.includes(cfgR.tag)) await tags(env, shop, r.customer_id, 'tagsRemove', [cfgR.tag]);
  r.status = 'done'; r.updated_at = iso(now); await put(env, shop, r);
  if (!r.notified) { try { const acct = cfgR.accountUrl || ''; const email = customer.defaultEmailAddress && customer.defaultEmailAddress.emailAddress;
    const ok = await klaviyoEvent(env, cfgR.eventName, email, { request_id: r.id, code: r.code, value: cfgR.value, currency: cfgR.currency, min_order: cfgR.minOrder, expires: r.expires_at, expires_date: (r.expires_at || '').slice(0, 10), first_name: customer.firstName || '', account_url: acct ? acct + '#rewards' : '', discount_url: acct ? acct.replace(/\/account.*$/, '') + '/discount/' + r.code : '' });
    r.notified = ok ? 1 : 0; r.note = ok ? r.note : 'no email sent (no Klaviyo key or no email)'; } catch (e) { r.note = 'email event failed: ' + String(e.message).slice(0, 80); } await put(env, shop, r); }
  await unlock(env, shop, r.customer_id); return r;
}
async function deduct(env, shop, r, customer, cfgR, now) {
  // code_created → deducted. Re-read just happened (customer is fresh). One guarded write.
  const have = points(customer);
  const undo = async (why) => { await deactivate(env, shop, r.discount_id); r.status = 'rolled_back'; r.code_status = 'cancelled'; r.note = why; r.updated_at = iso(now); await put(env, shop, r); await unlock(env, shop, r.customer_id); return r; };
  if (customer.last && customer.last.value === r.code) { r.status = 'deducted'; await put(env, shop, r); return finish(env, shop, r, customer, cfgR, now); }   // the write landed earlier
  if (have == null || have < cfgR.points || customer.state !== 'ENABLED') return undo('balance changed before the deduction; code cancelled, no points taken');
  const list = parseCodes(customer); list.push({ code: r.code, value: cfgR.value, created: iso(now), expires: r.expires_at, status: 'active' });
  try { await setMetafields(env, shop, [mf(customer.id, 'loyalty_points', 'number_integer', have - cfgR.points, customer.pts.compareDigest), mf(customer.id, 'last_reward_code', 'single_line_text_field', r.code),
    mf(customer.id, 'reward_codes', 'json', JSON.stringify(list), customer.codes ? customer.codes.compareDigest : null), mf(customer.id, 'redeem_status', 'single_line_text_field', 'ready')]); }
  catch (e) { return undo((e.stale ? 'balance changed during the deduction' : 'deduction failed: ' + String(e.message).slice(0, 120)) + '; code cancelled, no points taken'); }
  r.status = 'deducted'; r.points_before = have; r.points_after = have - cfgR.points; r.code_status = 'active'; r.updated_at = iso(now); await put(env, shop, r);
  return finish(env, shop, r, customer, cfgR, now);
}
async function refuse(env, shop, r, customer, cfgR, why, status, now) {
  await setMetafields(env, shop, [mf(customer.id, 'redeem_status', 'single_line_text_field', status)]); await tags(env, shop, r.customer_id, 'tagsRemove', [cfgR.tag]);
  r.status = 'refused'; r.note = why; r.updated_at = iso(now); await put(env, shop, r); await unlock(env, shop, r.customer_id); return r;
}
export async function processCustomer(env, shop, customerId, cfgR, m, now = Date.now()) {
  if (!allowed(m, customerId, cfgR.qaCustomerIds)) return { skipped: 'mode' };
  const cid = num(customerId); const id = cid + '-' + now.toString(36);
  if (!(await lock(env, shop, cid, id, now))) {
    // someone holds the lock: resume their request if it has been sitting (a run died), otherwise leave it alone
    const l = await env.DB.prepare('SELECT request_id, locked_at FROM redeem_locks WHERE shop=? AND customer_id=?').bind(shop, cid).first(); if (!l || now - Date.parse(l.locked_at) < 3 * 60e3) return { skipped: 'locked' };
    const r = await env.DB.prepare('SELECT * FROM redeem_requests WHERE shop=? AND id=?').bind(shop, l.request_id).first(); if (!r) { await unlock(env, shop, cid); return { skipped: 'stale lock cleared' }; }
    const c = await readCustomer(env, shop, cid);
    if (r.status === 'code_created') return deduct(env, shop, r, c, cfgR, now); if (r.status === 'deducted') return finish(env, shop, r, c, cfgR, now);
    await unlock(env, shop, cid); return { skipped: 'stale lock cleared' };
  }
  const c = await readCustomer(env, shop, cid); const have = c ? points(c) : null;
  const r = { id, customer_id: cid, status: 'started', points_before: have, created_at: iso(now), updated_at: iso(now), mode: m, notified: 0,
    backup: c ? JSON.stringify({ points: c.pts && c.pts.value, tier: c.tier && c.tier.value, last_reward_code: c.last && c.last.value, reward_codes: c.codes && c.codes.value, redeem_status: c.status && c.status.value, tags: c.tags }) : null };
  await put(env, shop, r);                                                                                                        // the backup of this customer, before anything is changed
  if (!c) { r.status = 'refused'; r.note = 'customer not found'; await put(env, shop, r); await unlock(env, shop, cid); return r; }
  if (!c.tags.includes(cfgR.tag)) { r.status = 'refused'; r.note = 'tag no longer on the customer'; await put(env, shop, r); await unlock(env, shop, cid); return r; }
  if (c.state !== 'ENABLED') return refuse(env, shop, r, c, cfgR, 'no enabled account', 'no_account', now);
  if (have == null || have < cfgR.points) return refuse(env, shop, r, c, cfgR, `only ${have == null ? 0 : have} points`, 'not_enough_points', now);
  // one open reward at a time: a member who still holds an unused, active code keeps it instead of getting a second one
  const held = [...parseCodes(c).map((x) => x.code), c.last && c.last.value].filter(Boolean);
  for (const code of [...new Set(held)]) { const s = await codeStatus(env, shop, code); if (!s || s.status !== 'active') continue;
    // make sure that code shows under My rewards (codes issued by hand before this service are not in the list yet)
    const list = parseCodes(c); if (!list.some((x) => x.code === code)) { list.push({ code, value: cfgR.value, created: null, expires: s.endsAt, status: 'active' }); await setMetafields(env, shop, [mf(c.id, 'reward_codes', 'json', JSON.stringify(list), c.codes ? c.codes.compareDigest : null)]); }
    return refuse(env, shop, r, c, cfgR, 'already holds unused code ' + code + '; no new code, no points taken', 'ready', now); }
  const made = await createCode(env, shop, cfgR, cid, now);
  r.status = 'code_created'; r.code = made.code; r.discount_id = made.id; r.expires_at = made.ends; r.code_status = 'active'; r.updated_at = iso(now); await put(env, shop, r);
  return deduct(env, shop, r, await readCustomer(env, shop, cid), cfgR, now);                                                      // re-read right before the write
}
// keep each saved code's status (active / used / expired) right on the customer and in D1
async function refreshCodes(env, shop, cfgR, m, limit = 25) {
  const rows = (await env.DB.prepare(`SELECT * FROM redeem_requests WHERE shop=? AND status='done' AND code_status='active' ORDER BY updated_at ASC LIMIT ?`).bind(shop, limit).all()).results; let changed = 0;
  for (const r of rows) { if (!allowed(m, r.customer_id, cfgR.qaCustomerIds)) continue;
    const s = await codeStatus(env, shop, r.code); const st = s ? s.status : 'expired'; r.updated_at = iso(Date.now());
    if (st !== 'active') { const c = await readCustomer(env, shop, r.customer_id); if (c) { const list = parseCodes(c); const hit = list.find((x) => x.code === r.code);
        if (hit && hit.status !== st) { hit.status = st; await setMetafields(env, shop, [mf(c.id, 'reward_codes', 'json', JSON.stringify(list), c.codes ? c.codes.compareDigest : null), ...(c.last && c.last.value === r.code && c.status && c.status.value === 'ready' ? [mf(c.id, 'redeem_status', 'single_line_text_field', st)] : [])]); } }
      r.code_status = st; changed++; }
    await put(env, shop, r); }
  return changed;
}
export async function runRedeem(env, shop, now = Date.now()) {
  const m = mode(env.REDEEM_MODE); const cfg = await getConfig(env, shop); const cfgR = redeemCfg(cfg); const out = { mode: m, processed: [], at: iso(now) };
  if (m === 'off') return out;
  if (m === 'live') { const n = await doneToday(env, shop, now); if (cfgR.dailyCap && n >= cfgR.dailyCap) { await flag(env, shop, 'redeem_pause', { paused: true, day: utcDay(now), reason: `Daily safety cap reached: ${n} redemptions today (cap ${cfgR.dailyCap}). Paused until 00:00 UTC.` }); out.paused = true; return out; } }
  let ids;
  if (m === 'qa') { ids = []; for (const q of cfgR.qaCustomerIds) { const c = await readCustomer(env, shop, q); if (c && c.tags.includes(cfgR.tag)) ids.push(num(q)); } }
  else ids = (await gql(env, shop, `query($q:String!){customers(first:25,query:$q){nodes{id}}}`, { q: `tag:${cfgR.tag}` })).customers.nodes.map((n) => num(n.id));
  let left = m === 'live' && cfgR.dailyCap ? cfgR.dailyCap - await doneToday(env, shop, now) : Infinity;
  for (const id of ids) { if (left <= 0) break; let r; try { r = await processCustomer(env, shop, id, cfgR, m, now); } catch (e) { r = { customer_id: id, status: 'error', note: String(e.message || e).slice(0, 200) }; console.log('redeem error', id, r.note); }
    if (r.status === 'done') left--; out.processed.push({ customer_id: num(id), status: r.status || r.skipped, code: r.code || '', note: r.note || '' }); }
  try { out.codesUpdated = await refreshCodes(env, shop, cfgR, m); } catch (e) { out.codesError = String(e.message || e).slice(0, 120); }
  await flag(env, shop, 'redeem_last', out); return out;
}
// ── welcome points: only when an account is ENABLED, once, and never over an existing balance ──
export async function welcomeCustomer(env, shop, c, cfgR) {
  const w = cfgR.welcome; if (c.state !== 'ENABLED' || c.tags.includes(w.tag)) return 'skip';
  const have = points(c);
  if (have == null) {       // never had points: give the welcome
    await setMetafields(env, shop, [mf(c.id, 'loyalty_points', 'number_integer', w.points, c.pts ? c.pts.compareDigest : null), ...(c.tier && c.tier.value ? [] : [mf(c.id, 'loyalty_tier', 'single_line_text_field', w.tier)])]);
    await tags(env, shop, c.id, 'tagsAdd', [w.tag]); return 'awarded';
  }
  await tags(env, shop, c.id, 'tagsAdd', [w.tag]); return 'marked';       // already has a balance (older welcome): mark only, balance untouched
}
export async function runWelcome(env, shop, now = Date.now()) {
  const m = mode(env.WELCOME_MODE); const cfg = await getConfig(env, shop); const cfgR = redeemCfg(cfg); const out = { mode: m, awarded: 0, marked: 0, at: iso(now) }; if (m === 'off') return out;
  let list = [];
  if (m === 'qa') { for (const q of cfgR.welcome.qaCustomerIds) { const c = await readCustomer(env, shop, q); if (c) list.push(c); } }
  else { const cur = (await getFlag(env, shop, 'welcome_cursor')) || { since: iso(now - 15 * 60e3) };
    const d = await gql(env, shop, `query($q:String!){customers(first:60,sortKey:UPDATED_AT,query:$q){nodes{${CUSTOMER} updatedAt}}}`, { q: `updated_at:>='${cur.since}'` }); list = d.customers.nodes;
    const last = list.length ? list[list.length - 1].updatedAt : null; await flag(env, shop, 'welcome_cursor', { since: list.length === 60 && last ? last : iso(now - 2 * 60e3) }); }
  for (const c of list) { if (!allowed(m, c.id, cfgR.welcome.qaCustomerIds)) continue; try { const r = await welcomeCustomer(env, shop, c, cfgR); if (r === 'awarded') { out.awarded++; await env.DB.prepare('INSERT OR REPLACE INTO redeem_requests (shop,id,customer_id,status,points_before,points_after,created_at,updated_at,note,mode,notified) VALUES (?,?,?,?,?,?,?,?,?,?,0)').bind(shop, 'welcome-' + num(c.id), num(c.id), 'welcome', null, cfgR.welcome.points, iso(now), iso(now), 'welcome points on account activation', m).run(); } else if (r === 'marked') out.marked++; } catch (e) { console.log('welcome error', num(c.id), String(e.message || e).slice(0, 160)); out.error = String(e.message || e).slice(0, 160); } }
  await flag(env, shop, 'welcome_last', out); return out;
}
// what the Operations tab shows (customer IDs only, no names)
export async function redeemStatus(env, shop, now = Date.now()) {
  const cfg = await getConfig(env, shop); const cfgR = redeemCfg(cfg); const m = mode(env.REDEEM_MODE); let rows = [], pause = null;
  try { rows = (await env.DB.prepare('SELECT id,customer_id,status,code,code_status,points_before,points_after,created_at,note,mode,notified,expires_at FROM redeem_requests WHERE shop=? ORDER BY created_at DESC LIMIT 50').bind(shop).all()).results; pause = await getFlag(env, shop, 'redeem_pause'); } catch (e) {}
  const paused = !!(pause && pause.paused && pause.day === utcDay(now));
  return { mode: m, welcomeMode: mode(env.WELCOME_MODE), rules: { points: cfgR.points, value: cfgR.value, minOrder: cfgR.minOrder, expiryDays: cfgR.expiryDays, dailyCap: cfgR.dailyCap, tag: cfgR.tag }, paused, pauseReason: paused ? pause.reason : '', today: m === 'live' ? await doneToday(env, shop, now).catch(() => 0) : 0,
    last: await getFlag(env, shop, 'redeem_last').catch(() => null), welcomeLast: await getFlag(env, shop, 'welcome_last').catch(() => null), rows };
}
