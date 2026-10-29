/* SNH social sections (Round 9): lazy TikTok embeds for sections/snh-tiktok.
   Nothing is requested from TikTok until a [data-ttk] section is within 600px of the viewport; then embed.js loads once
   and renders every .tiktok-embed on the page. Each box gets .is-loaded when TikTok's iframe appears, or .is-failed
   (fallback card) if the script is blocked or no iframe shows within 10s. Boxes have fixed heights, so nothing moves. */
(function () {
  if (window.__snhSocial) return;
  window.__snhSocial = true;
  var SRC = 'https://www.tiktok.com/embed.js', state = 'idle', waiting = [];

  function watch(sec) {
    if (sec.__ttkWatch) return;
    sec.__ttkWatch = true;
    var boxes = [].slice.call(sec.querySelectorAll('[data-ttk-box]'));
    boxes.forEach(function (box) {
      var done = false;
      function ok() { if (done) return; done = true; box.classList.add('is-loaded'); }
      function fail() { if (done) return; done = true; box.classList.add('is-failed'); update(sec); }
      if (box.querySelector('iframe')) return ok();
      var mo = new MutationObserver(function () { if (box.querySelector('iframe')) { mo.disconnect(); ok(); } });
      mo.observe(box, { childList: true, subtree: true });
      box.__ttkFail = function () { mo.disconnect(); fail(); };
      setTimeout(function () { if (!box.querySelector('iframe')) box.__ttkFail(); }, 10000);
    });
  }
  function update(sec) {
    var p = sec.querySelector('.ttk__box--profile');
    sec.classList.toggle('is-failed-all', !!(p && p.classList.contains('is-failed')));
  }
  function failAll() { [].forEach.call(document.querySelectorAll('[data-ttk-box]'), function (b) { if (b.__ttkFail) b.__ttkFail(); else b.classList.add('is-failed'); }); [].forEach.call(document.querySelectorAll('[data-ttk]'), update); }

  function load(sec) {
    waiting.push(sec);
    watch(sec);
    if (state === 'loading') return;
    if (state === 'done') { reload(); return; }
    state = 'loading';
    var s = document.createElement('script');
    s.src = SRC; s.async = true;
    s.onload = function () { state = 'done'; };
    s.onerror = function () { state = 'error'; failAll(); };
    document.body.appendChild(s);
  }
  // embed.js only scans the page once; for a section added later (theme editor) load a fresh copy
  function reload() {
    var old = document.querySelector('script[src="' + SRC + '"]');
    if (old) old.remove();
    var s = document.createElement('script');
    s.src = SRC; s.async = true;
    s.onerror = failAll;
    document.body.appendChild(s);
  }

  function init(root) {
    [].forEach.call((root || document).querySelectorAll('[data-ttk]'), function (sec) {
      if (sec.__ttkInit) return;
      sec.__ttkInit = true;
      if (!('IntersectionObserver' in window)) { load(sec); return; }
      var io = new IntersectionObserver(function (es) {
        if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); load(sec); }
      }, { rootMargin: '600px 0px' });
      io.observe(sec);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); }); else init();
  document.addEventListener('shopify:section:load', function (e) { init(e.target); });
})();
