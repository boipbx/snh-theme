// Shopify Admin GraphQL, READ-ONLY. The only mutation used is bulkOperationRunQuery, which starts a data export and
// changes nothing in the store. Token: client-credentials grant for the shop (never logged).
const tokens = new Map();
export async function adminToken(env, shop) {
  const hit = tokens.get(shop); if (hit && hit.exp > Date.now()) return hit.token;
  const r = await fetch(`https://${shop}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: env.SHOPIFY_CLIENT_ID, client_secret: env.SHOPIFY_CLIENT_SECRET }) });
  if (!r.ok) throw new Error(`token request failed for ${shop}: ${r.status}`);
  const j = await r.json(); tokens.set(shop, { token: j.access_token, exp: Date.now() + Math.min((j.expires_in || 3600) - 300, 3600) * 1000 }); return j.access_token;
}
export async function gql(env, shop, query, variables = {}) {
  const token = await adminToken(env, shop);
  for (let i = 0; i < 4; i++) {
    const r = await fetch(`https://${shop}/admin/api/${env.API_VERSION || '2026-10'}/graphql.json`, { method: 'POST', headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) });
    if (r.status === 429 || r.status >= 500) { await new Promise((res) => setTimeout(res, 1500 * (i + 1))); continue; }
    const j = await r.json(); if (j.errors) throw new Error('Shopify: ' + JSON.stringify(j.errors).slice(0, 300)); return j.data;
  }
  throw new Error('Shopify API unavailable');
}
const MF = (alias, key) => `${alias}:metafield(namespace:"custom",key:"${key}"){value}`;
export const CUSTOMERS_QUERY = `{customers{edges{node{id displayName tags createdAt numberOfOrders amountSpent{amount} lastOrder{createdAt}
  ${MF('pts', 'loyalty_points')} ${MF('tier', 'loyalty_tier')} ${MF('spend', 'annual_spend')} ${MF('code', 'last_reward_code')}}}}}`;
export const ordersQuery = (sinceIso) => `{orders(query:"created_at:>=${sinceIso}"){edges{node{id name createdAt cancelledAt tags customer{id}
  currentTotalPriceSet{shopMoney{amount}} currentSubtotalPriceSet{shopMoney{amount}} currentTotalDiscountsSet{shopMoney{amount}}
  displayFinancialStatus displayFulfillmentStatus discountCodes fulfillments{displayStatus createdAt}
  lineItems{edges{node{id title quantity discountedTotalSet{shopMoney{amount}} product{id productType} lineItemGroup{id title quantity productId}}}}
  fulfillmentOrders{edges{node{id deliveryMethod{methodType}}}}}}}}`;
export async function startBulk(env, shop, query) {
  const d = await gql(env, shop, `mutation($q:String!){bulkOperationRunQuery(query:$q){bulkOperation{id status} userErrors{field message}}}`, { q: query });
  const e = d.bulkOperationRunQuery.userErrors; if (e.length) throw new Error('bulk start: ' + e.map((x) => x.message).join('; '));
  return d.bulkOperationRunQuery.bulkOperation.id;
}
export async function bulkStatus(env, shop, id) {
  const d = await gql(env, shop, `query($id:ID!){node(id:$id){... on BulkOperation{id status errorCode objectCount url}}}`, { id }); return d.node;
}
// JSONL line → row(s). Children carry __parentId.
const money = (x) => (x && x.shopMoney ? Number(x.shopMoney.amount) : null);
const intOrNull = (v) => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Math.round(Number(v)));
export function customerRow(n) {
  return { id: n.id, name: n.displayName || '', tags: (n.tags || []).join(','), points: intOrNull(n.pts && n.pts.value), tier: (n.tier && n.tier.value) || '',
    annual_spend: n.spend && n.spend.value !== '' && n.spend.value != null ? Number(n.spend.value) : null, last_reward_code: (n.code && n.code.value) || '',
    created_at: n.createdAt, orders_count: Number(n.numberOfOrders || 0), amount_spent: n.amountSpent ? Number(n.amountSpent.amount) : 0, last_order_at: n.lastOrder ? n.lastOrder.createdAt : null };
}
export function orderRow(n) {
  const f = n.fulfillments || []; const ready = f.filter((x) => x.displayStatus === 'READY_FOR_PICKUP' || x.displayStatus === 'PICKED_UP').map((x) => x.createdAt).sort()[0] || null;
  return { id: n.id, name: n.name, created_at: n.createdAt, cancelled: n.cancelledAt ? 1 : 0, customer_id: n.customer ? n.customer.id : null, total: money(n.currentTotalPriceSet), subtotal: money(n.currentSubtotalPriceSet),
    discount_total: money(n.currentTotalDiscountsSet), financial: n.displayFinancialStatus, fulfillment: n.displayFulfillmentStatus, delivery: '', ready_at: ready,
    pickup_status: f.some((x) => x.displayStatus === 'PICKED_UP') ? 'PICKED_UP' : ready ? 'READY_FOR_PICKUP' : '', codes: (n.discountCodes || []).join(','), tags: (n.tags || []).join(',') };
}
export function lineRow(n) {
  return { line_id: n.id, order_id: n.__parentId, product_id: n.product ? n.product.id : null, product_type: n.product ? n.product.productType : '', title: n.title, qty: Number(n.quantity || 0),
    amount: n.discountedTotalSet ? Number(n.discountedTotalSet.shopMoney.amount) : 0,
    group_id: n.lineItemGroup ? n.lineItemGroup.id : null, group_product_id: n.lineItemGroup ? n.lineItemGroup.productId : null, group_title: n.lineItemGroup ? n.lineItemGroup.title : null, group_qty: n.lineItemGroup ? Number(n.lineItemGroup.quantity || 1) : null };
}
// every product of the bundle type (any status), so grouped component lines can be recognised as a bundle sale
export async function bundleProducts(env, shop, type) {
  const out = []; let c = null;
  do { const d = await gql(env, shop, `query($c:String,$q:String!){products(first:250,after:$c,query:$q){pageInfo{hasNextPage endCursor} nodes{id title productType}}}`, { c, q: `product_type:"${String(type).replace(/"/g, '')}"` });
    out.push(...d.products.nodes.filter((p) => String(p.productType).toLowerCase() === String(type).toLowerCase())); c = d.products.pageInfo.hasNextPage ? d.products.pageInfo.endCursor : null; } while (c);
  return out;
}
