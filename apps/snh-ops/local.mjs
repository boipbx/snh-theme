// Local run without Cloudflare: the same Worker code on Node, with SQLite standing in for D1.
//   node --experimental-sqlite local.mjs sync     → run a full sync against the store in SHOPIFY_STORE (read-only)
//   node --experimental-sqlite local.mjs serve    → http://localhost:8799 with a signed dev session token
// Env: SHOPIFY_STORE, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET, KLAVIYO_KEY (optional). Data file: .local/ops.sqlite (git-ignored).
import fs from 'node:fs'; import http from 'node:http'; import { DatabaseSync } from 'node:sqlite';
import worker, { api } from './src/worker.mjs'; import { startSync, step, getState } from './src/sync.mjs'; import { sign } from './src/auth.mjs'; import { page } from './src/ui.mjs';
fs.mkdirSync(new URL('./.local/', import.meta.url), { recursive: true });
const db = new DatabaseSync(new URL('./.local/ops.sqlite', import.meta.url).pathname); db.exec(fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
const stmt = (sql, args = []) => ({ bind: (...a) => stmt(sql, a), run: async () => { db.prepare(sql).run(...args); return { success: true }; }, all: async () => ({ results: db.prepare(sql).all(...args) }), first: async () => db.prepare(sql).get(...args) || null, _run: () => db.prepare(sql).run(...args) });
const DB = { prepare: (sql) => stmt(sql), batch: async (list) => { db.exec('BEGIN'); try { for (const s of list) s._run(); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; } return []; } };
const env = { ...process.env, DB, API_VERSION: '2026-10' }; const shop = process.env.SHOPIFY_STORE;
const cfg = fs.readFileSync(new URL(process.env.STORE_CONFIG || './config/example-store.json', import.meta.url), 'utf8');
db.prepare('INSERT INTO shops (shop, config) VALUES (?, ?) ON CONFLICT(shop) DO UPDATE SET config=excluded.config').run(shop, cfg);
const mode = process.argv[2] || 'serve';
if (mode === 'sync') {
  let s = await startSync(env, shop); console.log(s.phase, s.message);
  while (!['idle', 'error'].includes(s.phase)) { await new Promise((r) => setTimeout(r, s.phase.endsWith(':export') ? 5000 : 50)); const p = s.phase + s.message; s = await step(env, shop); if (s.phase + s.message !== p) console.log(s.phase, '|', s.message, '|', s.counts); }
  console.log('finished:', s.phase, s.message, s.counts); process.exit(s.phase === 'idle' ? 0 : 1);
} else {
  const now = Math.floor(Date.now() / 1000);
  const token = await sign({ iss: `https://${shop}/admin`, dest: `https://${shop}`, aud: env.SHOPIFY_CLIENT_ID, sub: 'local', exp: now + 6 * 3600, nbf: now - 5 }, env.SHOPIFY_CLIENT_SECRET);
  http.createServer(async (q, res) => {
    const url = 'http://localhost:8799' + q.url; let r;
    if (!q.url.startsWith('/api/')) r = new Response(page('local', token), { headers: { 'Content-Type': 'text/html' } });
    else r = await worker.fetch(new Request(url, { method: q.method, headers: q.headers }), env, { waitUntil() {} });
    res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer()));
  }).listen(8799, () => console.log('http://localhost:8799'));
}
