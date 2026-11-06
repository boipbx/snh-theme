# Shopify notifications: paste guide

Shopify has no API for these, so paste them by hand. Files: branch `emails`, folder `emails/dist/shopify/`.
On GitHub open the file → **Raw** → select all → copy.

## Every notification, the same 6 steps

1. Admin → **Settings → Notifications → Customer notifications** → open the notification.
2. **Edit code**.
3. **Back up first:** select all in *Email body (HTML)* → copy → paste into a note named after the notification.
   (Shopify also has **Revert to default** at the bottom if anything goes wrong.)
4. Replace *Email subject* with the subject below, and the body with the file.
5. **Preview**: if Shopify shows a Liquid error, a variable name differs on your store. Paste the original back and tell me.
6. **Send test email** → check on your phone → **Save**.

## In order of importance

| # | notification | file | subject |
|---|---|---|---|
| 1 | Order confirmation | `order-confirmation.html` | `Order {{ order_name }} confirmed` |
| 2 | Shipping confirmation | `shipping-confirmation.html` | `Your order {{ order_name }} is on its way` |
| 3 | Local order out for delivery (same-day Colombo) | `local-delivery.html` | `Same-day delivery: your SNH order is on its way` |
| 4 | Ready for local pickup | `ready-for-pickup.html` | `Ready for pickup at SNH {{ location.name }}` |
| 5 | Customer account invite | `customer-account-invite.html` | `Activate your SNH account` |
| 6 | Customer account welcome | `customer-account-welcome.html` | `You're in. Welcome to SNH Elite` |
| 7 | Customer password reset | `customer-password-reset.html` | `Reset your SNH password` |
| 8 | Order cancelled | `order-cancelled.html` | `Order {{ order_name }} has been cancelled` |
| 9 | Refund notification | `refund.html` | `Refund for order {{ order_name }}` |
| 10 | Order edited | `order-edited.html` | `Your order {{ order_name }} was updated` |
| 11 | Shipping out for delivery | `out-for-delivery.html` | `Your SNH order arrives today` |
| 12 | Shipping delivered | `delivered.html` | `Delivered: your SNH order is here` |
| 13 | Payment reminder | `payment-reminder.html` | `Payment reminder for order {{ order_name }}` |
| 14 | Draft order invoice | `draft-order-invoice.html` | `Your SNH invoice {{ name }}` |
| 15 | Gift card created | `gift-card.html` | `Your SNH gift card: {{ gift_card.initial_value \| money }}` |

## Check after pasting

- **Order confirmation:** the points line uses the customer metafield `custom.loyalty_tier`. Without it, it shows the Bronze rate.
- **Payment note:** Koko, cash on delivery and bank transfer each show their own line. If your payment method names differ, tell me.
- **Draft order invoice:** if Preview errors on the button, copy the link variable from your backup into the button.
- **Refund:** if Preview errors on `{{ amount | money }}`, use the amount variable from your backup.
- Do the **Order confirmation** first and place a test order (Bogus gateway or a draft order marked paid) to see real data.
