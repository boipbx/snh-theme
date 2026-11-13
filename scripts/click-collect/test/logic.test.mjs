// node --test scripts/click-collect/test/logic.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { decide, HOUR } from '../src/logic.mjs';

const LAUNCH = Date.parse('2026-11-13T00:00:00Z');
const NOW = Date.parse('2026-11-20T12:00:00Z');
const pickupFO = [{ deliveryMethod: { methodType: 'PICK_UP' } }];
const shipFO = [{ deliveryMethod: { methodType: 'SHIPPING' } }];
function order({ readyHoursAgo, fin = 'PENDING', tags = [], fos = pickupFO, created = '2026-11-18T00:00:00Z', gateways = [] }) {
  return {
    createdAt: created, tags, fulfillmentOrders: fos, displayFinancialStatus: fin, paymentGatewayNames: gateways,
    fulfillments: readyHoursAgo == null ? [] : [{ displayStatus: 'READY_FOR_PICKUP', createdAt: new Date(NOW - readyHoursAgo * HOUR).toISOString() }],
  };
}
const types = (r) => r.actions.map((a) => a.type + (a.tag ? ':' + a.tag : ''));

test('pickup unpaid 23h: nothing yet', () => assert.deepEqual(decide(order({ readyHoursAgo: 23 }), NOW, LAUNCH).actions, []));
test('pickup unpaid 25h: reminder once', () => assert.deepEqual(types(decide(order({ readyHoursAgo: 25 }), NOW, LAUNCH)), ['reminder', 'tag:pickup-reminded-24h']));
test('pickup unpaid 25h already reminded: nothing', () => assert.deepEqual(decide(order({ readyHoursAgo: 25, tags: ['pickup-reminded-24h'] }), NOW, LAUNCH).actions, []));
test('pickup unpaid 49h: cancel + tag + digest', () => assert.deepEqual(types(decide(order({ readyHoursAgo: 49, tags: ['pickup-reminded-24h'] }), NOW, LAUNCH)), ['cancel', 'tag:auto-cancelled-pickup', 'digest-cancelled']));
test('pickup PAID 49h: never cancelled; overdue tag + reminder + digest', () => {
  const r = types(decide(order({ readyHoursAgo: 49, fin: 'PAID' }), NOW, LAUNCH));
  assert.ok(!r.includes('cancel')); assert.deepEqual(r, ['tag:pickup-overdue', 'reminder', 'digest-overdue']);
});
test('pickup PAID 49h already overdue: digest only', () => assert.deepEqual(types(decide(order({ readyHoursAgo: 49, fin: 'PAID', tags: ['pickup-overdue'] }), NOW, LAUNCH)), ['digest-overdue']));
test('delivery order: ignored', () => assert.equal(decide(order({ readyHoursAgo: 49, fos: shipFO }), NOW, LAUNCH).skip, 'not a pickup order'));
test('delivery order paid with pay-at-store: check-payment, never cancel', () => assert.deepEqual(types(decide(order({ fos: shipFO, gateways: ['Pay at the store when you collect'] }), NOW, LAUNCH)), ['tag:check-payment', 'digest-check-payment']));
test('old order (before launch): ignored', () => assert.equal(decide(order({ readyHoursAgo: 200, created: '2026-11-01T00:00:00Z' }), NOW, LAUNCH).skip, 'before launch'));
test('pickup-hold tag: skipped forever', () => assert.equal(decide(order({ readyHoursAgo: 100, tags: ['pickup-hold'] }), NOW, LAUNCH).skip, 'pickup-hold tag'));
test('not marked ready: no clock; listed after 72h', () => {
  assert.equal(decide(order({ created: '2026-11-19T00:00:00Z' }), NOW, LAUNCH).skip, 'not marked ready yet');
  assert.deepEqual(types(decide(order({ created: '2026-11-16T00:00:00Z' }), NOW, LAUNCH)), ['digest-not-ready']);
});
test('picked up: ignored', () => {
  const o = order({ readyHoursAgo: 60 }); o.fulfillments.push({ displayStatus: 'PICKED_UP', createdAt: new Date(NOW).toISOString() });
  assert.equal(decide(o, NOW, LAUNCH).skip, 'picked up');
});
