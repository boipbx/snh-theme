// node --test apps/snh-ops/test/
import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/metrics.mjs';
import fs from 'node:fs';
const cfg = M.withDefaults(JSON.parse(fs.readFileSync(new URL('../config/example-store.json', import.meta.url))));
const NOW = Date.parse('2026-11-15T12:00:00Z'); const ago = (d) => new Date(NOW - d * M.DAY).toISOString();
const C = [
  { id: 'c1', name: 'A', tier: 'Gold', points: 37701, annual_spend: 372011, created_at: ago(400), last_reward_code: '' },
  { id: 'c2', name: 'B', tier: 'Silver', points: 2500, annual_spend: 285000, created_at: ago(20), last_reward_code: '' },
  { id: 'c3', name: 'C', tier: 'bronze', points: 500, annual_spend: 180000, created_at: ago(3), last_reward_code: '' },
  { id: 'c4', name: 'D', tier: 'Bronze', points: 3000, annual_spend: 1000, created_at: ago(100), last_reward_code: 'ELITE-1' },
  { id: 'c5', name: 'E', tier: '', points: null, annual_spend: null, created_at: ago(2) },
  { id: 'c6', name: 'F', tier: '', points: 500, annual_spend: 0, created_at: ago(50) },
];
const O = [
  { id: 'o1', created_at: ago(1), customer_id: 'c1', total: 10000, subtotal: 9500, discount_total: 0, financial: 'PAID', codes: '', tags: 'points_awarded' },
  { id: 'o2', created_at: ago(2), customer_id: 'c5', total: 5000, subtotal: 5000, discount_total: 0, financial: 'PAID', codes: '', tags: '' },
  { id: 'o3', created_at: ago(5), customer_id: 'c3', total: 3400, subtotal: 3400, discount_total: 600, financial: 'PAID', codes: 'SUN15-15NOV', tags: '' },
  { id: 'o4', created_at: ago(5), customer_id: 'c4', total: 500, subtotal: 3000, discount_total: 2500, financial: 'PAID', codes: 'ELITE-64126-6DD8E7', tags: 'points_awarded' },
  { id: 'o5', created_at: ago(6), customer_id: null, total: 9000, subtotal: 9000, discount_total: 0, financial: 'PENDING', codes: '', tags: '', delivery: 'PICK_UP', ready_at: ago(3), pickup_status: 'READY_FOR_PICKUP' },
  { id: 'o6', created_at: ago(7), customer_id: 'c2', total: 20000, subtotal: 20000, discount_total: 0, financial: 'PAID', cancelled: 1, codes: 'SUN15-08NOV', tags: '' },
  { id: 'o7', created_at: ago(40), customer_id: 'c2', total: 8000, subtotal: 8000, discount_total: 0, financial: 'PAID', codes: '', tags: '' },
  { id: 'o8', created_at: ago(1), customer_id: 'c1', total: 4000, subtotal: 4000, discount_total: 0, financial: 'REFUNDED', codes: '', tags: '' },
  { id: 'o9', created_at: ago(1), customer_id: null, total: 2000, subtotal: 2000, discount_total: 0, financial: 'PAID', codes: '', tags: '', delivery: 'PICK_UP', ready_at: null },
];
const L = [
  { order_id: 'o1', product_id: 'p1', product_type: 'Bundle', title: 'Godzilla Beast Mode', qty: 1, amount: 9500 },
  { order_id: 'o2', product_id: 'p2', product_type: 'bundle', title: 'Bar Box 6', qty: 2, amount: 5000 },
  { order_id: 'o3', product_id: 'p3', product_type: 'Electrolytes', title: 'SiS Hydro', qty: 1, amount: 3400 },
  { order_id: 'o6', product_id: 'p1', product_type: 'Bundle', title: 'Godzilla Beast Mode', qty: 1, amount: 20000 },   // cancelled order
  { order_id: 'o7', product_id: 'p1', product_type: 'Bundle', title: 'Godzilla Beast Mode', qty: 1, amount: 8000 },    // 40 days ago
  { order_id: 'o8', product_id: 'p2', product_type: 'Bundle', title: 'Bar Box 6', qty: 1, amount: 4000 },              // refunded
];

test('tier counts: case-insensitive, members only, blank tier counted apart', () => {
  const r = M.tierCounts(C, cfg);
  assert.deepEqual(r.tiers, { Bronze: 2, Silver: 1, Gold: 1 }); assert.equal(r.blankTier, 1); assert.equal(r.total, 5);
});
test('new members this week / month', () => { assert.equal(M.newMembers(C, NOW, 7), 1); assert.equal(M.newMembers(C, NOW, 30), 2); });
test('points outstanding and their value', () => {
  assert.deepEqual(M.pointsOutstanding(C, cfg), { points: 37701 + 2500 + 500 + 3000 + 500, value: 44201 });
  assert.equal(M.pointsOutstanding(C, { ...cfg, pointValue: 0.5 }).value, 22100.5);
  assert.equal(M.pointsOutstanding([{ points: -50 }, { points: null }, { points: '120' }], cfg).points, 120);
});
test('close to the next tier: within 10% of the threshold', () => {
  const r = M.closeToNextTier(C, cfg);
  assert.deepEqual(r.map((x) => [x.id, x.next, x.gap]), [['c2', 'Gold', 15000], ['c3', 'Silver', 18000]]);
});
test('2,500+ points and no reward code', () => { assert.deepEqual(M.redeemable(C, cfg).map((x) => x.id), ['c1', 'c2']); });
test('data health: blanks and paid orders missing the awarded tag', () => {
  const h = M.dataHealth(C, O, cfg, NOW);
  assert.equal(h.blankPoints, 1); assert.equal(h.blankTier, 2); assert.equal(h.pointsButNoTier, 1);
  assert.equal(h.paidOrders30, 4); assert.equal(h.paidMissingAwardTag30, 2);     // o2, o3 (o6 cancelled, o7 older, o8 refunded, guests skipped)
});
test('revenue: members vs non-members, cancelled and refunded left out', () => {
  const r = M.revenueSplit(O, C, NOW, 30);
  assert.deepEqual(r.member, { revenue: 10000 + 3400 + 500, orders: 3 }); assert.deepEqual(r.nonMember, { revenue: 5000 + 9000 + 2000, orders: 3 });
});
test('points flow (estimate): earn rate by tier + welcome, redeemed from reward codes', () => {
  const f = M.pointsFlow(O, C, cfg, NOW, 30);
  assert.equal(f.earnedOnOrders, Math.floor(9500 * 0.10) + Math.floor(3400 * 0.03) + Math.floor(3000 * 0.03)); assert.equal(f.welcome, 2 * 500);
  assert.equal(f.redeemed, 2500); assert.equal(f.estimate, true);
});
test('bundle revenue: bundle-type lines only, 30 days, cancelled/refunded out', () => {
  const b = M.bundleStats(O, L, cfg, NOW, 30);
  assert.equal(b.revenue, 14500); assert.equal(b.orders, 2); assert.equal(b.units, 3);
  assert.deepEqual(b.top.map((x) => [x.title, x.revenue, x.units]), [['Godzilla Beast Mode', 9500, 1], ['Bar Box 6', 5000, 2]]);
  assert.equal(b.trend.length, 30); assert.equal(b.trend.reduce((s, d) => s + d.revenue, 0), 14500);
  assert.equal(b.allTime.revenue, 22500);
});
test('bundle revenue: grouped component lines count once per bundle; other groups and plain lines do not', () => {
  const lines = [
    { order_id: 'o1', product_id: 'a', product_type: 'Creatine', title: 'Creatine', qty: 2, amount: 13908.44, group_id: 'g1', group_product_id: 'B1', group_title: 'Creatine Starter Pack', group_qty: 2 },
    { order_id: 'o1', product_id: 'b', product_type: 'Accessories', title: 'Shaker', qty: 2, amount: 4089.56, group_id: 'g1', group_product_id: 'B1', group_title: 'Creatine Starter Pack', group_qty: 2 },
    { order_id: 'o2', product_id: 'a', product_type: 'Creatine', title: 'Creatine', qty: 1, amount: 6954.22, group_id: 'g2', group_product_id: 'B1', group_title: 'Creatine Starter Pack', group_qty: 1 },
    { order_id: 'o2', product_id: 'c', product_type: 'Protein', title: 'Whey', qty: 1, amount: 9999, group_id: 'g3', group_product_id: 'NOT-A-BUNDLE', group_title: 'Other app group', group_qty: 1 },
    { order_id: 'o3', product_id: 'a', product_type: 'Creatine', title: 'Creatine', qty: 1, amount: 8499 },
    { order_id: 'o6', product_id: 'a', product_type: 'Creatine', title: 'Creatine', qty: 1, amount: 5000, group_id: 'g4', group_product_id: 'B1', group_title: 'Creatine Starter Pack', group_qty: 1 },   // cancelled order
  ];
  const b = M.bundleStats(O, lines, cfg, NOW, 30, ['B1']);
  assert.equal(b.revenue, 24952.22); assert.equal(b.orders, 2); assert.equal(b.units, 3);
  assert.deepEqual(b.top, [{ title: 'Creatine Starter Pack', revenue: 24952.22, units: 3 }]);
});
test('promo usage per Sunday code', () => {
  assert.deepEqual(M.promoUsage(O, cfg), [{ code: 'SUN15-15NOV', day: M.localDay(ago(5), cfg), orders: 1, discount: 600, revenue: 3400 }]);
});
test('pickup orders: open ones only, overdue after the hold', () => {
  const p = M.pickupOrders(O, cfg, NOW);
  assert.deepEqual(p.map((x) => [x.id, x.status, x.overdue]), [['o5', 'Ready for pickup', true], ['o9', 'Not marked ready', false]]);
});
test('local day uses the store time zone', () => { assert.equal(M.localDay('2026-11-14T18:30:00Z', cfg), '2026-11-15'); assert.equal(M.localDay('2026-11-14T18:29:59Z', cfg), '2026-11-14'); });
test('no store-specific values in defaults', () => { const d = M.withDefaults({}); assert.deepEqual(d.tiers, []); assert.equal(d.promoCodePrefix, ''); assert.equal(M.promoUsage(O, d).length, 0); });
