// Local sample: node scripts/sms/cli.mjs  → prints the three SMS texts for made-up orders (DRY_RUN, nothing is sent).
import { handle } from './src/handle.mjs';
const env = { DRY_RUN: 'true', WHATSAPP_NUMBER: process.env.WHATSAPP_NUMBER || '0764863359', STORE_URL: 'sportsnutritionhub.lk' };
const samples = [
  ['orders/create', { id: 1, name: 'SNH40901', phone: '077 123 4567', order_status_url: 'https://www.sportsnutritionhub.lk/25896255550/orders/abcdef0123456789abcdef0123456789/authenticate?key=0123456789abcdef0123456789abcdef' }],
  ['fulfillments/create', { id: 2, order_id: 1, name: 'SNH40901.1', status: 'success', tracking_number: 'PX123456789LK', destination: { phone: '+94 77 123 4567' } }],
  ['fulfillment_orders/line_items_prepared_for_pickup', { fulfillment_order: { id: 3, order_id: 1, order_name: 'SNH40901', assigned_location: { name: 'Nugegoda' }, destination: { phone: '0771234567' } } }],
];
for (const [topic, body] of samples) await handle(topic, body, env);
