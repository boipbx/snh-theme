/* SNH social sections (Round 9): lazy TikTok embeds for sections/snh-tiktok.
   Nothing is requested from TikTok until a [data-ttk] section is within 600px of the viewport; then embed.js loads once
   and renders every .tiktok-embed on the page. A box gets .is-loaded only when its TikTok iframe talks back (embed.js
   sizes the iframe by postMessage), so an iframe that loads TikTok's error page ("overload-protect triggered", seen in
   QA) still counts as failed. .is-failed shows the fallback card: script blocked, or no message within 10s.
   Boxes have fixed heights, so nothing moves. */
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
      box.__ttkOk = ok;
      box.__ttkFail = fail;
      setTimeout(function () { if (!box.classList.contains('is-loaded')) fail(); }, 10000);
    });
  }
  // a message from a box's own TikTok iframe = the embed really rendered
  window.addEventListener('message', function (e) {
    if (!/(^|\.)tiktok\.com$/.test((e.origin || '').replace(/^https?:\/\//, ''))) return;
    [].forEach.call(document.querySelectorAll('[data-ttk-box]'), function (box) {
      var f = box.querySelector('iframe');
      if (f && f.contentWindow === e.source && box.__ttkOk) box.__ttkOk();
    });
  });
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
