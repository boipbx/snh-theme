/* SNH email capture (Round 11; Round 12: the "Spin the shaker" game, A/B variants, ?popup=test).
   Modal: desktop on exit intent or after N seconds; phones after N seconds or N % scroll. At most once every N days
   (localStorage snh_ecm_t). Slide-in: product/blog pages after 50 % scroll, dismissal remembered 30 days. Nobody who
   subscribed on this device (snh_sub) is asked again; the Liquid skips signed-in customers and cart/checkout/account/
   password pages. ?popup=test opens the modal at once and ignores every rule (?popup=a / ?popup=b force a variant).
   Only one popup per page view: window.SNHPopups.claim(name) (the campaign popup uses it too).
   Game: weighted draw from the prizes that have a code → the wheel lands on it (instant with reduced motion). Variant A:
   email → spin → code. B: spin → email → code. Email: Klaviyo client subscribe (company + list ID) with source,
   variant, prize; no list ID = Shopify's customer form posted normally (tags carry variant + prize; hCaptcha intact),
   and the game continues when the page comes back (?customer_posted=true#form). Events:
   klaviyo.push(['track', 'Welcome wheel', …]) and clarity('set' / 'event'). */
(function () {
  if (window.__snhCapture) return;
  window.__snhCapture = true;
  var P = window.SNHPopups = window.SNHPopups || { taken: null, claim: function (n) { if (this.taken && this.taken !== n) return false; this.taken = n; return true; } };
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  var DAY = 864e5, q = location.search, test = /[?&]popup=(test|a|b)\b/.test(q), forced = (q.match(/[?&]popup=(a|b)\b/) || [])[1];
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function heading(t) { var p = esc(t).split('*'); return p.map(function (x, i) { return i % 2 ? '<em>' + x + '</em>' : x; }).join(''); }
  function track(evt, props) {
    try { (window.klaviyo = window.klaviyo || []).push(['track', 'Welcome wheel', Object.assign({ step: evt }, props)]); } catch (e) {}
    try { if (window.clarity) { clarity('set', 'snh_popup_variant', props.variant); clarity('event', 'popup_' + evt); } } catch (e) {}
  }

  function init() {
    var root = document.querySelector('[data-email-capture]');
    if (!root || root.__ec) return;
    if (root.hasAttribute('data-skip') && !test) return;
    root.__ec = true;
    var modal = root.querySelector('[data-ecm]'), teaser = root.querySelector('[data-ect]');
    var days = +root.getAttribute('data-days') || 14, delay = (+root.getAttribute('data-delay') || 45) * 1000, deskDelay = (+root.getAttribute('data-desk-delay') || 25) * 1000, depth = (+root.getAttribute('data-scroll') || 60) / 100;
    document.addEventListener('submit', function (e) { if (e.target.matches && e.target.matches('form[data-ecf]') && !e.defaultPrevented) ls('snh_sub', String(Date.now())); }, true);
    var posted = /[?&]customer_posted=true/.test(q);
    if (posted) ls('snh_sub', String(Date.now()));
    var game = modal && modal.classList.contains('ecm--game') ? setupGame(root, modal) : null;
    var hash = (location.hash || '').slice(1);
    if (posted && hash) {
      var f = document.getElementById(hash);
      if (f && modal && modal.contains(f) && modal.showModal) { if (game) game.resume(); modal.showModal(); return; }
      if (f && teaser && teaser.contains(f)) { teaser.hidden = false; teaser.classList.add('is-on'); return; }
    }
    var shown = false;
    function capped() { return Date.now() - (+ls('snh_ecm_t') || 0) < days * DAY; }
    function busy() { return !!document.querySelector('dialog[open], x-drawer[open], .snh-sheet-open, quick-buy-drawer[open], #snh-pay-router:not([hidden])'); }
    function openModal(why) {
      if (shown || !modal || !modal.showModal) return;
      if (!test && (ls('snh_sub') || capped() || busy() || (teaser && !teaser.hidden))) return;
      if (!P.claim('email')) return;                          // a campaign popup already had this page view
      shown = true;
      if (!test) ls('snh_ecm_t', String(Date.now()));
      var tpl = modal.querySelector('[data-ecm-video]');
      if (tpl && !reduce) { tpl.parentNode.appendChild(tpl.content.cloneNode(true)); tpl.remove(); }
      if (teaser) teaser.hidden = true;
      if (game) game.start(why);
      modal.showModal();
    }
    if (modal) modal.addEventListener('click', function (e) { if (e.target === modal || e.target.closest('[data-ecm-close]')) { modal.close(); if (game) game.closed(); } });
    if (test) { openModal('test'); return; }
    if (ls('snh_sub')) return;
    if (modal && root.getAttribute('data-modal') === 'true') {
      var desk = matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)').matches;
      if (desk) {
        document.addEventListener('mouseout', function (e) { if (!e.relatedTarget && e.clientY <= 0) openModal('exit'); });
        setTimeout(function () { openModal('time'); }, deskDelay);
      } else {
        var timer = setTimeout(function () { openModal('time'); }, delay);
        var onScroll = function () { var h = document.documentElement.scrollHeight - innerHeight; if (h > 0 && scrollY / h >= depth) { window.removeEventListener('scroll', onScroll); clearTimeout(timer); openModal('scroll'); } };
        window.addEventListener('scroll', onScroll, { passive: true });
      }
    }
    if (teaser && root.getAttribute('data-teaser') === 'true') {
      var off = +ls('snh_ect_off') || 0;
      if (Date.now() - off > 30 * DAY) {
        var onT = function () { var h = document.documentElement.scrollHeight - innerHeight; if (h > 0 && scrollY / h >= .5 && !shown && !busy() && P.claim('email')) { window.removeEventListener('scroll', onT); teaser.hidden = false; requestAnimationFrame(function () { teaser.classList.add('is-on'); }); } };
        window.addEventListener('scroll', onT, { passive: true });
        teaser.querySelector('[data-ect-close]').addEventListener('click', function () { teaser.classList.remove('is-on'); setTimeout(function () { teaser.hidden = true; }, 300); ls('snh_ect_off', String(Date.now())); });
      }
    }
  }

  /* ---------- the game ---------- */
  function setupGame(root, modal) {
    var prizes = [];
    try { prizes = JSON.parse(modal.querySelector('[data-prizes]').textContent); } catch (e) {}
    prizes = prizes.filter(function (p) { return p.label && p.weight > 0 && (p.code || test); });
    if (test) prizes.forEach(function (p, i) { if (!p.code) { p.code = 'TEST-' + (p.label.match(/\d+/) || [i + 1])[0]; p.test = true; } });
    if (!prizes.length) { modal.classList.remove('ecm--game'); return null; }        // no codes yet: the plain form
    var $ = function (s) { return modal.querySelector(s); };
    var steps = { email: $('[data-step="email"]'), game: $('[data-step="game"]'), win: $('[data-step="win"]') };
    var h = $('[data-ecm-h]'), p = $('[data-ecm-p]'), live = $('[data-live]'), form = steps.email.querySelector('form'), spinBtn = $('[data-spin]');
    var mode = root.getAttribute('data-variants') || 'ab';
    var variant = forced || (mode !== 'ab' ? mode : ls('snh_pop_var'));
    if (!variant || !/^[ab]$/.test(variant)) { variant = Math.random() < .5 ? 'a' : 'b'; }
    if (!forced) ls('snh_pop_var', variant);
    modal.setAttribute('data-variant', variant);
    var state = { won: null, email: null };
    try { var saved = JSON.parse(ls('snh_pop_win') || 'null'); if (saved && saved.code) state.won = saved; } catch (e) {}

    // wheel: 6 slices (each prize repeated), colours alternate
    var slices = [];
    while (slices.length < 6) prizes.forEach(function (pr) { if (slices.length < 6) slices.push(pr); });
    var svg = $('[data-wheel-svg]'), n = slices.length, seg = 360 / n, cols = ['#E0521C', '#0C0C0D', '#F5F2EC'], ink = ['#FFFFFF', '#FFFFFF', '#0C0C0D'];
    svg.innerHTML = slices.map(function (pr, i) {
      var a0 = (i * seg - 90) * Math.PI / 180, a1 = ((i + 1) * seg - 90) * Math.PI / 180, r = 100;
      var path = 'M0 0 L' + (r * Math.cos(a0)).toFixed(2) + ' ' + (r * Math.sin(a0)).toFixed(2) + ' A' + r + ' ' + r + ' 0 0 1 ' + (r * Math.cos(a1)).toFixed(2) + ' ' + (r * Math.sin(a1)).toFixed(2) + ' Z';
      var mid = (i + .5) * seg;
      return '<path d="' + path + '" fill="' + cols[i % 3] + '"/><text transform="rotate(' + mid + ') translate(0 -64)" text-anchor="middle" dominant-baseline="middle" fill="' + ink[i % 3] + '">' + esc(pr.label.replace(/\s*off$/i, '')) + '</text>';
    }).join('') + '<circle r="100" fill="none" stroke="#0C0C0D" stroke-width="4"/>';
    var total = prizes.reduce(function (s, x) { return s + x.weight; }, 0);
    $('[data-odds]').textContent = 'Odds: ' + prizes.map(function (x) { return x.label + ' ' + Math.round(x.weight / total * 100) + '%'; }).join(' · ') + '.';

    function show(step) { Object.keys(steps).forEach(function (k) { steps[k].hidden = k !== step; }); }
    function say(hk, pk, prize) {
      var ht = h.getAttribute('data-h-' + hk), pt = pk ? p.getAttribute('data-p-' + pk) : '';
      if (ht) h.innerHTML = heading(ht.replace('[prize]', prize || ''));
      p.textContent = (pt || '').replace('[prize]', prize || ''); p.hidden = !pt;
    }
    function draw() { var r = Math.random() * total; for (var i = 0; i < prizes.length; i++) { r -= prizes[i].weight; if (r < 0) return prizes[i]; } return prizes[prizes.length - 1]; }
    var turned = 0;
    function spin() {
      if (spinBtn.disabled) return;
      spinBtn.disabled = true;
      var pr = draw(), idx = [], wheel = svg;
      slices.forEach(function (s, i) { if (s === pr) idx.push(i); });
      var i = idx[Math.floor(Math.random() * idx.length)];
      var target = 360 * 5 + (360 - (i + .5) * seg) + (Math.random() - .5) * seg * .5;
      turned += target - (turned % 360);
      track('spin', { variant: variant, prize: pr.label });
      var done = function () { win(pr); };
      if (reduce) { wheel.style.transition = 'none'; wheel.style.transform = 'rotate(' + turned + 'deg)'; done(); }
      else { wheel.style.transform = 'rotate(' + turned + 'deg)'; setTimeout(done, 3300); }
    }
    function win(pr) {
      state.won = { label: pr.label, code: pr.code, test: !!pr.test, variant: variant, t: Date.now() };
      live.textContent = 'You won ' + pr.label + '.';
      if (variant === 'b' && !state.email) { say('claim', 'claim', pr.label); show('email'); form.querySelector('input[type=email]').focus(); track('won', { variant: variant, prize: pr.label }); return; }
      reveal();
    }
    function reveal() {
      var w = state.won;
      ls('snh_pop_win', JSON.stringify(w));
      say('win', null, w.label);
      $('[data-win-prize]').textContent = w.label + ' your first order';
      $('[data-win-code]').textContent = w.code;
      $('[data-apply]').href = '/discount/' + encodeURIComponent(w.code) + '?redirect=' + encodeURIComponent(location.pathname + location.search.replace(/[?&]popup=[^&]*/, '').replace(/^&/, '?'));
      $('[data-win-note]').textContent = w.test ? 'Test code (no real code is set for this prize yet).' : 'One use per customer, on your first order.';
      show('win');
      live.textContent = w.label + '. Your code is ' + w.code + '.';
      track('code', { variant: variant, prize: w.label });
    }
    $('[data-copy]').addEventListener('click', function (e) {
      var b = e.currentTarget, code = state.won && state.won.code;
      var ok = function () { b.querySelector('span').textContent = 'Copied'; live.textContent = 'Code copied.'; setTimeout(function () { b.querySelector('span').textContent = 'Copy'; }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(code).then(ok, ok); else ok();
    });
    spinBtn.addEventListener('click', spin);

    // email: Klaviyo client subscribe, else Shopify's customer form by fetch, else a normal POST
    function subscribe(email) {
      var props = { source: 'Welcome wheel', variant: variant.toUpperCase(), prize: state.won ? state.won.label : '' };
      var co = root.getAttribute('data-kl-company'), list = root.getAttribute('data-kl-list');
      try { (window.klaviyo = window.klaviyo || []).push(['identify', Object.assign({ email: email }, { snh_popup_variant: props.variant, snh_popup_prize: props.prize })]); } catch (e) {}
      if (co && list) {
        return fetch('https://a.klaviyo.com/client/subscriptions/?company_id=' + encodeURIComponent(co), { method: 'POST', headers: { 'Content-Type': 'application/vnd.api+json', revision: '2024-10-15' },
          body: JSON.stringify({ data: { type: 'subscription', attributes: { custom_source: 'Welcome wheel ' + props.variant, profile: { data: { type: 'profile', attributes: { email: email, properties: { snh_popup_source: props.source, snh_popup_variant: props.variant, snh_popup_prize: props.prize } } } } }, relationships: { list: { data: { type: 'list', id: list } } } } })
        }).then(function (r) { if (!r.ok && r.status !== 202) throw new Error(r.status); });
      }
      return Promise.reject(new Error('no list'));
    }
    function tags() { return [root.getAttribute('data-tags') || 'newsletter', 'welcome-wheel', 'variant-' + variant, state.won ? 'prize-' + state.won.label.replace(/\D/g, '') : ''].filter(Boolean).join(','); }
    form.addEventListener('submit', function (e) {
      var input = form.querySelector('input[type=email]');
      if (!input.checkValidity()) return;
      state.email = input.value.trim();
      if (state.won) ls('snh_pop_win', JSON.stringify(state.won));
      ls('snh_pop_step', variant);
      var t = form.querySelector('[name="contact[tags]"]'); if (t) t.value = tags();
      if (!(root.getAttribute('data-kl-company') && root.getAttribute('data-kl-list'))) {
        // Shopify's customer form, posted for real (its hCaptcha included); the page comes back with
        // ?customer_posted=true#<form id> and resume() continues the game there
        track('subscribed', { variant: variant, prize: state.won ? state.won.label : '', via: 'shopify' });
        return;
      }
      e.preventDefault(); e.stopImmediatePropagation();       // Klaviyo path: Shopify's captcha isn't involved
      var btn = form.querySelector('[type=submit]'); btn.disabled = true;
      subscribe(state.email).then(function () {
        ls('snh_sub', String(Date.now()));
        track('subscribed', { variant: variant, prize: state.won ? state.won.label : '', via: 'klaviyo' });
        btn.disabled = false;
        if (variant === 'a') { say('b', null); p.hidden = true; show('game'); spinBtn.focus(); } else reveal();
      }).catch(function () { btn.disabled = false; form.setAttribute('action', form.getAttribute('action').split('#')[0] + '#' + form.id); HTMLFormElement.prototype.submit.call(form); });
    });
    return {
      start: function (why) {
        track('shown', { variant: variant, trigger: why });
        if (state.won && ls('snh_sub')) { reveal(); return; }
        if (variant === 'a') { say('a', 'a'); show('email'); } else { say('b', 'b'); show('game'); }
        setTimeout(function () { (variant === 'a' ? form.querySelector('input[type=email]') : spinBtn).focus(); }, 60);
      },
      resume: function () { track('subscribed-return', { variant: variant }); if (state.won) reveal(); else { say('b', null); p.hidden = true; show('game'); setTimeout(function () { spinBtn.focus(); }, 60); } },
      closed: function () { track('closed', { variant: variant, won: !!state.won }); }
    };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
