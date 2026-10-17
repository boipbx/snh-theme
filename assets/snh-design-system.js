/* SNH Design System — shared behaviour (see DESIGN.md). Loaded once, deferred. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Section fade-up: 16px, once, only for sections below the fold ---------- */
  function initReveal() {
    if (reduceMotion || !('IntersectionObserver' in window)) return;
    var sections = Array.prototype.filter.call(
      document.querySelectorAll('#main > .shopify-section, #main > section.shopify-section'),
      function (el) { return el.getBoundingClientRect().top > window.innerHeight; }
    );
    if (!sections.length) return;
    document.documentElement.classList.add('snh-js');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    sections.forEach(function (el) { el.classList.add('snh-reveal'); io.observe(el); });
  }

  /* ---------- Product card: one-tap add (single-variant products) ---------- */
  /* Multi-variant cards use aria-controls to open the theme's quick-buy drawer instead. */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-snh-add]');
    if (!btn) return;
    e.preventDefault();
    if (btn.dataset.snhBusy) return;
    btn.dataset.snhBusy = '1';
    btn.classList.add('is-busy');
    var root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
    fetch(root + 'cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ items: [{ id: Number(btn.dataset.snhAdd), quantity: 1 }] })
    }).then(function (r) {
      if (!r.ok) throw new Error('add failed');
      btn.classList.remove('is-busy');
      btn.classList.add('is-done');
      btn.setAttribute('aria-label', 'Added to basket');
      requestAnimationFrame(function () {
        setTimeout(function () {
          document.documentElement.dispatchEvent(new CustomEvent('variant:add', { bubbles: true }));
        }, 180);
      });
    }).catch(function () {
      btn.classList.remove('is-busy');
      btn.setAttribute('aria-label', 'Could not add, try again');
    }).then(function () {
      setTimeout(function () {
        btn.classList.remove('is-done');
        delete btn.dataset.snhBusy;
      }, 1800);
    });
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReveal);
  } else {
    initReveal();
  }
})();
