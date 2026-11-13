// Click & collect run: fetch candidate orders, decide, act (or log only when DRY_RUN), send the daily digest.
// Works in Node 18+ and Cloudflare Workers (fetch only). Never logs tokens or keys.
import { decide, colomboTime, TAGS, isPickup } from './logic.mjs';

const API = '2026-10';

export async function shopifyToken(env) {
  const r = await fetch(`https://${env.SHOPIFY_STORE}/admin/oauth/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: env.SHOPIFY_CLIENT_ID, client_secret: env.SHOPIFY_CLIENT_SECRET }),
  });
  if (!r.ok) throw new Error(`Shopify token request failed: ${r.status}`);
  return (await r.json()).access_token;
}

function client(env, token) {
  return async function gql(query, variables = {}) {
    for (let i = 0; i < 4; i++) {
      const r = await fetch(`https://${env.SHOPIFY_STORE}/admin/api/${API}/graphql.json`, {
        method: 'POST', headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }),
      });
      if (r.status === 429 || r.status >= 500) { await new Promise((res) => setTimeout(res, 1500 * (i + 1))); continue; }
      const j = await r.json();
      if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 400));
      return j.data;
    }
    throw new Error('Shopify API unavailable');
  };
}

const ORDERS = `query($q:String!,$c:String){orders(first:50, after:$c, query:$q, sortKey:CREATED_AT){
  pageInfo{hasNextPage endCursor}
  nodes{id name createdAt cancelledAt closed tags email statusPageUrl displayFinancialStatus displayFulfillmentStatus paymentGatewayNames
    customer{email firstName}
    fulfillmentOrders(first:5){nodes{status deliveryMethod{methodType} assignedLocation{name location{id address{address1 city}}}}}
    fulfillments(first:10){displayStatus createdAt}}}}`;

export async function klaviyoEvent(env, metric, email, properties, dry) {
  if (dry) return { dry: true };
  const r = await fetch('https://a.klaviyo.com/api/events/', {
    method: 'POST',
    headers: { Authorization: `Klaviyo-API-Key ${env.KLAVIYO_KEY}`, revision: '2024-10-15', 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ data: { type: 'event', attributes: {
      properties, metric: { data: { type: 'metric', attributes: { name: metric } } },
      profile: { data: { type: 'profile', attributes: { email } } },
    } } }),
  });
  if (!r.ok) throw new Error(`Klaviyo ${metric} failed: ${r.status}`);
  return { ok: true };
}

export async function run(env, { now = Date.now(), log = console.log } = {}) {
  const dry = String(env.DRY_RUN ?? 'true') !== 'false';
  const launch = Date.parse(env.PICKUP_LAUNCH_AT);
  if (Number.isNaN(launch)) throw new Error('PICKUP_LAUNCH_AT is not set');
  const gql = client(env, await shopifyToken(env));
  const shop = (await gql('{shop{email name}}')).shop;
  const since = new Date(Math.max(launch, now - 14 * 24 * 3600 * 1000)).toISOString();
  const q = `created_at:>'${since}' status:any`;
  const digest = { overdue: [], cancelled: [], checkPayment: [], notReady: [] };
  const summary = { scanned: 0, pickup: 0, acted: 0, dry };
  let cursor = null;
  do {
    const d = await gql(ORDERS, { q, c: cursor });
    for (const o of d.orders.nodes) {
      summary.scanned++;
      o.fulfillmentOrders = o.fulfillmentOrders.nodes;
      if (isPickup(o)) summary.pickup++;
      const { skip, actions } = decide(o, now, launch, { payAtStoreName: env.PAY_AT_STORE_NAME });
      if (!actions.length) continue;
      const fo = o.fulfillmentOrders.find((f) => f.deliveryMethod?.methodType === 'PICK_UP') || {};
      const loc = fo.assignedLocation || {};
      const addr = [loc.location?.address?.address1, loc.location?.address?.city].filter(Boolean).join(', ');
      for (const a of actions) {
        const line = `${dry ? '[DRY_RUN] ' : ''}${o.name}: ${a.type}${a.tag ? ' ' + a.tag : ''}`;
        try {
          if (a.type === 'tag') {
            if (!dry) await gql(`mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}`, { id: o.id, t: [a.tag] });
          } else if (a.type === 'reminder') {
            const email = o.email || o.customer?.email;
            if (email) await klaviyoEvent(env, 'Pickup Reminder', email, {
              order_name: o.name, first_name: o.customer?.firstName || '', location_name: loc.name || 'SNH', location_address: addr,
              hold_until: colomboTime(a.holdUntil), order_status_url: o.statusPageUrl,
            }, dry);
          } else if (a.type === 'cancel') {
            if (!dry) {
              const c = await gql(`mutation($id:ID!){orderCancel(orderId:$id, restock:true, notifyCustomer:true, reason:CUSTOMER, refundMethod:{originalPaymentMethodsRefund:true}, staffNote:"Auto-cancelled: not collected within 48h"){userErrors{field message}}}`, { id: o.id });
              const errs = c.orderCancel.userErrors;
              if (errs.length) {
                // do NOT tag auto-cancelled-pickup: the next run retries, and staff see it in the digest
                log(`${o.name}: cancel FAILED ${JSON.stringify(errs)}`);
                digest.cancelled.push(`${o.name} — cancel failed, please cancel by hand (${errs.map((e) => e.message).join('; ')})`);
                break;
              }
            }
          } else if (a.type === 'digest-overdue') digest.overdue.push(`${o.name} — ${loc.name || ''}, paid, ready since ${colomboTime(Date.parse(o.fulfillments.find((f) => f.displayStatus === 'READY_FOR_PICKUP')?.createdAt || o.createdAt))}`);
          else if (a.type === 'digest-cancelled') digest.cancelled.push(`${o.name} — ${loc.name || ''}, unpaid, not collected in 48h`);
          else if (a.type === 'digest-check-payment') digest.checkPayment.push(`${o.name} — delivery order paid with the pay-at-store method`);
          else if (a.type === 'digest-not-ready') digest.notReady.push(`${o.name} — ${loc.name || ''}, pickup order not marked ready after 72h`);
          log(line); summary.acted++;
        } catch (e) { log(`${o.name}: ${a.type} error ${String(e.message || e).slice(0, 200)}`); }
      }
    }
    cursor = d.orders.pageInfo.hasNextPage ? d.orders.pageInfo.endCursor : null;
  } while (cursor);

  // Daily digest at 09:00 Sri Lanka time (03:30 UTC): the run that falls in 03:30–03:59 UTC sends it.
  const t = new Date(now);
  const isDigestRun = env.FORCE_DIGEST === 'true' || (t.getUTCHours() === 3 && t.getUTCMinutes() >= 30);
  if (isDigestRun) {
    const props = {
      date: colomboTime(now), overdue_paid: digest.overdue, auto_cancelled: digest.cancelled,
      check_payment: digest.checkPayment, not_marked_ready: digest.notReady,
      overdue_count: digest.overdue.length, cancelled_count: digest.cancelled.length,
    };
    await klaviyoEvent(env, 'Pickup Ops Digest', env.OPS_EMAIL || shop.email, props, dry);
    log(`${dry ? '[DRY_RUN] ' : ''}digest → ${env.OPS_EMAIL || shop.email}: ${digest.overdue.length} overdue, ${digest.cancelled.length} cancelled, ${digest.checkPayment.length} check-payment, ${digest.notReady.length} not ready`);
  }
  log(`summary ${JSON.stringify(summary)}`);
  return { summary, digest };
}
