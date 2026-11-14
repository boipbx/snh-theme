# Amose Bundle app: does anything depend on it? (14 Nov 2026)

**Verdict: nothing depends on it. It is safe to uninstall.**

## What was checked
| Where | Finding |
|---|---|
| Theme app embed | One embed, "quantity_options", was switched on in `config/settings_data.json`. It loaded `amose.js` on every product page and printed an empty `amose-bundle` element (0px tall). |
| Theme code | No snippet, section, block or template mentions Amose. The embed was the only trace. |
| What its script did | Threw a JavaScript error on every product page (`initializeAmoseBundle … reading 'map'`). Nothing was shown to shoppers. |
| The app's own data | 4 saved offers: "Creatine Bundle" (1 product), "Shaker Bundle" twice (9 products each), "Vitamin Bundle" (25 products). **All four are switched off.** Last changed 9 Jan 2026. |
| Revenue recorded by the app | Weekly, monthly and all-time revenue are all 0.0. |
| Discounts | No automatic or code discount belongs to an app. The only automatic discounts are two Applied Nutrition ones made in Shopify itself. |
| Products and bundles | No product has Amose data. The 54 live bundles are Shopify's own bundles (26 from the Shopify Bundles app, 28 made by SNH Ops), not Amose. |
| Cart and checkout | The script doesn't load on the cart page. |

## What couldn't be checked
- **Cart transforms:** the SNH Ops app has no permission to list them. Amose's offers are all off and it has never recorded a sale, so an active one is very unlikely.
- **The app's own admin screen.**

## What was changed
- The Amose embed is switched off in the theme (`"disabled": true`). Backup: `backup-2026-11-14/settings_data.before-amose.json`.
- Nothing was deleted. The app's 4 saved offers stay in the app until it is uninstalled.

## To uninstall
Admin → Settings → Apps and sales channels → Amose Bundle → Uninstall. Then add one bundle to the cart to confirm bundles still work.
