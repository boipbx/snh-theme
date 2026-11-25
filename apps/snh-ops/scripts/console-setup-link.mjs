// Makes a one-time first-admin setup link for the staff console (valid 24 hours). Only the SHA-256 of the token is
// stored in D1; the link itself is printed once. Usage (Cloudflare env vars set):
//   node scripts/console-setup-link.mjs > /path/outside/repo/link.txt
import crypto from 'node:crypto'; import { execFileSync } from 'node:child_process';
const shop = process.env.CONSOLE_SHOP || 'sports-nutrition-hub.myshopify.com'; const base = process.env.CONSOLE_URL || 'https://snh-ops.raspy-wind-fe2d.workers.dev';
const wrangler = process.env.WRANGLER || 'wrangler';
const t = crypto.randomBytes(24).toString('hex'); const h = crypto.createHash('sha256').update(t).digest('hex'); const now = Date.now();
const sql = `CREATE TABLE IF NOT EXISTS console_tokens (token_hash TEXT PRIMARY KEY, shop TEXT NOT NULL, kind TEXT NOT NULL, expires_at INTEGER NOT NULL, used_at INTEGER, created_at INTEGER NOT NULL);
INSERT INTO console_tokens (token_hash,shop,kind,expires_at,created_at) VALUES ('${h}','${shop}','setup',${now + 24 * 3600e3},${now});`;
execFileSync(wrangler, ['d1', 'execute', 'snh-ops', '--remote', '--command', sql], { stdio: ['ignore', 'ignore', 'inherit'] });
console.log(`${base}/console#t=${t}`); console.error('expires', new Date(now + 24 * 3600e3).toISOString());
