// Read-only: list each SNH flow's email actions with message id, subject and template id.
const { all, req } = require('./kv');
(async () => {
  const flows = await all('/flows/?fields[flow]=name,status');
  for (const f of flows.data.filter((x) => x.attributes.name.startsWith('SNH ·'))) {
    const acts = await all(`/flows/${f.id}/flow-actions/?fields[flow-action]=action_type,status`);
    for (const a of acts.data.filter((x) => x.attributes.action_type === 'SEND_EMAIL')) {
      const ms = await all(`/flow-actions/${a.id}/flow-messages/?fields[flow-message]=name,content`);
      for (const m of ms.data) {
        const t = await req('GET', `/flow-messages/${m.id}/relationships/template/`);
        console.log(f.attributes.name, '|', f.attributes.status, '| action', a.id, a.attributes.status, '| msg', m.id, '|', (m.attributes.content || {}).subject, '| tpl', t.json && t.json.data && t.json.data.id);
      }
    }
  }
})();
