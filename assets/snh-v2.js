/* SNH theme v2: shared behaviour for the snh-* sections. Vanilla, deferred, loaded once from layout/theme.liquid.
   Every component is found by [data-v2="name"] and initialised once; the theme editor re-runs init on
   shopify:section:load so blocks added in the editor work without a reload. Everything renders without JS. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var shopRoot = (window.Shopify && Shopify.routes && Shopify.routes.root) || '/';
  if (!reduce && 'IntersectionObserver' in window) root.classList.add('v-js');

  var V2 = window.V2 = window.V2 || {};
  var inits = {};
  var done = typeof WeakSet === 'function' ? new WeakSet() : { has: function () { return false; }, add: function () {} };
  function on(name, fn) { inits[name] = fn; }
  function run(scope) {
    (scope || document).querySelectorAll('[data-v2]').forEach(function (el) {
      var fn = inits[el.getAttribute('data-v2')];
      if (!fn || done.has(el)) return;
      done.add(el);
      try { fn(el); } catch (err) { if (window.console) console.error('[snh-v2]', el.getAttribute('data-v2'), err); }
    });
  }
  function $$(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function focusables(el) {
    return $$('a[href], button:not([disabled]), input, select, summary, [tabindex="0"]', el).filter(function (x) {
      return x.offsetParent !== null && !x.closest('[hidden]') && !x.closest('[inert]');
    });
  }
  function trapTab(box, e) {
    if (e.key !== 'Tab') return;
    var f = focusables(box), first = f[0], last = f[f.length - 1];
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function rs(n) { return 'Rs ' + Math.round(n).toLocaleString('en-US'); }
  /* live titles start with the vendor in capitals; show the vendor's own casing (same rule as snippets/snh-v2-title) */
  function tidy(title, vendor) {
    if (!vendor || vendor === vendor.toUpperCase()) return title;
    var vu = vendor.toUpperCase();
    return title.slice(0, vu.length) === vu ? vendor + title.slice(vu.length) : title;
  }
  function sized(url, w) { if (!url) return ''; return url + (url.indexOf('?') > -1 ? '&' : '?') + 'width=' + w; }
  V2.rs = rs;

  /* ---------- toast ---------- */
  var toastEl, toastTimer;
  V2.say = function (msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast v2';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2400);
  };

  /* ---------- cart: add through the theme's own flow so the cart drawer and count refresh ---------- */
  V2.add = function (items, btn) {
    if (btn) { if (btn.getAttribute('aria-busy') === 'true') return Promise.resolve(); btn.setAttribute('aria-busy', 'true'); btn.classList.add('is-busy'); }
    var sections = [];
    root.dispatchEvent(new CustomEvent('cart:prepare-bundled-sections', { bubbles: true, detail: { sections: sections } }));
    var added;
    return fetch(shopRoot + 'cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ items: items, sections: sections.join(',') })
    }).then(function (r) {
      return r.json().then(function (j) { if (!r.ok) throw new Error(j.description || j.message || 'Could not add to basket'); return j; });
    }).then(function (j) {
      added = j;
      return fetch(shopRoot + 'cart.js').then(function (r) { return r.json(); });
    }).then(function (cart) {
      cart.sections = added.sections;
      var detail = { items: added.items || [added], cart: cart };
      (btn || root).dispatchEvent(new CustomEvent('variant:add', { bubbles: true, detail: detail }));
      root.dispatchEvent(new CustomEvent('cart:change', { bubbles: true, detail: { baseEvent: 'variant:add', cart: cart } }));
      if (btn) {
        btn.classList.remove('is-busy');
        btn.classList.add('is-added');
        setTimeout(function () { btn.classList.remove('is-added'); }, 1800);
      }
      return cart;
    }).catch(function (err) {
      if (btn) btn.classList.remove('is-busy');
      V2.say(err.message || 'Could not add to basket');
    }).then(function (x) {
      if (btn) btn.removeAttribute('aria-busy');
      return x;
    });
  };
  /* one-tap add for single-variant cards and any [data-v2-add="variantId"] button */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-v2-add]');
    if (!b) return;
    e.preventDefault();
    V2.add([{ id: Number(b.getAttribute('data-v2-add')), quantity: 1 }], b);
  });

  /* ---------- reveal on scroll (footer mark, .v-reveal) ---------- */
  var io = root.classList.contains('v-js') ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px' }) : null;
  on('reveal', function (el) { if (io) io.observe(el); else el.classList.add('is-in'); });

  /* ================= header ================= */
  on('header', function (wrap) {
    var hdr = wrap.querySelector('.hdr');
    var section = wrap.closest('.shopify-section') || wrap;
    var bars = $$('[data-chrome-bar]', wrap);

    /* sizes: the ticker + announcement scroll away, the header bar stays (sticky wrapper with a negative top) */
    function measure() {
      var b = 0;
      bars.forEach(function (x) { b += x.offsetHeight; });
      section.style.setProperty('--v-bars', b + 'px');
      root.style.setProperty('--v-bars', b + 'px');
      root.style.setProperty('--v-hdr', hdr.offsetHeight + 'px');                 /* measured; --hdr-h stays CSS-owned */
      root.style.setProperty('--header-height', hdr.offsetHeight + 'px');          /* Impact's own sticky offsets */
      root.style.setProperty('--hero-offset', (b + (hdr.classList.contains('is-overlay') ? 0 : hdr.offsetHeight)) + 'px');
    }
    measure();
    window.addEventListener('resize', measure);
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(wrap);

    function solid() {
      var limit = hdr.classList.contains('hdr--overlay') ? 24 : 4;
      hdr.classList.toggle('is-solid', hdr.getBoundingClientRect().top <= 1 && window.scrollY > limit);
    }
    solid();
    window.addEventListener('scroll', solid, { passive: true });

    /* announcement slot: rotate, pause on hover */
    var ann = $$('.announce__item', wrap);
    if (ann.length > 1 && !reduce) {
      var ai = 0, hold = false, box = wrap.querySelector('.announce');
      var every = Number(box.getAttribute('data-interval') || 4) * 1000;
      box.addEventListener('mouseenter', function () { hold = true; });
      box.addEventListener('mouseleave', function () { hold = false; });
      box.addEventListener('focusin', function () { hold = true; });
      box.addEventListener('focusout', function () { hold = false; });
      setInterval(function () {
        if (hold || document.hidden) return;
        ann[ai].classList.remove('is-on');
        ann[ai].setAttribute('tabindex', '-1');
        ai = (ai + 1) % ann.length;
        ann[ai].classList.add('is-on');
        ann[ai].removeAttribute('tabindex');
      }, every);
    }

    /* ---- mega menu: 150ms hover intent, Esc, arrows, focus trap ---- */
    var nav = wrap.querySelector('.nav');
    var scrim = wrap.querySelector('.mega-scrim');
    var navBtns = $$('[data-mega]', wrap);
    var openBtn = null, openTimer = null, closeTimer = null;
    function warm() { $$('.mega img[loading="lazy"]', wrap).forEach(function (i) { i.loading = 'eager'; }); }
    if (nav) { nav.addEventListener('mouseenter', warm, { once: true }); nav.addEventListener('focusin', warm, { once: true }); }
    function panelOf(btn) { return document.getElementById(btn.getAttribute('aria-controls')); }
    function closeMega(returnFocus) {
      if (!openBtn) return;
      var p = panelOf(openBtn), b = openBtn;
      b.setAttribute('aria-expanded', 'false');
      p.classList.remove('is-open');
      setTimeout(function () { if (!p.classList.contains('is-open')) p.hidden = true; }, 200);
      hdr.classList.remove('is-open');
      if (scrim) { scrim.classList.remove('is-on'); setTimeout(function () { if (!openBtn) scrim.hidden = true; }, 200); }
      openBtn = null;
      if (returnFocus) b.focus();
    }
    V2.closeMega = closeMega;
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
      panelOf(btn).addEventListener('keydown', function (e) {
        if (e.key !== 'Tab') return;
        var f = focusables(panelOf(btn)); if (!f.length) return;
        if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); btn.focus(); }
        else if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); btn.focus(); }
      });
    });
    hdr.addEventListener('mouseleave', function () { clearTimeout(openTimer); closeTimer = setTimeout(function () { closeMega(false); }, 150); });
    hdr.addEventListener('mouseenter', function () { clearTimeout(closeTimer); });
    hdr.addEventListener('focusout', function (e) { if (e.relatedTarget && !hdr.contains(e.relatedTarget)) closeMega(false); });
    if (scrim) scrim.addEventListener('click', function () { closeMega(false); });
    $$('.nav__link', wrap).forEach(function (a) { a.addEventListener('mouseenter', function () { clearTimeout(openTimer); closeTimer = setTimeout(function () { closeMega(false); }, 150); }); });

    /* ---- brands A–Z filter ---- */
    $$('[data-az]', wrap).forEach(function (az) {
      var input = az.querySelector('[data-az-filter]'), none = az.querySelector('.az__none');
      input.addEventListener('input', function () {
        var q = input.value.trim().toLowerCase(), any = false;
        $$('.az__g', az).forEach(function (g) {
          var shown = 0;
          $$('li[data-name]', g).forEach(function (li) { var ok = !q || li.getAttribute('data-name').indexOf(q) > -1; li.hidden = !ok; if (ok) shown++; });
          g.hidden = !shown; if (shown) any = true;
        });
        none.hidden = any;
      });
      $$('.az__bar a', az).forEach(function (a) {
        a.addEventListener('click', function (e) { e.preventDefault(); var t = az.querySelector('[data-letter="' + a.getAttribute('data-to') + '"]'); if (t) t.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }); });
      });
    });

    /* ---- predictive search overlay (Shopify predictive search API) ---- */
    var srch = wrap.querySelector('.srch'), sq = srch && srch.querySelector('.srch__field input'), sScrim = wrap.querySelector('.srch-scrim');
    var sOpener = null, sCtl = null;
    var mm = wrap.querySelector('.mmenu'), mmBtn = wrap.querySelector('.hdr__menu'), mmStack = [];
    function runSearch() {
      var q = sq.value.trim(), empty = srch.querySelector('.srch__empty'), res = srch.querySelector('.srch__res');
      if (q.length < 2) { empty.hidden = false; res.hidden = true; return; }
      if (sCtl && sCtl.abort) sCtl.abort();
      sCtl = typeof AbortController === 'function' ? new AbortController() : null;
      var url = shopRoot + 'search/suggest.json?q=' + encodeURIComponent(q) +
        '&resources[type]=product,collection,article&resources[limit]=6&resources[options][unavailable_products]=last&resources[options][fields]=title,product_type,variants.title,vendor,tag';
      fetch(url, sCtl ? { signal: sCtl.signal } : {}).then(function (r) { return r.json(); }).then(function (j) {
        var R = (j.resources && j.resources.results) || {};
        var P = R.products || [], C = (R.collections || []).slice(0, 5), A = (R.articles || []).slice(0, 3);
        srch.querySelector('[data-r="p"]').innerHTML = P.length ? P.map(function (p) {
          var im = p.featured_image && p.featured_image.url || p.image;
          return '<li><a class="mini" href="' + esc(p.url) + '">' + (im ? '<img src="' + esc(sized(im, 160)) + '" alt="" width="64" height="64">' : '<span class="mini__ph"></span>') +
            '<span class="mini__t">' + esc(tidy(p.title, p.vendor)) + '</span><span class="mini__p">' + rs(Number(p.price)) + '</span></a></li>';
        }).join('') : '<li class="srch__nil">No products match “' + esc(q) + '”.</li>';
        srch.querySelector('[data-r="c"]').innerHTML = C.length ? C.map(function (c) {
          return '<li><a href="' + esc(c.url) + '">' + esc(c.title) + '</a></li>';
        }).join('') : '<li class="srch__nil">No collections.</li>';
        srch.querySelector('[data-r="a"]').innerHTML = A.length ? A.map(function (a) {
          var im = a.featured_image && a.featured_image.url || a.image;
          return '<li><a class="mini mini--art" href="' + esc(a.url) + '">' + (im ? '<img src="' + esc(sized(im, 160)) + '" alt="" width="64" height="64">' : '<span class="mini__ph"></span>') +
            '<span class="mini__t">' + esc(a.title) + '</span><span class="mini__p">Article</span></a></li>';
        }).join('') : '<li class="srch__nil">No articles.</li>';
        var all = srch.querySelector('.srch__all');
        all.href = shopRoot + 'search?q=' + encodeURIComponent(q);
        all.querySelector('span').textContent = 'View all results for “' + q + '”';
        empty.hidden = true; res.hidden = false;
      }).catch(function () {});
    }
    function openSearch(from) {
      if (!srch) return;
      sOpener = from || document.activeElement;
      closeMega(false);
      srch.hidden = false; if (sScrim) sScrim.hidden = false;
      requestAnimationFrame(function () { srch.classList.add('is-open'); if (sScrim) sScrim.classList.add('is-on'); });
      document.body.style.overflow = 'hidden';
      setTimeout(function () { sq.focus(); }, 60);
    }
    function closeSearch() {
      if (!srch || srch.hidden) return;
      srch.classList.remove('is-open'); if (sScrim) sScrim.classList.remove('is-on');
      setTimeout(function () { srch.hidden = true; if (sScrim) sScrim.hidden = true; }, 220);
      if (!mm || mm.hidden) document.body.style.overflow = '';
      if (sOpener && sOpener.focus) sOpener.focus();
    }
    if (srch) {
      $$('[data-open-search]', wrap).forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); openSearch(b); }); });
      var sT; sq.addEventListener('input', function () { clearTimeout(sT); sT = setTimeout(runSearch, 160); });
      srch.querySelector('.srch__close').addEventListener('click', closeSearch);
      if (sScrim) sScrim.addEventListener('click', closeSearch);
      $$('[data-q]', srch).forEach(function (c) { c.addEventListener('click', function () { sq.value = c.getAttribute('data-q'); runSearch(); sq.focus(); }); });
      srch.addEventListener('keydown', function (e) { trapTab(srch, e); });
    }

    /* ---- mobile drill-down ---- */
    function mmShow(id) {
      var cur = mmStack[mmStack.length - 1], next = document.getElementById(id);
      if (!next) return;
      if (cur) { cur.classList.remove('is-on'); cur.classList.add('is-behind'); cur.inert = true; }
      next.classList.remove('is-behind'); next.classList.add('is-on'); next.inert = false;
      next.querySelector('.mm__scroll').scrollTop = 0;
      mmStack.push(next);
      var f = next.querySelector('.mm__back'); if (f) setTimeout(function () { f.focus({ preventScroll: true }); }, 320);
    }
    function mmBack() {
      if (mmStack.length < 2) return;
      var cur = mmStack.pop(), prev = mmStack[mmStack.length - 1];
      cur.classList.remove('is-on'); cur.inert = true;
      prev.classList.remove('is-behind'); prev.classList.add('is-on'); prev.inert = false;
      var opener = prev.querySelector('[data-level="' + cur.id + '"]'); if (opener) setTimeout(function () { opener.focus({ preventScroll: true }); }, 320);
    }
    function openMenu() {
      mm.hidden = false;
      var first = mm.querySelector('.mm__level[data-root]');
      mmStack = [first];
      $$('.mm__level', mm).forEach(function (l) { var isRoot = l === first; l.classList.toggle('is-on', isRoot); l.classList.remove('is-behind'); l.inert = !isRoot; });
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
      $$('[data-level]', mm).forEach(function (b) { b.addEventListener('click', function () { mmShow(b.getAttribute('data-level')); }); });
      $$('.mm__back', mm).forEach(function (b) { b.addEventListener('click', mmBack); });
      $$('.mm__tabs', mm).forEach(function (tabs) {
        var lvl = tabs.closest('.mm__level');
        $$('[data-tab]', tabs).forEach(function (t) {
          t.addEventListener('click', function () {
            $$('[data-tab]', tabs).forEach(function (x) { x.setAttribute('aria-selected', String(x === t)); });
            $$('[data-pane]', lvl).forEach(function (p) { p.hidden = p.getAttribute('data-pane') !== t.getAttribute('data-tab'); });
          });
        });
      });
      mm.addEventListener('keydown', function (e) { trapTab(mm, e); });
      $$('[data-open-search]', mm).forEach(function (b) { b.addEventListener('click', function () { openSearch(b); }); });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && srch && srch.hidden && !/input|textarea|select/i.test(document.activeElement.tagName) && !document.activeElement.isContentEditable) { e.preventDefault(); openSearch(); return; }
      if (e.key !== 'Escape') return;
      if (srch && !srch.hidden) { closeSearch(); return; }
      if (openBtn) { closeMega(true); return; }
      if (mm && !mm.hidden) { if (mmStack.length > 1) mmBack(); else closeMenu(); }
    });
    /* theme editor: selecting a mega block opens its panel */
    wrap.addEventListener('shopify:block:select', function (e) {
      var b = wrap.querySelector('[aria-controls="mega-' + e.detail.blockId + '"]');
      if (b && window.matchMedia('(min-width: 1024px)').matches) openMega(b);
    });
    wrap.addEventListener('shopify:block:deselect', function () { closeMega(false); });
  });

  /* ================= full-screen carousels (hero + SiS) ================= */
  on('carousel', function (hero) {
    var stage = hero.querySelector('.hero__stage');
    var slides = $$('.hero__slide', hero);
    var segs = $$('.seg', hero);
    if (!slides.length) return;
    var i = 0;
    var autoplay = hero.getAttribute('data-autoplay') !== 'false';
    function show(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) {
        var isOn = k === i;
        s.classList.toggle('is-on', isOn);
        s.setAttribute('aria-hidden', String(!isOn));
        if (isOn) s.removeAttribute('inert'); else s.setAttribute('inert', '');
        if (isOn) $$('img[loading="lazy"]', s).forEach(function (im) { im.loading = 'eager'; });
      });
      var nx = slides[(i + 1) % slides.length];
      $$('img[loading="lazy"]', nx).forEach(function (im) { im.loading = 'eager'; });
      segs.forEach(function (g, k) {
        g.classList.remove('is-on');
        g.classList.toggle('is-done', k < i);
        if (k === i) { void g.offsetWidth; g.classList.add('is-on'); g.setAttribute('aria-current', 'true'); } else g.removeAttribute('aria-current');
      });
      sync();
    }
    V2.carouselShow = V2.carouselShow || new WeakMap();
    V2.carouselShow.set(hero, show);
    segs.forEach(function (g, k) {
      g.addEventListener('click', function () { show(k); });
      g.querySelector('span').addEventListener('animationend', function () { if (k === i && !reduce && autoplay) show(i + 1); });
    });
    $$('.hero__arrow', hero).forEach(function (a) { a.addEventListener('click', function () { show(i + Number(a.getAttribute('data-dir'))); }); });
    var hold = { hover: false, focus: false, hidden: false, off: false, editor: false };
    function sync() {
      var p = reduce || !autoplay || hold.hover || hold.focus || hold.hidden || hold.off || hold.editor;
      hero.classList.toggle('is-paused', p);
      var v = hero.querySelector('.hero__slide.is-on video');
      $$('video', hero).forEach(function (x) { if (x !== v || p) x.pause(); });
      if (v && !(reduce || hold.hidden || hold.off)) {
        if (!v.getAttribute('src') && v.dataset.src) { v.src = v.dataset.src; }
        var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
      }
    }
    hero.addEventListener('mouseenter', function () { hold.hover = true; sync(); });
    hero.addEventListener('mouseleave', function () { hold.hover = false; sync(); });
    hero.addEventListener('focusin', function () { hold.focus = true; sync(); });
    hero.addEventListener('focusout', function (e) { if (!hero.contains(e.relatedTarget)) { hold.focus = false; sync(); } });
    document.addEventListener('visibilitychange', function () { hold.hidden = document.hidden; sync(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { hold.off = en[0].intersectionRatio < 0.35; sync(); }, { threshold: [0, 0.35, 0.6, 1] }).observe(hero);
    }
    $$('video[data-poster-m]', hero).forEach(function (v) { if (window.matchMedia('(max-width: 767px)').matches && v.getAttribute('data-poster-m')) v.poster = v.getAttribute('data-poster-m'); });
    hero.addEventListener('keydown', function (e) {
      if (e.target.closest('input, textarea')) return;
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
    /* theme editor: jump to the selected slide and hold it */
    hero.addEventListener('shopify:block:select', function (e) {
      var k = slides.findIndex(function (s) { return s.getAttribute('data-block') === e.detail.blockId; });
      hold.editor = true;
      if (k > -1) show(k);
    });
    hero.addEventListener('shopify:block:deselect', function () { hold.editor = false; sync(); });
    show(0);
  });

  /* ================= tabs (shop by goal, bestsellers) ================= */
  on('tabs', function (box) {
    var tabs = $$('[role="tab"]', box);
    function pick(t, focus) {
      tabs.forEach(function (x) {
        var isOn = x === t;
        x.setAttribute('aria-selected', String(isOn));
        x.tabIndex = isOn ? 0 : -1;
        var p = document.getElementById(x.getAttribute('aria-controls'));
        if (p) p.hidden = !isOn;
      });
      if (focus) t.focus();
    }
    tabs.forEach(function (t, k) {
      t.tabIndex = t.getAttribute('aria-selected') === 'true' ? 0 : -1;
      t.addEventListener('click', function () { pick(t); });
      t.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        pick(tabs[(k + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length], true);
      });
    });
  });


  /* ================= shop the look: hotspots (prototype logic) ================= */
  on('hotspots', function (hs) {
    var openDot = null;
    function hot(i, isOn) { $$('[data-spot="' + i + '"]', hs).forEach(function (el) { el.classList.toggle('is-hot', isOn); }); }
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
      if (window.matchMedia('(min-width: 768px)').matches) {
        var x = parseFloat(dot.style.left), y = parseFloat(dot.style.top);
        pop.style.left = 'clamp(8px, calc(' + x + '% - 130px), calc(100% - 268px))';
        pop.style.right = 'auto';
        pop.style.top = y > 70 ? 'calc(' + y + '% - 150px)' : 'calc(' + y + '% + 30px)';
      }
      dot.setAttribute('aria-expanded', 'true');
      hot(i, true);
      openDot = dot;
      var btn = pop.querySelector('button.v-btn');
      if (btn) btn.focus({ preventScroll: true });
    }
    $$('.hs__dot', hs).forEach(function (dot) {
      dot.addEventListener('click', function (e) { e.stopPropagation(); if (openDot === dot) close(); else open(dot); });
    });
    $$('.hs__close', hs).forEach(function (c) { c.addEventListener('click', function () { var d = openDot; close(); if (d) d.focus(); }); });
    $$('.hs__item', hs).forEach(function (item) {
      var i = item.getAttribute('data-spot');
      item.addEventListener('mouseenter', function () { hot(i, true); });
      item.addEventListener('mouseleave', function () { if (!openDot || openDot.getAttribute('data-spot') !== i) hot(i, false); });
    });
    document.addEventListener('click', function (e) { if (openDot && !e.target.closest('.hs__pop') && !e.target.closest('quick-buy-drawer')) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && openDot) { var d = openDot; close(); d.focus(); } });
  });

  /* ================= boot ================= */
  V2.on = on;
  V2.run = run;
  function boot() { run(document); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  document.addEventListener('shopify:section:load', function (e) { run(e.target); });
})();
