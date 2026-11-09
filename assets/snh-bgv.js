/* SNH background video slots (Round 19 #8, snippets/snh-bg-video): attach the <source> only when a slot nears the
   viewport, play while it's on screen, pause when it leaves; reduced motion = the poster only (no download). */
(function () {
  if (window.__snhBgv) return; window.__snhBgv = true;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function arm(box) {
    if (box.__bgv) return; box.__bgv = true;
    // an animated image poster (data-bgv-anim): swap it in on desktop only, once on screen, unless data-saver / reduced motion
    var im = box.querySelector('img[data-bgv-anim]');
    if (im && !reduce && !(navigator.connection && navigator.connection.saveData) && window.matchMedia('(min-width: 768px)').matches && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); im.removeAttribute('srcset'); im.src = im.getAttribute('data-bgv-anim'); } }, { rootMargin: '100px 0px' });
      io.observe(box);
    }
    var v = box.querySelector('video[data-bgv-src]'); if (!v || reduce) return;
    var loaded = false;
    var play = function () { var p = v.play(); if (p && p.catch) p.catch(function () {}); };
    v.addEventListener('playing', function () { box.classList.add('is-playing'); });
    if (!('IntersectionObserver' in window)) { v.src = v.getAttribute('data-bgv-src'); play(); return; }
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) {
          if (!loaded) { loaded = true; var s = document.createElement('source'); s.src = v.getAttribute('data-bgv-src'); s.type = v.getAttribute('data-bgv-type') || 'video/mp4'; v.appendChild(s); v.load(); }
          play();
        } else if (loaded) v.pause();
      });
    }, { rootMargin: '200px 0px' }).observe(box);
    document.addEventListener('visibilitychange', function () { if (document.hidden) v.pause(); });
  }
  function run(root) { (root || document).querySelectorAll('[data-bgv]').forEach(arm); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { run(); }); else run();
  document.addEventListener('shopify:section:load', function (e) { run(e.target); });
})();
