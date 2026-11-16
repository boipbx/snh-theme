# SNH Ops dashboard: deploy and install

**Status (16 Nov 2026): deployed and synced.** Part A is done. Only Part B (your clicks in the Dev Dashboard) is left.

- **Worker URL:** https://snh-ops.raspy-wind-fe2d.workers.dev
- **Health check:** https://snh-ops.raspy-wind-fe2d.workers.dev/health returns `ok`.
- **First sync:** finished 16 Nov, 03:58 UTC: 20,158 customers, 17,100 orders, 30,388 order lines.
- **Nightly sync:** 02:00 Sri Lanka time.

Code: `apps/snh-ops/`. It reads from Shopify and Klaviyo and writes only to its own Cloudflare database.

## Part A: deploy to Cloudflare (done on 16 Nov; kept here for a redeploy)
Run this on any computer with Node 20+:

```bash
cd apps/snh-ops
```

```bash
npx wrangler login
```

```bash
npx wrangler d1 create snh-ops
```

Copy the `database_id` it prints into `wrangler.toml` (replace `SET-AT-DEPLOY`). Then create the tables:

```bash
npx wrangler d1 execute snh-ops --remote --file=schema.sql
```

Register the store and its settings (tiers, point value, code prefixes; edit `config/example-store.json` first if anything changed):

```bash
node seed.mjs sports-nutrition-hub.myshopify.com > seed.sql
```

```bash
npx wrangler d1 execute snh-ops --remote --file=seed.sql
```

Add the three secrets (the same values as the SNH Ops app and Klaviyo key used so far):

```bash
npx wrangler secret put SHOPIFY_CLIENT_ID
```

```bash
npx wrangler secret put SHOPIFY_CLIENT_SECRET
```

```bash
npx wrangler secret put KLAVIYO_KEY
```

Deploy:

```bash
npx wrangler deploy
```

It prints the **Worker URL**, like `https://snh-ops.<your-subdomain>.workers.dev`. Open `<Worker URL>/health`: it should say `ok`.

## Part B: your clicks in the Shopify Dev Dashboard
1. Go to **dev.shopify.com → Apps → SNH Ops → Versions → Create a version** (or **Configuration**, depending on the layout).
2. **App URL:** `https://snh-ops.raspy-wind-fe2d.workers.dev`
3. Tick **Embed app in Shopify admin**.
4. **Redirect URLs:** `https://snh-ops.raspy-wind-fe2d.workers.dev/auth/callback` The app doesn't use a redirect today (it signs in with session tokens), but the field can't be empty.
5. Leave the scopes as they are. The dashboard needs only the read scopes the app already has.
6. **Release** the new version.
7. In Shopify admin, open **Apps → SNH Ops**. The dashboard loads inside admin.
8. The data is already loaded. **Refresh now** reloads it on demand (about 5 minutes); otherwise it refreshes by itself every night at 02:00 Sri Lanka time.

## If something looks wrong
- **"Open this app from Shopify admin":** the page was opened directly, not inside admin. That is expected; it shows no data outside admin.
- **"This store is not set up in SNH Ops yet":** the seed step in Part A was skipped.
- **"Sync failed":** press Refresh now again. If it repeats, the message says which export failed.
- **Click & collect / SMS show "not deployed":** correct until those services are deployed. Then put their URLs in the store settings (`services.clickCollectUrl`, `services.smsUrl`) and re-run the seed step.

## What it stores
- A copy of customers (name, tags, points, tier, yearly spend, reward code, dates) and 12 months of orders with line items, in Cloudflare D1.
- No emails, phone numbers or addresses.
- Nothing is ever written back to Shopify or Klaviyo.
