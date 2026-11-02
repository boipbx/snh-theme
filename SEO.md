# SEO for the business pages (Round 17)

Paste these in Shopify admin → Online Store → Pages → (page) → Search engine listing → Edit.

## Wholesale (`/pages/wholesale-1`, template `page.wholesale`)

- **Page title (SEO title, 56 characters):**
  `Wholesale Supplements Sri Lanka | Gyms & Retailers | SNH`
- **Meta description (154 characters):**
  `Wholesale supplements in Sri Lanka: bulk whey protein, creatine and SiS for gyms, retailers and coaches. Official SiS distributor. Apply for trade prices.`
- Keep the URL handle `wholesale-1`.

## Franchise (`/pages/franchise-partner`, template `page.franchise`)

- **Page title (SEO title, 50 characters):**
  `SNH Franchise Opportunity Sri Lanka | Open a Store`
- **Meta description (144 characters):**
  `Open an SNH supplement store franchise in Sri Lanka. 18+ brands, the official SiS distributorship, training, stock and marketing. Enquire today.`
- Keep the URL handle `franchise-partner`.

## On-page SEO already in the theme

- One H1 per page (the hero heading), H2 per section, H3 per card.
- About 1,000 words of copy per page with the local terms: wholesale supplements Sri Lanka, bulk whey protein,
  creatine wholesale Colombo, gym / retailer supply; franchise opportunity Sri Lanka, supplement store franchise.
- Structured data: Organization (with the WhatsApp contact point and social profiles), BreadcrumbList (printed by the
  layout for every page), FAQPage (from the FAQ section).
- Descriptive alt text on content photos (store gallery, copy photos); decorative backgrounds have empty alt.
- Internal links to whey protein, creatine, Science in Sport, SNH Elite, store locations, and between the two pages.
- Images below the hero are lazy-loaded; the hero image loads eagerly with a high fetch priority.

## How the form emails are delivered

Both forms are Shopify's native contact form (`{% form 'contact' %}`), posted normally, so Shopify's spam protection
(hCaptcha) runs. Shopify emails each submission to the **store's sender / contact email** (Settings → Notifications →
Sender email; the "Contact form" notification goes to the store contact email set in Settings → General).

Each email includes every filled field, plus three hidden fields that tell you which form it came from:

| form | `contact[Subject]` | `contact[form]` | `contact[tags]` |
|---|---|---|---|
| Wholesale | `[Wholesale enquiry]` | `wholesale` | `wholesale-lead` |
| Franchise | `[Franchise enquiry]` | `franchise` | `franchise-lead` |

Products of interest arrive as separate lines (`Interest – Whey protein: Yes`). The mobile number is saved as
`+94XXXXXXXXX`.

**Routing to separate inboxes.** Shopify sends every contact form to the same store email, so:

1. **Simplest:** in your mail app, make a filter on the subject prefix `[Wholesale enquiry]` / `[Franchise enquiry]`
   that forwards to the right person (e.g. a wholesale@ and a franchise@ address).
2. **Shopify Forms app:** recreate the two forms in Shopify Forms to get per-form notification emails, and swap the
   theme form section for the app block. Leads are stored as customers with the form's tags.
3. **Klaviyo:** with the Klaviyo integration, use a Klaviyo sign-up form or a flow triggered by the
   `wholesale-lead` / `franchise-lead` tags to notify different team members and keep a lead list.
