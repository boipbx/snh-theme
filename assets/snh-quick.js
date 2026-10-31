/* SNH quick buy (Round 14): a variant picker sheet for multi-variant products, opened by any
   [data-v2-pick="<product handle>"] button (product cards, Shop the Look, cart suggestions). Reads /products/<handle>.js,
   shows option pills (flavour / size; combinations with no stock are struck through), price + compare-at, quantity,
   one-time vs subscribe when the product has selling plans, and adds with V2.add (assets/snh-v2.js), which opens the
   cart drawer. Bottom sheet on phones, a centred card on desktop. Never leaves the page; "Full details" links to it. */
(function () {
  if (window.SNHQuick) return;
  var root = (window.Shopify && Shopify.routes && Shopify.routes.root) || '/';
  var cache = {}, dlg, state;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rs(c) { return 'Rs ' + Math.round(c / 100).toLocaleString('en-US'); }
  function img(u, w) { if (!u) return ''; u = u.indexOf('//') === 0 ? 'https:' + u : u; return u + (u.indexOf('?') > -1 ? '&' : '?') + 'width=' + w; }
  // the live titles start with the vendor in capitals ("APPLIED NUTRITION Flavored Creatine…"): the brand line shows it
  function short(t, v) { if (!v) return t; var low = t.toLowerCase(), vl = v.toLowerCase(); var r = low.indexOf(vl) === 0 ? t.slice(v.length).replace(/^\s*(nutrition)?\s+/i, '') : t; return r || t; }
  function get(h) { return cache[h] || (cache[h] = fetch(root + 'products/' + encodeURIComponent(h) + '.js', { headers: { Accept: 'application/json' } }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })); }

  function build() {
    dlg = document.createElement('dialog');
    dlg.className = 'sqb';
    dlg.setAttribute('aria-labelledby', 'sqb-t');
    dlg.innerHTML = '<div class="sqb__in"><button type="button" class="sqb__x" data-sqb-close aria-label="Close">×</button><div class="sqb__body" data-sqb-body></div></div>';
    document.body.appendChild(dlg);
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg || e.target.closest('[data-sqb-close]')) return close();
      var pill = e.target.closest('[data-sqb-opt]');
      if (pill && !pill.disabled) { state.sel[+pill.getAttribute('data-sqb-i')] = pill.getAttribute('data-sqb-opt'); paint(); return; }
      var q = e.target.closest('[data-sqb-q]');
      if (q) { state.qty = Math.max(1, Math.min(20, state.qty + +q.getAttribute('data-sqb-q'))); paint(); return; }
      var plan = e.target.closest('[data-sqb-plan]');
      if (plan) { state.plan = plan.getAttribute('data-sqb-plan') === 'sub'; paint(); return; }
      var go = e.target.closest('[data-sqb-add]');
      if (go && !go.disabled) add(go);
    });
    dlg.addEventListener('close', function () { if (state && state.from) try { state.from.focus(); } catch (e) {} });
  }
  function close() { if (dlg && dlg.open) dlg.close(); }
  function variantOf() { var p = state.p; return p.variants.filter(function (v) { return v.options.every(function (o, i) { return o === state.sel[i]; }); })[0] || null; }
  function canPick(i, val) {   // a value is pickable when some available variant has it with the other chosen values
    return state.p.variants.some(function (v) { return v.available && v.options[i] === val && v.options.every(function (o, k) { return k === i || o === state.sel[k]; }); });
  }
  function paint() {
    var p = state.p, v = variantOf(), b = dlg.querySelector('[data-sqb-body]');
    var groups = (p.selling_plan_groups || []), plans = groups.length ? groups[0].selling_plans : [], must = p.requires_selling_plan;
    if (must) state.plan = true;
    var planAlloc = v && state.plan && plans[0] ? (v.selling_plan_allocations || []).filter(function (a) { return a.selling_plan_id === plans[0].id; })[0] : null;
    var price = planAlloc ? planAlloc.price : v ? v.price : p.price, cmp = planAlloc ? planAlloc.compare_at_price || v.price : v && v.compare_at_price;
    var pic = (v && v.featured_image && v.featured_image.src) || p.featured_image;
    var opts = p.options.length === 1 && p.variants.length === 1 && p.variants[0].title === 'Default Title' ? [] : p.options;
    b.innerHTML =
      '<div class="sqb__head"><span class="sqb__img">' + (pic ? '<img src="' + esc(img(pic, 300)) + '" alt="" width="96" height="96">' : '') + '</span>' +
      '<div><p class="sqb__brand">' + esc(p.vendor) + '</p><p class="sqb__t" id="sqb-t">' + esc(short(p.title, p.vendor)) + '</p>' +
      '<p class="sqb__price"><b>' + rs(price) + '</b>' + (cmp && cmp > price ? '<s><span class="v-sr">Was </span>' + rs(cmp) + '</s>' : '') + '</p>' +
      '<p class="sqb__koko">or 3 × ' + rs(Math.ceil(price * state.qty / 3)) + ' with Koko · Cash on delivery</p></div></div>' +
      opts.map(function (o, i) {
        var name = o.name || o;
        return '<fieldset class="sqb__opt"><legend>' + esc(name) + ': <b>' + esc(state.sel[i]) + '</b></legend><div class="sqb__pills">' +
          (o.values || []).map(function (val) { var ok = canPick(i, val), on = state.sel[i] === val; return '<button type="button" class="sqb__pill' + (on ? ' is-on' : '') + (ok ? '' : ' is-out') + '" data-sqb-i="' + i + '" data-sqb-opt="' + esc(val) + '" aria-pressed="' + on + '"' + (ok ? '' : ' aria-label="' + esc(val) + ', sold out"') + '>' + esc(val) + '</button>'; }).join('') +
          '</div></fieldset>';
      }).join('') +
      (plans.length ? '<fieldset class="sqb__opt"><legend>Purchase</legend><div class="sqb__pills">' + (must ? '' : '<button type="button" class="sqb__pill' + (state.plan ? '' : ' is-on') + '" data-sqb-plan="one" aria-pressed="' + !state.plan + '">One-time</button>') +
        '<button type="button" class="sqb__pill' + (state.plan ? ' is-on' : '') + '" data-sqb-plan="sub" aria-pressed="' + state.plan + '">' + esc(plans[0].name) + '</button></div></fieldset>' : '') +
      '<div class="sqb__foot"><div class="sqb__qty" role="group" aria-label="Quantity"><button type="button" data-sqb-q="-1" aria-label="Decrease quantity">−</button><output aria-live="polite">' + state.qty + '</output><button type="button" data-sqb-q="1" aria-label="Increase quantity">+</button></div>' +
      '<button type="button" class="sqb__add" data-sqb-add' + (v && v.available ? '' : ' disabled') + '>' + (!v ? 'Choose an option' : v.available ? 'Add to basket · ' + rs(price * state.qty) : 'Sold out') + '</button></div>' +
      '<a class="sqb__more" href="' + esc(root.replace(/\/$/, '') + '/products/' + p.handle + (v ? '?variant=' + v.id : '')) + '">Full details</a>' +
      (v && v.available && typeof v.inventory_quantity === 'number' && v.inventory_quantity > 0 && v.inventory_quantity <= 5 ? '<p class="sqb__low">Only ' + v.inventory_quantity + ' left</p>' : '');
  }
  function add(btn) {
    var v = variantOf(), p = state.p, plans = (p.selling_plan_groups || [])[0];
    if (!v) return;
    var item = { id: v.id, quantity: state.qty };
    if (state.plan && plans && plans.selling_plans[0]) item.selling_plan = plans.selling_plans[0].id;
    btn.disabled = true; btn.textContent = 'Adding…';
    var done = window.V2 && V2.add ? V2.add([item], btn) : Promise.reject();
    Promise.resolve(done).then(function (cart) { if (cart) close(); else { btn.disabled = false; paint(); } }, function () { btn.disabled = false; paint(); });
  }
  function openFor(handle, from) {
    if (!dlg) build();
    state = { p: null, sel: [], qty: 1, plan: false, from: from };
    dlg.querySelector('[data-sqb-body]').innerHTML = '<p class="sqb__wait">Loading options…</p>';
    if (!dlg.open) dlg.showModal();
    return get(handle).then(function (p) {
      var first = p.variants.filter(function (v) { return v.available; })[0] || p.variants[0];
      p.options = (p.options || []).map(function (o, i) { return typeof o === 'string' ? { name: o, values: p.variants.map(function (v) { return v.options[i]; }).filter(function (x, k, a) { return a.indexOf(x) === k; }) } : o; });
      state.p = p; state.sel = first.options.slice(); state.plan = !!p.requires_selling_plan;
      paint();
      var on = dlg.querySelector('.sqb__pill.is-on') || dlg.querySelector('[data-sqb-add]'); if (on) on.focus();
    }).catch(function () { location.href = root + 'products/' + handle; });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-v2-pick]');
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    openFor(b.getAttribute('data-v2-pick'), b);
  }, true);
  window.SNHQuick = { open: openFor, close: close };
})();
