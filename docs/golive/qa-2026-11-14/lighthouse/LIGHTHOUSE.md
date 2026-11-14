# Lighthouse: home page, mobile (14 Nov 2026, Saturday)

Lighthouse default mobile settings (slow 4G, 4x CPU). The JSON for every run is in this folder.

| run | before (popup) | after (wheel chip, popup removed) |
|---|---|---|
| 1 | 35 (LCP 7.5 s, TBT 1,304 ms) | 40 (LCP 6.0 s, TBT 1,089 ms) |
| 2 | 45 (LCP 4.6 s, TBT 1,166 ms) | 44 (LCP 5.3 s, TBT 964 ms) |
| 3 | 47 (LCP 4.7 s, TBT 1,430 ms) | 43 (LCP 6.7 s, TBT 764 ms) |
| **mean / median** | **42.3 / 45** | **42.3 / 43** |

- **Result:** the mean is unchanged and the median is 2 points lower, within the "no more than 2 points" limit.
- **TBT:** improved in every run, because the auto-opening popup no longer renders.
- **CLS:** unchanged (0.001–0.04, the same as before).
- **Why the wheel can't affect this score:** it loads only after the page is idle (load + 1.2 s + requestIdleCallback), and only on Saturdays.
- **Caveat:** the lab LCP swings ±2 s between runs on this connection, so these numbers are noisy.
