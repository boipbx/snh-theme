/* SNH Elite page (Round 12): the earnings calculator + tier track, the perks tier switcher, the tier cards' entrance.
   Figures come from data attributes printed from Theme settings → SNH Elite (sections/snh-elite-page). */
(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function rs(n) { return 'Rs ' + Math.round(n).toLocaleString('en-US'); }
  function num(n) { return Math.round(n).toLocaleString('en-US'); }
  function init(root) {
    if (root.__ep) return;
    root.__ep = true;
    var rates = root.getAttribute('data-rates').split(',').map(Number), th = root.getAttribute('data-thresholds').split(',').map(Number);
    var welcome = +root.getAttribute('data-welcome'), redeem = +root.getAttribute('data-redeem'), pv = +root.getAttribute('data-pv') || 1;
    var names = ['Bronze', 'Silver', 'Gold'];
    function tierOf(spend) { return spend >= th[1] ? 2 : spend >= th[0] ? 1 : 0; }

    /* calculator: month by month, the tier moves up as the year's spend passes Silver / Gold */
    var box = root.querySelector('[data-calc]');
    if (box) {
      var input = box.querySelector('[data-calc-in]'), q = function (s) { return box.querySelector(s); };
      var max = th[1] * 1.25;
      q('[data-mark="silver"]').style.setProperty('--at', (th[0] / max * 100) + '%');
      q('[data-mark="gold"]').style.setProperty('--at', (th[1] / max * 100) + '%');
      var ends = box.querySelectorAll('.ep2__range-ends span');
      if (ends.length === 2) { ends[0].textContent = rs(+input.min); ends[1].textContent = rs(+input.max); }
      function run() {
        var S = +input.value, cum = 0, bal = welcome, first = 0, up = [0, 0, 0];
        for (var mo = 1; mo <= 36; mo++) {
          var t = tierOf(cum);
          bal += Math.floor(S * rates[t] / 100 / pv);
          cum += S;
          var t2 = tierOf(cum);
          if (t2 > t && !up[t2]) up[t2] = mo;
          if (!first && bal >= redeem) first = mo;
        }
        var year = S * 12, t12 = tierOf(year), pm = Math.floor(S * rates[0] / 100 / pv);
        q('[data-calc-spend]').textContent = rs(S);
        q('[data-calc-pm]').textContent = num(pm);
        q('[data-calc-pm-note]').textContent = 'at Bronze (' + rates[0] + '%), more as you move up';
        q('[data-calc-first]').textContent = first ? (first === 1 ? 'Month 1' : 'Month ' + first) : 'Over 3 years';
        q('[data-calc-tier]').textContent = names[t12];
        q('[data-calc-tier-note]').textContent = t12 === 2 ? 'Gold from month ' + up[2] + ', ' + rates[2] + '% back' : t12 === 1 ? 'Silver from month ' + up[1] + '. ' + rs(th[1] - year) + ' more a year for Gold' : rs(th[0] - year) + ' more a year for Silver';
        var pct = Math.min(year / max, 1) * 100;
        q('[data-calc-fill]').style.width = pct + '%';
        q('[data-calc-you]').style.left = pct + '%';
        [].forEach.call(box.querySelectorAll('[data-mark]'), function (m) { m.classList.toggle('is-hit', year >= th[m.getAttribute('data-mark') === 'gold' ? 1 : 0]); });
        input.setAttribute('aria-valuetext', rs(S) + ' a month');
      }
      input.addEventListener('input', run);
      run();
    }

    /* perks: tabs (arrow keys move, Home / End jump) */
    var tabs = [].slice.call(root.querySelectorAll('[data-perks] [role="tab"]'));
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab, pane = document.getElementById(t.getAttribute('aria-controls'));
        t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
        if (pane) { pane.hidden = !on; pane.classList.toggle('is-in', on); }
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t, false); });
      t.addEventListener('keydown', function (e) {
        var k = e.key, n = k === 'ArrowRight' ? i + 1 : k === 'ArrowLeft' ? i - 1 : k === 'Home' ? 0 : k === 'End' ? tabs.length - 1 : null;
        if (n === null) return;
        e.preventDefault(); select(tabs[(n + tabs.length) % tabs.length], true);
      });
    });

    /* tier cards rise in when they reach the screen */
    var list = root.querySelector('.ep2__tiers');
    if (list && !reduce && 'IntersectionObserver' in window) {
      list.classList.add('is-pre');
      var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); list.classList.remove('is-pre'); } }, { threshold: .2 });
      io.observe(list);
    }
  }
  function boot(scope) { [].forEach.call((scope || document).querySelectorAll('[data-ep]'), init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { boot(); }); else boot();
  document.addEventListener('shopify:section:load', function (e) { boot(e.target); });
})();
