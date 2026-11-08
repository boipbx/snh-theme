/* SNH campaigns (Round 12): sections/snh-campaigns prints every campaign (Site campaign metaobject entries + Campaign
   blocks). Here, in the browser (so a cached page still switches on time): keep the ones live now (start ≤ now < end),
   on this page type, for this visitor; highest priority first. Then:
   - announcements → items in the header's orange bar (their colour), and the header's own Announcement blocks are
     shown/hidden by their schedule and audience; the bar hides when nothing is live
   - promo popup → the top live one, after the delay, frequency-capped (once / day / session / always), and only if no
     other popup had this page view (window.SNHPopups, shared with the email popup)
   - home_banner → under the homepage hero; cart_banner → [data-campaign-slot="cart"] in the drawer and cart page
   window.SNHCampaigns.decide(list, ctx, now) is the pure filter (QA); the decision is in <html data-campaigns-live>. */
(function () {
  if (window.SNHCampaigns) return;
  var P = window.SNHPopups = window.SNHPopups || { taken: null, claim: function (n) { if (this.taken && this.taken !== n) return false; this.taken = n; return true; } };
  function ls(store, k, v) { try { if (v === undefined) return store.getItem(k); store.setItem(k, v); } catch (e) { return null; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function t(d) { if (!d) return null; var x = Date.parse(String(d).replace(/([+-]\d\d)(\d\d)$/, '$1:$2')); return isNaN(x) ? null : x; }
  var PAGES = { home: ['index'], collections: ['collection', 'list-collections'], products: ['product'], cart: ['cart'] };
  function pageOk(pages, page) { return !pages || pages === 'all' || (PAGES[pages] || [pages]).indexOf(page) > -1; }
  function audOk(a, ctx) { return !a || a === 'all' || (a === 'guests' && !ctx.member) || (a === 'members' && ctx.member) || (ctx.member && a === ctx.tier); }
  // Round 20: "days" repeats a campaign weekly (e.g. "sat" or "fri,sat"), counted in shop time (Sri Lanka, UTC+5:30, no DST)
  var DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  function shopDay(now) { return DAYS[new Date(now + 330 * 60000).getUTCDay()]; }
  function dayOk(days, now) { if (!days) return true; var d = shopDay(now); return String(days).toLowerCase().split(/[\s,]+/).some(function (x) { return x && x.slice(0, 3) === d; }); }
  function live(c, now) { var a = t(c.start), b = t(c.end); return (a === null || a <= now) && (b === null || now < b) && dayOk(c.days, now); }
  function decide(list, ctx, now) {
    return (list || []).map(function (c) {
      // R19: targeted (goals / sports / diets / bought, or "only matching visitors") → shown only when SNH.prefsMatch says so
      var targeted = !!(c.goals || c.sports || c.diets || c.bought || c.match === true), fit = !targeted || c.type === 'announcement' || !(window.SNH && SNH.prefsMatch) || SNH.prefsMatch(c, ctx.prefs) > 0;
      var why = !live(c, now) ? (t(c.start) > now ? 'future' : 'ended') : !pageOk(c.pages, ctx.page) ? 'other page' : !audOk(c.audience, ctx) ? 'other audience' : !fit ? 'not relevant' : 'live';
      return Object.assign({ why: why }, c);
    }).sort(function (a, b) { return (b.priority || 0) - (a.priority || 0); });
  }
  // Round 15: the word Koko in a banner heading shows as the Koko logo (window.SNH.kokoImg, layout/theme.liquid)
  function kk(t) { return window.SNH && SNH.kokoImg ? t.replace(/\bKoko\b/, SNH.kokoImg(18)) : t; }
  var css = null;
  function loadCss() { if (css) return; var s = document.currentScript || document.querySelector('script[src*="snh-campaigns.js"]'); css = document.createElement('link'); css.rel = 'stylesheet'; css.href = (s && s.getAttribute('data-css')) || (s ? s.src.split('?')[0] : '').replace('snh-campaigns.js', 'snh-campaigns.css');   /* Round 15: the CSS's own asset_url (its own ?v=), so a CSS-only change reaches the CDN */ document.head.appendChild(css); }
  function codeHtml(c) {
    if (!c.code) return '';
    var back = location.pathname;
    return '<div class="cmp__code"><code>' + esc(c.code) + '</code><button type="button" class="cmp__copy" data-cmp-copy="' + esc(c.code) + '">Copy</button><a class="cmp__apply" href="/discount/' + encodeURIComponent(c.code) + '?redirect=' + encodeURIComponent(back) + '">Apply</a></div>';
  }
  function pic(c, cls) { return c.img ? '<picture class="' + cls + '">' + (c.imgM ? '<source media="(max-width: 767px)" srcset="' + esc(c.imgM) + '">' : '') + '<img src="' + esc(c.img) + '" alt="" loading="lazy"></picture>' : ''; }
  function banner(c, kind) {
    return '<div class="cmp-ban cmp-ban--' + kind + ' cmp-tone--' + esc(c.tone || 'orange') + '" data-campaign="' + esc(c.id) + '">' + pic(c, 'cmp-ban__pic') +
      '<div class="cmp-ban__b">' + (c.heading ? '<p class="cmp-ban__h">' + kk(esc(c.heading)) + '</p>' : '') + (c.message ? '<p class="cmp-ban__p">' + esc(c.message) + '</p>' : '') + codeHtml(c) + '</div>' +
      (c.cta && c.link ? '<a class="cmp-ban__go" href="' + esc(c.link) + '">' + esc(c.cta) + '</a>' : '') + '</div>';
  }

  function run() {
    var el = document.querySelector('[data-campaigns]'), data;
    try { data = JSON.parse(el.textContent); } catch (e) { data = { list: [], ctx: { page: '', member: false, tier: '' } }; }
    var now = Date.now(), all = decide(data.list, data.ctx, now), on = all.filter(function (c) { return c.why === 'live'; });
    document.documentElement.setAttribute('data-campaigns-live', JSON.stringify(all.map(function (c) { return c.id + ':' + c.type + ':' + c.why; })));
    window.SNHCampaigns.state = { all: all, live: on };

    // announcements: the header's own blocks by schedule/audience, then campaign items
    var box = document.querySelector('.announce'), wrap = box && box.querySelector('.announce__in');
    if (wrap) {
      [].forEach.call(wrap.querySelectorAll('.announce__item:not([data-campaign])'), function (a) {
        var ok = live({ start: a.getAttribute('data-start'), end: a.getAttribute('data-end') }, now) && audOk(a.getAttribute('data-aud'), data.ctx);
        a.hidden = !ok;
      });
      on.filter(function (c) { return c.type === 'announcement'; }).forEach(function (c) {
        if (wrap.querySelector('[data-campaign="' + c.id + '"]')) return;
        var a = document.createElement('a');
        a.className = 'announce__item'; a.href = c.link || '#'; a.tabIndex = -1; a.setAttribute('data-campaign', c.id); a.setAttribute('data-tone', c.tone || 'orange');
        a.innerHTML = (c.tag ? '<b>' + esc(c.tag) + '</b>' : '') + esc(c.message || c.heading || c.name) + (c.code ? ' · <span class="announce__code">' + esc(c.code) + '</span>' : '') + '<span aria-hidden="true">→</span>';
        if ((c.priority || 0) > 0) wrap.insertBefore(a, wrap.firstChild); else wrap.appendChild(a);
      });
      // show the first live item and take its colour here (the bar keeps it while the items rotate), whatever order
      // the header script ran in
      var shown = [].filter.call(wrap.querySelectorAll('.announce__item'), function (x) { return !x.hidden; });
      box.hidden = !shown.length;
      [].forEach.call(wrap.querySelectorAll('.announce__item'), function (x) { var on0 = x === shown[0]; x.classList.toggle('is-on', on0); if (on0) x.removeAttribute('tabindex'); else x.tabIndex = -1; });
      if (shown[0]) box.setAttribute('data-tone', shown[0].getAttribute('data-tone') || 'orange');
      document.dispatchEvent(new CustomEvent('snh:announce'));
    }

    var top = function (type) { return on.filter(function (c) { return c.type === type; })[0]; };
    // Round 20: sitewide highlight (e.g. Saturday 15% off): a label on every product card and a line under the price on
    // product pages, while the campaign is live. Any live campaign with a "highlight" label drives it.
    var hl = on.filter(function (c) { return c.highlight; })[0], root = document.documentElement;
    if (hl) {
      root.setAttribute('data-offer', hl.id); root.style.setProperty('--offer-label', JSON.stringify(hl.highlight));
      if (data.ctx.page === 'product' && !document.querySelector('.offer-line')) {
        var anchor = document.querySelector('.snh-points-banner') || document.querySelector('[class*="price"]');
        if (anchor) { loadCss(); var ol = document.createElement('p'); ol.className = 'offer-line'; ol.innerHTML = '<b>' + esc(hl.tag || hl.highlight) + '</b> ' + esc(hl.message || ''); anchor.parentNode.insertBefore(ol, anchor.nextSibling); }
      }
    } else { root.removeAttribute('data-offer'); root.style.removeProperty('--offer-label'); }

    // homepage banner, under the hero
    var hb = top('home_banner');
    if (hb && data.ctx.page === 'index') {
      loadCss();
      var slot = document.querySelector('[data-campaign-slot="home"]');
      if (!slot) { var secs = document.querySelectorAll('main .shopify-section'); slot = document.createElement('div'); slot.setAttribute('data-campaign-slot', 'home'); slot.className = 'v-wrap cmp-slot'; if (secs[0]) secs[0].after(slot); }
      slot.innerHTML = banner(hb, 'home');
    }
    // cart banner (drawer + page)
    var cb = top('cart_banner');
    [].forEach.call(document.querySelectorAll('[data-campaign-slot="cart"], [data-campaign-slot="account"]'), function (s) { if (cb) { loadCss(); s.innerHTML = banner(cb, 'cart'); s.hidden = false; } else { s.innerHTML = ''; s.hidden = true; } });

    // promo popup
    var pc = top('popup');
    if (pc) {
      var key = 'snh_cmp_' + pc.id, store = pc.freq === 'session' ? sessionStorage : localStorage, seen = +ls(store, key) || 0;
      var capped = pc.freq === 'always' ? false : pc.freq === 'day' ? now - seen < 864e5 : !!seen;
      if (!capped) setTimeout(function () {
        if (document.querySelector('dialog[open], x-drawer[open], #snh-pay-router:not([hidden])') || !P.claim('campaign')) return;
        loadCss();
        var d = document.createElement('dialog');
        d.className = 'cmp-pop cmp-tone--' + (pc.tone || 'orange'); d.setAttribute('aria-labelledby', 'cmp-h'); d.setAttribute('data-campaign', pc.id);
        d.innerHTML = '<div class="cmp-pop__in">' + pic(pc, 'cmp-pop__pic') + '<div class="cmp-pop__b"><button type="button" class="cmp-pop__x" aria-label="Close" data-cmp-close>×</button>' +
          '<p class="cmp-pop__h" id="cmp-h">' + esc(pc.heading || pc.name) + '</p>' + (pc.message ? '<p class="cmp-pop__p">' + esc(pc.message) + '</p>' : '') + codeHtml(pc) +
          (pc.cta && pc.link ? '<a class="cmp-pop__go" href="' + esc(pc.link) + '">' + esc(pc.cta) + '</a>' : '') + '</div></div>';
        document.body.appendChild(d);
        d.addEventListener('click', function (e) { if (e.target === d || e.target.closest('[data-cmp-close]')) d.close(); });
        d.addEventListener('close', function () { d.remove(); });
        ls(store, key, String(Date.now()));
        d.showModal();
      }, (data.delay || 0) * 1000);
    }
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-cmp-copy]'); if (!b) return;
    var done = function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy'; }, 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(b.getAttribute('data-cmp-copy')).then(done, done); else done();
  });
  window.SNHCampaigns = { decide: decide, run: run };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  // the cart drawer re-renders its slot's neighbours, not the slot; re-run when a section reloads in the editor
  document.addEventListener('shopify:section:load', run);
})();
