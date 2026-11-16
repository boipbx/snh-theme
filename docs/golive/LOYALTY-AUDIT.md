# SNH Elite loyalty audit (16 Nov 2026)

Read-only. Built from a full export of all 20,158 customer records and all 39,954 orders on 16 Nov. No customer points, tiers, tags or metafields were changed.

## The short answer

- **The 20,158 "Elite members" is every customer record in Shopify, not real members.** Only **1,578** have an active account. The dashboard counted anyone with a points value, and every record has one.
- **Points outstanding: 18,276,318 (Rs 18.28M at 1 point = Rs 1).** Only **1,831,408 (Rs 1.83M)** sit with people who have an account. The other **16,444,910 (Rs 16.44M)** sit on records with no account.
- **Two things put points on non-members:** the 9 Nov back-fill, and an automation that gives 500 points to every new customer record, including guest checkouts and POS customers.
- **Nobody without an account can redeem.** Redeem lives on the account page. So the real exposure today is the 104 account holders with 2,500+ points: **Rs 630,000** in rewards they could claim now.
- **Redemption is paused** on the site since 16 Nov (theme setting, reversible).

## A. Who the 20,158 are

**Account state**

| State | Records | Points held |
|---|---|---|
| ENABLED (has an account, can sign in) | 1,578 | 1,831,408 |
| INVITED (invite sent, not accepted) | 59 | 49,160 |
| DISABLED (no account: guest, POS or imported record) | 18,521 | 16,395,750 |
| DECLINED | 0 | 0 |

**Where the record came from** (first order's channel, or how it was created if there is no order)

| Source | Records |
|---|---|
| First order in store (POS) | 7,256 |
| First order online (web checkout 6,662, iPhone app 572, checkout_next 308, Android app 69, channel 580111 258) | 7,869 |
| First order was a staff draft order | 837 |
| No order: created an account | 567 |
| No order: newsletter or form sign-up | 932 |
| No order: other (import, POS profile, app) | 2,697 |

**Placed an order:** yes 15,963, no 4,195.

**Email marketing consent:** subscribed 2,887, not subscribed 5,952, unsubscribed 107, no email on the record 11,212.

**Points bands**

| Points | All records | With account (ENABLED) | No account |
|---|---|---|---|
| 0 | 0 | 0 | 0 |
| 1–499 | 2 | 1 | 1 |
| exactly 500 | 12,293 | 954 | 11,339 |
| 501–2,499 | 7,131 | 519 | 6,612 |
| 2,500+ | 732 | 104 | 628 |

**Tiers (all records):** Bronze 20,058, Silver 78, Gold 22.

## B. Where the points came from

**1. The 9 Nov back-fill (this project's script, logged in `LOG.md`)**
- 13,638 of the 20,158 points values were first written on 9 Nov.
- It gave 9,927 customers with no balance 500 welcome points and Bronze, and gave 3,667 customers formula points from their order history (about 6.79M points; these carry the `points_backfill` flag).
- It did not check whether the customer had an account. 12,779 of those records have no account; they received 10,738,254 points. 859 account holders received 1,106,486.

**2. Points that were there before 9 Nov**
- 5,801 no-account records already held 5,706,656 points. The first values date from 1–5 April 2026, so an older system (Shopify Flow, the Esoft sync or an app) has been awarding points to every record since then.

**3. The welcome 500, "within 2 seconds"**
- All 164 customer records created since 10 Nov got points within 5 seconds of being created.
- **126 of the 164 have no account:** POS 64, online guest checkout 32, staff draft order 20, newsletter or form 12, other 12 (the same count as newsletter by coincidence).
- So the trigger is **"customer created"**, on any channel. It is not "account created".
- What does the writing can't be seen through the API (Flow and apps are not exposed). It writes `loyalty_points`, `loyalty_tier` and `annual_spend` together. The most likely source is the Shopify Flow "welcome points" workflow (`SHOPIFY-FLOWS.md`, Flow 1, trigger "Customer created"). Check in admin: Apps → Flow → run history.
- An order-paid automation also awards points to no-account records (a draft-order customer got 750 points 2 seconds after the order).

**4. Customers with 2,500+ points**

| | Records | Points | Whole rewards they could claim |
|---|---|---|---|
| With account (ENABLED) | 104 | 729,270 | 252 rewards = Rs 630,000 |
| No account | 628 | 3,547,782 | 1,203 rewards = Rs 3,007,500 (only if they create an account) |

## C. Redemption pause

- **On.** Theme setting "Pause redemption" (`loyalty_redeem_paused`), Theme settings → SNH Elite.
- The account page shows "Rewards are being updated, check back soon" and prints no Redeem button or form.
- To undo: untick the setting. No customer data was touched.
- Backup of the edited files: `docs/golive/backup-2026-11-16/`.

## D. Three options for Khizer

| | 1. Elite = accounts only (recommended) | 2. Reset no-account balances to 0 | 3. Keep as is |
|---|---|---|---|
| Members counted | 1,578 | 1,578 | 20,158 |
| Points outstanding (members) | 1,831,408 | 1,831,408 | 18,276,318 |
| Rs liability shown | Rs 1.83M, plus Rs 16.44M hidden | Rs 1.83M | Rs 18.28M |
| Claimable right now | Rs 630,000 (104 members) | Rs 630,000 (104 members) | Rs 630,000 now; Rs 3.64M if no-account holders sign up |
| Customer data changed | none | 18,580 records set to 0 | none |

**Option 1. Elite = only ENABLED accounts.**
- Reports and emails count 1,578 members and Rs 1.83M outstanding.
- The 18,580 no-account records keep their balance, hidden. It becomes live when they create an account.
- Risk: the hidden Rs 16.44M is still a promise. 628 of those records would have a reward ready the day they sign up (Rs 3.0M).
- Needs no data change. The dashboard already works this way from today.

**Option 2. Reset no-account balances to 0.**
- Removes 16,444,910 points from 18,580 records. Liability drops to Rs 1.83M for good.
- Risk: 5,801 of those records held 5.7M points before the back-fill, some of it earned on real in-store purchases. Wiping them could upset regular POS customers.
- A middle path: reset only what the 9 Nov back-fill gave to no-account records (12,779 records, 10.74M points) and keep the older 5.7M.
- Needs a full backup and Khizer's written approval. Not done.

**Option 3. Keep as is.**
- 20,158 "members", Rs 18.28M outstanding, growing by 500 with every guest checkout and POS sale to a new customer (about 125 no-account records in the last week = 62,500 points).

## Recommended fix for the welcome points

- **Change the trigger so it fires only when an account is created or activated**, never for guest checkout, POS or newsletter records.
- In Shopify Flow: keep the "Customer created" trigger but add the condition **customer account state = Enabled**, and add a second workflow on **"Customer account enabled"** for people who activate later. Both keep the existing "points is empty" check so nobody is paid twice.
- Apply the same account check to the order-paid workflow if option 1 or 2 is chosen with "no points without an account".
- Until that is done, every new guest or POS customer keeps getting 500 points.

## Still to confirm in admin (the API can't see these)

- Which Flow, app or Esoft job writes the points: Apps → Flow → run history.
- Whether Esoft also reads these balances in store. If POS staff can redeem points at the till, no-account balances are spendable there and option 1's "hidden" balance is not fully hidden.
