// SNH Staff console (/console): counter staff look up, create and edit customers and see Elite points.
// Separate from the embedded admin dashboard: staff sign in with a 6-digit PIN on a registered device.
//
// Access: device cookie (registered once with a one-time code from an admin) → staff PIN → session cookie (12 h,
// locks after 5 minutes idle). 5 wrong PINs lock that person for 15 minutes. Admin-only actions ask for the PIN again.
// Every action goes to audit_log; every points change goes to points_ledger.
// Writes to Shopify: customer create/update/consent/invite, the birthday metafield, the redeem tag (then the redeem
// service itself), and loyalty_points for an admin adjustment (guarded by compareDigest).
import { gql } from './shopify.mjs';
import { getConfig } from './sync.mjs';
import { mode, allowed, redeemCfg, processCustomer, doneToday, parseCodes } from './redeem.mjs';
import { ensureConsoleTables, hashPin, validPin, sameHex, randomHex, sha256, newId, audit, ledger, rateOk, PBKDF2_ITERATIONS } from './console-db.mjs';
import { CONSOLE_HTML, MANIFEST, SW_JS, ICON_192, ICON_512, ICON_MASK, LOGO_PNG } from './console-ui.mjs';

const MIN = 60e3, HOUR = 3600e3;
export const LIMITS = { sessionMs: 12 * HOUR, idleMs: 5 * MIN, maxFails: 5, lockMs: 15 * MIN, adjustMax: 5000, adjustDay: 20000, codeMs: 24 * HOUR, setupMs: 24 * HOUR };
export const REASONS = ['Missed order points', 'Goodwill', 'Correction', 'Other'];
const FALLBACK_LOCATIONS = ['Nugegoda', 'Dehiwala', 'Wattala'];
const CONSENT_TEXT = 'Yes, send me SNH offers, Elite rewards and new arrivals by email. I can unsubscribe at any time.';
const DEV = 'snh_dev', SES = 'snh_ses';

const json = (o, status = 200, headers = {}) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });
const cookie = (name, value, maxAgeSec) => `${name}=${value}; Path=/console; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSec}`;
const readCookie = (req, name) => { const m = (req.headers.get('Cookie') || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)')); return m ? m[1] : ''; };
const ipOf = (req) => req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For') || 'local';
const num = (id) => String(id || '').split('/').pop();
const gidC = (id) => 'gid://shopify/Customer/' + num(id);
const clean = (s, n = 120) => String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);

// +94 phone normalisation: 0771234567 / 771234567 / 94771234567 / +94 77 123 4567 → +94771234567
export function normPhone(s) {
  let d = String(s || '').replace(/[^\d+]/g, ''); if (!d) return '';
  if (d.startsWith('+')) d = d.slice(1); if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('94') && d.length === 11) return '+' + d;
  if (d.startsWith('0') && d.length === 10) return '+94' + d.slice(1);
  if (d.length === 9 && /^[1-9]/.test(d)) return '+94' + d;
  return d.length >= 8 ? '+' + d : '';
}
export const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim());
const looksPhone = (s) => /^[+\d][\d\s-]{7,}$/.test(String(s || '').trim());

// ── device, session, staff ──
async function deviceFrom(env, req, shop) {
  const raw = readCookie(req, DEV); const [id, tok] = raw.split('.'); if (!id || !tok) return null;
  const d = await env.DB.prepare('SELECT * FROM console_devices WHERE shop=? AND id=?').bind(shop, id).first();
  if (!d || d.status !== 'active' || !d.token_hash || !sameHex(d.token_hash, await sha256(tok))) return null; return d;
}
async function sessionFrom(env, req, shop, device) {
  const tok = readCookie(req, SES); if (!tok || !device) return null;
  const s = await env.DB.prepare('SELECT * FROM console_sessions WHERE token_hash=?').bind(await sha256(tok)).first();
  if (!s || s.shop !== shop || s.device_id !== device.id) return null;
  const staff = await env.DB.prepare('SELECT * FROM staff WHERE shop=? AND id=?').bind(shop, s.staff_id).first(); if (!staff || !staff.active) return null;
  return { ...s, staff };
}
const pubStaff = (s) => ({ id: s.id, name: s.name, role: s.role, location: s.location || '', active: !!s.active, locked: s.locked_until > Date.now() });
// PIN check with lockout. Returns { ok } or { ok:false, error, status }.
export async function checkPin(env, shop, staff, pin, now = Date.now()) {
  if (staff.locked_until > now) return { ok: false, status: 423, error: `Too many wrong PINs. Try again in ${Math.ceil((staff.locked_until - now) / MIN)} min.` };
  const good = sameHex(await hashPin(String(pin || ''), staff.pin_salt), staff.pin_hash);
  if (good) { if (staff.failed) await env.DB.prepare('UPDATE staff SET failed=0 WHERE shop=? AND id=?').bind(shop, staff.id).run(); return { ok: true }; }
  const failed = (staff.failed || 0) + 1; const lock = failed >= LIMITS.maxFails;
  await env.DB.prepare('UPDATE staff SET failed=?, locked_until=? WHERE shop=? AND id=?').bind(lock ? 0 : failed, lock ? now + LIMITS.lockMs : staff.locked_until || 0, shop, staff.id).run();
  return { ok: false, status: lock ? 423 : 401, error: lock ? 'Too many wrong PINs. Locked for 15 minutes.' : `Wrong PIN. ${LIMITS.maxFails - failed} tries left.` };
}
async function newSession(env, shop, staff, device, now) {
  const tok = randomHex(32);
  await env.DB.prepare('INSERT INTO console_sessions (token_hash,shop,staff_id,device_id,created_at,expires_at,last_seen) VALUES (?,?,?,?,?,?,?)').bind(await sha256(tok), shop, staff.id, device.id, now, now + LIMITS.sessionMs, now).run();
  await env.DB.prepare('DELETE FROM console_sessions WHERE expires_at < ?').bind(now).run();
  return cookie(SES, tok, LIMITS.sessionMs / 1000);
}
async function createStaff(env, shop, { name, role, location, pin }, now) {
  const salt = randomHex(16); const id = newId('s');
  await env.DB.prepare('INSERT INTO staff (shop,id,name,role,location,pin_hash,pin_salt,active,failed,locked_until,created_at,updated_at) VALUES (?,?,?,?,?,?,?,1,0,0,?,?)')
    .bind(shop, id, name, role, location, await hashPin(pin, salt), salt, now, now).run();
  return (await env.DB.prepare('SELECT * FROM staff WHERE shop=? AND id=?').bind(shop, id).first());
}
async function registerDevice(env, shop, device, now) {
  const tok = randomHex(32);
  await env.DB.prepare('UPDATE console_devices SET token_hash=?, code_hash=NULL, code_expires=NULL, status=?, registered_at=?, last_seen=? WHERE shop=? AND id=?').bind(await sha256(tok), 'active', now, now, shop, device.id).run();
  return cookie(DEV, device.id + '.' + tok, 400 * 86400);
}
// one-time setup link for the first admin (CLI: node scripts/console-setup-link.mjs). Only the hash is stored.
export async function makeSetupToken(env, shop, now = Date.now()) {
  await ensureConsoleTables(env); const t = randomHex(24);
  await env.DB.prepare('INSERT INTO console_tokens (token_hash,shop,kind,expires_at,created_at) VALUES (?,?,?,?,?)').bind(await sha256(t), shop, 'setup', now + LIMITS.setupMs, now).run(); return t;
}

// ── Shopify reads/writes ──
const MFS = `pts:metafield(namespace:"custom",key:"loyalty_points"){value compareDigest} tier:metafield(namespace:"custom",key:"loyalty_tier"){value}
  spend:metafield(namespace:"custom",key:"annual_spend"){value} codes:metafield(namespace:"custom",key:"reward_codes"){value}
  bd1:metafield(namespace:"facts",key:"birth_date"){value} bd2:metafield(namespace:"custom",key:"birthday"){value}`;
const C_FIELDS = `id firstName lastName displayName state tags createdAt numberOfOrders amountSpent{amount}
  defaultEmailAddress{emailAddress marketingState} defaultPhoneNumber{phoneNumber} lastOrder{name createdAt} ${MFS}`;
const intv = (v) => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Math.round(Number(v)));
const accountStatus = (s) => (s === 'ENABLED' ? 'enabled' : s === 'INVITED' ? 'invited' : 'no account');
function birthday(c) { const t = (c.tags || []).find((x) => /^bday:/i.test(x)); return (c.bd1 && c.bd1.value) || (c.bd2 && c.bd2.value) || (t ? t.split(':')[1] : '') || ''; }
export function tierInfo(c, cfg) {
  const tiers = [...(cfg.tiers || [])].sort((a, b) => a.minSpend - b.minSpend); const spend = c.spend && c.spend.value ? Number(c.spend.value) : 0;
  const tier = (c.tier && c.tier.value) || ''; const next = tiers.find((x) => x.minSpend > spend);
  return { tier, annualSpend: spend, next: next ? next.name : null, toNext: next ? Math.max(0, next.minSpend - spend) : 0, progress: next ? Math.min(1, spend / next.minSpend) : 1 };
}
function summary(c, cfg) {
  const pts = intv(c.pts && c.pts.value) || 0;
  return { id: num(c.id), name: c.displayName || [c.firstName, c.lastName].filter(Boolean).join(' ') || '(no name)', firstName: c.firstName || '', lastName: c.lastName || '',
    phone: (c.defaultPhoneNumber && c.defaultPhoneNumber.phoneNumber) || '', email: (c.defaultEmailAddress && c.defaultEmailAddress.emailAddress) || '',
    consent: (c.defaultEmailAddress && c.defaultEmailAddress.marketingState) || 'NOT_SUBSCRIBED', status: accountStatus(c.state), state: c.state, points: pts, value: Math.floor(pts * (cfg.pointValue || 1)),
    ...tierInfo(c, cfg), lastOrder: c.lastOrder ? { name: c.lastOrder.name, at: c.lastOrder.createdAt } : null, qa: (c.tags || []).includes('qa-test'), birthday: birthday(c),
    orders: c.numberOfOrders != null ? Number(c.numberOfOrders) : null };
}
export function searchQuery(q) {
  q = String(q || '').trim(); if (!q) return '';
  if (isEmail(q)) return `email:"${q.replace(/"/g, '')}"`;
  if (looksPhone(q)) { const p = normPhone(q); return p ? `phone:"${p}"` : ''; }
  return q.replace(/["\\:()]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 4).join(' ');
}
async function findCustomers(env, shop, query, first = 15) {
  if (!query) return []; return (await gql(env, shop, `query($q:String!,$n:Int!){customers(first:$n,query:$q,sortKey:RELEVANCE){nodes{${C_FIELDS}}}}`, { q: query, n: first })).customers.nodes;
}
async function readFull(env, shop, id) {
  const d = await gql(env, shop, `query($id:ID!){customer(id:$id){${C_FIELDS} orders(first:5,sortKey:CREATED_AT,reverse:true){nodes{name createdAt sourceName
    currentTotalPriceSet{shopMoney{amount}} retailLocation{name} cancelledAt}}}}`, { id: gidC(id) }); return d.customer;
}
const userErrors = (x) => (x && x.userErrors && x.userErrors.length ? x.userErrors.map((e) => e.message).join('; ') : '');
async function locations(env, shop) {
  try { const d = await gql(env, shop, `{locations(first:20){nodes{name isActive}}}`); const l = d.locations.nodes.filter((x) => x.isActive).map((x) => x.name); return l.length ? l : FALLBACK_LOCATIONS; }
  catch (e) { return FALLBACK_LOCATIONS; }
}
const adminUrl = (shop, id) => `https://admin.shopify.com/store/${shop.replace('.myshopify.com', '')}/customers/${num(id)}`;
const colomboDayStart = (now) => { const off = 330 * MIN; return Math.floor((now + off) / 864e5) * 864e5 - off; };

// ── HTTP ──
export async function consoleFetch(req, env, ctx, now = Date.now()) {
  const u = new URL(req.url); const path = u.pathname.replace(/\/+$/, '') || '/console';
  const shop = env.CONSOLE_SHOP || 'sports-nutrition-hub.myshopify.com';
  if (path === '/console/manifest.webmanifest') return new Response(MANIFEST, { headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=3600' } });
  if (path === '/console/sw.js') return new Response(SW_JS, { headers: { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-cache', 'Service-Worker-Allowed': '/console/' } });
  const icon = { '/console/icon-192.png': ICON_192, '/console/icon-512.png': ICON_512, '/console/icon-mask.png': ICON_MASK, '/console/logo.png': LOGO_PNG }[path];
  if (icon) return new Response(Uint8Array.from(atob(icon), (c) => c.charCodeAt(0)), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' } });
  if (!path.startsWith('/console/api/')) {
    const nonce = randomHex(12);
    return new Response(CONSOLE_HTML.replaceAll('__NONCE__', nonce), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache',
      'Content-Security-Policy': `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https://www.sportsnutritionhub.lk https://cdn.shopify.com; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`,
      'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } });
  }
  // API. Writes need the custom header (a cross-site form cannot send it) on top of SameSite=Strict cookies.
  if (req.method !== 'GET' && req.headers.get('X-SNH') !== '1') return json({ error: 'bad request' }, 400);
  await ensureConsoleTables(env);
  const ip = ipOf(req); const api = path.slice('/console/api/'.length);
  let body = {}; if (req.method === 'POST') { try { body = await req.json(); } catch (e) { body = {}; } }
  const device = await deviceFrom(env, req, shop);
  const ctxA = { now, ip, device, staff: null };
  const tooMany = () => json({ error: 'Too many attempts from this device. Wait a few minutes.' }, 429);
  const authKey = (device ? 'dev:' + device.id : 'ip:' + ip);
  try {
    if (api === 'state') {
      const admins = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM staff WHERE shop=? AND role='admin' AND active=1`).bind(shop).first()).n;
      if (!device) return json({ device: null, setupNeeded: admins === 0 });
      const sess = await sessionFrom(env, req, shop, device);
      const staff = (await env.DB.prepare('SELECT * FROM staff WHERE shop=? AND active=1 ORDER BY name COLLATE NOCASE').bind(shop).all()).results.map(pubStaff);
      const s = sess && sess.expires_at > now ? { staff: pubStaff(sess.staff), locked: now - sess.last_seen > LIMITS.idleMs, expiresAt: sess.expires_at } : null;
      return json({ device: { id: device.id, name: device.name, location: device.location }, staff, session: s, idleMs: LIMITS.idleMs, redeemMode: mode(env.REDEEM_MODE) });
    }
    if (api === 'setup' && req.method === 'POST') {
      if (!(await rateOk(env, 'setup:' + ip, 10, 15 * MIN, now))) return tooMany();
      const t = await env.DB.prepare('SELECT * FROM console_tokens WHERE token_hash=?').bind(await sha256(clean(body.token, 80))).first();
      if (!t || t.shop !== shop || t.kind !== 'setup' || t.used_at || t.expires_at < now) return json({ error: 'This setup link is not valid or has expired. Ask for a new one.' }, 403);
      const admins = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM staff WHERE shop=? AND role='admin'`).bind(shop).first()).n; if (admins) return json({ error: 'An admin already exists. Sign in instead.' }, 409);
      const name = clean(body.name, 60); const loc = clean(body.location, 60); if (!name) return json({ error: 'Enter your name.' }, 400);
      if (!validPin(body.pin)) return json({ error: 'Choose a 6-digit PIN that is not a simple pattern.' }, 400);
      await env.DB.prepare('UPDATE console_tokens SET used_at=? WHERE token_hash=?').bind(now, t.token_hash).run();
      const staff = await createStaff(env, shop, { name, role: 'admin', location: loc, pin: String(body.pin) }, now);
      const did = newId('d'); await env.DB.prepare('INSERT INTO console_devices (shop,id,name,location,status,created_by,created_at) VALUES (?,?,?,?,?,?,?)').bind(shop, did, clean(body.deviceName, 60) || 'Admin device', loc, 'pending', staff.id, now).run();
      const dev = await env.DB.prepare('SELECT * FROM console_devices WHERE shop=? AND id=?').bind(shop, did).first();
      const c1 = await registerDevice(env, shop, dev, now); const c2 = await newSession(env, shop, staff, dev, now);
      await audit(env, shop, { ...ctxA, staff, device: dev }, 'setup.first_admin', { after: { name, location: loc, device: dev.name } });
      const h = new Headers({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); h.append('Set-Cookie', c1); h.append('Set-Cookie', c2);
      return new Response(JSON.stringify({ ok: true }), { headers: h });
    }
    if (api === 'register' && req.method === 'POST') {
      if (!(await rateOk(env, 'reg:' + ip, 10, 15 * MIN, now))) return tooMany();
      const code = clean(body.code, 20).toUpperCase().replace(/[^A-Z0-9]/g, ''); if (code.length < 8) return json({ error: 'Enter the 8-character code from your admin.' }, 400);
      const d = await env.DB.prepare(`SELECT * FROM console_devices WHERE shop=? AND code_hash=? AND status='pending'`).bind(shop, await sha256(code)).first();
      if (!d || d.code_expires < now) { await audit(env, shop, ctxA, 'device.register_failed', { ok: false }); return json({ error: 'That code is not valid or has expired. Ask an admin for a new one.' }, 403); }
      const c = await registerDevice(env, shop, d, now); await audit(env, shop, { ...ctxA, device: d }, 'device.registered', { after: { name: d.name, location: d.location } });
      return json({ ok: true, device: { name: d.name, location: d.location } }, 200, { 'Set-Cookie': c });
    }
    if (!device) return json({ error: 'This device is not registered.', register: true }, 401);
    await env.DB.prepare('UPDATE console_devices SET last_seen=? WHERE shop=? AND id=? AND (last_seen IS NULL OR last_seen < ?)').bind(now, shop, device.id, now - 5 * MIN).run();
    if (api === 'login' && req.method === 'POST') {
      if (!(await rateOk(env, 'login:' + authKey, 20, 15 * MIN, now)) || !(await rateOk(env, 'loginip:' + ip, 40, 15 * MIN, now))) return tooMany();
      const staff = await env.DB.prepare('SELECT * FROM staff WHERE shop=? AND id=? AND active=1').bind(shop, clean(body.staff_id, 40)).first(); if (!staff) return json({ error: 'Pick your name.' }, 400);
      const r = await checkPin(env, shop, staff, body.pin, now);
      if (!r.ok) { await audit(env, shop, { ...ctxA, staff }, 'login.failed', { ok: false, reason: r.error }); return json({ error: r.error }, r.status); }
      const c = await newSession(env, shop, staff, device, now); await audit(env, shop, { ...ctxA, staff }, 'login');
      return json({ ok: true, staff: pubStaff(staff) }, 200, { 'Set-Cookie': c });
    }
    const sess = await sessionFrom(env, req, shop, device);
    if (!sess || sess.expires_at < now) return json({ error: 'Signed out. Enter your PIN.', login: true }, 401);
    const staff = sess.staff; ctxA.staff = staff;
    if (api === 'logout' && req.method === 'POST') { await env.DB.prepare('DELETE FROM console_sessions WHERE token_hash=?').bind(sess.token_hash).run(); await audit(env, shop, ctxA, 'logout'); return json({ ok: true }, 200, { 'Set-Cookie': cookie(SES, '', 0) }); }
    if (api === 'unlock' && req.method === 'POST') {
      if (!(await rateOk(env, 'login:' + authKey, 20, 15 * MIN, now))) return tooMany();
      const r = await checkPin(env, shop, staff, body.pin, now);
      if (!r.ok) { await audit(env, shop, ctxA, 'unlock.failed', { ok: false, reason: r.error }); if (r.status === 423) await env.DB.prepare('DELETE FROM console_sessions WHERE token_hash=?').bind(sess.token_hash).run(); return json({ error: r.error }, r.status); }
      await env.DB.prepare('UPDATE console_sessions SET last_seen=? WHERE token_hash=?').bind(now, sess.token_hash).run(); await audit(env, shop, ctxA, 'unlock'); return json({ ok: true });
    }
    if (now - sess.last_seen > LIMITS.idleMs) return json({ error: 'Locked. Enter your PIN.', locked: true }, 423);
    if (now - sess.last_seen > 20e3) await env.DB.prepare('UPDATE console_sessions SET last_seen=? WHERE token_hash=?').bind(now, sess.token_hash).run();
    if (!(await rateOk(env, 'api:' + device.id, 600, 5 * MIN, now))) return tooMany();
    const cfg = await getConfig(env, shop); const isAdmin = staff.role === 'admin';
    const needAdmin = async () => {                                                                   // admin role + the PIN again
      if (!isAdmin) return json({ error: 'Only an admin can do this.' }, 403);
      const r = await checkPin(env, shop, staff, body.pin, now); if (!r.ok) { await audit(env, shop, ctxA, 'admin.pin_failed', { ok: false, reason: r.error }); return json({ error: r.error, pin: true }, r.status); }
      return null;
    };

    if (api === 'meta') return json({ locations: await locations(env, shop), reasons: REASONS, consentText: CONSENT_TEXT, limits: { adjustMax: LIMITS.adjustMax, adjustDay: LIMITS.adjustDay }, me: pubStaff(staff), device: { name: device.name, location: device.location },
      redeem: { mode: mode(env.REDEEM_MODE), points: redeemCfg(cfg).points, value: redeemCfg(cfg).value, minOrder: redeemCfg(cfg).minOrder } });
    if (api === 'search') {
      const q = clean(u.searchParams.get('q'), 80); const query = searchQuery(q); if (!query) return json({ results: [] });
      const rows = (await findCustomers(env, shop, query)).map((c) => summary(c, cfg));
      await audit(env, shop, ctxA, 'customer.search', { reason: q.replace(/\d(?=\d{3})/g, '•').slice(0, 40) });                        // the term, partly masked
      return json({ results: rows, query: looksPhone(q) ? normPhone(q) : q });
    }
    if (api === 'customer' && req.method === 'GET') {
      const c = await readFull(env, shop, u.searchParams.get('id')); if (!c) return json({ error: 'Customer not found.' }, 404);
      const s = summary(c, cfg); const codes = parseCodes(c).filter((x) => x && x.status === 'active').map((x) => ({ code: x.code, value: x.value, expires: x.expires }));
      const orders = (c.orders.nodes || []).map((o) => ({ name: o.name, at: o.createdAt, total: Number(o.currentTotalPriceSet.shopMoney.amount), location: (o.retailLocation && o.retailLocation.name) || (o.sourceName === 'web' ? 'Online' : o.sourceName || ''), cancelled: !!o.cancelledAt }));
      const led = (await env.DB.prepare('SELECT at,delta,balance_before,balance_after,source,reason,staff_name,location,ref FROM points_ledger WHERE shop=? AND customer_id=? ORDER BY at DESC LIMIT 30').bind(shop, s.id).all()).results;
      await audit(env, shop, ctxA, 'customer.view', { customer_id: s.id });
      return json({ customer: { ...s, codes, orders, ledger: led, adminUrl: adminUrl(shop, s.id), canRedeem: s.status === 'enabled' && s.points >= redeemCfg(cfg).points } });
    }
    if (api === 'customer' && req.method === 'POST') return createCustomer(env, shop, body, cfg, ctxA, isAdmin);
    if (api === 'customer/update' && req.method === 'POST') return updateCustomer(env, shop, body, cfg, ctxA);
    if (api === 'redeem' && req.method === 'POST') return counterRedeem(env, shop, body, cfg, ctxA, now);
    if (api === 'points' && req.method === 'POST') { const no = await needAdmin(); if (no) return no; return adjustPoints(env, shop, body, ctxA, now); }
    if (api === 'staff' && req.method === 'GET') { if (!isAdmin) return json({ error: 'Only an admin can do this.' }, 403); return json({ staff: (await env.DB.prepare('SELECT * FROM staff WHERE shop=? ORDER BY active DESC, name COLLATE NOCASE').bind(shop).all()).results.map(pubStaff) }); }
    if (api === 'staff' && req.method === 'POST') { const no = await needAdmin(); if (no) return no; return manageStaff(env, shop, body, ctxA, now); }
    if (api === 'devices' && req.method === 'GET') { if (!isAdmin) return json({ error: 'Only an admin can do this.' }, 403);
      return json({ devices: (await env.DB.prepare('SELECT id,name,location,status,created_at,registered_at,last_seen,code_expires FROM console_devices WHERE shop=? ORDER BY created_at DESC').bind(shop).all()).results, current: device.id }); }
    if (api === 'devices' && req.method === 'POST') { const no = await needAdmin(); if (no) return no; return manageDevices(env, shop, body, ctxA, now); }
    if (api === 'audit' || api === 'audit.csv') {
      if (!isAdmin) return json({ error: 'Only an admin can do this.' }, 403);
      const from = Date.parse(u.searchParams.get('from') || '') || now - 7 * 864e5; const to = Date.parse(u.searchParams.get('to') || '') || now + 1;
      const rows = (await env.DB.prepare('SELECT at,staff_name,role,device_name,location,ip,action,customer_id,before,after,reason,ok FROM audit_log WHERE shop=? AND at>=? AND at<? ORDER BY at DESC LIMIT 5000').bind(shop, from, to).all()).results;
      if (api === 'audit') return json({ rows: rows.slice(0, 300), total: rows.length });
      await audit(env, shop, ctxA, 'audit.export', { reason: `${new Date(from).toISOString().slice(0, 10)}..${new Date(to).toISOString().slice(0, 10)}` });
      const esc = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) || /^[=+\-@]/.test(s) ? '"' + (/^[=+\-@]/.test(s) ? "'" : '') + s.replace(/"/g, '""') + '"' : s; };
      const head = ['time_colombo', 'staff', 'role', 'device', 'location', 'ip', 'action', 'customer_id', 'before', 'after', 'reason', 'ok'];
      const csv = [head.join(','), ...rows.map((r) => [new Date(r.at + 330 * MIN).toISOString().replace('T', ' ').slice(0, 19), r.staff_name, r.role, r.device_name, r.location, r.ip, r.action, r.customer_id, r.before, r.after, r.reason, r.ok].map(esc).join(','))].join('\n');
      return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="snh-audit-${new Date(now).toISOString().slice(0, 10)}.csv"`, 'Cache-Control': 'no-store' } });
    }
    return json({ error: 'not found' }, 404);
  } catch (e) { console.log('console error', api, String(e.message || e).slice(0, 300)); return json({ error: 'Something went wrong. Try again. (' + String(e.message || e).slice(0, 120) + ')' }, 500); }
}

// ── actions ──
async function createCustomer(env, shop, b, cfg, ctxA, isAdmin) {
  const first = clean(b.firstName, 60), last = clean(b.lastName, 60); const phone = b.phone ? normPhone(b.phone) : ''; const email = clean(b.email, 120).toLowerCase();
  if (!first) return json({ error: 'Enter a first name.' }, 400);
  if (!phone && !email) return json({ error: 'Enter a phone number or an email.' }, 400);
  if (b.phone && !phone) return json({ error: 'That phone number does not look right.' }, 400);
  if (email && !isEmail(email)) return json({ error: 'That email does not look right.' }, 400);
  const bday = clean(b.birthday, 10); if (bday && !/^\d{4}-\d{2}-\d{2}$/.test(bday)) return json({ error: 'Birthday must be a date.' }, 400);
  // duplicates by phone and by email
  const dups = []; if (phone) dups.push(...await findCustomers(env, shop, `phone:"${phone}"`, 5)); if (email) dups.push(...await findCustomers(env, shop, `email:"${email}"`, 5));
  if (dups.length) { const d = [...new Map(dups.map((c) => [c.id, summary(c, cfg)])).values()]; return json({ error: 'A customer with this phone or email already exists.', duplicates: d }, 409); }
  const tags = ['staff-created', 'loc:' + (ctxA.device.location || ctxA.staff.location || 'counter').toLowerCase()]; if (b.qa && isAdmin) tags.push('qa-test');
  const input = { firstName: first, lastName: last || null, tags, ...(phone ? { phone } : {}), ...(email ? { email } : {}),
    ...(bday ? { metafields: [{ namespace: 'facts', key: 'birth_date', type: 'date', value: bday }] } : {}),
    ...(email && b.consent ? { emailMarketingConsent: { marketingState: 'SUBSCRIBED', marketingOptInLevel: 'SINGLE_OPT_IN', consentUpdatedAt: new Date(ctxA.now).toISOString() } } : {}) };
  const d = await gql(env, shop, `mutation($i:CustomerInput!){customerCreate(input:$i){customer{id} userErrors{field message}}}`, { i: input });
  const err = userErrors(d.customerCreate); if (err) { await audit(env, shop, ctxA, 'customer.create_failed', { ok: false, reason: err }); return json({ error: err }, 400); }
  const id = d.customerCreate.customer.id; let invite = 'not sent (no email)';
  if (email) { try { const r = await gql(env, shop, `mutation($id:ID!){customerSendAccountInviteEmail(customerId:$id){customer{id} userErrors{field message}}}`, { id }); const e2 = userErrors(r.customerSendAccountInviteEmail); invite = e2 ? 'failed: ' + e2 : 'sent'; } catch (e) { invite = 'failed: ' + String(e.message).slice(0, 100); } }
  await audit(env, shop, ctxA, 'customer.create', { customer_id: id, after: { firstName: first, lastName: last, phone, email, birthday: bday, consent: !!(email && b.consent), tags, invite } });
  return json({ ok: true, id: num(id), invite });
}
async function updateCustomer(env, shop, b, cfg, ctxA) {
  const c = await readFull(env, shop, b.id); if (!c) return json({ error: 'Customer not found.' }, 404);
  const before = summary(c, cfg); const ch = {}; const after = {};
  const set = (k, v) => { if (v !== undefined && v !== before[k]) { ch[k] = v; after[k] = v; } };
  if (b.firstName !== undefined) { const v = clean(b.firstName, 60); if (!v) return json({ error: 'First name cannot be empty.' }, 400); set('firstName', v); }
  if (b.lastName !== undefined) set('lastName', clean(b.lastName, 60));
  if (b.phone !== undefined) { const v = b.phone ? normPhone(b.phone) : ''; if (b.phone && !v) return json({ error: 'That phone number does not look right.' }, 400); set('phone', v); }
  if (b.email !== undefined) { const v = clean(b.email, 120).toLowerCase(); if (v && !isEmail(v)) return json({ error: 'That email does not look right.' }, 400); set('email', v); }
  if (b.birthday !== undefined) { const v = clean(b.birthday, 10); if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return json({ error: 'Birthday must be a date.' }, 400); set('birthday', v); }
  const wantConsent = b.consent === undefined ? undefined : (b.consent ? 'SUBSCRIBED' : 'UNSUBSCRIBED');
  const consentChange = wantConsent && wantConsent !== (before.consent === 'SUBSCRIBED' ? 'SUBSCRIBED' : 'UNSUBSCRIBED');
  if (!Object.keys(ch).length && !consentChange) return json({ ok: true, unchanged: true });
  if (!clean(b.reason, 200)) return json({ error: 'Say briefly why (for the log).' }, 400);
  // duplicates for a new phone/email
  for (const [k, q] of [['phone', ch.phone && `phone:"${ch.phone}"`], ['email', ch.email && `email:"${ch.email}"`]]) if (q) { const hit = (await findCustomers(env, shop, q, 3)).filter((x) => num(x.id) !== before.id); if (hit.length) return json({ error: `That ${k} belongs to another customer (${hit[0].displayName}).` }, 409); }
  const input = { id: gidC(before.id) }; if ('firstName' in ch) input.firstName = ch.firstName; if ('lastName' in ch) input.lastName = ch.lastName || null;
  if ('phone' in ch) input.phone = ch.phone || null; if ('email' in ch) input.email = ch.email || null;
  if ('birthday' in ch && ch.birthday) input.metafields = [{ namespace: 'facts', key: 'birth_date', type: 'date', value: ch.birthday }];
  if (Object.keys(input).length > 1) { const d = await gql(env, shop, `mutation($i:CustomerInput!){customerUpdate(input:$i){customer{id} userErrors{field message}}}`, { i: input }); const err = userErrors(d.customerUpdate);
    if (err) { await audit(env, shop, ctxA, 'customer.update_failed', { customer_id: before.id, ok: false, reason: err }); return json({ error: err }, 400); } }
  if ('birthday' in ch && !ch.birthday) { try { await gql(env, shop, `mutation($m:[MetafieldIdentifierInput!]!){metafieldsDelete(metafields:$m){userErrors{message}}}`, { m: [{ ownerId: gidC(before.id), namespace: 'facts', key: 'birth_date' }] }); } catch (e) {} }
  if (consentChange) { const email = ch.email || before.email; if (!email) return json({ error: 'Add an email before changing email consent.' }, 400);
    const d = await gql(env, shop, `mutation($i:CustomerEmailMarketingConsentUpdateInput!){customerEmailMarketingConsentUpdate(input:$i){userErrors{field message}}}`, { i: { customerId: gidC(before.id), emailMarketingConsent: { marketingState: wantConsent, marketingOptInLevel: 'SINGLE_OPT_IN', consentUpdatedAt: new Date(ctxA.now).toISOString() } } });
    const err = userErrors(d.customerEmailMarketingConsentUpdate); if (err) return json({ error: err }, 400); after.consent = wantConsent; }
  const was = Object.fromEntries(Object.keys(after).map((k) => [k, k === 'consent' ? before.consent : before[k]]));
  await audit(env, shop, ctxA, 'customer.update', { customer_id: before.id, before: was, after, reason: clean(b.reason, 200) });
  return json({ ok: true, changed: Object.keys(after) });
}
async function counterRedeem(env, shop, b, cfg, ctxA, now) {
  const m = mode(env.REDEEM_MODE); const cfgR = redeemCfg(cfg); const id = num(b.id);
  const c = await readFull(env, shop, id); if (!c) return json({ error: 'Customer not found.' }, 404);
  const s = summary(c, cfg); const qa = (c.tags || []).includes('qa-test');
  // the same rules as the redeem service: off = nothing; qa = only QA customers (the configured IDs or the qa-test tag); live = everyone
  const list = qa ? [...cfgR.qaCustomerIds, id] : cfgR.qaCustomerIds;
  if (!allowed(m, id, list)) { await audit(env, shop, ctxA, 'redeem.blocked', { customer_id: id, ok: false, reason: `REDEEM_MODE=${m}` }); return json({ error: m === 'off' ? 'Redemption is switched off.' : 'Redemption is in test mode: only QA customers can redeem right now.' }, 403); }
  if (s.status !== 'enabled') return json({ error: 'The customer needs an active account first (they must accept the invite email).' }, 400);
  if (s.points < cfgR.points) return json({ error: `Needs ${cfgR.points.toLocaleString('en')} points; has ${s.points.toLocaleString('en')}.` }, 400);
  if (m === 'live' && cfgR.dailyCap && (await doneToday(env, shop, now)) >= cfgR.dailyCap) return json({ error: 'The daily redemption safety cap is reached. Try again tomorrow.' }, 429);
  if (!(c.tags || []).includes(cfgR.tag)) await gql(env, shop, `mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}`, { id: gidC(id), t: [cfgR.tag] });
  const r = await processCustomer(env, shop, id, { ...cfgR, qaCustomerIds: list }, m, now);
  let code = r.code || ''; const held = /already holds unused code (\S+)/.exec(r.note || ''); if (!code && held) code = held[1].replace(/;$/, '');
  if (r.status === 'done') await env.DB.prepare(`UPDATE points_ledger SET source='console-redeem', staff_id=?, staff_name=?, device_id=?, location=? WHERE shop=? AND id=?`).bind(ctxA.staff.id, ctxA.staff.name, ctxA.device.id, ctxA.device.location || ctxA.staff.location || null, shop, 'redeem-' + r.id).run();
  await audit(env, shop, ctxA, 'redeem.counter', { customer_id: id, before: { points: s.points }, after: { status: r.status || r.skipped, code, points: r.points_after ?? s.points }, reason: r.note || '', ok: r.status === 'done' || !!held });
  if (r.status === 'done') return json({ ok: true, code, value: cfgR.value, minOrder: cfgR.minOrder, expires: r.expires_at, pointsAfter: r.points_after });
  if (held) return json({ ok: true, existing: true, code, value: cfgR.value, minOrder: cfgR.minOrder, note: 'This member already has an unused reward code. Use this one; no new points were taken.' });
  return json({ error: r.skipped ? 'Another redemption for this customer is in progress. Try again in a minute.' : 'Not redeemed: ' + (r.note || r.status) }, 409);
}
async function adjustPoints(env, shop, b, ctxA, now) {
  const delta = Math.round(Number(b.delta)); const reason = REASONS.includes(b.reason) ? b.reason : ''; const note = clean(b.note, 200);
  if (!delta || !Number.isFinite(delta)) return json({ error: 'Enter the points to add or take away.' }, 400);
  if (Math.abs(delta) > LIMITS.adjustMax) return json({ error: `At most ${LIMITS.adjustMax.toLocaleString('en')} points per change.` }, 400);
  if (!reason) return json({ error: 'Pick a reason.' }, 400); if (reason === 'Other' && !note) return json({ error: 'Add a note for "Other".' }, 400);
  const today = (await env.DB.prepare(`SELECT COALESCE(SUM(ABS(delta)),0) AS n FROM points_ledger WHERE shop=? AND staff_id=? AND source='console-adjust' AND at>=?`).bind(shop, ctxA.staff.id, colomboDayStart(now)).first()).n;
  if (today + Math.abs(delta) > LIMITS.adjustDay) return json({ error: `Daily limit: you have changed ${today.toLocaleString('en')} points today (max ${LIMITS.adjustDay.toLocaleString('en')}).` }, 400);
  const id = num(b.id); const d = await gql(env, shop, `query($id:ID!){customer(id:$id){id ${MFS}}}`, { id: gidC(id) }); const c = d.customer; if (!c) return json({ error: 'Customer not found.' }, 404);
  const have = intv(c.pts && c.pts.value) || 0; const next = have + delta; if (next < 0) return json({ error: `Only ${have.toLocaleString('en')} points to take from.` }, 400);
  const w = await gql(env, shop, `mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){metafields{key} userErrors{field message code}}}`, { m: [{ ownerId: c.id, namespace: 'custom', key: 'loyalty_points', type: 'number_integer', value: String(next), compareDigest: c.pts ? c.pts.compareDigest : null }] });
  const err = userErrors(w.metafieldsSet); if (err) { await audit(env, shop, ctxA, 'points.adjust_failed', { customer_id: id, ok: false, reason: err }); return json({ error: /stale|compare/i.test(err) ? 'The balance changed a moment ago. Open the customer again and retry.' : err }, 409); }
  const why = reason + (note ? ': ' + note : '');
  await ledger(env, shop, { at: now, customer_id: id, delta, before: have, after: next, source: 'console-adjust', reason: why, staff_id: ctxA.staff.id, staff_name: ctxA.staff.name, device_id: ctxA.device.id, location: ctxA.device.location || ctxA.staff.location });
  // tiers follow annual spend (custom.annual_spend), not points, so an adjustment never changes the tier
  await audit(env, shop, ctxA, 'points.adjust', { customer_id: id, before: { points: have }, after: { points: next, delta, tier: 'unchanged (tiers follow annual spend)' }, reason: why });
  return json({ ok: true, before: have, after: next });
}
async function manageStaff(env, shop, b, ctxA, now) {
  const act = b.action; const name = clean(b.name, 60); const role = b.role === 'admin' ? 'admin' : 'staff'; const loc = clean(b.location, 60);
  if (act === 'add') { if (!name) return json({ error: 'Enter a name.' }, 400); if (!validPin(b.newPin)) return json({ error: 'The new PIN must be 6 digits and not a simple pattern.' }, 400);
    const s = await createStaff(env, shop, { name, role, location: loc, pin: String(b.newPin) }, now); await audit(env, shop, ctxA, 'staff.add', { after: { name, role, location: loc } }); return json({ ok: true, staff: pubStaff(s) }); }
  const s = await env.DB.prepare('SELECT * FROM staff WHERE shop=? AND id=?').bind(shop, clean(b.staff_id, 40)).first(); if (!s) return json({ error: 'Not found.' }, 404);
  const admins = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM staff WHERE shop=? AND role='admin' AND active=1`).bind(shop).first()).n;
  const lastAdmin = s.role === 'admin' && s.active && admins <= 1;
  if (act === 'disable' || act === 'enable') { if (act === 'disable' && lastAdmin) return json({ error: 'You cannot disable the last admin.' }, 400);
    await env.DB.prepare('UPDATE staff SET active=?, updated_at=? WHERE shop=? AND id=?').bind(act === 'enable' ? 1 : 0, now, shop, s.id).run();
    if (act === 'disable') await env.DB.prepare('DELETE FROM console_sessions WHERE shop=? AND staff_id=?').bind(shop, s.id).run();
    await audit(env, shop, ctxA, 'staff.' + act, { before: { name: s.name, active: !!s.active }, after: { active: act === 'enable' } }); return json({ ok: true }); }
  if (act === 'reset_pin') { if (!validPin(b.newPin)) return json({ error: 'The new PIN must be 6 digits and not a simple pattern.' }, 400); const salt = randomHex(16);
    await env.DB.prepare('UPDATE staff SET pin_hash=?, pin_salt=?, failed=0, locked_until=0, updated_at=? WHERE shop=? AND id=?').bind(await hashPin(String(b.newPin), salt), salt, now, shop, s.id).run();
    await env.DB.prepare('DELETE FROM console_sessions WHERE shop=? AND staff_id=?').bind(shop, s.id).run();
    await audit(env, shop, ctxA, 'staff.reset_pin', { before: { name: s.name }, after: { pin: 'reset (not logged)' } }); return json({ ok: true }); }
  if (act === 'update') { if (s.role === 'admin' && role !== 'admin' && lastAdmin) return json({ error: 'Keep at least one admin.' }, 400);
    await env.DB.prepare('UPDATE staff SET name=?, role=?, location=?, updated_at=? WHERE shop=? AND id=?').bind(name || s.name, role, loc || s.location, now, shop, s.id).run();
    await audit(env, shop, ctxA, 'staff.update', { before: { name: s.name, role: s.role, location: s.location }, after: { name: name || s.name, role, location: loc || s.location } }); return json({ ok: true }); }
  return json({ error: 'Unknown action.' }, 400);
}
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
async function manageDevices(env, shop, b, ctxA, now) {
  if (b.action === 'new') {
    const name = clean(b.name, 60); if (!name) return json({ error: 'Name the device (for example "Nugegoda counter iPad").' }, 400);
    let code = ''; for (const x of crypto.getRandomValues(new Uint8Array(8))) code += CODE_ALPHABET[x % CODE_ALPHABET.length];
    const id = newId('d'); await env.DB.prepare('INSERT INTO console_devices (shop,id,name,location,code_hash,code_expires,status,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .bind(shop, id, name, clean(b.location, 60), await sha256(code), now + LIMITS.codeMs, 'pending', ctxA.staff.id, now).run();
    await audit(env, shop, ctxA, 'device.code_created', { after: { name, location: clean(b.location, 60), expires: new Date(now + LIMITS.codeMs).toISOString() } });
    return json({ ok: true, code: code.slice(0, 4) + '-' + code.slice(4), expires: now + LIMITS.codeMs });
  }
  if (b.action === 'revoke') { const d = await env.DB.prepare('SELECT * FROM console_devices WHERE shop=? AND id=?').bind(shop, clean(b.device_id, 40)).first(); if (!d) return json({ error: 'Not found.' }, 404);
    if (d.id === ctxA.device.id) return json({ error: 'You cannot revoke the device you are using.' }, 400);
    await env.DB.prepare(`UPDATE console_devices SET status='revoked', token_hash=NULL, code_hash=NULL WHERE shop=? AND id=?`).bind(shop, d.id).run();
    await env.DB.prepare('DELETE FROM console_sessions WHERE device_id=?').bind(d.id).run();
    await audit(env, shop, ctxA, 'device.revoke', { before: { name: d.name, status: d.status }, after: { status: 'revoked' } }); return json({ ok: true }); }
  return json({ error: 'Unknown action.' }, 400);
}
export const _test = { PBKDF2_ITERATIONS };
