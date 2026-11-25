# SNH app icon (25 Nov 2026)

Source: the storefront header logo `sn_o.png` (shop files, 1283×374, transparent). It is set in white on SNH orange #F65A22 and centred with safe padding: the logo is 64% of the width (56% on the maskable icon). White on orange was crisper than orange on white (`background-compare.png`).

| File | Use |
|---|---|
| `snh-app-icon-1200.png` | Shopify app icon (1200×1200): **upload this** |
| `snh-icon-512.png` | the same at 512 |
| `apps/snh-ops/ui/console-assets/icon-192.png`, `icon-512.png`, `icon-mask.png` (maskable), `apple-touch-icon.png` (180), `favicon.ico` (16/32/48), `favicon-32.png` | SNH Staff PWA and the Ops dashboard (deployed) |

**Where to upload (Dev Dashboard):** dev.shopify.com → **Apps** → **SNH Ops** → **Settings**, under **App icon** → **Upload**, choose `snh-app-icon-1200.png`, then **Save**. If your dashboard shows the icon under the app's version settings instead (Apps → SNH Ops → **Versions** → create version → **App icon**), upload it there and release the version. The icon then shows in the Shopify admin app list and the POS tile.
