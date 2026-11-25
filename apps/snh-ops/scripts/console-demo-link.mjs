// Makes a read-only DEMO link for the staff console: fake sample customers, no sign-in, no Shopify calls, nothing saved.
// Valid 14 days (DAYS=n to change, max 30). Only the SHA-256 of the token is stored in D1; the link is printed once.
//   node scripts/console-demo-link.mjs        (Cloudflare env vars set; WRANGLER=path if wrangler is not on PATH)
import crypto from 'node:crypto'; import { execFileSync } from 'node:child_process';
const shop = process.env.CONSOLE_SHOP || 'sports-nutrition-hub.myshopify.com'; const base = process.env.CONSOLE_URL || 'https://snh-ops.raspy-wind-fe2d.workers.dev';
const days = Math.min(30, Math.max(1, Number(process.env.DAYS) || 14));
const t = crypto.randomBytes(24).toString('hex'); const h = crypto.createHash('sha256').update(t).digest('hex'); const now = Date.now();
execFileSync(process.env.WRANGLER || 'wrangler', ['d1', 'execute', 'snh-ops', '--remote', '--command',
  `INSERT INTO console_tokens (token_hash,shop,kind,expires_at,created_at) VALUES ('${h}','${shop}','demo',${now + days * 864e5},${now});`], { stdio: ['ignore', 'ignore', 'inherit'] });
console.log(`${base}/console/demo?k=${t}`); console.error('expires', new Date(now + days * 864e5).toISOString());
