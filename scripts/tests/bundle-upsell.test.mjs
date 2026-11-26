// node scripts/tests/bundle-upsell.test.mjs — runs SNHCart.offersFor (assets/snh-cart.js) on mocked baskets against the
// real bundle map (assets/snh-bundle-map.js) and LIVE bundle prices (/products/<handle>.js, read-only storefront GETs).
import fs from 'node:fs'; import assert from 'node:assert/strict';
const STORE = 'https://www.sportsnutritionhub.lk';
const win = {}; const doc = { getElementById: () => null, createElement: () => ({ setAttribute() {}, appendChild() {}, style: {} }), body: { appendChild() {} }, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], documentElement: { dispatchEvent() {} }, readyState: 'complete' };
new Function('window', fs.readFileSync(new URL('../../assets/snh-bundle-map.js', import.meta.url), 'utf8'))(win);
new Function('window', 'document', 'matchMedia', 'CustomEvent', 'sessionStorage', 'Shopify', fs.readFileSync(new URL('../../assets/snh-cart.js', import.meta.url), 'utf8'))(win, doc, () => ({ matches: false }), function () {}, { getItem: () => null, setItem() {} }, undefined);
const M = win.SNHBundleMap, offersFor = win.SNHCart.offersFor;
const getP = async (h) => (await fetch(`${STORE}/products/${h}.js`)).json();
const live = {}; for (const [, [h]] of Object.entries(M.b)) if (/creatine-starter|race-day-pack-1-0/.test(h)) live[h] = await getP(h);
const line = (variant_id, product_id, quantity = 1, product_type = '') => ({ key: variant_id + ':k', variant_id, product_id, quantity, product_type });
// 1. AN Creatine 50 alone → Creatine Starter Pack, missing the shaker, saving = compare-at − price
let o = offersFor({ items: [line(32411266777150, 7311297314878, 1, 'CREATINE')] }, M, live);
const cs = live['creatine-starter'];
assert.equal(o.length, 1); assert.equal(o[0].handle, 'creatine-starter');
const v = cs.variants.find((x) => x.id === o[0].vid);
assert.equal(o[0].save, v.compare_at_price - v.price, 'saving = live compare-at minus price');
assert.equal(M.c[o[0].missing[0][0]][1].includes('Shaker'), true, 'missing item is the shaker');
console.log('creatine → ' + o[0].title + ', add ' + M.c[o[0].missing[0][0]][1] + ' (' + M.c[o[0].missing[0][0]][4] + '), save Rs ' + o[0].save / 100 + ', bundle Rs ' + v.price / 100);
// 2. the bundle already in the basket → no offer for it
o = offersFor({ items: [line(32411266777150, 7311297314878), line(o[0].vid, 9433933218046, 1, 'Bundle')] }, M, live);
assert.ok(!o.some((x) => x.handle === 'creatine-starter'), 'no offer when the bundle is in the basket');
// 3. Hydro Tablets Cola: Race Day Pack 1.0 has no compare-at price in Shopify → no offer (the saving must be real)
o = offersFor({ items: [line(45846740926718, 8631073603838, 1, 'ELECTROLYTES')] }, M, live);
assert.ok(o.length <= 2, 'max 2 offers');
assert.ok(!o.some((x) => x.handle === 'race-day-pack-1-0' && !(live['race-day-pack-1-0'].variants.find((v) => v.id === x.vid) || {}).compare_at_price), 'no offer without a compare-at price'); console.log('hydro → ' + (o.length ? '' : 'no offer (no compare-at on Race Day Pack 1.0)') + o.map((x) => x.title + ' save Rs ' + x.save / 100 + ' missing ' + x.missing.map((c) => M.c[c[0]][1] + ' ×' + c[1]).join(', ')).join(' | '));
console.log('bundle upsell: all checks pass');
