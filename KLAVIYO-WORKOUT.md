# Klaviyo: email the free workout plan (Round 18)

The homepage quiz band (`sections/snh-quiz-band.liquid`) gives every visitor their supplement stack plus a free workout plan matched to their answers. Creating an account (or signing in) unlocks the full plan. At that moment the theme sends Klaviyo a profile update and an event, so a Klaviyo flow can email the plan.

Nothing below needs a developer. The theme side is live; you only build the flow in Klaviyo.

---

## 1. What the theme sends

**When:**
- A guest submits the quiz's sign-up gate. Source `quiz-home`.
- A guest picks "Sign in" in the gate, then presses **Save to my account** on the Goals tab. Source `quiz-home-signin`.
- A signed-in member saves the quiz on the homepage (source `home`) or in the Goals tab (source `account`).

**How:** Klaviyo's client APIs (`a.klaviyo.com/client/events` and `/client/subscriptions`) with the public company ID from *Theme settings → SNH Elite → Klaviyo public company ID* (default `Usyrp8`). It also calls `klaviyo.push(['identify', …])` for the onsite embed. No private key is involved. Code: `assets/snh-app.js` → `wkKlaviyo`.

### Profile

| Field | Example |
|---|---|
| `email` | `nimal@example.com` |
| `first_name` | `Nimal` (gate only) |
| `phone_number` | `+94771234567` (gate only) |
| `snh_goal` | `build-muscle` · `lose-fat` · `endurance` · `hydration-recovery` · `daily-health` · `sport-specific` |
| `snh_days` | `1-2x` · `3x` · `4x` · `5x` · `6x` |
| `snh_level` | `beginner` · `intermediate` · `advanced` |
| `snh_sport` | `cricket` · `padel` · `running` · `gym` · `cycling` · `swimming` · `football` · `rugby` · `other` |
| `snh_plan_id` | `muscle-4` |
| `snh_plan_title` | `Build muscle: 4-day upper / lower` |
| `snh_quiz_source` | `quiz-home` |

### Event: metric **`Workout Plan Unlocked`**

| Property | What it holds |
|---|---|
| `goal`, `days`, `level`, `sport` | The answers, same values as above |
| `plan_id` | One of the 12 ids below |
| `plan_title` | e.g. `Lose fat: 4-day lift + condition` |
| `plan_summary` | One-sentence description of the plan |
| `plan_days` | A list with one item per training day: `{ day: "Day 1 · Mon", focus: "Upper (strength)", exercises: ["Barbell bench press: 4 × 6, rest 2 min", …] }` |
| `plan_url` | `https://…/account#goals`, the full plan in their account |
| `source` | `quiz-home`, `quiz-home-signin`, `home` or `account` |

### List subscription (optional)

Set *Theme settings → SNH Elite → Klaviyo list ID for quiz sign-ups*. Then every gate sign-up that leaves **"Email me my plan and member offers"** ticked is subscribed to that list, with custom source `Workout plan quiz`. It's ticked by default. With the setting empty, no subscription is created; the event and profile properties are still sent.

Shopify also records the tick on the customer (`customer[accepts_marketing]`). Klaviyo's Shopify integration syncs that consent as well.

---

## 2. Build the flow

1. **Klaviyo → Flows → Create flow → Build your own.** Name it "Workout plan: welcome".
2. **Trigger:** *Metric* → **Workout Plan Unlocked**. The metric appears after the first event arrives; to create it, sign up once on the preview with a test email.
3. **Flow filters:**
   - *Has Workout Plan Unlocked zero times since starting this flow*, so a member who retakes the quiz doesn't get it twice. Remove this filter if you'd rather send each new plan.
   - Optional: *Placed Order zero times in the last 1 day*.
4. **Email 1, sent immediately: "Your SNH plan is here".** Content in §3.
5. **Wait 3 days.**
6. **Email 2: "How's week 1 going?"** A check-in. Link to the plan (`{{ event.plan_url }}`) and the stack. Conditional split on `snh_goal` to show goal-specific products. The Goals collections are `muscle-and-strength`, `fat-loss`, `energy-and-endurance`, `hydration-recovery`, `health-wellness` and `train-perform`.
7. **Wait 7 days.**
8. **Email 3: "Week 2: add a rep".** A progressive-overload tip, plus the 500 welcome points reminder and the points balance (Elite).
9. Turn the flow **Live** and send yourself a test with a real event: Preview → *Select an event*.

---

## 3. Email 1 template

**Subject:** `{{ first_name|default:'Your' }} SNH workout plan: {{ event.plan_title }}`
**Preview text:** `{{ event.plan_summary }}`

Blocks:

1. **Header:** SNH logo, then the eyebrow "YOUR FREE WORKOUT PLAN · BY SNH".
2. **Heading:** `{{ event.plan_title }}`
3. **Text:** `{{ event.plan_summary }}` and "Built from your answers: {{ event.goal }}, {{ event.days }} a week, {{ event.level }}."
4. **The week:** a Text block with a repeat over the days (*Dynamic → Repeat* on `event.plan_days`, item alias `day`):

   ```
   {% for day in event.plan_days %}
   <h3 style="margin:20px 0 6px;font:600 16px Inter,Arial">{{ day.day }}: {{ day.focus }}</h3>
   <table width="100%" style="border-collapse:collapse;font:14px Inter,Arial">
     {% for ex in day.exercises %}
     <tr><td style="padding:6px 0;border-top:1px solid #eee">{{ ex }}</td></tr>
     {% endfor %}
   </table>
   {% endfor %}
   ```

5. **Button:** "Open my plan" → `{{ event.plan_url }}`. It opens the Goals tab, where the full plan and their stack are saved.
6. **Sport tip:** a conditional block. *Show if* `event.sport` equals `cricket`, `padel`, etc. Copy the sport notes from `WK_SPORT` in `assets/snh-app.js`.
7. **Elite strip:** "You've got 500 welcome points. Earn 3–10% back on every order."
8. **Footer:** "General guidance, not medical advice. Warm up first; check with a doctor if you have an injury or condition."

---

## 4. The 12 plans

`plan_id` values (the source is `snippets/snh-workout-plans.liquid`):

| id | Goal | Days | Written for |
|---|---|---|---|
| `muscle-3` | Build muscle: full body | 3 | Beginner |
| `muscle-4` | Build muscle: upper / lower | 4 | Intermediate |
| `muscle-6` | Build muscle: push / pull / legs | 6 (5 by skipping legs 2) | Intermediate |
| `fat-3` | Lose fat: strength + steps | 3 | Beginner |
| `fat-4` | Lose fat: lift + condition | 4 | Intermediate |
| `fat-6` | Lose fat: split + cardio | 5–6 | Intermediate |
| `endurance-3` | Endurance: base builder | 3 | Beginner |
| `endurance-4` | Endurance: speed + strength | 4 | Intermediate |
| `endurance-6` | Endurance: performance week | 6 | Intermediate |
| `health-3` | Everyday health: feel-good | 3 | Beginner |
| `health-4` | Everyday health: balanced week | 4 | Intermediate |
| `health-6` | Everyday health: active lifestyle | 5–6 | Intermediate |

**Matching** (`planFor` in `assets/snh-app.js`), in priority order:

1. **Goal:**
   - `build-muscle` → muscle
   - `lose-fat` → fat
   - `endurance` → endurance
   - `daily-health` and `hydration-recovery` → health
   - `sport-specific` → endurance for running, cycling, swimming, cricket, football, rugby and padel; muscle for gym; health otherwise
2. **Days:** 1–2 and 3 → `2-3`; 4 → `4`; 5 and 6–7 → `5-6`.
3. **Level:** beginner or intermediate. Advanced uses the intermediate plans.

The plan page and the email then add a level tweak when the member's level differs from the plan's, plus a sport note.

---

## 5. Where it shows on the site

- **Homepage**, quiz band under the hero:
  - Guests see the stack and Day 1; the other days are blurred, with the sign-up gate below.
  - Members see the full plan and **Save my plan**.
- **Account → Goals:** the full plan from the customer tag `plan:<id>`, above the goal tips. A guest who chose "Sign in" sees a **Save your plan** card first. Their answers wait in `localStorage` for 3 days.
- **Customer tags** written by the gate: the usual quiz tags (`goal:`, `goal2:`, `lvl:`, `freq:`, `sess:`, `sport:`, `diet:`, `budget:`, `exp:`, `take:`, `challenge:`, `flavour:`, `age:`), plus `plan:<id>`, `quiz:home` and `mobile:+94…`. Shopify customer segments and Klaviyo (via the Shopify sync) can use them too.
