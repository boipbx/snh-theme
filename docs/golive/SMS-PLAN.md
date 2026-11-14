# SMS plan: order alerts by SMS (built, not sending)

**Status:** the service in `scripts/sms/` is built and tested (12 unit tests), but it is **not deployed and sends nothing**. No gateway account, sender ID or Shopify webhook exists yet. `DRY_RUN` is on by default: it only logs what it would send.

## What sends what

| Customer event | Shopify webhook | SMS (example) |
|---|---|---|
| Order placed | `orders/create` | SNH: Order SNH40901 received. Thank you! Track: sportsnutritionhub.lk/account Help on WhatsApp 0764863359 |
| Shipped | `fulfillments/create` | SNH: Order SNH40901 is on its way (PX123456789LK). Track: sportsnutritionhub.lk/account WhatsApp 0764863359 |
| Ready for pickup | `fulfillment_orders/line_items_prepared_for_pickup` | SNH: Order SNH40901 is ready to collect at Nugegoda. Held 48h. Details: sportsnutritionhub.lk/account WhatsApp 0764863359 |

- **Length:** every message is 160 characters or fewer and uses plain SMS characters, so it is always one SMS part.
- **Link:** Shopify's own order status link is about 110 characters, too long for one SMS. The message uses it only when it fits; otherwise it links to the account page. A short-link service would let it point at the exact order.
- **Phone numbers:** any way of writing a Sri Lankan mobile (077…, +94 77…, 0094…) becomes +947XXXXXXXX. Landlines, foreign numbers and orders with no number get no SMS.
- **No SMS for:** abandoned carts, marketing, OTP. Those need consent and aren't built.
- **Privacy:** logs show the number masked (+94771****67).

## Cost per message
`monthly cost = (orders + shipped orders + pickup-ready orders) × price per SMS + monthly fee`

- Each order sends 2 messages: placed, then shipped or ready for pickup.
- Example at about 55 orders a day: 55 × 30 × 2 = 3,300 SMS a month. At Rs 0.70 an SMS that is about Rs 2,300 a month; at Rs 1.50 it is about Rs 5,000.
- The per-SMS price and any sender-ID or monthly fee come from the gateway's quote. I haven't verified current prices.

## Gateways (adapters included)

| Gateway | Setting | Secrets needed |
|---|---|---|
| Notify.lk | `SMS_PROVIDER=notifylk` | `NOTIFYLK_USER_ID`, `NOTIFYLK_API_KEY` |
| Text.lk | `SMS_PROVIDER=textlk` | `TEXTLK_API_TOKEN` |
| Dialog eSMS | `SMS_PROVIDER=dialog` | `DIALOG_ESMS_USERNAME`, `DIALOG_ESMS_PASSWORD` |

The adapters were written from each gateway's public API description and have **never been run against the real services**. Confirm the endpoint and field names against the gateway's current docs with one test message before switching on.

## How to switch it on
1. **Choose a gateway and register the sender ID** (for example "SNH"). Sri Lankan operators must approve the sender ID; the gateway handles that.
2. **Confirm the WhatsApp number** to print in the SMS (see `WHATSAPP-NUMBERS.md`).
3. **Deploy** (same as the click & collect service):

```bash
cd scripts/sms
```

```bash
npx wrangler login
```

```bash
npx wrangler secret put SHOPIFY_WEBHOOK_SECRET
```

   Then add the gateway's secrets the same way, set `SMS_PROVIDER`, `SMS_SENDER_ID` and `WHATSAPP_NUMBER` in `wrangler.toml`, and deploy:

```bash
npx wrangler deploy
```

4. **Create the three webhooks** in Shopify admin → Settings → Notifications → Webhooks, pointing at the Worker URL: Order creation, Fulfillment creation, and "Fulfillment order line items prepared for pickup". The webhook signing secret shown there is `SHOPIFY_WEBHOOK_SECRET`.
5. **Watch one day in dry run:** the Worker log shows each message it would send.
6. **Go live:** set `DRY_RUN = "false"` and deploy again.

## Checks before going live
- **Duplicates:** Shopify can deliver a webhook twice. The handler accepts a "seen" check; wire it to a Cloudflare KV namespace at deploy so a repeat is dropped.
- **Shipped and pickup webhooks** don't always carry the phone number or order name. The service skips those today. If many are skipped in the dry run, add an order lookup (needs the Admin API token, like click & collect).
- **Shopify's own SMS notifications:** turn them off for the same events, or customers get two messages.

## Test it locally
```bash
node --test scripts/sms/test/sms.test.mjs
```

```bash
node scripts/sms/cli.mjs
```
