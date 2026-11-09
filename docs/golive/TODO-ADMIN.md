# Admin to-do (only these need a person)

1. **Klaviyo is not sending any email since 8 Nov ~08:00 UTC** (all flows, old and new; triggers keep arriving): open Klaviyo → Settings → Billing / Account and the banner notices, clear the hold (plan, payment or compliance review), then confirm "Received Email" events resume.
2. **Klaviyo → Integrations → Shopify → Settings**: turn on "Sync your Shopify email subscribers to Klaviyo" with list = **Newsletter**, and onsite tracking for "Viewed Product" (Browse abandonment has had no Viewed Product events).
3. **Shopify app permissions**: add `write_orders` so counted orders can be tagged `points_awarded` (not done: the app only has read_orders).
4. **Build the 3 Shopify Flows** in `docs/golive/SHOPIFY-FLOWS.md` (welcome points, earn on paid orders, redeem) and paste the 15 notifications in `docs/golive/SHOPIFY-NOTIFICATIONS.md`.
5. **Tell 3 members their reward codes** (codes in `custom.last_reward_code`; customer IDs in BACKUP.md) and review `points-review.csv` (870 balances lower than the formula) with Esoft before anything changes there.
