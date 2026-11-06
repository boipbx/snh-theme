# Images used in the emails

Every image is an absolute https URL on Shopify's CDN. `files/…` are Shopify Files (Content → Files); `t/36/assets/…` are assets of theme 189832462590 (snh-theme/feat/theme-v2): they keep working once that theme is published, but if you delete or replace the theme, upload `snh-koko.png` to Files and update `emails/lib/assets.js`, then rebuild. WebP store photos are requested as progressive JPEG (`format=pjpg`) so Outlook shows them. Product images in order / cart emails come from the platform (Shopify line items, Klaviyo event data). All URLs were HEAD-checked (see CHECK.md).

| key | url | used in |
|---|---|---|
| logo | https://cdn.shopify.com/s/files/1/0258/9625/5550/files/sn_o.png?width=360 | 59 emails |
| koko | https://cdn.shopify.com/s/files/1/0258/9625/5550/t/36/assets/snh-koko.png | 26 emails |
| sisLogo | https://cdn.shopify.com/s/files/1/0258/9625/5550/files/Untitled_design.zip_-_5_62bbd74a-3d19-426e-b1a6-f626a977e647.png?width=240 | 1 emails |
| photoCricket | https://cdn.shopify.com/s/files/1/0258/9625/5550/files/cricket.jpg?width=1200 | 5 emails |
| photoRunning | https://cdn.shopify.com/s/files/1/0258/9625/5550/files/running.jpg?width=1200 | 6 emails |
| photoDehiwala | https://cdn.shopify.com/s/files/1/0258/9625/5550/files/snh_dehiwala.webp?width=1200&format=pjpg | 1 emails |
| photoNugegoda | https://cdn.shopify.com/s/files/1/0258/9625/5550/files/snhnuge.webp?width=1200&format=pjpg | 3 emails |
| photoWattala | https://cdn.shopify.com/s/files/1/0258/9625/5550/files/snhwttla.webp?width=1200&format=pjpg | 0 emails |
| photoInstore | https://cdn.shopify.com/s/files/1/0258/9625/5550/files/instore.webp?width=1200&format=pjpg | 5 emails |
| photoInside | https://cdn.shopify.com/s/files/1/0258/9625/5550/files/khizerinsid.webp?width=1200&format=pjpg | 5 emails |
| pWhey | https://cdn.shopify.com/s/files/1/0258/9625/5550/files/CriticalWheyProtein2kgbyAppliedNutritionfromSportsNutritionHub_6.png?width=400 | 13 emails |
| pCreatine | https://cdn.shopify.com/s/files/1/0258/9625/5550/files/2_3ef6e203-bf8f-4730-9d50-0531c9412579.png?width=400 | 13 emails |
| pGel | https://cdn.shopify.com/s/files/1/0258/9625/5550/files/GoIsotonicEnergyGelsbyScienceInSportfromSportsNutritionHub_7.png?width=400 | 12 emails |
| pShaker | https://cdn.shopify.com/s/files/1/0258/9625/5550/files/ShakerBottle750ml-OrangebySNHfromSportsNutritionHub.png?width=400 | 2 emails |
