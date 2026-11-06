// SNH email modules (MJML). Every module takes `t`, the tag helper: t.v(real, sample) prints the platform tag in a
// real build and the sample value in a preview build; t.loop(open, close, samples, row) repeats a row over the platform's
// line items (preview: over the samples); t.raw(real, sample) is for Liquid / Klaviyo control tags.
const A = require('./assets');

const C = { ink: '#0E0E0E', accent: '#BF4512', accentBright: '#E0521C', canvas: '#F6F4F1', cream: '#F5F2EC', line: '#E3DCD0', muted: '#5C574F', white: '#FFFFFF', green: '#157A3A' };
const SANS = "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif";
const SERIF = "'Instrument Serif', Georgia, 'Times New Roman', serif";
const STORE = 'https://www.sportsnutritionhub.lk';
const WA = '94779773359', WA_FMT = '+94 77 977 3359';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// headline with one italic serif accent word: "Welcome to *SNH Elite*"
const hl = (s) => String(s).replace(/\*([^*]+)\*/g, `<em style="font-family:${SERIF};font-style:italic;font-weight:400;">$1</em>`);

function head(t, e) {
  return `<mj-head>
    <mj-title>${esc(e.subject.replace(/\{\{.*?\}\}/g, '').trim())}</mj-title>
    <mj-preview>${t.v(e.preheader, e.preheaderSample || e.preheader)}</mj-preview>
    <mj-raw><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></mj-raw>
    <mj-attributes>
      <mj-all font-family="${SANS}" />
      <mj-text font-size="16px" line-height="1.5" color="${C.ink}" padding="0 24px" />
      <mj-section padding="0" />
      <mj-column padding="0" />
      <mj-image padding="0" />
    </mj-attributes>
    <mj-style inline="inline">
      a { color: ${C.ink}; }
      .lnk a, a.lnk { color: ${C.accent}; font-weight: 700; text-decoration: underline; }
      .muted { color: ${C.muted}; }
      .tbl td { font-family: ${SANS}; font-size: 15px; line-height: 1.45; color: ${C.ink}; }
    </mj-style>
    <mj-style>
      :root { color-scheme: light; supported-color-schemes: light; }
      u + .body .gmail-fix { display: none; }
      @media only screen and (max-width: 480px) {
        .h1 div { font-size: 30px !important; line-height: 1.1 !important; }
        .pad-m div { padding-left: 0 !important; padding-right: 0 !important; }
        .stack td { display: block !important; width: 100% !important; }
        .hide-m { display: none !important; max-height: 0 !important; overflow: hidden !important; }
      }
      [data-ogsc] .keep-ink, [data-ogsb] .keep-ink { color: ${C.ink} !important; }
    </mj-style>
  </mj-head>`;
}

const header = () => `
  <mj-section background-color="${C.white}" padding="20px 24px" border-bottom="3px solid ${C.accent}">
    <mj-column vertical-align="middle" width="50%"><mj-image src="${A.logo}" alt="SNH, Sports Nutrition Hub" width="96px" align="left" href="${STORE}/" /></mj-column>
    <mj-column vertical-align="middle" width="50%" css-class="hide-m"><mj-text align="right" font-size="13px" color="${C.muted}" padding="0"><a href="${STORE}/collections/all" style="color:${C.muted};text-decoration:none;">Shop</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="${STORE}/pages/snh-elite" style="color:${C.muted};text-decoration:none;">SNH Elite</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="${STORE}/account" style="color:${C.muted};text-decoration:none;">Account</a></mj-text></mj-column>
  </mj-section>`;

function hero(t, { img, alt, eyebrow, h, sub, bg = C.white }) {
  return `${img ? `<mj-section background-color="${bg}"><mj-column><mj-image src="${img}" alt="${esc(alt || '')}" width="600px" fluid-on-mobile="true" /></mj-column></mj-section>` : ''}
  <mj-section background-color="${bg}" padding="28px 0 8px">
    <mj-column>
      ${eyebrow ? `<mj-text font-size="12px" font-weight="700" letter-spacing="2px" color="${C.accent}" padding="0 24px 8px">${eyebrow.toUpperCase()}</mj-text>` : ''}
      <mj-text css-class="h1" font-size="34px" line-height="1.08" font-weight="700" letter-spacing="-0.5px" padding="0 24px 12px">${hl(h)}</mj-text>
      ${sub ? `<mj-text font-size="17px" color="${C.muted}" padding="0 24px 8px">${sub}</mj-text>` : ''}
    </mj-column>
  </mj-section>`;
}

const text = (html, { bg = C.white, pad = '8px 0' } = {}) => `<mj-section background-color="${bg}" padding="${pad}"><mj-column><mj-text>${html}</mj-text></mj-column></mj-section>`;
const spacer = (h = 16, bg = C.white) => `<mj-section background-color="${bg}"><mj-column><mj-spacer height="${h}px" /></mj-column></mj-section>`;

// bulletproof button: VML roundrect for Outlook, a padded link everywhere else
function button(label, href, { bg = C.accent, color = C.white, sectionBg = C.white, align = 'left', w = 260 } = {}) {
  return `<mj-section background-color="${sectionBg}" padding="12px 0 20px"><mj-column><mj-raw>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr><td align="${align}" style="padding:0 24px;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:50px;v-text-anchor:middle;width:${w}px;" arcsize="50%" stroke="f" fillcolor="${bg}"><w:anchorlock/><center style="color:${color};font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${label}</center></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="${href}" style="display:inline-block;background:${bg};color:${color};font-family:${SANS};font-size:16px;font-weight:700;line-height:50px;height:50px;padding:0 30px;border-radius:999px;text-decoration:none;mso-hide:all;">${label}</a><!--<![endif]-->
    </td></tr></table></mj-raw></mj-column></mj-section>`;
}

// Koko line: "or 3 × Rs X with [logo]"
const kokoLine = (third) => `<span style="font-size:13px;color:${C.muted};">or 3 × ${third} with</span>&nbsp;<img src="${A.koko}" alt="Koko" width="33" height="15" style="display:inline-block;vertical-align:middle;border:0;width:33px;height:15px;">`;

// one product row (image, name, price, Koko). fields are already-tagged strings
function productRowHtml({ img, name, price, url, third, qty, meta }) {
  return `<tr><td width="96" style="padding:12px 0 12px 0;vertical-align:top;"><a href="${url}"><img src="${img}" alt="${name}" width="84" height="84" style="display:block;width:84px;height:84px;border:0;border-radius:10px;background:${C.cream};object-fit:contain;"></a></td>
    <td style="padding:12px 0 12px 12px;vertical-align:top;"><a href="${url}" style="font-weight:700;color:${C.ink};text-decoration:none;font-size:16px;">${name}</a>${meta ? `<br><span style="font-size:13px;color:${C.muted};">${meta}</span>` : ''}${qty ? `<br><span style="font-size:13px;color:${C.muted};">Qty ${qty}</span>` : ''}
    <br><span style="font-weight:700;font-size:18px;color:${C.ink};">${price}</span>${third ? `<br>${kokoLine(third)}` : ''}</td></tr>`;
}
const productTable = (rowsHtml, bg = C.white) => `<mj-section background-color="${bg}" padding="4px 0"><mj-column><mj-table css-class="tbl" padding="0 24px" cellpadding="0" cellspacing="0">${rowsHtml}</mj-table></mj-column></mj-section>`;

// totals table rows
const totals = (rows, bg = C.white) => productTable(rows.map((r) => { if (r.raw) return r.raw; const [k, v, strong] = r; return `<tr><td style="padding:6px 0;border-top:1px solid ${C.line};color:${strong ? C.ink : C.muted};${strong ? 'font-weight:700;font-size:17px;' : ''}">${k}</td><td align="right" style="padding:6px 0;border-top:1px solid ${C.line};${strong ? 'font-weight:700;font-size:17px;' : ''}">${v}</td></tr>`; }).join(''), bg);

// SNH Elite card block: tier colour, points, Rs value, progress bar (table)
const TIER = { bronze: { a: '#A2603A', b: '#5C3114', ink: '#FFFFFF', label: 'BRONZE' }, silver: { a: '#E6EAEF', b: '#9AA5B3', ink: '#111418', label: 'SILVER' }, gold: { a: '#F5D98A', b: '#C08A2B', ink: '#1A1206', label: 'GOLD' } };
function eliteCard(t, { tier = 'bronze', tierTag, name, points, value, pct, pctSample = 62, next, bg = C.canvas }) {
  const T = TIER[tier] || TIER.bronze;
  return `<mj-section background-color="${bg}" padding="20px 24px"><mj-column><mj-raw>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:420px;border-radius:16px;background:${T.a};background-image:linear-gradient(135deg,${T.a},${T.b});" bgcolor="${T.a}">
    <tr><td style="padding:20px 22px 6px;font-family:${SANS};color:${T.ink};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="font-family:${SANS};font-size:18px;font-weight:800;color:${T.ink};letter-spacing:-0.3px;">SNH <em style="font-family:${SERIF};font-weight:400;">Elite</em></td>
        <td align="right" style="font-family:${SANS};font-size:12px;font-weight:700;letter-spacing:2px;color:${T.ink};">${tierTag || T.label}</td></tr></table>
    </td></tr>
    <tr><td style="padding:22px 22px 4px;font-family:${SANS};font-size:12px;font-weight:700;letter-spacing:1.5px;color:${T.ink};">MEMBER</td></tr>
    <tr><td style="padding:0 22px;font-family:${SANS};font-size:17px;font-weight:700;color:${T.ink};">${name}</td></tr>
    <tr><td style="padding:14px 22px 8px;font-family:${SANS};color:${T.ink};"><span style="font-size:28px;font-weight:800;">${points}</span>&nbsp;<span style="font-size:12px;font-weight:700;letter-spacing:1.5px;">POINTS</span>&nbsp;&nbsp;<span style="font-size:15px;font-weight:600;">·&nbsp;${value}</span></td></tr>
    <tr><td style="padding:0 22px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:3px;background:rgba(0,0,0,0.18);" bgcolor="${T.b}"><tr>
      <td width="${t.preview ? pctSample : pct}%" height="5" style="height:5px;line-height:5px;font-size:0;background:${T.ink};border-radius:3px;" bgcolor="${T.ink}">&nbsp;</td><td height="5" style="height:5px;line-height:5px;font-size:0;">&nbsp;</td></tr></table>
      ${next ? `<div style="font-family:${SANS};font-size:13px;font-weight:600;color:${T.ink};padding-top:8px;">${next}</div>` : ''}</td></tr>
  </table></mj-raw></mj-column></mj-section>`;
}

function bundle(t, { title, line, price, save, url, img }) {
  return `<mj-section background-color="${C.cream}" padding="20px 0"><mj-column>
    <mj-text font-size="12px" font-weight="700" letter-spacing="2px" color="${C.accent}" padding="0 24px 6px">BUNDLE OFFER</mj-text>
    <mj-text font-size="22px" font-weight="700" padding="0 24px 6px">${title}</mj-text>
    <mj-text color="${C.muted}" padding="0 24px 10px">${line}</mj-text>
    ${img ? `<mj-image src="${img}" alt="${esc(title)}" width="552px" padding="0 24px 10px" border-radius="12px" />` : ''}
    <mj-text padding="0 24px"><span style="font-size:20px;font-weight:800;">${price}</span>${save ? ` <span style="font-size:14px;font-weight:700;color:${C.accent};">${save}</span>` : ''}</mj-text>
  </mj-column></mj-section>${button('See the bundle', url, { sectionBg: C.cream, bg: C.ink })}`;
}

const trust = () => `<mj-section background-color="${C.ink}" padding="16px 12px"><mj-column><mj-text align="center" color="${C.white}" font-size="14px" font-weight="600" padding="0">100% authentic&nbsp;&nbsp;·&nbsp;&nbsp;Official SiS distributor&nbsp;&nbsp;·&nbsp;&nbsp;Same-day Colombo delivery</mj-text></mj-column></mj-section>`;

const stores = (bg = C.canvas) => `<mj-section background-color="${bg}" padding="24px 12px 8px">
  ${[['Dehiwala', '133A Kawdana Road', '+94 77 977 3359'], ['Wattala', '880 Negombo Road', '+94 76 846 3359'], ['Nugegoda', '555 High Level Road', '+94 76 486 3359']].map(([n, a, p]) => `<mj-column width="33.33%"><mj-text font-size="14px" padding="0 12px 16px"><strong>SNH ${n}</strong><br><span style="color:${C.muted};">${a}</span><br><a href="tel:${p.replace(/\s/g, '')}" style="color:${C.ink};">${p}</a></mj-text></mj-column>`).join('')}
</mj-section>`;

const whatsapp = (bg = C.canvas) => `<mj-section background-color="${bg}" padding="0 0 20px"><mj-column><mj-text font-size="15px">Questions? WhatsApp us on <a href="https://wa.me/${WA}" style="color:${C.accent};font-weight:700;">${WA_FMT}</a>, every day 10am–7pm.</mj-text></mj-column></mj-section>`;

function footer(t) {
  const soc = [['Instagram', 'https://www.instagram.com/sportsnutritionhub.lk/'], ['Facebook', 'https://www.facebook.com/sportsnutritionhub.lk/'], ['TikTok', 'https://www.tiktok.com/@sportsnutritionhub.lk'], ['WhatsApp', `https://wa.me/${WA}`]];
  const legal = t.platform === 'klaviyo'
    ? `You're receiving this because you signed up at sportsnutritionhub.lk. ${t.raw("{% unsubscribe 'Unsubscribe' %}", '<a href="#" style="color:#B9B2A7;">Unsubscribe</a>')} · ${t.raw("{% manage_preferences 'Manage preferences' %}", '<a href="#" style="color:#B9B2A7;">Manage preferences</a>')}`
    : `This is a service email about your account or order with Sports Nutrition Hub.`;
  return `<mj-section background-color="${C.ink}" padding="28px 12px 8px">
    <mj-column><mj-image src="${A.logo}" alt="SNH" width="80px" align="left" padding="0 12px 14px" />
      <mj-text color="#E9E4DC" font-size="14px" padding="0 12px 10px">${soc.map(([n, u]) => `<a href="${u}" style="color:#E9E4DC;text-decoration:underline;">${n}</a>`).join('&nbsp;&nbsp;·&nbsp;&nbsp;')}</mj-text>
      <mj-text color="#B9B2A7" font-size="12px" line-height="1.6" padding="0 12px 22px">Sports Nutrition Hub (Pvt) Ltd · 133A Kawdana Road, Dehiwala, Sri Lanka · <a href="${STORE}/" style="color:#B9B2A7;">sportsnutritionhub.lk</a><br>${legal}</mj-text>
    </mj-column></mj-section>`;
}

module.exports = { C, SANS, SERIF, STORE, WA, WA_FMT, esc, hl, head, header, hero, text, spacer, button, kokoLine, productRowHtml, productTable, totals, eliteCard, bundle, trust, stores, whatsapp, footer, TIER };
