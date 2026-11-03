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
