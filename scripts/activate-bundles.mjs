#!/usr/bin/env node
// Activate the new bundles (tag "bundles-nov26") once they are ready.
// A draft bundle is activated only when ALL of these hold:
//   1. it has at least 1 image,
//   2. every component product has stock (> 0 available) at 1 or more locations,
//   3. compare-at > price on every variant.
// Prints a table of what was activated and what was skipped and why.
//
// Usage (env: SHOPIFY_STORE, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET):
//   node scripts/activate-bundles.mjs --dry-run   # report only, no writes
//   node scripts/activate-bundles.mjs             # activate the ready ones
// The token is fetched with client credentials and never printed.

const API = '2026-10';
const TAG = 'bundles-nov26';
const DRY = process.argv.includes('--dry-run');
const { SHOPIFY_STORE: S, SHOPIFY_CLIENT_ID: ID, SHOPIFY_CLIENT_SECRET: SECRET } = process.env;
if (!S || !ID || !SECRET) { console.error('Missing SHOPIFY_STORE / SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET'); process.exit(1); }

async function token() {
  const r = await fetch(`https://${S}/admin/oauth/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: ID, client_secret: SECRET }),
  });
  if (!r.ok) throw new Error(`token request failed: ${r.status}`);
  return (await r.json()).access_token;
}
let T;
async function gql(query, variables = {}) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(`https://${S}/admin/api/${API}/graphql.json`, {
      method: 'POST', headers: { 'X-Shopify-Access-Token': T, 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }),
    });
    if (r.status === 429 || r.status >= 500) { await new Promise((res) => setTimeout(res, 2000 * (i + 1))); continue; }
    const j = await r.json();
    if (j.errors) throw new Error(JSON.stringify(j.errors));
    return j.data;
  }
  throw new Error('Shopify API unavailable');
}

const Q_LIST = `query($c:String){products(first:50, after:$c, query:"tag:${TAG} product_type:Bundle status:draft"){
  pageInfo{hasNextPage endCursor}
  nodes{id title handle status mediaCount{count}
    variants(first:100){nodes{price compareAtPrice}}
    bundleComponents(first:20){nodes{componentProduct{id title totalInventory}}}}}}`;

const ACTIVATE = `mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{id status} userErrors{field message}}}`;

(async () => {
  T = await token();
  const rows = [];
  let cursor = null;
  do {
    const d = await gql(Q_LIST, { c: cursor });
    for (const p of d.products.nodes) {
      const why = [];
      if ((p.mediaCount?.count || 0) < 1) why.push('no image');
      for (const c of p.bundleComponents.nodes) {
        // totalInventory = available stock summed over all locations
        if ((c.componentProduct.totalInventory || 0) <= 0) why.push(`no stock: ${c.componentProduct.title}`);
      }
      const badPrice = p.variants.nodes.some((v) => !v.compareAtPrice || Number(v.compareAtPrice) <= Number(v.price));
      if (badPrice) why.push('compare-at not above price');
      let result = why.length ? `skipped: ${why.join('; ')}` : (DRY ? 'ready (dry run, not activated)' : 'ACTIVATED');
      if (!why.length && !DRY) {
        const u = await gql(ACTIVATE, { p: { id: p.id, status: 'ACTIVE' } });
        const errs = u.productUpdate.userErrors;
        if (errs.length) result = `error: ${errs.map((e) => e.message).join('; ')}`;
      }
      rows.push({ bundle: p.title, handle: p.handle, images: p.mediaCount?.count || 0, result });
    }
    cursor = d.products.pageInfo.hasNextPage ? d.products.pageInfo.endCursor : null;
  } while (cursor);
  console.table(rows);
  const done = rows.filter((r) => r.result === 'ACTIVATED').length;
  console.log(`${DRY ? 'Dry run: ' : ''}${done} activated, ${rows.length - done} not activated, ${rows.length} draft bundles checked.`);
  // 14 Nov: refresh "Save with a bundle" (custom.in_bundles on component products) so new bundles show at once
  console.log('\nSyncing bundle links (custom.in_bundles)…');
  const { syncBundleLinks } = await import('./sync-bundle-links.mjs');
  await syncBundleLinks({ dry: DRY });
})().catch((e) => { console.error(String(e.message || e).replace(/shpat_[A-Za-z0-9]+/g, '[redacted]')); process.exit(1); });
