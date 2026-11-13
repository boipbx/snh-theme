// Click & collect: pure decision logic (no I/O). One call per order, returns the actions to take.
//
// Rules (13 Nov 2026 brief):
// - Only orders created after PICKUP_LAUNCH_AT whose fulfillment orders have deliveryMethod.methodType = PICK_UP.
// - The 48 h hold clock starts when staff mark the order "Ready for pickup" (a fulfillment with displayStatus
//   READY_FOR_PICKUP; its createdAt). No ready mark yet = no clock (the order is listed in the digest after 72 h).
// - Tag "pickup-hold" = skip forever (manual extension by staff).
// - Unpaid (PENDING / AUTHORIZED / PARTIALLY_PAID): reminder at 24 h, auto-cancel at 48 h if still not picked up.
// - Paid: never auto-cancelled; at 48 h tag "pickup-overdue", send the reminder again, list in the daily digest.
// - Non-pickup orders paid with the pay-at-store method: tag "check-payment", list in the digest, never cancel.
// - Idempotent: tags pickup-reminded-24h, pickup-overdue, auto-cancelled-pickup, check-payment prevent repeats.

export const HOUR = 3600 * 1000;
export const TAGS = {
  hold: 'pickup-hold',
  reminded: 'pickup-reminded-24h',
  overdue: 'pickup-overdue',
  cancelled: 'auto-cancelled-pickup',
  checkPayment: 'check-payment',
};
const UNPAID = new Set(['PENDING', 'AUTHORIZED', 'PARTIALLY_PAID', 'EXPIRED']);

export function isPickup(order) {
  return (order.fulfillmentOrders || []).some((fo) => fo.deliveryMethod?.methodType === 'PICK_UP');
}

export function readyAt(order) {
  const t = (order.fulfillments || [])
    .filter((f) => f.displayStatus === 'READY_FOR_PICKUP' || f.displayStatus === 'PICKED_UP')
    .map((f) => Date.parse(f.createdAt))
    .filter((x) => !Number.isNaN(x));
  return t.length ? Math.min(...t) : null;
}

export function pickedUp(order) {
  return (order.fulfillments || []).some((f) => f.displayStatus === 'PICKED_UP') || order.displayFulfillmentStatus === 'FULFILLED';
}

export function isPayAtStore(order, payAtStoreName) {
  const n = (payAtStoreName || 'pay at the store').toLowerCase();
  return (order.paymentGatewayNames || []).some((g) => (g || '').toLowerCase().includes(n));
}

/**
 * @returns {{skip?: string, actions: Array<{type: string, [k: string]: any}>}}
 *   action types: 'reminder' (send Klaviyo "Pickup Reminder"), 'tag' (add tag), 'cancel' (orderCancel),
 *   'digest-overdue', 'digest-cancelled', 'digest-check-payment', 'digest-not-ready'
 */
export function decide(order, nowMs, launchAtMs, opts = {}) {
  const tags = new Set((order.tags || []).map((t) => t.toLowerCase()));
  const created = Date.parse(order.createdAt);
  if (!(created > launchAtMs)) return { skip: 'before launch', actions: [] };
  if (order.cancelledAt) return { skip: 'already cancelled', actions: [] };
  if (order.closed && !isPickup(order)) return { skip: 'closed', actions: [] };

  if (!isPickup(order)) {
    if (isPayAtStore(order, opts.payAtStoreName) && !tags.has(TAGS.checkPayment)) {
      return { actions: [{ type: 'tag', tag: TAGS.checkPayment }, { type: 'digest-check-payment' }] };
    }
    return { skip: 'not a pickup order', actions: [] };
  }
  if (tags.has(TAGS.hold)) return { skip: 'pickup-hold tag', actions: [] };
  if (tags.has(TAGS.cancelled)) return { skip: 'already auto-cancelled', actions: [] };
  if (pickedUp(order)) return { skip: 'picked up', actions: [] };

  const ready = readyAt(order);
  if (ready == null) {
    return (nowMs - created) >= 72 * HOUR ? { actions: [{ type: 'digest-not-ready' }] } : { skip: 'not marked ready yet', actions: [] };
  }
  const age = nowMs - ready;
  const holdUntil = ready + 48 * HOUR;
  const paid = !UNPAID.has(order.displayFinancialStatus);
  const actions = [];

  if (!paid) {
    if (age >= 48 * HOUR) {
      actions.push({ type: 'cancel', holdUntil });
      actions.push({ type: 'tag', tag: TAGS.cancelled });
      actions.push({ type: 'digest-cancelled' });
    } else if (age >= 24 * HOUR && !tags.has(TAGS.reminded)) {
      actions.push({ type: 'reminder', holdUntil });
      actions.push({ type: 'tag', tag: TAGS.reminded });
    }
  } else if (age >= 48 * HOUR) {
    if (!tags.has(TAGS.overdue)) {
      actions.push({ type: 'tag', tag: TAGS.overdue });
      actions.push({ type: 'reminder', holdUntil });
    }
    actions.push({ type: 'digest-overdue' });
  } else if (age >= 24 * HOUR && !tags.has(TAGS.reminded)) {
    actions.push({ type: 'reminder', holdUntil });
    actions.push({ type: 'tag', tag: TAGS.reminded });
  }
  return actions.length ? { actions } : { skip: 'within hold', actions };
}

export function colomboTime(ms) {
  return new Date(ms).toLocaleString('en-GB', { timeZone: 'Asia/Colombo', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
}
