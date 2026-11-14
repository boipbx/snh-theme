# Lighthouse mobile, polish round (14 Nov 2026)

Default mobile settings (slow 4G, 4x CPU), 3 runs per page. JSON for every run is in this folder (`polish-*.json`).
The "after" runs for home and collection were taken with the Sunday wheel forced on, so they include its cost.

| page | before | after | median before → after |
|---|---|---|---|
| Home | 38, 38, 41 | 40, 39, 41 | 38 → 40 |
| Collection (whey protein) | 32, 43, 42 | 44, 45, 45 | 42 → 45 |
| Product (Critical Whey 2kg) | 40, 36, 39 | 39, 39, 40 | 39 → 39 |

- **Result:** no page dropped.
- **Product page:** a first "after" batch, taken while the test override was still live, read 35, 41, 34. The table shows the batch on the final theme.
- **Layout shift:** 0–0.004 on every run.
- **Caveat:** lab scores on this connection swing by several points between runs.
