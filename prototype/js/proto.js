/* SNH prototype — minimal progressive enhancement. Everything renders without it. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce && 'IntersectionObserver' in window) root.classList.add('js');

  /* reveal on scroll, once */
  if (root.classList.contains('js')) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal, .ftr__mark').forEach(function (el) { io.observe(el); });
  }




  /* ---------- header: solid on scroll (transparent over the hero on the homepage) ---------- */
  var hdr = document.querySelector('.hdr');
  function solid() {
    if (!hdr) return;
    var limit = hdr.classList.contains('hdr--overlay') ? 24 : 4;
    hdr.classList.toggle('is-solid', hdr.getBoundingClientRect().top <= 0 && window.scrollY > limit);
  }
  solid();
  window.addEventListener('scroll', solid, { passive: true });

  /* ---------- mega menu: 150ms hover intent, fade/slide, arrows between items, Esc, focus trap ---------- */
  /* panel images are lazy; start fetching them the moment the pointer or focus reaches the nav */
  var navEl = document.querySelector('.nav');
  function warm() { document.querySelectorAll('.mega img[loading="lazy"]').forEach(function (i) { i.loading = 'eager'; }); }
  if (navEl) { navEl.addEventListener('mouseenter', warm, { once: true }); navEl.addEventListener('focusin', warm, { once: true }); }
  var scrim = document.querySelector('.mega-scrim');
  var navBtns = Array.prototype.slice.call(document.querySelectorAll('[data-mega]'));
  var openBtn = null, openTimer = null, closeTimer = null;
  function panelOf(btn) { return document.getElementById(btn.getAttribute('aria-controls')); }
  function focusables(el) { return Array.prototype.filter.call(el.querySelectorAll('a[href], button:not([disabled]), input, summary, [tabindex="0"]'), function (x) { return x.offsetParent !== null && !x.closest('[hidden]'); }); }
  function closeMega(returnFocus) {
    if (!openBtn) return;
    var p = panelOf(openBtn), b = openBtn;
    openBtn.setAttribute('aria-expanded', 'false');
    p.classList.remove('is-open');
    setTimeout(function () { if (!p.classList.contains('is-open')) p.hidden = true; }, 200);
    hdr.classList.remove('is-open');
    if (scrim) { scrim.classList.remove('is-on'); setTimeout(function () { if (!openBtn) scrim.hidden = true; }, 200); }
    openBtn = null;
    if (returnFocus) b.focus();
  }
  function openMega(btn) {
    clearTimeout(closeTimer);
    if (openBtn === btn) return;
    if (openBtn) { var prev = panelOf(openBtn); openBtn.setAttribute('aria-expanded', 'false'); prev.classList.remove('is-open'); prev.hidden = true; }
    var p = panelOf(btn);
    p.hidden = false;
    requestAnimationFrame(function () { p.classList.add('is-open'); });
    btn.setAttribute('aria-expanded', 'true');
    hdr.classList.add('is-open');
    if (scrim) { scrim.hidden = false; requestAnimationFrame(function () { scrim.classList.add('is-on'); }); }
    openBtn = btn;
  }
  navBtns.forEach(function (btn, i) {
    btn.addEventListener('mouseenter', function () {
      clearTimeout(openTimer); clearTimeout(closeTimer);
      openTimer = setTimeout(function () { openMega(btn); }, 150);
    });
    btn.addEventListener('mouseleave', function () { clearTimeout(openTimer); });
    btn.addEventListener('click', function () { if (openBtn === btn) closeMega(false); else openMega(btn); });
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        var next = navBtns[(i + (e.key === 'ArrowRight' ? 1 : navBtns.length - 1)) % navBtns.length];
        if (openBtn) openMega(next);
        next.focus();
      }
      if (e.key === 'ArrowDown' || ((e.key === 'Enter' || e.key === ' ') && openBtn !== btn)) {
        e.preventDefault(); openMega(btn);
        setTimeout(function () { var f = focusables(panelOf(btn))[0]; if (f) f.focus(); }, 30);
      }
    });
    /* focus trap: Tab cycles between the item and its open panel */
    panelOf(btn).addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = focusables(panelOf(btn)); if (!f.length) return;
      if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); btn.focus(); }
      else if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); btn.focus(); }
    });
  });
  if (hdr) {
    hdr.addEventListener('mouseleave', function () { clearTimeout(openTimer); closeTimer = setTimeout(function () { closeMega(false); }, 150); });
    hdr.addEventListener('mouseenter', function () { clearTimeout(closeTimer); });
    hdr.addEventListener('focusout', function (e) { if (e.relatedTarget && !hdr.contains(e.relatedTarget)) closeMega(false); });
  }
  if (scrim) scrim.addEventListener('click', function () { closeMega(false); });
  /* the other nav items (SNH Elite) close an open panel on hover */
  document.querySelectorAll('.nav__link').forEach(function (a) { a.addEventListener('mouseenter', function () { clearTimeout(openTimer); closeTimer = setTimeout(function () { closeMega(false); }, 150); }); });

  /* ---------- brands A–Z filter (desktop panel + mobile level) ---------- */
  document.querySelectorAll('[data-az]').forEach(function (az) {
    var input = az.querySelector('[data-az-filter]'), none = az.querySelector('.az__none');
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase(), any = false;
      az.querySelectorAll('.az__g').forEach(function (g) {
        var shown = 0;
        g.querySelectorAll('li[data-name]').forEach(function (li) { var on = !q || li.getAttribute('data-name').indexOf(q) > -1; li.hidden = !on; if (on) shown++; });
        g.hidden = !shown; if (shown) any = true;
      });
      none.hidden = any;
    });
    az.querySelectorAll('.az__bar a').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); var t = az.querySelector(a.getAttribute('href')); if (t) t.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }); });
    });
  });

  /* ---------- predictive search overlay ---------- */
  var srch = document.getElementById('srch'), sq = document.getElementById('srch-q'), sScrim = document.querySelector('.srch-scrim');
  var sIndex = null, sOpener = null;
  function rs(n) { return 'Rs ' + Math.round(n).toLocaleString('en-US'); }
  var VCASE = ['Applied Nutrition', 'MuscleTech', 'Dymatize', 'Myprotein', 'Revive', 'Centrum', 'Vitabiotics', 'Healthspan Elite', 'Surge', 'Trace Minerals', 'Redcon1'];
  function tidy(t) { for (var i = 0; i < VCASE.length; i++) { var v = VCASE[i]; if (t.slice(0, v.length) === v.toUpperCase() && t.charAt(v.length) === ' ') return v + t.slice(v.length); } return t; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function loadIndex() {
    if (sIndex) return Promise.resolve(sIndex);
    return Promise.all(['data/search-index.json', 'data/live-collections.json', 'data/live-blog-all.json'].map(function (u) { return fetch(u).then(function (r) { return r.json(); }); }))
      .then(function (d) { var seen = {}; sIndex = { p: d[0], c: d[1].filter(function (c) { var k = c.t.toLowerCase(); if (!c.n || seen[k]) return false; seen[k] = 1; return true; }), a: d[2] }; return sIndex; });
  }
  function score(text, words) { text = text.toLowerCase(); var s = 0; for (var i = 0; i < words.length; i++) { var k = text.indexOf(words[i]); if (k < 0) return 0; s += k === 0 ? 3 : 1; } return s; }
  function runSearch() {
    var q = sq.value.trim(), empty = srch.querySelector('.srch__empty'), res = srch.querySelector('.srch__res');
    if (q.length < 2) { empty.hidden = false; res.hidden = true; return; }
    loadIndex().then(function (ix) {
      var w = q.toLowerCase().split(/\s+/);
      var rank = function (list, fn) { return list.map(function (x) { return [score(fn(x), w), x]; }).filter(function (a) { return a[0]; }).sort(function (a, b) { return b[0] - a[0]; }).map(function (a) { return a[1]; }); };
      var P = rank(ix.p, function (p) { return p.t + ' ' + p.v + ' ' + p.y + ' ' + [].concat(p.g || []).join(' '); }).slice(0, 6);
      var Cc = rank(ix.c, function (c) { return c.t; }).slice(0, 5);
      var A = rank(ix.a, function (a) { return a.title + ' ' + a.summary; }).slice(0, 3);
      srch.querySelector('[data-r="p"]').innerHTML = P.length ? P.map(function (p) { return '<li><a class="mini" href="/products/' + p.h + '"><img src="' + esc(p.i) + (p.i.indexOf('?') > -1 ? '&' : '?') + 'width=160" alt="" width="64" height="64"><span class="mini__t">' + esc(p.t) + '</span><span class="mini__p">' + rs(p.p) + '</span></a></li>'; }).join('') : '<li class="srch__nil">No products match “' + esc(q) + '”.</li>';
      srch.querySelector('[data-r="c"]').innerHTML = Cc.length ? Cc.map(function (c) { return '<li><a href="/collections/' + c.h + '">' + esc(c.t.charAt(0) + c.t.slice(1).toLowerCase()) + ' <span>' + c.n + '</span></a></li>'; }).join('') : '<li class="srch__nil">No collections.</li>';
      srch.querySelector('[data-r="a"]').innerHTML = A.length ? A.map(function (a) { return '<li><a class="mini mini--art" href="' + esc(a.url) + '">' + (a.image ? '<img src="' + esc(a.image) + '&width=160" alt="" width="64" height="64">' : '<span class="mini__ph"></span>') + '<span class="mini__t">' + esc(a.title) + '</span><span class="mini__p">' + Math.max(1, Math.round(a.words / 220)) + ' min read</span></a></li>'; }).join('') : '<li class="srch__nil">No articles.</li>';
      srch.querySelector('.srch__all').href = '/search?q=' + encodeURIComponent(q);
      srch.querySelector('.srch__all span').textContent = 'View all results for “' + q + '”';
      empty.hidden = true; res.hidden = false;
    });
  }
  function openSearch(from) {
    if (!srch) return;
    sOpener = from || document.activeElement;
    closeMega(false);
    srch.hidden = false; if (sScrim) sScrim.hidden = false;
    requestAnimationFrame(function () { srch.classList.add('is-open'); if (sScrim) sScrim.classList.add('is-on'); });
    document.body.style.overflow = 'hidden';
    setTimeout(function () { sq.focus(); }, 60);
    loadIndex();
  }
  function closeSearch() {
    if (!srch || srch.hidden) return;
    srch.classList.remove('is-open'); if (sScrim) sScrim.classList.remove('is-on');
    setTimeout(function () { srch.hidden = true; if (sScrim) sScrim.hidden = true; }, 220);
    if (!mm || mm.hidden) document.body.style.overflow = '';
    if (sOpener && sOpener.focus) sOpener.focus();
  }
  if (srch) {
    document.querySelectorAll('[data-open-search]').forEach(function (b) { b.addEventListener('click', function () { openSearch(b); }); });
    var sT; sq.addEventListener('input', function () { clearTimeout(sT); sT = setTimeout(runSearch, 120); });
    srch.querySelector('.srch__close').addEventListener('click', closeSearch);
    if (sScrim) sScrim.addEventListener('click', closeSearch);
    srch.querySelectorAll('[data-q]').forEach(function (c) { c.addEventListener('click', function () { sq.value = c.getAttribute('data-q'); runSearch(); sq.focus(); }); });
    srch.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = focusables(srch), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && srch && srch.hidden && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); return; }
    if (e.key !== 'Escape') return;
    if (srch && !srch.hidden) { closeSearch(); return; }
    if (openBtn) { closeMega(true); return; }
    if (mm && !mm.hidden) { if (mmStack.length > 1) mmBack(); else closeMenu(); }
  });

  /* ---------- mobile menu: full-screen drill-down ---------- */
  var mm = document.getElementById('mmenu');
  var mmBtn = document.querySelector('.hdr__menu');
  var mmStack = [];
  function mmShow(id, back) {
    var cur = mmStack[mmStack.length - 1], next = document.getElementById(id);
    if (cur) { cur.classList.remove('is-on'); cur.classList.toggle('is-behind', !back); cur.inert = true; }
    next.classList.remove('is-behind'); next.classList.add('is-on'); next.inert = false;
    if (!back) mmStack.push(next);
    var f = next.querySelector('.mm__back, .mm__go'); if (f) setTimeout(function () { f.focus({ preventScroll: true }); }, 320);
  }
  function mmBack() {
    var cur = mmStack.pop(), prev = mmStack[mmStack.length - 1];
    cur.classList.remove('is-on'); cur.inert = true;
    prev.classList.remove('is-behind'); prev.classList.add('is-on'); prev.inert = false;
    var opener = prev.querySelector('[data-level="' + cur.id + '"]'); if (opener) setTimeout(function () { opener.focus({ preventScroll: true }); }, 320);
  }
  function openMenu() {
    mm.hidden = false;
    mmStack = [document.getElementById('mm-root')];
    mm.querySelectorAll('.mm__level').forEach(function (l) { var root = l.id === 'mm-root'; l.classList.toggle('is-on', root); l.classList.remove('is-behind'); l.inert = !root; });
    requestAnimationFrame(function () { mm.classList.add('is-open'); });
    mmBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { mm.querySelector('.mmenu__close').focus(); }, 50);
  }
  function closeMenu() {
    mm.classList.remove('is-open');
    mmBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    setTimeout(function () { mm.hidden = true; }, 320);
    mmBtn.focus();
  }
  if (mm && mmBtn) {
    mmBtn.addEventListener('click', openMenu);
    mm.querySelector('.mmenu__close').addEventListener('click', closeMenu);
    mm.querySelectorAll('[data-level]').forEach(function (b) { b.addEventListener('click', function () { mmShow(b.getAttribute('data-level')); }); });
    mm.querySelectorAll('.mm__back').forEach(function (b) { b.addEventListener('click', mmBack); });
    mm.querySelectorAll('.mm__tabs').forEach(function (tabs) {
      var lvl = tabs.closest('.mm__level');
      tabs.querySelectorAll('[data-tab]').forEach(function (t) {
        t.addEventListener('click', function () {
          tabs.querySelectorAll('[data-tab]').forEach(function (x) { x.setAttribute('aria-selected', String(x === t)); });
          lvl.querySelectorAll('[data-pane]').forEach(function (p) { p.hidden = p.getAttribute('data-pane') !== t.getAttribute('data-tab'); });
        });
      });
    });
    mm.addEventListener('keydown', function (e) {          /* keep focus inside the open dialog */
      if (e.key !== 'Tab') return;
      var f = focusables(mm).filter(function (x) { return !x.closest('[inert]'); });
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ---------- announcement slot: rotate every 4s, pause on hover ---------- */
  var ann = Array.prototype.slice.call(document.querySelectorAll('.announce__item'));
  if (ann.length > 1 && !reduce) {
    var ai = 0, annHold = false;
    var annBox = document.querySelector('.announce');
    annBox.addEventListener('mouseenter', function () { annHold = true; });
    annBox.addEventListener('mouseleave', function () { annHold = false; });
    setInterval(function () {
      if (annHold || document.hidden) return;
      ann[ai].classList.remove('is-on');
      ai = (ai + 1) % ann.length;
      ann[ai].classList.add('is-on');
    }, 4000);
  }

  /* full-screen hero = viewport minus whatever chrome sits above it (ticker, announcement, header in flow) */
  function heroOffset() {
    var hero = document.querySelector('.hero');
    if (!hero) return;
    var top = 0;
    document.querySelectorAll('[data-chrome]').forEach(function (el) {
      if (getComputedStyle(el).position !== 'fixed' && !el.classList.contains('is-overlay')) top += el.offsetHeight;
    });
    root.style.setProperty('--hero-offset', top + 'px');
  }
  heroOffset();
  window.addEventListener('resize', heroOffset);

  /* hero carousel: 6s story-style progress, pause on hover/focus/hidden tab, swipe, keys */
  document.querySelectorAll('[data-carousel]').forEach(function (hero) {
    var stage = hero.querySelector('.hero__stage');
    var slides = Array.prototype.slice.call(hero.querySelectorAll('.hero__slide'));
    var segs = Array.prototype.slice.call(hero.querySelectorAll('.seg'));
    var i = 0;
    function show(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) {
        var on = k === i;
        s.classList.toggle('is-on', on);
        s.setAttribute('aria-hidden', String(!on));
        if (on) s.removeAttribute('inert'); else s.setAttribute('inert', '');
      });
      segs.forEach(function (g, k) {
        g.classList.remove('is-on');
        g.classList.toggle('is-done', k < i);
        if (k === i) { void g.offsetWidth; g.classList.add('is-on'); g.setAttribute('aria-current', 'true'); } else g.removeAttribute('aria-current');
      });
      stage.classList.toggle('is-banner', slides[i].classList.contains('hero__slide--banner'));
      if (hero.__sync) hero.__sync();
    }
    /* the active segment's CSS fill animation is the timer: when it ends, advance */
    segs.forEach(function (g, k) {
      g.addEventListener('click', function () { show(k); });
      g.querySelector('span').addEventListener('animationend', function () { if (k === i && !reduce) show(i + 1); });
    });
    hero.querySelectorAll('.hero__arrow').forEach(function (a) {
      a.addEventListener('click', function () { show(i + Number(a.getAttribute('data-dir'))); });
    });
    /* paused = hovered/focused OR tab hidden OR mostly off-screen (so two carousels never autoplay at once) */
    var hold = { hover: false, focus: false, hidden: false, off: false };
    function sync() {
      var p = reduce || hold.hover || hold.focus || hold.hidden || hold.off;
      hero.classList.toggle('is-paused', p);
      var v = hero.querySelector('.hero__slide.is-on video');
      hero.querySelectorAll('video').forEach(function (x) { if (x !== v || p) x.pause(); });
      if (v && !p && !reduce) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); }
    }
    hero.__sync = sync;
    hero.addEventListener('mouseenter', function () { hold.hover = true; sync(); });
    hero.addEventListener('mouseleave', function () { hold.hover = false; sync(); });
    hero.addEventListener('focusin', function () { hold.focus = true; sync(); });
    hero.addEventListener('focusout', function (e) { if (!hero.contains(e.relatedTarget)) { hold.focus = false; sync(); } });
    document.addEventListener('visibilitychange', function () { hold.hidden = document.hidden; sync(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { hold.off = en[0].intersectionRatio < 0.35; sync(); }, { threshold: [0, 0.35, 0.6, 1] }).observe(hero);
    }
    /* mobile gets the portrait poster */
    hero.querySelectorAll('video[data-poster-m]').forEach(function (v) { if (window.matchMedia('(max-width: 767px)').matches) v.poster = v.getAttribute('data-poster-m'); });
    hero.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); show(i + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(i - 1); }
    });
    var x0 = null, y0 = null;
    stage.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    stage.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) show(i + (dx < 0 ? 1 : -1));
      x0 = null;
    });
    show(0);
  });

  /* "Show editable areas" demo toggle */
  var editBtn = document.querySelector('.edit-toggle');
  if (/[?&]edit\b/.test(location.search)) root.classList.add('show-edit');   /* phones: open index.html?edit */
  if (editBtn) editBtn.addEventListener('click', function () {
    var on = root.classList.toggle('show-edit');
    editBtn.setAttribute('aria-pressed', String(on));
    editBtn.textContent = on ? 'Hide editable areas' : 'Show editable areas';
  });


  /* ---------- shop by goal tabs ---------- */
  document.querySelectorAll('[data-goal]').forEach(function (t) {
    t.addEventListener('click', function () {
      document.querySelectorAll('[data-goal]').forEach(function (o) { o.setAttribute('aria-selected', String(o === t)); });
      document.querySelectorAll('[data-goal-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-goal-panel') !== t.getAttribute('data-goal'); });
    });
  });

  /* ---------- shop-the-look hotspots ---------- */
  document.querySelectorAll('.hs').forEach(function (hs) {
    var media = hs.querySelector('.hs__media');
    var openDot = null;
    function hot(i, on) {
      hs.querySelectorAll('[data-spot="' + i + '"]').forEach(function (el) { el.classList.toggle('is-hot', on); });
    }
    function close() {
      if (!openDot) return;
      var i = openDot.getAttribute('data-spot');
      hs.querySelector('[data-pop="' + i + '"]').hidden = true;
      openDot.setAttribute('aria-expanded', 'false');
      hot(i, false);
      openDot = null;
    }
    function open(dot) {
      close();
      var i = dot.getAttribute('data-spot');
      var pop = hs.querySelector('[data-pop="' + i + '"]');
      pop.hidden = false;
      /* desktop: place the card beside the dot, flipping at the edges */
      if (window.matchMedia('(min-width: 768px)').matches) {
        var x = parseFloat(dot.style.left), y = parseFloat(dot.style.top);
        /* below the dot, centred on it, clamped to the image so it never covers the other dots' row */
        pop.style.left = 'clamp(8px, calc(' + x + '% - 130px), calc(100% - 268px))';
        pop.style.right = 'auto';
        pop.style.top = y > 70 ? 'calc(' + y + '% - 150px)' : 'calc(' + y + '% + 30px)';
      }
      dot.setAttribute('aria-expanded', 'true');
      hot(i, true);
      openDot = dot;
      var btn = pop.querySelector('button.btn');
      if (btn) btn.focus({ preventScroll: true });
    }
    hs.querySelectorAll('.hs__dot').forEach(function (dot) {
      dot.addEventListener('click', function (e) { e.stopPropagation(); if (openDot === dot) close(); else open(dot); });
    });
    hs.querySelectorAll('.hs__close').forEach(function (c) { c.addEventListener('click', function () { var d = openDot; close(); if (d) d.focus(); }); });
    hs.querySelectorAll('.hs__item').forEach(function (item) {
      var i = item.getAttribute('data-spot');
      item.addEventListener('mouseenter', function () { hot(i, true); });
      item.addEventListener('mouseleave', function () { if (!openDot || openDot.getAttribute('data-spot') !== i) hot(i, false); });
    });
    document.addEventListener('click', function (e) { if (openDot && !e.target.closest('.hs__pop')) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && openDot) { var d = openDot; close(); d.focus(); } });
  });


  /* ---------- PDP: gallery (thumbs, swipe, progress bar) ---------- */
  var pgTrack = document.querySelector('.pg__track');
  if (pgTrack) {
    var pgSlides = pgTrack.children.length;
    var pgThumbs = Array.prototype.slice.call(document.querySelectorAll('.pg__thumb'));
    var pgBar = document.querySelector('.pg__bar span');
    function pgMark(i) {
      pgThumbs.forEach(function (t, k) { t.setAttribute('aria-current', String(k === i)); });
      if (pgBar) { pgBar.style.width = (100 / pgSlides) + '%'; pgBar.style.transform = 'translateX(' + (i * 100) + '%)'; }
    }
    function pgGo(i) { pgTrack.scrollTo({ left: i * pgTrack.clientWidth, behavior: reduce ? 'auto' : 'smooth' }); pgMark(i); }
    pgThumbs.forEach(function (t, i) { t.addEventListener('click', function () { pgGo(i); }); });
    var pgRaf;
    pgTrack.addEventListener('scroll', function () { cancelAnimationFrame(pgRaf); pgRaf = requestAnimationFrame(function () { pgMark(Math.round(pgTrack.scrollLeft / pgTrack.clientWidth)); }); }, { passive: true });
    pgMark(0);

    /* ---------- PDP: variant switching updates gallery, price, per serving, stock, buttons, sticky bar ---------- */
    var SERVINGS = 61;
    var fmt = function (n) { return 'Rs ' + Math.round(n).toLocaleString('en-US'); };
    var set = function (sel, v) { document.querySelectorAll(sel).forEach(function (el) { el.textContent = v; }); };
    function applyVariant(v) {
      set('[data-flavour]', v.flavour); set('[data-sticky-flavour]', v.flavour);
      set('[data-price]', fmt(v.price)); set('[data-sticky-price]', fmt(v.price));
      set('[data-per]', fmt(v.price / SERVINGS) + ' per serving'); set('[data-per-stat]', fmt(v.price / SERVINGS));
      set('[data-koko]', fmt(v.price / 3));
      set('[data-pts]', Math.round(v.price * .03).toLocaleString('en-US') + '–' + Math.round(v.price * .1).toLocaleString('en-US'));
      var save = document.querySelector('[data-save]');
      if (save) { save.hidden = !(v.compare > v.price); save.textContent = 'You save ' + fmt(v.compare - v.price); }
      var stock = document.querySelector('[data-stock]');
      if (stock) { stock.classList.toggle('stock--out', !v.available); stock.querySelector('span').textContent = v.available ? 'In stock' : 'Sold out'; }
      document.querySelectorAll('[data-atc-main], [data-buy-now], [data-sticky-btn]').forEach(function (b) { b.disabled = !v.available; });
      var main = document.querySelector('[data-atc-main] span'); if (main) main.textContent = v.available ? 'Add to cart' : 'Sold out';
      var sb = document.querySelector('[data-sticky-btn] span'); if (sb) sb.textContent = v.available ? 'Add to cart' : 'Sold out';
      if (v.img) {            /* jump to this flavour's own live gallery image */
        var si = document.querySelector('[data-sticky-img]'); if (si) si.src = v.img + (v.img.indexOf('?') > -1 ? '&' : '?') + 'width=120';
        if (typeof v.media === 'number') { pgGo(v.media); var th = pgThumbs[v.media]; if (th && th.parentElement) th.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
      }
    }
    var vbox = document.querySelector('[data-variants]');
    /* open on the selected flavour's own image (live order is kept; image 1 is a sold-out flavour) */
    var vOn = vbox && vbox.querySelector('.vpill[aria-checked="true"]');
    if (vOn) { var vm = JSON.parse(vOn.getAttribute('data-variant')).media; requestAnimationFrame(function () { pgTrack.scrollLeft = vm * pgTrack.clientWidth; pgMark(vm); }); }
    if (vbox) vbox.addEventListener('click', function (e) {
      var pill = e.target.closest('.vpill'); if (!pill) return;
      vbox.querySelectorAll('.vpill').forEach(function (x) { x.setAttribute('aria-checked', String(x === pill)); });
      applyVariant(JSON.parse(pill.getAttribute('data-variant')));
    });
  }

  /* ---------- PDP: bundle pills (tabs) + purchase option cards ---------- */
  document.querySelectorAll('.bx__pills').forEach(function (tl) {
    var tabs = Array.prototype.slice.call(tl.querySelectorAll('[role="tab"]'));
    function pick(t) { tabs.forEach(function (x) { var on = x === t; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; document.getElementById(x.getAttribute('aria-controls')).hidden = !on; }); }
    tabs.forEach(function (t, i) {
      t.tabIndex = i ? -1 : 0;
      t.addEventListener('click', function () { pick(t); });
      t.addEventListener('keydown', function (e) { if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; var n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; pick(n); n.focus(); });
    });
  });
  document.querySelectorAll('[data-bundle-add]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); say('Prototype: adds the bundle product to the basket'); }); });
  document.querySelectorAll('.popt').forEach(function (f) {
    function sync() { f.querySelectorAll('.popt__card').forEach(function (c) { c.classList.toggle('is-on', c.querySelector('input').checked); }); }
    f.addEventListener('change', sync); sync();
  });

  /* ---------- PDP: Buy now, Read more, Elite modals, bundle total ---------- */
  document.querySelectorAll('[data-buy-now]').forEach(function (b) { b.addEventListener('click', function () { say('Prototype: Buy now goes straight to checkout'); }); });
  var clampEl = document.querySelector('[data-clamp]'), more = document.querySelector('[data-more]');
  if (clampEl && more) {
    if (window.matchMedia('(max-width: 1023px)').matches) clampEl.classList.add('is-clamped');
    more.hidden = !(clampEl.scrollHeight > clampEl.clientHeight + 2);
    more.addEventListener('click', function () { var c = clampEl.classList.toggle('is-clamped'); more.textContent = c ? 'Read more' : 'Read less'; });
  }
  var lastFocus = null;
  function closeModal(m) { m.hidden = true; document.body.style.overflow = ''; if (lastFocus) lastFocus.focus(); }
  document.querySelectorAll('[data-modal]').forEach(function (b) {
    b.addEventListener('click', function () {
      var m = document.getElementById('m-' + b.getAttribute('data-modal')); if (!m) return;
      lastFocus = b; m.hidden = false; document.body.style.overflow = 'hidden'; m.querySelector('.emodal__x').focus();
    });
  });
  document.querySelectorAll('.emodal').forEach(function (m) {
    m.addEventListener('click', function (e) { if (e.target === m || e.target.closest('.emodal__x')) closeModal(m); });
    m.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(m); });
  });
  document.querySelectorAll('.fbt__item input').forEach(function (cb) {
    cb.addEventListener('change', function () {
      var t = 0; document.querySelectorAll('.fbt__item input:checked').forEach(function (x) { t += Number(x.getAttribute('data-price')); });
      var fmt2 = function (n) { return 'Rs ' + Math.round(n).toLocaleString('en-US'); };
      document.querySelector('[data-fbt-total]').textContent = fmt2(t);
      document.querySelector('[data-fbt-koko]').textContent = 'or 3 × ' + fmt2(t / 3) + ' with Koko';
    });
  });

  /* toast */
  var toast = document.querySelector('.toast');
  var toastTimer;
  function say(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-on'); }, 2200);
  }
  var count = document.querySelector('.icon-btn__count');
  function bump(n) { if (count) count.textContent = String(Number(count.textContent || 0) + n); }

  /* quick add (prototype: no real cart) */
  document.addEventListener('click', function (e) {
    var q = e.target.closest('.quick');
    if (q) {
      e.preventDefault();
      q.classList.add('is-added');
      bump(1);
      say(q.getAttribute('data-name') + ' added to basket');
      setTimeout(function () { q.classList.remove('is-added'); }, 1500);
    }
    var atc = e.target.closest('[data-atc]');
    if (atc) {
      e.preventDefault();
      var qty = Number((document.querySelector('.qty output') || {}).textContent || 1);
      bump(qty);
      say(atc.getAttribute('data-atc') + ' × ' + qty + ' added to basket');
    }
  });

  /* tabs filter the bestseller grid */
  document.querySelectorAll('[role="tablist"]').forEach(function (list) {
    list.addEventListener('click', function (e) {
      var tab = e.target.closest('[role="tab"]');
      if (!tab) return;
      list.querySelectorAll('[role="tab"]').forEach(function (t) { t.setAttribute('aria-selected', String(t === tab)); });
      var key = tab.getAttribute('data-filter');
      document.querySelectorAll('#' + list.getAttribute('aria-controls') + ' > .card').forEach(function (card) {
        card.hidden = key !== 'all' && card.getAttribute('data-group') !== key;
      });
    });
  });

  /* gallery: thumbs + dots + swatch → image */
  var track = document.querySelector('.gallery__track');
  if (track) {
    var slides = Array.prototype.slice.call(track.children);
    var thumbs = Array.prototype.slice.call(document.querySelectorAll('.gallery__thumbs button'));
    var dots = Array.prototype.slice.call(document.querySelectorAll('.gallery__dots span'));
    function mark(i) {
      thumbs.forEach(function (t, j) { t.setAttribute('aria-current', String(i === j)); });
      dots.forEach(function (d, j) { d.classList.toggle('is-on', i === j); });
    }
    function go(i) { track.scrollTo({ left: slides[i].offsetLeft - track.offsetLeft, behavior: reduce ? 'auto' : 'smooth' }); mark(i); }
    thumbs.forEach(function (t, i) { t.addEventListener('click', function () { go(i); }); });
    var raf;
    track.addEventListener('scroll', function () {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () { mark(Math.round(track.scrollLeft / track.clientWidth)); });
    }, { passive: true });

    document.querySelectorAll('[role="radiogroup"]').forEach(function (group) {
      group.addEventListener('click', function (e) {
        var opt = e.target.closest('[role="radio"]');
        if (!opt) return;
        group.querySelectorAll('[role="radio"]').forEach(function (o) { o.setAttribute('aria-checked', String(o === opt)); });
        var out = document.querySelector('[data-selected="' + group.id + '"]');
        if (out) out.textContent = opt.getAttribute('data-value');
        var img = opt.getAttribute('data-slide');
        if (img !== null) go(Number(img));
      });
    });
  }

  /* quantity */
  document.querySelectorAll('.qty').forEach(function (q) {
    var out = q.querySelector('output');
    q.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      out.textContent = String(Math.max(1, Number(out.textContent) + Number(b.getAttribute('data-step'))));
    });
  });

  /* sticky add-to-cart once the main button scrolls away (mobile) */
  var main = document.querySelector('.buy [data-atc]');
  var bar = document.querySelector('.sticky-atc');
  if (main && bar && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var e = entries[0];
      bar.classList.toggle('is-on', !e.isIntersecting && e.boundingClientRect.top < 0);
    }).observe(main);
  }
})();
