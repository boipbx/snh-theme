# Click & collect: the admin steps the API can't do (13 Nov 2026)

Live now: Shopify local pickup at **Nugegoda** (ready in 24 hours, 48-hour instructions). The product page and cart show it, and /pages/click-and-collect explains it.
**Dehiwala and Wattala could not be switched on**: Shopify refused `locationLocalPickupEnable` for both, because neither location fulfils online orders (`fulfillsOnlineOrders: false`). See step (e).

## (a) "Pay at the store" payment method
1. Admin → **Settings → Payments** → *Manual payment methods* → **Add manual payment method → Create custom payment method**.
2. Name: **Pay at the store when you collect**
3. Additional details / Payment instructions: **For click & collect orders only. Pay when you collect. Unpaid orders are cancelled after 48 hours.**
4. Save.

Your plan is **Shopify (not Plus)**. Shopify shows manual payment methods for delivery orders too, and hiding them by delivery method needs Shopify Plus (checkout rules) or a payment-rules app. Until then, the click & collect service **tags any delivery order paid with this method `check-payment`**, never cancels it, and lists it in the 09:00 ops digest. The service matches the method by name: keep the name containing "Pay at the store", or change `PAY_AT_STORE_NAME` in the service.

## (b) "Ready for local pickup" notification (48-hour wording)
Shopify has a single pickup-ready notification ("Ready for local pickup"); there is no separate "Order ready for pickup" one.
1. Admin → **Settings → Notifications → Customer notifications → Ready for local pickup → Edit code**.
2. **Back up first:** select all in *Email body (HTML)* → copy → paste into a note named "Ready for local pickup – backup 13 Nov". (*Revert to default* is also at the bottom.)
3. Subject: `Ready for pickup at SNH {{ location.name }}`
4. Body: paste **docs/golive/click-collect-ready-for-pickup.html** (Raw on GitHub → select all → copy). It is the branded template from `emails/dist/shopify/ready-for-pickup.html`, changed from "7 days" to the 48-hour rule, plus the WhatsApp line. It uses `{{ order_name }}`, `{{ location.name }}` and `{{ location.address1 }}`.
5. **Preview**. If it shows a Liquid error, paste the backup back.
6. **Send test email** → check it → **Save**.
Note: the theme branch's older guide (emails/SHOPIFY-PASTE-GUIDE.md, row 4) still points to the 7-day file. Use this one instead.

## (c) Staff: marking orders ready, and giving more time
- **Admin:** Orders → open the pickup order → **Mark as ready for pickup**. This sends the customer the notification above and **starts the 48-hour clock**: the service reads it as the `READY_FOR_PICKUP` fulfillment.
- **POS:** Orders → the order → **Mark as ready for pickup**. When the customer collects: **Mark as picked up**. That stops all reminders.
- **Customer asks for more time:** add the tag **`pickup-hold`** to the order. The service then skips it for good. Remove the tag to bring it back under the 48-hour rule.
- Not marked ready yet means no clock and no reminders. After 72 hours the order is listed in the digest so it doesn't get forgotten.
- Paid orders are **never** auto-cancelled. After 48 hours they get the tag `pickup-overdue` and a second reminder, and appear in the digest.

## (d) Future small showrooms without stock (design only)
- Add the showroom as a Shopify **location with pickup enabled** and fulfil-online-orders on. Pickup only shows when that location holds stock for the whole cart.
- For items it doesn't hold: send them over from Nugegoda/warehouse with a **Shopify inventory transfer** (PickMe Flash) **before** marking the order ready. The 48-hour clock only starts at "ready".
- Alternative for a showroom with no stock record: a **custom shipping rate** "Collect at <showroom> — ready in 1–2 days" (zone: Sri Lanka, price 0).
- Trade-offs: native pickup shows live stock and the official pickup notifications, but hides the outlet when it has no stock. The shipping-rate route always shows, but it's a "shipping" order, so the hold service (PICK_UP only) and the pickup notifications don't apply, and staff move stock manually.

## (e) Turn on Dehiwala and Wattala (your decision)
1. Admin → **Settings → Locations → Dehiwala** → tick **Fulfil online orders from this location** → Save. Same for **Wattala**.
2. Tell me, and I'll switch on local pickup for both (same 24-hour / 48-hour settings) and add them to `snippets/snh-pickup-outlets.liquid` so the cart line names all three.
Note: fulfilling online orders also lets Shopify route **delivery** orders to those locations' stock. Check this fits how you ship before ticking it.

## (f) Footer link
The SNH Ops app has no navigation permission (`write_online_store_navigation`), so the menu link couldn't be added by API.
Admin → **Online Store → Navigation** → your footer help menu → **Add menu item** → Name "Click & collect", link **Pages → Click & collect** → Save.
