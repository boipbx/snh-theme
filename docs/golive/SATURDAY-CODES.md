> **14 Nov 2026, 05:30 UTC: switched off. The Saturday 15% SiS deal is IN-STORE ONLY.**
> - All 12 codes below were deactivated (status EXPIRED), not deleted.
> - The website no longer shows or applies the deal anywhere.
> - **Do not run scripts/create-saturday-codes.mjs.** See docs/golive/SATURDAY-SIS-LOG.md.

# Saturday SiS deal codes

**The deal:** 15% off **Science in Sport (SiS)** products only, every Saturday. It is not sitewide.

**Settings for every code:**
- **Applies to:** the collection *SCIENCE IN SPORT | SiS* (id 453152768254, handle `sis`).
- **Valid:** Saturday 00:00–23:59 Sri Lanka time.
- **Customers:** all customers.
- **Limits:** no minimum spend; unlimited uses.
- **Combining:** combines with no other discount.

**No automatic discount.** On 14 Nov 2026 the store had no automatic SiS (or sitewide) Saturday discount, so customers need the day's code. The "Saturday SiS deal" chip/wheel on the site reveals it and can apply it to the cart.

| Saturday | Code | Discount id |
|---|---|---|
| 14 Nov 2026 | SIS15-14NOV | 1895404142846 |
| 21 Nov 2026 | SIS15-21NOV | 1895404175614 |
| 28 Nov 2026 | SIS15-28NOV | 1895404208382 |
| 5 Dec 2026 | SIS15-05DEC | 1895404241150 |
| 12 Dec 2026 | SIS15-12DEC | 1895404306686 |
| 19 Dec 2026 | SIS15-19DEC | 1895404339454 |
| 26 Dec 2026 | SIS15-26DEC | 1895404372222 |
| 2 Jan 2027 | SIS15-02JAN | 1895404404990 |
| 9 Jan 2027 | SIS15-09JAN | 1895404437758 |
| 16 Jan 2027 | SIS15-16JAN | 1895404470526 |
| 23 Jan 2027 | SIS15-23JAN | 1895404503294 |
| 30 Jan 2027 | SIS15-30JAN | 1895404536062 |

## After 30 Jan 2027: create the next codes

1. Preview the next codes. This lists them (from 6 Feb 2027) without creating anything:

```bash
node scripts/create-saturday-codes.mjs --dry-run
```

2. Create the next 12:

```bash
node scripts/create-saturday-codes.mjs 12
```

3. Add the new rows to this table.

**Why the codes must exist:** the theme builds each Saturday's code from the date (SIS15-DDMON). If the code hasn't been created, "Apply to my cart" will say the code isn't valid.
