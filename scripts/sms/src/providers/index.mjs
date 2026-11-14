// Gateway adapters. Each takes { to: '+947XXXXXXXX', text, senderId } and returns { ok, id?, error? }.
// Built from each gateway's public API docs; CONFIRM the endpoint and fields against the current docs before going
// live (docs/golive/SMS-PLAN.md). Secrets come from env only and are never logged.
import { as94, asLocal9 } from '../phone.mjs';

async function post(url, init) {
  const r = await fetch(url, init); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
  return { status: r.status, ok: r.ok, json: j, text: t.slice(0, 200) };
}

// Notify.lk — POST https://app.notify.lk/api/v1/send (user_id, api_key, sender_id, to=947XXXXXXXX, message)
export const notifylk = {
  name: 'notifylk', needs: ['NOTIFYLK_USER_ID', 'NOTIFYLK_API_KEY'],
  async send(env, { to, text, senderId }) {
    const body = new URLSearchParams({ user_id: env.NOTIFYLK_USER_ID, api_key: env.NOTIFYLK_API_KEY, sender_id: senderId, to: as94(to), message: text });
    const r = await post('https://app.notify.lk/api/v1/send', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    return { ok: r.ok && r.json?.status === 'success', id: r.json?.data, error: r.ok ? r.json?.status : `HTTP ${r.status}` };
  },
};

// Text.lk — POST https://app.text.lk/api/v3/sms/send (Bearer token; recipient=947XXXXXXXX, sender_id, type=plain, message)
export const textlk = {
  name: 'textlk', needs: ['TEXTLK_API_TOKEN'],
  async send(env, { to, text, senderId }) {
    const r = await post('https://app.text.lk/api/v3/sms/send', { method: 'POST', headers: { Authorization: `Bearer ${env.TEXTLK_API_TOKEN}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ recipient: as94(to), sender_id: senderId, type: 'plain', message: text }) });
    return { ok: r.ok && r.json?.status === 'success', id: r.json?.data?.uid, error: r.ok ? r.json?.message : `HTTP ${r.status}` };
  },
};

// Dialog eSMS — POST https://e-sms.dialog.lk/api/v1/login (username, password) → token;
// then POST /api/v1/sms (Bearer token; msisdns=[{mobile: 7XXXXXXXX}], sourceAddress, message, transaction_id)
export const dialog = {
  name: 'dialog', needs: ['DIALOG_ESMS_USERNAME', 'DIALOG_ESMS_PASSWORD'],
  async send(env, { to, text, senderId, txn }) {
    const login = await post('https://e-sms.dialog.lk/api/v1/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: env.DIALOG_ESMS_USERNAME, password: env.DIALOG_ESMS_PASSWORD }) });
    const token = login.json?.token; if (!token) return { ok: false, error: `login failed (HTTP ${login.status})` };
    const r = await post('https://e-sms.dialog.lk/api/v1/sms', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ msisdns: [{ mobile: asLocal9(to) }], sourceAddress: senderId, message: text, transaction_id: txn || Date.now() }) });
    return { ok: r.ok && r.json?.status === 'success', id: r.json?.data?.campaignId, error: r.ok ? r.json?.comment : `HTTP ${r.status}` };
  },
};

export const PROVIDERS = { notifylk, textlk, dialog };
export function pickProvider(env) {
  const p = PROVIDERS[String(env.SMS_PROVIDER || '').toLowerCase()];
  if (!p) return { provider: null, missing: ['SMS_PROVIDER (notifylk | textlk | dialog)'] };
  const missing = p.needs.filter((k) => !env[k]); if (!env.SMS_SENDER_ID) missing.push('SMS_SENDER_ID');
  return { provider: p, missing };
}
