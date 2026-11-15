// Prints the SQL that registers a store and its settings:  node seed.mjs <shop.myshopify.com> [config.json] > seed.sql
import fs from 'node:fs';
const [shop, file = new URL('./config/example-store.json', import.meta.url).pathname] = process.argv.slice(2);
if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop || '')) { console.error('usage: node seed.mjs <shop.myshopify.com> [config.json]'); process.exit(1); }
const cfg = JSON.stringify(JSON.parse(fs.readFileSync(file, 'utf8'))).replace(/'/g, "''");
console.log(`INSERT INTO shops (shop, config) VALUES ('${shop}', '${cfg}') ON CONFLICT(shop) DO UPDATE SET config=excluded.config;`);
