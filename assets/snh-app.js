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
      if (fix && n) input.value = n;
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
    return fetch(root + 'cart.js').then(function (r) { return r.json(); }).then(function (cart) {
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

  /* ---------- onboarding quiz ---------- */
  function quizInit(q, onDone) {
    if (q.__quiz) return q.__quiz;
    var steps = $$('[data-step]', q).filter(function (s) { return s.getAttribute('data-step') !== 'done'; });
    var done = q.querySelector('[data-step="done"]');
    var back = q.querySelector('[data-quiz-back]'), next = q.querySelector('[data-quiz-next]'), skip = q.querySelector('[data-quiz-skip]');
    var bar = q.querySelector('[data-quiz-bar]'), count = q.querySelector('[data-quiz-count]');
    var mode = q.getAttribute('data-mode'), i = 0;
    var save = q.querySelector('[data-quiz-save]'), form = save && save.form;
    $$('[data-sl-mobile]', q).forEach(bindMobile);
    function val(k) { var r = q.querySelector('[data-step="' + k + '"] input:checked'); return r ? r.value : ''; }
    function lab(k) { var r = q.querySelector('[data-step="' + k + '"] input:checked'); return r ? r.getAttribute('data-label') : ''; }
    function answers() {
      var b = q.querySelector('[data-quiz-bday]'), m = q.querySelector('[data-quiz-mobile]');
      return { goal: val('goal'), freq: val('freq'), sport: val('sport'), bday: b ? b.value : '', mobile: m ? (slMobile(m.value) || '') : '' };
    }
    function go(n, focus) {
      i = Math.max(0, Math.min(n, steps.length));
      steps.forEach(function (s, k) { s.hidden = k !== i; });
      if (done) done.hidden = i < steps.length;
      var end = i >= steps.length;
      var last = i === steps.length - 1;
      back.hidden = i === 0 || end;
      next.hidden = end || (last && !!save);
      if (save) save.hidden = !last;
      skip.hidden = end || (last && !!save);
      bar.style.width = (end ? 100 : Math.round((i + 1) / steps.length * 100)) + '%';
      count.textContent = end ? 'Done' : 'Step ' + (i + 1) + ' of ' + steps.length;
      var nl = next.querySelector('span');
      if (nl) nl.textContent = last ? 'Done' : 'Next';
      if (focus) {
        var f = end ? done : steps[i].querySelector('input:checked, input');
        if (f) f.focus({ preventScroll: true });
      }
      if (end) finish();
      sync();
    }
    function finish() {
      var a = answers(), bits = [lab('goal'), lab('freq'), lab('sport')].filter(Boolean);
      var sum = q.querySelector('[data-quiz-summary]');
      if (sum) sum.textContent = mode === 'register'
        ? (bits.length ? bits.join(' · ') + '. We’ll save this to your account once it’s created.' : 'No problem, you can set your goals from your account any time.')
        : (bits.length ? bits.join(' · ') + '. Your picks and tips now follow your goal.' : 'Saved. You can change your answers any time.');
      if (onDone) onDone(a, bits, false);
    }
    next.addEventListener('click', function () {
      var m = steps[i] && steps[i].querySelector('[data-sl-mobile]');
      if (m && m.__check && !m.__check(true)) { m.focus(); return; }
      go(i + 1, true);
    });
    skip.addEventListener('click', function () {
      $$('input[type="radio"]', steps[i]).forEach(function (r) { r.checked = false; });
      if (mode === 'register') { go(steps.length, true); return; }
      go(i + 1, true);
    });
    back.addEventListener('click', function () { go(i - 1, true); });
    // the tags field always holds the current answers, so whichever way the form posts, it posts these
    function sync() { var t = q.__tagsField || (form && form.querySelector('[data-quiz-tags]')); if (t) t.value = tagsFor(answers(), t.__extra); }
    q.addEventListener('change', sync);
    q.addEventListener('input', sync);
    if (form) form.addEventListener('submit', function (e) {
      var m = q.querySelector('[data-quiz-mobile]');
      if (m && m.__check && !m.__check(true)) { e.preventDefault(); m.focus(); return; }
      var a = answers();
      sync();
      if (!a.goal && !a.freq && !a.sport && !a.bday && !a.mobile) { e.preventDefault(); go(steps.length, true); return; }
      if (onDone) onDone(a, null, true);
      try { sessionStorage.setItem('snh_posting', 'goals'); } catch (x) {}
      var l = save.querySelector('span');
      if (l) l.textContent = 'Saving…';
      save.setAttribute('aria-busy', 'true');
      // still here after a few seconds = the bot check is waiting for the member (or loading): let them press again
      setTimeout(function () { save.removeAttribute('aria-busy'); if (l) l.textContent = 'Save my answers'; }, 6000);
    });
    var api = {
      go: go,
      sync: sync,
      answers: answers,
      to: function (key) { var k = steps.map(function (s) { return s.getAttribute('data-step'); }).indexOf(key); go(k < 0 ? 0 : k, true); },
      fill: function (a) {
        ['goal', 'freq', 'sport'].forEach(function (k) {
          var r = a && a[k] && q.querySelector('[data-step="' + k + '"] input[value="' + a[k] + '"]');
          if (r) r.checked = true;
        });
        var b = q.querySelector('[data-quiz-bday]'), m = q.querySelector('[data-quiz-mobile]');
        if (b && a && a.bday) b.value = a.bday;
        if (m && a && a.mobile) m.value = a.mobile;
      },
      label: function (k, v) { var r = q.querySelector('[data-step="' + k + '"] input[value="' + v + '"]'); return r ? r.getAttribute('data-label') : ''; }
    };
    q.__quiz = api;
    go(0, false);
    return api;
  }
  function tagsFor(a, extra) {
    return [a.goal && 'goal:' + a.goal, a.freq && 'freq:' + a.freq, a.sport && 'sport:' + a.sport, a.bday && 'bday:' + a.bday, a.mobile && 'mobile:' + a.mobile]
      .concat(extra ? extra() : []).filter(Boolean).join(', ');
  }

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
    function filter() {
      var q = (oq.value || '').trim().toLowerCase(), s = os.value, shown = 0;
      $$('[data-order]', app).forEach(function (o) {
        var ok = (!q || o.getAttribute('data-q').indexOf(q) > -1) && (s === 'all' || o.getAttribute('data-status').indexOf(s) > -1);
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

    /* avatar (V8 set) */
    var picks = $$('.avp__b', app);
    function setAvatar(k, save) {
      var btn = picks.filter(function (b) { return b.getAttribute('data-avatar') === k; })[0] || picks[0];
      if (!btn) return;
      k = btn.getAttribute('data-avatar');
      $$('[data-avatar-slot]', app).forEach(function (s) { s.innerHTML = k === 'initials' ? '<span>' + esc(s.getAttribute('data-initials')) + '</span>' : btn.innerHTML; });
      picks.forEach(function (b) { b.setAttribute('aria-checked', String(b === btn)); });
      if (save) lsSet('snh_vector_avatar', k);
    }
    setAvatar(lsGet('snh_vector_avatar') || 'initials', false);
    picks.forEach(function (b) { b.addEventListener('click', function () { setAvatar(b.getAttribute('data-avatar'), true); }); });

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
    registerQuiz();
    $$('[data-sl-mobile]').forEach(bindMobile);
    $$('[data-quiz]').forEach(function (q) { if (!q.__quiz && q.getAttribute('data-mode') !== 'register') quizInit(q, null); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
