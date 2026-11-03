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

  /* ---------- product card packshots ----------
     SNH's packshots carry a baked-in orange frame with the logo on its top edge, at different sizes per image. Find
     the frame from the pixels and crop just inside it; then lift grey studio backdrops to white so every pack blends
     into the cream tile (the img uses mix-blend multiply). Runs once per image on load. */
  var liftCanvas = null;
  function lift(img) {
    if (img.__v2lift || !img.complete || !img.naturalWidth) return;
    img.__v2lift = true;
    try {
      var N = Math.min(400, img.naturalWidth);
      liftCanvas = liftCanvas || document.createElement('canvas');
      liftCanvas.width = liftCanvas.height = N;
      var c = liftCanvas.getContext('2d', { willReadFrequently: true });
      c.clearRect(0, 0, N, N);
      c.drawImage(img, 0, 0, N, N);
      var d = c.getImageData(0, 0, N, N).data;
      var or = function (x, y) { var i = (y * N + x) * 4, r = d[i], g = d[i + 1], b = d[i + 2]; return d[i + 3] > 180 && r > 170 && r - b > 90 && r - g > 50; };
      var lum = function (x, y) { var i = (y * N + x) * 4; return d[i + 3] < 180 ? 255 : (d[i] + d[i + 1] + d[i + 2]) / 3; };
      // walk in from an edge to the frame, then through it; returns the first pixel inside the frame or -1
      var walk = function (from, to, step, at) { for (var k = from; k !== to; k += step) { if (at(k)) { while (k !== to && at(k)) k += step; return k; } } return -1; };
      var mid = N >> 1, q = Math.round(N * .3), half = Math.round(N * .45);
      var square = Math.abs(img.naturalWidth / img.naturalHeight - 1) < .04;
      var l = square ? walk(0, half, 1, function (x) { return or(x, mid); }) : -1;
      var r = square ? walk(N - 1, N - half, -1, function (x) { return or(x, mid); }) : -1;
      var t = square ? walk(0, half, 1, function (y) { return or(q, y); }) : -1;
      var b = square ? walk(N - 1, N - half, -1, function (y) { return or(q, y); }) : -1;
      var x0 = .03 * N, y0 = .03 * N, x1 = .97 * N, y1 = .97 * N;
      if (l > 0 && r > 0 && t > 0 && b > 0 && r - l > N * .4 && b - t > N * .4) {
        // the SNH logo hangs below the top edge on the right: find the lowest row that still has orange there
        var logo = t;
        for (var y = t; y < t + N * .12; y++) { var hit = false; for (var x = Math.round(l + (r - l) * .55); x < r; x++) { var k = (y * N + x) * 4; if (d[k] > 150 && d[k] - d[k + 2] > 60) { hit = true; break; } } if (hit) logo = y + 1; }
        var pad = N * .03;
        x0 = l + pad; x1 = r - pad; y0 = Math.max(t, logo) + pad; y1 = b - pad;
      }
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      var e = Math.round(N * .02), pts = [[x0 + e, y0 + e], [x0 + e, y1 - e], [x1 - e, y1 - e]], br = 0, bgc = 0, bb = 0, L = 0;
      pts.forEach(function (pt) { var i = (pt[1] * N + pt[0]) * 4; br += d[i] / 3; bgc += d[i + 1] / 3; bb += d[i + 2] / 3; L += lum(pt[0], pt[1]) / 3; });
      var lf = 1;
      if (L < 252 && L > 150) { lf = Math.min(1.36, 256 / L); img.style.setProperty('--lift', lf.toFixed(3)); }
      br = Math.min(255, br * lf); bgc = Math.min(255, bgc * lf); bb = Math.min(255, bb * lf);
      // the pack itself: bounding box of pixels that differ from the backdrop, so every pack sits at the same size
      // count differing pixels per column and row; thin full-width bands (studio floor lines, shadows) fall below
      // the density cut, the pack does not
      var cols = new Array(N).fill(0), rows = new Array(N).fill(0), st = Math.max(1, Math.round(N / 200));
      for (var yy = y0; yy <= y1; yy += st) for (var xx = x0; xx <= x1; xx += st) {
        var k = (yy * N + xx) * 4;
        if (d[k + 3] > 120 && Math.abs(Math.min(255, d[k] * lf) - br) + Math.abs(Math.min(255, d[k + 1] * lf) - bgc) + Math.abs(Math.min(255, d[k + 2] * lf) - bb) > 48) { cols[xx]++; rows[yy]++; }
      }
      var span = function (a) { var m = Math.max.apply(null, a), lo = -1, hi = -1; for (var q = 0; q < N; q++) if (a[q] >= m * .22 && a[q] > 1) { if (lo < 0) lo = q; hi = q; } return [lo, hi]; };
      var sx = span(cols), sy = span(rows), bx0 = sx[0], bx1 = sx[1], by0 = sy[0], by1 = sy[1];
      if (bx0 < 0 || by0 < 0) { bx0 = x0; bx1 = x1; by0 = y0; by1 = y1; }
      var fill = .74, sc, cx, cy;
      if (bx1 - bx0 > N * .08 && by1 - by0 > N * .08) {
        sc = fill * N / Math.max(bx1 - bx0, by1 - by0); cx = (bx0 + bx1) / 2; cy = (by0 + by1) / 2;
        // never push past the crop box (frame) or blow a small render up too far
        sc = Math.max(sc, N / Math.max(x1 - x0, y1 - y0) * fill); sc = Math.min(sc, 2.2);
      } else { sc = fill * N / Math.max(x1 - x0, y1 - y0); cx = (x0 + x1) / 2; cy = (y0 + y1) / 2; }
      img.style.transform = 'scale(' + sc.toFixed(3) + ') translate(' + (50 - cx / N * 100).toFixed(2) + '%, ' + (50 - cy / N * 100).toFixed(2) + '%)';
      // the frame sits outside the crop box: keep it out of view when the scaled image overflows the tile
      var X0 = x0 / N * 100, X1 = x1 / N * 100, Y0 = y0 / N * 100, Y1 = y1 / N * 100;
      if (lf > 1.02) {
        // studio backdrop: fade the crop edges so the lifted floor and vignette melt into the tile
        // the fade stays between the crop edge and the pack, never over the pack
        var f = 7, P = function (v) { return (v / N * 100); };
        var fx0 = Math.min(X0 + f, P(bx0)), fx1 = Math.max(X1 - f, P(bx1)), fy0 = Math.min(Y0 + f, P(by0)), fy1 = Math.max(Y1 - f, P(by1));
        var m = 'linear-gradient(to right, transparent ' + X0.toFixed(1) + '%, #000 ' + fx0.toFixed(1) + '%, #000 ' + fx1.toFixed(1) + '%, transparent ' + X1.toFixed(1) + '%), linear-gradient(to bottom, transparent ' + Y0.toFixed(1) + '%, #000 ' + fy0.toFixed(1) + '%, #000 ' + fy1.toFixed(1) + '%, transparent ' + Y1.toFixed(1) + '%)';
        img.style.webkitMaskImage = img.style.maskImage = m;
        img.style.webkitMaskComposite = 'source-in'; img.style.maskComposite = 'intersect';
      } else {
        img.style.clipPath = 'inset(' + Y0.toFixed(1) + '% ' + (100 - X1).toFixed(1) + '% ' + (100 - Y1).toFixed(1) + '% ' + X0.toFixed(1) + '%)';
      }
    } catch (err) { /* unreadable image: leave it as is */ }
    img.classList.add('is-ready');
  }
  root.classList.add('v-lift');
  // Round 12: the pixel work runs in idle time, a few images per slice, so it no longer competes with the first render
  // (it was a large part of the collection page's LCP render delay on a 4x slower CPU)
  var liftQ = [], liftOn = false, ric = window.requestIdleCallback || function (f) { return setTimeout(function () { f({ timeRemaining: function () { return 8; } }); }, 16); };
  function liftLater(im) { if (liftQ.indexOf(im) < 0) liftQ.push(im); if (liftOn) return; liftOn = true; ric(function run(dl) { while (liftQ.length && dl.timeRemaining() > 4) lift(liftQ.shift()); if (liftQ.length) ric(run, { timeout: 300 }); else liftOn = false; }, { timeout: 300 }); }
  document.addEventListener('load', function (e) { if (e.target.hasAttribute && e.target.hasAttribute('data-v2-lift')) liftLater(e.target); }, true);
  document.addEventListener('error', function (e) { if (e.target.hasAttribute && e.target.hasAttribute('data-v2-lift')) e.target.classList.add('is-ready'); }, true);
  function liftAll(scope) { (scope || document).querySelectorAll('img[data-v2-lift]').forEach(liftLater); }
  liftAll();
  document.addEventListener('DOMContentLoaded', function () { liftAll(); });

  /* ---------- brand logo marks ([data-mark]): trim each logo file to its mark and size it from CSS
     (--mh mark height, --mw max width), so every tile reads the same whatever padding the file has ---------- */
  function fitMark(box) {
    var im = box.querySelector('img'); if (!im || !im.complete || !im.naturalWidth || box.classList.contains('is-fit')) return;
    var cs = getComputedStyle(box), H = parseFloat(cs.getPropertyValue('--mh')) || 32, MW = parseFloat(cs.getPropertyValue('--mw')) || H * 3.4;
    var nw = im.naturalWidth, nh = im.naturalHeight, bx = [0, 0, 1, 1];
    try {
      var N = 160, c = document.createElement('canvas'); c.width = N; c.height = Math.max(1, Math.round(N * nh / nw));
      var g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0, c.width, c.height);
      var d = g.getImageData(0, 0, c.width, c.height).data, W = c.width, Hh = c.height;
      var r0 = d[0], g0 = d[1], b0 = d[2], a0 = d[3], x0 = W, y0 = Hh, x1 = -1, y1 = -1;
      for (var y = 0; y < Hh; y++) for (var x = 0; x < W; x++) { var k = (y * W + x) * 4; var diff = a0 < 30 ? (d[k + 3] > 60 ? 255 : 0) : Math.abs(d[k] - r0) + Math.abs(d[k + 1] - g0) + Math.abs(d[k + 2] - b0); if (diff > 70) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
      if (x1 > x0 && y1 > y0) bx = [x0 / W, y0 / Hh, (x1 + 1) / W, (y1 + 1) / Hh];
    } catch (e) {}
    var asp = ((bx[2] - bx[0]) * nw) / ((bx[3] - bx[1]) * nh), mh = H, mw = mh * asp;
    if (mw > MW) { mw = MW; mh = mw / asp; }
    var iw = mw / (bx[2] - bx[0]), ih = mh / (bx[3] - bx[1]);
    box.style.setProperty('--lw', mw.toFixed(1) + 'px'); box.style.setProperty('--lh', H + 'px');
    box.style.setProperty('--liw', iw.toFixed(1) + 'px'); box.style.setProperty('--lih', ih.toFixed(1) + 'px');
    box.style.setProperty('--ll', (-bx[0] * iw).toFixed(1) + 'px'); box.style.setProperty('--lt', ((H - mh) / 2 - bx[1] * ih).toFixed(1) + 'px');
    box.classList.add('is-fit');
  }
  document.addEventListener('load', function (e) { var b = e.target.parentElement; if (b && b.hasAttribute && b.hasAttribute('data-mark')) fitMark(b); }, true);
  document.addEventListener('DOMContentLoaded', function () { $$('[data-mark]').forEach(fitMark); });
  $$('[data-mark]').forEach(fitMark);
  V2.fitMark = fitMark;

  /* ---------- reveal on scroll (footer mark, .v-reveal) ---------- */
  var io = root.classList.contains('v-js') ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px' }) : null;
  on('reveal', function (el) { if (io) io.observe(el); else el.classList.add('is-in'); });

  /* ---------- Round 16: the SNH Elite flip card ([data-elc-card]): click / tap / Enter / Space turns it over (CSS 3D,
     a crossfade with reduced motion); the second one turns it back. Links on the back work and don't flip it. ---------- */
  function elcFlip(c) {
    var on = !c.classList.contains('is-flipped');
    c.classList.toggle('is-flipped', on);
    c.setAttribute('aria-pressed', on ? 'true' : 'false');
    var f = c.querySelector('.elc__front'), k = c.querySelector('.elc__back'), l = c.querySelector('.elc__link');
    if (f) f.setAttribute('aria-hidden', on ? 'true' : 'false');
    if (k) k.setAttribute('aria-hidden', on ? 'false' : 'true');
    if (l) l.tabIndex = on ? 0 : -1;
    var w = c.closest('.elc-wrap'), h = w && w.querySelector('[data-elc-hint] span');
    if (h) h.textContent = on ? 'Tap to flip back' : 'Tap to flip';
  }
  document.addEventListener('click', function (e) {
    var c = e.target.closest && e.target.closest('[data-elc-card]');
    if (!c || e.target.closest('a')) return;
    elcFlip(c);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var c = e.target.closest && e.target.closest('[data-elc-card]');
    if (!c || e.target !== c) return;
    e.preventDefault(); elcFlip(c);
  });

  /* ---------- Round 13: product cards never cut a word. Names (2 lines) and brands that overflow lose whole words
     and end in "…"; a tight brand row first drops the review count. Re-run on resize and when cards arrive. ---------- */
  function fitCard(c) {
    var top = c.querySelector('.pc__top'), br = c.querySelector('.pc__brand');
    c.classList.remove('pc--tight');
    [c.querySelector('.pc__name a'), br].forEach(function (el) {
      if (!el) return;
      if (el.dataset.full == null) el.dataset.full = el.textContent.trim(); else el.textContent = el.dataset.full;
    });
    if (br && top && br.scrollWidth > br.clientWidth + 1) c.classList.add('pc--tight');
    [[c.querySelector('.pc__name a'), c.querySelector('.pc__name')], [br, br]].forEach(function (x) {
      var el = x[0], box = x[1]; if (!el || !box) return;
      var over = function () { return box.scrollHeight > box.clientHeight + 2 || box.scrollWidth > box.clientWidth + 1; };
      if (!over()) return;
      var words = el.dataset.full.split(/\s+/);
      while (words.length > 1 && over()) { words.pop(); el.textContent = words.join(' ').replace(/[\s,|–\-:·]+$/, '') + '…'; }
    });
  }
  var fitAll = function () { $$('.pc').forEach(function (c) { if (c.offsetParent) fitCard(c); }); };
  var fitT;
  var fitSoon = function () { clearTimeout(fitT); fitT = setTimeout(fitAll, 120); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fitSoon); else fitSoon();
  window.addEventListener('resize', fitSoon);
  if ('MutationObserver' in window) new MutationObserver(function (ms) { if (ms.some(function (m) { return [].some.call(m.addedNodes, function (n) { return n.nodeType === 1 && (n.matches('.pc') || n.querySelector && n.querySelector('.pc')); }); })) fitSoon(); }).observe(document.documentElement, { childList: true, subtree: true });

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
      var limit = hdr.classList.contains('hdr--overlay') ? 24 : 4, top = hdr.getBoundingClientRect().top;
      /* Round 13: if sticky ever fails (a clipping ancestor, a browser quirk) and the bar scrolls off, pin it fixed
         until the page is back at the top, so the menu and search never disappear */
      var bars = parseFloat(root.style.getPropertyValue('--v-bars')) || 0;
      if (!section.classList.contains('is-pinned') && top < -1 && window.scrollY > bars) section.classList.add('is-pinned');
      else if (section.classList.contains('is-pinned') && window.scrollY <= bars) section.classList.remove('is-pinned');
      hdr.classList.toggle('is-solid', (top <= 1 || section.classList.contains('is-pinned')) && window.scrollY > limit);
    }
    solid();
    window.addEventListener('scroll', solid, { passive: true });

    /* announcement slot: rotate, pause on hover. Round 12: the items are re-read every tick (assets/snh-campaigns.js
       hides out-of-schedule ones and adds campaign items). The bar keeps the colour of the top live item (a campaign when
       one is live) for the whole rotation, and the timer restarts on each sync, so the campaign gets a full slot even on
       pages where the header script ran seconds before the campaigns (home, product) */
    var box = wrap.querySelector('.announce');
    if (box) {
      var hold = false, every = Number(box.getAttribute('data-interval') || 4) * 1000;
      var live = function () { return $$('.announce__item:not([hidden])', box); };
      box.addEventListener('mouseenter', function () { hold = true; });
      box.addEventListener('mouseleave', function () { hold = false; });
      box.addEventListener('focusin', function () { hold = true; });
      box.addEventListener('focusout', function () { hold = false; });
      var showAnn = function (it) { $$('.announce__item', box).forEach(function (x) { var on = x === it; x.classList.toggle('is-on', on); if (on) x.removeAttribute('tabindex'); else x.setAttribute('tabindex', '-1'); }); };
      var timer = null;
      var tick = function () {
        var l = live(); if (hold || document.hidden || l.length < 2) return;
        var i = l.indexOf(l.filter(function (x) { return x.classList.contains('is-on'); })[0]);
        showAnn(l[(i + 1) % l.length]);
      };
      var syncAnn = function () {   // highest-priority live item first; its colour is the bar's
        var l = live(); box.hidden = !l.length; showAnn(l[0]);
        if (l[0]) box.setAttribute('data-tone', l[0].getAttribute('data-tone') || 'orange');
        if (timer) clearInterval(timer);
        if (!reduce) timer = setInterval(tick, every);
      };
      document.addEventListener('snh:announce', syncAnn);
      syncAnn();
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

    /* ---- brands panel: live filter, letter jumps, hover preview of the brand's top products ---- */
    $$('[data-az]', wrap).forEach(function (az) {
      var input = az.querySelector('[data-az-filter]'), none = az.querySelector('.az__none'), pv = az.querySelector('[data-az-pv]');
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
        a.addEventListener('click', function (e) {
          e.preventDefault();
          var t = az.querySelector('.az__g[data-letter="' + a.getAttribute('data-to') + '"]'); if (!t) return;
          t.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
          t.classList.remove('is-flash'); void t.offsetWidth; t.classList.add('is-flash');
          var first = t.querySelector('a'); if (first) first.focus({ preventScroll: true });
        });
      });
      if (!pv) return;
      var cache = {}, cur = '', timer = null;
      var money = function (v) { var n = Math.round(parseFloat(String(v).replace(/[^\d.]/g, '')) || 0); return 'Rs ' + n.toLocaleString('en-US'); };
      var img = function (u, w) { if (!u) return ''; return u + (u.indexOf('?') > -1 ? '&' : '?') + 'width=' + w; };
      function load(a) {
        var name = a.getAttribute('data-brand'), h = a.getAttribute('data-h') || '', v = a.getAttribute('data-v') || '';
        if (cache[name]) return Promise.resolve(cache[name]);
        var url = (h && !v) ? shopRoot + 'collections/' + h + '/products.json?limit=2'
          : shopRoot + 'search/suggest.json?q=' + encodeURIComponent(v || name) + '&resources[type]=product&resources[limit]=10&resources[options][fields]=vendor';
        var want = (v || '').toLowerCase();
        return fetch(url).then(function (r) { return r.json(); }).then(function (j) {
          var list = j.products || (j.resources && j.resources.results && j.resources.results.products) || [];
          // search is fuzzy: keep only this vendor's products
          if (want) list = list.filter(function (p) { return String(p.vendor || '').toLowerCase() === want; });
          var items = list.slice(0, 2).map(function (p) {
            var im = p.images && p.images[0] ? (p.images[0].src || p.images[0]) : (p.featured_image && p.featured_image.url) || p.image || '';
            var price = p.variants && p.variants[0] ? p.variants[0].price : p.price;
            return { t: p.title, u: p.url || (shopRoot + 'products/' + p.handle), im: im, pr: price };
          });
          cache[name] = { name: name, href: a.getAttribute('href'), items: items };
          return cache[name];
        }).catch(function () { return { name: name, href: a.getAttribute('href'), items: [] }; });
      }
      function show(a) {
        var name = a.getAttribute('data-brand'); if (name === cur) return; cur = name;
        pv.classList.add('is-loading');
        load(a).then(function (d) {
          if (cur !== d.name) return;
          pv.innerHTML = '<p class="mz__h">' + d.name.replace(/</g, '&lt;') + ' bestsellers</p>' +
            (d.items.length ? '<ul class="az__pvl">' + d.items.map(function (it) {
              return '<li><a href="' + it.u + '"><span class="az__pvi">' + (it.im ? '<img src="' + img(it.im, 200) + '" alt="" width="100" height="100" loading="lazy">' : '') + '</span><span class="az__pvt">' + it.t.replace(/</g, '&lt;') + '</span><span class="az__pvp">' + money(it.pr) + '</span></a></li>';
            }).join('') + '</ul>' : '') +
            '<a class="v-btn v-btn--ink v-btn--sm az__pvall" href="' + d.href + '"><span>Shop all ' + d.name.replace(/</g, '&lt;') + '</span></a>';
          pv.classList.remove('is-loading');
        });
      }
      $$('[data-brand]', az).forEach(function (a) {
        a.addEventListener('mouseenter', function () { if (!matchMedia('(hover: hover) and (min-width: 1024px)').matches) return; clearTimeout(timer); timer = setTimeout(function () { show(a); }, 90); });
        a.addEventListener('focus', function () { if (matchMedia('(min-width: 1024px)').matches) show(a); });
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

    /* ---- account panel (R7): right-side sheet, full height on phones ---- */
    var acp = wrap.querySelector('.acp:not(.acp--static)'), acpScrim = wrap.querySelector('.acp-scrim'), acpOpener = null;
    function openAcp(from) {
      if (!acp) return;
      acpOpener = from || document.activeElement;
      closeMega(false);
      acp.hidden = false; if (acpScrim) acpScrim.hidden = false;
      requestAnimationFrame(function () { acp.classList.add('is-open'); if (acpScrim) acpScrim.classList.add('is-on'); });
      $$('[data-acp-open]', wrap).forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
      document.body.style.overflow = 'hidden';
      setTimeout(function () { var c = acp.querySelector('.acp__close'); if (c) c.focus({ preventScroll: true }); }, 60);
    }
    function closeAcp() {
      if (!acp || acp.hidden) return;
      acp.classList.remove('is-open'); if (acpScrim) acpScrim.classList.remove('is-on');
      $$('[data-acp-open]', wrap).forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
      setTimeout(function () { acp.hidden = true; if (acpScrim) acpScrim.hidden = true; }, 320);
      document.body.style.overflow = '';
      if (acpOpener && acpOpener.focus && acpOpener.offsetParent !== null) acpOpener.focus();
    }
    // the cart footer and the pre-checkout modal ask for it ("Sign in to earn X points")
    document.addEventListener('snh:account-open', function (e) { if (acp) openAcp(e.detail && e.detail.from); else location.href = (window.Shopify && Shopify.routes ? Shopify.routes.root : '/') + 'account/login'; });
    if (acp) {
      $$('[data-acp-open]', wrap).forEach(function (b) {
        b.setAttribute('aria-expanded', 'false');
        b.addEventListener('click', function (e) {
          e.preventDefault();
          if (mm && !mm.hidden) { mm.classList.remove('is-open'); mmBtn.setAttribute('aria-expanded', 'false'); setTimeout(function () { mm.hidden = true; }, 320); openAcp(mmBtn); return; }
          openAcp(b);
        });
      });
      $$('[data-acp-close]', wrap).forEach(function (b) { b.addEventListener('click', closeAcp); });
      acp.addEventListener('keydown', function (e) { trapTab(acp, e); });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && srch && srch.hidden && !/input|textarea|select/i.test(document.activeElement.tagName) && !document.activeElement.isContentEditable) { e.preventDefault(); openSearch(); return; }
      if (e.key !== 'Escape') return;
      if (acp && !acp.hidden) { closeAcp(); return; }
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
    // attach a slide's deferred image sources (data-src / data-srcset, see sections/snh-hero-slider)
    function wake(sl) {
      $$('[data-srcset]', sl).forEach(function (x) { x.setAttribute('srcset', x.getAttribute('data-srcset')); x.removeAttribute('data-srcset'); });
      $$('img[data-src]', sl).forEach(function (x) { x.src = x.getAttribute('data-src'); x.removeAttribute('data-src'); x.loading = 'eager'; });
    }
    function show(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) {
        var isOn = k === i;
        s.classList.toggle('is-on', isOn);
        s.setAttribute('aria-hidden', String(!isOn));
        if (isOn) s.removeAttribute('inert'); else s.setAttribute('inert', '');
        if (isOn) wake(s);
      });
      var nx = slides[(i + 1) % slides.length];
      if (!hold.idle) wake(nx);   // Round 12: not before the first interaction
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
    // Round 12: the slides wait for the shopper's first interaction (scroll, tap, key, pointer), so slide 2 neither
    // downloads nor paints during page load (it was being counted as the LCP, 31.8s on slow 4G)
    // Round 13: 'off' until the observer has seen the section, so a video slide far down the page (SiS, 3 MB) doesn't
    // attach its source during page load
    var hold = { hover: false, focus: false, hidden: false, off: 'IntersectionObserver' in window, editor: false, idle: !window.Shopify || !Shopify.designMode };
    (function () { var ev = ['pointerdown', 'keydown', 'touchstart', 'scroll', 'mousemove']; function go() { if (!hold.idle) return; hold.idle = false; ev.forEach(function (e) { removeEventListener(e, go); }); wake(slides[(i + 1) % slides.length]); sync(); } ev.forEach(function (e) { addEventListener(e, go, { passive: true }); }); })();
    function sync() {
      var p = reduce || !autoplay || hold.hover || hold.focus || hold.hidden || hold.off || hold.editor || hold.idle;
      hero.classList.toggle('is-paused', p);
      var v = hero.querySelector('.hero__slide.is-on video');
      $$('video', hero).forEach(function (x) { if (x !== v || p) x.pause(); });
      if (v && !(reduce || hold.hidden || hold.off)) {
        if (!v.getAttribute('src') && v.dataset.src) { v.src = v.dataset.src; }
        v.muted = true; v.defaultMuted = true; v.playsInline = true;   // iOS only autoplays a video it knows is muted
        var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
      }
    }
    hero.addEventListener('mouseenter', function () { hold.hover = true; sync(); });
    hero.addEventListener('mouseleave', function () { hold.hover = false; sync(); });
    hero.addEventListener('focusin', function () { hold.focus = true; sync(); });
    hero.addEventListener('focusout', function (e) { if (!hero.contains(e.relatedTarget)) { hold.focus = false; sync(); } });
    document.addEventListener('visibilitychange', function () { hold.hidden = document.hidden; sync(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { hold.off = en[0].intersectionRatio < 0.3; sync(); }, { threshold: [0, 0.3, 0.6, 1] }).observe(hero);
    }
    // posters are set only when the section is near (Round 11: the SiS poster was ~140 KB on every page load)
    var posterIO = 'IntersectionObserver' in window ? new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (!e.isIntersecting) return; $$('video[data-poster]', hero).forEach(function (v) { var m = v.getAttribute('data-poster-m'); v.poster = m && window.matchMedia('(max-width: 767px)').matches ? m : v.getAttribute('data-poster'); }); posterIO.disconnect(); });
    }, { rootMargin: '800px 0px' }) : null;
    if (posterIO) posterIO.observe(hero); else $$('video[data-poster]', hero).forEach(function (v) { v.poster = v.getAttribute('data-poster'); });
    // reduced motion: the poster only (cancel the autoplay attribute and drop any started playback)
    if (reduce) $$('video', hero).forEach(function (v) { v.autoplay = false; v.removeAttribute('autoplay'); v.pause(); v.preload = 'none'; try { v.load(); } catch (e) {} });
    
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


  /* sticky add to cart: visible only once the main buy button has scrolled above the viewport, and never while the
     footer is on screen. Mirrors Impact's product-quick-add rule on scroll, so it holds after variant re-renders. */
  var qaTick = false;
  function qaSync() {
    qaTick = false;
    var ft = document.querySelector('.footer');
    document.querySelectorAll('product-quick-add').forEach(function (q) {
      var f = document.getElementById(q.getAttribute('form')), btn = f && (f.querySelector('buy-buttons') || f);
      var anchor = document.querySelector('.product-info buy-buttons') || btn;
      if (!anchor) return;
      var passed = anchor.getBoundingClientRect().bottom < 0;
      var foot = ft && ft.getBoundingClientRect().top < innerHeight;
      var on = passed && !foot;
      if (q.classList.contains('is-visible') !== on) q.classList.toggle('is-visible', on);
      if (document.body.classList.contains('has-qa') !== on) document.body.classList.toggle('has-qa', on);
    });
  }
  addEventListener('scroll', function () { if (!qaTick) { qaTick = true; requestAnimationFrame(qaSync); } }, { passive: true });
  addEventListener('resize', qaSync);

  /* collection filter bar: once you scroll past it, the sticky bar condenses to the controls row (find, goals and
     brands fold away). The folded height moves to margin-bottom, so the grid never jumps. */
  (function () {
    var form = document.querySelector('form.snh-bar-form'); if (!form) return;
    var bar = form.querySelector('.snh-bar'), parts = '.snh-find, .snh-goals, .snh-brands, .snh-nomatch, .snh-recs';
    var on = false, tick = false, start = 0;
    function measure() { start = form.getBoundingClientRect().top + scrollY; }
    function sync() {
      tick = false;
      var past = scrollY > start + 160;
      if (past === on) return;
      on = past;
      if (on) {
        var h = 0; $$(parts, bar).forEach(function (el) { if (el.offsetParent) h += el.getBoundingClientRect().height; });
        form.classList.add('is-condensed'); form.style.marginBottom = h + 'px';
      } else { form.classList.remove('is-condensed', 'show-brands'); form.style.marginBottom = ''; var tg = form.querySelector('[data-snh-brandtog]'); if (tg) tg.setAttribute('aria-expanded', 'false'); }
    }
    // Round 14: "Brand" in the condensed bar (desktop) brings the logo rail back
    document.addEventListener('click', function (e) { var tg = e.target.closest('[data-snh-brandtog]'); if (!tg) return; e.preventDefault(); var f = tg.closest('form.snh-bar-form'); var v = f.classList.toggle('show-brands'); tg.setAttribute('aria-expanded', String(v)); var r = f.querySelector('.snh-brands'); if (v) { f.__mb = f.style.marginBottom; f.style.marginBottom = Math.max(0, parseFloat(f.__mb || 0) - (r ? r.getBoundingClientRect().height : 0)) + 'px'; } else if (f.__mb != null) { f.style.marginBottom = f.__mb; } });
    // re-measure once images above the bar (full-bleed hero) have their height: measured too early, the bar condensed
    // while still in flow and left an empty gap above the grid
    function remeasure() { if (!on) measure(); }
    measure(); addEventListener('resize', measure); addEventListener('load', remeasure);
    $$('.colhero img').forEach(function (im) { if (!im.complete) im.addEventListener('load', remeasure, { once: true }); });
    addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(sync); } }, { passive: true });
  })();

  /* search: Collections tab (predictive search), next to the Products / Articles result pages */
  on('srtabs', function (nav) {
    var btn = nav.querySelector('[data-srtab-col]'), panel = document.getElementById(btn.getAttribute('aria-controls')), done = false;
    var results = document.querySelector('.shopify-section--main-search .collection');
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open)); btn.classList.toggle('is-on', open);
      $$('.srtab[aria-current]', nav).forEach(function (a) { a.classList.toggle('is-on', !open); });
      panel.hidden = !open; if (results) results.hidden = open;
      if (!open || done) return; done = true;
      var q = nav.getAttribute('data-q') || '';
      fetch(shopRoot + 'search/suggest.json?q=' + encodeURIComponent(q) + '&resources[type]=collection&resources[limit]=10').then(function (r) { return r.json(); }).then(function (j) {
        var C = (j.resources && j.resources.results && j.resources.results.collections) || [];
        panel.querySelector('[data-srcol-list]').innerHTML = C.length ? C.map(function (c) {
          var im = c.featured_image && c.featured_image.url;
          return '<a class="srcol__item" href="' + c.url + '"><span class="srcol__img">' + (im ? '<img src="' + im + (im.indexOf('?') > -1 ? '&' : '?') + 'width=240" alt="" loading="lazy">' : '') + '</span><span class="srcol__t">' + String(c.title).replace(/</g, '&lt;') + '</span></a>';
        }).join('') : '<p class="srcol__msg">No collections match “' + q.replace(/</g, '&lt;') + '”.</p>';
      }).catch(function () { panel.querySelector('[data-srcol-list]').innerHTML = '<p class="srcol__msg">Collections could not be loaded.</p>'; });
    });
  });

  /* clamped text with a Read more toggle (collection hero) */
  on('clamp', function (box) {
    var btn = box.querySelector('button'); if (!btn) return;
    btn.addEventListener('click', function () { var o = box.classList.toggle('is-open'); btn.setAttribute('aria-expanded', String(o)); btn.textContent = o ? 'Read less' : 'Read more'; });
  });

  /* product details: tabs on desktop, accordions on phones (same panels) */
  on('dtabs', function (box) {
    var tabs = $$('[role="tab"]', box), panels = $$('.det__panel', box);
    function pick(t, focus) {
      tabs.forEach(function (x) {
        var isOn = x === t, p = document.getElementById(x.getAttribute('aria-controls'));
        x.setAttribute('aria-selected', String(isOn)); x.tabIndex = isOn ? 0 : -1;
        if (p) p.classList.toggle('is-on', isOn);
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
    panels.forEach(function (p) {
      var b = p.querySelector('.det__acc');
      if (b) b.addEventListener('click', function () { b.setAttribute('aria-expanded', String(b.getAttribute('aria-expanded') !== 'true')); });
    });
  });

  /* ================= shop the look: dots ⇄ cards (static image, R18), popover / bottom sheet ================= */
  on('hotspots', function (hs) {
    var frame = hs.querySelector('.hs__frame');
    var dots = $$('.hs__dot', hs), items = $$('.hs__item', hs);
    var scrim = hs.querySelector('.hs__scrim');
    var popOn = hs.getAttribute('data-popover') !== 'false';
    var phone = window.matchMedia('(max-width: 767px)');
    var canHover = window.matchMedia('(hover: hover) and (pointer: fine)');
    var active = null, openDot = null;
    function idx(el) { return el.getAttribute('data-spot'); }
    function dotOf(i) { return hs.querySelector('.hs__dot[data-spot="' + i + '"]'); }
    function itemOf(i) { return hs.querySelector('.hs__item[data-spot="' + i + '"]'); }
    function hot(i, isOn) { $$('[data-spot="' + i + '"]', hs).forEach(function (el) { el.classList.toggle('is-hot', isOn); }); }
    function inView(el) { var r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight; }
    function activate(i, scroll) {
      if (active !== null && active !== i) hot(active, false);
      active = i;
      hot(i, true);
      var it = itemOf(i);
      if (scroll && it && !inView(it) && !phone.matches) it.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    }
    function release() {
      if (openDot || active === null) return;
      hot(active, false);
      active = null;
    }
    function closePop(refocus) {
      if (!openDot) return;
      var d = openDot, i = idx(d);
      hs.querySelector('[data-pop="' + i + '"]').hidden = true;
      d.setAttribute('aria-expanded', 'false');
      if (scrim) scrim.hidden = true;
      openDot = null;
      if (phone.matches) document.body.style.overflow = '';
      release();
      if (refocus) d.focus({ preventScroll: true });
    }
    function openPop(dot) {
      closePop(false);
      var i = idx(dot);
      var pop = hs.querySelector('[data-pop="' + i + '"]');
      activate(i, false);
      pop.hidden = false;
      if (!phone.matches) {
        var x = parseFloat(dot.style.left), y = parseFloat(dot.style.top);
        pop.style.left = 'clamp(8px, calc(' + x + '% - 130px), calc(100% - 268px))';
        pop.style.right = 'auto';
        pop.style.top = y > 70 ? 'calc(' + y + '% - 150px)' : 'calc(' + y + '% + 30px)';
      } else {
        pop.style.left = pop.style.top = pop.style.right = '';
        if (scrim) scrim.hidden = false;
        document.body.style.overflow = 'hidden';
      }
      dot.setAttribute('aria-expanded', 'true');
      openDot = dot;
      var btn = pop.querySelector('.v-btn');
      if (btn) setTimeout(function () { btn.focus({ preventScroll: true }); }, 30);
    }
    dots.forEach(function (dot, k) {
      var i = idx(dot);
      dot.addEventListener('mouseenter', function () { if (canHover.matches && !openDot) activate(i, true); });
      dot.addEventListener('mouseleave', function () { if (canHover.matches) release(); });
      dot.addEventListener('focus', function () { if (!openDot) activate(i, true); });
      dot.addEventListener('blur', function (e) { if (!openDot && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.hs__dot'))) release(); });
      dot.addEventListener('click', function (e) {
        e.stopPropagation();
        if (openDot === dot) { closePop(true); return; }
        if (phone.matches || popOn) { openPop(dot); return; }
        activate(i, true);                                   /* desktop without popover: go to the card */
        var add = itemOf(i) && itemOf(i).querySelector('.v-btn');
        if (add) add.focus({ preventScroll: true });
      });
      dot.addEventListener('keydown', function (e) {        /* roving focus between dots */
        var step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!step) return;
        e.preventDefault();
        var next = dots[(k + step + dots.length) % dots.length];
        dots.forEach(function (d) { d.tabIndex = d === next ? 0 : -1; });
        if (openDot) closePop(false);
        next.focus();
      });
    });
    items.forEach(function (item) {
      var i = idx(item);
      item.addEventListener('mouseenter', function () { if (canHover.matches && !openDot) activate(i, false); });
      item.addEventListener('mouseleave', function () { if (canHover.matches) release(); });
      item.addEventListener('focusin', function () { if (!openDot) activate(i, false); });
      item.addEventListener('focusout', function (e) { if (!item.contains(e.relatedTarget)) release(); });
    });
    $$('.hs__close', hs).forEach(function (c) { c.addEventListener('click', function () { closePop(true); }); });
    if (scrim) scrim.addEventListener('click', function () { closePop(false); });
    document.addEventListener('click', function (e) { if (openDot && !e.target.closest('.hs__pop') && !e.target.closest('quick-buy-drawer') && !e.target.closest('.hs__dot')) closePop(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && openDot) closePop(true); });
    /* added from a popover/sheet: close it once the cart drawer takes over */
    hs.addEventListener('variant:add', function () { if (openDot && phone.matches) setTimeout(function () { closePop(false); }, 900); });
    /* theme editor: selecting a product block lights up its dot */
    hs.addEventListener('shopify:block:select', function (e) { var d = hs.querySelector('.hs__dot[data-shopify-editor-block*="' + e.detail.blockId + '"]'); if (d) activate(idx(d), false); });
    hs.addEventListener('shopify:block:deselect', function () { release(); });
  });

  /* ================= brand marquee: constant px/s, seamless, hover pause, drag to scrub ================= */
  // Round 17: start a marquee only when it's within ~600px of the viewport (it forces its logos to load to measure
  // them; far down a page that would load every logo up front)
  on('marquee', function (mq) {
    if ('IntersectionObserver' in window && !mq.__near) {
      var r = mq.getBoundingClientRect();
      if (r.top > innerHeight + 600) {
        var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); mq.__near = true; inits.marquee(mq); } }, { rootMargin: '600px 0px' });
        io.observe(mq); return;
      }
    }
    var track = mq.querySelector('.mq__track'), rail = mq.querySelector('.mq__rail');
    var runs = $$('.logos__run', rail);
    // white-mark logos: trim each file to its mark (pixels that differ from the corner colour) and size it so every
    // mark has the same height, wide marks capped at 3.4× that height. Clones made below copy the result.
    var logoFit = function (a) {
      var im = a.querySelector('img'); if (!im) { a.classList.add('is-fit'); return; }
      var go = function () {
        if (a.classList.contains('is-fit')) return;
        var H = parseFloat(getComputedStyle(a).height) || 40, ls = parseFloat(getComputedStyle(a).getPropertyValue('--ls')) || 1;
        var nw = im.naturalWidth, nh = im.naturalHeight, bx = [0, 0, 1, 1];
        try {
          var N = 120, c = document.createElement('canvas'); c.width = N; c.height = Math.max(1, Math.round(N * nh / nw));
          var g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0, c.width, c.height);
          var d = g.getImageData(0, 0, c.width, c.height).data, W = c.width, Hh = c.height;
          var r0 = d[0], g0 = d[1], b0 = d[2], x0 = W, y0 = Hh, x1 = -1, y1 = -1;
          for (var y = 0; y < Hh; y++) for (var x = 0; x < W; x++) { var k = (y * W + x) * 4; if (Math.abs(d[k] - r0) + Math.abs(d[k + 1] - g0) + Math.abs(d[k + 2] - b0) > 70) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
          if (x1 > x0 && y1 > y0) bx = [x0 / W, y0 / Hh, (x1 + 1) / W, (y1 + 1) / Hh];
        } catch (e) {}
        var mw = (bx[2] - bx[0]) * nw, mh = (bx[3] - bx[1]) * nh, asp = mw / mh;
        var markH = H * ls, markW = markH * asp;
        if (markW > H * 3.4) { markW = H * 3.4; markH = markW / asp; }
        var iw = markW / (bx[2] - bx[0]), ih = markH / (bx[3] - bx[1]);
        a.style.setProperty('--lw', markW.toFixed(1) + 'px');
        a.style.setProperty('--liw', iw.toFixed(1) + 'px'); a.style.setProperty('--lih', ih.toFixed(1) + 'px');
        a.style.setProperty('--ll', (-bx[0] * iw).toFixed(1) + 'px'); a.style.setProperty('--lt', ((H - markH) / 2 - bx[1] * ih).toFixed(1) + 'px');
        a.classList.add('is-fit');
      };
      if (im.complete && im.naturalWidth) go(); else { im.loading = 'eager'; im.addEventListener('load', go, { once: true }); im.addEventListener('error', function () { a.classList.add('is-fit'); }, { once: true }); }
    };
    if (mq.closest('.mqd')) $$('.logos__run', rail).forEach(function (r) { $$('.logo', r).forEach(logoFit); });
    if (!runs.length || reduce) return;
    if (mq.closest('.mqd')) {
      // clones made by size() copy the first run's sizing once it is known
      var sync = function () { var first = $$('.logo', runs[0]); runs.slice(1).forEach(function (r) { $$('.logo', r).forEach(function (l, i) { var f = first[i]; if (!f || !f.classList.contains('is-fit')) return; ['--lw', '--liw', '--lih', '--ll', '--lt'].forEach(function (v) { l.style.setProperty(v, f.style.getPropertyValue(v)); }); l.classList.add('is-fit'); }); }); };
      $$('img', runs[0]).forEach(function (im) { im.addEventListener('load', function () { setTimeout(function () { sync(); size(); }, 0); }); });
      setTimeout(function () { sync(); size(); }, 0);
    }
    var speed = Number(mq.getAttribute('data-speed')) || 40;
    var reverse = mq.classList.contains('mq--right');
    var runW = 0, dur = 48;
    function size() {
      runW = runs[0].getBoundingClientRect().width;
      if (!runW) return;
      /* a short run must still cover the track twice, or the loop shows a gap */
      while (runs.length * runW < track.clientWidth * 2 && runs.length < 8) {
        var c = runs[0].cloneNode(true); c.setAttribute('aria-hidden', 'true'); c.inert = true; rail.appendChild(c); runs.push(c);
      }
      dur = runW / speed;
      rail.style.setProperty('--mq-shift', (-runW) + 'px');
      rail.style.setProperty('--mq-dur', dur + 's');
    }
    size();
    window.addEventListener('resize', size);
    $$('img', rail).forEach(function (im) { if (!im.complete) im.addEventListener('load', size, { once: true }); });
    function offset() { var t = getComputedStyle(rail).transform; if (!t || t === 'none') return 0; return new DOMMatrixReadOnly(t).m41; }
    function wrap(x) { x = x % runW; return x > 0 ? x - runW : x; }
    var down = false, moved = false, x0 = 0, off0 = 0;
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      down = true; moved = false; x0 = e.clientX; off0 = offset();
    });
    track.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - x0;
      if (!moved && Math.abs(dx) < 6) return;
      if (!moved) {
        moved = true;
        track.classList.add('is-dragging');
        try { track.setPointerCapture(e.pointerId); } catch (err) {}
        rail.style.animation = 'none';
      }
      rail.style.transform = 'translate3d(' + wrap(off0 + dx) + 'px, 0, 0)';
    });
    function end() {
      if (!down) return;
      down = false;
      track.classList.remove('is-dragging');
      if (!moved) return;
      var phase = -wrap(offset()) / runW;                  /* 0..1 of one run */
      var t = (reverse ? 1 - phase : phase) * dur;
      rail.style.transform = '';
      rail.style.animation = '';
      rail.style.animationDelay = (-t) + 's';              /* resume from where the finger left it */
    }
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);
    track.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  });

  /* ================= boot ================= */
  V2.on = on;
  V2.run = run;
  function boot() { run(document); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  document.addEventListener('shopify:section:load', function (e) { run(e.target); });
})();
