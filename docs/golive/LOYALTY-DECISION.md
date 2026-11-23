# Loyalty decision: audit option 1 (recorded 23 Nov 2026)

**Decision (owner, Khizer, relayed by the project lead on 23 Nov 2026):** option 1 from `LOYALTY-AUDIT.md`, "Elite = accounts only".

- **Members** are customers with an ENABLED Shopify account. Only they count in reports, tier numbers and liability.
- **Customer records with no account** (guest checkout, POS, imported, newsletter) keep their points balance untouched. It is not counted and cannot be redeemed until the person creates an account. No balance is reset or changed.
- **Redemption** is open only to ENABLED accounts with 2,500+ points.
- **Welcome 500 points** go only to an account when it is enabled, once.

## Where it is applied (checked 23 Nov, no code change needed)

| Place | Rule | Code |
|---|---|---|
| SNH Ops dashboard: members, tiers, points, liability, "can redeem" list | member = `state === 'ENABLED'` | `apps/snh-ops/src/metrics.mjs` `isMember` |
| Redeem service | no ENABLED account → refused, status `no_account`, tag removed, no code, no points taken; balance re-checked with the account state before the deduction | `apps/snh-ops/src/redeem.mjs` |
| Welcome points | only ENABLED, only once (`welcome_awarded`), never over an existing balance | `apps/snh-ops/src/redeem.mjs` |
| Theme Redeem button | only on the signed-in account page, so only account holders can reach it | `snippets/snh-app-rewards*` |

Tests: 50 of 50 pass (`node --experimental-sqlite --test test/*.test.mjs`, 23 Nov).

## Known side effect, unchanged by this decision
The "Order paid" automation outside the theme still adds points to records with no account. Under option 1 those points are hidden until the person signs up. Stopping that is a separate decision (`LOYALTY-AUDIT.md`, "Recommended fix").
