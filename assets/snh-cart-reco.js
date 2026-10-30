/* SNH cart recommendations (Round 13): a scoring engine for the cart drawer and cart page suggestions.
   Data: snippets/snh-cart-reco prints <script data-cart-reco> (complement map, category → collection map, the
   member's last 10 orders, their goal, the bestsellers / bars collections). assets/snh-cart.js builds the candidate
   pool (the target categories' collections, the bars collections, Shopify recommendations, bestsellers, recently
   viewed) and calls SNHReco.decide(cart, pool, cfg, reco, mode).
   Score per candidate: complement of a cart item +50 · in a bundle with a cart item +40 (shown as the bundle card,
   not here) · member bought this category before +30 · replenishment due (consumable, 25–75 days) +20 · goal +20 ·
   recently viewed +20 · bestseller +10 · ≤ Rs 2,000 +15. Excluded: in the basket, sold out, bundle products,
   priced ≥ the subtotal, non-consumables bought in the last 30 days. Free delivery stays proportional: a small gap
   (≤ max(Rs 3,000, 25 % of subtotal)) → items priced gap … gap + Rs 1,500; otherwise a round price cap
   (Rs 1,500 / 2,000 / 3,000 by basket size). One item per category, max 3, always one bar/snack ≤ Rs 1,500 when one
   is in stock. Also records recently viewed products (localStorage snh_rv). Pure: SNHReco.decide / detect (QA). */
(function () {
  if (window.SNHReco) return;
  var ORDER = [
    ['accessories', /\b(shakers?|bottles?|tumblers?|flasks?|straps?|wraps?|belts?|towels?|bags?|cups?)\b|accessor/],
    ['bars-snacks', /\b(bars?|snacks?|cookies?|wafers?|chips|crisps|treats?|brownies?|flapjacks?)\b/],
    ['oats', /\boats?\b/],
    ['gels', /\bgels?\b|\bchews?\b/],
    ['electrolytes', /electrolyte|\bhydro\b|hydration|isotonic|\bsalts?\b/],
    ['creatine', /creatine/],
    ['mass-gainer', /gainer|serious mass|\bmass\b/],
    ['pre-workout', /pre-?\s?workout|\bpump\b|\bstim\b/],
    ['bcaa-eaa', /\bbcaa|\beaa|amino|glutamine/],
    ['collagen', /collagen/],
    ['omega', /omega|fish oil|krill/],
    ['magnesium', /magnesium/],
    ['probiotics', /probiotic|\bgut\b/],
    ['isolate', /isolate|\biso\b|clear (whey|protein)|hydroly/],
    ['whey', /whey|casein|\bprotein\b/],
    ['vitamins', /vitamin|multi|\bzinc\b|\biron\b|calcium|mineral|wellness/]
  ];
  var NAME = { accessories: 'shaker', 'bars-snacks': 'protein snack', oats: 'oats', gels: 'gels', electrolytes: 'electrolytes', creatine: 'creatine', 'mass-gainer': 'mass gainer', 'pre-workout': 'pre-workout', 'bcaa-eaa': 'aminos', collagen: 'collagen', omega: 'omega-3', magnesium: 'magnesium', probiotics: 'probiotics', isolate: 'isolate', whey: 'whey', vitamins: 'vitamins' };
  var GOALS = { 'build-muscle': ['whey', 'isolate', 'creatine', 'mass-gainer', 'bars-snacks'], 'lose-fat': ['isolate', 'bars-snacks', 'bcaa-eaa'], endurance: ['gels', 'electrolytes', 'bars-snacks'], 'hydration-recovery': ['electrolytes', 'bcaa-eaa'], 'daily-health': ['vitamins', 'omega', 'magnesium', 'probiotics', 'collagen'], 'sport-specific': ['creatine', 'electrolytes', 'pre-workout'] };
  var DAY = 864e5;

  function detect(p) {
    var a = ((p.type || '') + ' ' + (p.title || '')).toLowerCase(), b = String(p.tags || '').toLowerCase();
    if (/^bundle\b/.test(String(p.type || '').toLowerCase())) return 'bundle';
    for (var i = 0; i < ORDER.length; i++) if (ORDER[i][1].test(a)) return ORDER[i][0];
    for (var j = 0; j < ORDER.length; j++) if (ORDER[j][1].test(b)) return ORDER[j][0];
    return '';
  }
  // "creatine => pre-workout, bars-snacks" per line ('*' = any basket)
  function parseMap(text) {
    return String(text || '').split(/\r?\n|\\n/).map(function (l) {
      var a = l.split('=>'); if (a.length !== 2) return null;
      var list = function (s) { return s.split(',').map(function (x) { return x.trim().toLowerCase(); }).filter(Boolean); };
      return { from: list(a[0]), to: list(a[1]) };
    }).filter(Boolean);
  }
  function rsTxt(rupees) { return 'Rs ' + Number(rupees).toLocaleString('en-US'); }

  function decide(cart, pool, cfg, reco, mode) {
    reco = reco || {}; var s = cfg.sugg || {};
    var sub = cart.total_price, gap = cfg.threshold - sub, unlocked = gap <= 0 || gap <= cfg.tolerance, now = reco.now || Date.now();
    var max = mode === 'drawer' ? (s.max || 3) : Math.max(4, s.max || 3);
    var inCart = {}, cartCats = {};
    cart.items.forEach(function (it) {
      inCart[it.product_id] = 1;
      var c = it.__cat || detect({ type: it.product_type, title: it.product_title, tags: it.__tags });
      if (c && c !== 'bundle') cartCats[c] = cartCats[c] || it;
    });
    var comp = {};   // target category → the basket category it goes with
    parseMap(reco.complements).forEach(function (r) {
      r.from.forEach(function (f) {
        if (f !== '*' && !cartCats[f]) return;
        r.to.forEach(function (t) { if (!comp[t] || f !== '*') comp[t] = comp[t] && comp[t] !== '*' ? comp[t] : f; });
      });
    });
    // member history: categories bought, products bought (days ago)
    var histCat = {}, bought = {};
    (reco.history || []).forEach(function (h) {
      var days = Math.floor((now - Date.parse(h.d)) / DAY); if (isNaN(days)) return;
      var c = detect({ type: h.type, title: h.t, tags: h.tags });
      if (c) histCat[c] = Math.min(histCat[c] == null ? 1e9 : histCat[c], days);
      if (h.p) bought[h.p] = Math.min(bought[h.p] == null ? 1e9 : bought[h.p], days);
    });
    var goalCats = GOALS[reco.goal] || [];
    var best = {}; (pool.best || []).forEach(function (p) { best[p.id] = 1; });
    var viewed = {}; (pool.viewed || []).forEach(function (p) { viewed[p.id] = 1; });
    var bundled = {};
    (cfg.bundles || []).forEach(function (b) { if (b.items.some(function (x) { return inCart[x.pid]; })) b.items.forEach(function (x) { if (!inCart[x.pid]) bundled[x.pid] = b.title; }); });

    var closeLimit = Math.max((s.closeMin || 3000) * 100, sub * (s.closePct || 25) / 100);
    var close = !unlocked && gap <= closeLimit;
    var lo = gap, hi = gap + (s.band || 1500) * 100;
    var capR = unlocked ? 3000 : sub < 5000 * 100 ? 1500 : sub < 12000 * 100 ? 2000 : 3000;   // round caps only
    var ex = { inCart: 0, soldOut: 0, bundle: 0, overSubtotal: 0, boughtRecently: 0, overCap: 0, inBundleOffer: 0 };
    var seen = {}, scored = [];
    [].concat(pool.cat || [], pool.bars || [], pool.comp || [], pool.related || [], pool.best || [], pool.viewed || [], pool.addons || []).forEach(function (p) {
      if (seen[p.id]) return; seen[p.id] = 1;
      var cat = p.cat || detect(p);
      if (inCart[p.id]) return ex.inCart++;
      if (p.soldOut || !p.vid) return ex.soldOut++;
      if (cat === 'bundle') return ex.bundle++;
      if (p.price >= sub) return ex.overSubtotal++;
      if (bought[p.id] != null && bought[p.id] <= 30 && cat === 'accessories') return ex.boughtRecently++;
      if (bundled[p.id]) return ex.inBundleOffer++;   // the bundle card offers it
      var fits = close ? p.price >= lo && p.price <= hi : p.price <= capR * 100;
      var bar = cat === 'bars-snacks' && p.price <= 1500 * 100;
      if (!fits && !bar) return ex.overCap++;
      var sc = 0, why = [];
      var add = function (n, label, key) { sc += n; why.push({ n: n, label: label, key: key }); };
      if (comp[cat]) add(50, comp[cat] === '*' || !cartCats[comp[cat]] ? (cat === 'bars-snacks' ? 'Try a protein bar' : 'Goes with your order') : 'Goes with your ' + NAME[comp[cat]], 'complement');
      if (histCat[cat] != null) add(30, 'From your usual stack', 'history');
      if (bought[p.id] != null && bought[p.id] >= 25 && bought[p.id] <= 75 && cat !== 'accessories') add(20, 'Time to restock', 'restock');
      if (goalCats.indexOf(cat) > -1) add(20, 'For your goal', 'goal');
      if (viewed[p.id]) add(20, 'You looked at this', 'viewed');
      if (best[p.id]) add(10, cfg.member ? 'Popular with members' : 'Bestseller', 'bestseller');
      if (p.price <= 2000 * 100) add(15, '', 'low');
      if (close && fits) add(25, 'Unlocks free delivery', 'close');
      var top = why.filter(function (w) { return w.label; }).sort(function (a, b) { return b.n - a.n; })[0];
      scored.push({ p: p, cat: cat, score: sc, label: top ? top.label : '', fits: fits, why: why.map(function (w) { return w.key + '+' + w.n; }).join(' ') });
    });
    scored.sort(function (a, b) { return b.score - a.score || a.p.price - b.p.price; });
    var picked = [], used = {};
    scored.forEach(function (x) { if (picked.length >= max || used[x.cat] || !x.fits || x.score < 15) return; used[x.cat] = 1; picked.push(x); });
    // always one bar / snack ≤ Rs 1,500 when one is in stock
    if (!used['bars-snacks']) {
      var b = scored.filter(function (x) { return x.cat === 'bars-snacks' && x.p.price <= 1500 * 100; })[0];
      if (b) { if (!b.label) b.label = 'Try a protein bar'; if (picked.length >= max) picked.pop(); picked.push(b); }
    }
    var head = close ? 'Close the gap to free delivery' : unlocked ? 'Free delivery is on. Add a little extra' : 'Goes with your order';
    var log = { subtotal: sub / 100, threshold: cfg.threshold / 100, gap: Math.max(0, gap) / 100, rule: close ? 'close' : unlocked ? 'unlocked' : 'addons',
      window: close ? [lo / 100, hi / 100] : null, cap: close ? null : capR, cartCats: Object.keys(cartCats), member: !!cfg.member, history: Object.keys(histCat), goal: reco.goal || '',
      pool: scored.length, excluded: ex, picked: picked.map(function (x) { return x.p.title + ' @' + x.p.price / 100 + ' [' + x.cat + ' ' + x.score + ': ' + x.why + '] "' + x.label + '"'; }) };
    return { rule: log.rule, head: head, cap: close ? '' : 'under ' + rsTxt(capR), items: picked.map(function (x) { return Object.assign({ why: x.label, cat: x.cat }, x.p); }), log: log, targets: Object.keys(comp) };
  }

  // recently viewed: product pages record their handle (newest first, 8 max)
  function viewedHandles() { try { return JSON.parse(localStorage.getItem('snh_rv') || '[]'); } catch (e) { return []; } }
  var m = location.pathname.match(/\/products\/([^/?#]+)/);
  if (m) try { var l = viewedHandles().filter(function (h) { return h !== m[1]; }); l.unshift(m[1]); localStorage.setItem('snh_rv', JSON.stringify(l.slice(0, 8))); } catch (e) {}

  window.SNHReco = { decide: decide, detect: detect, parseMap: parseMap, viewed: viewedHandles, NAME: NAME };
})();
