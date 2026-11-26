#!/usr/bin/env node
// "Save with a bundle": write custom.in_bundles (list.product_reference) on every component product of an ACTIVE bundle.
// Value = the active bundles that contain the product, ordered by the bundle's saving (compare-at − price), biggest
// first. Products that were linked before but are no longer in any active bundle get an empty list (the theme hides the
// row). Drafts never appear.
// 26 Nov: a bundle is any active product with productType "Bundle", the tag "bundle", or a variant that requires
// components. Its components are read from every source, merged:
//   1. bundleComponents (bundles owned by the Shopify Bundles app),
//   2. each variant's productVariantComponents (bundles built by SNH Ops / the API: these list the component variants),
//   3. fallback when a component points at a deleted variant (or nothing is listed): active products whose title is
//      named in the bundle's description or in a component variant's title (whole title, case-insensitive, the brand
//      prefix and "GO" optional, so "SiS GO Hydro Tablets" finds "SiS Hydro Tablets").
//
// Before writing it backs up every current value to docs/golive/backup-bundle-links/<timestamp>.json and appends each
// write to docs/golive/WRITE-LOG.md. Unchanged values are skipped.
//
// Usage (env: SHOPIFY_STORE, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET):
//   node scripts/sync-bundle-links.mjs --dry-run
//   node scripts/sync-bundle-links.mjs
// Also called at the end of scripts/activate-bundles.mjs. The token is never printed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API = '2026-10';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOG = path.join(ROOT, 'docs/golive/WRITE-LOG.md');
const { SHOPIFY_STORE: S, SHOPIFY_CLIENT_ID: ID, SHOPIFY_CLIENT_SECRET: SECRET } = process.env;

let T;
async function token() {
  const r = await fetch(`https://${S}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: ID, client_secret: SECRET }) });
  if (!r.ok) throw new Error(`token request failed: ${r.status}`);
  return (await r.json()).access_token;
}
async function gql(query, variables = {}) {
  for (let i = 0; i < 5; i++) {
    const r = await fetch(`https://${S}/admin/api/${API}/graphql.json`, { method: 'POST', headers: { 'X-Shopify-Access-Token': T, 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) });
    if (r.status === 429 || r.status >= 500) { await new Promise((res) => setTimeout(res, 2000 * (i + 1))); continue; }
    const j = await r.json();
    if (j.errors) { if (JSON.stringify(j.errors).includes('THROTTLED')) { await new Promise((res) => setTimeout(res, 3000)); continue; } throw new Error(JSON.stringify(j.errors)); }
    return j.data;
  }
  throw new Error('Shopify API unavailable');
}
async function all(query, key) {
  const out = []; let c = null;
  do { const d = (await gql(query, { c }))[key]; out.push(...d.nodes); c = d.pageInfo.hasNextPage ? d.pageInfo.endCursor : null; } while (c);
  return out;
}

export async function syncBundleLinks({ dry = false, log = console.log } = {}) {
  if (!S || !ID || !SECRET) throw new Error('Missing SHOPIFY_STORE / SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET');
  T = T || await token();
  const bundles = (await all(`query($c:String){products(first:25,after:$c,query:"status:active AND (product_type:Bundle OR tag:bundle)"){pageInfo{hasNextPage endCursor}
    nodes{id title handle status productType tags description variants(first:40){nodes{price compareAtPrice requiresComponents productVariantComponents(first:20){nodes{productVariant{id title product{id status}}}}}}
    bundleComponents(first:30){nodes{componentProduct{id}}}}}}`, 'products')).filter((b) => b.status === 'ACTIVE');
  // every active non-bundle product (id, title, vendor), for the description fallback
  const catalogue = (await all(`query($c:String){products(first:250,after:$c,query:"status:active"){pageInfo{hasNextPage endCursor} nodes{id title vendor productType tags}}}`, 'products'))
    .filter((p) => p.productType !== 'Bundle' && !p.tags.map((t) => t.toLowerCase()).includes('bundle'));
  const norm = (t) => ` ${String(t).toLowerCase().replace(/[^a-z0-9+ ]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
  const keys = catalogue.map((p) => {
    const t = norm(p.title), v = norm(p.vendor).trim(); const ks = new Set([t]);
    const noBrand = v && t.startsWith(' ' + v + ' ') ? ' ' + t.slice(v.length + 2) : t; ks.add(noBrand);
    for (const k of [...ks]) ks.add(k.replace(/ go /g, ' '));
    return { id: p.id, ks: [...ks].filter((k) => k.trim().split(' ').length >= 2) };
  });
  const findIn = (text) => { const T = norm(text), T2 = T.replace(/ go /g, ' '); return keys.filter((k) => k.ks.some((x) => T.includes(x) || T2.includes(x))).map((k) => k.id); };
  const map = new Map();   // component id -> [{id, title, save}]
  const sources = [];
  for (const b of bundles) {
    const isBundle = b.productType === 'Bundle' || b.tags.map((t) => t.toLowerCase()).includes('bundle') || b.variants.nodes.some((v) => v.requiresComponents);
    if (!isBundle) continue;
    const v = b.variants.nodes[0] || {}; const save = Math.max(0, Number(v.compareAtPrice || 0) - Number(v.price || 0));
    const fromApp = b.bundleComponents.nodes.map((n) => n.componentProduct && n.componentProduct.id).filter(Boolean);
    const pvc = b.variants.nodes.flatMap((x) => x.productVariantComponents.nodes);
    const fromPvc = pvc.map((n) => n.productVariant && n.productVariant.product && n.productVariant.product.status === 'ACTIVE' && n.productVariant.product.id).filter(Boolean);
    const broken = pvc.some((n) => !n.productVariant || !n.productVariant.product);
    let fromText = [];
    if (broken || (!fromApp.length && !fromPvc.length)) fromText = findIn(b.description + ' ' + pvc.map((n) => (n.productVariant && n.productVariant.title) || '').join(' '));
    const comps = [...new Set([...fromApp, ...fromPvc, ...fromText])];
    sources.push(`${b.handle}: app ${fromApp.length}, variants ${new Set(fromPvc).size}, text ${fromText.length}${broken ? ' (deleted component variant)' : ''}`);
    for (const c of comps) { if (c === b.id) continue; if (!map.has(c)) map.set(c, []); if (!map.get(c).some((x) => x.id === b.id)) map.get(c).push({ id: b.id, title: b.title, save }); }
  }
  if (process.argv.includes('--sources')) sources.forEach((x) => log('  src ' + x));
  // current values (to back up, to skip unchanged, and to clear stale ones)
  const current = await all(`query($c:String){products(first:100,after:$c){pageInfo{hasNextPage endCursor} nodes{id handle metafield(namespace:"custom",key:"in_bundles"){value}}}}`, 'products');
  const cur = new Map(current.map((p) => [p.id, p])); const had = current.filter((p) => p.metafield);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  if (!dry) {
    const dir = path.join(ROOT, 'docs/golive/backup-bundle-links'); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${stamp}.json`), JSON.stringify(had.map((p) => ({ id: p.id, handle: p.handle, in_bundles: p.metafield.value })), null, 1));
  }
  const want = new Map();
  for (const [pid, list] of map) want.set(pid, list.sort((a, b) => b.save - a.save || a.title.localeCompare(b.title)));
  for (const p of had) if (!want.has(p.id)) want.set(p.id, []);
  const rows = []; let writes = 0;
  for (const [pid, list] of want) {
    const value = JSON.stringify(list.map((x) => x.id)); const before = cur.get(pid)?.metafield?.value ?? null;
    const handle = cur.get(pid)?.handle || pid;
    if (before === value || (before === null && list.length === 0)) { rows.push([handle, list.length, 'unchanged']); continue; }
    if (dry) { rows.push([handle, list.length, 'would set: ' + list.map((x) => `${x.title} (save ${x.save})`).join(', ')]); continue; }
    const r = await gql(`mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){userErrors{field message}}}`,
      { m: [{ ownerId: pid, namespace: 'custom', key: 'in_bundles', type: 'list.product_reference', value }] });
    const ue = r.metafieldsSet.userErrors;
    if (ue.length) { rows.push([handle, list.length, 'ERROR ' + JSON.stringify(ue)]); continue; }
    writes++;
    fs.appendFileSync(LOG, `| ${new Date().toISOString().slice(0, 16).replace('T', ' ')} | metafieldsSet (sync-bundle-links) | ${pid} (${handle}) custom.in_bundles | ${before ?? '- (none)'} | ${list.length ? list.map((x) => `${x.title} (save ${x.save})`).join(', ') : '[] (no active bundle any more)'} |\n`);
    rows.push([handle, list.length, 'set: ' + list.map((x) => x.title).join(', ')]);
  }
  log(`active bundles: ${bundles.length}, component products: ${map.size}, writes: ${writes}${dry ? ' (dry run)' : ''}`);
  rows.forEach((r) => log(`  ${r[0]} [${r[1]}] ${r[2]}`));
  return { bundles: bundles.length, components: map.size, writes };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  syncBundleLinks({ dry: process.argv.includes('--dry-run') }).catch((e) => { console.error(e.message); process.exit(1); });
}
