/* SNH social sections (Round 9): lazy TikTok embeds for sections/snh-tiktok.
   Nothing is requested from TikTok until a [data-ttk] section is within 600px of the viewport; then embed.js loads once
   and renders every .tiktok-embed on the page. A box gets .is-loaded only when its TikTok iframe talks back (embed.js
   sizes the iframe by postMessage), so an iframe that loads TikTok's error page ("overload-protect triggered", seen in
   QA) still counts as failed. .is-failed shows the fallback card: script blocked, or no message within 6s.
   Boxes have fixed heights, so nothing moves.
   Round 11: the 6s limit starts when the section is set up (not when TikTok answers), so a skeleton never stays
   longer. Video cards ([data-ttv]): thumbnail + caption from https://www.tiktok.com/oembed (CORS allowed), fetched
   when the section is near, 6s limit; on failure the card keeps its caption on a brand gradient. oEmbed stopped sending
   thumbnails, so the card's picture is TikTok's own player (muted, paused, behind the card button). A tap opens TikTok's
   player (https://www.tiktok.com/player/v1/<id>) in a lightbox; without JS or <dialog> it opens TikTok. */
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
      // a late answer still wins: the embed replaces the fallback card even after the time limit (Round 12)
      function ok() { if (box.classList.contains('is-loaded')) return; done = true; box.classList.remove('is-failed'); box.classList.add('is-loaded'); update(sec); }
      function fail() { if (done) return; done = true; box.classList.add('is-failed'); update(sec); }
      box.__ttkOk = ok;
      box.__ttkFail = fail;
    });
  }
  // the time limit starts when the section comes near (load), not at page load: a limit started at set-up failed
  // every shopper who took more than 6s to scroll down, before TikTok was ever asked (Round 12 diagnosis)
  function limit(sec) {
    if (sec.__ttkLimit) return;
    sec.__ttkLimit = true;
    setTimeout(function () {
      [].forEach.call(sec.querySelectorAll('[data-ttk-box]'), function (box) {
        if (box.classList.contains('is-loaded')) return;
        if (box.__ttkFail) box.__ttkFail(); else { box.classList.add('is-failed'); update(sec); }
      });
    }, 8000);
  }

  /* video cards: oEmbed thumbnail + caption, lightbox player */
  function cards(sec) {
    [].forEach.call(sec.querySelectorAll('[data-ttv]'), function (li) {
      if (li.__ttv) return;
      li.__ttv = true;
      if (li.hasAttribute('data-ttv-cover')) return;   // the merchant's cover image is the picture
      var url = li.getAttribute('data-ttv'), ctl = window.AbortController ? new AbortController() : null;
      var t = setTimeout(function () { if (ctl) ctl.abort(); li.classList.add('is-failed'); }, 6000);
      fetch('https://www.tiktok.com/oembed?url=' + encodeURIComponent(url), ctl ? { signal: ctl.signal } : {})
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (d) {
          clearTimeout(t);
          var img = li.querySelector('[data-ttv-img]'), cap = li.querySelector('[data-ttv-cap]');
          if (d.thumbnail_url && img) { img.onload = function () { li.classList.add('is-loaded'); }; img.onerror = function () { li.classList.add('is-failed'); }; img.src = d.thumbnail_url; img.hidden = false; }
          else preview(li);
          if (cap && !cap.textContent.trim() && d.title) cap.textContent = d.title.replace(/\s*#\S+/g, '').trim().slice(0, 90) || d.title.slice(0, 90);
        })
        .catch(function () { clearTimeout(t); li.classList.add('is-failed'); });
    });
  }
  // TikTok's oEmbed no longer sends a thumbnail: the card shows TikTok's own player (muted, not playing) as its picture.
  // It is a preview only; the card's button sits on top and opens the lightbox. No answer within 6s = caption card.
  function preview(li) {
    var th = li.querySelector('[data-ttv-thumb]'), f = document.createElement('iframe'), done = false;
    f.title = 'TikTok video preview'; f.tabIndex = -1; f.setAttribute('aria-hidden', 'true'); f.loading = 'lazy';
    f.allow = 'encrypted-media';
    f.src = 'https://www.tiktok.com/player/v1/' + encodeURIComponent(li.getAttribute('data-id')) + '?autoplay=0&muted=1&controls=0&progress_bar=0&play_button=0&volume_control=0&fullscreen_button=0&timestamp=0&music_info=0&description=0&rel=0&native_context_menu=0&closed_caption=0';
    f.onload = function () { done = true; li.classList.remove('is-failed'); li.classList.add('is-loaded', 'is-player'); };
    // never a shimmer past 6s: show the caption card meanwhile; the player still swaps in if it arrives later
    setTimeout(function () { if (!done) li.classList.add('is-failed'); }, 6000);
    th.appendChild(f);
  }
  document.addEventListener('click', function (e) {
    var card = e.target.closest('[data-ttv] .ttv__card');
    if (card) {
      var li = card.closest('[data-ttv]'), sec = li.closest('[data-ttk]'), dlg = sec && sec.querySelector('[data-ttl]');
      if (!dlg || !dlg.showModal) { window.open(li.getAttribute('data-ttv'), '_blank', 'noopener'); return; }
      dlg.querySelector('[data-ttl-frame]').innerHTML = '<iframe src="https://www.tiktok.com/player/v1/' + encodeURIComponent(li.getAttribute('data-id')) + '?autoplay=1&music_info=1&description=1&rel=0" title="TikTok video" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe>';
      dlg.querySelector('[data-ttl-out]').href = li.getAttribute('data-ttv');
      dlg.showModal();
      return;
    }
    var x = e.target.closest('[data-ttl-close]') || (e.target.matches && e.target.matches('dialog[data-ttl]') ? e.target : null);
    if (x) { var d = x.closest('dialog') || x; d.close(); }
  });
  document.addEventListener('close', function (e) { if (e.target.matches && e.target.matches('dialog[data-ttl]')) e.target.querySelector('[data-ttl-frame]').innerHTML = ''; }, true);
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
    limit(sec);
    cards(sec);
    if (!sec.querySelector('.tiktok-embed')) return;   // video cards only: no embed.js needed
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

  /* ---------- Instagram (sections/snh-instagram, Round 11) ----------
     The old section's call: graph.instagram.com/me/media with the token from Theme settings. Fetched only when the
     grid is within 600px, cached 1h in sessionStorage, rendered in the old card style. Any problem keeps the curated
     tiles that are already on the page. */
  var IG_FIELDS = 'id,media_type,media_url,thumbnail_url,permalink,caption,timestamp', IG_KEY = 'snh_ig_v1';
  function igEsc(t) { return String(t || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function igRender(grid, posts) {
    var icon = grid.querySelector('.igr__ov') ? grid.querySelector('.igr__ov').innerHTML : '';
    var label = { VIDEO: 'Reel', CAROUSEL_ALBUM: 'Carousel', IMAGE: 'Post' };
    grid.innerHTML = posts.slice(0, +grid.getAttribute('data-ig-count') || 6).map(function (p) {
      var src = p.media_type === 'VIDEO' ? (p.thumbnail_url || '') : p.media_url, cap = (p.caption || '').replace(/\s+/g, ' ').trim();
      var d = p.timestamp ? new Date(p.timestamp) : null, date = d && !isNaN(d) ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
      return '<li class="igr__item"><a class="igr__tile" href="' + igEsc(p.permalink) + '" target="_blank" rel="noopener" aria-label="' + igEsc(cap.slice(0, 80) || 'Instagram post') + ' (opens Instagram)">' +
        (src ? '<img src="' + igEsc(src) + '" alt="" loading="lazy" decoding="async" width="600" height="600">' : '') +
        '<span class="igr__type">' + (label[p.media_type] || 'Post') + '</span><span class="igr__ov" aria-hidden="true">' + icon + '</span></a>' +
        '<p class="igr__cap"><span>' + igEsc(cap.slice(0, 140)) + '</span>' + (date ? '<time datetime="' + igEsc(p.timestamp) + '">' + date + '</time>' : '') + '</p></li>';
    }).join('');
    grid.classList.add('is-live');
  }
  function igLoad(grid) {
    var token = (grid.getAttribute('data-ig-token') || '').trim();
    if (!token) return;
    try { var c = JSON.parse(sessionStorage.getItem(IG_KEY) || 'null'); if (c && Date.now() - c.t < 3600000 && c.data && c.data.length) { igRender(grid, c.data); return; } } catch (e) {}
    var url = 'https://graph.instagram.com/me/media?fields=' + IG_FIELDS + '&limit=' + (+grid.getAttribute('data-ig-count') || 6) + '&access_token=' + encodeURIComponent(token);
    fetch(url).then(function (r) { if (!r.ok) throw new Error('Instagram ' + r.status); return r.json(); }).then(function (j) {
      var data = (j.data || []).filter(function (p) { return p.permalink && (p.media_url || p.thumbnail_url); });
      if (!data.length) return;
      try { sessionStorage.setItem(IG_KEY, JSON.stringify({ t: Date.now(), data: data })); } catch (e) {}
      igRender(grid, data);
    }).catch(function () { grid.classList.add('is-fallback'); });   // expired / revoked token: the curated tiles stay
  }
  function igInit(root) {
    [].forEach.call((root || document).querySelectorAll('[data-ig]'), function (grid) {
      if (grid.__ig) return;
      grid.__ig = true;
      if (!('IntersectionObserver' in window)) { igLoad(grid); return; }
      var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); igLoad(grid); } }, { rootMargin: '600px 0px' });
      io.observe(grid);
    });
  }

  function init(root) {
    [].forEach.call((root || document).querySelectorAll('[data-ttk]'), function (sec) {
      if (sec.__ttkInit) return;
      sec.__ttkInit = true;
      watch(sec);
      if (!('IntersectionObserver' in window)) { load(sec); return; }
      var io = new IntersectionObserver(function (es) {
        if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); load(sec); }
      }, { rootMargin: '600px 0px' });
      io.observe(sec);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); igInit(); }); else { init(); igInit(); }
  document.addEventListener('shopify:section:load', function (e) { init(e.target); igInit(e.target); });
})();
