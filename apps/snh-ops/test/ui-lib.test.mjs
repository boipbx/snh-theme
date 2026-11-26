// The dashboard's number formatter, axis maths and Members-by-tier rows (ui/lib.js, the same file the page inlines).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import vm from 'node:vm';
const ctx = { Intl }; vm.runInNewContext(fs.readFileSync(new URL('../ui/lib.js', import.meta.url), 'utf8') + '\nthis.SNHLib = SNHLib;', ctx); const L = ctx.SNHLib;   // as the browser runs it
const J = (x) => JSON.parse(JSON.stringify(x));   // objects from the VM realm → plain objects

test('Rs with thousands separators, compact form, percentages to 1 decimal', () => {
  assert.equal(L.rs(1234567), 'Rs 1,234,567'); assert.equal(L.rs(1234567.6), 'Rs 1,234,568'); assert.equal(L.rs(-2500), '−Rs 2,500'); assert.equal(L.rs(0), 'Rs 0'); assert.equal(L.rs(null), 'Rs 0');
  assert.equal(L.rs(100, 'USD'), 'USD 100');
  assert.equal(L.rsc(1296153), 'Rs 1.30M'); assert.equal(L.rsc(27947080), 'Rs 27.9M'); assert.equal(L.rsc(845000), 'Rs 845k'); assert.equal(L.rsc(9999), 'Rs 9,999'); assert.equal(L.rsc(186000000), 'Rs 186M');
  assert.equal(L.compact(18616479), '18.6M'); assert.equal(L.compact(12480), '12k'); assert.equal(L.n(1911818), '1,911,818');
  assert.equal(L.pct(13.44), '13.4%'); assert.equal(L.pct(5), '5.0%'); assert.equal(L.pct(0.05), '0.1%');
});
test('change vs previous period', () => {
  assert.deepEqual(J(L.change(110, 100)), { dir: 'up', text: '10.0%' }); assert.deepEqual(J(L.change(88, 100)), { dir: 'down', text: '12.0%' });
  assert.equal(L.change(5, 0).dir, 'new'); assert.equal(L.change(0, 0).dir, 'flat'); assert.equal(L.change(5, null).dir, 'none'); assert.equal(L.change(100.01, 100).dir, 'flat');
});
test('axis ticks are round and cover the data; labels never collide', () => {
  assert.deepEqual(J(L.ticks(0, 1430000, 4)), [0, 500000, 1000000, 1500000]); assert.deepEqual(J(L.ticks(0, 9, 4)), [0, 2.5, 5, 7.5, 10]);
  const idx = L.labelIdx(30, 690, 72); assert.equal(idx[0], 0); assert.equal(idx[idx.length - 1], 29);
  for (let i = 1; i < idx.length; i++) assert.ok((idx[i] - idx[i - 1]) * 690 / 29 >= 60, 'gap ' + idx[i - 1] + '→' + idx[i]);
  assert.deepEqual(J(L.labelIdx(3, 600, 72)), [0, 1, 2]);
  assert.match(L.smooth([[0, 10], [10, 0], [20, 5]]), /^M0\.0 10\.0 C5\.0 10\.0 5\.0 0\.0 10\.0 0\.0 C15\.0 0\.0 15\.0 5\.0 20\.0 5\.0$/);
});
test('Members by tier rows: true counts, log-scaled bars, close-to-next-tier per tier', () => {
  const tiers = [{ name: 'Bronze', minSpend: 0 }, { name: 'Silver', minSpend: 198000 }, { name: 'Gold', minSpend: 300000 }];
  const close = [{ tier: 'Bronze' }, { tier: 'bronze' }, { tier: 'Silver' }];
  const rows = L.tierRows(tiers, { Bronze: 1627, Silver: 12, Gold: 5 }, { Bronze: 20296, Silver: 81, Gold: 23 }, close);
  assert.deepEqual(J(rows.map((r) => [r.name, r.members, r.all, r.close, r.next])), [['Bronze', 1627, 20296, 2, 'Silver'], ['Silver', 12, 81, 1, 'Gold'], ['Gold', 5, 23, 0, null]]);
  assert.equal(rows[0].barPct, 100); assert.ok(rows[1].barPct > 30 && rows[1].barPct < 40, String(rows[1].barPct)); assert.ok(rows[2].barPct > 20 && rows[2].barPct < rows[1].barPct);
  const z = L.tierRows(tiers, { Bronze: 0, Silver: 0, Gold: 0 }, {}, []); assert.ok(z.every((r) => r.barPct === 0 && r.all === 0));
  assert.equal(L.tierRows(tiers, { Bronze: 100000, Silver: 1, Gold: 0 }, {}, [])[1].barPct >= 3, true);   // a tiny tier still shows
});
