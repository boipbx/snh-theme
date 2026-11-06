// Klaviyo REST helper. The key is read from process.env.KLAVIYO_KEY only; it is never printed or written anywhere.
// Backs off on 429 (Retry-After) and 5xx; follows links.next for paging.
const REV = process.env.KV_REVISION || '2025-07-15';
const KEY = process.env.KLAVIYO_KEY;
if (!KEY) { console.error('KLAVIYO_KEY missing'); process.exit(2); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function req(method, path, body, rev = REV) {
  const url = path.startsWith('http') ? path : 'https://a.klaviyo.com/api' + path;
  for (let i = 0; i < 8; i++) {
    const r = await fetch(url, { method, headers: { Authorization: 'Klaviyo-API-Key ' + KEY, revision: rev, accept: 'application/vnd.api+json', 'content-type': 'application/vnd.api+json' }, body: body ? JSON.stringify(body) : undefined });
    if (r.status === 429 || r.status >= 500) { const ra = +(r.headers.get('retry-after') || 0); await sleep(Math.max(ra * 1000, 1500 * (i + 1))); continue; }
    const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { j = { raw: t.slice(0, 300) }; }
    return { status: r.status, json: j };
  }
  return { status: 429, json: { errors: [{ detail: 'rate limited after retries' }] } };
}
async function all(path, rev) { let out = [], next = path; while (next) { const r = await req('GET', next, null, rev); if (r.status !== 200) return { status: r.status, error: r.json, data: out }; out = out.concat(r.json.data || []); next = r.json.links && r.json.links.next; } return { status: 200, data: out }; }
const errText = (j) => (j && j.errors ? j.errors.map((e) => `${e.code || ''} ${e.title || ''}: ${e.detail || ''}`).join(' | ') : JSON.stringify(j || {}).slice(0, 300));
module.exports = { req, all, sleep, errText, REV };
