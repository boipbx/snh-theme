# Workout plans: library and a metaobject for later (Round 18)

**Today:** the 12 plans are one JSON block in `snippets/snh-workout-plans.liquid`. Both places that show a plan render it:
- the homepage quiz band (`sections/snh-quiz-band.liquid`)
- the account Goals tab (`snippets/snh-app-goals.liquid`)

`assets/snh-app.js` (`window.SNHPlans`) picks the plan and draws it. Edit the JSON to change a plan, but keep the `id`s: members' `plan:<id>` tags point at them.

I didn't put the plans in section blocks: a block on the homepage can't be read from the account page, and the Goals tab needs the same plans.

## Moving plans into Shopify admin (metaobject)

To let the team edit plans without code, create this definition in **Settings → Custom data → Metaobjects → Add definition**:

**Name:** Workout plan · **Type:** `workout_plan` · Storefront access: **on**

| Field | Key | Type | Notes |
|---|---|---|---|
| Plan id | `plan_id` | Single line text, unique | `muscle-4`. Keep the ids from the JSON. |
| Title | `title` | Single line text | `Build muscle: 4-day upper / lower` |
| Summary | `summary` | Multi-line text | One or two sentences |
| Goal | `goal` | Single line text, choices: `muscle`, `fat`, `endurance`, `health` | |
| Days | `days` | Single line text, choices: `2-3`, `4`, `5-6` | |
| Level | `level` | Single line text, choices: `beginner`, `intermediate` | |
| Schedule | `schedule` | JSON | The `w` array from the JSON: `[{ "d": "Mon", "f": "Upper (strength)", "x": [["Barbell bench press", "4 × 6", "2 min"], …] }, …]` |

Then change `snippets/snh-workout-plans.liquid` to build the same JSON from `shop.metaobjects.workout_plan.values`:

```liquid
<script type="application/json" data-wk-plans>
[{%- for p in shop.metaobjects.workout_plan.values -%}
  {"id":{{ p.plan_id.value | json }},"goal":{{ p.goal.value | json }},"days":{{ p.days.value | json }},"level":{{ p.level.value | json }},
   "t":{{ p.title.value | json }},"s":{{ p.summary.value | json }},"w":{{ p.schedule.value | json }}}{% unless forloop.last %},{% endunless %}
{%- endfor -%}]
</script>
```

Nothing else changes: the JS, the tags and the Klaviyo event (KLAVIYO-WORKOUT.md) read the same shape.

## Round 19: plans in the account, exercise demos, the session tracker

**Where members see their plan.** Account → Goals shows the saved plan (tag `plan:<id>`), or, when there is no plan
tag yet, the plan their quiz answers match (`goal:` / `freq:` / `lvl:` tags, same matching as the quiz). The Overview
gets a "Your workout plan" card: plan name, the next session not ticked this week, the tracker, "Open my plan".

**Layout.** Desktop (≥ 900 px): one weekly table, a column per training day (scrolls sideways inside its frame for
5–6 day plans). Phones: one card per day, one exercise per row (pictogram · name · sets × reps · rest · Watch how).

**Exercise demos.** Every exercise shows a drawn pictogram of its movement pattern (squat, hinge, press, row,
pull-up, lunge, plank, run, bike, swim …, picked from the exercise name in `assets/snh-app.js` `WK_MATCH`), and
"Watch how" opens a YouTube search for "<exercise> exercise form". To use your own media instead:

- **Theme editor:** Customize → the account page (or the homepage quiz band) → *Add block → Exercise demo*: exercise
  name (as in the plan, e.g. "Back squat"), an image or GIF, an optional video (Shopify video or URL) and an optional
  "Watch how" link. A demo applies to every plan exercise whose name contains its name.
- **Metaobject (optional, shared by both):** *Settings → Custom data → Metaobjects → Add definition* "SNH exercise",
  type `snh_exercise`, Storefronts access Read; fields `name` (single line text), `image` (file, image), `video`
  (file, video), `url` (URL). Entries are read before the blocks (`snippets/snh-wk-demos`).

**Tracker.** Each training day has a "Mark done" tick (this week only). The strip above the plan shows this week's
sessions, the streak (consecutive weeks with every session done) and an XP level: 50 XP per completed session, a
level every 500 XP, shown as the SNH shaker filling up. XP only accumulates; nothing is attached to it (no points,
no discounts).

> **Storage: this device only.** Ticks live in `localStorage` (`snh_wk_track` = `{ plan, log: { "2026-W45": [0, 1] } }`).
> They don't follow the member to another phone or browser and are lost if site data is cleared. Cross-device sync
> needs a backend: e.g. a small app proxy or Customer Account API extension that writes the log to a customer
> metafield (`custom.workout_log`, JSON) and the theme reads it back (`customer.metafields.custom.workout_log`).
> The theme can't write customer metafields from the storefront by itself.
