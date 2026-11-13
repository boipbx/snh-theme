#!/usr/bin/env node
// Create the next Saturday SiS codes: SIS15-DDMON, 15% off the "SCIENCE IN SPORT | SiS" collection, valid Saturday
// 00:00–23:59 Sri Lanka time (UTC+5:30, no DST), all customers, no minimum, combines with nothing, unlimited uses.
// Starts after the latest existing SIS15- code (or this Saturday if none) and makes N codes (default 12).
// Codes that already exist are skipped, so it is safe to re-run.
//
// Usage (env: SHOPIFY_STORE, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET):
//   node scripts/create-saturday-codes.mjs --dry-run      # list what would be created
//   node scripts/create-saturday-codes.mjs [N]            # create N codes
// Then add the new codes to docs/golive/SATURDAY-CODES.md. The token is never printed.

const API = '2026-10';
const COLLECTION = 'gid://shopify/Collection/453152768254'; // SCIENCE IN SPORT | SiS (handle: sis)
const DRY = process.argv.includes('--dry-run');
const N = Number(process.argv.find((a) => /^\d+$/.test(a)) || 12);
const { SHOPIFY_STORE: S, SHOPIFY_CLIENT_ID: ID, SHOPIFY_CLIENT_SECRET: SECRET } = process.env;
if (!S || !ID || !SECRET) { console.error('Missing SHOPIFY_STORE / SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET'); process.exit(1); }

let T;
async function token() {
  const r = await fetch(`https://${S}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: ID, client_secret: SECRET }) });
  if (!r.ok) throw new Error(`token request failed: ${r.status}`);
  return (await r.json()).access_token;
}
async function gql(query, variables = {}) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(`https://${S}/admin/api/${API}/graphql.json`, { method: 'POST', headers: { 'X-Shopify-Access-Token': T, 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) });
    if (r.status === 429 || r.status >= 500) { await new Promise((res) => setTimeout(res, 2000 * (i + 1))); continue; }
    const j = await r.json(); if (j.errors) throw new Error(JSON.stringify(j.errors)); return j.data;
  }
  throw new Error('Shopify API unavailable');
}
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const pad = (n) => String(n).padStart(2, '0');
const code = (d) => `SIS15-${pad(d.getUTCDate())}${MON[d.getUTCMonth()]}`;
// a "date" here is the Sri Lanka calendar day, kept in a UTC Date at 00:00
const iso = (d, hms) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${hms}+05:30`;

(async () => {
  T = await token();
  const d = await gql(`{codeDiscountNodes(first:250,query:"title:Saturday SiS*"){nodes{codeDiscount{... on DiscountCodeBasic{endsAt}}}}}`);
  const ends = d.codeDiscountNodes.nodes.map((n) => n.codeDiscount && n.codeDiscount.endsAt).filter(Boolean).map((e) => Date.parse(e));
  // first Saturday to create: the one after the latest existing code, else this Saturday (Sri Lanka date)
  const lk = new Date(Date.now() + 5.5 * 3600e3); let sat = new Date(Date.UTC(lk.getUTCFullYear(), lk.getUTCMonth(), lk.getUTCDate()));
  sat.setUTCDate(sat.getUTCDate() + ((6 - sat.getUTCDay() + 7) % 7));
  if (ends.length) { const last = new Date(Math.max(...ends) + 5.5 * 3600e3); sat = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate() + 7)); }
  for (let i = 0; i < N; i++, sat = new Date(sat.getTime() + 7 * 864e5)) {
    const c = code(sat);
    const ex = await gql('query($c:String!){codeDiscountNodeByCode(code:$c){id}}', { c });
    if (ex.codeDiscountNodeByCode) { console.log(c, 'exists'); continue; }
    if (DRY) { console.log(c, iso(sat, '00:00:00'), '→', iso(sat, '23:59:59'), '(dry run)'); continue; }
    const r = await gql(`mutation($d:DiscountCodeBasicInput!){discountCodeBasicCreate(basicCodeDiscount:$d){codeDiscountNode{id} userErrors{field message}}}`, { d: {
      title: `Saturday SiS 15% (${c})`, code: c, startsAt: iso(sat, '00:00:00'), endsAt: iso(sat, '23:59:59'), context: { all: 'ALL' },
      customerGets: { value: { percentage: 0.15 }, items: { collections: { add: [COLLECTION] } } },
      combinesWith: { orderDiscounts: false, productDiscounts: false, shippingDiscounts: false }, appliesOncePerCustomer: false } });
    const x = r.discountCodeBasicCreate;
    console.log(c, x.userErrors.length ? 'ERROR ' + JSON.stringify(x.userErrors) : 'created ' + x.codeDiscountNode.id);
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
