# SNH emails

59 email templates for **Shopify Notifications** (15) and **Klaviyo** flows and campaigns (44), in the v2 brand.

- `INDEX.md`: every email (trigger, timing, subject, A/B subject, preheader, file, variables, where to paste).
- `SETUP-SHOPIFY.md` / `SETUP-KLAVIYO.md`: step by step, incl. the profile properties to sync.
- `ASSETS.md`: every image URL. `CHECK.md`: the last validation run.
- `dist/<platform>/<id>.html` (paste this) + `.txt`; `src/<platform>/<id>.mjml` (generated source).
- `preview/index.html`: gallery (desktop + mobile frames, sample data); `preview/shots/`: 600px + 375px screenshots.

Edit copy in `lib/catalog.js`, shared blocks in `lib/modules.js`, images in `lib/assets.js`, then:

    npm install && node build.js && node check.js && node docs.js && node shots.js

This branch (`emails`) is not deployed to the Shopify theme.
