// SNH Staff service worker: keeps the app shell for a fast start and shows a "no connection" page offline.
// API calls are never cached (customer data always comes live from the server).
const C = 'snh-staff-v1'; const SHELL = ['/console', '/console/logo.png', '/console/icon-192.png', '/console/manifest.webmanifest'];
const OFFLINE = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SNH Staff: no connection</title>' +
  '<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#141210;color:#F3EFE9;font:18px/1.4 system-ui;text-align:center;padding:24px">' +
  '<div><img src="/console/logo.png" alt="SNH" style="height:34px"><h1 style="font-size:24px">No connection</h1><p style="color:#CFC7BC">SNH Staff needs the internet to look up customers.<br>Check the shop Wi-Fi, then try again.</p>' +
  '<button onclick="location.reload()" style="min-height:56px;padding:0 28px;border-radius:12px;border:0;background:#F06A2E;color:#140A04;font:700 18px system-ui">Try again</button></div>';
self.addEventListener('install', (e) => { e.waitUntil(caches.open(C).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== C).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url); if (u.origin !== location.origin || e.request.method !== 'GET' || u.pathname.startsWith('/console/api/')) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(C).then((c) => c.put('/console', copy)); return r; })
      .catch(() => new Response(OFFLINE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })));
    return;
  }
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});
