# Klaviyo check (14 Nov 2026, API only)

## Sign-ups
- **The Newsletter list is receiving sign-ups.** 470 people; the newest joined today at 14:37 UTC.
- **Where they come from:** 37 of the newest 40 arrived through Shopify ("Customer Webhook"). That is the route used by both the register page and the footer form: they create or update a Shopify customer with email consent, and Shopify passes it to Klaviyo. The other 3 are our own tests from 10 Nov.
- **Not checkable by API:** which of the two forms each person used. Shopify sends both the same way.

## Account time zone
- **"Indian/Reunion" (UTC+4).** It should be Asia/Colombo (UTC+5:30). Fix in Klaviyo → Settings → Organization.

## Last 7 days, per flow

| Flow | Sent | Opened (people) | Open rate | Clicked | Bounced | Spam complaints |
|---|---|---|---|---|---|---|
| SNH · Welcome series | 76 | 14 | 18% | 0 | 4 | 0 |
| SNH · Post-purchase | 29 | 8 | 27% | 0 | 0 | 0 |
| Customer Winback - Standard (old) | 23 | 15 | 65% | 1 | 4 | 0 |
| SNH · Abandoned checkout | 20 | 2 | 10% | 0 | 0 | 0 |
| SNH · How to use | 14 | 2 | 14% | 0 | 0 | 0 |
| Abandoned Cart (old) | 10 | 7 | 70% | 0 | 1 | 0 |
| SNH · Abandoned cart | 9 | 2 | 22% | 1 | 0 | 0 |
| Customer Thank You (old) | 8 | 13 opens | n/a | 0 | 0 | 0 |

- **Delivered:** Klaviyo records "received" as delivered. Bounces: 9 in total (4 in Welcome, 4 in the old win-back, 1 in the old cart flow). No spam complaints. 1 unsubscribe.
- **The pattern that matters:** the old flows were opened by 65–70% of people; the new "SNH ·" flows by 10–27%. Same sender, same list, same week.
- **Clicks:** 2 from about 190 emails.

## Links in the top 5 sending flows
Checked all 11 emails in Welcome series, Post-purchase, Abandoned checkout, How to use and Abandoned cart.
- **All fixed links are valid:** home, all products, SNH Elite page, account, blog, the 4 product pages (all active and in stock), WhatsApp, Instagram, Facebook, TikTok.
- **Dynamic links** (cart/checkout link, product link, bundle link) use Klaviyo variables with a fallback to the store.
- **Every email has an unsubscribe link** and has UTM tracking switched on.
- **Nothing was broken, so nothing was changed.**
- **Three phone numbers appear in the email footers:** Dehiwala +94 77 977 3359, Nugegoda +94 76 486 3359 and **Wattala +94 76 846 3359**. The Wattala number looks like the Nugegoda one with two digits swapped. Confirm it's real; I didn't change it.
- **WhatsApp link in the emails:** 76 486 3359.

## Click tracking domain
- **Not visible through the API.** Check in Klaviyo → Settings → Domains: whether a branded sending domain and a dedicated click-tracking domain are set up and verified for sportsnutritionhub.lk.

## What's broken, and who fixes it
1. **Low opens on the new flows (10–27% vs 65–70%).** The most likely cause is inbox placement: the new, heavier branded emails landing in Promotions or spam. It could also be that the old flows went to a more engaged group. You: send one new-flow email to a Gmail and an Outlook address and see where it lands; check the sending domain in Settings → Domains.
2. **Almost no clicks.** Follows from the low opens. Test every button in a real inbox.
3. **Time zone.** You, in settings.
4. **Welcome series bounces (4 of 76, about 5%).** Worth watching; high for a welcome email and usually means mistyped addresses at sign-up.
5. **Still silent:** Browse abandonment, Review request, Replenishment, new Win-back, Sunset. Some have long waits; Browse abandonment should be sending.
