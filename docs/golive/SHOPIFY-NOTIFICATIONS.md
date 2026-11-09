# Shopify notifications: paste guide (phone-friendly)

Shopify has no API for its own notification emails, so these are pasted by hand, one at a time (about 2 minutes each).
Do them **in this order**: the first three matter most.

## The same 6 steps for every one

1. Shopify admin → **Settings → Notifications → Customer notifications** → tap the notification named below.
2. Tap **Edit code**.
3. **Back up first:** select all in *Email body (HTML)* → copy → paste into a phone note named after the notification. (Bottom of the page: **Revert to default** also undoes everything.)
4. Open the file link below on GitHub → tap the **Copy raw file** button (two-squares icon) → back in Shopify, select all in the body → paste. Replace *Email subject* with the subject below.
5. Tap **Preview**. If you see a Liquid error, paste your backup back and send us the notification name.
6. **Send test email** → check it on your phone → **Save**.

### 1. Customer account welcome
- Where: Settings → Notifications → Customer notifications → **Customer accounts → Customer account welcome**
- File: [customer-account-welcome.html](https://github.com/boipbx/snh-theme/blob/emails/emails/dist/shopify/customer-account-welcome.html) (tap **Copy raw file**)
- Subject: `You're in. Welcome to SNH Elite`

### 2. Order confirmation
- Where: Settings → Notifications → Customer notifications → **Orders → Order confirmation**
- File: [order-confirmation.html](https://github.com/boipbx/snh-theme/blob/emails/emails/dist/shopify/order-confirmation.html) (tap **Copy raw file**)
- Subject: `Order {{ order_name }} confirmed`

### 3. Shipping confirmation
- Where: Settings → Notifications → Customer notifications → **Shipping → Shipping confirmation**
- File: [shipping-confirmation.html](https://github.com/boipbx/snh-theme/blob/emails/emails/dist/shopify/shipping-confirmation.html) (tap **Copy raw file**)
- Subject: `Your order {{ order_name }} is on its way`

### 4. Customer account invite
- Where: Settings → Notifications → Customer notifications → **Customer accounts → Customer account invite**
- File: [customer-account-invite.html](https://github.com/boipbx/snh-theme/blob/emails/emails/dist/shopify/customer-account-invite.html) (tap **Copy raw file**)
- Subject: `Activate your SNH account`

### 5. Customer password reset
- Where: Settings → Notifications → Customer notifications → **Customer accounts → Customer account password reset**
- File: [customer-password-reset.html](https://github.com/boipbx/snh-theme/blob/emails/emails/dist/shopify/customer-password-reset.html) (tap **Copy raw file**)
- Subject: `Reset your SNH password`

### 6. Local order out for delivery
- Where: Settings → Notifications → Customer notifications → **Local delivery → Local order out for delivery**
- File: [local-delivery.html](https://github.com/boipbx/snh-theme/blob/emails/emails/dist/shopify/local-delivery.html) (tap **Copy raw file**)
- Subject: `Same-day delivery: your SNH order is on its way`

### 7. Ready for local pickup
- Where: Settings → Notifications → Customer notifications → **Local pickup → Ready for local pickup**
- File: [ready-for-pickup.html](https://github.com/boipbx/snh-theme/blob/emails/emails/dist/shopify/ready-for-pickup.html) (tap **Copy raw file**)
- Subject: `Ready for pickup at SNH {{ location.name }}`

### 8. Order cancelled
- Where: Settings → Notifications → Customer notifications → **Orders → Order cancelled**
- File: [order-cancelled.html](https://github.com/boipbx/snh-theme/blob/emails/emails/dist/shopify/order-cancelled.html) (tap **Copy raw file**)
- Subject: `Order {{ order_name }} has been cancelled`

### 9. Refund notification
- Where: Settings → Notifications → Customer notifications → **Orders → Refund notification**
- File: [refund.html](https://github.com/boipbx/snh-theme/blob/emails/emails/dist/shopify/refund.html) (tap **Copy raw file**)
- Subject: `Refund for order {{ order_name }}`

### 10. Order edited
- Where: Settings → Notifications → Customer notifications → **Orders → Order edited**
- File: [order-edited.html](https://github.com/boipbx/snh-theme/blob/emails/emails/dist/shopify/order-edited.html) (tap **Copy raw file**)
- Subject: `Your order {{ order_name }} was updated`

### 11. Shipping out for delivery
- Where: Settings → Notifications → Customer notifications → **Shipping → Out for delivery**
- File: [out-for-delivery.html](https://github.com/boipbx/snh-theme/blob/emails/emails/dist/shopify/out-for-delivery.html) (tap **Copy raw file**)
- Subject: `Your SNH order arrives today`

### 12. Shipping delivered
- Where: Settings → Notifications → Customer notifications → **Shipping → Delivered**
- File: [delivered.html](https://github.com/boipbx/snh-theme/blob/emails/emails/dist/shopify/delivered.html) (tap **Copy raw file**)
- Subject: `Delivered: your SNH order is here`

### 13. Payment reminder
- Where: Settings → Notifications → Customer notifications → **Orders → Payment reminder**
- File: [payment-reminder.html](https://github.com/boipbx/snh-theme/blob/emails/emails/dist/shopify/payment-reminder.html) (tap **Copy raw file**)
- Subject: `Payment reminder for order {{ order_name }}`

### 14. Draft order invoice
- Where: Settings → Notifications → Customer notifications → **Orders → Draft order invoice**
- File: [draft-order-invoice.html](https://github.com/boipbx/snh-theme/blob/emails/emails/dist/shopify/draft-order-invoice.html) (tap **Copy raw file**)
- Subject: `Your SNH invoice {{ name }}`

### 15. Gift card created
- Where: Settings → Notifications → Customer notifications → **Gift cards → Gift card created**
- File: [gift-card.html](https://github.com/boipbx/snh-theme/blob/emails/emails/dist/shopify/gift-card.html) (tap **Copy raw file**)
- Subject: `Your SNH gift card: {{ gift_card.initial_value | money }}`

## Notes

- Order confirmation reads the customer metafield `custom.loyalty_tier` for the points line; without it, it shows the Bronze rate.
- Koko, cash on delivery and bank transfer each show their own payment line. If your payment method names differ, send us a screenshot.
- Draft order invoice / Refund: if Preview errors on the button or the amount, copy that variable from your backup into the same place.
- After Order confirmation, place a test draft order and mark it paid to see real data.
