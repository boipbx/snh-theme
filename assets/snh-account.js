/* SNH account pages (Round 7): register steps, password match, sign in ↔ recover, address forms, re-order.
   Loaded by the snh-account* sections. Vanilla, no dependencies; re-order uses V2.add from snh-v2.js. */
(function () {
  if (window.__snhAccount) return;
  window.__snhAccount = true;
  function $$(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }

  function init() {
    /* ---- password + repeat must match ---- */
    $$('[data-pwd2]').forEach(function (p2) {
      var form = p2.form, p1 = form.querySelector('[data-pwd]'), err = form.querySelector('[data-pwd-err]');
      function check() {
        var ok = !p2.value || p1.value === p2.value;
        p2.setCustomValidity(ok ? '' : "Passwords don't match.");
        p2.setAttribute('aria-invalid', String(!ok));
        if (err) err.hidden = ok;
        return ok;
      }
      p1.addEventListener('input', function () { if (p2.value) check(); });
      p2.addEventListener('input', check);
      form.addEventListener('submit', function (e) {
        if (e.submitter && e.submitter.hasAttribute('formnovalidate')) return;
        if (!check()) { e.preventDefault(); p2.focus(); }
      });
    });

    /* ---- register: two steps ---- */
    var reg = document.getElementById('snh-register');
    if (reg) {
      var steps = $$('[data-reg-step]', reg), dots = $$('[data-reg-dot]', reg);
      function go(n) {
        steps.forEach(function (s) { s.hidden = s.getAttribute('data-reg-step') !== String(n); });
        dots.forEach(function (d) { d.classList.toggle('is-on', +d.getAttribute('data-reg-dot') <= n); });
        var first = reg.querySelector('[data-reg-step="' + n + '"] input');
        if (first) first.focus();
      }
      reg.querySelector('[data-reg-next]').addEventListener('click', function () {
        var bad = $$('[data-reg-step="1"] input', reg).filter(function (i) { return !i.checkValidity(); })[0];
        if (bad) { bad.reportValidity(); return; }
        go(2);
      });
      reg.querySelector('[data-reg-back]').addEventListener('click', function () { go(1); });
    }

    /* ---- sign in ↔ recover ---- */
    var auth = document.querySelector('[data-auth]');
    if (auth) {
      function show(name) {
        $$('[data-auth-pane]', auth).forEach(function (p) { p.hidden = p.getAttribute('data-auth-pane') !== name; });
        var f = auth.querySelector('[data-auth-pane="' + name + '"] input:not([type="hidden"])');
        if (f) f.focus();
      }
      $$('[data-auth-go]', auth).forEach(function (a) {
        a.addEventListener('click', function (e) { e.preventDefault(); show(a.getAttribute('data-auth-go')); history.replaceState(null, '', '#' + a.getAttribute('data-auth-go')); });
      });
      if (location.hash === '#recover') show('recover');
    }

    /* ---- addresses: open / cancel forms, inline delete confirm, country → province ---- */
    function box(id) { return document.querySelector('[data-aform-box="' + id + '"]'); }
    function openForm(id, on) {
      var b = box(id), view = document.querySelector('[data-aform-view="' + id + '"]');
      if (!b) return;
      b.hidden = !on;
      if (view) view.hidden = on;
      $$('[data-aform-open="' + id + '"]').forEach(function (t) { t.setAttribute('aria-expanded', String(on)); });
      if (on) { var f = b.querySelector('input:not([type="hidden"])'); if (f) f.focus(); }
      else { var t = document.querySelector('[data-aform-open="' + id + '"]'); if (t && t.offsetParent) t.focus(); }
    }
    $$('[data-aform-open]').forEach(function (t) { t.addEventListener('click', function () { var id = t.getAttribute('data-aform-open'); openForm(id, box(id).hidden); }); });
    $$('[data-aform-cancel]').forEach(function (t) { t.addEventListener('click', function () { openForm(t.getAttribute('data-aform-cancel'), false); }); });
    $$('[data-aform-box]').forEach(function (b) { if (b.querySelector('.aform__err')) openForm(b.getAttribute('data-aform-box'), true); });

    $$('[data-addr-del]').forEach(function (f) {
      var ask = f.querySelector('[data-del-ask]'), conf = f.querySelector('[data-del-confirm]');
      ask.addEventListener('click', function () { ask.hidden = true; conf.hidden = false; conf.querySelector('button[type="submit"]').focus(); });
      f.querySelector('[data-del-cancel]').addEventListener('click', function () { conf.hidden = true; ask.hidden = false; ask.focus(); });
    });

    $$('select[data-country]').forEach(function (c) {
      var form = c.form, p = form.querySelector('select[data-province]'), wrap = form.querySelector('[data-province-wrap]');
      function sel(s, v) { for (var i = 0; i < s.options.length; i++) { if (s.options[i].value === v || s.options[i].text === v) { s.selectedIndex = i; return; } } }
      function provinces(keep) {
        var opt = c.options[c.selectedIndex], list = [];
        try { list = JSON.parse(opt && opt.getAttribute('data-provinces') || '[]'); } catch (e) {}
        p.innerHTML = list.map(function (x) { return '<option value="' + String(x[0]).replace(/"/g, '&quot;') + '">' + x[1] + '</option>'; }).join('');
        wrap.hidden = !list.length;
        p.disabled = !list.length;
        if (keep) sel(p, p.getAttribute('data-default') || '');
      }
      sel(c, c.getAttribute('data-default') || 'Sri Lanka');
      provinces(true);
      c.addEventListener('change', function () { provinces(false); });
    });

    /* ---- re-order: "variant:qty,variant:qty" → the cart drawer ---- */
    $$('[data-reorder]').forEach(function (b) {
      b.addEventListener('click', function () {
        var items = b.getAttribute('data-reorder').split(',').filter(Boolean).map(function (x) { var a = x.split(':'); return { id: +a[0], quantity: +a[1] || 1 }; });
        if (!items.length) return;
        if (window.V2 && window.V2.add) window.V2.add(items, b);
        else fetch((window.Shopify && Shopify.routes ? Shopify.routes.root : '/') + 'cart/add.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: items }) })
          .then(function () { location.href = '/cart'; });
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
