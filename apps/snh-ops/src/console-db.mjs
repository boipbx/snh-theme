// SNH Staff console: D1 tables, password hashing, audit log and the points ledger.
// Tables are created on first use (CREATE TABLE IF NOT EXISTS), so a deploy needs no separate migration step.
export const CONSOLE_SCHEMA = [
  // staff: one row per person. pin_hash = PBKDF2-SHA256, 100,000 iterations (the Workers maximum), per-user salt.
  `CREATE TABLE IF NOT EXISTS staff (shop TEXT NOT NULL, id TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL, location TEXT, pin_hash TEXT NOT NULL, pin_salt TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1, failed INTEGER NOT NULL DEFAULT 0, locked_until INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER, PRIMARY KEY (shop, id))`,
  // devices: registered POS tablets/PCs. token_hash = SHA-256 of the device cookie. code_hash = one-time registration code (until used).
  `CREATE TABLE IF NOT EXISTS console_devices (shop TEXT NOT NULL, id TEXT NOT NULL, name TEXT NOT NULL, location TEXT, code_hash TEXT, code_expires INTEGER, token_hash TEXT,
    status TEXT NOT NULL, created_by TEXT, created_at INTEGER NOT NULL, registered_at INTEGER, last_seen INTEGER, PRIMARY KEY (shop, id))`,
  `CREATE TABLE IF NOT EXISTS console_sessions (token_hash TEXT PRIMARY KEY, shop TEXT NOT NULL, staff_id TEXT NOT NULL, device_id TEXT NOT NULL, created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL, last_seen INTEGER NOT NULL)`,
  // one-time links (first admin setup). Only the hash is stored.
  `CREATE TABLE IF NOT EXISTS console_tokens (token_hash TEXT PRIMARY KEY, shop TEXT NOT NULL, kind TEXT NOT NULL, expires_at INTEGER NOT NULL, used_at INTEGER, created_at INTEGER NOT NULL)`,
  // rate limiting: fixed windows per key (device / IP / action)
  `CREATE TABLE IF NOT EXISTS console_rate (key TEXT PRIMARY KEY, window_start INTEGER NOT NULL, count INTEGER NOT NULL)`,
  // every console action. before/after are JSON.
  `CREATE TABLE IF NOT EXISTS audit_log (shop TEXT NOT NULL, id TEXT NOT NULL, at INTEGER NOT NULL, staff_id TEXT, staff_name TEXT, role TEXT, device_id TEXT, device_name TEXT,
    location TEXT, ip TEXT, action TEXT NOT NULL, customer_id TEXT, before TEXT, after TEXT, reason TEXT, ok INTEGER NOT NULL DEFAULT 1, PRIMARY KEY (shop, id))`,
  // points ledger, from 25 Nov 2026 on: every change by the console, the redeem service and the welcome service.
  `CREATE TABLE IF NOT EXISTS points_ledger (shop TEXT NOT NULL, id TEXT NOT NULL, at INTEGER NOT NULL, customer_id TEXT NOT NULL, delta INTEGER NOT NULL, balance_before INTEGER,
    balance_after INTEGER, source TEXT NOT NULL, reason TEXT, staff_id TEXT, staff_name TEXT, device_id TEXT, location TEXT, ref TEXT, PRIMARY KEY (shop, id))`,
  `CREATE INDEX IF NOT EXISTS ledger_customer ON points_ledger (shop, customer_id, at)`,
  `CREATE INDEX IF NOT EXISTS audit_at ON audit_log (shop, at)`,
];
let ready = false;
export async function ensureConsoleTables(env) {
  if (ready) return; await env.DB.batch(CONSOLE_SCHEMA.map((s) => env.DB.prepare(s))); ready = true;
}
export const resetReady = () => { ready = false; };

const enc = new TextEncoder();
export const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
export const randomHex = (n = 32) => hex(crypto.getRandomValues(new Uint8Array(n)));
export const sha256 = async (s) => hex(await crypto.subtle.digest('SHA-256', enc.encode(String(s))));
export const PBKDF2_ITERATIONS = 100000;
export async function hashPin(pin, saltHex, iterations = PBKDF2_ITERATIONS) {
  const key = await crypto.subtle.importKey('raw', enc.encode(String(pin)), 'PBKDF2', false, ['deriveBits']);
  const salt = Uint8Array.from(saltHex.match(/../g).map((h) => parseInt(h, 16)));
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256));
}
export const validPin = (p) => /^\d{6}$/.test(String(p || '')) && !/^(\d)\1{5}$/.test(p) && !['123456', '654321', '012345', '123123'].includes(p);
// constant-time compare of two hex strings
export function sameHex(a, b) { a = String(a); b = String(b); if (a.length !== b.length) return false; let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0; }
export const newId = (prefix = '') => prefix + Date.now().toString(36) + '-' + randomHex(4);

export async function audit(env, shop, ctx, action, fields = {}) {
  const a = ctx || {}; const s = a.staff || {}; const d = a.device || {};
  await env.DB.prepare('INSERT INTO audit_log (shop,id,at,staff_id,staff_name,role,device_id,device_name,location,ip,action,customer_id,before,after,reason,ok) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(shop, newId('a'), a.now || Date.now(), s.id || null, s.name || null, s.role || null, d.id || null, d.name || null, d.location || s.location || null, a.ip || null, action,
      fields.customer_id ? String(fields.customer_id).split('/').pop() : null, fields.before == null ? null : JSON.stringify(fields.before), fields.after == null ? null : JSON.stringify(fields.after),
      fields.reason || null, fields.ok === false ? 0 : 1).run();
}
// The ledger is written by the console, the redeem service and the welcome service. It never blocks a points change:
// a ledger failure is logged and the caller carries on (the change itself is already guarded by compareDigest).
export async function ledger(env, shop, row) {
  try {
    await ensureConsoleTables(env);
    await env.DB.prepare('INSERT OR IGNORE INTO points_ledger (shop,id,at,customer_id,delta,balance_before,balance_after,source,reason,staff_id,staff_name,device_id,location,ref) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(shop, row.id || newId('l'), row.at || Date.now(), String(row.customer_id).split('/').pop(), Math.round(row.delta), row.before ?? null, row.after ?? null, row.source, row.reason || null,
        row.staff_id || null, row.staff_name || null, row.device_id || null, row.location || null, row.ref || null).run();
    return true;
  } catch (e) { console.log('ledger write failed', String(e.message || e).slice(0, 160)); return false; }
}
// fixed-window rate limit. Returns true when the call is allowed.
export async function rateOk(env, key, limit, windowMs, now = Date.now()) {
  const w = now - (now % windowMs);
  const r = await env.DB.prepare(`INSERT INTO console_rate (key, window_start, count) VALUES (?,?,1) ON CONFLICT(key) DO UPDATE SET count = CASE WHEN window_start = excluded.window_start THEN count + 1 ELSE 1 END, window_start = excluded.window_start RETURNING count`)
    .bind(key, w).first();
  return !r || r.count <= limit;
}
