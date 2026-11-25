import React, { useEffect, useState } from 'react';
import { Navigator, Screen, ScrollView, Section, Text, Banner, Button, reactExtension, useApi, useCartSubscription } from '@shopify/ui-extensions-react/point-of-sale';
// Read-only: the customer on the current cart and their Elite points, from the SNH Ops Worker (Shopify session token).
// Anything else (search, create, edit, redeem, adjust) happens in the SNH Staff console on the counter device.
const WORKER = 'https://snh-ops.raspy-wind-fe2d.workers.dev';
const fmt = (n) => Number(n || 0).toLocaleString('en-LK');
function Panel() {
  const api = useApi(); const cart = useCartSubscription(); const customerId = cart && cart.customer ? cart.customer.id : null;
  const [state, setState] = useState({ loading: false, data: null, error: '' });
  useEffect(() => {
    if (!customerId) { setState({ loading: false, data: null, error: '' }); return; }
    let live = true; setState({ loading: true, data: null, error: '' });
    (async () => {
      try { const token = await api.session.getSessionToken();
        const r = await fetch(`${WORKER}/api/pos/customer?id=${customerId}`, { headers: { Authorization: 'Bearer ' + token } }); const j = await r.json();
        if (live) setState({ loading: false, data: r.ok ? j : null, error: r.ok ? '' : j.error || 'Could not load points' }); }
      catch (e) { if (live) setState({ loading: false, data: null, error: 'No connection' }); }
    })();
    return () => { live = false; };
  }, [customerId]);
  const d = state.data;
  return (
    <Navigator><Screen name="SNH Staff" title="SNH Staff"><ScrollView>
      {!customerId && <Banner title="Add a customer to the cart to see their Elite points." variant="information" visible />}
      {state.loading && <Text>Loading…</Text>}
      {state.error ? <Banner title={state.error} variant="error" visible /> : null}
      {d && <Section title={d.name}>
        <Text variant="headingLarge">{fmt(d.points)} points</Text>
        <Text>Worth Rs {fmt(d.value)} · {d.tier || 'No tier'} · {d.status === 'enabled' ? 'Account active' : d.status === 'invited' ? 'Invited' : 'No account'}</Text>
        {d.codes && d.codes.length ? <Text>Active reward code: {d.codes.join(', ')}</Text> : null}
        <Text>{d.canRedeem ? 'Can redeem Rs 2,500 in SNH Staff.' : `Redeem from 2,500 points.`}</Text>
      </Section>}
      <Section title="More">
        <Text>Search, new customers, edits and redeeming are in the SNH Staff app on this counter (home-screen icon).</Text>
        <Button title="Close" onPress={() => api.action.dismissModal ? api.action.dismissModal() : null} />
      </Section>
    </ScrollView></Screen></Navigator>
  );
}
export default reactExtension('pos.home.modal.render', () => <Panel />);
