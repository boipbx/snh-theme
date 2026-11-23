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
-- Redeem service: one row per redeem request (customer IDs only, no names), and a per-customer lock so a request runs once.
-- backup = the customer's loyalty fields and tags as they were before the request was processed.
CREATE TABLE IF NOT EXISTS redeem_requests (shop TEXT NOT NULL, id TEXT NOT NULL, customer_id TEXT NOT NULL, status TEXT NOT NULL, code TEXT, discount_id TEXT, points_before INTEGER, points_after INTEGER,
  created_at TEXT NOT NULL, updated_at TEXT, note TEXT, mode TEXT, code_status TEXT, expires_at TEXT, notified INTEGER NOT NULL DEFAULT 0, backup TEXT, PRIMARY KEY (shop, id));
CREATE TABLE IF NOT EXISTS redeem_locks (shop TEXT NOT NULL, customer_id TEXT NOT NULL, request_id TEXT NOT NULL, locked_at TEXT NOT NULL, PRIMARY KEY (shop, customer_id));

-- Subscribe & save (scaffold, SUBS_MODE off; docs/subscriptions/PLAN.md). Card details never stored: only Onepay's
-- customer id and card token. Times are epoch milliseconds.
CREATE TABLE IF NOT EXISTS subscriptions (shop TEXT NOT NULL, id TEXT NOT NULL, customer_id TEXT NOT NULL, onepay_customer_id TEXT, token_id TEXT,
  card_last4 TEXT, card_expiry TEXT, variant_id TEXT NOT NULL, product_title TEXT, quantity INTEGER NOT NULL DEFAULT 1, unit_price REAL NOT NULL,
  discount_pct REAL NOT NULL DEFAULT 0, interval_days INTEGER NOT NULL DEFAULT 30, anchor_day INTEGER, next_charge_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_card', failures INTEGER NOT NULL DEFAULT 0, retry_at INTEGER, skip_next INTEGER NOT NULL DEFAULT 0,
  paused_reason TEXT, tier_rate REAL NOT NULL DEFAULT 0.03, consent_text TEXT, consent_at INTEGER, last_charged_at INTEGER, cancelled_at INTEGER,
  created_at INTEGER NOT NULL, PRIMARY KEY (shop, id));
-- One row per charge attempt; id = "<sub id>:<due at>" so the same due date can never be charged twice.
CREATE TABLE IF NOT EXISTS subscription_charges (shop TEXT NOT NULL, id TEXT NOT NULL, sub_id TEXT NOT NULL, due_at INTEGER NOT NULL, amount REAL NOT NULL,
  status TEXT NOT NULL, transaction_id TEXT, message TEXT, plan TEXT, shopify_order_id TEXT, created_at INTEGER NOT NULL, PRIMARY KEY (shop, id));
