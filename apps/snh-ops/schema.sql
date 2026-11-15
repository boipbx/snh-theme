-- SNH Ops dashboard cache. Every table is keyed by shop domain (multi-store ready). Read-only copy of Shopify data.
CREATE TABLE IF NOT EXISTS shops (shop TEXT PRIMARY KEY, config TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS sync_state (shop TEXT PRIMARY KEY, phase TEXT NOT NULL DEFAULT 'idle', op_id TEXT, url TEXT, offset INTEGER NOT NULL DEFAULT 0,
  started_at TEXT, finished_at TEXT, message TEXT, counts TEXT NOT NULL DEFAULT '{}', orders_since TEXT);
CREATE TABLE IF NOT EXISTS customers (shop TEXT NOT NULL, id TEXT NOT NULL, name TEXT, tags TEXT, points INTEGER, tier TEXT, annual_spend REAL,
  last_reward_code TEXT, created_at TEXT, orders_count INTEGER, amount_spent REAL, last_order_at TEXT, PRIMARY KEY (shop, id));
CREATE INDEX IF NOT EXISTS customers_tier ON customers (shop, tier);
CREATE TABLE IF NOT EXISTS orders (shop TEXT NOT NULL, id TEXT NOT NULL, name TEXT, created_at TEXT, cancelled INTEGER NOT NULL DEFAULT 0, customer_id TEXT,
  total REAL, subtotal REAL, discount_total REAL, financial TEXT, fulfillment TEXT, delivery TEXT, pickup_status TEXT, ready_at TEXT, codes TEXT, tags TEXT, PRIMARY KEY (shop, id));
CREATE INDEX IF NOT EXISTS orders_created ON orders (shop, created_at);
CREATE TABLE IF NOT EXISTS order_lines (shop TEXT NOT NULL, line_id TEXT NOT NULL, order_id TEXT NOT NULL, product_id TEXT, product_type TEXT, title TEXT,
  qty INTEGER, amount REAL, group_id TEXT, group_product_id TEXT, group_title TEXT, group_qty INTEGER, PRIMARY KEY (shop, line_id));
CREATE INDEX IF NOT EXISTS lines_order ON order_lines (shop, order_id);
CREATE TABLE IF NOT EXISTS snapshots (shop TEXT NOT NULL, key TEXT NOT NULL, json TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (shop, key));
-- products whose type is the store's bundle type (any status): a bundle sale is stored by Shopify as its component lines grouped under the bundle
CREATE TABLE IF NOT EXISTS bundle_products (shop TEXT NOT NULL, product_id TEXT NOT NULL, title TEXT, PRIMARY KEY (shop, product_id));
