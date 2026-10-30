/* SNH cart (Round 11): one renderer for the cart drawer (sections/cart-drawer) and the cart page (sections/main-cart).
   Renders from /cart.js JSON (the first paint uses the cart JSON printed by snippets/snh-cart-cfg), so it re-renders
   instantly on every change and can be tested with a mocked /cart.js.
   - free-delivery bar (unlocked state; within the tolerance the bar hides, as in your old drawer)
   - auto-discount banner (cart-level and line discounts by title)
   - lines: pack shot, brand, name, variant, subscription label, saving tags (Bundle saving / Member price / the
     discount), qty stepper, remove, line price + compare-at (from /products/<handle>.js, cached)
   - suggestions (Round 12, Theme settings → SNH cart suggestions), decided on every render:
       gap ≤ max(Rs 3,000, 25% of subtotal) → "Close the gap": priced gap … gap + Rs 1,500, cheapest first;
       bigger gap (or unlocked) → add-ons under min(Rs 2,000, 15% of subtotal), "Cart add-ons" collection first,
       else recommendations; plus one complementary item (pair rules) under 20% of subtotal. Never in-cart, sold
       out or priced ≥ the subtotal; at most 3 in the drawer. The decision path is in data-cart-decision (JSON).
   - bundle offer (an in-cart product is in a bundle_N offer) as one collapsed row · picks only in the empty basket
   - one footer (drawer + page): savings, total, points (one line), Secure checkout (button[name=checkout], so the
     Koko router still intercepts it), Koko 3× with the logo, payment logos (Visa, Mastercard, Amex, Koko, COD)
   Page mode adds what sections/main-cart asks for (offers, tier progress, empty-state plan CTA).
   Never adds anything by itself; every add is a shopper's tap. */
(function () {
  if (window.__snhCart) return;
  window.__snhCart = true;
  var root = (window.Shopify && Shopify.routes && Shopify.routes.root) || '/';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var LOW = /\b(bar|bars|snack|chips|crisps|cookie|wafer|gel|gels|chew|shaker|bottle|drink|rtd|sachet|tablets?)\b/i;
  var productCache = {}, listCache = {};
  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return [].slice.call((el || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rs(cents) { return 'Rs ' + Math.round(Number(cents || 0) / 100).toLocaleString('en-US'); }
  function rsUp(cents) { return 'Rs ' + Math.max(0, Math.ceil(Number(cents || 0) / 100)).toLocaleString('en-US'); }
  function img(url, w) { if (!url) return ''; url = typeof url === 'string' ? url : (url.src || url.url || ''); return url + (url.indexOf('?') > -1 ? '&' : '?') + 'width=' + w; }
  function shortTitle(t, v) { if (!v) return t; var re = new RegExp('^' + v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '( NUTRITION)?\\s+', 'i'); return t.replace(re, '') || t; }
  function framed(u) { return /sportsnutritionhub|snh-frame/i.test(u || ''); }
  function cents(p) { return typeof p === 'string' ? Math.round(parseFloat(p) * 100) : Number(p || 0); }
  function json(url) { return fetch(url, { headers: { Accept: 'application/json' } }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  var icons = {
    truck: '<svg viewBox="0 0 24 24" fill="none"><path d="M3 6.5h11v10H3zM14 9.5h4l3 3v4h-7" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="7" cy="17.5" r="1.8" stroke="currentColor" stroke-width="1.8"/><circle cx="17" cy="17.5" r="1.8" stroke="currentColor" stroke-width="1.8"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none"><path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    tag: '<svg viewBox="0 0 24 24" fill="none"><path d="M3.5 12.5v-8h8l9 9-8 8-9-9Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="8" cy="8" r="1.4" fill="currentColor"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" fill="none"><path d="m13 2-9 12h8l-1 8 9-12h-8l1-8Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none"><rect x="4.5" y="10" width="15" height="10.5" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10" stroke="currentColor" stroke-width="1.8"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none"><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" fill="currentColor"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3 5 6v5c0 4.4 3 8.3 7 9.5 4-1.2 7-5.1 7-9.5V6l-7-3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="m9 12 2 2 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  function Cart(el) {
    this.el = el;
    this.mode = el.getAttribute('data-mode') || 'drawer';
    try { this.cfg = JSON.parse($('[data-cart-cfg]', el).textContent); } catch (e) { this.cfg = {}; }
    try { this.cart = JSON.parse($('[data-cart-initial]', el).textContent); } catch (e) { this.cart = null; }
    this.body = $('[data-cart-body]', el);
    this.foot = $('[data-cart-foot]', el);
    this.busy = false;
    var self = this;
    el.addEventListener('click', function (e) { self.click(e); });
    if (this.cart) this.render(this.cart);
    else this.refresh();
  }
  Cart.prototype.refresh = function () {
    var self = this;
    return json(root + 'cart.js').then(function (c) { self.render(c); return c; });
  };

  /* ---------- render ---------- */
  Cart.prototype.render = function (cart) {
    var self = this, c = this.cfg;
    this.cart = cart;
    $$('[data-cart-count]', this.el.closest('section, x-drawer') || this.el).forEach(function (n) { n.textContent = cart.item_count; });
    if (!cart.item_count) {
      this.body.innerHTML = '<div class="scd__empty"><p class="scd__empty-h">Your basket is empty</p><p>Add your favourites and they\'ll appear here instantly.</p>' +
        '<div class="scd__empty-cta"><a class="v-btn v-btn--accent" href="' + esc(c.shop) + '"><span>Start shopping</span></a><a class="v-btn v-btn--line" href="' + esc(c.plan) + '"><span>Build your plan</span></a></div></div>' +
        '<section class="scd__block" data-cart-picks></section>';
      this.foot.hidden = true;
      var eb = $('[data-cart-bar]', this.el); if (eb) eb.innerHTML = '';
      this.el.removeAttribute('data-cart-decision');
      if (this.mode === 'page') this.pageExtras(cart);
      this.picks(cart);
      this.emit('render', cart);
      return;
    }
    this.foot.hidden = false;
    var gap = c.threshold - cart.total_price, waived = gap > 0 && gap <= c.tolerance, unlocked = gap <= 0 || waived;
    var pct = Math.max(4, Math.min(100, Math.round(cart.total_price / c.threshold * 100)));
    var bar = '<div class="sfree' + (unlocked ? ' is-on' : '') + '" role="status">' +
      '<p class="sfree__t">' + (unlocked ? icons.check + '<b>Free delivery unlocked</b>' : icons.truck + '<span><b>' + rsUp(gap) + '</b> to free delivery</span>') + '<span class="sfree__th">' + rs(c.threshold) + '</span></p>' +
      '<div class="sfree__bar"><i style="width:' + (unlocked ? 100 : pct) + '%"></i></div></div>';
    // discounts: cart-level applications + line discounts, by title
    var disc = {};
    (cart.cart_level_discount_applications || []).forEach(function (d) { disc[d.title] = (disc[d.title] || 0) + Number(d.total_allocated_amount || 0); });
    cart.items.forEach(function (it) { (it.line_level_discount_allocations || []).forEach(function (a) { var t = a.discount_application && a.discount_application.title || 'Discount'; disc[t] = (disc[t] || 0) + Number(a.amount || 0); }); });
    var dkeys = Object.keys(disc).filter(function (k) { return disc[k] > 0; });
    var banner = dkeys.length ? '<div class="sdisc" role="status">' + icons.tag + '<p><b>' + esc(dkeys.join(' + ')) + '</b> applied automatically · you save ' + rs(dkeys.reduce(function (s, k) { return s + disc[k]; }, 0)) + '</p></div>' : '';
    var lines = '<ul class="slines" role="list">' + cart.items.map(function (it, i) { return self.line(it, i + 1); }).join('') + '</ul>';
    this.body.innerHTML = banner + lines + '<section class="scd__block" data-cart-sugg hidden></section><details class="sbd" data-cart-bundle hidden></details>';
    var pb = $('[data-cart-bar]', this.el); if (pb) pb.innerHTML = bar;
    this.summary(cart, disc);
    this.enrich(cart);
    this.suggest(cart);
    this.bundle(cart);
    if (this.mode === 'page') this.pageExtras(cart);
    this.emit('render', cart);
  };

  /* ---------- cart page extras: complete your stack, bundle swaps, try something new, delivery date ---------- */
  Cart.prototype.pageData = function () {
    if (this.__pd) return this.__pd;
    try { this.__pd = JSON.parse($('[data-cart-page-data]', this.el.closest('section') || document).textContent); } catch (e) { this.__pd = { bundles: [], 'try': [] }; }
    return this.__pd;
  };
  Cart.prototype.pageExtras = function (cart) {
    var self = this, d = this.pageData(), empty = !cart.item_count, inCart = {};
    (cart.items || []).forEach(function (it) { inCart[it.product_id] = 1; });
    ['stack', 'swap', 'try'].forEach(function (k) { var b = $('[data-cart-' + k + ']', self.el); if (b && empty) { b.hidden = true; b.innerHTML = ''; } });
    // delivery estimate: Colombo same day; elsewhere 2–3 working days (Mon–Sat)
    var eta = $('[data-cart-eta] span', this.el.closest('section') || document);
    if (eta) {
      var dd = new Date(), n = 0; while (n < 3) { dd.setDate(dd.getDate() + 1); if (dd.getDay() !== 0) n++; }
      eta.innerHTML = 'Colombo: <b>same-day delivery</b> · Rest of Sri Lanka: <b>by ' + dd.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + '</b> (2–3 working days)';
    }
    if (empty) return;
    // complete your stack: Shopify's complementary / related products for the basket
    var stack = $('[data-cart-stack]', this.el);
    if (stack) {
      Promise.all(cart.items.slice(0, 3).map(function (it) {
        var k = 'rec_' + it.product_id;
        if (!listCache[k]) listCache[k] = Promise.all(['complementary', 'related'].map(function (intent) { return json(root + 'recommendations/products.json?product_id=' + it.product_id + '&limit=10&intent=' + intent).then(function (j) { return j.products || []; }).catch(function () { return []; }); })).then(function (two) { return two[0].concat(two[1]); });
        return listCache[k];
      })).then(function (sets) {
        var seen = {}, out = [];
        sets.forEach(function (s) { s.forEach(function (p) { if (seen[p.id] || inCart[p.id] || p.available === false) return; seen[p.id] = 1; var v = (p.variants || []).filter(function (x) { return x.available !== false; })[0]; if (v) out.push({ id: p.id, vid: v.id, title: p.title, vendor: p.vendor, price: cents(v.price), image: p.featured_image || (p.images && p.images[0]) || '', url: '/products/' + p.handle, multi: (p.variants || []).length > 1 }); }); });
        out = out.slice(0, 4);
        if (!out.length) { stack.hidden = true; return; }
        stack.innerHTML = '<h2 class="scp__bt">Complete your <em>stack</em></h2><ul class="sminis sminis--grid" role="list">' + out.map(function (p) { return self.mini(p, ''); }).join('') + '</ul>';
        stack.hidden = false;
      });
    }
    // bundle swaps: a bundle whose description names an in-cart product's base name ("critical whey protein")
    var swap = $('[data-cart-swap]', this.el);
    if (swap) {
      var cards = [];
      cart.items.forEach(function (it) {
        var words = shortTitle(it.product_title, it.vendor).split(' '), base = [];
        for (var i = 0; i < words.length && !/\d/.test(words[i]); i++) base.push(words[i]);
        var b = base.join(' ').toLowerCase();
        if (b.length < 6) return;
        var hit = (d.bundles || []).filter(function (x) { return !inCart[x.id] && x.d.indexOf(b) > -1; }).sort(function (a, c) { return c.s - a.s; })[0];
        if (hit && !cards.some(function (c) { return c.hit.id === hit.id; })) cards.push({ it: it, hit: hit });
      });
      cards = cards.slice(0, 2);
      if (!cards.length) { swap.hidden = true; swap.innerHTML = ''; }
      else {
        swap.innerHTML = '<h2 class="scp__bt">Swap to a <em>bundle</em></h2>' + cards.map(function (c) {
          return '<div class="sbundle"><img src="' + esc(c.hit.i) + '" alt="" width="64" height="64" loading="lazy"><div><p class="sbundle__eb">Bundle swap</p><p class="sbundle__t">' + esc(shortTitle(c.it.product_title, c.it.vendor)) + ' comes in the <b>' + esc(c.hit.t) + '</b>' + (c.hit.s ? '. Swap to the bundle and save <b>' + rs(c.hit.s) + '</b>' : '') + '.</p></div>' +
            (c.hit.v ? '<button type="button" class="v-btn v-btn--accent v-btn--sm" data-add="' + c.hit.v + ':1"><span>Add bundle · ' + rs(c.hit.p) + '</span></button>' : '<a class="v-btn v-btn--accent v-btn--sm" href="' + esc(c.hit.u) + '"><span>See bundle · ' + rs(c.hit.p) + '</span></a>') + '</div>';
        }).join('');
        swap.hidden = false;
      }
    }
    // try something new: bars and snacks not ordered before (server list) and not in the basket
    var tr = $('[data-cart-try]', this.el);
    if (tr) {
      var list = (d['try'] || []).filter(function (p) { return !inCart[p.id]; }).slice(0, 4);
      if (!list.length) { tr.hidden = true; tr.innerHTML = ''; }
      else { tr.innerHTML = '<h2 class="scp__bt">Try something <em>new</em></h2><ul class="sminis sminis--grid" role="list">' + list.map(function (p) { return self.mini(p, ''); }).join('') + '</ul>'; tr.hidden = false; }
    }
  };
  Cart.prototype.line = function (it, n) {
    var sub = it.selling_plan_allocation && it.selling_plan_allocation.selling_plan ? it.selling_plan_allocation.selling_plan.name : '';
    var tags = [];
    (it.line_level_discount_allocations || []).forEach(function (a) {
      var t = (a.discount_application && a.discount_application.title) || '';
      if (/bundle/i.test(t)) tags.push('Bundle saving'); else if (/member|elite/i.test(t)) tags.push('Member price'); else if (t) tags.push(t);
    });
    if (/bundle/i.test(it.product_type || '') && tags.indexOf('Bundle saving') < 0) tags.push('Bundle');
    var variant = it.variant_title && it.variant_title !== 'Default Title' ? it.variant_title : '';
    var was = it.original_line_price > it.final_line_price ? it.original_line_price : 0;
    return '<li class="sline" data-line="' + n + '" data-key="' + esc(it.key) + '" data-handle="' + esc(it.handle) + '" data-vid="' + it.variant_id + '">' +
      '<a class="sline__img' + (framed(it.image) ? ' is-framed' : '') + '" href="' + esc(it.url) + '" tabindex="-1">' + (it.image ? '<img src="' + esc(img(it.image, 200)) + '" alt="" width="88" height="88" loading="lazy">' : '') + '</a>' +
      '<div class="sline__b">' +
        '<p class="sline__brand">' + esc(it.vendor) + '</p>' +
        '<a class="sline__t" href="' + esc(it.url) + '">' + esc(shortTitle(it.product_title, it.vendor)) + '</a>' +
        (variant ? '<p class="sline__v">' + esc(variant) + '</p>' : '') +
        (sub ? '<p class="sline__sub">' + icons.bolt + esc(sub) + '</p>' : '') +
        (tags.length ? '<p class="sline__tags">' + tags.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</p>' : '') +
        '<div class="sline__row">' +
          '<div class="sqty" role="group" aria-label="Quantity of ' + esc(it.product_title) + '"><button type="button" data-qty="' + (it.quantity - 1) + '" aria-label="One fewer">−</button><span aria-live="polite">' + it.quantity + '</span><button type="button" data-qty="' + (it.quantity + 1) + '" aria-label="One more">+</button></div>' +
          '<button type="button" class="sline__rm" data-qty="0" aria-label="Remove ' + esc(it.product_title) + '">' + icons.trash + '</button>' +
          '<p class="sline__p"><b>' + rs(it.final_line_price) + '</b><s data-was>' + (was ? rs(was) : '') + '</s></p>' +
        '</div>' +
      '</div></li>';
  };
  // compare-at prices aren't in /cart.js: one /products/<handle>.js per product (cached) fills the "was" price
  Cart.prototype.enrich = function (cart) {
    var self = this;
    cart.items.forEach(function (it) {
      self.product(it.handle).then(function (p) {
        var v = (p.variants || []).filter(function (x) { return x.id === it.variant_id; })[0];
        var cmp = v && cents(v.compare_at_price);
        var li = $('.sline[data-key="' + (window.CSS && CSS.escape ? CSS.escape(it.key) : it.key) + '"]', self.el);
        if (!li || !cmp || cmp * it.quantity <= it.final_line_price) return;
        var s = $('[data-was]', li);
        if (s && !s.textContent) s.textContent = rs(cmp * it.quantity);
        it.__cmp = cmp * it.quantity;
        self.summary(self.cart);
      }).catch(function () {});
    });
  };
  Cart.prototype.product = function (handle) {
    if (!productCache[handle]) productCache[handle] = json(root + 'products/' + encodeURIComponent(handle) + '.js');
    return productCache[handle];
  };

  // one footer for the drawer and the page: savings, total, points (one line), Secure checkout, Koko, payment logos
  Cart.prototype.summary = function (cart) {
    var c = this.cfg;
    var lineSave = 0;
    cart.items.forEach(function (it) { var base = Math.max(it.__cmp || 0, it.original_line_price || 0); lineSave += Math.max(0, base - it.final_line_price); });
    var cartSave = (cart.cart_level_discount_applications || []).reduce(function (s, d) { return s + Number(d.total_allocated_amount || 0); }, 0);
    var save = lineSave + cartSave;
    var pts = Math.floor(cart.total_price / 100 * (c.member ? c.rate : c.baseRate) / 100);
    var gap = c.threshold - cart.total_price, free = gap <= 0 || gap <= c.tolerance;
    var tier = '';
    if (this.mode === 'page' && c.member) {
      var after = c.spend + cart.total_price / 100, next = c.spend < c.silver ? ['Silver', c.silver] : c.spend < c.gold ? ['Gold', c.gold] : null;
      if (next) tier = '<p class="sft__line">' + icons.bolt + '<span>' + (after >= next[1] ? 'This order takes you to <b>' + next[0] + '</b>' : rs((next[1] - after) * 100) + ' more to <b>' + next[0] + '</b> after this order') + '</span></p>';
    }
    var points = '<p class="sft__line">' + icons.bolt + (c.member ? '<span>Earn <b>' + pts.toLocaleString('en-US') + ' points</b> · ' + esc(c.tier) + ' ' + c.rate + '%</span>' : '<span><a href="' + esc(c.login) + '" data-account-open>Sign in</a> to earn <b>' + pts.toLocaleString('en-US') + ' points</b></span>') + '</p>';
    this.foot.innerHTML =
      (save ? '<p class="sft__save">' + icons.tag + '<span>You save <b>' + rs(save) + '</b></span></p>' : '') +
      '<div class="sft__tot"><span>Total<small>' + (free ? 'Free delivery' : 'Delivery at checkout') + ' · taxes included</small></span><b>' + rs(cart.total_price) + '</b></div>' +
      points + tier +
      '<form action="' + esc(c.cartUrl) + '" method="post" class="ssum__go"><button type="submit" name="checkout" class="scheck">' + icons.lock + '<span>Secure checkout</span></button></form>' +
      '<p class="sft__koko">or 3 × <b>' + rs(Math.ceil(cart.total_price / 3)) + '</b> interest-free with <img src="https://paykoko.com/img/logo1.7ff549c0.png" alt="Koko" width="40" height="13" loading="lazy"></p>' +
      this.payRow() +
      (c.rating ? '<p class="sft__rate">' + icons.star + '<span>' + esc(c.rating) + '</span></p>' : '');
  };
  Cart.prototype.payRow = function () {
    if (this.__pay == null) { var t = $('[data-cart-pay]', this.el); this.__pay = t ? t.innerHTML : ''; }
    return this.__pay;
  };

  /* ---------- suggestions: the pool (add-ons collection, recommendations, picks), then one decision ---------- */
  function norm(p, src) {
    var vs = (p.variants || []).filter(function (v) { return v.available !== false && cents(v.price) > 0; }).sort(function (a, b) { return cents(a.price) - cents(b.price); });
    var v = vs[0] || (p.variants || [])[0] || {};
    var im = (v.featured_image && v.featured_image.src) || (p.images && p.images[0] && (p.images[0].src || p.images[0])) || p.featured_image || '';
    return { id: p.id, vid: v.id, handle: p.handle, title: p.title, vendor: p.vendor, type: p.product_type || p.type || '', tags: [].concat(p.tags || []).join(' '), price: cents(v.price), soldOut: !vs.length || p.available === false, image: im, url: '/products/' + p.handle, multi: (p.variants || []).length > 1, src: src };
  }
  function recs(id, intent) {
    var k = 'rec_' + intent + '_' + id;
    return listCache[k] || (listCache[k] = json(root + 'recommendations/products.json?product_id=' + id + '&limit=10&intent=' + intent).then(function (j) { return j.products || []; }).catch(function () { return []; }));
  }
  Cart.prototype.pool = function (cart) {
    var c = this.cfg, key = 'snh_addons_' + c.addons, ids = cart.items.slice(0, 3).map(function (it) { return it.product_id; });
    var addons = c.addons ? (listCache[key] || (listCache[key] = json(root + 'collections/' + encodeURIComponent(c.addons) + '/products.json?limit=250').then(function (j) { return j.products || []; }).catch(function () { return []; }))) : Promise.resolve([]);
    return Promise.all([
      addons,
      Promise.all(ids.map(function (id) { return recs(id, 'complementary'); })),
      Promise.all(ids.map(function (id) { return recs(id, 'related'); })),
      this.picksList()
    ]).then(function (r) {
      var flat = function (a) { return [].concat.apply([], a); };
      return { addons: r[0].map(function (p) { return norm(p, 'addons'); }), comp: flat(r[1]).map(function (p) { return norm(p, 'complementary'); }), related: flat(r[2]).map(function (p) { return norm(p, 'related'); }), picks: r[3].map(function (p) { return norm(p, 'picks'); }) };
    });
  };
  // pure: cart + pool → { rule, items, comp, log }. Exported as SNHCart.decide for QA.
  function decide(cart, pool, c, mode) {
    var s = c.sugg || {}, sub = cart.total_price, gap = c.threshold - sub, unlocked = gap <= 0 || gap <= c.tolerance;
    var inCart = {}, ex = { inCart: 0, soldOut: 0, overSubtotal: 0 };
    cart.items.forEach(function (it) { inCart[it.product_id] = 1; });
    function clean(list) {
      var seen = {};
      return list.filter(function (p) {
        if (seen[p.id]) return false; seen[p.id] = 1;
        if (inCart[p.id]) { ex.inCart++; return false; }
        if (p.soldOut || !p.vid) { ex.soldOut++; return false; }
        if (p.price >= sub) { ex.overSubtotal++; return false; }
        return true;
      });
    }
    var all = clean(pool.addons.concat(pool.comp, pool.related, pool.picks));
    var max = mode === 'drawer' ? (s.max || 3) : Math.max(4, s.max || 3);
    var closeLimit = Math.max((s.closeMin || 3000) * 100, sub * (s.closePct || 25) / 100);
    var log = { subtotal: sub / 100, threshold: c.threshold / 100, gap: Math.max(0, gap) / 100, closeLimit: Math.round(closeLimit) / 100, pool: all.length, excluded: ex };
    var rule, list;
    if (!unlocked && gap <= closeLimit) {
      var lo = gap, hi = gap + (s.band || 1500) * 100;
      rule = 'close';
      log.window = [lo / 100, hi / 100];
      list = all.filter(function (p) { return p.price >= lo && p.price <= hi; }).sort(function (a, b) { return a.price - b.price; });
    } else {
      rule = unlocked ? 'addons-unlocked' : 'addons';
      var cap = Math.min((s.addonMax || 2000) * 100, sub * (s.addonPct || 15) / 100);
      log.cap = Math.floor(cap) / 100;
      var under = function (p) { return p.price <= cap; };
      var low = function (p) { return LOW.test(p.title + ' ' + p.type) ? 0 : 1; };
      var fromAddons = all.filter(function (p) { return p.src === 'addons' && under(p); });
      log.source = fromAddons.length ? 'addons collection' : 'recommendations';
      list = (fromAddons.length ? fromAddons : all.filter(under)).sort(function (a, b) { return low(a) - low(b) || a.price - b.price; });
    }
    // one complementary item: a pair rule (creatine → shaker) first, else Shopify's complementary pick, under the cap
    var compCap = sub * (s.compPct || 20) / 100, comp = null, why = '';
    log.compCap = Math.floor(compCap) / 100;
    var rules = String(s.pairs || '').split(/\r?\n|\\n/).map(function (l) { var a = l.split('=>'); return a.length === 2 ? { from: a[0].split(',').map(function (x) { return x.trim().toLowerCase(); }).filter(Boolean), to: a[1].split(',').map(function (x) { return x.trim().toLowerCase(); }).filter(Boolean) } : null; }).filter(Boolean);
    var hay = function (p) { return (p.title + ' ' + p.type + ' ' + p.tags).toLowerCase(); };
    var has = function (text, w) { return new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + 's?\\b').test(text); };
    var okComp = function (p) { return p.price <= compCap; };
    cart.items.some(function (it) {
      var t = (it.product_title + ' ' + (it.product_type || '')).toLowerCase();
      return rules.some(function (r) {
        var f = r.from.filter(function (w) { return has(t, w); })[0];
        if (!f) return false;
        var m = all.filter(function (p) { return okComp(p) && r.to.some(function (w) { return has(hay(p), w); }); }).sort(function (a, b) { return a.price - b.price; })[0];
        if (m) { comp = m; why = 'Goes with your ' + f; log.comp = { rule: r.from.join('/') + ' => ' + r.to.join('/'), matched: f }; }
        return !!m;
      });
    });
    if (!comp) {
      comp = all.filter(function (p) { return p.src === 'complementary' && okComp(p); })[0] || null;
      if (comp) { why = 'Pairs with your order'; log.comp = { rule: 'shopify complementary' }; }
      else log.comp = { rule: 'none under cap' };
    }
    var items = list.filter(function (p) { return !comp || p.id !== comp.id; }).slice(0, comp ? max - 1 : max);
    log.rule = rule;
    log.picked = items.map(function (p) { return p.title + ' @' + p.price / 100; });
    if (comp) log.comp.picked = comp.title + ' @' + comp.price / 100;
    return { rule: rule, items: items, comp: comp, why: why, cap: log.cap, gap: gap, log: log };
  }
  Cart.prototype.suggest = function (cart) {
    var self = this, box = $('[data-cart-sugg]', this.el);
    if (!box || this.cfg.showSugg === false) return;
    var run = this.suggRun = (this.suggRun || 0) + 1;
    this.pool(cart).then(function (pool) {
      if (run !== self.suggRun) return;
      var d = decide(cart, pool, self.cfg, self.mode);
      self.el.setAttribute('data-cart-decision', JSON.stringify(d.log));
      var cards = d.items.map(function (p) { return self.card(p, d.rule === 'close' ? 'Unlocks free delivery' : ''); });
      if (d.comp) cards.push(self.card(d.comp, d.why));
      if (!cards.length) { box.hidden = true; box.innerHTML = ''; return; }
      var head = d.rule === 'close' ? 'Close the gap' : d.items.length ? 'Add-ons under ' + rs(d.cap * 100) : 'Goes with your order';
      box.innerHTML = '<p class="scd__bh">' + (d.rule === 'close' ? icons.truck : icons.plus) + '<span>' + head + '</span></p><ul class="ssugs" role="list">' + cards.join('') + '</ul>';
      box.hidden = false;
      self.emit('suggest', d);
    });
  };
  // compact carousel card: image, name, price, +
  Cart.prototype.card = function (p, why) {
    return '<li class="ssug"><a class="ssug__img' + (framed(p.image) ? ' is-framed' : '') + '" href="' + esc(p.url) + '" tabindex="-1">' + (p.image ? '<img src="' + esc(img(p.image, 200)) + '" alt="" width="96" height="96" loading="lazy">' : '') + '</a>' +
      '<a class="ssug__t" href="' + esc(p.url) + '">' + esc(shortTitle(p.title, p.vendor)) + '</a>' +
      '<span class="ssug__f"><span class="ssug__p">' + rs(p.price) + (why ? '<i>' + esc(why) + '</i>' : '') + '</span>' +
      (p.multi ? '<a class="ssug__add" href="' + esc(p.url) + '" aria-label="Choose options for ' + esc(p.title) + '">' + icons.plus + '</a>' : '<button type="button" class="ssug__add" data-add="' + p.vid + '" aria-label="Add ' + esc(p.title) + ' to basket, ' + rs(p.price) + '">' + icons.plus + '</button>') + '</span></li>';
  };
  Cart.prototype.mini = function (p, helper) {
    return '<li class="smini"><a class="smini__img' + (framed(p.image) ? ' is-framed' : '') + '" href="' + esc(p.url) + '" tabindex="-1">' + (p.image ? '<img src="' + esc(img(p.image, 160)) + '" alt="" width="64" height="64" loading="lazy">' : '') + '</a>' +
      '<span class="smini__b"><a class="smini__t" href="' + esc(p.url) + '">' + esc(shortTitle(p.title, p.vendor)) + '</a><span class="smini__p">' + rs(p.price) + (helper ? ' · <i>' + esc(helper) + '</i>' : '') + '</span></span>' +
      (p.multi ? '<a class="smini__add" href="' + esc(p.url) + '" aria-label="Choose options for ' + esc(p.title) + '">' + icons.plus + '</a>' : '<button type="button" class="smini__add" data-add="' + p.vid + '" aria-label="Add ' + esc(p.title) + ' to basket">' + icons.plus + '</button>') + '</li>';
  };

  /* ---------- bundle upsell (Theme settings → SNH bundle offers) ---------- */
  Cart.prototype.bundle = function (cart) {
    var box = $('[data-cart-bundle]', this.el), bs = this.cfg.bundles || [];
    if (!box) return;
    var inCart = {};
    cart.items.forEach(function (it) { inCart[it.product_id] = 1; });
    var hit = null;
    bs.some(function (b) {
      var have = b.items.filter(function (x) { return inCart[x.pid]; });
      var miss = b.items.filter(function (x) { return !inCart[x.pid] && x.available; });
      if (have.length && (miss.length || b.items.length === 1)) { hit = { b: b, have: have, miss: miss }; return true; }
      return false;
    });
    if (!hit) { box.hidden = true; box.innerHTML = ''; return; }
    var add = hit.b.items.length === 1 ? hit.b.items[0].vid + ':1' : hit.miss.map(function (x) { return x.vid + ':1'; }).join(',');
    var price = hit.miss.reduce(function (s, x) { return s + x.price; }, 0);
    var name = (function () { var li = cart.items.filter(function (it) { return it.product_id === hit.have[0].pid; })[0]; return li ? shortTitle(li.product_title, li.vendor) : hit.have[0].title; })();
    box.innerHTML = '<summary>' + icons.tag + '<span><b>Bundle offer</b>' + (hit.b.save ? ' · ' + esc(hit.b.save) : '') + '</span></summary>' +
      '<div class="sbundle">' + (hit.b.items[0].image ? '<img src="' + esc(hit.b.items[0].image) + '" alt="" width="64" height="64" loading="lazy">' : '') +
      '<p class="sbundle__t">' + esc(name) + ' is in the <b>' + esc(hit.b.title) + '</b>.</p>' +
      '<button type="button" class="v-btn v-btn--accent v-btn--sm" data-add="' + add + '"><span>' + (hit.b.items.length === 1 ? 'Make it a pair' : 'Complete the bundle' + (price ? ' · ' + rs(price) : '')) + '</span></button></div>';
    box.hidden = false;
  };

  /* ---------- picks: the member's goal collection, else bestsellers ---------- */
  Cart.prototype.picksList = function () {
    var c = this.cfg, key = 'picks_' + c.picks;
    if (!c.picks) return Promise.resolve([]);
    return listCache[key] || (listCache[key] = json(root + 'collections/' + encodeURIComponent(c.picks) + '/products.json?limit=60').then(function (j) { return j.products || []; }).catch(function () { return []; }));
  };
  Cart.prototype.picks = function (cart) {
    var self = this, c = this.cfg, box = $('[data-cart-picks]', this.el);
    if (!box) return;
    // hand-picked bestsellers (setting) come first; else the goal / bestsellers collection
    if (c.picksProducts && c.picksProducts.length) {
      var inC = {};
      (cart.items || []).forEach(function (it) { inC[it.product_id] = 1; });
      var hp = c.picksProducts.filter(function (x) { return !inC[x.id]; }).slice(0, 4);
      box.innerHTML = hp.length ? '<p class="scd__bh"><span>' + esc(c.picksLabel || 'Bestsellers right now') + '</span></p><ul class="sminis' + (this.mode === 'page' ? ' sminis--grid' : '') + '" role="list">' + hp.map(function (x) { return self.mini(x, ''); }).join('') + '</ul>' : '';
      return;
    }
    if (!c.picks) return;
    this.picksList().then(function (list) {
      var inCart = {};
      (cart.items || []).forEach(function (it) { inCart[it.product_id] = 1; });
      var picks = list.filter(function (x) { return !inCart[x.id] && (x.variants || []).some(function (v) { return v.available !== false; }); }).slice(0, 4).map(function (x) {
        var v = (x.variants || []).filter(function (v) { return v.available !== false; })[0];
        return { id: x.id, vid: v.id, title: x.title, vendor: x.vendor, price: cents(v.price), image: (x.images && x.images[0] && (x.images[0].src || x.images[0])) || '', url: '/products/' + x.handle, multi: x.variants.length > 1 };
      });
      if (!picks.length) { box.innerHTML = ''; return; }
      box.innerHTML = '<p class="scd__bh"><span>' + esc(c.picksLabel || 'Bestsellers right now') + '</span></p><ul class="sminis" role="list">' + picks.map(function (x) { return self.mini(x, ''); }).join('') + '</ul>';
    });
  };

  /* ---------- actions ---------- */
  Cart.prototype.click = function (e) {
    var q = e.target.closest('[data-qty]'), a = e.target.closest('[data-add]'), acc = e.target.closest('[data-account-open]');
    if (acc && document.querySelector('.acp')) { e.preventDefault(); var d = drawerEl(); if (d && d.open && typeof d.hide === 'function') d.hide(); document.dispatchEvent(new CustomEvent('snh:account-open', { detail: { from: acc } })); return; }
    if (q) { e.preventDefault(); this.change(q.closest('[data-key]').getAttribute('data-key'), +q.getAttribute('data-qty'), q); }
    else if (a) { e.preventDefault(); this.add(a.getAttribute('data-add'), a); }
  };
  Cart.prototype.change = function (key, qty, btn) {
    if (this.busy) return;
    var self = this, li = btn.closest('.sline');
    this.busy = true;
    if (li) li.classList.add('is-busy');
    fetch(root + 'cart/change.js', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ id: key, quantity: Math.max(0, qty) }) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.description || j.message || 'error'); return j; }); })
      .then(function (cart) { self.busy = false; broadcast(cart, self); })
      .catch(function (err) { self.busy = false; if (li) { li.classList.remove('is-busy'); var p = document.createElement('p'); p.className = 'sline__err'; p.setAttribute('role', 'alert'); p.textContent = /stock|available|quantity/i.test(err.message) ? 'No more in stock right now.' : "That didn't save. Try again."; li.querySelector('.sline__b').appendChild(p); } });
  };
  Cart.prototype.add = function (spec, btn) {
    if (btn.getAttribute('aria-busy') === 'true') return;
    var items = String(spec).split(',').map(function (x) { var a = x.split(':'); return { id: +a[0], quantity: +a[1] || 1 }; }).filter(function (i) { return i.id; });
    btn.setAttribute('aria-busy', 'true');
    fetch(root + 'cart/add.js', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ items: items }) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return json(root + 'cart.js'); })
      .then(function (cart) { btn.removeAttribute('aria-busy'); broadcast(cart, null); })
      .catch(function () { btn.removeAttribute('aria-busy'); btn.classList.add('is-err'); setTimeout(function () { btn.classList.remove('is-err'); }, 1600); });
  };
  Cart.prototype.emit = function (name, cart) { this.el.dispatchEvent(new CustomEvent('snh-cart:' + name, { bubbles: true, detail: { cart: cart } })); };

  /* ---------- wiring ---------- */
  var carts = [];
  function broadcast(cart, from) {
    carts.forEach(function (c) { c.render(cart); });
    // the header count (Impact's <cart-count>) and anything else listening; marked so we don't refetch our own change
    document.documentElement.dispatchEvent(new CustomEvent('cart:change', { bubbles: true, detail: { cart: cart, snh: true } }));
  }
  function refreshAll(open) {
    return json(root + 'cart.js').then(function (cart) {
      carts.forEach(function (c) { c.render(cart); });
      if (open) openDrawer();
      return cart;
    });
  }
  function drawerEl() { return document.getElementById('cart-drawer'); }
  function openDrawer() { var d = drawerEl(); if (d && typeof d.show === 'function' && !d.open) d.show(); }
  document.addEventListener('variant:add', function () { refreshAll(true); });
  document.addEventListener('cart:refresh', function () { refreshAll(false); });
  document.addEventListener('cart:change', function (e) { if (e.detail && e.detail.snh) return; if (e.detail && e.detail.cart && e.detail.cart.items) carts.forEach(function (c) { c.render(e.detail.cart); }); else refreshAll(false); });
  // the basket toast: after the drawer closes with items in it (your old drawer's "recent" pill)
  var toast;
  function showToast(cart) {
    if (!cart || !cart.item_count) return;
    if (!toast) { toast = document.createElement('div'); toast.className = 'stoast'; toast.setAttribute('role', 'status'); document.body.appendChild(toast); toast.addEventListener('click', function (e) { if (e.target.closest('[data-toast-open]')) { toast.classList.remove('is-on'); openDrawer(); } }); }
    toast.innerHTML = '<span><b>' + cart.item_count + ' item' + (cart.item_count === 1 ? '' : 's') + '</b> · ' + rs(cart.total_price) + '</span><button type="button" data-toast-open>View basket</button>';
    toast.classList.add('is-on');
    clearTimeout(toast.__t); toast.__t = setTimeout(function () { toast.classList.remove('is-on'); }, 6000);
  }
  function init() {
    $$('[data-cart-root]').forEach(function (el) { if (!el.__cart) { el.__cart = new Cart(el); carts.push(el.__cart); } });
    var d = drawerEl();
    if (d && !d.__snhWatch) {
      d.__snhWatch = true;
      d.addEventListener('dialog:after-show', function () { var c = d.querySelector('[data-cart-root]'); if (c && c.__cart) c.__cart.refresh(); if (toast) toast.classList.remove('is-on'); });
      d.addEventListener('dialog:after-hide', function () { var c = d.querySelector('[data-cart-root]'); if (c && c.__cart) showToast(c.__cart.cart); });
    }
  }
  window.SNHCart = { refresh: refreshAll, open: openDrawer, carts: carts, decide: decide, norm: norm };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  document.addEventListener('shopify:section:load', init);
})();
