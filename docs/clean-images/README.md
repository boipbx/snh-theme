# Clean card images (storefront only)

Product cards, the compare table, the menu lists and search show a **clean pack shot**: SNH frame and studio
background removed, product trimmed and sized the same for every product. The **Shopify product images are not
changed** — they keep the SNH frame for Google Shopping, Merchant Center and listings.

- Files: `assets/pc-<product-handle>.webp` (700×700, transparent).
- List: `snippets/snh-clean-list.liquid` = `,handle:main-image-file-name,…`
- Lookup: `snippets/snh-clean-img.liquid` (cards, minis, compare) and `window.SNHClean` (search, assets/snh-v2.js).

The main image's file name is part of the key. If the team uploads a new main image for a product, its card simply
shows the new (framed) image again until the clean copy is regenerated. Nothing breaks.

## Regenerating (new products / changed photos)
1. `python3 inventory.py` (Admin API read: active products + main image; downloads to img/src).
2. `python -m venv rb && rb/bin/pip install "rembg[cpu]" pillow`, then `rb/bin/python proc.py [handles…]`
   (frame crop → AI background removal, isnet-general-use → trim → 86% fill on 700×700).
3. Check the contact sheet; put any bad result's handle in img/reject.txt (that product keeps its normal image).
4. `python3 publish.py` writes the webps + list into the theme; commit and push.

## Product page gallery (Files)
Every gallery image gets a storefront-only copy without the SNH frame (`proc_pdp.py`): pack shots on a plain backdrop
are cut out (transparent, evenly sized); lifestyle / infographic images are only cropped out of the frame and the
SNH mark painted out. Images without a frame are left alone. Copies are uploaded to Shopify **Files** as
`pdp-<media id>.webp` (`upload_pdp.py`, needs the app's read_files + write_files scopes). `sections/snh-product.liquid`
uses `images['pdp-<media id>.webp']` when it exists; otherwise the original image shows. Product media is not changed.
