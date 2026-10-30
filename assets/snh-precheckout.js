/* SNH pre-checkout (Round 12): the last conversion step inside the Koko router (snippets/koko-checkout-modal).
   Koko's own script is untouched: this only watches the router's [hidden] attribute and fills [data-spc]:
   - order summary: items, total, savings (line + cart discounts, compare-at the drawer already looked up)
   - points: members "You'll earn N points (Silver, 7%)", guests "Sign in to earn N points" (opens the account panel)
   - one last add-on (cart checkouts only; the variant that gets added is named): the cheapest relevant item ≤ Theme settings → SNH cart suggestions →
     Add-ons cap, never in the basket / sold out / ≥ the subtotal; one tap adds it and the totals update
   - delivery estimate, and the Koko card's "3 × Rs X"
   "Buy it now" on the product page posts to /cart/add with return_to=/checkout, so its total = basket + that item. */
(function () {
  var root = document.getElementById('snh-pay-router');
  if (!root || root.__spc) return;
  root.__spc = true;
  var box = root.querySelector('[data-spc]');
  if (!box) return;
  var base = (window.Shopify && Shopify.routes && Shopify.routes.root) || '/';
  var LOW = /\b(bar|bars|snack|chips|cookie|wafer|gel|gels|chew|shaker|bottle|drink|sachet|tablets?)\b/i;
  var icons = {
    bolt: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m13 2-9 12h8l-1 8 9-12h-8l1-8Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    truck: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 6.5h11v10H3zM14 9.5h4l3 3v4h-7" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="7" cy="17.5" r="1.8" stroke="currentColor" stroke-width="1.8"/><circle cx="17" cy="17.5" r="1.8" stroke="currentColor" stroke-width="1.8"/></svg>',
    plus: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>'
  };
  var intent = 'cart', buyForm = null, run = 0;
  function $(s) { return root.querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rs(c) { return 'Rs ' + Math.round(Number(c || 0) / 100).toLocaleString('en-US'); }
  function json(u, o) { return fetch(u, o || { headers: { Accept: 'application/json' } }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function short(t, v) { if (!v) return t; var re = new RegExp('^' + v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '( NUTRITION)?\\s+', 'i'); return t.replace(re, '') || t; }
  function cfg() { try { return JSON.parse(document.querySelector('[data-cart-cfg]').textContent); } catch (e) { return { member: false, rate: 3, baseRate: 3, sugg: {} }; } }

  // window capture runs before the router's document-capture listener: remember what opened it
  window.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('button, a, input[type="submit"]');
    if (!t || root.contains(t)) return;
    var buy = t.matches('[data-snh-product-buy-now], .shopify-payment-button__button--unbranded') || /^\s*buy (it )?now\s*$/i.test(t.textContent || t.value || '');
    intent = buy ? 'buy' : 'cart';
    buyForm = buy ? (t.closest('form') || document.querySelector('form[action*="/cart/add"]')) : null;
  }, true);
  new MutationObserver(function () { if (!root.hidden) fill(); }).observe(root, { attributes: true, attributeFilter: ['hidden'] });

  function buyLine() {
    if (!buyForm) return Promise.resolve(null);
    var fd = new FormData(buyForm), vid = +fd.get('id'), qty = +(fd.get('quantity') || 1);
    var m = location.pathname.match(/\/products\/([^/?#]+)/);
    if (!vid || !m) return Promise.resolve(null);
    return json(base + 'products/' + m[1] + '.js').then(function (p) {
      var v = (p.variants || []).filter(function (x) { return x.id === vid; })[0];
      return v ? { qty: qty, price: v.price * qty } : null;
    }).catch(function () { return null; });
  }

  function fill() {
    var my = ++run, c = cfg();
    Promise.all([json(base + 'cart.js'), intent === 'buy' ? buyLine() : null]).then(function (r) {
      if (my !== run) return;
      render(r[0], r[1], c);
      if (intent === 'cart' && r[0].item_count) addon(r[0], c, my); else $('[data-spc-add]').hidden = true;
    }).catch(function () { box.hidden = true; });
  }

  function render(cart, extra, c) {
    var items = cart.item_count + (extra ? extra.qty : 0), total = cart.total_price + (extra ? extra.price : 0);
    if (!items) { box.hidden = true; return; }
    // savings: discounts + the compare-at prices the drawer already fetched for these lines
    var drawn = (window.SNHCart && SNHCart.carts[0] && SNHCart.carts[0].cart) || { items: [] }, cmp = {};
    drawn.items.forEach(function (it) { if (it.__cmp) cmp[it.key] = it.__cmp; });
    var save = (cart.cart_level_discount_applications || []).reduce(function (s, d) { return s + Number(d.total_allocated_amount || 0); }, 0);
    cart.items.forEach(function (it) { save += Math.max(0, Math.max(cmp[it.key] || 0, it.original_line_price || 0) - it.final_line_price); });
    $('[data-spc-items]').textContent = items + ' item' + (items === 1 ? '' : 's') + ' · total';
    $('[data-spc-total]').textContent = rs(total);
    var sv = $('[data-spc-save]'); sv.hidden = !save; sv.textContent = save ? 'You save ' + rs(save) + ' on this order' : '';
    var pts = Math.floor(total / 100 * (c.member ? c.rate : c.baseRate) / 100).toLocaleString('en-US');
    var pl = $('[data-spc-points]');
    pl.innerHTML = icons.bolt + (c.member ? '<span>You\'ll earn <b>' + pts + ' points</b> on this order (' + esc(c.tier) + ', ' + c.rate + '%)</span>' : '<span><button type="button" data-spc-signin>Sign in</button> to earn <b>' + pts + ' points</b> on this order</span>');
    pl.hidden = false;
    var dd = new Date(), n = 0; while (n < 3) { dd.setDate(dd.getDate() + 1); if (dd.getDay() !== 0) n++; }
    var eta = $('[data-spc-eta]');
    eta.innerHTML = icons.truck + '<span>Colombo <b>same day</b> · rest of Sri Lanka <b>by ' + dd.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + '</b></span>';
    eta.hidden = false;
    var kk = root.querySelector('[data-spc-koko]'); if (kk) kk.textContent = '3 × ' + rs(Math.ceil(total / 3));
    box.hidden = false;
  }

  function addon(cart, c, my) {
    var el = $('[data-spc-add]'), drawer = window.SNHCart && SNHCart.carts[0];
    if (!drawer || !drawer.pool) { el.hidden = true; return; }
    var cap = Math.min(((c.sugg && c.sugg.addonMax) || 2000) * 100, cart.total_price), inCart = {};
    cart.items.forEach(function (it) { inCart[it.product_id] = 1; });
    drawer.pool(cart).then(function (pool) {
      if (my !== run) return;
      var all = pool.addons.concat(pool.comp, pool.related, pool.picks), seen = {};
      var ok = all.filter(function (p) { if (seen[p.id]) return false; seen[p.id] = 1; return !inCart[p.id] && !p.soldOut && p.vid && p.price <= cap && p.price < cart.total_price; });
      var rel = ok.filter(function (p) { return p.src === 'addons' || p.src === 'complementary' || LOW.test(p.title + ' ' + p.type); });
      var pick = (rel.length ? rel : ok).sort(function (a, b) { return a.price - b.price; })[0];
      if (!pick) { el.hidden = true; return; }
      el.className = 'spc__add';
      el.innerHTML = (pick.image ? '<img src="' + esc(pick.image) + (pick.image.indexOf('?') > -1 ? '&' : '?') + 'width=120" alt="" width="48" height="48" loading="lazy">' : '<span></span>') +
        '<p>Last chance to add<b>' + esc(short(pick.title, pick.vendor)) + '</b>' + (pick.vtitle ? esc(pick.vtitle) : '') + '</p><button type="button" data-spc-addon="' + pick.vid + '" aria-label="Add ' + esc(pick.title) + ', ' + rs(pick.price) + '">' + icons.plus + rs(pick.price) + '</button>';
      el.hidden = false;
    });
  }

  root.addEventListener('click', function (e) {
    var a = e.target.closest('[data-spc-addon]'), s = e.target.closest('[data-spc-signin]');
    if (s) {
      var x = root.querySelector('[data-snh-pay-close]'); if (x) x.click();
      document.dispatchEvent(new CustomEvent('snh:account-open', { detail: { from: s } }));
      return;
    }
    if (!a || a.getAttribute('aria-busy') === 'true') return;
    a.setAttribute('aria-busy', 'true');
    json(base + 'cart/add.js', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ items: [{ id: +a.getAttribute('data-spc-addon'), quantity: 1 }] }) })
      .then(function () { return json(base + 'cart.js'); })
      .then(function (cart) {
        render(cart, null, cfg());
        var el = $('[data-spc-add]'); el.classList.add('is-added');
        a.removeAttribute('aria-busy'); a.disabled = true; a.textContent = 'Added';
        if (window.SNHCart) SNHCart.refresh(false);
      })
      .catch(function () { a.removeAttribute('aria-busy'); a.textContent = 'Try again'; });
  });
})();
