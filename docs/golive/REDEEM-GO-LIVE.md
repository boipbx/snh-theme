# Redemption: going live (16 Nov 2026)

The redeem service and the new welcome points run inside the SNH Ops Worker. Both are in **QA mode**: they only act on the two QA customers. Nothing here touches a real customer until `REDEEM_MODE` is set to `live`. The public Redeem button is still paused.

## What is built

- **Redeem service** (every 5 minutes, plus "Process now" on the Operations tab). For each customer tagged `Trigger_Redeem_2500`:
  1. Account must be enabled and hold 2,500+ points. If not: tag removed, status "not enough points", logged.
  2. Creates code `ELITE-XXXXXX`: Rs 2,500 off, that customer only, one use, minimum order Rs 2,501, 90 days, combines with nothing, all products.
  3. Takes 2,500 points off, re-reading the balance right before the write.
  4. Saves the code on the customer (`last_reward_code`, `reward_codes`), removes the tag, sets status "ready".
  5. Sends the Klaviyo event "Elite Reward Ready".
- **Safety**
  - One lock per customer in D1: a request runs once, even if the timer and the button fire together.
  - The deduction and the code are saved in a single guarded write. If the balance changed in between, nothing is written and the code is cancelled. No deduction without a code; no code without a deduction.
  - A member who still holds an unused code does not get a second one.
  - Each customer's loyalty fields and tags are copied to D1 before anything changes (the backup).
  - Live mode stops at 50 redemptions a day and shows a notice on the dashboard.
- **Welcome points**: 500 + Bronze only when an account is enabled, once (tag `welcome_awarded`), and only if the customer has no balance. An existing balance is never changed.
- **Account page**: "My rewards" box with every code, a copy button and "Use at checkout"; Elite card states for pending, ready and not enough points.
- **Email**: Klaviyo flow "SNH · Elite · Reward ready" (YeK7UL), live.

## QA test results (QA customer 31482633617662 only)

| Step | Result |
|---|---|
| Balance set to 2,600 | Done |
| Press Redeem on the live account page | **Not completed by me.** The button shows for the QA account and opens the confirm step, but Shopify's picture captcha blocks an automated browser. I added the tag through the API instead (the button does nothing else). Please press it once by hand. |
| Code created within 5 minutes | Pass: ELITE-MBEWXJ, 3 min 51 s after the tag |
| Balance 100 | Pass (2,600 → 100) |
| Tag removed | Pass |
| Code shown in My rewards | Pass at 1440 and 390 |
| Klaviyo event received | Pass; the flow sent 1 email |
| Redeem again with 100 points | Pass: refused, tag removed, "Not enough points" shown, nothing created |
| Code in a cart (no checkout) | Pass: Rs 2,500 off a Rs 32,516 cart. Not applied to a Rs 499 cart (below the minimum). |
| Code deactivated after the test | Pass; the account then showed it as not valid |
| Welcome: new record, no account | The old Flow gave 500 points within 8 seconds (it is still on). The Worker gave nothing. I then cleared the QA2 record's points to stand in for "old Flow off". |
| Welcome: account enabled | Pass: 500 + Bronze + tag `welcome_awarded`, once. A second run gave nothing. |

Screenshots: `docs/golive/redeem-test/`. Automated tests: 50 pass, including double-run, rollback, the daily cap and QA-only mode.

## The four pending requests: what live mode will do

Customer details stay out of the repo beyond the ID; names are in the chat report.

| Customer ID | Points now | What happens on the first live run |
|---|---|---|
| 8063105237246 | 5,464 | New code, balance 2,964, tag removed, email sent |
| 6850065498366 | 7,067 | New code, balance 4,567, tag removed, email sent |
| 7960950997246 | 3,133 | New code, balance 633, tag removed, email sent |
| 9334694183166 | 3,025 | **No new code and no points taken.** Still holds unused code ELITE-83166-F1669A from 9 Nov. Tag removed, that code added to My rewards. No email is sent on this path; tell this member by hand. |

Balances are read at run time, so the figures move if they order before then.

**Also from 9 Nov:** customers 9142627664126 and 9259200315646 hold hand-made codes and were never told. Their codes are not in My rewards (they are not tagged, so the service doesn't touch them). Tell them by hand, or approve a one-off to add those two codes to their My rewards list.

## Steps to go live, in this order

1. **Khizer's decision on the audit** (`LOYALTY-AUDIT.md`). 104 members can claim Rs 630,000 once redemption is open.
2. **Press Redeem once by hand** as the QA customer (set its points to 2,500+ first) to prove the button and captcha end to end.
3. **Welcome points to live:** in `apps/snh-ops/wrangler.toml` set `WELCOME_MODE = "live"` and deploy. This session can do it on your word.
4. **Turn off the old welcome Flow** (only after step 3):
   1. Shopify admin → **Apps** → **Flow**.
   2. Open each workflow whose status is **On**. Find the one with trigger **Customer created** and an action that sets the customer metafield **loyalty_points** to 500 (it also sets `loyalty_tier`, `annual_spend` and adds the tag `Welcome_Free_Shipping`).
   3. If that workflow does only the welcome: click **Turn off** (top right) and confirm.
   4. If it also does something you want to keep (the free-shipping tag): click **Edit workflow**, delete only the actions that set `loyalty_points`, `loyalty_tier` and `annual_spend`, then **Turn on**.
   5. Check: create a test customer in admin; after a minute its metafields must show no points.
   - If no Flow matches, the writer is another app or Esoft. Look in **Settings → Apps and sales channels** for a loyalty or sync app, and tell me what you find.
   - Do **not** touch the workflow with trigger **Order paid**: that one awards points on orders and must stay on.
5. **Redemption to live:** set `REDEEM_MODE = "live"` in `wrangler.toml` and deploy. Within 5 minutes the four pending requests are processed as in the table above.
6. **Untick "Pause redemption"**: Theme settings → SNH Elite.
7. Watch the Operations tab → Reward redemptions for the first day.

## Rollback

- **Stop new redemptions now:** tick "Pause redemption" in Theme settings (hides the button), and set `REDEEM_MODE = "qa"` and deploy (the service stops processing; tags simply wait).
- **Undo one redemption:** Operations tab → Reward redemptions shows the customer ID, code and points before/after. Deactivate the code in Shopify admin → Discounts, then add 2,500 back to the customer's `loyalty_points`. The pre-change values are in D1 (`redeem_requests.backup`).
- **Welcome points:** set `WELCOME_MODE = "qa"` and deploy, then turn the old Flow back on.
- **Email:** set the Klaviyo flow "SNH · Elite · Reward ready" to Draft.
- **Theme:** revert commits `a04cf22` and the wording follow-up; backups are in `docs/golive/backup-2026-11-16b/`.

## Still needed from you

- **Klaviyo transactional status.** The flow was created with the transactional flag requested, but Klaviyo left it off: only their team can approve it. Until then, unsubscribed or suppressed members don't get the email (the code still shows in My rewards). Ask Klaviyo support to mark "SNH · Elite · Reward ready" as transactional.
- **Earning without an account.** The "Order paid" automation still awards points to guest and POS records. That is part of Khizer's audit decision, not changed here.
