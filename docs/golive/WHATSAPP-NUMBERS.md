# The two WhatsApp / phone numbers and where each is used (14 Nov 2026)

Nothing was changed. Confirm with Khizer which number is for what, then change it in the one or two places listed.

## +94 76 486 3359
- **Theme setting "SNH WhatsApp"** (`snh_whatsapp`, Theme settings → SNH contact and reviews). Everything below reads this setting:
  - product page "Order on WhatsApp"
  - footer WhatsApp link
  - FAQ sections ("WhatsApp us")
  - contact section
  - account page "WhatsApp support"
  - business / partner / wholesale forms
- **Typed in directly:**
  - Wholesale and Franchise pages (section default)
  - old header's restock and enquiry links (`sections/ss-header-4.liquid`)
  - product FAQ answer in `templates/product.json` ("Call or WhatsApp us on +94 76 486 3359")
  - Locations page headline "CALL US ON +94 76 486 3359"
  - second store card's phone on the home page, footer and Locations page

## +94 77 977 3359
- **Theme setting "WhatsApp" in social links** (`social_whatsapp` = https://wa.me/94779773359): the WhatsApp icon in the social-media row.
- **Typed in directly:**
  - login page help text ("call us or WhatsApp us on +94 77 977 3359")
  - first store card's phone on the home page, footer and Locations page
  - fallback on generic pages (`sections/snh-page.liquid`), used only if the main setting is empty
- **Emails:** the Klaviyo and Shopify email templates say "WhatsApp +94 77 977 3359".

## What this means
- The site's buttons open WhatsApp on **76 486 3359**; the emails and the login page say **77 977 3359**.
- The email footers label them by outlet: **77 977 3359 = Dehiwala, 76 486 3359 = Nugegoda**, plus a third, **76 846 3359 = Wattala** (emails only; check it isn't a typo of the Nugegoda number). If only one outlet answers WhatsApp, the other places are wrong.
- **To change everything driven by the setting:** Theme settings → SNH contact and reviews → WhatsApp number. The typed-in places need a small theme edit; tell me the answer and I'll do it.
