// node --test scripts/sms/test/sms.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLK, as94, asLocal9 } from '../src/phone.mjs';
import { formatSms, isGsm7, MAX, EVENTS } from '../src/format.mjs';
import { handle, extract } from '../src/handle.mjs';
import { pickProvider } from '../src/providers/index.mjs';

test('normalise: every common way of writing a Sri Lankan mobile', () => {
  for (const s of ['0771234567', '077 123 4567', '077-123-4567', '+94771234567', '+94 77 123 4567', '94771234567', '0094771234567', '771234567', '(077) 1234567'])
    assert.equal(normalizeLK(s), '+94771234567', s);
});
test('normalise: landlines, foreign numbers and junk are rejected', () => {
  for (const s of ['0112345678', '+14155550123', '07712345', '077123456789', 'abc', '', null, undefined, '0791234567']) assert.equal(normalizeLK(s), null, String(s));
});
test('gateway number formats', () => { assert.equal(as94('+94771234567'), '94771234567'); assert.equal(asLocal9('+94771234567'), '771234567'); });

const cfg = { whatsapp: '0764863359', storeUrl: 'sportsnutritionhub.lk' };
const longUrl = 'https://www.sportsnutritionhub.lk/25896255550/orders/abcdef0123456789abcdef0123456789/authenticate?key=0123456789abcdef0123456789abcdef';
test('every message: 160 chars max, GSM-7 only, has order number, a link and the WhatsApp number', () => {
  for (const ev of EVENTS) for (const statusUrl of [longUrl, 'https://snh.lk/o/abc', '']) {
    const t = formatSms(ev, { name: 'SNH40901', statusUrl, tracking: 'PX123456789LK', location: 'Nugegoda' }, cfg);
    assert.ok(t.length <= MAX, `${ev} is ${t.length} chars`); assert.ok(isGsm7(t), t);
    assert.match(t, /SNH40901/); assert.match(t, /0764863359/); assert.match(t, /sportsnutritionhub\.lk|snh\.lk/);
  }
});
test('a short status link is used as is; a long one falls back to the account page', () => {
  assert.match(formatSms('order_placed', { name: 'SNH1', statusUrl: 'https://snh.lk/o/abc' }, cfg), /snh\.lk\/o\/abc/);
  assert.match(formatSms('order_placed', { name: 'SNH1', statusUrl: longUrl }, cfg), /sportsnutritionhub\.lk\/account/);
});
test('worst case still fits: long order name, long location, long tracking, non-ASCII', () => {
  const t = formatSms('ready_for_pickup', { name: 'SNH-EXCHANGE-1234567', statusUrl: longUrl, location: 'Sports Nutrition Hub – Nugegoda High Level Road' }, cfg);
  assert.ok(t.length <= MAX && isGsm7(t), t);
});
test('handle: DRY_RUN is the default and sends nothing', async () => {
  const lines = []; let fetched = 0; const orig = globalThis.fetch; globalThis.fetch = async () => { fetched++; return new Response('{}'); };
  const r = await handle('orders/create', { id: 1, name: 'SNH1', phone: '0771234567', order_status_url: longUrl }, { WHATSAPP_NUMBER: '0764863359', SMS_PROVIDER: 'notifylk', NOTIFYLK_USER_ID: 'x', NOTIFYLK_API_KEY: 'y', SMS_SENDER_ID: 'SNH' }, { log: (l) => lines.push(l) });
  globalThis.fetch = orig;
  assert.equal(r.dry, true); assert.equal(fetched, 0); assert.match(lines[0], /DRY_RUN/); assert.ok(!lines[0].includes('0771234567') && !lines[0].includes('+94771234567'), 'full number is not logged');
});
test('handle: no Sri Lankan mobile → skipped', async () => {
  const r = await handle('orders/create', { id: 1, name: 'SNH1', phone: '+14155550123' }, {}, { log() {} }); assert.match(r.skipped, /no Sri Lankan mobile/);
});
test('handle: live mode without a gateway configured does not send', async () => {
  const r = await handle('orders/create', { id: 1, name: 'SNH1', phone: '0771234567' }, { DRY_RUN: 'false' }, { log() {} }); assert.equal(r.error, 'not configured');
});
test('handle: live mode calls the chosen gateway once with the normalised number', async () => {
  const calls = []; const orig = globalThis.fetch; globalThis.fetch = async (u, o) => { calls.push([String(u), String(o.body)]); return new Response(JSON.stringify({ status: 'success', data: 'Sent' })); };
  const r = await handle('orders/create', { id: 1, name: 'SNH1', phone: '077 123 4567' }, { DRY_RUN: 'false', SMS_PROVIDER: 'notifylk', NOTIFYLK_USER_ID: 'u', NOTIFYLK_API_KEY: 'k', SMS_SENDER_ID: 'SNH', WHATSAPP_NUMBER: '0764863359' }, { log() {} });
  globalThis.fetch = orig;
  assert.equal(r.sent, true); assert.equal(calls.length, 1); assert.match(calls[0][0], /notify\.lk/); assert.match(calls[0][1], /to=94771234567/);
});
test('extract: failed fulfilments and unknown topics are ignored; duplicates are skipped', async () => {
  assert.equal(extract('fulfillments/create', { id: 2, status: 'failure' }), null); assert.equal(extract('orders/paid', {}), null);
  const r = await handle('orders/create', { id: 9, name: 'SNH9', phone: '0771234567' }, {}, { log() {}, seen: async () => true }); assert.match(r.skipped, /duplicate/);
});
test('pickProvider: lists what is missing', () => {
  assert.deepEqual(pickProvider({ SMS_PROVIDER: 'textlk' }).missing, ['TEXTLK_API_TOKEN', 'SMS_SENDER_ID']); assert.equal(pickProvider({}).provider, null);
});
