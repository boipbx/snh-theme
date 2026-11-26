# SNH Ops dashboard v3 (26 Nov 2026)

Only the presentation changed. Data, endpoints, exports (same columns, checked against v2), the snapshot and cache, the preloader and auth are as before.

## Design system (`apps/snh-ops/ui/app.html`, `:root`)
- **Font:** Inter 400/500/600/800 only; tabular figures for numbers.
- **Colours:**
  - background #F4F2ED, cards #FFFFFF with a 1 px rgba(23,19,15,.07) border, ink #17130F, muted rgba(23,19,15,.58)
  - SNH orange #E0521C (brand and accents), soft #FFF1E8, success #2F9E6B, danger #D64545
  - tiers: Bronze #B87A4B, Silver #9AA3AE, Gold #D4A63A
  - chart palette: orange, teal #2F8F8A, slate #4F5D75, sand #C9A77C, plum #7A5C8E, sage #8BA888, plus #D9D5CE for "Other" only
- **Radii:** cards 20 px, controls 12 px, pills 999 px.
- **Spacing scale:** 4 / 8 / 12 / 16 / 24 / 32 / 48.
- **Shadows:** one card shadow, plus a deeper one on hover.
- **Easings:** `--out` and `--spring`; durations 200 / 400 / 700 ms.
- **Buttons:** primary, secondary and ghost (plus a danger variant of secondary, for Full resync).
- **Decision (contrast):** primary buttons use #C9481A, a slightly deeper SNH orange, because white text on #E0521C is 3.9:1, under the 4.5:1 target; on #C9481A it is 4.75:1. #E0521C stays for the logo, chart series, the tab underline and the focus ring.

## What changed per tab
- **Header:**
  - The store's header logo (sn_o.png, orange on light) with "Ops" in Inter 800.
  - A "Data from …" chip with a sync dot, the range picker and Refresh, all in one aligned row.
  - Tabs with a sliding spring underline.
- **Overview:**
  - 8 KPI cards: label, then a big value that counts up, then one delta line ("▲ 23.6% vs previous 30 days").
  - Secondary detail moved into "i" tooltips (for example, all-records points and Rs values).
  - Gradient sparklines.
  - Revenue chart rebuilt: smooth members vs guests areas, a crosshair tooltip, today marked as partial ("today so far", dashed and shaded), and legend toggle chips.
  - **Members by tier** donut replaced by tier rows: chip, account count, all records, a log-scaled bar, and "N within 10% of the next tier"; the card fits its content.
  - Member growth chart rebuilt.
- **Loyalty:**
  - 8 KPI cards, with liabilities in compact form and the full value in the tooltip.
  - All tables restyled: right-aligned number headers and cells, sticky header, hairline rows, sort indicators, status pills.
  - Members table header alignment fixed (Points, Yearly spend and Last order).
- **Bundles:**
  - Stacked bars rebuilt: top 5 in the palette, "Other" in grey, rounded tops with a 1 px gap.
  - The tooltip follows the cursor above the column (or beside it when the column is tall) and lists each segment plus the total.
  - A **Stacked/Total** toggle.
- **Operations:**
  - The Klaviyo table is full width, so no columns are clipped.
  - Rows size to their content: no stretched, half-empty cards.
  - Sync types are capitalised; status pills for results, modes, code status and services.
  - Process now is the primary button.

## Charts
All charts are inline SVG from one small module (`CH.area`, `CH.bars`); Chart.js is removed. They share:
- smooth mid-point curves
- gradient fills
- 6% gridlines, 12 px muted axis labels and collision-free labels
- a 700 ms draw-in when the chart comes into view
- resize without jank (ResizeObserver)
- no animation when reduced motion is set

## Audit fixes (17)
1. **Page sideways scroll from hidden "i" tooltips** at 1440, 1024 and 390. Tooltips now take no space until shown and flip side near the right edge.
2. **v2 sideways scroll at 1024** (5 px).
3. **X-axis labels colliding** ("24 No26 Nov").
4. **"today so far" label on the line:** it now sits in a shaded band at the top of the plot.
5. **Member growth chart blank** (a `min: 'auto'` bug).
6. **Charts below the fold blank in screenshots and in rare cases:** charts now always draw, and the animation replays on view.
7. **Charts first drawn at zero width** (console errors): they now wait for a real width.
8. **Stretched half-empty cards** (Data health, Data sync, Click & collect, Members by tier).
9. **Klaviyo table clipped:** now full width.
10. **Lowercase sync types.**
11. **Range picker cut off at 390.**
12. **Tabs cut off at 390.**
13. **Primary button contrast** 3.9:1 → 4.75:1.
14. **Export header labels** I had shortened: restored, so exports keep identical columns.
15. **Members table header alignment.**
16. **Console: mid-word wrapping** in the orders and audit tables.
17. **Console demo:** its security policy blocked the Inter font.

## Unified controls
- **Buttons:** 27 on the dashboard now use the three styles:
  - 10 CSV/Excel export pairs
  - Refresh ×2, Full resync, Process now, Previous/Next, Try again
- **Other controls:** the 5-option range picker and the Stacked/Total switch share one segmented style, and legend chips share one chip style.
- **Form controls:** 7 restyled (2 selects, search, 2 dates, 2 checkboxes): 40 px, 12 px radius, orange 30% focus ring.
- **Staff console:** same tokens, Inter, a light header with the store logo, and the same orange and focus ring.

## Verify
- **Tests:** 75 pass, including the new `test/ui-lib.test.mjs`: the number formatter, change, axis ticks, label spacing, smooth paths and tier rows.
- **Speed:** first numbers on screen in 0.91 s (first visit), 0.74 s (new session, with the welcome screen) and 0.12 s (same session), measured on the live Worker with a signed session token.
- **No sideways scroll** at 1440, 1024 or 390 on any tab.
- **Screenshots** (`before-*` and `after-*`, every tab at 3 widths, plus the preloader, loading, error and empty states):
  - contact sheets: `contact-sheet-1440.jpg`, `-1024.jpg`, `-390.jpg` and `-states.jpg`
  - console: `console/`
