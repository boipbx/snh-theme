/* 14 Nov 2026 — "Saturday SiS deal": a small chip bottom-left on Saturdays (Asia/Colombo) that opens a spin wheel.
   The wheel always lands on "15% off SiS" and reveals the day's real code (SIS15-DDMON, created in Shopify, see
   docs/golive/SATURDAY-CODES.md). Loaded only on Saturdays, after the page is idle, by the inline loader in
   layout/theme.liquid (window.SNHSat = { code, sis }). No libraries. Nothing opens by itself. */
(function () {
  'use strict';
  var C = window.SNHSat || {}, CODE = C.code, SIS = C.sis || '/collections/sis', DAY = C.day || '';
  if (!CODE || document.querySelector('.ssd-chip')) return;
  var K = 'snh_sat_' + DAY, KX = 'snh_satx_' + DAY;
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  if (get(KX)) return;                                   // dismissed for today
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var LABELS = ['15% off SiS', 'Hydration', 'Energy gels', 'Recovery', 'Beta Fuel', 'Electrolytes', 'Protein', 'Race day'];
  var FILL = ['#E0521C', '#0E0E0E', '#FFFFFF', '#1E7A43', '#E0521C', '#0E0E0E', '#FFFFFF', '#1E7A43'];
  var INK = ['#fff', '#fff', '#0E0E0E', '#fff', '#fff', '#fff', '#0E0E0E', '#fff'];
  function el(t, a, h) { var e = document.createElement(t); for (var k in a) e.setAttribute(k, a[k]); if (h != null) e.innerHTML = h; return e; }

  /* ---------- chip ---------- */
  var chip = el('div', { class: 'ssd-chip' });
  var open = el('button', { type: 'button', class: 'ssd-chip__go', 'aria-haspopup': 'dialog', 'aria-label': 'Saturday SiS deal: open to get today\'s 15% off code' }, '<span aria-hidden="true">🎁</span> Saturday SiS deal');
  var x = el('button', { type: 'button', class: 'ssd-chip__x', 'aria-label': 'Hide the Saturday SiS deal for today' }, '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>');
  chip.appendChild(open); chip.appendChild(x); document.body.appendChild(chip);
  requestAnimationFrame(function () { chip.classList.add('is-in'); });
  x.addEventListener('click', function () { set(KX, '1'); chip.remove(); });
  open.addEventListener('click', show);
  // keep clear of bottom bars (sticky add to cart, campaign bars, chat): sit above the highest one on the left
  var AVOID = '.sp-sticky.is-on, .cmpx__mini, .cmp-pop, [id*="whatsapp" i], [class*="whatsapp" i], iframe[title*="chat" i], #shopify-chat, .snh-wa';
  function place() {
    var b = 16, h = innerHeight;
    document.querySelectorAll(AVOID).forEach(function (e) {
      if (e === chip || chip.contains(e)) return;
      var r = e.getBoundingClientRect(); if (!r.width || !r.height || r.left > 260 || r.bottom < h - 220) return;
      var cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return;
      b = Math.max(b, h - r.top + 12);
    });
    chip.style.bottom = 'calc(' + b + 'px + env(safe-area-inset-bottom, 0px))';
  }
  var tk = 0; function later() { if (!tk) tk = requestAnimationFrame(function () { tk = 0; place(); }); }
  place(); addEventListener('scroll', later, { passive: true }); addEventListener('resize', later); setInterval(place, 1500);

  /* ---------- sheet ---------- */
  var dlg, wheel, spinBtn, result, status, lastFocus, spun = !!get(K);
  function wheelSvg() {
    var s = '', n = 8, r = 100, a = 360 / n;
    for (var i = 0; i < n; i++) {
      var a0 = (i * a - 90 - a / 2) * Math.PI / 180, a1 = ((i + 1) * a - 90 - a / 2) * Math.PI / 180;
      s += '<path d="M0 0L' + (r * Math.cos(a0)).toFixed(2) + ' ' + (r * Math.sin(a0)).toFixed(2) + 'A' + r + ' ' + r + ' 0 0 1 ' + (r * Math.cos(a1)).toFixed(2) + ' ' + (r * Math.sin(a1)).toFixed(2) + 'Z" fill="' + FILL[i] + '" stroke="#0E0E0E" stroke-width="1"/>';
      s += '<text transform="rotate(' + (i * a) + ') translate(0 -62) rotate(' + (i === 2 || i === 3 ? -90 : 90) + ')" fill="' + INK[i] + '" font-size="' + (i ? 9.5 : 10.5) + '" font-weight="' + (i ? 600 : 800) + '" text-anchor="middle" dominant-baseline="middle">' + LABELS[i] + '</text>';
    }
    return '<svg viewBox="-104 -104 208 208" aria-hidden="true"><g class="ssd-w">' + s + '<circle r="104" fill="none" stroke="#0E0E0E" stroke-width="6"/></g><circle r="16" fill="#0E0E0E"/><circle r="6" fill="#E0521C"/></svg>';
  }
  function build() {
    dlg = el('div', { class: 'ssd', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'ssd-t', 'aria-describedby': 'ssd-d' });
    dlg.innerHTML = '<div class="ssd__scrim" data-ssd-close></div><div class="ssd__box">' +
      '<button type="button" class="ssd__x" data-ssd-close aria-label="Close">×</button>' +
      '<p class="ssd__eb">Saturday SiS deal</p><h2 class="ssd__t" id="ssd-t">Spin to unlock your Saturday code</h2>' +
      '<p class="ssd__d" id="ssd-d">Every spin unlocks the same deal: 15% off Science in Sport (SiS) products, today only.</p>' +
      '<div class="ssd__wheel"><span class="ssd__ptr" aria-hidden="true"></span>' + wheelSvg() + '</div>' +
      '<button type="button" class="ssd__spin">Spin the wheel</button>' +
      '<div class="ssd__res" hidden><p class="ssd__win">You unlocked <b>15% off SiS</b></p><p class="ssd__code" aria-label="Your code">' + CODE + '</p>' +
      '<div class="ssd__btns"><button type="button" class="ssd__apply">Apply to my cart</button><button type="button" class="ssd__copy">Copy code</button></div>' +
      '<p class="ssd__st" role="status" aria-live="polite"></p>' +
      '<p class="ssd__small">Valid today only on Science in Sport products. <a href="' + SIS + '">Shop SiS</a></p></div></div>';
    document.body.appendChild(dlg);
    wheel = dlg.querySelector('.ssd-w'); spinBtn = dlg.querySelector('.ssd__spin'); result = dlg.querySelector('.ssd__res'); status = dlg.querySelector('.ssd__st');
    dlg.addEventListener('click', function (e) { if (e.target.closest('[data-ssd-close]')) hide(); });
    dlg.addEventListener('keydown', keys);
    spinBtn.addEventListener('click', spin);
    dlg.querySelector('.ssd__apply').addEventListener('click', apply);
    dlg.querySelector('.ssd__copy').addEventListener('click', copy);
  }
  function show() {
    if (!dlg) build();
    lastFocus = document.activeElement; document.documentElement.classList.add('ssd-lock');
    dlg.classList.add('is-open');
    if (spun) reveal(true); else { spinBtn.hidden = false; result.hidden = true; }
    setTimeout(function () { (spun ? dlg.querySelector('.ssd__apply') : spinBtn).focus(); }, 60);
  }
  function hide() { dlg.classList.remove('is-open'); document.documentElement.classList.remove('ssd-lock'); if (lastFocus) lastFocus.focus(); }
  function keys(e) {
    if (e.key === 'Escape') { e.preventDefault(); hide(); return; }
    if (e.key !== 'Tab') return;
    var f = [].filter.call(dlg.querySelectorAll('button, a[href]'), function (b) { return b.offsetParent && !b.disabled; });
    var i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  }
  function spin() {
    spinBtn.disabled = true;
    if (reduce) { reveal(false); return; }
    var ptr = dlg.querySelector('.ssd__ptr'), turns = 5, end = turns * 360 + (Math.random() * 30 - 15), dur = 2800, t0 = 0, last = -1;
    (function f(t) {
      if (!t0) t0 = t; var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4), deg = end * e;
      wheel.style.transform = 'rotate(' + deg + 'deg)';
      var seg = Math.floor((deg + 22.5) / 45); if (seg !== last) { last = seg; ptr.classList.remove('is-tick'); void ptr.offsetWidth; ptr.classList.add('is-tick'); }
      if (k < 1) requestAnimationFrame(f); else { wheel.style.transform = 'rotate(' + (turns * 360) + 'deg)'; setTimeout(function () { reveal(false); burst(); }, 250); }
    })(performance.now());
  }
  function reveal(again) {
    spun = true; set(K, '1');
    spinBtn.hidden = true; result.hidden = false; result.classList.toggle('is-fade', !again);
    dlg.querySelector('.ssd__win').innerHTML = again ? 'Your Saturday code' : 'You unlocked <b>15% off SiS</b>';
    if (!again) dlg.querySelector('.ssd__apply').focus();
  }
  function apply() {
    var b = dlg.querySelector('.ssd__apply'); b.disabled = true; status.textContent = 'Applying…';
    fetch('/discount/' + encodeURIComponent(CODE) + '?redirect=/cart.js', { credentials: 'same-origin' })
      .then(function () { return fetch('/cart.js', { credentials: 'same-origin', headers: { Accept: 'application/json' } }); })
      .then(function (r) { return r.json(); })
      .then(function (cart) {
        b.disabled = false; status.textContent = 'Code applied, 15% comes off your SiS items at checkout';
        document.dispatchEvent(new CustomEvent('cart:refresh'));
        document.documentElement.dispatchEvent(new CustomEvent('cart:change', { bubbles: true, detail: { cart: cart } }));
      })
      .catch(function () { b.disabled = false; status.textContent = 'Couldn\'t apply it just now. Use code ' + CODE + ' at checkout.'; });
  }
  function copy() {
    var done = function () { status.textContent = 'Copied ' + CODE; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(CODE).then(done, fallback); else fallback();
    function fallback() { var t = el('textarea', { readonly: '' }); t.value = CODE; t.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); done(); } catch (e) { status.textContent = 'Your code: ' + CODE; } t.remove(); }
  }
  // confetti: ~46 flakes in SNH orange, green and white, 1.2 s, from the wheel
  function burst() {
    var box = dlg.querySelector('.ssd__wheel'), r = box.getBoundingClientRect(), cv = el('canvas', { class: 'ssd__fx', 'aria-hidden': 'true' }), d = Math.min(2, devicePixelRatio || 1);
    cv.width = innerWidth * d; cv.height = innerHeight * d; dlg.appendChild(cv); var c = cv.getContext('2d'); if (!c) return; c.scale(d, d);
    var cols = ['#E0521C', '#F28C55', '#1E9E57', '#7ED3A0', '#FFFFFF'], P = [], ox = r.left + r.width / 2, oy = r.top + r.height / 2, t0 = 0;
    for (var i = 0; i < 46; i++) { var a = Math.random() * Math.PI * 2, v = 3 + Math.random() * 5; P.push({ x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 3, s: 4 + Math.random() * 5, r: Math.random() * 6, c: cols[i % 5] }); }
    (function f(t) {
      if (!t0) t0 = t; var k = (t - t0) / 1200; c.clearRect(0, 0, innerWidth, innerHeight);
      if (k >= 1) { cv.remove(); return; }
      c.globalAlpha = k < .7 ? 1 : (1 - k) / .3;
      P.forEach(function (p) { p.vy += .18; p.x += p.vx; p.y += p.vy; p.r += .15; c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = p.c; c.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * .6); if (p.c === '#FFFFFF') { c.strokeStyle = 'rgba(14,14,14,.35)'; c.lineWidth = .8; c.strokeRect(-p.s / 2, -p.s / 3, p.s, p.s * .6); } c.restore(); });
      requestAnimationFrame(f);
    })(performance.now());
  }
})();
