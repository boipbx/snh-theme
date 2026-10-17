# SNH Design System
Feel: Huel-level confidence + Beast Nutrition punch + Apple smoothness. Bold, clean, fast. Fewer things, said louder.

## Colour
- --snh-ink: #0E0E0E (text, dark sections)
- --snh-canvas: #F6F4F1 (page background, warm off-white)
- --snh-surface: #FFFFFF (cards)
- --snh-soft: #ECE8E2 (product image tiles, chips)
- --snh-line: rgba(14,14,14,.10) (hairlines)
- --snh-muted: #6B6660 (secondary text)
- --snh-accent: SNH's existing brand orange — extract the exact hex from config/settings_data.json / logo, don't invent one
- --snh-success: #2FA866
Rules: orange is the ONLY accent. Used for primary CTAs, sale badges, key highlights. Never as large background areas except one hero/loyalty band. Colour otherwise comes from product photography.

## Type (max 2 families, 3 weights each)
- Display/headings: "Archivo" (Shopify font library), weights 700/800, tracking -0.03em, line-height 0.95–1.05
- Body/UI: "Inter" (Shopify font library), weights 400/500/600
- Set both through theme settings so they apply everywhere, then remove every hardcoded font-family in custom sections (snh-*, ss-*, ai_gen_block_*, Custom Liquid/HTML blocks).
Scale (desktop / mobile):
- display: 96 / 48 (hero only, uppercase allowed)
- h1: 64 / 40
- h2: 44 / 30
- h3: 24 / 20
- body: 16 / 16, line-height 1.55
- small: 13 / 13
- eyebrow: 12 / 12, uppercase, tracking .12em, weight 600, muted or accent

## Spacing
Scale: 4 8 12 16 24 32 48 64 96 128. Section padding 96 desktop / 56 mobile. Page gutter 40 desktop / 20 mobile. Max content width 1320.

## Radii
Buttons 12, inputs 12, cards 20, image tiles 16, pills/chips 999.

## Buttons (one system, every button on the site uses it)
- Primary: accent bg, white text, 52px tall (48 mobile), 0 28px padding, Inter 600 15px. Hover: darken 8%, translateY(-1px).
- Secondary: ink bg, white text, same size.
- Outline: transparent, 1.5px ink border.
- Text link: ink, underline offset 4px on hover.
All transitions 200ms cubic-bezier(.22,1,.36,1).

## Product card (most important component)
Image on --snh-soft tile (radius 16, 1:1, product centered with padding), brand eyebrow, product name Inter 600 15px (2 lines max), price Inter 600, Koko "or 3 × Rs X" line small muted, flavour count chip if variants, one-tap add button on hover (desktop) / always-visible small + button (mobile). Badges top-left: "Sale" (accent), "New", "Sold out" (muted). No per-card inline CSS — one shared stylesheet.

## Motion
Easing cubic-bezier(.22,1,.36,1). Durations 200–300ms UI, 500ms reveals. Sections fade-up 16px on scroll (IntersectionObserver, once). Card hover: image scale 1.03. Respect prefers-reduced-motion (disable all).

## Performance rules
- One design-system stylesheet (assets/snh-design-system.css) loaded once.
- No CSS repeated per product card or per section instance.
- Preload hero image, lazy-load everything else, explicit width/height on images.
- font-display: swap.
- ONE popup on the site: newsletter only, shown after 12s or 50% scroll, never on first paint, once per visitor. Hide the envelope voucher and any other popup.
- Defer non-critical app scripts where possible.

## Don't
No new colours, no gradients except subtle image overlays, no drop shadows heavier than 0 8px 24px rgba(0,0,0,.08), no more than one font size per role, no centered body paragraphs longer than 2 lines.

---

## Resolved values (implementation notes)
- **--snh-accent: #E0521C.** Sampled from the live logo files (`ffd.png`, `sn_o.png`: dominant pixel `#E1541E`) and matched to the orange already used most in the theme code (`#E0521C`, 108 occurrences). `config/settings_data.json` holds no orange (its accents are Impact defaults), so the logo is the source of truth.
- Accent hover (darken 8%): **#C64516**.
- Tokens live in `assets/snh-design-system.css`; theme fonts are set in `config/settings_data.json` (`heading_font`, `text_font`).
