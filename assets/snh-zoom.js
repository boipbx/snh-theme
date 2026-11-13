/* 14 Nov 2026 — full-screen image viewer for the product gallery (sections/snh-product.liquid).
   Tap / click a gallery photo to open. Pinch or double-tap to zoom on phones; click, double-click or the mouse
   wheel to zoom on desktop; drag to pan. Swipe or arrow keys for the next image; Esc or × to close.
   No library: pointer events + one CSS transform. */
(function () {
  'use strict';
  var MAX = 5, DBL = 2.5;
  var el, stage, img, countEl, hint, list = [], idx = 0, lastFocus = null;
  var s = 1, x = 0, y = 0, bw = 0, bh = 0;            // scale, translate (px), base (fitted) size
  var ptrs = {}, pinch = null, pan = null, moved = false, lastTap = 0, swipe = null;

  function icon(d) { return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; }
  function build() {
    el = document.createElement('div');
    el.className = 'szv'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Image viewer');
    el.innerHTML = '<div class="szv__bar"><span data-c></span><button type="button" class="szv__btn" data-x aria-label="Close">' + icon('<path d="M18 6 6 18M6 6l12 12"/>') + '</button></div>' +
      '<div class="szv__stage"><img class="szv__img" alt="" draggable="false">' +
      '<button type="button" class="szv__btn szv__nav szv__nav--prev" data-p aria-label="Previous image">' + icon('<path d="m15 18-6-6 6-6"/>') + '</button>' +
      '<button type="button" class="szv__btn szv__nav szv__nav--next" data-n aria-label="Next image">' + icon('<path d="m9 18 6-6-6-6"/>') + '</button>' +
      '<span class="szv__hint">Pinch or double-tap to zoom</span></div>';
    document.body.appendChild(el);
    stage = el.querySelector('.szv__stage'); img = el.querySelector('.szv__img'); countEl = el.querySelector('[data-c]'); hint = el.querySelector('.szv__hint');
    if (!window.matchMedia('(hover: none)').matches) hint.textContent = 'Click or scroll to zoom';
    el.querySelector('[data-x]').addEventListener('click', close);
    el.querySelector('[data-p]').addEventListener('click', function () { show(idx - 1); });
    el.querySelector('[data-n]').addEventListener('click', function () { show(idx + 1); });
    img.addEventListener('load', fit);
    stage.addEventListener('pointerdown', down);
    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    stage.addEventListener('wheel', wheel, { passive: false });
    stage.addEventListener('dblclick', function (e) { e.preventDefault(); });
    window.addEventListener('resize', function () { if (el.hasAttribute('data-open')) fit(); });
    document.addEventListener('keydown', key);
  }
  function apply() {
    img.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + s + ')';
    if (s > 1.01) stage.setAttribute('data-zoomed', ''); else stage.removeAttribute('data-zoomed');
  }
  function fit() {
    // base size = the image fitted inside the stage; then centre it
    var sr = stage.getBoundingClientRect(), nw = img.naturalWidth || 1, nh = img.naturalHeight || 1;
    var k = Math.min((sr.width - 24) / nw, (sr.height - 24) / nh); bw = nw * k; bh = nh * k;
    img.style.width = bw + 'px'; img.style.height = bh + 'px';
    s = 1; x = -bw / 2; y = -bh / 2; apply();
  }
  function clamp() {
    var sr = stage.getBoundingClientRect(), w = bw * s, h = bh * s, hw = sr.width / 2, hh = sr.height / 2;
    // the image is positioned from the stage centre; keep it covering the stage when bigger, centred when smaller
    if (w <= sr.width) x = -w / 2; else x = Math.min(-hw, Math.max(hw - w, x));
    if (h <= sr.height) y = -h / 2; else y = Math.min(-hh, Math.max(hh - h, y));
  }
  function zoomAt(ns, cx, cy) {                        // cx, cy relative to the stage centre
    ns = Math.max(1, Math.min(MAX, ns));
    x = cx - (cx - x) * ns / s; y = cy - (cy - y) * ns / s; s = ns; clamp(); apply();
  }
  function rel(e) { var r = stage.getBoundingClientRect(); return [e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2]; }
  function down(e) {
    if (e.target.closest('button')) return;
    stage.setPointerCapture(e.pointerId); ptrs[e.pointerId] = rel(e); moved = false;
    var ids = Object.keys(ptrs);
    if (ids.length === 2) {
      var a = ptrs[ids[0]], b = ptrs[ids[1]];
      pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), s: s, c: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], x: x, y: y }; pan = null; swipe = null;
    } else if (ids.length === 1) {
      pan = { p: ptrs[ids[0]], x: x, y: y }; swipe = s <= 1.01 ? { x: ptrs[ids[0]][0], t: Date.now() } : null;
    }
  }
  function move(e) {
    if (!ptrs[e.pointerId]) return;
    ptrs[e.pointerId] = rel(e);
    var ids = Object.keys(ptrs);
    if (pinch && ids.length === 2) {
      var a = ptrs[ids[0]], b = ptrs[ids[1]], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      var ns = Math.max(1, Math.min(MAX, pinch.s * d / pinch.d)), c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      x = c[0] - (pinch.c[0] - pinch.x) * ns / pinch.s; y = c[1] - (pinch.c[1] - pinch.y) * ns / pinch.s; s = ns; clamp(); apply(); moved = true;
    } else if (pan && s > 1.01) {
      var p = ptrs[e.pointerId]; x = pan.x + p[0] - pan.p[0]; y = pan.y + p[1] - pan.p[1]; clamp(); apply();
      if (Math.abs(p[0] - pan.p[0]) + Math.abs(p[1] - pan.p[1]) > 6) moved = true;
    } else if (swipe) {
      var dx = ptrs[e.pointerId][0] - swipe.x; if (Math.abs(dx) > 6) moved = true;
      img.style.transform = 'translate(' + (x + dx) + 'px,' + y + 'px) scale(1)';
    }
  }
  function up(e) {
    var p = ptrs[e.pointerId]; delete ptrs[e.pointerId];
    if (pinch) { if (Object.keys(ptrs).length < 2) pinch = null; if (s < 1.05) fit(); return; }
    if (swipe && p) {
      var dx = p[0] - swipe.x; swipe = null;
      if (Math.abs(dx) > 60 && list.length > 1) { show(idx + (dx < 0 ? 1 : -1)); return; }
      apply();
    }
    pan = null;
    if (!moved && p) {
      var now = Date.now(), touch = e.pointerType === 'touch';
      if (touch) {
        if (now - lastTap < 300) { lastTap = 0; s > 1.01 ? fit() : zoomAt(DBL, p[0], p[1]); }
        else lastTap = now;
      } else { s > 1.01 ? fit() : zoomAt(DBL, p[0], p[1]); }
    }
  }
  function wheel(e) { e.preventDefault(); var p = rel(e); zoomAt(s * Math.exp(-e.deltaY * 0.0022), p[0], p[1]); }
  function key(e) {
    if (!el || !el.hasAttribute('data-open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') show(idx + 1);
    else if (e.key === 'ArrowLeft') show(idx - 1);
    else if (e.key === 'Tab') {                         // keep focus inside the dialog
      var f = Array.prototype.filter.call(el.querySelectorAll('button'), function (b) { return b.offsetParent; });
      if (!f.length) return; var i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  }
  function show(i) {
    if (!list.length) return;
    idx = (i + list.length) % list.length;
    var it = list[idx];
    img.removeAttribute('src'); img.alt = it.alt || ''; img.src = it.src;
    countEl.textContent = (idx + 1) + ' / ' + list.length;
    if (img.complete && img.naturalWidth) fit();
  }
  function open(items, i) {
    if (!el) build();
    list = items; lastFocus = document.activeElement;
    document.documentElement.style.overflow = 'hidden';
    el.style.display = ''; show(i);
    requestAnimationFrame(function () { el.setAttribute('data-open', ''); });
    el.querySelector('[data-x]').focus({ preventScroll: true });
    setTimeout(function () { hint.style.opacity = '0'; }, 2200);
  }
  function close() {
    el.removeAttribute('data-open'); document.documentElement.style.overflow = '';
    setTimeout(function () { if (!el.hasAttribute('data-open')) el.style.display = 'none'; hint.style.opacity = ''; }, 200);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  // open from the gallery: a click that wasn't a swipe
  document.addEventListener('click', function (e) {
    var slide = e.target.closest('.sp-slide'); if (!slide || e.target.closest('a, button, video, iframe, model-viewer')) return;
    var gal = slide.closest('[data-sp-gal]'); if (!gal) return;
    var slides = Array.prototype.slice.call(gal.querySelectorAll('.sp-slide')), items = [], at = 0;
    slides.forEach(function (sl) {
      var im = sl.querySelector('img'); if (!im) return;
      if (sl === slide) at = items.length;
      items.push({ src: im.getAttribute('data-full') || im.currentSrc || im.src, alt: im.alt });
    });
    if (items.length) open(items, at);
  });
  // keyboard: Enter on the focused gallery opens the current image
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || !e.target.matches || !e.target.matches('[data-sp-slides]')) return;
    var cur = e.target.querySelector('.sp-slide[data-active]') || e.target.querySelector('.sp-slide');
    if (cur) cur.click();
  });
})();
