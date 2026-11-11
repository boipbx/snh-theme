# Koko checkout worker (Cloudflare: `koko-fee-snh`)

The website's Koko button (snippets/koko-checkout-modal.liquid) sends the basket's variant IDs + quantities to this
worker. It builds a Shopify **draft order** (the basket + a 4% "Platform Processing Fee" line) and sends the customer
to its checkout. The worker lives in Cloudflare, not in the theme: `worker.js` here is the source of truth to paste in.

## 11 Nov 2026 fix
Koko orders were charged differently from the website:
- **Base price instead of the Sri Lanka price** (SNH40710: creatine 8,999 vs 8,499 on the site).
- **Bundle offers / sales dropped**: drafts were created with `acceptAutomaticDiscounts: false`.
- **Fee on the undiscounted total.**

Now each line uses the LK market price, automatic discounts apply, the fee is 4% of the subtotal after discounts,
and discount codes can be entered on the Koko checkout.

## Deploy
Cloudflare → Workers & Pages → koko-fee-snh → **Edit code** → select all in `worker.js` (left) → paste this file →
**Deploy**. Secrets (SHOPIFY_CLIENT_ID / SECRET) stay as they are. Undo: Deployments → previous version → Rollback.

## Note
An automatic discount that applies to *every* product (e.g. a sitewide % off) could also discount the fee line.
Exclude the KOKO-FEE product from such discounts in Shopify (Discounts → the discount → Applies to).
