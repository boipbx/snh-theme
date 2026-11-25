// Turns ui/app.html into src/ui.mjs and ui/console.html (+ manifest, service worker, icons) into src/console-ui.mjs.
// The Worker serves them as strings. Run after editing the page:  node build-ui.mjs
import fs from 'node:fs';
const html = fs.readFileSync(new URL('./ui/app.html', import.meta.url), 'utf8');
export const source = (h) => `// GENERATED from ui/app.html by build-ui.mjs. Edit that file, not this one.
// The app page. It holds no store data: everything is fetched from /api with a Shopify session token.
const HTML = ${JSON.stringify(h)};
const safe = (s) => String(s || '').replace(/[^A-Za-z0-9._-]/g, '');
const safeUrl = (u) => (String(u || '').startsWith('https://') && !/["'<>\\s]/.test(String(u)) ? String(u) : '');
export const page = (apiKey, devToken = '', video = '') => HTML.replace('__API_KEY__', safe(apiKey)).replace('__DEV_TOKEN__', safe(devToken)).replace('__VIDEO__', safeUrl(video));
`;
const rd = (p, enc = 'utf8') => fs.readFileSync(new URL(p, import.meta.url), enc);
export const MANIFEST = { name: 'SNH Staff', short_name: 'SNH Staff', start_url: '/console', scope: '/console', display: 'standalone', orientation: 'any', background_color: '#141210', theme_color: '#141210',
  description: 'Look up SNH customers and Elite points at the counter.',
  icons: [{ src: '/console/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/console/icon-512.png', sizes: '512x512', type: 'image/png' }, { src: '/console/icon-mask.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }] };
export const consoleSource = () => `// GENERATED from ui/console.html, ui/console-sw.js and ui/console-assets/ by build-ui.mjs. Edit those, not this.
export const CONSOLE_HTML = ${JSON.stringify(rd('./ui/console.html'))};
export const SW_JS = ${JSON.stringify(rd('./ui/console-sw.js'))};
export const MANIFEST = ${JSON.stringify(JSON.stringify(MANIFEST))};
export const ICON_192 = ${JSON.stringify(rd('./ui/console-assets/icon-192.png', 'base64'))};
export const ICON_512 = ${JSON.stringify(rd('./ui/console-assets/icon-512.png', 'base64'))};
export const ICON_MASK = ${JSON.stringify(rd('./ui/console-assets/icon-mask.png', 'base64'))};
export const LOGO_PNG = ${JSON.stringify(rd('./ui/console-assets/logo.png', 'base64'))};
`;
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  fs.writeFileSync(new URL('./src/ui.mjs', import.meta.url), source(html)); console.log('src/ui.mjs written,', html.length, 'bytes');
  const c = consoleSource(); fs.writeFileSync(new URL('./src/console-ui.mjs', import.meta.url), c); console.log('src/console-ui.mjs written,', c.length, 'bytes');
}
