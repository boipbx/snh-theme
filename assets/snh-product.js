/* SNH product page (sections/snh-product). Round 6, written from scratch.
   Gallery (thumbs, swipe, progress, follows the variant), variant change (radios → variant id → URL, then the
   [data-sp-sync] parts are re-rendered from the section through the Section Rendering API), quantity stepper,
   add to cart through the theme's cart flow (window.V2.add, so the drawer and count refresh), sticky add to cart,
   and the info dialogs. Nothing is moved in the DOM; there are no MutationObservers. */
(function () {
  'use strict';

  function init(root) {
    if (!root || root.__sp) return;
    root.__sp = true;
    var sid = root.getAttribute('data-section');
    var form = document.getElementById(root.getAttribute('data-form'));
    var idInput = root.querySelector('[data-sp-id]');
    var data = {};
    try { data = JSON.parse(root.querySelector('[data-sp-json]').textContent); } catch (e) { data.variants = []; }

    /* ---------- gallery ---------- */
    var list = root.querySelector('[data-sp-slides]');
    var slides = list ? Array.prototype.slice.call(list.querySelectorAll('[data-sp-slide]')) : [];
    var thumbs = Array.prototype.slice.call(root.querySelectorAll('[data-sp-thumb]'));
    var bar = root.querySelector('[data-sp-progress]');
    var rail = root.querySelector('.sp-rail');
    var current = 0;

    function mark(i) {
      current = i;
      thumbs.forEach(function (t, k) { t.setAttribute('aria-selected', String(k === i)); });
      if (bar) bar.style.setProperty('--i', i);
      var t = thumbs[i];
      if (t && rail && rail.scrollHeight > rail.clientHeight) {
        rail.scrollTo({ top: Math.max(0, t.offsetTop - rail.clientHeight / 2 + t.offsetHeight / 2), behavior: 'smooth' });
      }
    }
    function go(i, smooth) {
      if (!slides.length) return;
      i = Math.max(0, Math.min(i, slides.length - 1));
      list.scrollTo({ left: slides[i].offsetLeft - list.offsetLeft, behavior: smooth === false ? 'auto' : 'smooth' });
      mark(i);
    }
    thumbs.forEach(function (t) { t.addEventListener('click', function () { go(+t.getAttribute('data-sp-thumb')); }); });
    if (list) {
      var raf;
      list.addEventListener('scroll', function () {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          var i = Math.round(list.scrollLeft / Math.max(1, list.clientWidth));
          if (i !== current) mark(i);
        });
      }, { passive: true });
      list.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1); }
      });
      var start = slides.findIndex(function (s) { return s.hasAttribute('data-active'); });
      if (start > 0) go(start, false); else mark(0);
      /* a new width (rotation, window resize) keeps the same slide in view */
      if ('ResizeObserver' in window) {
        var lastW = list.clientWidth;
        new ResizeObserver(function () { if (list.clientWidth !== lastW) { lastW = list.clientWidth; go(current, false); } }).observe(list);
      }
    }
    function showMedia(mediaId) {
      if (!mediaId) return;
      var k = slides.findIndex(function (s) { return s.getAttribute('data-media') === String(mediaId); });
      if (k > -1) go(k);
    }

    /* ---------- variant change ---------- */
    function selected() {
      return Array.prototype.map.call(root.querySelectorAll('[data-sp-opt]'), function (fs) {
        var c = fs.querySelector('input:checked');
        return c ? c.value : null;
      });
    }
    function findVariant(opts, changed) {
      var exact = data.variants.find(function (v) { return v.options.every(function (o, k) { return o === opts[k]; }); });
      if (exact) return exact;
      /* combination doesn't exist: keep the value just picked, prefer an available variant */
      var withIt = data.variants.filter(function (v) { return v.options[changed] === opts[changed]; });
      return withIt.find(function (v) { return v.available; }) || withIt[0];
    }
    var pending;
    function render(variant) {
      idInput.value = variant.id;
      var url = root.getAttribute('data-url') + '?variant=' + variant.id;
      history.replaceState(null, '', url);
      showMedia(variant.media);
      /* immediate state for the buttons; the rest arrives with the re-render */
      setAvailable(variant.available);
      if (pending) pending.abort();
      pending = new AbortController();
      fetch(url + '&section_id=' + sid, { signal: pending.signal })
        .then(function (r) { return r.text(); })
        .then(function (html) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          root.querySelectorAll('[data-sp-sync]').forEach(function (el) {
            var fresh = doc.querySelector('[data-sp-sync="' + el.getAttribute('data-sp-sync') + '"]');
            if (!fresh) return;
            if (el.getAttribute('data-sp-sync') === 'options') {
              /* keep the radios (focus, checked state); take labels and sold-out marks */
              var a = el.querySelectorAll('.sp-pill'), b = fresh.querySelectorAll('.sp-pill');
              a.forEach(function (p, k) { if (b[k]) p.className = b[k].className; });
              var la = el.querySelectorAll('.sp-opt__label'), lb = fresh.querySelectorAll('.sp-opt__label');
              la.forEach(function (l, k) { if (lb[k]) l.innerHTML = lb[k].innerHTML; });
              return;
            }
            el.innerHTML = fresh.innerHTML;
            if (fresh.hasAttribute('disabled')) el.setAttribute('disabled', ''); else el.removeAttribute('disabled');
          });
          document.dispatchEvent(new CustomEvent('variant:change', { detail: { variant: variant } }));
        })
        .catch(function () {});
    }
    function setAvailable(ok) {
      root.querySelectorAll('[data-sp-add], [data-sp-sync="satc"]').forEach(function (b) { b.disabled = !ok; b.textContent = ok ? 'Add to cart' : 'Sold out'; });
      var bn = root.querySelector('[data-sp-buynow]');
      if (bn) bn.hidden = !ok;
    }
    /* purchase options (snippets/snh-v2-purchase-options): one-time or a selling plan → the form's selling_plan */
    function syncPlan(box) {
      var on = box.querySelector('input[type="radio"]:checked');
      var card = on && on.closest('.popt__card');
      box.querySelectorAll('.popt__card').forEach(function (c) { c.classList.toggle('is-on', c === card); });
      var sel = card && card.querySelector('[data-popt-plan]');
      box.querySelector('[data-popt-value]').value = on && on.hasAttribute('data-popt-group') && sel ? sel.value : '';
    }
    /* Appstle's own widget, when its app block is on the page, replaces ours */
    if (root.querySelector('.sp-app [class*="appstle" i]')) root.querySelectorAll('[data-sp-sync="popt"]').forEach(function (p) { p.hidden = true; });
    root.addEventListener('change', function (e) {
      var po = e.target.closest('[data-v2="popt"]');
      if (po) { syncPlan(po); return; }
      var fs = e.target.closest('[data-sp-opt]');
      if (!fs) return;
      var changed = +fs.getAttribute('data-sp-opt');
      var v = findVariant(selected(), changed);
      if (!v) return;
      /* sync the other radios if the combination had to change */
      root.querySelectorAll('[data-sp-opt]').forEach(function (f, k) {
        var r = Array.prototype.find.call(f.querySelectorAll('input'), function (x) { return x.value === v.options[k]; });
        if (r) r.checked = true;
      });
      render(v);
    });

    /* ---------- quantity ---------- */
    var qty = root.querySelector('[data-sp-qtyin]');
    root.querySelectorAll('[data-sp-qty]').forEach(function (b) {
      b.addEventListener('click', function () {
        qty.value = Math.max(1, (parseInt(qty.value, 10) || 1) + (+b.getAttribute('data-sp-qty')));
      });
    });
    if (qty) qty.addEventListener('change', function () { qty.value = Math.max(1, parseInt(qty.value, 10) || 1); });

    /* ---------- add to cart: AJAX through the theme's flow; Buy it now posts natively (return_to=/checkout) ---------- */
    if (form) form.addEventListener('submit', function (e) {
      if (e.submitter && e.submitter.hasAttribute('data-snh-product-buy-now')) return;
      e.preventDefault();
      var btn = e.submitter && e.submitter.classList.contains('sp-btn') ? e.submitter : root.querySelector('[data-sp-add]');
      var item = { id: +idInput.value, quantity: Math.max(1, parseInt(qty && qty.value, 10) || 1) };
      var fd = new FormData(form);
      var plan = fd.get('selling_plan');
      if (plan) item.selling_plan = +plan;
      var props = {};
      fd.forEach(function (val, key) { var m = key.match(/^properties\[(.+)\]$/); if (m && val) props[m[1]] = val; });
      if (Object.keys(props).length) item.properties = props;
      if (window.V2 && window.V2.add) window.V2.add([item], btn);
      else form.submit();
    });

    /* ---------- sticky add to cart: after the main button leaves the viewport (above), never over the footer ---------- */
    var sticky = root.querySelector('[data-sp-sticky]');
    var main = root.querySelector('[data-sp-add]');
    if (sticky && main) {
      /* a scroll check, not an IntersectionObserver: on a fast scroll the button goes from below the viewport to above
         it without ever intersecting, and the observer never fires */
      var foot = document.querySelector('.shopify-section-group-footer-group') || document.querySelector('body > footer');
      var ticking = false, last;
      var sync = function () {
        ticking = false;
        var on = main.getBoundingClientRect().bottom < 0 && !(foot && foot.getBoundingClientRect().top < window.innerHeight);
        if (on === last) return;
        last = on;
        sticky.classList.toggle('is-on', on);
        sticky.setAttribute('aria-hidden', String(!on));
        sticky.querySelectorAll('button').forEach(function (b) { b.tabIndex = on ? 0 : -1; });
      };
      window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(sync); } }, { passive: true });
      sync();
    }

    /* ---------- buy box sticks only when it fits the viewport ---------- */
    var buy = root.querySelector('[data-sp-buy]');
    if (buy && 'ResizeObserver' in window) {
      var fit = function () {
        var top = parseFloat(getComputedStyle(buy).getPropertyValue('--sp-top')) || 88;
        buy.classList.toggle('is-stick', buy.offsetHeight + top + 24 < window.innerHeight);
      };
      new ResizeObserver(fit).observe(buy);
      window.addEventListener('resize', fit, { passive: true });
    }

    /* ---------- info dialogs ---------- */
    root.addEventListener('click', function (e) {
      var t = e.target.closest('[data-sp-modal]');
      if (t) {
        var d = root.querySelector('[data-sp-dialog="' + t.getAttribute('data-sp-modal') + '"]');
        if (d && d.showModal) { e.preventDefault(); d.showModal(); }
        return;
      }
      if (e.target.matches('dialog.sp-modal')) e.target.close();   /* backdrop click */
    });
  }

  function boot() { document.querySelectorAll('[data-sp]').forEach(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  document.addEventListener('shopify:section:load', boot);
})();
