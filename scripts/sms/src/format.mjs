// SMS texts: English, GSM-7 characters only, 160 characters max (one SMS part).
// Each carries the order number, an order status link and the WhatsApp number.
export const MAX = 160;
const GSM7 = /^[A-Za-z0-9 \r\n@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ!"#¤%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà]*$/;
export const isGsm7 = (s) => GSM7.test(s);
const clean = (s) => String(s || '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/[^\x20-\x7E]/g, '').trim();

// status link: the order's own status page when it fits, else the short "my orders" page on the store
export function statusLink(order, cfg, room) {
  const full = String(order.statusUrl || '').replace(/^https?:\/\//, '');
  if (full && full.length <= room) return full;
  return `${cfg.storeUrl || 'sportsnutritionhub.lk'}/account`;
}
const TEMPLATES = {
  order_placed: (o, link, wa) => `SNH: Order ${o.name} received. Thank you! Track: ${link} Help on WhatsApp ${wa}`,
  shipped: (o, link, wa) => `SNH: Order ${o.name} is on its way${o.tracking ? ' (' + clean(o.tracking).slice(0, 24) + ')' : ''}. Track: ${link} WhatsApp ${wa}`,
  ready_for_pickup: (o, link, wa) => `SNH: Order ${o.name} is ready to collect at ${clean(o.location || 'SNH').slice(0, 20)}. Held 48h. Details: ${link} WhatsApp ${wa}`,
};
export const EVENTS = Object.keys(TEMPLATES);

export function formatSms(event, order, cfg = {}) {
  const t = TEMPLATES[event]; if (!t) throw new Error('unknown event ' + event);
  const wa = clean(cfg.whatsapp || '');
  const o = { ...order, name: clean(order.name) };
  const base = t(o, '', wa).length;                      // length without the link
  let text = t(o, statusLink(order, cfg, MAX - base), wa);
  if (text.length > MAX) text = t({ ...o, tracking: '', location: clean(o.location || 'SNH').slice(0, 10) }, statusLink(order, cfg, 0), wa);
  if (text.length > MAX) text = text.slice(0, MAX);
  return text;
}
