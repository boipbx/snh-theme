// node scripts/tests/basket-rules.test.mjs — checks SNHReco.rules (assets/snh-cart-reco.js) against the basket rules in
// docs/golive/BASKET-SUGGESTIONS.md with a small mocked catalogue (prices in cents, like /cart.js).
import fs from 'node:fs'; import assert from 'node:assert/strict';
const g = { window: {}, location: { pathname: '/' }, localStorage: { getItem: () => null, setItem() {} } };
new Function('window', 'location', 'localStorage', fs.readFileSync(new URL('../../assets/snh-cart-reco.js', import.meta.url), 'utf8'))(g.window, g.location, g.localStorage);
const R = g.window.SNHReco;
const P = (id, title, type, price, extra = {}) => ({ id, vid: id * 10, title, type, tags: '', price: price * 100, ...extra });
const cat = [P(1, 'SNH OG Shaker Bottle 750ml', 'Accessories', 1999), P(2, 'Crunch Protein Bar', 'Protein Bars', 1499), P(3, 'Protein Chips', 'Protein Snacks', 990),
  P(4, 'Creatine Monohydrate 100 Servings', 'Creatine', 12999), P(5, 'SiS GO Isotonic Energy Gel', 'Energy Gels', 899), P(6, 'SiS Hydro Tablets', 'Electrolytes', 3999),
  P(7, 'Vitamin K2 MK-7', 'Vitamins', 4999), P(8, 'Zinc 15mg', 'Vitamins', 2999), P(9, 'Magnesium Glycinate', 'Magnesium', 5999),
  P(10, 'Whey Sachet Sample Pack x 5', 'Whey Protein', 4500), P(11, 'Bar Box 12', 'Bundle', 16999, { cat: 'bundle', tags: 'bundle protein bars snacks' }), P(12, 'Sold Out Shaker', 'Accessories', 1500, { soldOut: true })];
const pool = { cat, bars: [], best: [P(20, 'Bestseller Whey', 'Whey Protein', 22999, { src: 'best' })], bundles: [] };
const cfg = { threshold: 1700000, tolerance: 10000, aov: 18600, aovWindow: 8000 };
const cart = (...items) => ({ total_price: items.reduce((s, i) => s + i[3] * 100, 0), items: items.map(([id, title, type]) => ({ product_id: id, product_title: title, product_type: type })) });
const ids = (d) => d.items.map((p) => p.id);
let d = R.rules(cart([100, 'Applied Nutrition Creatine Monohydrate 50 Servings', 'Creatine', 3000]), pool, cfg, {});
assert.equal(d.items[0].id, 1, 'creatine → shaker first'); assert.ok(d.items.length <= 2); assert.ok(!ids(d).includes(12), 'never sold out');
d = R.rules(cart([101, 'RYSE Loaded Pre-Workout', 'Pre-Workout', 3000]), pool, cfg, {});
assert.ok([2, 3].includes(d.items[0].id), 'pre-workout → bars / chips / snacks');
d = R.rules(cart([102, 'Critical Whey Protein', 'Whey Protein', 3000]), pool, cfg, {});
assert.deepEqual(ids(d), [1, 4], 'whey → shaker, creatine');
d = R.rules(cart([103, 'SiS Beta Fuel Gel', 'Energy Gels', 3000]), pool, cfg, {});
assert.ok(ids(d).every((i) => [5, 6, 2].includes(i)), 'gels → gels / electrolytes / energy bars');
d = R.rules(cart([104, 'Vitamin D3 5000IU', 'Vitamins', 3000]), pool, cfg, {});
assert.equal(d.items[0].id, 7, 'D3 → K2');
d = R.rules(cart([105, 'Magnesium Citrate', 'Magnesium', 3000]), pool, cfg, {});
assert.equal(d.items[0].id, 8, 'magnesium → zinc');
d = R.rules(cart([1, 'SNH OG Shaker Bottle 750ml', 'Accessories', 1999]), pool, cfg, {});
assert.equal(d.rule, 'bestsellers', 'no rule → bestsellers'); assert.equal(d.items[0].id, 20);
d = R.rules(cart([102, 'Critical Whey Protein', 'Whey Protein', 12000]), { ...pool, bundles: [cat[10]] }, cfg, {});
assert.equal(d.rule, 'aov', 'within Rs 8,000 of free delivery → bigger adds'); assert.ok(ids(d).includes(10), 'sachet multi-pack offered');
assert.ok(!ids(d).includes(102), 'never in basket');
d = R.rules(cart([102, 'Critical Whey Protein', 'Whey Protein', 5000]), pool, cfg, {});
assert.equal(d.rule, 'rules', 'far from free delivery → normal rules');
d = R.rules(cart([102, 'Critical Whey Protein', 'Whey Protein', 17500]), pool, cfg, {});
assert.equal(d.rule, 'aov', 'free delivery reached, under the AOV → bigger adds toward the AOV');
console.log('basket rules: all 12 checks pass');
