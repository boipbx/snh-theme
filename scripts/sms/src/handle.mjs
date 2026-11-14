// Shopify webhook → one SMS. Topics: orders/create, fulfillments/create, fulfillment_orders/line_items_prepared_for_pickup.
// DRY_RUN (default true) logs what would be sent and sends nothing.
import { normalizeLK } from './phone.mjs';
import { formatSms } from './format.mjs';
import { pickProvider } from './providers/index.mjs';

export const TOPICS = { 'orders/create': 'order_placed', 'fulfillments/create': 'shipped', 'fulfillment_orders/line_items_prepared_for_pickup': 'ready_for_pickup' };

// pull what the SMS needs out of each webhook body (REST-shaped JSON)
export function extract(topic, b) {
  if (topic === 'orders/create') return { event: 'order_placed', order: { name: b.name, statusUrl: b.order_status_url }, phone: b.phone || b.shipping_address?.phone || b.billing_address?.phone || b.customer?.phone, key: `order:${b.id}` };
  if (topic === 'fulfillments/create') {
    if (b.status && b.status !== 'success') return null;
    return { event: 'shipped', order: { name: b.name ? String(b.name).split('.')[0] : `#${b.order_id}`, tracking: b.tracking_number, statusUrl: b.tracking_url || '' }, phone: b.destination?.phone, key: `fulfillment:${b.id}`, needsOrderLookup: !b.destination?.phone, orderId: b.order_id };
  }
  if (topic === 'fulfillment_orders/line_items_prepared_for_pickup') {
    const fo = b.fulfillment_order || b;
    return { event: 'ready_for_pickup', order: { name: fo.order_name || `order ${fo.order_id || ''}`.trim(), location: fo.assigned_location?.name, statusUrl: '' }, phone: fo.destination?.phone, key: `pickup:${fo.id}`, needsOrderLookup: !fo.destination?.phone || !fo.order_name, orderId: fo.order_id };
  }
  return null;
}

export async function handle(topic, body, env, { log = console.log, seen } = {}) {
  const x = extract(topic, body); if (!x) return { skipped: 'topic or status not handled' };
  if (seen && (await seen(x.key))) return { skipped: 'duplicate webhook' };
  const to = normalizeLK(x.phone); if (!to) return { skipped: 'no Sri Lankan mobile number on the order', event: x.event, order: x.order.name };
  const text = formatSms(x.event, x.order, { whatsapp: env.WHATSAPP_NUMBER, storeUrl: env.STORE_URL });
  const dry = String(env.DRY_RUN ?? 'true') !== 'false';
  const masked = to.slice(0, 6) + '****' + to.slice(-2);
  if (dry) { log(`[DRY_RUN] ${x.event} → ${masked} (${text.length} chars): ${text}`); return { dry: true, event: x.event, to: masked, text }; }
  const { provider, missing } = pickProvider(env);
  if (!provider || missing.length) { log(`not sent, missing settings: ${missing.join(', ')}`); return { error: 'not configured', missing }; }
  const r = await provider.send(env, { to, text, senderId: env.SMS_SENDER_ID, txn: Date.now() });
  log(`${x.event} → ${masked} via ${provider.name}: ${r.ok ? 'sent' : 'FAILED ' + (r.error || '')}`);
  return { sent: r.ok, provider: provider.name, event: x.event, to: masked, error: r.ok ? undefined : r.error };
}
