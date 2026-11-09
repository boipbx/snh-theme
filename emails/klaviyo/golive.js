// Go-live (owner-requested 9 Nov 2026): patch the 2 fixed flow emails, switch the 12 SNH flows + their email actions live,
// and set the 4 old flows they replace to draft the same minute (no double sends). Verifies by GET.
const { all, req, errText, sleep } = require('./kv');
const fs = require('fs'), path = require('path'); const D = path.join(__dirname, '..', 'dist', 'klaviyo');
const sub = (id) => { const t = fs.readFileSync(path.join(D, id + '.txt'), 'utf8').split('\n'); return { subject: t[0].replace(/^Subject: /, ''), preview: t[1].replace(/^Preheader: /, '') }; };
const OLD = ['Abandoned Cart', 'Customer Thank You - New vs. Returning', 'Post-Purchase Followup - Order Count Split', 'Customer Winback - Standard'];
(async () => {
  // 1) fixed emails
  for (const [tpl, msg, id] of [['QQy2Tw', 'V4qQx7', 'replenishment'], ['VZWUxi', 'Udx32P', 'review-request']]) {
    const html = fs.readFileSync(path.join(D, id + '.html'), 'utf8'), text = fs.readFileSync(path.join(D, id + '.txt'), 'utf8');
    let r = await req('PATCH', `/templates/${tpl}/`, { data: { type: 'template', id: tpl, attributes: { html, text } } });
    console.log('template', id, r.status, r.status >= 300 ? errText(r.json) : 'ok');
    const g = await req('GET', `/flow-messages/${msg}/?fields[flow-message]=content`);
    const content = Object.assign({}, g.json.data.attributes.content, sub(id));
    r = await req('PATCH', `/flow-messages/${msg}/`, { data: { type: 'flow-message', id: msg, attributes: { content } } });
    console.log('message ', id, r.status, r.status >= 300 ? errText(r.json) : 'subject → ' + content.subject);
  }
  // 2) SNH flows + actions live
  const flows = (await all('/flows/?fields[flow]=name,status')).data;
  for (const f of flows.filter((x) => x.attributes.name.startsWith('SNH ·'))) {
    const acts = (await all(`/flows/${f.id}/flow-actions/?fields[flow-action]=action_type,status`)).data.filter((a) => a.attributes.action_type === 'SEND_EMAIL');
    for (const a of acts) { const r = await req('PATCH', `/flow-actions/${a.id}/`, { data: { type: 'flow-action', id: a.id, attributes: { status: 'live' } } }); if (r.status >= 300) console.log('  action', a.id, r.status, errText(r.json)); await sleep(250); }
    const r = await req('PATCH', `/flows/${f.id}/`, { data: { type: 'flow', id: f.id, attributes: { status: 'live' } } });
    console.log('LIVE  ', f.attributes.name, r.status, r.status >= 300 ? errText(r.json) : '');
  }
  // 3) old replaced flows → draft
  for (const f of flows.filter((x) => OLD.includes(x.attributes.name))) {
    const r = await req('PATCH', `/flows/${f.id}/`, { data: { type: 'flow', id: f.id, attributes: { status: 'draft' } } });
    console.log('DRAFT ', f.attributes.name, r.status, r.status >= 300 ? errText(r.json) : '');
  }
  // 4) verify
  const after = (await all('/flows/?fields[flow]=name,status')).data;
  const by = {}; for (const f of after) (by[f.attributes.status] = by[f.attributes.status] || []).push(f.attributes.name);
  for (const k in by) console.log('VERIFY', k.toUpperCase(), by[k].length, '→', by[k].join(' | '));
})();
