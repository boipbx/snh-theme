#!/usr/bin/env node
// Builds assets/snh-bundle-map.js (READ-ONLY Admin API; writes only this theme asset): for every ACTIVE bundle product,
// its variants and each variant's components (component variant id + quantity), plus a short title, handle and image
// for each component variant. The basket bundle upsell (assets/snh-cart.js) reads it; prices, compare-at prices and
// availability are always read live from /products/<handle>.js in the browser, never from this file.
// Usage (env: SHOPIFY_STORE, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET): node scripts/build-bundle-map.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clean = (v) => String(v || '').replace(/[<>]/g, '');
const S = clean(process.env.SHOPIFY_STORE), ID = clean(process.env.SHOPIFY_CLIENT_ID), SEC = clean(process.env.SHOPIFY_CLIENT_SECRET);
const T = (await (await fetch(`https://${S}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'client_credentials', client_id: ID, client_secret: SEC }) })).json()).access_token;
async function gql(query, variables) { for (let i = 0; i < 5; i++) { const r = await fetch(`https://${S}/admin/api/2026-10/graphql.json`, { method: 'POST', headers: { 'X-Shopify-Access-Token': T, 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) }); if (r.status === 429) { await new Promise((x) => setTimeout(x, 3000)); continue; } const j = await r.json(); if (j.errors) { if (JSON.stringify(j.errors).includes('THROTTLED')) { await new Promise((x) => setTimeout(x, 3000)); continue; } throw new Error(JSON.stringify(j.errors)); } return j.data; } throw new Error('API unavailable'); }
const bundles = []; let c = null;
do {
  const d = (await gql(`query($c:String){products(first:4,after:$c,query:"status:active AND (product_type:Bundle OR tag:bundle)"){pageInfo{hasNextPage endCursor}
    nodes{id handle title status variants(first:50){nodes{id title productVariantComponents(first:10){nodes{quantity productVariant{id title image{url} product{id handle title vendor status featuredMedia{preview{image{url}}}}}}}}}}}}`, { c })).products;
  bundles.push(...d.nodes); c = d.pageInfo.hasNextPage ? d.pageInfo.endCursor : null;
} while (c);
const num = (gid) => Number(String(gid).split('/').pop());
const short = (t, v) => { const re = new RegExp('^' + String(v || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '( NUTRITION)?\\s+', 'i'); return String(t).replace(re, '') || t; };
const map = { b: {}, c: {} };
let nv = 0;
for (const b of bundles) {
  if (b.status !== 'ACTIVE') continue;
  const vs = [];
  for (const v of b.variants.nodes) {
    const comps = v.productVariantComponents.nodes.filter((n) => n.productVariant && n.productVariant.product && n.productVariant.product.status === 'ACTIVE');
    if (!comps.length || comps.length !== v.productVariantComponents.nodes.length) continue;   // a deleted / draft component: no clean swap
    vs.push([num(v.id), comps.map((n) => [num(n.productVariant.id), n.quantity])]);
    for (const n of comps) { const pv = n.productVariant, pr = pv.product; map.c[num(pv.id)] = [num(pr.id), short(pr.title, pr.vendor), pr.handle, (pv.image && pv.image.url) || (pr.featuredMedia && pr.featuredMedia.preview && pr.featuredMedia.preview.image && pr.featuredMedia.preview.image.url) || '', pv.title === 'Default Title' ? '' : pv.title]; }
    nv++;
  }
  if (vs.length) map.b[num(b.id)] = [b.handle, b.title, vs];
}
const out = `/* SNH bundle map, generated ${new Date().toISOString().slice(0, 10)} by scripts/build-bundle-map.mjs (read-only Admin API). Components only;
   prices / availability come live from /products/<handle>.js. b: bundleId → [handle, title, [[variantId, [[componentVariantId, qty]…]]…]]
   c: componentVariantId → [productId, short title, handle, image, variant title] */
window.SNHBundleMap = ${JSON.stringify(map)};
`;
fs.writeFileSync(path.join(ROOT, 'assets/snh-bundle-map.js'), out);
console.log(`bundles ${Object.keys(map.b).length}, bundle variants ${nv}, component variants ${Object.keys(map.c).length}, ${(out.length / 1024).toFixed(1)} KB`);
