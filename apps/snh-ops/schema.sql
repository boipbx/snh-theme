-- SNH Ops dashboard cache. Every table is keyed by shop domain (multi-store ready). Read-only copy of Shopify data.
-- Existing databases are brought up to this shape by migrate() in src/sync.mjs.
CREATE TABLE IF NOT EXISTS shops (shop TEXT PRIMARY KEY, config TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT (datetime('now')));
-- cursor = start time of the last successful sync: the next incremental sync asks Shopify only for records updated since then.
-- rows = table rows written so far by the sync that is running.
CREATE TABLE IF NOT EXISTS sync_state (shop TEXT PRIMARY KEY, phase TEXT NOT NULL DEFAULT 'idle', op_id TEXT, url TEXT, offset INTEGER NOT NULL DEFAULT 0,
  started_at TEXT, finished_at TEXT, message TEXT, counts TEXT NOT NULL DEFAULT '{}', orders_since TEXT, kind TEXT, cursor TEXT, rows INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS customers (shop TEXT NOT NULL, id TEXT NOT NULL, name TEXT, tags TEXT, points INTEGER, tier TEXT, annual_spend REAL,
  last_reward_code TEXT, created_at TEXT, orders_count INTEGER, amount_spent REAL, last_order_at TEXT, state TEXT, updated_at TEXT, consent TEXT, PRIMARY KEY (shop, id));
CREATE TABLE IF NOT EXISTS orders (shop TEXT NOT NULL, id TEXT NOT NULL, name TEXT, created_at TEXT, cancelled INTEGER NOT NULL DEFAULT 0, customer_id TEXT,
  total REAL, subtotal REAL, discount_total REAL, financial TEXT, fulfillment TEXT, delivery TEXT, pickup_status TEXT, ready_at TEXT, codes TEXT, tags TEXT, PRIMARY KEY (shop, id));
CREATE TABLE IF NOT EXISTS order_lines (shop TEXT NOT NULL, line_id TEXT NOT NULL, order_id TEXT NOT NULL, product_id TEXT, product_type TEXT, title TEXT,
  qty INTEGER, amount REAL, group_id TEXT, group_product_id TEXT, group_title TEXT, group_qty INTEGER, PRIMARY KEY (shop, line_id));
CREATE TABLE IF NOT EXISTS snapshots (shop TEXT NOT NULL, key TEXT NOT NULL, json TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (shop, key));
-- products whose type is the store's bundle type (any status): a bundle sale is stored by Shopify as its component lines grouped under the bundle
CREATE TABLE IF NOT EXISTS bundle_products (shop TEXT NOT NULL, product_id TEXT NOT NULL, title TEXT, tags TEXT, created_at TEXT, status TEXT, PRIMARY KEY (shop, product_id));
-- one row per sync: how many table rows it wrote (the free D1 plan allows 100,000 a day)
CREATE TABLE IF NOT EXISTS sync_log (shop TEXT NOT NULL, started_at TEXT NOT NULL, finished_at TEXT, kind TEXT, rows_written INTEGER NOT NULL DEFAULT 0, status TEXT, message TEXT, PRIMARY KEY (shop, started_at));
-- No secondary indexes: every query reads by shop (the primary key prefix), and each index costs one extra row write per row.
