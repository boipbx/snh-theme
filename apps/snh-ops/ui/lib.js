/* SNH Ops UI library: number formatting, chart maths and the tier rows. Pure functions, no DOM.
   Inlined into the dashboard page by build-ui.mjs; the tests load the same file (test/ui-lib.test.mjs). */
var SNHLib = (function () {
  'use strict';
  var nf = new Intl.NumberFormat('en-US');
  function n(x) { return nf.format(Math.round(Number(x) || 0)); }
  // Rs with thousands separators: Rs 1,234,567 (negative: −Rs 1,234)
  function rs(x, cur) { x = Math.round(Number(x) || 0); var p = cur && cur !== 'LKR' ? cur + ' ' : 'Rs '; return (x < 0 ? '−' : '') + p + nf.format(Math.abs(x)); }
  // compact: 1.30M, 845k, 9,999 (below 10k stays exact)
  function compact(x) { x = Number(x) || 0; var a = Math.abs(x), s = x < 0 ? '−' : '';
    if (a >= 1e9) return s + (a / 1e9).toFixed(2) + 'B'; if (a >= 1e6) return s + (a / 1e6).toFixed(a >= 1e8 ? 0 : a >= 1e7 ? 1 : 2) + 'M';
    if (a >= 1e4) return s + Math.round(a / 1e3) + 'k'; return s + nf.format(Math.round(a)); }
  function rsc(x, cur) { var p = cur && cur !== 'LKR' ? cur + ' ' : 'Rs '; x = Number(x) || 0; return (x < 0 ? '−' : '') + p + compact(Math.abs(x)); }
  // percentage with one decimal: 13.4%
  function pct(x) { x = Number(x) || 0; return (Math.round(x * 10) / 10).toFixed(1) + '%'; }
  // change vs previous period: { dir: 'up'|'down'|'flat'|'new'|'none', text: '12.3%' }
  function change(cur, prev) { if (prev == null) return { dir: 'none', text: '' }; if (!prev && !cur) return { dir: 'flat', text: '0.0%' }; if (!prev) return { dir: 'new', text: 'New' };
    var p = (cur - prev) / Math.abs(prev) * 100; return { dir: p > 0.05 ? 'up' : p < -0.05 ? 'down' : 'flat', text: pct(Math.abs(p)) }; }
  // "nice" axis ticks from 0 (or min) to max: 3-5 round steps
  function ticks(min, max, count) { count = count || 4; if (!(max > min)) { max = min + 1; } var span = max - min, raw = span / count, mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag;
    var step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag, lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step, out = [];
    for (var v = lo; v <= hi + step / 2; v += step) out.push(Math.round(v * 1e6) / 1e6); return out; }
  // smooth path through points: cubic curves with mid-point control points (no overshoot below the baseline)
  function smooth(pts) { if (!pts.length) return ''; var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (var i = 1; i < pts.length; i++) { var a = pts[i - 1], b = pts[i], mx = (a[0] + b[0]) / 2; d += ' C' + mx.toFixed(1) + ' ' + a[1].toFixed(1) + ' ' + mx.toFixed(1) + ' ' + b[1].toFixed(1) + ' ' + b[0].toFixed(1) + ' ' + b[1].toFixed(1); }
    return d; }
  // label thinning: indexes to show so labels never collide (minGap in px)
  function labelIdx(count, width, minGap) { var every = Math.max(1, Math.ceil(count / Math.max(1, Math.floor(width / (minGap || 64))))), out = []; for (var i = 0; i < count; i += every) out.push(i); var last = out[out.length - 1]; if (last !== count - 1) { if (count - 1 - last >= every) out.push(count - 1); else if (out.length > 1) out[out.length - 1] = count - 1; } return out; }
  // Members by tier: one row per tier. barPct is log-scaled (so 11 next to 1,624 still shows), labels keep the true values.
  // close = members within 10% of the next tier, counted from the loyalty "close" list by their current tier.
  function tierRows(tiers, members, all, closeList) {
    var max = 0; tiers.forEach(function (t) { max = Math.max(max, members[t.name] || 0); });
    var lg = function (v) { return v > 0 ? Math.log10(v + 1) : 0; };
    return tiers.map(function (t, i) { var m = members[t.name] || 0, a = all[t.name] || 0, next = tiers[i + 1];
      var close = (closeList || []).filter(function (c) { return String(c.tier || '').toLowerCase() === t.name.toLowerCase(); }).length;
      return { name: t.name, members: m, all: a, barPct: max ? Math.max(m ? 3 : 0, Math.round(lg(m) / lg(max) * 1000) / 10) : 0, next: next ? next.name : null, close: close, minSpend: t.minSpend }; });
  }
  return { n: n, rs: rs, rsc: rsc, compact: compact, pct: pct, change: change, ticks: ticks, smooth: smooth, labelIdx: labelIdx, tierRows: tierRows };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = SNHLib;
