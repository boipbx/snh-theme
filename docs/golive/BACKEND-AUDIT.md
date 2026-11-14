# Backend audit: referrals, SMS/alerts, loyalty points, Klaviyo (14 Nov 2026)

Read-only. Checked through the Shopify Admin API (SNH Ops app), the Klaviyo API and the theme code. Things the API can't see (installed apps list, Shopify Flow, notification settings) are marked "check in admin".

## 1. Refer a friend

**How it works now**
- **Nothing is live.** There is no referral app, no referral metafield, no referral Klaviyo flow, and nothing writes referral rewards.
- **What the site shows:** the account page has a card "Referral rewards are coming soon" with a "notify me" button.
  - The button adds the tag `notify:referrals` to the customer. That's all it does.
  - The card's "live" switch (`refer_live`) is off. Its link setting points to /pages/contact, which is a **404 page** (it doesn't exist).
- **Old account template:** `sections/main-customers-account.liquid` still has a dark card "Get your referral link" that links to the contact page. It is not the template in use.
- **No link is created or tracked.** The friend gets nothing and the referrer gets nothing, because no system exists behind the card.

**What's broken**
- The default heading text "Give Rs 500, get Rs 500" is a promise with no mechanism. It only shows if someone turns `refer_live` on.

**Fix and who does it**
- **Dead link:** before turning referrals on, point the card at a real page (you, in the theme editor).
- **Decide the offer** (Khizer): for example, friend gets Rs 500 off the first order, referrer gets 500 points after it's paid.
- **Pick a mechanism** (needs an app or Khizer's approval):
  - a referral app (ReferralCandy, Smile, BON), added as an app block on the account page; the theme already has the slot, or
  - a simple build by this session: one personal code per member (`REF-<id>`), plus a Flow that adds points to the referrer when that code is used.
- **Until then:** leave `refer_live` off. Nothing to fix in the theme.

## 2. SMS, WhatsApp and alerts

**How it works now**
- **Klaviyo SMS: not in use.**
  - The "SMS Subscribers" list has 0 people.
  - The account has no SMS metrics at all (nothing sent, received or failed).
  - Klaviyo SMS does not send to Sri Lanka numbers, so it can't be the SMS channel here.
- **Shopify:** order and shipping notifications go by email. SMS versions exist only if a customer gave a phone number at checkout and Shopify's SMS notifications are on (check in admin: Settings → Notifications).
- **WhatsApp:** only click-to-chat links (wa.me). Nothing sends WhatsApp messages automatically.
- **Login:** classic accounts with email + password. No OTP or SMS login.
- **Apps seen in the theme:** Klaviyo, Judge.me, Trafficly, Appstle, Clarity, a quantity-options app and "brandAgents". None is an SMS sender. The full app list needs admin.

**Which event triggers what**

| Event | What goes out today |
|---|---|
| Order placed | Shopify email, plus Klaviyo "Post-purchase" (27 sent in 7 days) |
| Shipped / out for delivery | Shopify email |
| Ready for pickup | Shopify email; Klaviyo "Click & collect · Reminder" flow is live, but the service that feeds it is not deployed |
| Abandoned cart / checkout | Klaviyo email (9 and 19 sent in 7 days) |
| Sign-up | Klaviyo "Welcome series" (67 sent in 7 days) |
| OTP / login | nothing (password login) |
| Any SMS or WhatsApp alert | nothing |

**What's broken or missing**
- **Two different WhatsApp numbers** in theme settings: `social_whatsapp` is +94 77 977 3359 and `snh_whatsapp` (product page "Order on WhatsApp") is +94 76 486 3359. Confirm which is right; it's a one-field change in Theme settings.
- **Phone numbers from sign-up aren't usable:** the register form saves the mobile number into the customer *note*, not the phone field, and collects no SMS consent. So there is no SMS audience even if a sender existed.
- **No SMS sender for Sri Lanka** is connected.
- **The "phone number connection set up recently"** isn't visible through either API. Tell me what it was (WhatsApp Business? an SMS gateway?) and I'll check it.

**Fix and who does it**
- **WhatsApp number:** you, in Theme settings (2 minutes).
- **SMS to Sri Lanka:** needs a local gateway or app (Notify.lk, Dialog/Mobitel bulk SMS, or a Shopify SMS app that supports +94). Needs Khizer's approval and a sender ID.
- **Order alerts by WhatsApp:** needs the WhatsApp Business API through an app (for example Interakt or Wati). Needs approval.
- **Capture phone + consent:** once a sender is chosen, this session changes the register form (theme only).

## 3. Loyalty points

**How it works now: points are being written automatically.**
- **Welcome 500:** all 60 of the newest customers (created since 12 Nov) have points, written 1–2 seconds after sign-up.
- **Earn on paid orders:** of the last 40 paid orders, 38 had the customer's points and yearly spend updated in the same minute as the order: POS (29), draft orders (7) and web (2).
- **Redeem 2,500:** not proven. Only the 3 reward codes created by hand on 9 Nov exist, none used. No new `ELITE-` code has appeared since.

**What's unknown**
- **What does the writing:** the API can't see Shopify Flow or the Esoft sync. Check in admin: Apps → Flow → run history.
- **Whether redemption is automated:** when a member redeems, check that a code appears and 2,500 points come off.

**What's broken**
- **870 older balances** are lower than the formula (listed in `points-review.csv` on 9 Nov). They still need reconciling with Esoft.
- **Orders aren't tagged `points_awarded`,** so there is no per-order audit trail.

**Fix and who does it**
- **You in admin:** open Flow's run history and confirm the three workflows (welcome, earn, redeem) and that they show no errors.
- **One test redemption** by a staff account, to prove the redeem path.
- **Esoft + Khizer:** the 870 balances.

## 4. Klaviyo

**How it works now**
- **Sign-ups reach the Newsletter list:** 470 people on it; 5–16 new subscribers a day over the last 7 days.
- **Flows are sending again** (they had stopped on 8 Nov): about 30 emails a day for the last 4 days. Opens 9–15 a day; clicks almost none (3 in 7 days).
- **14 flows live, 4 old ones in draft.**

| Flow | Emails in 7 days |
|---|---|
| SNH · Welcome series | 67 |
| SNH · Post-purchase | 27 |
| Customer Winback - Standard (old, now draft) | 23 |
| SNH · Abandoned checkout | 19 |
| SNH · How to use | 14 |
| Customer Thank You (old, now draft) | 12 |
| Abandoned Cart (old, now draft) | 10 |
| SNH · Abandoned cart | 9 |
| Post-Purchase Followup (old, now draft) | 2 |

**What's broken**
- **Account time zone is "Indian/Reunion"** (UTC+4), not Sri Lanka (UTC+5:30). Scheduled sends and reports are 90 minutes off.
- **Old and new flows overlapped this week** (old ones still sent 47 emails before they were drafted), so some customers got two versions.
- **Clicks are near zero** (3 from about 180 emails). Worth checking links and button rendering in a real inbox.
- **No sends from:** Browse abandonment, Review request, Replenishment, Win-back (new), Sunset. Some need time (25–90 day waits); Browse abandonment should already be sending and needs a look.
- **"Quiz takers" list is empty,** so quiz answers aren't reaching Klaviyo.
- **"Submitted Form" is 0:** Klaviyo's own forms aren't in use (the site uses its own popup), which is fine.
- **Click & collect flows** are live but will never fire until the service in `scripts/click-collect/` is deployed.

**Fix and who does it**
- **Time zone:** you, in Klaviyo → Settings → Organization (1 minute).
- **Browse abandonment and quiz list:** this session can check the triggers through the API; say the word.
- **Click tracking:** send yourself one of each live email and tap every button.
- **Click & collect:** deploy steps are in `CLICK-COLLECT-DEPLOY.md`.

## Top 5, in order
1. **No SMS/WhatsApp sender exists for Sri Lanka.** Choose a gateway or app (Khizer).
2. **Referral is only a "coming soon" card.** Decide the offer and the mechanism (Khizer).
3. **Loyalty redemption is unproven and 870 balances need reconciling.** One test redemption; Esoft review.
4. **Klaviyo time zone is wrong and clicks are near zero.** Fix the setting; test the emails.
5. **Two WhatsApp numbers on the site.** Confirm the right one in Theme settings.

## Also found
- **A third-party app throws a JavaScript error on every product page:** "Amose Bundle" (`initializeAmoseBundle … reading 'map'`). It doesn't break the page, but the app is misconfigured or unused. You, in admin: open the app and fix or remove its product-page embed. The theme can't fix an app's script.
