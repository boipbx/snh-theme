// Turns ui/app.html into src/ui.mjs (the Worker serves it as one string). Run after editing the page:  node build-ui.mjs
import fs from 'node:fs';
const html = fs.readFileSync(new URL('./ui/app.html', import.meta.url), 'utf8');
export const source = (h) => `// GENERATED from ui/app.html by build-ui.mjs. Edit that file, not this one.
// The app page. It holds no store data: everything is fetched from /api with a Shopify session token.
const HTML = ${JSON.stringify(h)};
const safe = (s) => String(s || '').replace(/[^A-Za-z0-9._-]/g, '');
export const page = (apiKey, devToken = '') => HTML.replace('__API_KEY__', safe(apiKey)).replace('__DEV_TOKEN__', safe(devToken));
`;
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) { fs.writeFileSync(new URL('./src/ui.mjs', import.meta.url), source(html)); console.log('src/ui.mjs written,', html.length, 'bytes'); }
