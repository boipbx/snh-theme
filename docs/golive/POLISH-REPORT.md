# Polish round report: Sunday online SiS deal, UI polish, backend audit (14 Nov 2026)

Writes are in `WRITE-LOG.md` (section "14 Nov 2026 polish round"); backups in `backup-2026-11-14/`; screenshots in `qa-2026-11-14/polish/`.

## Phase 0: leftovers
- **Already done and re-confirmed:** "Save with a bundle" row, BUNDLE tag vs Informed Sport badge, SiS gallery images, brand logo chip.
- **Saturday SiS deal is fully off:** all 12 SIS15- codes are expired, no automatic discount exists, and the live check of home, SiS collection, SiS product and cart drawer found nothing. The old Saturday code script now refuses to run.

## Phase 1: Sunday online SiS deal
- **Codes:** 12 created, SUN15-15NOV to SUN15-31JAN (15% off the SiS collection, Sunday 00:00–23:59 Sri Lanka time, combines with nothing). List: `SUNDAY-CODES.md`. Next batch: `scripts/create-sunday-codes.mjs`.
- **On the site, Sundays only:**
  - a "🎁 Sunday SiS deal" chip (bottom left, dismissible for the day, hidden on cart/checkout/account)
  - a spin wheel that always lands on "15% off SiS", then shows the code with "Apply to my cart" and "Copy code"
  - a "−15% online today" label on SiS cards
- **Size:** 5.8 KB gzipped, loaded only on Sundays after the page is idle.
- **Tested with a day override (since removed):**
  - Sunday: chip, wheel, label, focus trap, Esc, no chip on /cart, second open goes straight to the code.
  - Saturday, Monday and today: nothing shows and nothing loads.
- **Real Sunday test (15 Nov, 08:40 Sri Lanka time, no override):** spin → apply → cart showed SUN15-15NOV with Rs 599.85 (15%) off the SiS Hydro line in all 6 runs (3 at 375, 3 at 1440). The chip stayed clear of the add-to-cart bar, was absent on /cart, and reopening went straight to the code. The cart was cleared after each run.
- **Phone label:** it is 12px, 1px under the 13px floor, so it fits beside the quick-add button.

## Phase 2: UI polish
- **Shared tokens** (`assets/snh-v2.css`): spacing scale 4/8/12/16/24/32, card and sheet radius, one popup shadow, two motion speeds.
- **Phones, every template:**
  - Text floor of 13px on the shared meta labels. The scan went from about 25 undersized classes per page to a handful.
  - 44px minimum height on form fields.
  - No sideways scroll on any of the 11 templates.
- **Product page:**
  - Detail text is capped at 68 characters a line.
  - On phones the open Description is clamped with "Read more". The details section went from 3,622px to 1,933px tall.
  - Images inside the details open in the full-screen pinch-zoom viewer.
- **Declutter on phones:**
  - Login and register: the repeated perks list, proof line and helper text under the form are hidden.
  - Cart page: one extra suggestions list instead of two.
- **Popups: one system.**
  - **Gate:** at most one auto-shown popup per session, never before 15 seconds plus a scroll, never on cart, checkout or account. Tested live.
  - **Look:** same radius and shadow, 44px close button.

| Popup | Decision |
|---|---|
| Onboarding prompt ("Not sure what to buy?") | kept, behind the gate |
| Newsletter popup ("Join the SNH list") | kept, behind the gate |
| Campaign promo popup | kept, behind the gate (none configured now) |
| Sunday deal sheet | kept; opens only when tapped |
| Old email-capture popup | already disabled; left off |
| Old envelope popup ("Flat 15% off") | already disabled; left off |
| Saturday popup and wheel | removed earlier today |
| Cookie/privacy banner | untouched (legal) |

- **Lighthouse mobile** (medians, before → after): home 38 → 40, collection 42 → 45, product 39 → 39. Details: `qa-2026-11-14/lighthouse/POLISH-LIGHTHOUSE.md`.
- **Regression check:** 32 page loads (16 URLs at 375 and 1440): all 200 except /pages/contact (404, see audit), no Liquid errors, no sideways scroll, no theme JavaScript errors.
- **Not done:**
  - Account pages behind login (no test login in this environment).
  - A redesign of each template; this round fixed shared components.
  - About a dozen unclassed small labels are still 12px.
  - The old full regression crawl from earlier rounds was replaced by the lighter check above.

## Phase 3: backend audit
Full write-up: `BACKEND-AUDIT.md`. Top 5:
1. **No SMS or WhatsApp sender exists for Sri Lanka.** Klaviyo SMS isn't in use and doesn't cover +94. Next step: Khizer picks a gateway or app.
2. **Referral is only a "coming soon" card.** No link, tracking or rewards exist, and its link setting points to a 404 page. Next step: decide the offer and mechanism.
3. **Loyalty points are being written automatically** (welcome and earn confirmed on live data), but redemption is unproven and 870 balances need reconciling. Next step: one test redemption; Esoft review.
4. **Klaviyo is sending again** (about 30 a day; 470 on the Newsletter list), but the account time zone is wrong and clicks are near zero. Next step: fix the setting, test each email.
5. **Two different WhatsApp numbers** are in theme settings. Next step: confirm the right one.

Also: the "Amose Bundle" app throws a JavaScript error on every product page (an app issue, not the theme).

## Commits
3d54006, 7a7da6c, 52224a1, 873ca51, 5608d41, fca4fcf, fa78b77, plus this report.

## Skipped as outside scope
- Fixing the Amose app error, the WhatsApp number, the Klaviyo time zone and the referral link: all admin settings.
- Any change to prices, stock, customers, points, orders, shipping or payments.
