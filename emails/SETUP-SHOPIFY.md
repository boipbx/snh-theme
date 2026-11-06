# Shopify notifications: setup

Admin → **Settings → Notifications → Customer notifications**. For each row: open the notification → **Edit code** → replace the **Email body (HTML)** with the file below → set the **Email subject** → **Preview** (Shopify shows a Liquid error if a variable is not available) → **Send test email** → **Save**. Keep a copy of the default first (Shopify has "Revert to default").

Shopify notifications do not take a separate preheader or plain-text field: the preheader is built into the HTML (hidden first line) and Shopify makes its own text part. The `.txt` files are for reference.

| notification (admin path) | file | subject | variables used |
|---|---|---|---|
| Customer account invite | `emails/dist/shopify/customer-account-invite.html` | Activate your SNH account | customer.first_name, customer.account_activation_url, shop.url |
| Customer account welcome | `emails/dist/shopify/customer-account-welcome.html` | You're in. Welcome to SNH Elite | customer.first_name, shop.url |
| Customer password reset | `emails/dist/shopify/customer-password-reset.html` | Reset your SNH password | customer.first_name, customer.reset_password_url |
| Order confirmation | `emails/dist/shopify/order-confirmation.html` | Order {{ order_name }} confirmed | order_name, customer.first_name, subtotal_line_items, subtotal_price, shipping_price, total_discounts, total_price, transactions / gateway, shipping_address, order_status_url, customer.metafields.custom.loyalty_tier |
| Order edited | `emails/dist/shopify/order-edited.html` | Your order {{ order_name }} was updated | order_name, customer.first_name, subtotal_line_items, total_price, order_status_url |
| Order cancelled | `emails/dist/shopify/order-cancelled.html` | Order {{ order_name }} has been cancelled | order_name, customer.first_name, subtotal_line_items, total_price, financial_status |
| Refund notification | `emails/dist/shopify/refund.html` | Refund for order {{ order_name }} | order_name, customer.first_name, amount, refund_line_items |
| Shipping confirmation | `emails/dist/shopify/shipping-confirmation.html` | Your order {{ order_name }} is on its way | order_name, customer.first_name, fulfillment.tracking_company, fulfillment.tracking_number, fulfillment.tracking_url, fulfillment.fulfillment_line_items, shipping_address |
| Shipping out for delivery | `emails/dist/shopify/out-for-delivery.html` | Your SNH order arrives today | order_name, customer.first_name, fulfillment.tracking_url, shipping_address |
| Shipping delivered | `emails/dist/shopify/delivered.html` | Delivered: your SNH order is here | order_name, customer.first_name, order_status_url |
| Local order out for delivery | `emails/dist/shopify/local-delivery.html` | Same-day delivery: your SNH order is on its way | order_name, customer.first_name, shipping_address, delivery_instructions |
| Ready for local pickup | `emails/dist/shopify/ready-for-pickup.html` | Ready for pickup at SNH {{ location.name }} | order_name, customer.first_name, location.name, location.address1, location.phone |
| Payment reminder | `emails/dist/shopify/payment-reminder.html` | Payment reminder for order {{ order_name }} | order_name, customer.first_name, total_price, order_status_url |
| Draft order invoice | `emails/dist/shopify/draft-order-invoice.html` | Your SNH invoice {{ name }} | name, customer.first_name, subtotal_line_items, total_price, invoice_url (keep the link variable from Shopify’s default template) |
| Gift card created | `emails/dist/shopify/gift-card.html` | Your SNH gift card: {{ gift_card.initial_value \| money }} | gift_card.initial_value, gift_card.code, gift_card.url, gift_card.expires_on, customer.first_name |

## Notes

- **Points earned** (order confirmation) uses the customer metafield `custom.loyalty_tier` for the rate (Bronze 3, Silver 7, Gold 10) and 1 point = Rs 1. If the metafield is not set, it shows the Bronze rate.
- **Payment note** reads the first transaction's gateway: "Koko", "Cash on Delivery (COD)" and "Bank Deposit" / manual methods show their own line. Rename the checks in the file if your payment method names differ.
- **Draft order invoice**: the button uses `{{ invoice_url }}`. If Shopify's default template on your store uses a different link variable, copy that variable into the button.
- **Out for delivery / Delivered** fire only for carriers that send tracking status to Shopify. Same-day Colombo riders use **Local order out for delivery** (Settings → Notifications → Local delivery).
- **Ready for pickup** needs local pickup enabled at the store location (Settings → Shipping and delivery → Local pickup).
- **Payment reminder** applies to orders with payment terms (manual / bank transfer). COD orders do not trigger it.
- Sender email and the reply-to: Settings → Notifications → Sender email (use a monitored address; WhatsApp is the fastest support line in every email).

