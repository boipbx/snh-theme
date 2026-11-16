# Loyalty flow test (16 Nov 2026)

Tested on the live site and through the Admin API with one QA customer only: `pabasarawasava+qa@gmail.com` (customer 31482633617662, tag `qa-test`). No other customer was changed. The public Redeem button stays paused.

**Note:** that email did not exist in Shopify when the test began (three similar test records did, none ending `+qa`). The record was created through the API under exactly that email so the test could stay on it.

## Result in one line

Welcome points and earning work. **Redemption does not: nothing processes the `Trigger_Redeem_2500` tag, the theme never shows an issued code, and no email sends it.**

## 1. Pending redeem requests (not changed)

Four customers carry `Trigger_Redeem_2500`. All have accounts. Names are in the chat report, not here (no customer details in the repo).

| Customer ID | Points | Tier | Tagged (best evidence) | Note |
|---|---|---|---|---|
| 8063105237246 | 5,464 | Bronze | between 9 Nov and 11 Nov 11:36 | no code issued |
| 6850065498366 | 7,067 | Silver | between 9 Nov and 12 Nov 17:15 | no code issued |
| 7960950997246 | 3,133 | Bronze | 14 Nov 21:39 | no code issued |
| 9334694183166 | 3,025 | Bronze | 15 Nov 01:27 | second request; still holds unused code ELITE-83166-F1669A from 9 Nov |

- Times are Colombo time. Shopify keeps no record of when a tag was added, so the date comes from the record's last change. None of the four was tagged on 9 Nov, when the three requests pending then were handled by hand.
- Waiting time so far: 1.5 to 6 days. Nobody has received a code or lost points.

## 2. What processes `Trigger_Redeem_2500` today

**Nothing.**
- The QA customer was tagged at 10:24 Colombo with 2,500 points. After 6 minutes: no code, no points taken, tag still on.
- The only Rs 2,500 reward codes in the store are the three created by hand by this project on 9 Nov. No Flow, app or script has ever created one.
- The four requests above have sat for days.
- The repo has no script for it. Esoft can't be seen through the API, but it has produced no code or deduction either.
- The redeem workflow in `SHOPIFY-FLOWS.md` (Flow 3) was written as a guide; it has not been built in Shopify Flow, or it is switched off. Check in admin: Apps → Flow.

## 3. Step by step

| # | Step | Result | What happened |
|---|---|---|---|
| 1 | Customer record created | Pass | 10:18:57 Colombo |
| 2 | Welcome points appear | Pass, but too early | 500 points, Bronze, yearly spend 0 and the tag `Welcome_Free_Shipping` were written 2 seconds after the record was created, **before** the account was activated. Confirms the audit: the trigger is "customer created", not "account created". |
| 3 | Account activation | Pass | Activation link opened, password set, signed in. State went DISABLED → ENABLED. No extra points on activation (correct). |
| 4 | Elite card shows balance | Pass | Card shows Bronze, 500 points, 3% back, member number. |
| 5 | Test order, 100% discount, paid, then cancelled | Inconclusive | Order SNH40969, Rs 0. No points and no yearly-spend change, which is right for a Rs 0 order (3% of 0). |
| 6 | Test order, Rs 1,000, paid, then cancelled | Not earned | Order SNH40970 (custom line, manual payment, no stock touched). No points after 90 seconds. See the note below. |
| 7 | Points earned on real orders | Pass (observed) | The last 12 real paid orders (POS, web, draft) all had points updated 2 to 10 seconds after the order. |
| 8 | Balance set to 2,500 | Pass | Set on the QA customer only. Card showed 2,500. |
| 9 | Redeem request (tag added directly) | Pass (theme side) | Account showed "Request pending". No Redeem button (pause still on). |
| 10 | Rs 2,500 single-use code created automatically | **Fail** | Nothing happened in 6 minutes. |
| 11 | Points deducted automatically | **Fail** | Balance stayed 2,500. |
| 12 | Reward issued by hand (to test the rest) | Done | Code ELITE-17662-QAB4DA: Rs 2,500, single use, this customer only, 90 days. Points set to 0, code saved in `custom.last_reward_code`, tag removed. |
| 13 | Code shown on the account | **Fail** | The account page shows the balance (0) but no code. The theme has no place that prints `last_reward_code`. |
| 14 | Code cancelled | Pass | Deactivated (status Expired), never used. Both test orders cancelled; the Rs 1,000 one shows as refunded. |

**Note on step 6.** The app has no draft-order permission, so the test orders were created through the orders API as already paid. Whatever awards points listens for a real payment event (checkout, POS, a draft order marked paid) and does not fire for an order created this way. Earning itself works, as step 7 shows. To test it end to end, mark one draft order as paid in admin for the QA customer.

**QA customer now:** account enabled, 0 points, Bronze, `last_reward_code` = ELITE-17662-QAB4DA (deactivated), tags `qa-test`, `Welcome_Free_Shipping`, 2 cancelled test orders.

## Screenshots (`docs/golive/loyalty-flow-test/`)

- `01-activation-page.png`: the activation page.
- `02-after-activation.png`: signed in, Elite card with 500 welcome points.
- `04-redeem-requested-overview.png`, `04-redeem-requested-rewards.png`: 2,500 points, "Request pending".
- `05-reward-issued-overview.png`, `05-reward-issued-rewards.png`: after the reward was issued by hand: 0 points, no code shown.

## What's missing for redemption to work for real customers

1. **Something must process the tag.** Build Flow 3 from `SHOPIFY-FLOWS.md` (trigger: customer tags added, includes `Trigger_Redeem_2500`). It must: check points ≥ 2,500; create a Rs 2,500 single-use code for that customer; take 2,500 points off; save the code on the customer; remove the tag. Owner: you, in Shopify Flow. Without this, turning the Redeem button back on only creates more stuck requests.
2. **The member must receive the code.** Today nothing sends it and the account page doesn't show it, although the page says "your reward arrives by email".
   - Theme: show the latest code on the Rewards tab, with a copy button. This session can do it.
   - Email: a Klaviyo flow or a Flow "send email" step with the code. Needs the Flow from point 1 first.
3. **The tag must come off after issuing.** While it stays on, the account shows "Request pending" for ever and a second request can't start. Part of point 1.
4. **Clear the four waiting requests** (section 1). Either let the new Flow handle them by removing and re-adding the tag, or issue them by hand as on 9 Nov. One of them already holds an unused code. Needs Khizer's go-ahead: it changes customer points.
5. **Decide the audit options first** (`LOYALTY-AUDIT.md`). 104 members can claim Rs 630,000 the moment redemption is on.
6. **Fix the welcome trigger** so points start at account creation, not at record creation (step 2 above).
7. **Then** untick "Pause redemption" in Theme settings and repeat steps 8 to 13 on the QA customer. All must pass before real customers use it.
