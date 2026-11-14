/* SNH onboarding prompt (Round 19 #6, sections/snh-onboarding-prompt). Shows the slide-in to visitors with no goal
   yet (SNH.prefs(): member goal tag or this device's quiz answers), after the delay or 30 % scroll, once per N days,
   never over an open dialog / drawer, and only if no other popup had this page view (window.SNHPopups.claim, shared
   with the email + campaign popups). The button opens the homepage quiz in place (window.SNHQuiz.open), else follows
   its link (/?snh-quiz=open). */
(function () {
  var el = document.querySelector('[data-snh-onb]');
  if (!el || el.__onb) return; el.__onb = true;
  var P = window.SNHPopups = window.SNHPopups || { taken: null, claim: function (n) { if (this.taken && this.taken !== n) return false; this.taken = n; return true; } };
  var DAY = 864e5, days = +el.getAttribute('data-days') || 7, delay = (+el.getAttribute('data-delay') || 10) * 1000, test = el.getAttribute('data-test') === '1' || /[?&]snh-onb=test/.test(location.search);
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function noGoal() { var p = window.SNH && SNH.prefs ? SNH.prefs() : {}; return !p.goal; }
  function busy() { return !!document.querySelector('dialog[open], x-drawer[open], #cart-drawer[open], cart-drawer[open], .qzb-open, html.qzb-open, quick-buy-drawer[open], #snh-pay-router:not([hidden])') || document.documentElement.classList.contains('qzb-open'); }
  var shown = false, timer = null;
  function show() {
    if (shown) return;
    if (!test && (!noGoal() || Date.now() - (+ls('snh_onb_t') || 0) < days * DAY || busy() || /[?&]snh-quiz=open/.test(location.search))) return;
    if (!test && !P.claim('onboard')) return;   // the email or a campaign popup already had this page view
    shown = true; cleanup();
    if (!test) ls('snh_onb_t', String(Date.now()));
    el.hidden = false;
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('is-on'); }); });
  }
  function hide() {
    el.classList.remove('is-on');
    setTimeout(function () { el.hidden = true; }, 420);
  }
  function onScroll() { var h = document.documentElement.scrollHeight - innerHeight; if (h > 0 && scrollY / h >= .3) show(); }
  function cleanup() { clearTimeout(timer); window.removeEventListener('scroll', onScroll); }
  el.querySelectorAll('[data-onb-close]').forEach(function (b) { b.addEventListener('click', hide); });
  el.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
  el.querySelector('[data-onb-go]').addEventListener('click', function (e) {
    if (window.SNHQuiz && SNHQuiz.open && !el.querySelector('[data-onb-go]').getAttribute('href').replace(/^\/\?snh-quiz=open$/, '')) { e.preventDefault(); hide(); SNHQuiz.open(); }
  });
  if (test) { show(); return; }
  if (!noGoal()) return;
  timer = setTimeout(show, delay);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.SNHOnboard = { show: show, hide: hide };
})();
