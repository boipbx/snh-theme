// Cloudflare Worker entry: Shopify webhooks POST here. Each request is checked against SHOPIFY_WEBHOOK_SECRET
// (HMAC-SHA256 of the raw body, header X-Shopify-Hmac-Sha256); anything else gets 401. Always answers 200 to a valid
// webhook so Shopify doesn't retry a message that was skipped on purpose.
import { handle, TOPICS } from './handle.mjs';

async function validHmac(raw, header, secret) {
  if (!header || !secret) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw)));
  const b64 = btoa(String.fromCharCode(...sig));
  if (b64.length !== header.length) return false;
  let diff = 0; for (let i = 0; i < b64.length; i++) diff |= b64.charCodeAt(i) ^ header.charCodeAt(i);
  return diff === 0;
}
export default {
  async fetch(req, env) {
    if (req.method !== 'POST') return new Response('ok');
    const raw = await req.text();
    if (!(await validHmac(raw, req.headers.get('X-Shopify-Hmac-Sha256'), env.SHOPIFY_WEBHOOK_SECRET))) return new Response('unauthorized', { status: 401 });
    const topic = req.headers.get('X-Shopify-Topic') || '';
    if (!TOPICS[topic]) return new Response('ignored');
    try { const r = await handle(topic, JSON.parse(raw), env); return new Response(JSON.stringify({ ok: true, result: r.dry ? 'dry-run' : r.sent ? 'sent' : r.skipped || r.error || 'not sent' })); }
    catch (e) { console.log('sms handler error', String(e.message || e).slice(0, 200)); return new Response('ok'); }
  },
};
