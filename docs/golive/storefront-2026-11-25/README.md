# Storefront: CTAs, onboarding, announcement bar, hotspots (25 Nov 2026)

## 1. CTA system
- **Primary:**
  - SNH orange #BF4512 with white text (5.2:1 contrast), at least 48 px tall, bold, with an arrow.
  - A glowing orange edge: a 1 px ring, a soft 4 px halo and an orange drop glow.
  - Hover lifts it 1 px; press shrinks it to 97%. Reduced motion: no movement.
  - Applies to:
    - every `.v-btn--accent` (44 in 32 templates)
    - the quiz band CTA (`.qzb__cta`)
    - cart and drawer checkout (`.scheck`)
    - the email popup (`.snh-np__go`) and campaign popup and banner CTAs (`.cmp-pop__go`, `.cmp-ban__go`)
    - the product page Add to cart, inline and in the sticky bar
- **Secondary:** one outline style, 48 px, bold, 2 px border. Applies to `.v-btn--line` (28) and the product page Buy it now, which was orange and is now the outline.
- **Unchanged on purpose:** small card buttons (`.v-btn--sm`, "+ Add") keep their size; they get the orange edge only.

**Audit (live, 375 px):** every primary is rgb(191,69,18) on white and ≥48 px.

| Page | Primary CTAs now in the system | Secondary |
|---|---|---|
| Home | Shop bestsellers (hero), Find my stack (quiz band), Unlock my plan + 500 points, Shop Science in Sport, Join SNH Elite it's free, Still stuck? WhatsApp us, Subscribe, Sign in (menu/drawer): 16 elements | Find your goal (hero), Create account, Follow on Instagram: 4 |
| Collection | Subscribe, Sign in: 4 | Create account: 2 |
| Product | **Add to cart** (was black), sticky Add to cart (was black), Add bundle × 2, Subscribe, Sign in: 8 | **Buy it now** (was orange), Create account: 3 |
| Cart | **Secure checkout**, Subscribe, Sign in: 5 | Create account: 1 |

**Total CTAs changed:** 33 primary + 10 secondary on these four pages. Theme-wide it is 44 `.v-btn--accent`, 28 `.v-btn--line`, and the 8 special classes above.

## 2. Onboarding card ("What's your goal?")
- **Card:**
  - The eyebrow "Not sure what to buy?" over the heading "What's your goal?".
  - 5 goal chips with icons: Build muscle, Lose fat, Energy & endurance, Recovery & sleep, Daily health.
  - Animated entrance: the card springs up and the chips stagger in.
- **On tap:**
  - A dark teaser appears: "**3 products picked for you**", with the first three in-stock products of that goal's collection.
  - The quiz then opens with the goal already answered, on question 2.
  - On the homepage this happens in place; on other pages it goes to `/?snh-quiz=open&goal=…`.
- **Kept:** "Maybe later", the shared popup gate (one auto popup per session, after 15 s plus scroll, never on cart or account), the 7-day cap, and the hiding rules (member goal tag, quiz answers on this device). "Or take the full quiz" stays as a link.
- **Layout:** a bottom sheet with a grab bar on phones, a corner card on desktop. Reduced motion: no slide or stagger.
- **Test:** 5 chips × 2 widths, alternating the homepage (in place) and a collection page (redirect). **10 of 10** opened the quiz with that goal checked, on question 2 (`goal2`).

## 3. Announcement bar
- Every announcement ends in a **pill button** inside the bar: white with orange text (inverted on cream).
  - The label is a new block setting, **Button label**. When empty it shows "Shop now", or "Join free" for a sign-up or Elite link.
  - Campaign announcements get the same pill.
- On phones the text truncates first, so the pill always shows.
- One attention nudge, 1.2 s after load, once per page; none with reduced motion.

## 4. Shop-the-look hotspots
- **Markers:**
  - 44 px solid orange markers with large white numbers (17 px, weight 800), a white ring, an orange glow and an orange ring pulse.
  - The pulses are staggered per marker. The active marker turns white with an orange number.
- **Reveal:** the first time the image is 35% in view, the markers pop in 1→2→3→4, 0.28 s apart.
- **Unchanged:**
  - The product popover at the dot on desktop (image, name, price, Add to basket, View) and the bottom sheet on phones.
  - The swipeable product row under the image on phones; its number badges are now orange too.

## 5. Performance
- Extra JS: about 2.7 KB in total, all vanilla (onboarding chips, quiz goal pre-answer, hotspot reveal). No new libraries; every animation is CSS.
- Lighthouse mobile, home, 3 runs each (same machine):

| | Run 1 | Run 2 | Run 3 | Median | CLS |
|---|---|---|---|---|---|
| Before | 32 | 38 | 37 | **37** | 0.038 / 0.001 / 0.001 |
| After | 33 | 37 | 36 | **36** | 0 / 0.001 / 0.001 |

The median is −1, within the 3-point limit, and there is no new layout shift. JSON reports: `lighthouse/`.

## Screenshots (375 and 1440)
`before-*` / `after-*` in this folder:
- bar
- onboarding (plus the teaser, and the quiz after a chip)
- hotspots
- CTAs: hero, quiz band, product, cart

The before-cart shots hit Cloudflare's bot check; the after-cart shot shows the empty-cart CTA.
