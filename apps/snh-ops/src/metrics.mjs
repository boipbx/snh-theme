// Pure metrics math (no I/O): everything the dashboard shows is computed here from cached rows + the store's config.
// Rows: customers {id,name,tags,points,tier,annual_spend,last_reward_code,created_at,last_order_at}
//       orders {id,name,created_at,cancelled,customer_id,total,subtotal,discount_total,financial,fulfillment,delivery,pickup_status,ready_at,codes,tags}
//       lines {order_id,product_id,product_type,title,qty,amount}
export const DAY = 864e5;
export const DEFAULT_CONFIG = { currency: '', tzOffsetMinutes: 0, tiers: [], pointValue: 1, welcomePoints: 0, rewardPoints: 0, rewardCodePrefix: '', awardedTag: '',
  bundleProductType: 'Bundle', promoCodePrefix: '', pickupHoldHours: 48, monthsOfOrders: 12, services: {} };
export const withDefaults = (cfg) => ({ ...DEFAULT_CONFIG, ...(cfg || {}), services: { ...(cfg && cfg.services) } });

const num = (x) => (x == null || x === '' || Number.isNaN(Number(x)) ? 0 : Number(x));
const norm = (s) => String(s || '').trim().toLowerCase();
const t = (iso) => (iso ? Date.parse(iso) : NaN);
const list = (s) => (Array.isArray(s) ? s : String(s || '').split(',').map((x) => x.trim()).filter(Boolean));

// A member = a customer with a loyalty tier or a points value written on them.
export const isMember = (c) => norm(c.tier) !== '' || (c.points != null && c.points !== '');
// Orders that count as revenue: not cancelled, not voided, not fully refunded.
export const counts = (o) => !o.cancelled && !['VOIDED', 'REFUNDED'].includes(o.financial);
export const isPaid = (o) => ['PAID', 'PARTIALLY_REFUNDED'].includes(o.financial);
// local calendar day (store time) of a timestamp, as YYYY-MM-DD
export const localDay = (iso, cfg) => new Date(t(iso) + (cfg.tzOffsetMinutes || 0) * 6e4).toISOString().slice(0, 10);

export function tierCounts(customers, cfg) {
  const names = cfg.tiers.map((x) => x.name); const out = Object.fromEntries(names.map((n) => [n, 0])); let other = 0, blank = 0;
  for (const c of customers) { if (!isMember(c)) continue; const hit = names.find((n) => norm(n) === norm(c.tier)); if (hit) out[hit]++; else if (norm(c.tier) === '') blank++; else other++; }
  return { tiers: out, otherTier: other, blankTier: blank, total: Object.values(out).reduce((a, b) => a + b, 0) + other + blank };
}
export function newMembers(customers, now, days) { const since = now - days * DAY; return customers.filter((c) => isMember(c) && t(c.created_at) >= since).length; }
export function pointsOutstanding(customers, cfg) {
  const points = customers.reduce((s, c) => s + Math.max(0, num(c.points)), 0);
  return { points, value: Math.round(points * num(cfg.pointValue) * 100) / 100 };
}
// Members whose yearly spend is within pct (default 10%) of the next tier's threshold.
export function closeToNextTier(customers, cfg, pct = 0.1) {
  const tiers = [...cfg.tiers].sort((a, b) => a.minSpend - b.minSpend); const out = [];
  for (const c of customers) {
    if (!isMember(c)) continue; const spend = num(c.annual_spend);
    const next = tiers.find((x) => x.minSpend > spend); if (!next || next.minSpend <= 0) continue;
    const gap = next.minSpend - spend; if (gap <= next.minSpend * pct) out.push({ id: c.id, name: c.name, tier: c.tier, annual_spend: spend, next: next.name, gap: Math.round(gap * 100) / 100 });
  }
  return out.sort((a, b) => a.gap - b.gap);
}
// Members with enough points for a reward who hold no reward code.
export function redeemable(customers, cfg) {
  if (!cfg.rewardPoints) return [];
  return customers.filter((c) => num(c.points) >= cfg.rewardPoints && !String(c.last_reward_code || '').trim())
    .map((c) => ({ id: c.id, name: c.name, tier: c.tier, points: num(c.points), last_order_at: c.last_order_at })).sort((a, b) => b.points - a.points);
}
export function dataHealth(customers, orders, cfg, now) {
  const since = now - 30 * DAY; const tag = norm(cfg.awardedTag);
  const paidRecent = orders.filter((o) => isPaid(o) && !o.cancelled && o.customer_id && t(o.created_at) >= since);
  return {
    customers: customers.length,
    blankPoints: customers.filter((c) => c.points == null || c.points === '').length,
    blankTier: customers.filter((c) => norm(c.tier) === '').length,
    pointsButNoTier: customers.filter((c) => c.points != null && c.points !== '' && norm(c.tier) === '').length,
    paidOrders30: paidRecent.length,
    paidMissingAwardTag30: tag ? paidRecent.filter((o) => !list(o.tags).map(norm).includes(tag)).length : null,
  };
}
export function revenueSplit(orders, customers, now, days = 30) {
  const members = new Set(customers.filter(isMember).map((c) => c.id)); const since = now - days * DAY;
  const r = { member: { revenue: 0, orders: 0 }, nonMember: { revenue: 0, orders: 0 } };
  for (const o of orders) { if (!counts(o) || t(o.created_at) < since) continue; const k = o.customer_id && members.has(o.customer_id) ? 'member' : 'nonMember'; r[k].revenue += num(o.total); r[k].orders++; }
  for (const k of ['member', 'nonMember']) r[k].revenue = Math.round(r[k].revenue * 100) / 100;
  return r;
}
// There is no points ledger in Shopify, so this is an ESTIMATE from the rules: earn rate × paid member order value
// + welcome points for new members; redeemed = reward codes used × reward points.
export function pointsFlow(orders, customers, cfg, now, days = 30) {
  const since = now - days * DAY; const byId = new Map(customers.map((c) => [c.id, c]));
  const rate = (c) => { const x = cfg.tiers.find((y) => norm(y.name) === norm(c.tier)); return x ? num(x.ratePct) / 100 : 0; };
  let earned = 0, redeemedCodes = 0;
  for (const o of orders) {
    if (t(o.created_at) < since || o.cancelled) continue;
    const c = o.customer_id && byId.get(o.customer_id);
    if (c && isMember(c) && isPaid(o)) earned += Math.floor(num(o.subtotal) * rate(c));
    if (cfg.rewardCodePrefix) redeemedCodes += list(o.codes).filter((x) => norm(x).startsWith(norm(cfg.rewardCodePrefix))).length;
  }
  const welcome = newMembers(customers, now, days) * num(cfg.welcomePoints);
  return { issuedEstimate: earned + welcome, earnedOnOrders: earned, welcome, redeemed: redeemedCodes * num(cfg.rewardPoints), rewardCodesUsed: redeemedCodes, estimate: true };
}
// Bundle sales. Shopify stores a bundle sale as its component lines grouped under the bundle (lineItemGroup), so:
// a line counts when its group's product is one of the store's bundle products, or when the line itself is a
// bundle-type product. Revenue = what the customer paid for those lines; units = bundles sold (not components).
export function bundleStats(orders, lines, cfg, now, days = 30, bundleProductIds = []) {
  const type = norm(cfg.bundleProductType); const ids = new Set(bundleProductIds); const ok = new Map(orders.filter(counts).map((o) => [o.id, o])); const since = now - days * DAY;
  const mk = () => ({ revenue: 0, units: 0, orders: new Set(), groups: new Set() }); const tot = mk(), all = mk(); const top = new Map(); const trend = new Map();
  for (let d = days - 1; d >= 0; d--) trend.set(localDay(new Date(now - d * DAY).toISOString(), cfg), 0);
  for (const l of lines) {
    const grouped = l.group_id && ids.has(l.group_product_id); const direct = !grouped && norm(l.product_type) === type && type !== '';
    if (!grouped && !direct) continue; const o = ok.get(l.order_id); if (!o) continue;
    const key = grouped ? l.group_product_id : (l.product_id || l.title); const title = grouped ? l.group_title : l.title;
    const add = (acc) => { acc.revenue += num(l.amount); acc.orders.add(o.id); if (grouped) { if (!acc.groups.has(l.group_id)) { acc.groups.add(l.group_id); acc.units += num(l.group_qty) || 1; return num(l.group_qty) || 1; } return 0; } acc.units += num(l.qty); return num(l.qty); };
    add(all); if (t(o.created_at) < since) continue;
    const u = add(tot); const e = top.get(key) || { title, revenue: 0, units: 0 }; e.revenue += num(l.amount); e.units += u; top.set(key, e);
    const day = localDay(o.created_at, cfg); if (trend.has(day)) trend.set(day, trend.get(day) + num(l.amount));
  }
  const r2 = (x) => Math.round(x * 100) / 100;
  return { days, revenue: r2(tot.revenue), orders: tot.orders.size, units: tot.units,
    allTime: { revenue: r2(all.revenue), orders: all.orders.size, units: all.units },
    top: [...top.values()].map((e) => ({ ...e, revenue: r2(e.revenue) })).sort((a, b) => b.revenue - a.revenue).slice(0, 15),
    trend: [...trend].map(([day, revenue]) => ({ day, revenue: r2(revenue) })) };
}
// Promo code usage per code (one code per Sunday): orders, discount given, revenue.
export function promoUsage(orders, cfg) {
  const p = norm(cfg.promoCodePrefix); if (!p) return []; const m = new Map();
  for (const o of orders) {
    if (!counts(o)) continue;
    for (const code of list(o.codes)) { if (!norm(code).startsWith(p)) continue; const k = code.toUpperCase(); const e = m.get(k) || { code: k, day: localDay(o.created_at, cfg), orders: 0, discount: 0, revenue: 0 }; e.orders++; e.discount += num(o.discount_total); e.revenue += num(o.total); m.set(k, e); }
  }
  return [...m.values()].map((e) => ({ ...e, discount: Math.round(e.discount * 100) / 100, revenue: Math.round(e.revenue * 100) / 100 })).sort((a, b) => (a.day < b.day ? 1 : -1));
}
// Pickup orders that are still open, with overdue = ready for longer than the hold.
export function pickupOrders(orders, cfg, now) {
  const hold = num(cfg.pickupHoldHours) * 36e5; const out = [];
  for (const o of orders) {
    if (norm(o.delivery) !== 'pick_up' || o.cancelled || o.pickup_status === 'PICKED_UP' || o.fulfillment === 'FULFILLED') continue;
    const ready = t(o.ready_at); const hours = Number.isNaN(ready) ? null : Math.floor((now - ready) / 36e5);
    out.push({ id: o.id, name: o.name, created_at: o.created_at, financial: o.financial, status: Number.isNaN(ready) ? 'Not marked ready' : 'Ready for pickup', readyHours: hours, overdue: hours != null && now - ready > hold });
  }
  return out.sort((a, b) => (b.overdue - a.overdue) || (a.created_at < b.created_at ? 1 : -1));
}
export function overview(customers, orders, cfg, now) {
  const tc = tierCounts(customers, cfg);
  return { members: tc.total, newWeek: newMembers(customers, now, 7), newMonth: newMembers(customers, now, 30), tiers: tc, points: pointsOutstanding(customers, cfg),
    flow30: pointsFlow(orders, customers, cfg, now, 30), revenue30: revenueSplit(orders, customers, now, 30), customers: customers.length };
}
