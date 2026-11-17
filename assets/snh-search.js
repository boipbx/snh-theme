/* 16 Nov 2026 — smart search for the header overlay (sections/snh-header.liquid, .srch).
   Loaded only when search is opened (assets/snh-v2.js injects it), never on page load.
   Engine ported from the previous header (docs/reference/old-header-v6.liquid): word-based scoring with typo
   tolerance, brand shorthand ("sis", "an"), a local catalogue index so a product Shopify's predictive search
   skips still shows, sold-out products always listed (last, tagged, with a WhatsApp restock link), exclusive
   brands winning ties, and bundles matched on what they contain. Bundle prices and savings are live
   (price vs compare-at from the catalogue), nothing is hardcoded. */
(function () {
  'use strict';
  var root = (window.Shopify && Shopify.routes && Shopify.routes.root) || '/';
  var CAT_KEY = 'snh-catalogue-v2', CAT_TTL = 30 * 60 * 1000;
  var catalogue = null, catPromise = null, byHandle = {};
  var ctl = null, latest = 0;

  /* brand shorthand customers actually type → what the catalogue calls it */
  var BRAND_ALIASES = { sis: ['science in sport', 'science', 'sport'], an: ['applied nutrition', 'applied'], on: ['optimum nutrition', 'optimum'], bsn: ['bsn'],
    raw: ['raw nutrition', 'raw'], ryse: ['ryse'], pvl: ['pvl'], usn: ['usn'], mp: ['myprotein', 'my protein'], gn: ['go nutrition'], hs: ['healthspan'],
    tm: ['trace minerals'], vb: ['vitabiotics'], ss: ['seven seas'], dym: ['dymatize'], scitec: ['scitec nutrition', 'scitec'] };

  /* customers say "tablets" for capsules and the other way round: any of these words stands for all of them */
  var FORMS = ['tablets', 'tablet', 'tabs', 'capsules', 'capsule', 'caps', 'softgels', 'softgel', 'pills'];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function normalise(v) { return String(v || '').toLowerCase().replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function wordsOf(v) { return normalise(v).split(' ').filter(Boolean); }
  function rs(n) { return 'Rs ' + Math.round(Number(n) || 0).toLocaleString('en-US'); }
  function sized(u, w) { u = String(u || ''); return u ? u + (u.indexOf('?') > -1 ? '&' : '?') + 'width=' + w : ''; }
  function tidy(t, v) { t = String(t || ''); v = String(v || ''); return v.length >= 5 && t.toLowerCase().indexOf(v.toLowerCase() + ' ') === 0 && t.length > v.length + 3 ? t.slice(v.length + 1) : t; }
  function uniq(a) { var s = {}, o = []; a.forEach(function (x) { if (!s[x]) { s[x] = 1; o.push(x); } }); return o; }

  /* "sis go electrolyte" → "science in sport go electrolyte", so Shopify itself can find products whose title never has the shorthand */
  function expandQuery(q) {
    var t = wordsOf(q), changed = false;
    var out = t.map(function (x) { var a = BRAND_ALIASES[x]; if (a && a[0]) { changed = true; return a[0]; } return x; });
    return changed ? out.join(' ') : '';
  }
  function inStock(p) {
    if (!p) return false; if (p.available === false) return false; if (p.available === true) return true;
    if (!Array.isArray(p.variants) || !p.variants.length) return true;
    return p.variants.some(function (v) { return v && v.available !== false; });
  }
  /* bounded edit distance: tolerates one or two typed slips ("electroryte" → "electrolyte") without matching unrelated words */
  function withinEdits(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return false;
    var prev = [], i, j; for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      var row = [i], best = i;
      for (j = 1; j <= b.length; j++) { var cost = a[i - 1] === b[j - 1] ? 0 : 1; row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost); if (row[j] < best) best = row[j]; }
      if (best > max) return false; prev = row;
    }
    return prev[b.length] <= max;
  }
  /* one token against whole words. Word-based, never a blind substring: "go" must not match "reGO". */
  /* pfx = shortest prefix that counts: 3 letters for a finished word, 2 for the word still being typed */
  function tokenScore(token, words, pfx) {
    if (!token) return 0; var best = 0; pfx = pfx || 3;
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (w === token) return 100;
      if (token.length >= pfx && w.indexOf(token) === 0) { best = Math.max(best, 82); continue; }
      if (token.length >= 5 && w.length >= 5) {
        if (withinEdits(token, w, token.length >= 8 ? 2 : 1)) { best = Math.max(best, 68); continue; }
        if (w.indexOf(token) > -1) best = Math.max(best, 55);
      }
    }
    return best;
  }

  /* ── catalogue: /products.json, paged, cached for 30 minutes in sessionStorage ── */
  function strip(html) { return String(html || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' '); }
  function index(items) { catalogue = items; byHandle = {}; items.forEach(function (p) { byHandle[p.handle] = p; }); return items; }
  function loadCatalogue() {
    if (catalogue) return Promise.resolve(catalogue);
    if (catPromise) return catPromise;
    try { var c = JSON.parse(sessionStorage.getItem(CAT_KEY) || 'null'); if (c && c.t && Date.now() - c.t < CAT_TTL && c.items && c.items.length) return Promise.resolve(index(c.items)); } catch (e) {}
    catPromise = (function next(page, items) {
      if (page > 6) return Promise.resolve(items);
      return fetch(root + 'products.json?limit=250&page=' + page, { headers: { Accept: 'application/json' } }).then(function (r) { return r.ok ? r.json() : { products: [] }; }).then(function (b) {
        var batch = (b && b.products) || [];
        batch.forEach(function (p) {
          var vs = p.variants || [], low = null; vs.forEach(function (v) { if (!low || Number(v.price) < Number(low.price)) low = v; });
          var bundle = String(p.product_type || '').toLowerCase() === 'bundle';
          var it = { id: p.id, title: p.title || '', vendor: p.vendor || '', type: p.product_type || '', handle: p.handle || '', url: root + 'products/' + p.handle,
            price: low ? Number(low.price) : 0, compare: low && low.compare_at_price ? Number(low.compare_at_price) : 0, image: (p.images && p.images[0] && p.images[0].src) || '',
            available: vs.some(function (v) { return v && v.available !== false; }), cat: 1 };
          /* a bundle answers a search for what it contains: its words = title + tags + description text */
          if (bundle) it.bw = uniq(wordsOf(p.title + ' ' + (p.tags || []).join(' ') + ' ' + strip(p.body_html)).filter(function (w) { return w.length > 2; })).slice(0, 160).join(' ');
          items.push(it);
        });
        return batch.length < 250 ? items : next(page + 1, items);
      }).catch(function () { return items; });
    })(1, []).then(function (items) {
      index(items);
      try { sessionStorage.setItem(CAT_KEY, JSON.stringify({ t: Date.now(), items: items })); } catch (e) { /* over quota: memory only */ }
      return items;
    });
    return catPromise;
  }
  var isBundle = function (p) { return String(p.type || p.product_type || '').toLowerCase() === 'bundle'; };
  function bundleMeta(p) { var c = byHandle[p.handle]; if (!c || !isBundle(c)) return isBundle(p) ? { words: wordsOf(p.title + ' ' + (p.tags || []).join(' ') + ' ' + strip(p.body)), price: Number(p.price) || 0, compare: Number(p.compare_at_price_max) || 0 } : null;
    return { words: (c.bw || '').split(' '), price: c.price, compare: c.compare }; }

  function search(cfg) {
    var el = cfg.el, q = cfg.q, id = ++latest;
    var excl = String(cfg.exclusive || '').split(',').map(normalise).filter(Boolean);
    var isExcl = function (p) { var v = normalise(p && p.vendor); return !!v && excl.some(function (b) { return v === b || v.indexOf(b) > -1 || b.indexOf(v) > -1; }); };
    if (ctl && ctl.abort) ctl.abort();
    ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var opt = ctl ? { signal: ctl.signal, headers: { Accept: 'application/json' } } : {};
    var url = function (t) { return root + 'search/suggest.json?q=' + encodeURIComponent(t) + '&resources[type]=product,collection,article,page,query&resources[limit]=10&resources[limit_scope]=each&resources[options][unavailable_products]=last&resources[options][fields]=title,product_type,vendor,tag,variants.title'; };
    var get = function (t) { return fetch(url(t), opt).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }); };
    var alt = expandQuery(q);
    return Promise.all([get(q), alt && alt !== normalise(q) ? get(alt).catch(function () { return null; }) : null]).then(function (both) {
      if (id !== latest) return;
      var R = (both[0].resources && both[0].resources.results) || {}, X = (both[1] && both[1].resources && both[1].resources.results) || {};
      var seen = {}; var prods = (R.products || []).concat(X.products || []).filter(function (p) { var k = String(p.id || p.handle); if (seen[k]) return false; seen[k] = 1; return true; });
      render(el, q, prods, R, cfg, isExcl);
    }).catch(function (e) {
      /* a request cancelled by a newer keystroke must never show as "unavailable" */
      if ((e && e.name === 'AbortError') || id !== latest) return;
      if (catalogue && catalogue.length) return render(el, q, [], {}, cfg, isExcl);      // Shopify did not answer: the local index still does
      el.querySelector('[data-r="p"]').innerHTML = '<li class="srch__nil">Live suggestions are not available right now. <a href="' + esc(root + 'search?q=' + encodeURIComponent(q)) + '">Search for “' + esc(q) + '”</a></li>';
      show(el);
    });
  }
  function show(el) { el.querySelector('.srch__empty').hidden = true; el.querySelector('.srch__res').hidden = false; }

  function render(el, query, rawProducts, R, cfg, isExcl) {
    var q = normalise(query), rawTokens = q.split(' ').filter(Boolean);
    /* 17 Nov: the LAST word is still being typed. From 2 letters it counts as a prefix ("caff" = caffeine, "caffeine ca" = capsules);
       a single letter is too little to filter on, so it only nudges the order ("sis g" lifts SiS GO). */
    var tail = '';
    if (rawTokens.length > 1 && rawTokens[rawTokens.length - 1].length === 1) tail = rawTokens.pop();
    var lastAt = rawTokens.length - 1;
    /* a form word, finished or half-typed after another word: "caffeine tab" = caffeine capsules */
    var isForm = function (t, i) { return FORMS.indexOf(t) > -1 || (i === lastAt && i > 0 && t.length >= 2 && FORMS.some(function (f) { return f.indexOf(t) === 0; })); };
    var groups = rawTokens.map(function (t, i) { return isForm(t, i) ? [t].concat(FORMS) : [t].concat((BRAND_ALIASES[t] || []).map(normalise)); });
    var hasForm = rawTokens.some(isForm);
    /* a group = the typed word or what it stands for; a two-word brand name counts only when both words are there */
    var groupScore = function (g, words, gi) { var best = 0; g.forEach(function (variant, vi) { var parts = variant.split(' ').filter(Boolean), low = 100; parts.forEach(function (part) { low = Math.min(low, tokenScore(part, words, gi === lastAt && vi === 0 ? 2 : 3)); }); if (parts.length) best = Math.max(best, low); }); return best; };
    function scoreProduct(p) {
      var titleWords = wordsOf(p.title), brandWords = wordsOf(p.vendor).concat(wordsOf(p.type || p.product_type)).concat(wordsOf(String(p.handle || '').replace(/-/g, ' ')));
      var title = titleWords.join(' '), score = 0, matched = 0, inTitle = 0;
      if (title === q) score += 1200; else if (title.indexOf(q) === 0) score += 700; else if (title.indexOf(q) > -1) score += 450;
      groups.forEach(function (g, gi) {
        var inT = groupScore(g, titleWords, gi), inB = groupScore(g, brandWords, gi);
        if (inT >= 82) inTitle++;
        if (Math.max(inT, inB)) { matched++; score += inT >= inB ? inT : Math.round(inB * 0.7); }
      });
      /* every word the customer typed is accounted for somewhere */
      var all = rawTokens.length > 0 && matched === rawTokens.length;
      if (all) score += 320; else if (rawTokens.length) score -= (rawTokens.length - matched) * 90;
      if (tail && titleWords.some(function (w) { return w.indexOf(tail) === 0; })) score += 40;
      /* prefer the plainest product of an equally-matching set */
      score -= Math.min(titleWords.length, 12) * 2;
      /* a bundle whose contents cover everything typed clears the relevance floor, but stays below a product whose own title matches */
      var bm = bundleMeta(p); p.__bundle = bm; p.__hit = false;
      /* not when a form was typed ("tablets", "capsules"): that customer wants one product, and every description mentions capsules */
      if (bm && rawTokens.length && !hasForm) {
        var bMatched = 0;
        groups.forEach(function (g, gi) { if (groupScore(g, bm.words, gi) >= 68) bMatched++; });
        if (bMatched === rawTokens.length) { score = Math.max(score, 305) + bMatched * 35; p.__hit = true; }
      }
      /* exclusive brands break ties in their favour, never ahead of a better match */
      if (isExcl(p)) score += 45;
      p.__tm = inTitle; p.__all = all;   // __all: the title or brand has every typed word (the last one as a prefix)
      return score;
    }
    /* Shopify may never return the right product: score our own catalogue too and merge what genuinely matches */
    var merged = rawProducts.slice();
    if (catalogue && catalogue.length && rawTokens.length) {
      var seen = {}; merged.forEach(function (p) { seen[String(p.id || p.handle)] = 1; });
      catalogue.map(function (p) { return { p: p, s: scoreProduct(p), all: p.__all }; }).filter(function (e) { return e.s >= 300 || e.all; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 60)
        .forEach(function (e) { var k = String(e.p.id || e.p.handle); if (!seen[k]) { seen[k] = 1; merged.push(e.p); } });
    }
    var scored = merged.map(function (p, i) { var sc = scoreProduct(p); return { p: p, i: i, s: sc, ok: inStock(p), all: p.__all }; });
    var top = scored.length ? Math.max.apply(null, scored.map(function (e) { return e.s; })) : 0;
    var weak = rawTokens.length > 0 && (scored.length === 0 || top < 260) && !!catalogue;
    var real = scored.some(function (e) { return e.s >= 300 || e.all; });
    /* nothing matches every word: show the closest ones (a typed word is in the title) instead of a blank, never unrelated products */
    var close = !real && rawTokens.length > 1 ? scored.filter(function (e) { return e.p.__tm > 0; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 8) : [];
    /* a product named after every typed word is always shown, whatever its score */
    var list = (real ? scored.filter(function (e) { return e.s >= 120 || e.all; }) : close.length ? close : weak ? [] : scored);
    /* in stock first and sold out last; inside each, best match first. One exception: when fewer than three in-stock products are
       named after the search, a sold-out product that IS named after it goes right after them, ahead of bundles that only
       mention the word in their description ("caf" must not bury Caffeine Capsules under pre-workout bundles). */
    var named = list.filter(function (e) { return e.ok && e.all; }).length, few = named < 3;
    var tier = function (e) { return few ? (e.all ? (e.ok ? 0 : 1) : (e.ok ? 2 : 3)) : (e.ok ? 0 : 1); };
    list.sort(function (a, b) { var ta = tier(a), tb = tier(b); if (ta !== tb) return ta - tb; if (b.s !== a.s) return b.s - a.s; return a.i - b.i; });
    /* a bundle that contains what was searched is lifted to position 2 at most */
    var at = -1; list.some(function (e, i) { if (e.p.__hit && e.p.__tm > 0 && e.ok) { at = i; return true; } return false; });   // only a bundle named after what was typed
    if (at > 2 && list.length > 2) list.splice(1, 0, list.splice(at, 1)[0]);

    var out = list.filter(function (e) { return !e.ok; });
    var wa = String(cfg.whatsapp || '').replace(/\D/g, ''), origin = location.origin;
    var line = function (p) { return (p.title || '') + (p.url ? '\n' + origin + String(p.url).split('?')[0] : ''); };
    var waUrl = function (text) { return 'https://wa.me/' + wa + '?text=' + encodeURIComponent(text); };
    var arrow = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width="14" height="14"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var comm = cfg.community ? '<a class="rstk__comm" href="' + esc(cfg.community) + '" target="_blank" rel="noopener">Join the SNH WhatsApp community for restock alerts</a>' : '';
    var CL = window.SNHClean;
    function row(e) {
      var p = e.p, im = (p.featured_image && p.featured_image.url) || p.image || '', base = String(im).split('?')[0].split('/').pop(), img;
      if (CL && CL.l && base && CL.l.indexOf(',' + p.handle + ':' + base + ',') > -1) img = '<img src="' + esc(CL.b + 'pc-' + p.handle + '.webp') + '" alt="" width="64" height="64" loading="lazy" data-no-lift>';
      else img = im ? '<img src="' + esc(sized(im, 240)) + '" alt="" width="64" height="64" loading="lazy" data-v2-lift>' : '<span class="mini__ph"></span>';
      var bm = p.__bundle, price = bm && bm.price ? bm.price : Number(p.price) || 0, save = bm && bm.compare > price ? bm.compare - price : 0;
      var h = '<li><a class="mini mini--s' + (e.ok ? '' : ' is-out') + '" href="' + esc(p.url) + '">' + img +
        '<span class="mini__t">' + (p.vendor && !bm ? '<small class="mini__v">' + esc(p.vendor) + (isExcl(p) ? '<em class="mini__x">Exclusive to SNH</em>' : '') + '</small>' : bm ? '<small class="mini__v">Bundle</small>' : '') + esc(tidy(p.title, p.vendor)) + '</span>' +
        '<span class="mini__p">' + (price ? rs(price) : '') + (save ? '<s>' + rs(bm.compare) + '</s><em class="mini__save">Save ' + rs(save) + '</em>' : '') + (e.ok ? '' : '<em class="mini__out">Out of stock</em>') + '</span></a>';
      if (!e.ok && out.length === 1 && wa) h += '<div class="rstk rstk--row"><a class="rstk__btn" href="' + esc(waUrl('Hi SNH, I want updates on when this is restocked:\n\n' + line(p))) + '" target="_blank" rel="noopener">Update me when restocked ' + arrow + '</a>' + comm + '</div>';
      return h + '</li>';
    }
    var html = list.map(row).join('');
    if (out.length > 1 && wa) html += '<li class="rstk rstk--all"><a class="rstk__btn" href="' + esc(waUrl('Hi SNH, I want updates on when these are restocked:\n\n' + out.map(function (e) { return line(e.p); }).join('\n\n'))) + '" target="_blank" rel="noopener">Update me on all ' + out.length + ' out-of-stock items ' + arrow + '</a>' + comm + '</li>';
    var pl = el.querySelector('[data-r="p"]'), heads = el.querySelectorAll('.srch__res .mz__h');
    pl.innerHTML = html || '<li class="srch__nil">No products match “' + esc(query) + '”. Try a brand, a goal or a supplement type.</li>';
    if (heads[0]) heads[0].textContent = !list.length ? 'Products' : !real && close.length ? 'Closest matches for “' + query + '”' : list.length + (list.length === 1 ? ' result' : ' results') + ' for “' + query + '”';
    var bl = el.querySelector('[data-r="b"]'), bh = el.querySelector('[data-r-h="b"]'); if (bl) { bl.innerHTML = ''; bl.hidden = true; } if (bh) bh.hidden = true;   // bundles are ranked in the one list now

    /* second column: guides & articles, suggested searches, collections & pages */
    var A = (R.articles || []).slice(0, 3), C = (R.collections || []).map(function (c) { return { t: c.title, u: c.url, k: 'Collection' }; }).concat((R.pages || []).map(function (c) { return { t: c.title, u: c.url, k: 'Page' }; })).slice(0, 8), Qs = (R.queries || []).slice(0, 5);
    var cl = el.querySelector('[data-r="c"]'), al = el.querySelector('[data-r="a"]'), col = cl.parentNode;
    var ch = cl.previousElementSibling, ah = al.previousElementSibling;
    if (ch) { ch.textContent = 'Collections & pages'; ch.hidden = !C.length; } cl.hidden = !C.length;
    cl.innerHTML = C.map(function (c) { return '<li><a href="' + esc(c.u) + '">' + esc(c.t) + '<span>' + c.k + '</span></a></li>'; }).join('');
    if (ah) { ah.textContent = 'Guides & articles'; ah.hidden = !A.length; } al.hidden = !A.length;
    al.innerHTML = A.map(function (a) { var im = (a.featured_image && a.featured_image.url) || a.image; return '<li><a class="mini mini--art" href="' + esc(a.url) + '">' + (im ? '<img src="' + esc(sized(im, 240)) + '" alt="" width="64" height="64" loading="lazy">' : '<span class="mini__ph"></span>') + '<span class="mini__t">' + esc(a.title) + '</span><span class="mini__p">Guide</span></a></li>'; }).join('');
    var ql = col.querySelector('[data-r="q"]');
    if (!ql) { col.insertAdjacentHTML('afterbegin', '<p class="mz__h" data-r-h="q">Suggested searches</p><ul class="chips srch__sugg" data-r="q"></ul>'); ql = col.querySelector('[data-r="q"]');
      ql.addEventListener('click', function (ev) { var b = ev.target.closest('[data-sq]'); if (!b) return; var inp = el.querySelector('.srch__field input'); inp.value = b.getAttribute('data-sq'); inp.dispatchEvent(new Event('input', { bubbles: true })); inp.focus(); }); }
    var qs = Qs.map(function (x) { return String(x.text || x.title || '').trim(); }).filter(function (t) { return t && normalise(t) !== q; });
    ql.innerHTML = qs.map(function (t) { return '<li><button type="button" class="chip" data-sq="' + esc(t) + '">' + esc(t) + '</button></li>'; }).join('');
    ql.hidden = !qs.length; col.querySelector('[data-r-h="q"]').hidden = !qs.length;
    col.hidden = !C.length && !A.length && !qs.length;
    var all = el.querySelector('.srch__all');
    all.href = root + 'search?q=' + encodeURIComponent(query) + '&type=product&options%5Bprefix%5D=last&options%5Bunavailable_products%5D=last';
    all.querySelector('span').textContent = 'See all results for “' + query + '”';
    show(el);
  }

  window.SNHSearch = { search: search, load: loadCatalogue, ready: function () { return !!catalogue; },
    /* exported for the product page restock link and for tests */
    _: { normalise: normalise, expandQuery: expandQuery, withinEdits: withinEdits, tokenScore: tokenScore } };
})();
