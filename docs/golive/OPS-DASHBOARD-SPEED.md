# SNH Ops dashboard: load speed (25 Nov 2026)

## Diagnosis (before)
Measured on the live Worker (`/api/*` with a signed session token; the page in Chromium with App Bridge stubbed, because outside the Shopify admin App Bridge redirects).

| Step | Time | Note |
|---|---|---|
| `/api/data` (server + network) | 0.26–0.35 s, 73 KB | 5 D1 reads per request: `data` and `klaviyo` snapshots, sync log, write counter, schema check |
| `/api/status`, `/api/redeem`, `/api/services` | 0.15–0.40 s | not needed for the first numbers |
| Google Fonts CSS | 0.1–0.3 s, **render-blocking** | the page could not paint until it arrived |
| Chart.js (deferred) | 0.35–0.55 s | charts only; numbers do not wait for it |
| First numbers on screen | **0.70–1.02 s (median 0.85 s)** | plus, inside the admin, App Bridge, the session-token round trip and the admin iframe, and every visit started from empty skeletons |

The API was never the slow part. The time went into everything around it: the blocking font CSS, the token round trip, and starting from nothing on every visit.

## Changes
- **One precomputed snapshot.** At the end of every sync, the Worker writes the whole first screen to `snapshots.dash` as one JSON row: numbers, tier counts, bundle tables, Klaviyo and the sync log. `/api/data` reads that one row, plus the live sync state and the write counter. The server now takes about 25 ms (`Server-Timing: dash;dur=8–14, writes;dur=15–24, migrated;dur=12–24`).
- **Instant repeat visits.** The page keeps the last snapshot in the browser (only inside the admin, and cleared on a 401). It draws it at once, labelled "**Data from** 25 Nov, 02:08 · refreshing…", then swaps in the fresh numbers in the background.
- **Fonts no longer block** the first paint (preload, then apply when loaded).
- **Welcome preloader** (first load of a session only):
  - the full-bleed muted SNH brand loop, the same `snh-brand-loop.mp4` as the homepage
  - the SNH Elite logo and "Welcome back"
  - the steps Collecting Elite members… / Counting bundle sales… / Checking emails… / Ready, then a fade into the dashboard
  - on a repeat visit it shows for at most 0.6 s; with reduced motion, a still frame and a progress bar
  - the video URL is store config (`brand.loopVideoUrl`)
- **Layout:** skeletons stay in place under the preloader, so nothing jumps.

## After (3 runs each, median)
| Visit | Before | After |
|---|---|---|
| First visit (no saved snapshot; preloader until the data arrives) | 0.85 s | 1.08 s (0.86–1.23); this includes the preloader fade |
| New admin session (saved snapshot; 0.6 s welcome) | 0.85 s | 0.78 s |
| Reload or return within the session | 0.85 s | **0.12 s** |

All are under the 1.5 s target. Inside the admin the gain is larger, because a repeat visit no longer waits for App Bridge, the token or the network before it shows numbers.

Screenshots: `docs/golive/ops-dashboard-2026-11-25/` (preloader 1280 and 390, reduced motion, dashboard after first, repeat and same-session loads).
