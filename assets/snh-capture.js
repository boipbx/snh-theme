/* SNH email capture (Round 11): the modal and the slide-in from sections/snh-email-capture.
   Modal: desktop on exit intent (pointer leaves through the top of the window); phones after N seconds or N % scroll.
   At most once every N days (localStorage snh_ecm_t). Slide-in: product/blog pages after 50 % scroll, dismissal
   remembered for 30 days (snh_ect_off). Nobody who subscribed on this device (snh_sub) is asked again; the Liquid
   already skips signed-in customers and cart/checkout/account/password pages. Coming back from the form's POST
   (?customer_posted=true) re-opens the box they used so they see their code. */
(function () {
  if (window.__snhCapture) return;
  window.__snhCapture = true;
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  var DAY = 864e5;
  function init() {
    var root = document.querySelector('[data-email-capture]');
    if (!root || root.__ec) return;
    root.__ec = true;
    var modal = root.querySelector('[data-ecm]'), teaser = root.querySelector('[data-ect]');
    var days = +root.getAttribute('data-days') || 14, delay = (+root.getAttribute('data-delay') || 45) * 1000, depth = (+root.getAttribute('data-scroll') || 60) / 100;
    // any capture form posting = subscribed on this device
    document.addEventListener('submit', function (e) { if (e.target.matches && e.target.matches('form[data-ecf]')) ls('snh_sub', String(Date.now())); }, true);
    var posted = /[?&]customer_posted=true/.test(location.search);
    if (posted) ls('snh_sub', String(Date.now()));
    // back from the POST: show the box they used, now with the thank-you + code
    var hash = (location.hash || '').slice(1);
    if (posted && hash) {
      var f = document.getElementById(hash);
      if (f && modal && modal.contains(f) && modal.showModal) { modal.showModal(); return; }
      if (f && teaser && teaser.contains(f)) { teaser.hidden = false; teaser.classList.add('is-on'); return; }
    }
    if (ls('snh_sub')) return;
    var desk = matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)').matches;
    var shown = false;
    function capped() { var t = +ls('snh_ecm_t') || 0; return Date.now() - t < days * DAY; }
    function busy() { return !!document.querySelector('dialog[open], x-drawer[open], .snh-sheet-open, quick-buy-drawer[open]'); }
    function openModal() {
      if (shown || !modal || !modal.showModal || capped() || busy() || (teaser && !teaser.hidden)) return;   // one prompt per page view
      shown = true;
      ls('snh_ecm_t', String(Date.now()));
      var tpl = modal.querySelector('[data-ecm-video]');
      if (tpl && !matchMedia('(prefers-reduced-motion: reduce)').matches) { tpl.parentNode.appendChild(tpl.content.cloneNode(true)); tpl.remove(); }
      if (teaser) teaser.hidden = true;
      modal.showModal();
    }
    if (modal && root.getAttribute('data-modal') === 'true') {
      modal.addEventListener('click', function (e) { if (e.target === modal || e.target.closest('[data-ecm-close]')) modal.close(); });
      if (desk) {
        document.addEventListener('mouseout', function (e) { if (!e.relatedTarget && e.clientY <= 0) openModal(); });
      } else {
        var timer = setTimeout(openModal, delay);
        var onScroll = function () { var h = document.documentElement.scrollHeight - innerHeight; if (h > 0 && scrollY / h >= depth) { window.removeEventListener('scroll', onScroll); clearTimeout(timer); openModal(); } };
        window.addEventListener('scroll', onScroll, { passive: true });
      }
    }
    if (teaser && root.getAttribute('data-teaser') === 'true') {
      var off = +ls('snh_ect_off') || 0;
      if (Date.now() - off > 30 * DAY) {
        var onT = function () { var h = document.documentElement.scrollHeight - innerHeight; if (h > 0 && scrollY / h >= .5 && !shown && !busy()) { window.removeEventListener('scroll', onT); teaser.hidden = false; requestAnimationFrame(function () { teaser.classList.add('is-on'); }); } };
        window.addEventListener('scroll', onT, { passive: true });
        teaser.querySelector('[data-ect-close]').addEventListener('click', function () { teaser.classList.remove('is-on'); setTimeout(function () { teaser.hidden = true; }, 300); ls('snh_ect_off', String(Date.now())); });
      }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
