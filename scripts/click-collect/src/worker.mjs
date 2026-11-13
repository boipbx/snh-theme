// Cloudflare Worker entry: cron every 30 minutes (wrangler.toml). Secrets: SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET,
// KLAVIYO_KEY. Vars: SHOPIFY_STORE, PICKUP_LAUNCH_AT, DRY_RUN, PAY_AT_STORE_NAME, OPS_EMAIL (optional).
import { run } from './run.mjs';
export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(run(env, { now: event.scheduledTime }).catch((e) => console.log('run failed', String(e.message || e).slice(0, 300))));
  },
  // GET /?key=<RUN_KEY> runs once on demand (optional; returns the summary only).
  async fetch(req, env) {
    const u = new URL(req.url);
    if (!env.RUN_KEY || u.searchParams.get('key') !== env.RUN_KEY) return new Response('ok');
    const lines = []; const r = await run(env, { log: (l) => lines.push(l) });
    return new Response(lines.join('\n') + '\n' + JSON.stringify(r.summary), { headers: { 'content-type': 'text/plain' } });
  },
};
