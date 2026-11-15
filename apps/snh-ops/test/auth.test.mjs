import test from 'node:test';
import assert from 'node:assert/strict';
import { sign, verify } from '../src/auth.mjs';
const K = { clientId: 'app123', clientSecret: 'shhh' }; const now = Date.parse('2026-11-15T00:00:00Z'); const s = now / 1000;
const good = { iss: 'https://demo-store.myshopify.com/admin', dest: 'https://demo-store.myshopify.com', aud: 'app123', sub: '1', exp: s + 60, nbf: s - 5 };
test('valid session token → shop', async () => { assert.equal((await verify(await sign(good, 'shhh'), { ...K, now })).shop, 'demo-store.myshopify.com'); });
test('rejects: no token, wrong secret, expired, wrong app, tampered, non-Shopify shop, alg none', async () => {
  await assert.rejects(verify('', { ...K, now }));
  await assert.rejects(verify(await sign(good, 'other'), { ...K, now }), /signature/);
  await assert.rejects(verify(await sign({ ...good, exp: s - 60 }, 'shhh'), { ...K, now }), /expired/);
  await assert.rejects(verify(await sign({ ...good, aud: 'someone-else' }, 'shhh'), { ...K, now }), /audience/);
  const t = await sign(good, 'shhh'); const p = t.split('.'); p[1] = btoa(JSON.stringify({ ...good, dest: 'https://evil.myshopify.com' })).replace(/=+$/, '');
  await assert.rejects(verify(p.join('.'), { ...K, now }), /signature/);
  await assert.rejects(verify(await sign({ ...good, dest: 'https://evil.example.com', iss: 'https://evil.example.com/admin' }, 'shhh'), { ...K, now }), /bad shop/);
  const none = btoa(JSON.stringify({ alg: 'none' })).replace(/=+$/, '') + '.' + t.split('.')[1] + '.';
  await assert.rejects(verify(none, { ...K, now }));
});
