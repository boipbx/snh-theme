// Shopify session tokens (App Bridge): a JWT signed HS256 with the app's client secret.
// Every API request must carry one; verify() returns the shop domain or throws. No token, no data.
const b64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), (c) => c.charCodeAt(0));
export async function sign(payload, secret) {       // used by tests and the local harness only
  const enc = (o) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const head = enc({ alg: 'HS256', typ: 'JWT' }) + '.' + enc(payload);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(head)));
  return head + '.' + btoa(String.fromCharCode(...sig)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export async function verify(token, { clientId, clientSecret, now = Date.now() }) {
  if (!token || !clientId || !clientSecret) throw new Error('missing token');
  const parts = String(token).split('.'); if (parts.length !== 3) throw new Error('malformed token');
  let head, body; try { head = JSON.parse(new TextDecoder().decode(b64u(parts[0]))); body = JSON.parse(new TextDecoder().decode(b64u(parts[1]))); } catch (e) { throw new Error('malformed token'); }
  if (head.alg !== 'HS256') throw new Error('wrong algorithm');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(clientSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('HMAC', key, b64u(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]));
  if (!ok) throw new Error('bad signature');
  const s = now / 1000;
  if (!(body.exp > s - 5)) throw new Error('expired'); if (body.nbf && body.nbf > s + 5) throw new Error('not yet valid');
  if (body.aud !== clientId) throw new Error('wrong audience');
  let shop; try { shop = new URL(body.dest).hostname; } catch (e) { throw new Error('no shop'); }
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) throw new Error('bad shop');
  if (body.iss && !String(body.iss).startsWith('https://' + shop)) throw new Error('issuer mismatch');
  return { shop, user: body.sub };
}
