/* SNH quiz band (Round 18, sections/snh-quiz-band): "Find my stack" opens the onboarding quiz full screen.
   The quiz lives in a <template>; assets/snh-app.js + snh-app.css load on the first open (window.snhQuizInit).
   Guests: on results, the sign-up gate moves under the plan preview; its submit fills customer[tags] with the answers +
   plan:<id> + quiz:home (+ mobile:), sends Klaviyo the plan (SNHPlans.klaviyo, keepalive) and posts normally, so
   Shopify's bot check runs. "Sign in" keeps the answers in localStorage snh_quiz_pending for the account's Goals tab. */
(function () {
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function load(sec) {
    if (!document.querySelector('link[data-snh-app-css]')) {
      sec.getAttribute('data-css').split(' ').filter(Boolean).forEach(function (h) {
        var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = h; l.setAttribute('data-snh-app-css', ''); document.head.appendChild(l);
      });
    }
    return new Promise(function (res) {
      if (window.snhQuizInit) return res();
      var have = document.querySelector('script[data-snh-app-js]');
      if (have) { have.addEventListener('load', function () { res(); }); return; }
      var s = document.createElement('script'); s.src = sec.getAttribute('data-js'); s.setAttribute('data-snh-app-js', ''); s.onload = function () { res(); }; document.head.appendChild(s);
    });
  }
  function init(sec) {
    if (sec.__qzb) return; sec.__qzb = true;
    var ov = sec.querySelector('[data-qzb-ov]'), mount = sec.querySelector('[data-qzb-mount]'), tpl = sec.querySelector('[data-qzb-tpl]');
    var gate = sec.querySelector('[data-wk-gate]'), form = gate && gate.querySelector('[data-wk-form]');
    var opener = null, q = null, state = { answers: null, plan: null };
    var kl = sec.querySelector('[data-kl]');

    function mountQuiz() {
      if (q) return Promise.resolve(q);
      mount.appendChild(tpl.content.cloneNode(true));
      q = mount.querySelector('[data-quiz]');
      q.setAttribute('data-source', 'home');
      return load(sec).then(function () {
        if (!q.__quiz) window.snhQuizInit(q);
        var ld = sec.querySelector('[data-qzb-loading]'); if (ld) ld.remove();
        return q;
      });
    }
    function open(e) {
      opener = e && e.currentTarget || document.activeElement;
      ov.hidden = false;
      document.documentElement.classList.add('qzb-open');
      sec.querySelector('[data-qzb-close]').focus({ preventScroll: true });
      return mountQuiz().then(function () {
        var f = q.querySelector('.qz__step:not([hidden]) input');
        if (f && (!e || e.type !== 'restore')) f.focus({ preventScroll: true });
      });
    }
    function close() {
      ov.hidden = true;
      document.documentElement.classList.remove('qzb-open');
      if (opener && opener.focus) opener.focus({ preventScroll: true });
    }
    sec.querySelectorAll('[data-qzb-open]').forEach(function (b) { b.addEventListener('click', open); });
    // R19: the onboarding prompt (and any link to /?snh-quiz=open or #find-my-stack) opens the quiz here
    if (!window.SNHQuiz) window.SNHQuiz = { open: function () { return open({ currentTarget: sec.querySelector('[data-qzb-open]') }); } };
    if (/[?&]snh-quiz=open/.test(location.search) || location.hash === '#find-my-stack') {
      try { history.replaceState(null, '', location.pathname + location.search.replace(/([?&])snh-quiz=open&?/, '$1').replace(/[?&]$/, '')); } catch (x) {}
      setTimeout(function () { open({ currentTarget: sec.querySelector('[data-qzb-open]') }); }, 50);
    }
    sec.querySelector('[data-qzb-close]').addEventListener('click', close);
    ov.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

    // guests: results → the gate under the plan preview
    sec.addEventListener('snh:quiz-results', function (e) {
      if (!gate || e.target.getAttribute('data-mode') !== 'guest') return;
      state.answers = e.detail.answers;
      state.plan = window.SNHPlans && SNHPlans.pick(state.answers);
      var slot = e.target.querySelector('[data-wk-gate-slot]');
      if (slot && gate.parentNode !== slot) slot.appendChild(gate);
      var d = gate.querySelector('[data-wk-gate-days]');
      if (d && state.plan) d.textContent = state.plan.w.length + '-day plan';
      gate.hidden = false;
    });
    function pending(consent) {
      if (!state.answers) return;
      ls('snh_quiz_pending', JSON.stringify({ answers: state.answers, plan: state.plan ? state.plan.id : '', consent: !!consent, at: Date.now() }));
    }
    if (form) {
      form.addEventListener('submit', function () {
        var a = state.answers || (JSON.parse(ls('snh_quiz_pending') || '{}').answers) || {};
        var p = state.plan || (window.SNHPlans && SNHPlans.pick(a));
        var mob = form.querySelector('[data-wk-mobile]'), em = form.querySelector('[data-wk-email]'), first = form.querySelector('[name="customer[first_name]"]');
        var m = window.SNHMobile ? SNHMobile.norm(mob.value) : '';
        var extra = function () { return [p ? 'plan:' + p.id : '', 'quiz:home', m ? 'mobile:' + m : '']; };
        form.querySelector('[data-wk-tags]').value = window.SNHPlans ? SNHPlans.tags(a, extra) : extra().filter(Boolean).join(', ');
        var consent = form.querySelector('[data-wk-consent]').checked;
        state.answers = a; state.plan = p; pending(consent);
        if (window.SNHPlans && kl) SNHPlans.klaviyo({ company: kl.getAttribute('data-kl-company'), list: kl.getAttribute('data-kl-list'), consent: consent, email: em.value.trim(), first: first.value.trim(), phone: m, answers: a, plan: p, source: 'quiz-home' });
      });
      gate.querySelectorAll('[data-wk-signin]').forEach(function (a) { a.addEventListener('click', function () { pending(form.querySelector('[data-wk-consent]').checked); }); });
    }

    // back from a failed sign-up (email taken, bad password): reopen with the gate, the answers and the plan preview
    if (gate && gate.querySelector('[data-wk-errors]')) {
      var pend = null; try { pend = JSON.parse(ls('snh_quiz_pending') || 'null'); } catch (x) {}
      open({ type: 'restore', currentTarget: sec.querySelector('[data-qzb-open]') }).then(function () {
        if (pend && pend.answers) { state.answers = pend.answers; state.plan = SNHPlans.byId(pend.plan) || SNHPlans.pick(pend.answers); }
        var box = document.createElement('div'); box.className = 'wk'; mount.insertBefore(box, mount.firstChild);
        if (state.plan) SNHPlans.render(box, state.plan, { answers: state.answers, preview: true });
        q.hidden = true;
        box.insertAdjacentElement('afterend', gate);
        var d = gate.querySelector('[data-wk-gate-days]'); if (d && state.plan) d.textContent = state.plan.w.length + '-day plan';
        gate.hidden = false;
        var err = gate.querySelector('[data-wk-errors]'); if (err) { err.setAttribute('tabindex', '-1'); err.focus(); }
      });
    }
  }
  function boot() { document.querySelectorAll('[data-qzb]').forEach(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  document.addEventListener('shopify:section:load', boot);
})();
