# Click & collect service: deploy steps

**Status:** code is committed and tested, but it is **not running yet**. This environment has no Cloudflare credentials, and it can't set GitHub Actions secrets. Until it is deployed, **nothing is auto-cancelled and no reminders are sent**. Shopify's own pickup notification still goes out when staff mark an order ready.

Code: `scripts/click-collect/`
- **src/logic.mjs:** the decisions. 12 unit tests: `node --test scripts/click-collect/test/logic.test.mjs`.
- **src/run.mjs:** the run itself: Shopify Admin API 2026-10, plus Klaviyo events "Pickup Reminder" and "Pickup Ops Digest".
- **src/worker.mjs:** the Cloudflare Worker entry: a cron every 30 minutes; the 03:30 UTC run (09:00 Sri Lanka) also sends the digest.

Tested on 13 Nov, DRY_RUN against the live store (read-only):
- With launch set to "now", it selects 0 orders.
- With a 14-day window as a test, it scanned 765 orders, found 0 pickup orders and planned 0 actions.

## Option 1: Cloudflare Worker (same account as the Koko fee worker)
Run these on any computer with Node 18+:

```bash
cd scripts/click-collect
```

```bash
npx wrangler login
```

```bash
npx wrangler secret put SHOPIFY_CLIENT_ID
```

```bash
npx wrangler secret put SHOPIFY_CLIENT_SECRET
```

```bash
npx wrangler secret put KLAVIYO_KEY
```

Then:
1. In `wrangler.toml`, set `PICKUP_LAUNCH_AT` to the deploy time, e.g. `2026-11-14T08:00:00+05:30`. Orders older than this are never touched. Leave `DRY_RUN = "true"`.
2. Run the deploy:

```bash
npx wrangler deploy
```

3. Cloudflare dashboard → Workers → snh-click-collect → **Logs**: after the next :00 or :30 run you should see `summary {...,"dry":true}`.
4. When the dry run looks right, set `DRY_RUN = "false"` in `wrangler.toml` and deploy again.

Optional: `npx wrangler secret put RUN_KEY`, then open `https://snh-click-collect.<your-subdomain>.workers.dev/?key=<RUN_KEY>` to run it once on demand.

## Option 2: GitHub Actions (private repo `boipbx/snh-ops`)
1. Create the private repo and copy `scripts/click-collect/` into it.
2. Add these repo secrets: `SHOPIFY_STORE`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`, `KLAVIYO_KEY`.
3. Add these repo variables: `PICKUP_LAUNCH_AT` (deploy time) and `DRY_RUN` (`true` first).
4. Add `.github/workflows/click-collect.yml`:

```yaml
name: click-collect
on:
  schedule: [{ cron: '*/30 * * * *' }]
  workflow_dispatch: {}
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: node cli.mjs
        env:
          SHOPIFY_STORE: ${{ secrets.SHOPIFY_STORE }}
          SHOPIFY_CLIENT_ID: ${{ secrets.SHOPIFY_CLIENT_ID }}
          SHOPIFY_CLIENT_SECRET: ${{ secrets.SHOPIFY_CLIENT_SECRET }}
          KLAVIYO_KEY: ${{ secrets.KLAVIYO_KEY }}
          PICKUP_LAUNCH_AT: ${{ vars.PICKUP_LAUNCH_AT }}
          DRY_RUN: ${{ vars.DRY_RUN }}
          PAY_AT_STORE_NAME: Pay at the store
```

Note: GitHub cron can run a few minutes late, which is fine for a 48-hour rule.

## What it does each run
- **Which orders:** only orders created after `PICKUP_LAUNCH_AT` whose fulfillment orders are `PICK_UP`.
- **Clock:** starts at "Ready for pickup" (`READY_FOR_PICKUP` fulfillment).
- **Unpaid:**
  - 24 h: reminder (tag `pickup-reminded-24h`).
  - 48 h: `orderCancel` (restock, notify customer, staff note "Auto-cancelled: not collected within 48h"), then tag `auto-cancelled-pickup`.
  - If Shopify refuses the cancel, the order is **not** tagged; it's listed in the digest for staff.
- **Paid:** never cancelled. At 48 h: tag `pickup-overdue`, second reminder, listed in the digest.
- **Tag `pickup-hold`:** skipped forever.
- **Delivery orders paid with "Pay at the store":** tagged `check-payment` and listed in the digest. Never cancelled.
- **Digest:** sent to shop.email (support@sportsnutritionhub.lk) as the Klaviyo event "Pickup Ops Digest". It goes through the flow "SNH · Click & collect · Ops digest".
