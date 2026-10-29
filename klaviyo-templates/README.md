# SNH Elite · Klaviyo email templates (Round 10 drafts)

HTML files only. Nothing here is connected to Klaviyo. To use one: Klaviyo → Templates → Create → *Import HTML*,
paste the file, then attach it to the flow in ELITE-ROADMAP.md §7.

| File | Flow |
|---|---|
| `welcome.html` | Welcome + 500 points |
| `points-statement.html` | Month-end points statement |
| `tier-progress.html` | Tier progress nudge |
| `near-reward.html` | Near-reward nudge |
| `replenishment.html` | Replenishment reminder |
| `birthday.html` | Birthday |
| `win-back.html` | Win-back |
| `review-request.html` | Post-purchase review (Judge.me link) |

Brand: Inter (+ Instrument Serif italic accents), SNH orange `#E0521C`, ink `#0C0C0D`, cream `#F4EFE6`, 600px,
table layout with inline styles for Outlook/Gmail. Variables use Klaviyo syntax: `{{ first_name }}`,
`{{ person|lookup:'loyalty_points' }}`, `{{ event.… }}`, `{% unsubscribe %}`. The person properties and events are
listed in ELITE-ROADMAP.md §5.5 and §7; they're synced by the SNH Elite app. No offer or amount is hard-coded:
rates, thresholds and reward values come from properties. Generated from one layout, so keep edits consistent.
