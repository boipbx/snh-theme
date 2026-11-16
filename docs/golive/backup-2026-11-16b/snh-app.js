/* SNH Elite member app (Round 8). Loaded by snippets/snh-app (customers/account + the QA mock) and the register page.
   - routing: #overview #rewards #orders #goals #profile, last view remembered (localStorage snh_app_view)
   - count-up figures, redeem confirm, re-order (V8 logic without the old cart clear), order search/filter/details
   - avatar picker (cosmetic, localStorage snh_vector_avatar, same key as V8), edit-profile dialog (V8 two steps)
   - onboarding quiz (any [data-quiz]): answers → localStorage snh_goals (instant UI) + customer tags. Round 10: tags are
     written by one normal page POST of a Liquid {% form %} (never fetch), so Shopify's hCaptcha runs: the customer form
     → /contact in the app, customer[tags] on create_customer at sign-up. Success banner from ?snh_posted= (flash).
   Vanilla, no dependencies. Nothing is submitted on the mock page ([data-mock]). */
(function () {
  if (window.__snhApp) return;
  window.__snhApp = true;

  var VIEWS = ['overview', 'rewards', 'orders', 'goals', 'profile'];
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = (window.Shopify && Shopify.routes && Shopify.routes.root) || '/';
  function $$(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function lsJson(k) { try { return JSON.parse(lsGet(k) || 'null'); } catch (e) { return null; } }
  function say(msg) { if (window.V2 && V2.say) V2.say(msg); }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- Sri Lankan mobile: +94 / 07X… → +94XXXXXXXXX ---------- */
  function slMobile(v) {
    var d = String(v || '').replace(/\D/g, '');
    if (d.indexOf('94') === 0 && d.length === 11) d = d.slice(2);
    else if (d.indexOf('0') === 0 && d.length === 10) d = d.slice(1);
    return /^7\d{8}$/.test(d) ? '+94' + d : null;
  }
  window.SNHMobile = { norm: slMobile };
  function bindMobile(input) {
    if (input.__sl) return;
    input.__sl = true;
    var err = input.closest('.aform__grid, .aform, form, .quiz');
    err = err && err.querySelector('[data-sl-err]');
    function check(fix) {
      var v = input.value.trim(), n = slMobile(v), ok = !v || !!n;
      input.setCustomValidity(ok ? '' : 'Enter a Sri Lankan mobile number, like 077 123 4567.');
      input.setAttribute('aria-invalid', String(!ok));
      if (err) err.hidden = ok;
      if (fix && n && !input.hasAttribute('data-tel94')) input.value = n;   // +94 fields: assets/snh-phone.js formats and writes E.164 on submit
      return ok;
    }
    input.addEventListener('blur', function () { check(true); });
    input.addEventListener('input', function () { if (input.getAttribute('aria-invalid') === 'true') check(false); });
    if (input.form) input.form.addEventListener('submit', function () { check(true); }, true);
    input.__check = check;
  }

  /* ---------- count-up (V8): "Rs 241,500" / "3,120" from 0, width reserved so nothing moves ---------- */
  function countUp(scope) {
    $$('[data-count]', scope).forEach(function (el) {
      if (el.__counted || !el.offsetParent) return;
      el.__counted = true;
      var m = el.textContent.trim().match(/^(\D*)([\d,]+)(.*)$/);
      if (reduce || !m) return;
      var target = +m[2].replace(/,/g, '');
      if (!target) return;
      el.style.minWidth = el.getBoundingClientRect().width + 'px';
      var t0 = null, dur = 1300;
      function tick(ts) {
        if (!t0) t0 = ts;
        var p = Math.min((ts - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
        el.textContent = m[1] + Math.round(target * e).toLocaleString('en-US') + m[3];
        if (p < 1) requestAnimationFrame(tick);
      }
      el.textContent = m[1] + '0' + m[3];
      setTimeout(function () { requestAnimationFrame(tick); }, 250);
    });
  }

  /* ---------- re-order: every line of the order into the basket, then the cart drawer (as V2.add does) ---------- */
  function cartEvents(added, btn) {
    var de = document.documentElement;
    return fetch(root + 'cart.js').then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (cart) {
      cart.sections = added && added.sections;
      (btn || de).dispatchEvent(new CustomEvent('variant:add', { bubbles: true, detail: { items: (added && added.items) || [], cart: cart } }));
      de.dispatchEvent(new CustomEvent('cart:change', { bubbles: true, detail: { baseEvent: 'variant:add', cart: cart } }));
      de.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
    });
  }
  function post(items, sections) {
    return fetch(root + 'cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ items: items, sections: sections })
    }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.description || j.message || 'Request failed'); return j; }); });
  }
  function reorder(btn) {
    var items = (btn.getAttribute('data-app-reorder') || '').split(',').filter(Boolean).map(function (x) {
      var a = x.split(':'); return { id: +a[0], quantity: +a[1] || 1 };
    }).filter(function (i) { return i.id > 0 && i.quantity > 0; });
    if (!items.length || btn.getAttribute('aria-busy') === 'true') return;
    var label = btn.querySelector('span') || btn, was = label.textContent, box = btn.parentNode;
    var old = box.parentNode.querySelector('[data-reorder-err]');
    if (old) old.remove();
    btn.setAttribute('aria-busy', 'true');
    label.textContent = 'Adding…';
    var sections = [];
    document.documentElement.dispatchEvent(new CustomEvent('cart:prepare-bundled-sections', { bubbles: true, detail: { sections: sections } }));
    var failed = 0;
    post(items, sections.join(',')).catch(function () {
      // one line is sold out or changed: add the rest one by one (the V8 fallback), count what didn't make it
      return items.reduce(function (p, it) {
        return p.then(function (last) { return post([it], '').then(function (j) { return j; }, function () { failed++; return last; }); });
      }, Promise.resolve(null)).then(function (j) { if (failed === items.length) throw new Error('none'); return j; });
    }).then(function (added) {
      // from the preview sheet: close it first so the cart drawer opens on top
      var dlg = btn.closest('dialog');
      if (dlg && !failed) dlg.close();
      return cartEvents(added, btn).then(function () {
        if (failed) showErr(box, 'Added ' + (items.length - failed) + ' of ' + items.length + ' items. The rest are sold out or have changed since your order.');
        else say('Added to your basket');
      });
    }).catch(function () {
      showErr(box, "Couldn't add these to your basket. The products may be sold out or changed since your order. Try adding them from the product page.");
    }).then(function () { btn.removeAttribute('aria-busy'); label.textContent = was; });
  }
  function showErr(after, msg) {
    var p = document.createElement('p');
    p.className = 'aform__err';
    p.setAttribute('role', 'alert');
    p.setAttribute('data-reorder-err', '');
    p.textContent = msg;
    after.insertAdjacentElement('afterend', p);
  }

  /* ---------- "Build your SNH plan" (Round 10): branching questions, XP, level up, shaker game, stack, plan card ---------- */
  var MANY = { take: 1 };
  var KEYS = ['goal', 'goal2', 'lvl', 'freq', 'sess', 'sport', 'diet', 'exp', 'take', 'challenge', 'flavour', 'age'];
  function quizInit(q, onDone) {
    if (q.__quiz) return q.__quiz;
    var mode = q.getAttribute('data-mode'), mock = q.hasAttribute('data-mock');
    var steps = $$('.qz__step', q);
    var done = q.querySelector('[data-step="done"]'), game = q.querySelector('[data-step="game"]'), res = q.querySelector('[data-step="results"]');
    var back = q.querySelector('[data-quiz-back]'), next = q.querySelector('[data-quiz-next]'), skip = q.querySelector('[data-quiz-skip]');
    var save = q.querySelector('[data-quiz-save]'), retake = q.querySelector('[data-qz-retake]'), form = save && save.form;
    var bar = q.querySelector('[data-quiz-bar]'), count = q.querySelector('[data-quiz-count]');
    var xpEl = q.querySelector('[data-qz-xp]'), lvlEl = q.querySelector('[data-qz-lvl]'), lvlup = q.querySelector('[data-qz-levelup]');
    var i = 0, stage = 'q', leveled = false, ptr = false;
    $$('[data-sl-mobile]', q).forEach(bindMobile);

    function stepOf(k) { return q.querySelector('.qz__step[data-step="' + k + '"]'); }
    function val(k) {
      var c = $$('.qz__step[data-step="' + k + '"] input:checked', q).map(function (r) { return r.value; });
      return MANY[k] ? c : (c[0] || '');
    }
    function lab(k, v) {
      var r = q.querySelector('.qz__step[data-step="' + k + '"] input' + (v ? '[value="' + v + '"]' : ':checked'));
      return r ? r.getAttribute('data-label') : '';
    }
    function answers() {
      var a = {}, b = q.querySelector('[data-quiz-bday]'), m = q.querySelector('[data-quiz-mobile]');
      KEYS.forEach(function (k) { a[k] = stepOf(k) && applies(stepOf(k), a) ? val(k) : (MANY[k] ? [] : ''); });
      if (a.goal2 === a.goal) a.goal2 = '';
      a.bday = b ? b.value : '';
      a.mobile = m ? (slMobile(m.value) || '') : '';
      return a;
    }
    // data-if="exp!=new" / "goal=x": a step only applies when the earlier answer matches
    function applies(s, a) {
      var c = s.getAttribute('data-if');
      if (!c) return true;
      var m = c.match(/^(\w+)(!?=)(.+)$/);
      if (!m) return true;
      var v = a ? a[m[1]] : val(m[1]);
      return m[2] === '=' ? v === m[3] : v !== m[3];
    }
    function list() { return steps.filter(function (s) { return applies(s); }); }
    function answered() { return list().filter(function (s) { var v = val(s.getAttribute('data-step')); return MANY[s.getAttribute('data-step')] ? v.length : v; }).length; }
    function xp() {
      var n = answered(), tot = list().length, half = Math.ceil(tot / 2), lv = n >= tot ? 3 : n >= half ? 2 : 1;
      if (xpEl) { xpEl.textContent = n * 10 + ' XP'; xpEl.classList.remove('is-bump'); void xpEl.offsetWidth; xpEl.classList.add('is-bump'); }
      if (lvlEl) lvlEl.textContent = 'Level ' + lv;
      if (lv >= 2 && !leveled && lvlup && stage === 'q') {
        leveled = true;
        lvlup.hidden = false;
        setTimeout(function () { lvlup.hidden = true; }, 2600);
      }
    }
    function nav() {
      var L = list(), inQ = stage === 'q', last = i === L.length - 1;
      back.hidden = !(inQ && i > 0) && stage !== 'results';
      next.hidden = !inQ;
      skip.hidden = !inQ;
      var nl = next.querySelector('span');
      if (nl) nl.textContent = last ? (mode === 'register' ? 'Done' : 'See my stack') : 'Next';
      if (save) save.hidden = stage !== 'results';
      if (retake) retake.hidden = stage !== 'results';
    }
    function go(n, focus) {
      var L = list();
      // goal2 never offers the primary goal again
      var g = val('goal');
      $$('.qz__step[data-step="goal2"] .qz__tile', q).forEach(function (t) { var inp = t.querySelector('input'); t.hidden = inp.value === g; if (t.hidden) inp.checked = false; });
      i = Math.max(0, Math.min(n, L.length));
      stage = i >= L.length ? (mode === 'register' ? 'done' : 'game') : 'q';
      steps.forEach(function (s) { s.hidden = stage !== 'q' || s !== L[i]; });
      if (done) done.hidden = stage !== 'done';
      if (game) game.hidden = stage !== 'game';
      if (res) res.hidden = stage !== 'results';
      bar.style.width = (stage === 'q' ? Math.round(answered() / L.length * 100) : 100) + '%';
      count.textContent = stage === 'q' ? 'Question ' + (i + 1) + ' of ' + L.length : stage === 'done' ? 'Done' : 'Plan ready';
      nav();
      sync();
      if (stage === 'done') finish();
      if (stage === 'game') startGame();
      if (focus) {
        var f = stage === 'q' ? (L[i].querySelector('input:checked') || L[i].querySelector('input')) : q.querySelector('[data-step="' + stage + '"]');
        if (f) f.focus({ preventScroll: true });
        var top = q.getBoundingClientRect().top;
        if (top < 0) q.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
      }
    }
    function finish() {
      var a = answers(), bits = [lab('goal'), lab('freq'), lab('sport')].filter(Boolean);
      var sum = q.querySelector('[data-quiz-summary]');
      if (sum) sum.textContent = bits.length ? bits.join(' · ') + '. Your plan is saved to your account when you create it.' : 'No problem, you can build your plan from your account any time.';
      if (onDone) onDone(a, bits, false);
    }
    function sync() { var t = q.__tagsField || (form && form.querySelector('[data-quiz-tags]')); if (t) t.value = tagsFor(answers(), t.__extra); }

    next.addEventListener('click', function () {
      var L = list(), m = L[i] && L[i].querySelector('[data-sl-mobile]');
      if (m && m.__check && !m.__check(true)) { m.focus(); return; }
      go(i + 1, true);
    });
    skip.addEventListener('click', function () {
      var L = list();
      $$('input[type="radio"], input[type="checkbox"]', L[i]).forEach(function (r) { r.checked = false; });
      xp();
      go(mode === 'register' ? L.length : i + 1, true);
    });
    back.addEventListener('click', function () { if (stage === 'results') { go(list().length - 1, true); return; } go(i - 1, true); });
    if (retake) retake.addEventListener('click', function () { leveled = false; go(0, true); });
    // one tap answers: a pointer pick on a single-choice tile moves on by itself (keyboard users press Next)
    q.addEventListener('pointerdown', function (e) { ptr = !!e.target.closest('.qz__tile'); });
    q.addEventListener('keydown', function () { ptr = false; });
    q.addEventListener('change', function (e) {
      var t = e.target.closest('.qz__tile');
      if (t) { t.classList.remove('is-pop'); void t.offsetWidth; t.classList.add('is-pop'); xp(); }
      sync();
      if (t && ptr && e.target.type === 'radio' && stage === 'q') {
        var at = i;
        setTimeout(function () { if (i === at && stage === 'q') go(i + 1, true); }, reduce ? 0 : 320);
      }
    });
    q.addEventListener('input', sync);

    /* the shaker game: tap fast for 5 s, the shaker fills, then the stack appears. Purely for fun. */
    var shaker = q.querySelector('[data-qz-shake]'), liq = q.querySelector('[data-qz-shk]'), meter = q.querySelector('[data-qz-meter]'), score = q.querySelector('[data-qz-score]');
    var taps = 0, t0 = 0, timer = null, FULL = 30;
    function startGame() {
      taps = 0; t0 = 0; clearTimeout(timer);
      if (liq && window.SNH && SNH.shaker) { SNH.shaker(liq); SNH.shakerSet(liq, 0); }
      if (meter) meter.style.width = '0%';
      if (score) score.textContent = 'Tap to start';
    }
    function endGame() {
      clearTimeout(timer);
      if (score) score.textContent = taps + ' shakes. ' + (taps >= FULL ? 'Perfectly mixed!' : taps >= FULL / 2 ? 'Nicely mixed!' : 'Mixed enough!');
      setTimeout(showResults, reduce ? 0 : 900);
    }
    if (shaker) shaker.addEventListener('click', function () {
      if (stage !== 'game') return;
      if (!t0) { t0 = Date.now(); timer = setTimeout(endGame, 5000); }
      taps++;
      var f = Math.min(taps / FULL, 1);
      if (liq && window.SNH && SNH.shakerSet) { SNH.shaker(liq); SNH.shakerSet(liq, f * 100); }
      meter.style.width = Math.round(f * 100) + '%';
      score.textContent = taps + ' shake' + (taps === 1 ? '' : 's');
      if (!reduce) { shaker.classList.remove('is-shake'); void shaker.offsetWidth; shaker.classList.add('is-shake'); }
      if (taps >= FULL) endGame();
    });
    var skipGame = q.querySelector('[data-qz-skipgame]');
    if (skipGame) skipGame.addEventListener('click', function () { clearTimeout(timer); showResults(); });

    function showResults() {
      if (stage !== 'game') return;
      stage = 'results';
      game.hidden = true; res.hidden = false;
      buildStack(q, answers(), lab);
      // R19: the answers become this device's preferences (promos, onboarding prompt; SNH.prefs in snh-v2.js)
      (function (a) { lsSet('snh_prefs', JSON.stringify({ goal: a.goal || '', goal2: a.goal2 || '', sport: a.sport || '', diet: a.diet || '', lvl: a.lvl || '', freq: a.freq || '', at: Date.now() })); if (window.SNH && SNH.pzRun) document.documentElement.setAttribute('data-prefs', 'yes'); })(answers());
      nav();
      res.focus({ preventScroll: true });
      if (!reduce) res.classList.add('is-in');
      // R18: the workout plan and the guest gate hook in here (sections/snh-quiz-band, the Goals tab)
      q.dispatchEvent(new CustomEvent('snh:quiz-results', { bubbles: true, detail: { answers: answers(), label: lab } }));
    }

    if (form) form.addEventListener('submit', function (e) {
      var m = q.querySelector('[data-quiz-mobile]');
      if (m && m.__check && !m.__check(true)) { e.preventDefault(); go(list().length - 1, true); return; }
      var a = answers();
      sync();
      if (!a.goal && !a.freq && !a.sport && !a.bday && !a.mobile && !a.diet) { e.preventDefault(); return; }
      if (onDone) onDone(a, null, true);
      try { sessionStorage.setItem('snh_posting', 'goals'); } catch (x) {}
      var l = save.querySelector('span');
      if (l) l.textContent = 'Saving…';
      save.setAttribute('aria-busy', 'true');
      // still here after a few seconds = the bot check is waiting for the member (or loading): let them press again
      setTimeout(function () { save.removeAttribute('aria-busy'); if (l) l.textContent = 'Save my plan'; }, 6000);
    });

    var api = {
      go: go,
      sync: sync,
      answers: answers,
      to: function (key) { var L = list(), k = L.map(function (s) { return s.getAttribute('data-step'); }).indexOf(key); go(k < 0 ? 0 : k, true); },
      fill: function (a) {
        KEYS.forEach(function (k) {
          [].concat(a && a[k] || []).forEach(function (v) { var r = q.querySelector('.qz__step[data-step="' + k + '"] input[value="' + v + '"]'); if (r) r.checked = true; });
        });
        var b = q.querySelector('[data-quiz-bday]'), m = q.querySelector('[data-quiz-mobile]');
        if (b && a && a.bday) b.value = a.bday;
        if (m && a && a.mobile) m.value = a.mobile;
      },
      label: function (k, v) { return lab(k, v); }
    };
    q.__quiz = api;
    go(0, false);
    xp();
    return api;
  }
  function tagsFor(a, extra) {
    var t = [];
    KEYS.forEach(function (k) { [].concat(a[k] || []).forEach(function (v) { if (v) t.push(k + ':' + v); }); });
    if (a.bday) t.push('bday:' + a.bday);
    if (a.mobile) t.push('mobile:' + a.mobile);
    return t.concat(extra ? extra() : []).filter(Boolean).join(', ');
  }

  /* "Your SNH stack": 3–5 products from the categories in snh-quiz-stackdata, by goal, second goal, challenge, diet,
     what they already take and flavour (R19: no budget question, no price filtering; always 3+ picks). Rules are plain data so they're easy to tune. */
  var PLANS = {
    'build-muscle': [['P', 'Hits your daily protein target without extra cooking.'], ['creatine', 'The most researched strength supplement: 3–5 g a day, every day.'], ['pre', 'More drive for heavy days.', 'notnew']],
    'lose-fat': [['P', 'High protein keeps your muscle while you cut.'], ['fat', 'Supports your training in a calorie deficit.'], ['bar', 'A high-protein snack for when cravings hit.']],
    'endurance': [['hydra', 'Replaces the sodium you sweat out in Sri Lankan heat.'], ['gel', 'Fast carbs for sessions over 90 minutes.'], ['P', 'Protein to recover after long sessions.']],
    'hydration-recovery': [['hydra', 'Rehydrates faster than water alone.'], ['magnesium', 'Supports sleep and muscle recovery.'], ['P', 'Protein to rebuild after training.']],
    'daily-health': [['multi', 'Covers the everyday basics in one go.'], ['omega', 'Omega-3 for heart, joints and recovery.'], ['magnesium', 'Supports sleep and stress.']],
    'sport-specific': [['hydra', 'Pre-load electrolytes on match day.'], ['gel', 'A quick top-up between games or sets.'], ['creatine', 'Power for sprints, swings and smashes.']]
  };
  var CHALLENGE = {
    energy: ['pre', 'Your challenge is energy: a pre-workout for the sessions that matter.'],
    recovery: ['magnesium', 'Your challenge is recovery: magnesium in the evening helps you bounce back.'],
    cravings: ['bar', 'Your challenge is cravings: keep a protein bar in your bag.'],
    consistency: ['creatine', 'Your challenge is consistency: creatine works through a simple daily habit.'],
    sleep: ['magnesium', 'Your challenge is sleep: magnesium in the evening helps you wind down.']
  };
  var TAKES = { protein: ['P'], creatine: ['creatine'], 'pre-workout': ['pre'], electrolytes: ['hydra'], multivitamin: ['multi'], 'omega-3': ['omega'], magnesium: ['magnesium'] };
  var FLAV = { chocolate: ['choc', 'cocoa', 'brownie'], vanilla: ['vanilla', 'cookie', 'cream'], fruity: ['berry', 'fruit', 'orange', 'mango', 'lemon', 'strawberr', 'tropical', 'raspberr', 'melon', 'pineapple', 'peach', 'apple', 'grape'], unflavoured: ['unflavo'] };
  // R19: fallback order per goal when fewer than 3 stack picks match (complementary bestsellers for the goal)
  var FILL = { 'build-muscle': ['P', 'creatine', 'bar', 'pre', 'magnesium', 'multi'], 'lose-fat': ['P', 'bar', 'fat', 'hydra', 'multi'], endurance: ['hydra', 'gel', 'P', 'bar', 'magnesium'], 'hydration-recovery': ['hydra', 'magnesium', 'P', 'gel', 'multi'], 'daily-health': ['multi', 'omega', 'magnesium', 'P', 'hydra'], 'sport-specific': ['hydra', 'gel', 'creatine', 'P', 'bar'] };
  var TIPS = {
    energy: 'Eat a carb-rich meal 2–3 hours before training, and save caffeine for the sessions that need it.',
    recovery: 'Get 20–40 g of protein within two hours of training, and protect your sleep: it’s when you recover.',
    cravings: 'Build meals around protein and fibre. Plan a high-protein snack for the time of day cravings usually hit.',
    consistency: 'Pick the same time every day for your supplements, next to a habit you already have, like breakfast.',
    sleep: 'Keep caffeine before 2 pm, dim the screens an hour before bed, and take magnesium in the evening.',
    'build-muscle': 'Aim for 1.6–2.2 g of protein per kg of bodyweight a day, spread over 3–5 meals.',
    'lose-fat': 'A steady 300–500 calorie daily deficit, high protein and lifting keeps the weight you lose as fat.',
    endurance: 'Over 90 minutes, take in 60–90 g of carbs an hour, and practise it in training first.',
    'hydration-recovery': 'Weigh yourself before and after training: every kilo lost is about a litre to replace.',
    'daily-health': 'Consistency beats dose. Take fat-soluble vitamins and omega-3 with a meal.',
    'sport-specific': 'Eat a carb-rich meal 3–4 hours before you play, and pre-load electrolytes on hot days.'
  };
  function rs(n) { return 'Rs ' + Math.round(n).toLocaleString('en-US'); }
  function buildStack(q, a, lab) {
    var el = q.querySelector('[data-qz-data]'), data = { cats: {}, bundles: [] };
    try { data = JSON.parse(el.textContent); } catch (e) {}
    var P = a.diet === 'vegan' || a.diet === 'lactose-free' ? 'vegan' : a.goal === 'lose-fat' && a.diet !== 'vegetarian' ? 'clear' : 'protein';
    var skip = {}, taken = [].concat(a.take || []);
    taken.forEach(function (t) { (TAKES[t] || []).forEach(function (c) { skip[c] = 1; if (c === 'P') { skip.protein = skip.vegan = skip.clear = 1; } }); });
    if (a.diet === 'vegan' || a.diet === 'lactose-free') { skip.protein = skip.clear = skip.bar = 1; }
    if (a.diet === 'vegan' || a.diet === 'vegetarian') skip.omega = 1;   // fish oil
    var want = [];
    function add(c, why, cond) {
      if (c === 'P') c = P;
      if (cond === 'notnew' && a.exp === 'new') return;
      if (skip[c] || want.some(function (w) { return w[0] === c; })) return;
      want.push([c, why]);
    }
    // priority: the goal's core picks, the challenge, the second goal, then optional extras
    var plan = PLANS[a.goal] || PLANS['daily-health'];
    plan.forEach(function (x) { if (!x[2]) add(x[0], x[1]); });
    if (a.challenge && CHALLENGE[a.challenge]) { var ch = CHALLENGE[a.challenge]; add(ch[0], ch[1], ch[0] === 'pre' ? 'notnew' : ''); }
    if (a.goal2 && PLANS[a.goal2]) PLANS[a.goal2].some(function (x) { var n = want.length; add(x[0], x[1], x[2]); return want.length > n; });
    plan.forEach(function (x) { if (x[2]) add(x[0], x[1], x[2]); });
    // categories with no product in stock drop out; top up from the main plan's backups
    var words = FLAV[a.flavour] || [], used = {};
    var stack = [];
    want.forEach(function (w) {
      if (stack.length >= 5) return;
      var list = (data.cats[w[0]] || []).filter(function (p) { return !used[p.u]; });
      if (!list.length) return;
      list = list.slice().sort(function (x, y) {
        var fx = words.some(function (k) { return x.x.indexOf(k) > -1; }) ? 0 : 1, fy = words.some(function (k) { return y.x.indexOf(k) > -1; }) ? 0 : 1;
        return fx - fy;
      });
      used[list[0].u] = 1;
      stack.push({ p: list[0], why: w[1], c: w[0] });
    });
    // R19: always at least 3 picks: the goal's complementary categories first, then any category in stock
    // (diet skips still apply; what they already take is only relaxed as a last resort)
    var fillCats = (FILL[a.goal] || FILL['daily-health']).concat(Object.keys(data.cats));
    [false, true].forEach(function (relax) {
      fillCats.forEach(function (c) {
        if (stack.length >= 3) return;
        c = c === 'P' ? P : c;
        if (relax ? (a.diet === 'vegan' || a.diet === 'lactose-free') && /^(protein|clear|bar)$/.test(c) || (a.diet === 'vegan' || a.diet === 'vegetarian') && c === 'omega' : skip[c]) return;
        if (stack.some(function (s) { return s.c === c; })) return;
        var p = (data.cats[c] || []).filter(function (x) { return !used[x.u]; })[0];
        if (p) { used[p.u] = 1; stack.push({ p: p, why: relax ? 'A popular pick that goes with your goal.' : 'A bestseller that goes with your goal.', c: c }); }
      });
    });
    function sum() { return stack.reduce(function (t, s) { return t + s.p.p / 100; }, 0); }

    var bits = [lab('goal'), lab('freq'), lab('sport')].filter(Boolean);
    q.querySelector('[data-qz-res-sum]').textContent = (bits.length ? bits.join(' · ') + '. ' : '') + (lab('diet') && a.diet !== 'none' ? lab('diet') + ' friendly. ' : '');
    var ol = q.querySelector('[data-qz-stack]'), mockQ = q.hasAttribute('data-mock');
    ol.innerHTML = stack.map(function (s, n) {
      var p = s.p;
      return '<li class="qz__item" style="--n:' + n + '"><span class="oimg' + (p.f ? ' is-framed' : '') + '"><img src="' + esc(p.i) + '" alt="" width="88" height="88"></span>' +
        '<div class="qz__it"><p class="qz__brand">' + esc(p.b) + '</p><a class="qz__name" href="' + esc(p.u) + '">' + esc(p.t.replace(p.b, '').trim() || p.t) + '</a><p class="qz__why">' + esc(s.why) + '</p></div>' +
        '<div class="qz__buy"><b>' + rs(p.p / 100) + '</b>' + (p.v ? '<button class="v-btn v-btn--ink v-btn--sm" type="button" data-app-reorder="' + p.v + ':1"' + (mockQ ? ' disabled' : '') + '><span>Add</span></button>' : '<a class="v-btn v-btn--line v-btn--sm" href="' + esc(p.u) + '"><span>Choose</span></a>') + '</div></li>';
    }).join('') || '<li class="app__muted">We couldn’t find products in stock for these answers right now. Try a different diet.</li>';
    // a bundle that holds 2+ of the stack (its description names them)
    var best = null;
    data.bundles.forEach(function (b) {
      var hit = stack.filter(function (s) { return s.p.n && s.p.n.length > 5 && b.d.indexOf(s.p.n) > -1; }).length;
      if (hit >= 2 && (!best || hit > best.hit || (hit === best.hit && b.s > best.b.s))) best = { b: b, hit: hit };
    });
    var tot = q.querySelector('[data-qz-tot]');
    tot.innerHTML = '<p><span>Stack total</span><b>' + rs(sum()) + '</b></p>' + (best ? '<div class="qz__bundle"><p>Get ' + best.hit + ' of these in the <b>' + esc(best.b.t) + '</b>' + (best.b.s ? ' and save ' + rs(best.b.s / 100) : '') + '.</p>' +
      (best.b.v ? '<button class="v-btn v-btn--accent v-btn--sm" type="button" data-app-reorder="' + best.b.v + ':1"' + (mockQ ? ' disabled' : '') + '><span>Add bundle · ' + rs(best.b.p / 100) + '</span></button>' : '<a class="v-btn v-btn--accent v-btn--sm" href="' + esc(best.b.u) + '"><span>See bundle</span></a>') + '</div>' : '');
    var tip = q.querySelector('[data-qz-tip]');
    tip.innerHTML = '<span class="qz__tip-ic" aria-hidden="true">★</span><div><p class="eyebrow">Your tip</p><p>' + esc(TIPS[a.challenge] || TIPS[a.goal] || TIPS['daily-health']) + '</p></div>';
    drawCard(q.querySelector('[data-qz-canvas]'), a, lab, stack, q.closest('[data-first]'));
    var png = q.querySelector('[data-qz-png]');
    if (png && !png.__b) {
      png.__b = true;
      png.addEventListener('click', function () {
        var c = q.querySelector('[data-qz-canvas]'), l = document.createElement('a');
        l.download = 'my-snh-plan.png';
        l.href = c.toDataURL('image/png');
        l.click();
      });
    }
  }
  // the shareable plan card, drawn as an image (1080 × 1350, Instagram portrait)
  function drawCard(c, a, lab, stack, app) {
    if (!c || !c.getContext) return;
    var x = c.getContext('2d'), W = c.width, H = c.height, sans = 'Inter, Helvetica, Arial, sans-serif', serif = '"Instrument Serif", Georgia, serif';
    x.fillStyle = '#0C0C0D'; x.fillRect(0, 0, W, H);
    var g = x.createRadialGradient(W * .85, 0, 0, W * .85, 0, W * .9);
    g.addColorStop(0, 'rgba(224,82,28,.75)'); g.addColorStop(1, 'rgba(224,82,28,0)');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = '#fff'; x.textBaseline = 'alphabetic';
    x.font = '600 40px ' + sans; x.fillText('SNH', 80, 120);
    x.font = 'italic 40px ' + serif; x.fillText('Elite', 182, 120);
    x.font = '600 28px ' + sans; x.fillStyle = 'rgba(255,255,255,.7)'; x.fillText('MY SNH PLAN', 80, 250);
    var name = app && app.getAttribute('data-first') ? app.getAttribute('data-first') + '’s stack' : 'My stack';
    x.fillStyle = '#fff'; x.font = '600 96px ' + sans; x.fillText(name, 80, 360, W - 160);
    x.font = 'italic 64px ' + serif; x.fillStyle = '#FFB27A';
    x.fillText([lab('goal'), lab('sport')].filter(Boolean).join(' · ') || 'Built for me', 80, 450, W - 160);
    x.font = '500 34px ' + sans; x.fillStyle = 'rgba(255,255,255,.75)';
    x.fillText([lab('freq') ? lab('freq') + ' a week' : '', lab('lvl')].filter(Boolean).join(' · '), 80, 515, W - 160);
    var y = 640;
    stack.forEach(function (s, n) {
      x.fillStyle = 'rgba(255,255,255,.08)'; roundRect(x, 80, y - 70, W - 160, 120, 28); x.fill();
      x.fillStyle = '#E0521C'; x.beginPath(); x.arc(150, y - 10, 34, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#fff'; x.font = '600 34px ' + sans; x.textAlign = 'center'; x.fillText(String(n + 1), 150, y + 2); x.textAlign = 'left';
      x.font = '600 36px ' + sans; x.fillText(s.p.t.replace(s.p.b, '').trim().slice(0, 34), 210, y - 14, W - 330);
      x.font = '400 26px ' + sans; x.fillStyle = 'rgba(255,255,255,.65)'; x.fillText(s.p.b, 210, y + 26, W - 330);
      y += 150;
    });
    x.fillStyle = 'rgba(255,255,255,.6)'; x.font = '500 28px ' + sans; x.fillText('sportsnutritionhub.lk', 80, H - 80);
    x.textAlign = 'right'; x.fillText('Built with the SNH plan quiz', W - 80, H - 80); x.textAlign = 'left';
  }
  function roundRect(x, l, t, w, h, r) { x.beginPath(); x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r); x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath(); }

  /* ---------- forms that write tags (Round 10): normal page POSTs with Shopify's hCaptcha ----------
     Every tag-writing form is a Liquid {% form 'customer' %} with data-shopify-captcha="true", so Shopify's captcha
     bootstrap binds it on load; Shopify.captcha.protect() is the same call for any form that missed that. Never
     fetch() or form.submit() these: both skip the captcha and land on Shopify's "Missing CAPTCHA token" page. */
  function protectForms(scope) {
    $$('form[data-snh-post]', scope).forEach(function (f) {
      try { if (!f.dataset.cptcha && window.Shopify && Shopify.captcha && Shopify.captcha.protect) Shopify.captcha.protect(f); } catch (e) {}
      f.addEventListener('submit', function () { try { sessionStorage.setItem('snh_posting', f.getAttribute('data-snh-post')); } catch (e) {} });
    });
  }
  // back from a POST: return_to is /account?snh_posted=<kind>#<view>; Shopify's own ?customer_posted=true also counts
  function flash(app, view) {
    var box = app.querySelector('[data-flash]'), href = location.href;
    var kind = (href.match(/[?&]snh_posted=([a-z]+)/) || [])[1];
    if (!kind && /[?&](customer|contact)_posted=true/.test(href)) { try { kind = sessionStorage.getItem('snh_posting'); } catch (e) {} }
    try { sessionStorage.removeItem('snh_posting'); } catch (e) {}
    if (!kind) return;
    history.replaceState(null, '', location.pathname + '#' + view);
    var msg = box && box.getAttribute('data-msg-' + kind);
    if (!msg) return;
    box.querySelector('[data-flash-msg]').textContent = msg;
    box.hidden = false;
    box.querySelector('[data-flash-close]').addEventListener('click', function () { box.hidden = true; });
  }

  /* ---------- the app ---------- */
  function appInit(app) {
    var mock = app.hasAttribute('data-mock');
    var live = app.querySelector('[data-app-live]');
    var navs = $$('.app__link[data-go], .app__tab[data-go]', app);

    function hdr() { return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr-h')) || 64; }
    function show(v, opt) {
      opt = opt || {};
      if (VIEWS.indexOf(v) < 0) v = 'overview';
      var prev = app.getAttribute('data-view');
      app.setAttribute('data-view', v);
      navs.forEach(function (a) { if (a.getAttribute('data-go') === v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
      lsSet('snh_app_view', v);
      var pane = app.querySelector('[data-pane="' + v + '"]');
      if (prev !== v && opt.anim !== false && !reduce) { pane.classList.remove('is-in'); void pane.offsetWidth; pane.classList.add('is-in'); }
      if (opt.scroll) {
        var top = app.getBoundingClientRect().top + window.scrollY - hdr();
        if (window.scrollY > top) window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
      }
      var h = pane.querySelector('h1');
      if (live && h && opt.anim !== false) live.textContent = h.textContent.trim();
      if (opt.focus && h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
      countUp(pane);
    }
    var start = (location.hash || '').slice(1).split(/[?&]/)[0];
    if (VIEWS.indexOf(start) < 0) start = app.getAttribute('data-view');
    show(start, { anim: false });
    flash(app, start);
    protectForms(app);
    window.addEventListener('hashchange', function () {
      var v = location.hash.slice(1).split(/[?&]/)[0];
      if (VIEWS.indexOf(v) > -1 && v !== app.getAttribute('data-view')) show(v, { scroll: true, focus: true });
    });

    /* links into views + the extra action some of them carry */
    app.addEventListener('click', function (e) {
      var a = e.target.closest('[data-go]');
      if (a && app.contains(a)) {
        e.preventDefault();
        var v = a.getAttribute('data-go');
        if (location.hash !== '#' + v) history.pushState(null, '', '#' + v);
        show(v, { scroll: true, focus: !a.hasAttribute('data-redeem-open') && !a.hasAttribute('data-open-edit') && !a.hasAttribute('data-open-addr') && !a.hasAttribute('data-quiz-to') });
        if (a.hasAttribute('data-redeem-open')) openRedeem();
        if (a.hasAttribute('data-open-edit')) openEdit();
        if (a.hasAttribute('data-open-addr')) { var n = app.querySelector('[data-aform-open="new"]'); if (n && !n.disabled && n.getAttribute('aria-expanded') !== 'true') n.click(); }
        if (a.hasAttribute('data-quiz-to')) openQuiz(a.getAttribute('data-quiz-to'));
        return;
      }
      var r = e.target.closest('[data-app-reorder]');
      if (r && !r.disabled && !mock) reorder(r);
      var ro = e.target.closest('[data-reorder-open]');
      if (ro) openReorder(ro.getAttribute('data-reorder-open'));
    });
    window.addEventListener('popstate', function () { var v = location.hash.slice(1); if (VIEWS.indexOf(v) > -1) show(v, { scroll: true }); });

    /* redeem: ask → confirm → the customer form */
    var ask = app.querySelector('[data-redeem-ask]'), conf = app.querySelector('[data-redeem-confirm]');
    function openRedeem() {
      if (!ask || !conf) return;
      ask.hidden = true; conf.hidden = false;
      conf.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
      conf.querySelector('.bal__q').focus({ preventScroll: true });
    }
    if (ask && conf) {
      ask.querySelector('[data-redeem-go]').addEventListener('click', openRedeem);
      conf.querySelector('[data-redeem-cancel]').addEventListener('click', function () { conf.hidden = true; ask.hidden = false; ask.querySelector('button').focus(); });
    }

    /* orders: search + status (current page, as V8), details */
    var oq = app.querySelector('[data-order-q]'), os = app.querySelector('[data-order-s]'), none = app.querySelector('[data-order-none]');
    // every word must match (order number with or without #, product, flavour/size, brand); status = one exact token
    function filter() {
      var words = (oq.value || '').toLowerCase().replace(/#/g, ' ').split(/\s+/).filter(Boolean), s = os.value, shown = 0;
      $$('[data-order]', app).forEach(function (o) {
        var hay = o.getAttribute('data-q') || '', st = (o.getAttribute('data-status') || '').split(' ');
        var ok = words.every(function (w) { return hay.indexOf(w) > -1; }) && (s === 'all' || st.indexOf(s) > -1);
        o.hidden = !ok;
        if (ok) shown++;
      });
      if (none) none.hidden = shown > 0;
    }
    if (oq && os) { oq.addEventListener('input', filter); os.addEventListener('change', filter); }
    $$('[data-order-toggle]', app).forEach(function (b) {
      b.addEventListener('click', function () {
        var box = document.getElementById(b.getAttribute('aria-controls')), on = b.getAttribute('aria-expanded') !== 'true';
        b.setAttribute('aria-expanded', String(on));
        box.hidden = !on;
      });
    });

    /* earnings calculator (Rewards): Rs a month → points at the member's rate, their Rs value, months to the next reward */
    $$('[data-calc]', app).forEach(function (c) {
      var inp = c.querySelector('[data-calc-in]'), d = c.dataset;
      var rate = +d.rate || 0, per = +d.per || 1, from = +d.from || 0, have = +d.have || 0, silver = +d.silver, gold = +d.gold;
      function rs(n) { return 'Rs ' + Math.round(n).toLocaleString('en-US'); }
      function upd() {
        var v = +inp.value, pts = Math.floor(v * rate / 100), need = Math.max(from - have, 0), yr = v * 12;
        var months = pts > 0 ? Math.ceil(need / pts) : 0;
        inp.style.setProperty('--p', ((v - inp.min) / (inp.max - inp.min) * 100) + '%');
        c.querySelector('[data-calc-spend]').textContent = rs(v);
        c.querySelector('[data-calc-pts]').textContent = pts.toLocaleString('en-US');
        c.querySelector('[data-calc-val]').textContent = rs(pts * per);
        c.querySelector('[data-calc-when]').textContent = need === 0 ? 'Ready now' : 'In about ' + months + ' month' + (months === 1 ? '' : 's');
        c.querySelector('[data-calc-tier]').textContent = rs(yr) + ' a year' + (yr >= gold ? ' would put you in Gold.' : yr >= silver ? ' would put you in Silver.' : '. Silver starts at ' + rs(silver) + '.');
      }
      inp.addEventListener('input', upd);
      upd();
    });

    /* re-order preview: what goes in the basket, per-item stock and price, then "Add N items" */
    var rdlg = app.querySelector('[data-reorder-dlg]');
    function openReorder(id) {
      var tpl = document.getElementById(id);
      if (!rdlg || !tpl || !rdlg.showModal) return;
      var body = rdlg.querySelector('[data-reorder-body]');
      body.innerHTML = '';
      body.appendChild(tpl.content.cloneNode(true));
      rdlg.showModal();
      var go = body.querySelector('[data-app-reorder]:not([disabled])') || rdlg.querySelector('[data-reorder-close]');
      if (go) go.focus();
    }
    if (rdlg) {
      rdlg.addEventListener('click', function (e) { if (e.target === rdlg || e.target.closest('[data-reorder-close]')) rdlg.close(); });
    }

    /* sign out: confirm sheet ("Stay signed in" is the default) */
    var out = app.querySelector('[data-signout]');
    if (out && out.showModal) {
      $$('[data-signout-open]', app).forEach(function (a) {
        a.addEventListener('click', function (e) { e.preventDefault(); out.showModal(); out.querySelector('[data-signout-close]').focus(); });
      });
      $$('[data-signout-close]', out).forEach(function (b) { b.addEventListener('click', function (e) { if (b.tagName === 'A') e.preventDefault(); out.close(); }); });
      out.addEventListener('click', function (e) { if (e.target === out) out.close(); });
    }

    /* avatar studio (V8 icons + Round 10 sporty presets + a colour; this device only). A photo from the app
       (custom.avatar, data-photo) always wins over the presets. */
    var picks = $$('.avp__b', app), cols = $$('.avp__c', app);
    var slots = $$('[data-avatar-slot]', app).filter(function (s) { return !s.hasAttribute('data-photo'); });
    function setAvatar(k, save) {
      var btn = picks.filter(function (b) { return b.getAttribute('data-avatar') === k; })[0] || picks[0];
      if (!btn) return;
      k = btn.getAttribute('data-avatar');
      slots.forEach(function (s) { s.innerHTML = k === 'initials' ? '<span>' + esc(s.getAttribute('data-initials')) + '</span>' : btn.innerHTML; });
      picks.forEach(function (b) { b.setAttribute('aria-checked', String(b === btn)); });
      if (save) lsSet('snh_vector_avatar', k);
    }
    function setColour(c, save) {
      var btn = cols.filter(function (b) { return b.getAttribute('data-avatar-colour') === c; })[0];
      c = btn ? c : 'tier';
      $$('[data-avatar-slot]', app).forEach(function (s) { if (c === 'tier') s.removeAttribute('data-av-c'); else s.setAttribute('data-av-c', c); });
      cols.forEach(function (b) { b.setAttribute('aria-checked', String(b.getAttribute('data-avatar-colour') === c)); });
      if (save) lsSet('snh_avatar_colour', c);
    }
    setAvatar(lsGet('snh_vector_avatar') || 'initials', false);
    setColour(lsGet('snh_avatar_colour') || 'tier', false);
    picks.forEach(function (b) { b.addEventListener('click', function () { setAvatar(b.getAttribute('data-avatar'), true); }); });
    cols.forEach(function (b) { b.addEventListener('click', function () { setColour(b.getAttribute('data-avatar-colour'), true); }); });
    $$('[data-avp-toggle]', app).forEach(function (t) {
      t.addEventListener('click', function () {
        var box = document.getElementById(t.getAttribute('aria-controls')), on = t.getAttribute('aria-expanded') !== 'true';
        t.setAttribute('aria-expanded', String(on)); box.hidden = !on;
      });
    });
    // photo upload (setting, off by default): the SNH Elite app proxy stores it and writes customer.metafields.custom.avatar
    var up = app.querySelector('[data-avatar-file]');
    if (up) up.addEventListener('change', function () {
      var f = up.files && up.files[0], msg = app.querySelector('[data-avatar-msg]');
      if (!f) return;
      if (f.size > 5 * 1024 * 1024) { msg.textContent = 'That photo is over 5 MB. Try a smaller one.'; return; }
      var fd = new FormData(); fd.append('avatar', f);
      msg.textContent = 'Uploading…';
      fetch('/apps/elite/avatar', { method: 'POST', body: fd, credentials: 'same-origin', headers: { Accept: 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
        .then(function (j) {
          if (!j || !j.url) throw new Error('no url');
          $$('[data-avatar-slot]', app).forEach(function (s) { s.setAttribute('data-photo', ''); s.innerHTML = '<img src="' + esc(j.url) + '" alt="">'; });
          msg.textContent = 'Photo saved.';
        })
        .catch(function () { msg.textContent = "Photo upload isn't available yet. Pick an avatar above instead."; });
    });

    /* birthday: reveal the field, the customer form posts tag bday:YYYY-MM-DD (normal POST, hCaptcha) */
    var bOpen = app.querySelector('[data-bday-open]');
    if (bOpen) {
      var bBox = app.querySelector('[data-bday-box]'), bIn = app.querySelector('[data-bday-in]'), bTag = app.querySelector('[data-bday-tag]');
      bOpen.addEventListener('click', function () { bBox.hidden = false; bOpen.hidden = true; bOpen.setAttribute('aria-expanded', 'true'); bIn.focus(); });
      bIn.addEventListener('input', function () { bTag.value = bIn.value ? 'bday:' + bIn.value : ''; });
    }

    /* edit profile (V8 two steps on the customer_address form; saved in the background, then back to #profile) */
    var dlg = app.querySelector('[data-edit]');
    function editStep(n) {
      $$('[data-edit-step]', dlg).forEach(function (s) { s.hidden = s.getAttribute('data-edit-step') !== String(n); });
      $$('[data-edit-dot]', dlg).forEach(function (d) { d.classList.toggle('is-on', +d.getAttribute('data-edit-dot') <= n); });
      var f = dlg.querySelector('[data-edit-step="' + n + '"] input');
      if (f) f.focus();
    }
    function openEdit() { if (!dlg) return; if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); } editStep(1); }
    if (dlg) {
      $$('[data-sl-mobile]', dlg).forEach(bindMobile);
      $$('[data-edit-open]', app).forEach(function (b) { b.addEventListener('click', openEdit); });
      dlg.querySelector('[data-edit-close]').addEventListener('click', function () { dlg.close(); });
      dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
      dlg.querySelector('[data-edit-next]').addEventListener('click', function () {
        var bad = $$('[data-edit-step="1"] input', dlg).filter(function (i) { if (i.__check) i.__check(true); return !i.checkValidity(); })[0];
        if (bad) { bad.reportValidity(); return; }
        editStep(2);
      });
      dlg.querySelector('[data-edit-back]').addEventListener('click', function () { editStep(1); });
      var form = dlg.querySelector('form'), err = dlg.querySelector('[data-edit-err]');
      if (form && !mock) form.addEventListener('submit', function (e) {
        e.preventDefault();
        var btn = form.querySelector('button[type="submit"]'), lbl = btn.querySelector('span'), was = lbl.textContent;
        btn.disabled = true; lbl.textContent = 'Saving…'; err.hidden = true;
        fetch(form.action, { method: 'POST', body: new FormData(form), credentials: 'same-origin' }).then(function (r) {
          if (!r.ok) throw new Error(String(r.status));
          if (/\/challenge/.test(r.url)) { form.submit(); return; }
          location.href = (window.routes && routes.accountUrl || '/account') + '?profile=saved#profile';
        }).catch(function () { err.hidden = false; btn.disabled = false; lbl.textContent = was; });
      });
      if (dlg.querySelector('.aform__err:not([data-edit-err])')) { show('profile', { anim: false }); openEdit(); }
    }
    if (/[?&]profile=saved/.test(location.search)) {
      say('Profile saved');
      history.replaceState(null, '', location.pathname + location.hash);
    }

    /* goals: tags from the server, or what the member just picked on this device */
    var groot = app.querySelector('[data-goal-root]');
    var quizEl = groot && groot.querySelector('[data-quiz]');
    var quizBox = groot && groot.querySelector('[data-goal-quiz]');
    var setBox = groot && groot.querySelector('[data-goal-set]');
    var quiz = null;
    function state() {
      var s = { goal: groot.getAttribute('data-goal'), freq: groot.getAttribute('data-freq'), sport: groot.getAttribute('data-sport') };
      var l = lsJson('snh_goals');
      if (l && l.email === app.getAttribute('data-email') && l.goal) s = l;
      return s;
    }
    function paint(s, keepQuiz) {
      if (!groot) return;
      $$('[data-goal-card]', groot).forEach(function (c) { c.hidden = c.getAttribute('data-goal-card') !== s.goal; });
      if (s.goal) {
        setBox.hidden = false;
        if (!keepQuiz) quizBox.hidden = true;
        groot.querySelector('[data-goal-name]').textContent = quiz.label('goal', s.goal) || s.goal;
        groot.querySelector('[data-goal-meta]').textContent = [quiz.label('freq', s.freq), quiz.label('sport', s.sport)].filter(Boolean).join(' · ') || 'Add your training days and sport for sharper tips.';
      } else { setBox.hidden = true; quizBox.hidden = false; }
      var prompt = app.querySelector('[data-goal-prompt]');
      if (prompt && (s.goal || lsGet('snh_goal_prompt_off'))) prompt.hidden = true;
      profileCheck('goal', !!s.goal);
      if (s.bday) profileCheck('bday', true);
      if (s.mobile) profileCheck('phone', true);
    }
    function openQuiz(step) {
      if (!quizBox) return;
      quizBox.hidden = false;
      if (setBox) setBox.hidden = true;
      if (quiz) quiz.to(step || 'goal');
      quizBox.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
    }
    if (quizEl) {
      // onDone runs as the form posts (saving = true) or when the quiz ends with nothing to save
      quiz = quizInit(quizEl, function (a, bits, saving) {
        if (!saving) { paint(state()); return; }
        var prev = state();
        var s = { goal: a.goal || prev.goal || '', freq: a.freq || prev.freq || '', sport: a.sport || prev.sport || '', bday: a.bday, mobile: a.mobile, email: app.getAttribute('data-email'), at: Date.now() };
        lsSet('snh_goals', JSON.stringify(s));
      });
      quiz.fill(state());
      paint(state());
      groot.querySelector('[data-goal-edit]').addEventListener('click', function () { openQuiz('goal'); });
      var pc = app.querySelector('[data-prompt-close]');
      if (pc) pc.addEventListener('click', function () { lsSet('snh_goal_prompt_off', '1'); pc.closest('[data-goal-prompt]').hidden = true; });

      lsDel('snh_onboard_pending'); // Round 8 leftover: sign-up answers now post with the account itself
    }

    /* complete-your-profile ring follows what's filled in on this device too */
    function profileCheck(key, on) {
      var card = app.querySelector('[data-profile-card]');
      if (!card || !on) return;
      var li = card.querySelector('[data-check="' + key + '"]');
      if (!li || li.classList.contains('is-done')) return;
      li.classList.add('is-done');
      var a = li.querySelector('a');
      if (a) { var sp = document.createElement('span'); sp.textContent = { phone: 'Mobile number', bday: 'Birthday', goal: 'Training goal', addr: 'Delivery address' }[key]; a.replaceWith(sp); }
      var n = $$('[data-check]', card).length, d = $$('[data-check].is-done', card).length, pct = Math.round(d / n * 100);
      card.querySelector('[data-ring]').style.setProperty('--p', pct);
      card.querySelector('[data-ring-n]').textContent = pct + '%';
      if (d === n) card.hidden = true;
    }

    /* SMS: live when the setting says so or an SMS app is on the page */
    var sms = app.querySelector('[data-sms]');
    if (sms && !sms.hasAttribute('data-sms-live') && (window.postscript || window.attentive || window.__attentive_domain || window.SMSBump || document.querySelector('script[src*="postscript"], script[src*="attn.tv"], script[src*="smsbump"]'))) {
      sms.querySelector('[data-sms-off]').hidden = true;
      sms.querySelector('[data-sms-on]').hidden = false;
      sms.querySelector('[data-sms-pill]').textContent = 'Available';
    }
  }

  /* ---------- R18 · free workout plans (snippets/snh-workout-plans): pick the best match, render a weekly table ---------- */
  var WK_GOAL = { 'build-muscle': 'muscle', 'lose-fat': 'fat', endurance: 'endurance', 'hydration-recovery': 'health', 'daily-health': 'health' };
  var WK_ENDURE = { running: 1, cycling: 1, swimming: 1, cricket: 1, football: 1, rugby: 1, padel: 1 };
  var WK_DAYS = { '1-2x': '2-3', '3x': '2-3', '4x': '4', '5x': '5-6', '6x': '5-6' };
  var WK_SPORT = {
    cricket: 'Cricket: after day 1, add 6 × 20 m sprints with a walk-back recovery, and do band shoulder rotations before every session.',
    padel: 'Padel: add lateral shuffles and split-step drills (3 × 30 s) to your warm-ups, and forearm and shoulder band work twice a week.',
    running: 'Running: keep 80% of your running easy, and add 4 × 20 s relaxed strides after one easy run a week.',
    cycling: 'Cycling: swap any run for a ride at the same effort, and keep the single-leg work: it fixes left-right imbalances on the bike.',
    swimming: 'Swimming: swap cardio days for pool sessions, and add band pull-aparts (3 × 15) to every strength day for healthy shoulders.',
    football: 'Football: add 6 × 30 m sprints and change-of-direction drills once a week, and Copenhagen planks for groin strength.',
    rugby: 'Rugby: add sled pushes or prowler work at the end of a lower day, and neck and shoulder strengthening twice a week.',
    gym: 'Gym: log every session. Beat last week by one rep or a little weight; that is progressive overload.',
    other: 'Your sport: add one short skill or conditioning session that mirrors how your sport moves, and keep a rest day before games.'
  };
  function wkData() { var el = document.querySelector('[data-wk-plans]'); if (!el) return []; if (!el.__d) { try { el.__d = JSON.parse(el.textContent); } catch (e) { el.__d = []; } } return el.__d; }
  function planFor(a) {
    var plans = wkData(); if (!plans.length) return null;
    var g = a.goal === 'sport-specific' ? (a.sport === 'gym' ? 'muscle' : WK_ENDURE[a.sport] ? 'endurance' : 'health') : WK_GOAL[a.goal] || WK_GOAL[a.goal2] || 'health';
    var lv = a.lvl === 'beginner' || !a.lvl ? 'beginner' : 'intermediate';
    var d = WK_DAYS[a.freq] || (lv === 'beginner' ? '2-3' : '4');
    var best = null, bs = -1;
    plans.forEach(function (p) { var sc = (p.goal === g ? 100 : 0) + (p.days === d ? 10 : 0) + (p.level === lv ? 1 : 0); if (sc > bs) { bs = sc; best = p; } });
    return best;
  }
  function planById(id) { return wkData().filter(function (p) { return p.id === id; })[0] || null; }
  function planNotes(p, a) {
    var n = [];
    if (a && a.lvl === 'beginner' && p.level !== 'beginner') n.push('New to this? Do one set fewer on every exercise for the first two weeks, and finish each set with 2–3 reps left in the tank.');
    if (a && a.lvl === 'advanced') n.push('Advanced: add a set to the first two exercises each day, and add load every week you hit the top of the rep range.');
    if (a && a.sport && WK_SPORT[a.sport]) n.push(WK_SPORT[a.sport]);
    return n;
  }
  /* R19 #4 + #9: exercise pictograms (48 × 48 line drawings by movement pattern), editor demos, the weekly table
     (desktop) / day cards (phones), and the session tracker. Demos: "Exercise demo" blocks print
     <script data-wk-demos> ({ name, img, video, url }); a demo whose name is in the exercise name replaces the drawing
     and its URL replaces the YouTube search. */
  var WK_FLOOR = 'M4 44h40';
  var WK_PICS = {
    stand: [[24, 8], 'M24 12v16M24 28l-5 16M24 28l5 16M24 15l-7 11M24 15l7 11'],
    squat: [[18, 11], 'M20 15l6 15M26 30h10l-2 14M20 17l14 2M8 44h32'],
    hinge: [[11, 18], 'M15 20l17 2M32 22l1 11-1 11M16 21l1 13M10 34h14M8 44h32'],
    bench: [[10, 28], 'M14 30h18M32 30l6 8v6M20 30V16M12 16h16M8 35h30M12 35v9M34 35v9'],
    press: [[24, 9], 'M24 13v15M24 28l-5 16M24 28l5 16M24 16l-7-6V3M24 16l7-6V3M10 3h28'],
    row: [[11, 18], 'M15 20l17 2M32 22l1 11-1 11M16 21l6 7M20 29h6M8 44h32'],
    pull: [[24, 14], 'M8 4h32M18 4l3 10M30 4l-3 10M24 18v13M24 31l-3 11M24 31l3 11'],
    lunge: [[24, 8], 'M24 12v16M24 28l10 2v14M24 28l-8 10-6 6M24 15l-2 11M24 15l2 11M4 44h40'],
    curl: [[24, 8], 'M24 12v16M24 28l-5 16M24 28l5 16M24 15l-5 10 -4-7M24 15l5 10 4-7'],
    plank: [[8, 29], 'M12 31l28 5M14 32v7h6M40 36l2 8M4 44h40'],
    pushup: [[8, 22], 'M12 24l28 14M14 25v19M40 38l2 6M4 44h40'],
    run: [[26, 8], 'M25 12l-3 14M22 26l8 8-2 10M22 26l-6 8-6-2M24 15l6 5 4-4M24 15l-6 7-4-2'],
    bike: [[32, 9], 'M12 36m-7 0a7 7 0 1 0 14 0a7 7 0 1 0-14 0M36 36m-7 0a7 7 0 1 0 14 0a7 7 0 1 0-14 0M12 36l10-10 14 10M30 13l-8 12M30 15l6 9M22 25l4 9'],
    rower: [[14, 18], 'M16 22l6 12M22 34l10-8 8 8M17 24l13 2M4 42h40M30 26h6'],
    swim: [[10, 24], 'M14 25l18 3M14 24L4 20M32 28l12-2M4 36c4-3 8 3 12 0s8 3 12 0 8 3 12 0'],
    carry: [[24, 8], 'M24 12v16M24 28l-5 16M24 28l5 16M24 15l-8 13M24 15l8 13M13 28h6v6h-6zM29 28h6v6h-6z'],
    jump: [[24, 6], 'M24 10v14M24 13l-8-9M24 13l8-9M24 24l-6 6 2 6M24 24l6 6-2 6M8 44h32'],
    raise: [[24, 8], 'M24 12v16M24 28l-5 16M24 28l5 16M24 15H8M24 15h16M6 13v4M42 13v4'],
    bridge: [[8, 40], 'M12 40l16-10M28 30l8 4v10M12 40v4M4 44h40'],
    hang: [[24, 15], 'M14 4h20M20 4l2 8M28 4l-2 8M24 19v11M24 30l10-2v10'],
    calf: [[24, 6], 'M24 10v16M24 26l-4 14M24 26l4 14M20 40l-2 2M28 40l2 2M24 13l-6 10M24 13l6 10M12 42h24v2H12z'],
    stretch: [[24, 8], 'M24 12v16M24 28l-8 16M24 28l10 14M24 15l-6-9M24 15l10 4']
  };
  var WK_MATCH = [
    ['bike', /bike|cycl|spin\b/], ['rower', /rower|rowing|\berg\b/], ['swim', /swim|pool/], ['calf', /calf/],
    ['hang', /knee raise|leg raise|crunch|sit-up|ab wheel|cable crunch/], ['raise', /lateral raise|front raise|rear-delt|reverse fly|y-raise/],
    ['bridge', /bridge|hip thrust|glute/], ['pull', /pull-up|pullup|chin-up|pulldown/], ['lunge', /lunge|split squat|step-up|step up|bulgarian/],
    ['squat', /squat|leg press|goblet|wall sit|thruster|leg extension/], ['hinge', /deadlift|romanian|\brdl\b|good morning|swing|leg curl|hinge/],
    ['press', /overhead|shoulder press|arnold|military|push press/], ['bench', /bench|chest press|\bfly\b|floor press|incline .*press|dumbbell press/],
    ['row', /\brow\b|row\b|face pull|pull-apart|renegade/], ['pushup', /push-up|press-up|\bdips?\b/],
    ['curl', /curl|tricep|pushdown|extension|kickback|skull/], ['plank', /plank|dead bug|bird dog|hollow|pallof|core|mountain/],
    ['carry', /carry|farmer|suitcase/], ['jump', /jump|burpee|skater|hiit|box|skip|rope|jack|circuit/],
    ['run', /run|jog|sprint|stride|interval|tempo|shuffle|drill/], ['stretch', /stretch|mobility|yoga|foam|walk|warm|cool/]
  ];
  function wkKind(n) { n = String(n).toLowerCase(); for (var i = 0; i < WK_MATCH.length; i++) if (WK_MATCH[i][1].test(n)) return WK_MATCH[i][0]; return 'stand'; }
  function wkPic(name) {
    var k = wkKind(name), d = WK_PICS[k];
    return '<svg class="wk__pic-svg" viewBox="0 0 48 48" aria-hidden="true" data-kind="' + k + '"><circle cx="' + d[0][0] + '" cy="' + d[0][1] + '" r="4"/><path d="' + d[1] + '"/></svg>';
  }
  function wkDemos() { var el = document.querySelector('[data-wk-demos]'); if (!el) return []; if (!el.__d) { try { el.__d = JSON.parse(el.textContent).filter(function (x) { return x && x.name; }); } catch (e) { el.__d = []; } } return el.__d; }
  function wkDemo(name) { var n = String(name).toLowerCase(), best = null; wkDemos().forEach(function (d) { var k = String(d.name).toLowerCase().trim(); if (k && n.indexOf(k) > -1 && (!best || k.length > best.name.length)) best = d; }); return best; }
  function wkHow(name) { var d = wkDemo(name); return d && d.url ? d.url : 'https://www.youtube.com/results?search_query=' + encodeURIComponent(name + ' exercise form'); }
  function wkVisual(name) {
    var d = wkDemo(name);
    if (d && d.video) return '<span class="wk__pic wk__pic--media"><video src="' + esc(d.video) + '" muted loop playsinline autoplay preload="none"' + (d.img ? ' poster="' + esc(d.img) + '"' : '') + ' aria-hidden="true"></video></span>';
    if (d && d.img) return '<span class="wk__pic wk__pic--media"><img src="' + esc(d.img) + '" alt="" loading="lazy" width="96" height="96"></span>';
    return '<span class="wk__pic">' + wkPic(name) + '</span>';
  }
  /* tracker: localStorage snh_wk_track = { plan, log: { 'YYYY-Www': [day indexes] } }. XP = 50 per completed session
     (it only accumulates; no rewards). Device-only: cross-device sync needs a backend (WORKOUT-PLANS.md). */
  var WK_XP = 50, WK_LVL = 500;
  function wkWeek(dt) { var d = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate())), day = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - day); var y = d.getUTCFullYear(), w = Math.ceil(((d - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7); return y + '-W' + (w < 10 ? '0' : '') + w; }
  function wkTrack(id) { var t = lsJson('snh_wk_track') || {}; if (!t.log) t.log = {}; if (t.plan !== id) { t.plan = id; } return t; }
  function wkStats(p) {
    var t = wkTrack(p.id), wk = wkWeek(new Date()), done = (t.log[wk] || []).length, total = 0, streak = 0;
    Object.keys(t.log).forEach(function (k) { total += t.log[k].length; });
    // streak: consecutive weeks (back from this one; this week counts once it has a session) with every session done
    var d = new Date(), need = p.w.length;
    if (done < need) d.setDate(d.getDate() - 7);
    for (var i = 0; i < 104; i++) { var k = wkWeek(d); if ((t.log[k] || []).length >= need) { streak++; d.setDate(d.getDate() - 7); } else break; }
    var xp = total * WK_XP;
    return { week: wk, done: done, need: need, total: total, streak: streak, xp: xp, level: Math.floor(xp / WK_LVL) + 1, into: xp % WK_LVL, log: t.log[wk] || [] };
  }
  function wkToggle(p, n, on) {
    var t = wkTrack(p.id), wk = wkWeek(new Date()), l = t.log[wk] || [];
    l = l.filter(function (x) { return x !== n; }); if (on) l.push(n);
    t.log[wk] = l.sort(); try { localStorage.setItem('snh_wk_track', JSON.stringify(t)); } catch (e) {}
    document.dispatchEvent(new CustomEvent('snh:wk', { detail: wkStats(p) }));
  }
  function wkTrackerHtml(s) {
    var pct = Math.round(s.into / WK_LVL * 100), wp = Math.round(s.done / s.need * 100);
    return '<div class="wkt" data-wk-tracker><div class="wkt__c"><p class="wkt__k">This week</p><p class="wkt__v"><b>' + s.done + '</b>/' + s.need + ' sessions</p><div class="wkt__bar" role="progressbar" aria-label="Sessions this week" aria-valuemin="0" aria-valuemax="' + s.need + '" aria-valuenow="' + s.done + '"><i style="width:' + wp + '%"></i></div></div>' +
      '<div class="wkt__c"><p class="wkt__k">Streak</p><p class="wkt__v"><b>' + s.streak + '</b> ' + (s.streak === 1 ? 'week' : 'weeks') + '</p><p class="wkt__s">Weeks with every session done</p></div>' +
      '<div class="wkt__c wkt__c--xp"><span data-shaker data-now data-pct="' + pct + '" data-tier="orange" data-size="72" data-label="' + pct + '% to level ' + (s.level + 1) + '"></span><div class="wkt__xt"><p class="wkt__k">Level ' + s.level + '</p><p class="wkt__v"><b>' + s.xp.toLocaleString('en-US') + '</b> XP</p><div class="wkt__bar wkt__bar--xp" role="progressbar" aria-label="XP to the next level" aria-valuemin="0" aria-valuemax="' + WK_LVL + '" aria-valuenow="' + s.into + '"><i style="width:' + pct + '%"></i></div><p class="wkt__s">' + (WK_LVL - s.into) + ' XP to level ' + (s.level + 1) + ' · ' + WK_XP + ' XP a session</p></div></div></div>';
  }
  // opts: answers, preview (only day 1 open, the rest locked), track (session ticks + tracker), compact (no notes)
  function renderPlan(el, p, opts) {
    if (!el || !p) return;
    opts = opts || {};
    var notes = planNotes(p, opts.answers), st = opts.track ? wkStats(p) : null;
    var tick = function (n, where) { if (!st) return ''; var on = st.log.indexOf(n) > -1; return '<label class="wk__tick' + (where ? ' wk__tick--' + where : '') + '"><input type="checkbox" data-wk-done="' + n + '"' + (on ? ' checked' : '') + '><span>' + (on ? 'Done' : 'Mark done') + '</span></label>'; };
    var ex = function (x, lock) {
      var name = esc(x[0]);
      return wkVisual(x[0]) + '<span class="wk__en">' + (lock ? '<span class="wk__nm">' + name + '</span>' : '<a class="wk__nm" href="' + esc(wkHow(x[0])) + '" target="_blank" rel="noopener">' + name + '<span class="v-sr"> (watch how, opens in a new tab)</span></a>') +
        '<span class="wk__sr"><b>' + esc(x[1]) + '</b>' + (x[2] && x[2] !== '—' ? '<span>rest ' + esc(x[2]) + '</span>' : '') + (lock ? '' : '<a class="wk__how" href="' + esc(wkHow(x[0])) + '" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">▶ Watch how</a>') + '</span></span>';
    };
    // desktop: one weekly table (days as columns); phones: stacked day cards. Both in the DOM, CSS picks one.
    var rows = Math.max.apply(null, p.w.map(function (d) { return d.x.length; })), head = '', body = '';
    p.w.forEach(function (day, n) {
      var lock = opts.preview && n > 0;
      head += '<th scope="col" class="' + (lock ? 'is-locked' : '') + '"><span class="wk__dn">Day ' + (n + 1) + ' · ' + esc(day.d) + '</span><span class="wk__df">' + esc(day.f) + '</span>' + (lock ? '<span class="wk__lk">Locked</span>' : tick(n, 'th')) + '</th>';
    });
    for (var r = 0; r < rows; r++) {
      body += '<tr>' + p.w.map(function (day, n) { var x = day.x[r], lock = opts.preview && n > 0; return '<td class="' + (lock ? 'is-locked' : '') + '"' + (lock ? ' aria-hidden="true"' : '') + '>' + (x ? '<div class="wk__ex">' + ex(x, lock) + '</div>' : '') + '</td>'; }).join('') + '</tr>';
    }
    var table = '<div class="wk__week"><table class="wk__wt" style="--cols:' + p.w.length + '"><caption class="v-sr">' + esc(p.t) + ': exercises per training day</caption><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table>' +
      (opts.preview && p.w.length > 1 ? '<p class="wk__lockline">Days 2–' + p.w.length + ' are locked: unlock them below</p>' : '') + '</div>';
    var cards = '<div class="wk__days">' + p.w.map(function (day, n) {
      var lock = opts.preview && n > 0;
      return '<section class="wk__day' + (lock ? ' is-locked' : '') + '"' + (lock ? ' aria-hidden="true"' : '') + '><header class="wk__dh"><span class="wk__dn">Day ' + (n + 1) + ' · ' + esc(day.d) + '</span><b class="wk__df">' + esc(day.f) + '</b>' + (lock ? '' : tick(n, 'card')) + '</header>' +
        '<ol class="wk__list" role="list">' + day.x.map(function (x) { return '<li class="wk__ex">' + ex(x, lock) + '</li>'; }).join('') + '</ol>' + (lock ? '<span class="wk__lk wk__lk--card">Locked: unlock below</span>' : '') + '</section>';
    }).join('') + '</div>';
    el.innerHTML = '<div class="wk__head"><p class="eyebrow">Your free workout plan · by SNH</p><h3 class="wk__h">' + esc(p.t) + '</h3><p class="wk__s">' + esc(p.s) + '</p>' +
      '<p class="wk__meta"><span>' + p.w.length + ' days a week</span><span>' + (p.level === 'beginner' ? 'Beginner' : 'Intermediate') + '</span><span>Tap an exercise to watch how</span></p></div>' +
      (st ? wkTrackerHtml(st) : '') + table + cards +
      (notes.length && !opts.preview && !opts.compact ? '<ul class="wk__notes" role="list">' + notes.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '') +
      (opts.compact ? '' : '<p class="wk__fine">Warm up for 5–10 minutes first. Rest days are for walking, sleep and food. General guidance, not medical advice: check with a doctor if you have an injury or condition.' + (st ? ' Your ticks are saved on this device only.' : '') + '</p>');
    el.classList.toggle('wk--track', !!st);
    el.hidden = false;
    if (window.SNH && SNH.shakerRun) SNH.shakerRun(el);
    if (st && !el.__wkBound) {
      el.__wkBound = true;
      el.addEventListener('change', function (e) {
        var c = e.target.closest && e.target.closest('[data-wk-done]'); if (!c) return;
        wkToggle(el.__wkPlan, +c.getAttribute('data-wk-done'), c.checked);
        renderPlan(el, el.__wkPlan, el.__wkOpts);
        var f = el.querySelector('[data-wk-done="' + c.getAttribute('data-wk-done') + '"]'); if (f) f.focus();
      });
    }
    el.__wkPlan = p; el.__wkOpts = opts;
  }
  // Klaviyo: profile properties + a "Workout Plan Unlocked" event (the flow in KLAVIYO-WORKOUT.md), and the list
  // subscription when a list is set. Client API with keepalive, so a page POST right after doesn't cut it off.
  function wkKlaviyo(o) {
    var co = o.company, a = o.answers || {}, p = o.plan;
    if (!co || !o.email) return Promise.resolve();
    var props = { snh_goal: a.goal || '', snh_days: a.freq || '', snh_level: a.lvl || '', snh_sport: a.sport || '', snh_plan_id: p ? p.id : '', snh_plan_title: p ? p.t : '', snh_quiz_source: o.source || 'quiz' };
    var prof = { email: o.email, properties: props };
    if (o.first) prof.first_name = o.first;
    if (o.phone) prof.phone_number = o.phone;
    try { (window.klaviyo = window.klaviyo || []).push(['identify', Object.assign({ email: o.email }, props)]); } catch (e) {}
    var H = { 'Content-Type': 'application/vnd.api+json', revision: '2024-10-15' }, base = 'https://a.klaviyo.com/client/';
    var ev = { goal: a.goal || '', days: a.freq || '', level: a.lvl || '', sport: a.sport || '', plan_id: p ? p.id : '', plan_title: p ? p.t : '', plan_summary: p ? p.s : '', plan_days: p ? p.w.map(function (d, n) { return { day: 'Day ' + (n + 1) + ' · ' + d.d, focus: d.f, exercises: d.x.map(function (x) { return x[0] + ': ' + x[1] + ', rest ' + x[2]; }) }; }) : [], plan_url: location.origin + '/account#goals', source: o.source || 'quiz' };
    var jobs = [fetch(base + 'events/?company_id=' + encodeURIComponent(co), { method: 'POST', keepalive: true, headers: H, body: JSON.stringify({ data: { type: 'event', attributes: { properties: ev, metric: { data: { type: 'metric', attributes: { name: 'Workout Plan Unlocked' } } }, profile: { data: { type: 'profile', attributes: prof } } } } }) })];
    if (o.list && o.consent) jobs.push(fetch(base + 'subscriptions/?company_id=' + encodeURIComponent(co), { method: 'POST', keepalive: true, headers: H, body: JSON.stringify({ data: { type: 'subscription', attributes: { custom_source: 'Workout plan quiz', profile: { data: { type: 'profile', attributes: prof } } }, relationships: { list: { data: { type: 'list', id: o.list } } } } }) }));
    return Promise.all(jobs.map(function (j) { return j.catch(function () {}); }));
  }
  window.SNHPlans = { pick: planFor, byId: planById, render: renderPlan, klaviyo: wkKlaviyo, tags: tagsFor, stats: wkStats, kind: wkKind };
  window.snhQuizInit = function (q) { return quizInit(q, null); };

  /* account: a plan the member saved (tag plan:<id>), and a plan built on the homepage before they signed in */
  function wkOverview(app, plan) {
    var card = app.querySelector('[data-wk-overview]'); if (!card) return;
    if (!plan) { card.hidden = true; return; }
    var paint = function () {
      var st = wkStats(plan), next = -1;
      for (var i = 0; i < plan.w.length; i++) if (st.log.indexOf(i) < 0) { next = i; break; }
      var nd = next > -1 ? plan.w[next] : null;
      card.querySelector('[data-wk-ov-body]').innerHTML = '<p class="eyebrow">Your workout plan</p><h2 class="app__h3">' + esc(plan.t) + '</h2>' +
        '<p class="wko__next">' + (nd ? 'Next up: <b>Day ' + (next + 1) + ' · ' + esc(nd.f) + '</b> (' + nd.x.length + ' exercises)' : '<b>Week done.</b> Every session ticked: see you next week.') + '</p>' +
        wkTrackerHtml(st) + '<a class="v-btn v-btn--ink v-btn--sm wko__go" href="#goals" data-app-go="goals"><span>' + (nd ? 'Open my plan' : 'See my plan') + '</span></a>';
      card.hidden = false;
      if (window.SNH && SNH.shakerRun) SNH.shakerRun(card);
    };
    paint();
    if (!card.__wk) { card.__wk = true; document.addEventListener('snh:wk', paint); }
    card.addEventListener('click', function (e) { var g = e.target.closest('[data-app-go]'); if (!g) return; var t = app.querySelector('a[href="#goals"]'); if (t) { e.preventDefault(); t.click(); setTimeout(function () { var b = app.querySelector('[data-wk-account]'); if (b) b.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60); } });
  }
  function wkAccount(app) {
    var box = app.querySelector('[data-wk-account]');
    // R19 #9: the saved plan (tag plan:<id>), else the plan the member's quiz answers match (goal: tag); with the
    // session tracker (ticks, week progress, streak, XP) and an Overview card
    var a = {}; (box && box.getAttribute('data-a') || '').split(',').forEach(function (t) { var m = t.trim().match(/^(\w+):(.+)$/); if (m && !a[m[1]]) a[m[1]] = m[2]; });
    var plan = box && (planById(box.getAttribute('data-plan') || '') || (a.goal ? planFor(a) : null));
    if (box && plan) {
      renderPlan(box.querySelector('[data-wk-body]'), plan, { answers: a, track: true });
      box.hidden = false;
    }
    wkOverview(app, plan);
    var pend = lsJson('snh_quiz_pending'), quizEl = app.querySelector('[data-goal-root] [data-quiz]');
    if (!pend || !pend.answers || Date.now() - (pend.at || 0) > 864e5 * 3 || !quizEl) return;
    if (box && box.getAttribute('data-plan') === pend.plan) { lsDel('snh_quiz_pending'); return; }
    var card = app.querySelector('[data-wk-pending]');
    if (!card) return;
    var p = planById(pend.plan);
    card.hidden = false;
    if (p) card.querySelector('[data-wk-pending-t]').textContent = p.t;
    if (location.hash !== '#goals') { var g = app.querySelector('a[href="#goals"]'); if (g) g.click(); }
    card.querySelector('[data-wk-save]').addEventListener('click', function () {
      var api = quizEl.__quiz, form = quizEl.querySelector('[data-quiz-save]') && quizEl.querySelector('[data-quiz-save]').form;
      if (!api || !form) return;
      api.fill(pend.answers);
      var t = form.querySelector('[data-quiz-tags]');
      t.__extra = function () { return ['plan:' + pend.plan, 'quiz:home']; };
      api.sync();
      var kl = document.querySelector('[data-kl]');
      if (kl) wkKlaviyo({ company: kl.getAttribute('data-kl-company'), list: kl.getAttribute('data-kl-list'), consent: !!pend.consent, email: app.getAttribute('data-email'), answers: pend.answers, plan: p, source: 'quiz-home-signin' });
      lsDel('snh_quiz_pending');
      var sb = quizEl.querySelector('[data-quiz-save]');
      if (form.requestSubmit) form.requestSubmit(sb); else sb.click();   // the quiz's own submit handler + Shopify's bot check
    });
  }

  /* ---------- register: step 3 quiz → customer[tags] on the create_customer form (one POST, hCaptcha included) ---------- */
  function registerQuiz() {
    var reg = document.getElementById('snh-register'), q = reg && document.querySelector('[data-quiz][data-mode="register"]');
    var field = reg && reg.querySelector('[data-reg-tags]');
    if (!q || !field) return;
    field.__extra = function () {
      var ph = reg.querySelector('[name="customer[note][Phone]"]'), bd = reg.querySelector('[name="customer[note][Birthday]"]');
      var mob = ph && slMobile(ph.value);
      return [mob && 'mobile:' + mob, bd && bd.value && 'bday:' + bd.value];
    };
    q.__tagsField = field;
    var api = quizInit(q, null);
    reg.addEventListener('change', api.sync);
    reg.addEventListener('submit', api.sync);
  }

  function init() {
    $$('[data-app]').forEach(appInit);
    $$('[data-app]').forEach(wkAccount);
    // R18: the homepage quiz's "Add" buttons (the app view binds its own inside [data-app])
    if (!document.__snhQzAdd) {
      document.__snhQzAdd = true;
      // results → the matched workout plan: the full plan in app mode (and it saves as plan:<id> with the answers),
      // day 1 + locked days for guests (sections/snh-quiz-band adds the sign-up gate)
      document.addEventListener('snh:quiz-results', function (e) {
        var q = e.target, a = e.detail.answers, p = planFor(a), box = q.querySelector('[data-wk-plan]');
        if (!p || !box) return;
        var guest = q.getAttribute('data-mode') === 'guest';
        q.setAttribute('data-plan', p.id);
        renderPlan(box, p, { answers: a, preview: guest });
        var sv = q.querySelector('[data-quiz-save]'), t = sv && sv.form && sv.form.querySelector('[data-quiz-tags]');
        if (t) { var src = q.getAttribute('data-source'); t.__extra = function () { return ['plan:' + p.id, src ? 'quiz:' + src : '']; }; if (q.__quiz) q.__quiz.sync(); }
        if (sv && sv.form && !sv.form.__wk) {
          sv.form.__wk = true;
          sv.form.addEventListener('submit', function () {
            var kl = document.querySelector('[data-kl]'), em = sv.form.querySelector('[name="contact[email]"]'), aa = q.__quiz ? q.__quiz.answers() : a;
            if (kl && em && em.value) wkKlaviyo({ company: kl.getAttribute('data-kl-company'), list: kl.getAttribute('data-kl-list'), consent: false, email: em.value, answers: aa, plan: planFor(aa), source: q.getAttribute('data-source') || 'account' });
          });
        }
      });
      document.addEventListener('click', function (e) {
        var r = e.target.closest && e.target.closest('[data-quiz] [data-app-reorder]');
        if (r && !r.disabled && !r.closest('[data-app]') && !r.closest('[data-mock]')) reorder(r);
      });
    }
    registerQuiz();
    $$('[data-sl-mobile]').forEach(bindMobile);
    $$('[data-quiz]').forEach(function (q) { if (!q.__quiz && q.getAttribute('data-mode') !== 'register') quizInit(q, null); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
